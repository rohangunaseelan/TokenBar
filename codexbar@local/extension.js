/**
 * CodexBar GNOME Shell Extension
 * Shows AI tool usage (Codex, Claude, Gemini, Antigravity) in the top panel.
 * Calls the `codexbar` CLI for data fetching.
 *
 * GNOME 45+ ESM extension
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// Provider display metadata (mirrors Swift ProviderDefaults)
const PROVIDER_META = {
    codex: {
        displayName: 'Codex',
        sessionLabel: 'Session',
        weeklyLabel: 'Weekly',
        tertiaryLabel: null,
        supportsCredits: true,
    },
    claude: {
        displayName: 'Claude',
        sessionLabel: 'Session',
        weeklyLabel: 'Weekly',
        tertiaryLabel: 'Sonnet',
        supportsCredits: false,
    },
    gemini: {
        displayName: 'Gemini',
        sessionLabel: 'Pro',
        weeklyLabel: 'Flash',
        tertiaryLabel: null,
        supportsCredits: false,
    },
    antigravity: {
        displayName: 'Antigravity',
        sessionLabel: 'Claude',
        weeklyLabel: 'Gemini Pro',
        tertiaryLabel: 'Gemini Flash',
        supportsCredits: false,
    },
};

/**
 * Panel indicator button with dropdown menu
 */
const CodexBarIndicator = GObject.registerClass(
class CodexBarIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'CodexBar');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._lastPayload = null;
        this._isStale = false;
        this._refreshTimeoutId = null;
        this._cancellable = null;

        // Panel box: icon + label
        this._panelBox = new St.BoxLayout({
            style_class: 'panel-status-menu-box codexbar-panel-box',
        });

        // Icon (usage bars rendered via Cairo or fallback text)
        this._icon = new St.Icon({
            icon_name: 'utilities-system-monitor-symbolic',
            style_class: 'system-status-icon codexbar-icon',
        });
        this._panelBox.add_child(this._icon);

        // Label (e.g., "72%")
        this._label = new St.Label({
            text: '—',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'codexbar-label',
        });
        if (this._settings.get_boolean('show-label')) {
            this._panelBox.add_child(this._label);
        }

        this.add_child(this._panelBox);

        // Build menu structure
        this._buildMenu();

        // Connect settings changes
        this._settingsChangedId = this._settings.connect('changed', this._onSettingsChanged.bind(this));

        // Initial fetch
        this._scheduleRefresh(0);
    }

    _buildMenu() {
        // Provider sections will be dynamically populated
        this._providerSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._providerSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Status row (shown when error/stale)
        this._statusItem = new PopupMenu.PopupMenuItem('', { reactive: false });
        this._statusItem.visible = false;
        this.menu.addMenuItem(this._statusItem);

        // Refresh button
        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
        refreshItem.connect('activate', () => {
            this._fetchUsage();
        });
        this.menu.addMenuItem(refreshItem);

        // Settings button
        const settingsItem = new PopupMenu.PopupMenuItem(_('Settings…'));
        settingsItem.connect('activate', () => {
            this._extension.openPreferences();
        });
        this.menu.addMenuItem(settingsItem);
    }

    _onSettingsChanged(settings, key) {
        if (key === 'refresh-seconds') {
            this._scheduleRefresh(0);
        } else if (key === 'show-label') {
            if (settings.get_boolean('show-label')) {
                if (!this._panelBox.contains(this._label)) {
                    this._panelBox.add_child(this._label);
                }
            } else {
                if (this._panelBox.contains(this._label)) {
                    this._panelBox.remove_child(this._label);
                }
            }
        } else if (key === 'provider' || key === 'include-status') {
            this._fetchUsage();
        }
    }

    _scheduleRefresh(delayMs) {
        if (this._refreshTimeoutId) {
            GLib.source_remove(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }

        const intervalSecs = this._settings.get_int('refresh-seconds');
        const delay = delayMs > 0 ? delayMs : intervalSecs * 1000;

        this._refreshTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._fetchUsage();
            this._scheduleRefresh(intervalSecs * 1000);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _fetchUsage() {
        // Cancel any in-flight request
        if (this._cancellable) {
            this._cancellable.cancel();
        }
        this._cancellable = new Gio.Cancellable();

        const cliPath = this._settings.get_string('codexbar-path') || 'codexbar';
        const provider = this._settings.get_string('provider') || 'codex';
        const includeStatus = this._settings.get_boolean('include-status');

        const args = [cliPath, 'usage', '--format', 'json', '--provider', provider];
        if (includeStatus) {
            args.push('--status');
        }

        try {
            const result = await this._runCli(args, this._cancellable);
            const payload = JSON.parse(result);
            this._lastPayload = payload;
            this._isStale = false;
            this._updateUI(payload);
        } catch (e) {
            console.error(`[CodexBar] CLI error: ${e.message}`);
            this._isStale = true;
            this._showError(e.message);
        }
    }

    _runCli(argv, cancellable) {
        return new Promise((resolve, reject) => {
            try {
                const proc = Gio.Subprocess.new(
                    argv,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                proc.communicate_utf8_async(null, cancellable, (proc, res) => {
                    try {
                        const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                        if (proc.get_successful()) {
                            resolve(stdout);
                        } else {
                            reject(new Error(stderr || `Exit code ${proc.get_exit_status()}`));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    _updateUI(payload) {
        // payload is an array of provider objects
        if (!Array.isArray(payload) || payload.length === 0) {
            this._showError('No data received');
            return;
        }

        // Clear status
        this._statusItem.visible = false;
        this.remove_style_class_name('codexbar-stale');

        // Update panel label with first/primary provider's session remaining
        const primary = payload[0];
        const sessionRemaining = this._getRemainingPercent(primary);
        this._label.text = `${Math.round(sessionRemaining)}%`;

        // Update icon style based on usage level
        this._updateIconStyle(sessionRemaining);

        // Rebuild menu sections
        this._providerSection.removeAll();

        for (const providerData of payload) {
            this._addProviderSection(providerData);
        }
    }

    _getRemainingPercent(providerData) {
        const showUsed = this._settings.get_boolean('show-used');
        if (providerData.usage?.primary) {
            const used = providerData.usage.primary.usedPercent ?? 0;
            return showUsed ? used : Math.max(0, 100 - used);
        }
        return 0;
    }

    _updateIconStyle(remainingPercent) {
        // Remove previous level classes
        this._icon.remove_style_class_name('codexbar-level-ok');
        this._icon.remove_style_class_name('codexbar-level-warn');
        this._icon.remove_style_class_name('codexbar-level-critical');

        if (remainingPercent > 50) {
            this._icon.add_style_class_name('codexbar-level-ok');
        } else if (remainingPercent > 20) {
            this._icon.add_style_class_name('codexbar-level-warn');
        } else {
            this._icon.add_style_class_name('codexbar-level-critical');
        }
    }

    _addProviderSection(providerData) {
        const providerKey = providerData.provider;
        const meta = PROVIDER_META[providerKey] || {
            displayName: providerKey,
            sessionLabel: 'Session',
            weeklyLabel: 'Weekly',
            tertiaryLabel: null,
            supportsCredits: false,
        };

        // Provider header
        const headerText = providerData.version
            ? `${meta.displayName} ${providerData.version}`
            : meta.displayName;
        const header = new PopupMenu.PopupMenuItem(headerText, { reactive: false, style_class: 'codexbar-provider-header' });
        this._providerSection.addMenuItem(header);

        const showUsed = this._settings.get_boolean('show-used');

        // Primary (Session)
        if (providerData.usage?.primary) {
            const pct = this._formatPercent(providerData.usage.primary, showUsed);
            const reset = providerData.usage.primary.resetDescription || '';
            const label = `  ${meta.sessionLabel}: ${pct}`;
            const item = new PopupMenu.PopupMenuItem(label, { reactive: false });
            this._providerSection.addMenuItem(item);

            if (reset) {
                const resetItem = new PopupMenu.PopupMenuItem(`    ${reset}`, { reactive: false, style_class: 'codexbar-reset' });
                this._providerSection.addMenuItem(resetItem);
            }
        }

        // Secondary (Weekly)
        if (providerData.usage?.secondary) {
            const pct = this._formatPercent(providerData.usage.secondary, showUsed);
            const reset = providerData.usage.secondary.resetDescription || '';
            const label = `  ${meta.weeklyLabel}: ${pct}`;
            const item = new PopupMenu.PopupMenuItem(label, { reactive: false });
            this._providerSection.addMenuItem(item);

            if (reset) {
                const resetItem = new PopupMenu.PopupMenuItem(`    ${reset}`, { reactive: false, style_class: 'codexbar-reset' });
                this._providerSection.addMenuItem(resetItem);
            }
        }

        // Tertiary (e.g., Sonnet for Claude)
        if (providerData.usage?.tertiary && meta.tertiaryLabel) {
            const pct = this._formatPercent(providerData.usage.tertiary, showUsed);
            const reset = providerData.usage.tertiary.resetDescription || '';
            const label = `  ${meta.tertiaryLabel}: ${pct}`;
            const item = new PopupMenu.PopupMenuItem(label, { reactive: false });
            this._providerSection.addMenuItem(item);

            if (reset) {
                const resetItem = new PopupMenu.PopupMenuItem(`    ${reset}`, { reactive: false, style_class: 'codexbar-reset' });
                this._providerSection.addMenuItem(resetItem);
            }
        }

        // Credits (Codex only)
        if (meta.supportsCredits && providerData.credits?.remaining !== undefined) {
            const credits = providerData.credits.remaining;
            const formatted = credits >= 1 ? credits.toFixed(1) : credits.toFixed(2);
            const item = new PopupMenu.PopupMenuItem(`  Credits: ${formatted}`, { reactive: false });
            this._providerSection.addMenuItem(item);
        }

        // Status
        if (providerData.status) {
            const indicator = providerData.status.indicator || 'unknown';
            const desc = providerData.status.description || '';
            const statusText = `  Status: ${this._statusLabel(indicator)}${desc ? ` – ${desc}` : ''}`;
            const statusItem = new PopupMenu.PopupMenuItem(statusText, { reactive: false, style_class: `codexbar-status-${indicator}` });
            this._providerSection.addMenuItem(statusItem);
        }

        // Separator between providers
        this._providerSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    _formatPercent(window, showUsed) {
        const used = window.usedPercent ?? 0;
        const value = showUsed ? used : Math.max(0, 100 - used);
        const suffix = showUsed ? 'used' : 'left';
        return `${Math.round(value)}% ${suffix}`;
    }

    _statusLabel(indicator) {
        const labels = {
            none: 'Operational',
            minor: 'Partial outage',
            major: 'Major outage',
            critical: 'Critical issue',
            maintenance: 'Maintenance',
            unknown: 'Unknown',
        };
        return labels[indicator] || indicator;
    }

    _showError(message) {
        this._label.text = '!';
        this.add_style_class_name('codexbar-stale');

        // Show last data if available, but mark stale
        if (this._lastPayload) {
            this._updateUI(this._lastPayload);
            this.add_style_class_name('codexbar-stale');
        }

        this._statusItem.label.text = `Error: ${message}`;
        this._statusItem.visible = true;
    }

    destroy() {
        if (this._refreshTimeoutId) {
            GLib.source_remove(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }

        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        super.destroy();
    }
});

export default class CodexBarExtension extends Extension {
    enable() {
        this._indicator = new CodexBarIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

