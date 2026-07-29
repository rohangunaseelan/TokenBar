/**
 * CodexBar GNOME Shell Extension - Preferences
 * GTK4 + libadwaita preferences window
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CodexBarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // General page
        const generalPage = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(generalPage);

        // CLI group
        const cliGroup = new Adw.PreferencesGroup({
            title: _('CodexBar CLI'),
            description: _('Configure the path to the codexbar command-line tool'),
        });
        generalPage.add(cliGroup);

        // CLI path
        const pathRow = new Adw.EntryRow({
            title: _('CLI Path'),
            text: settings.get_string('codexbar-path'),
        });
        pathRow.connect('changed', () => {
            settings.set_string('codexbar-path', pathRow.text);
        });
        cliGroup.add(pathRow);

        // Test CLI button
        const testRow = new Adw.ActionRow({
            title: _('Test CLI'),
            subtitle: _('Verify the codexbar CLI is working'),
        });
        const testButton = new Gtk.Button({
            label: _('Test'),
            valign: Gtk.Align.CENTER,
        });
        const testResultLabel = new Gtk.Label({
            label: '',
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        });
        testButton.connect('clicked', () => {
            this._testCli(pathRow.text || 'codexbar', testResultLabel);
        });
        testRow.add_suffix(testResultLabel);
        testRow.add_suffix(testButton);
        cliGroup.add(testRow);

        // Provider group
        const providerGroup = new Adw.PreferencesGroup({
            title: _('Provider'),
            description: _('Which AI provider(s) to monitor'),
        });
        generalPage.add(providerGroup);

        // Provider dropdown
        const providerModel = new Gtk.StringList();
        providerModel.append('codex');
        providerModel.append('claude');
        providerModel.append('gemini');
        providerModel.append('antigravity');
        providerModel.append('both');
        providerModel.append('all');

        const providerRow = new Adw.ComboRow({
            title: _('Provider'),
            subtitle: _('Select which provider(s) to query'),
            model: providerModel,
        });

        // Set current value
        const currentProvider = settings.get_string('provider');
        const providerIndex = ['codex', 'claude', 'gemini', 'antigravity', 'both', 'all'].indexOf(currentProvider);
        if (providerIndex >= 0) {
            providerRow.selected = providerIndex;
        }

        providerRow.connect('notify::selected', () => {
            const providers = ['codex', 'claude', 'gemini', 'antigravity', 'both', 'all'];
            settings.set_string('provider', providers[providerRow.selected]);
        });
        providerGroup.add(providerRow);

        // Display group
        const displayGroup = new Adw.PreferencesGroup({
            title: _('Display'),
            description: _('Configure how usage is displayed'),
        });
        generalPage.add(displayGroup);

        // Refresh interval
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Interval'),
            subtitle: _('Seconds between automatic refreshes'),
            adjustment: new Gtk.Adjustment({
                lower: 30,
                upper: 3600,
                step_increment: 30,
                page_increment: 60,
                value: settings.get_int('refresh-seconds'),
            }),
        });
        refreshRow.connect('notify::value', () => {
            settings.set_int('refresh-seconds', refreshRow.value);
        });
        displayGroup.add(refreshRow);

        // Show label toggle
        const labelRow = new Adw.SwitchRow({
            title: _('Show Percentage Label'),
            subtitle: _('Display percentage next to the icon in the panel'),
            active: settings.get_boolean('show-label'),
        });
        labelRow.connect('notify::active', () => {
            settings.set_boolean('show-label', labelRow.active);
        });
        displayGroup.add(labelRow);

        // Show used vs remaining
        const usedRow = new Adw.SwitchRow({
            title: _('Show Usage as Used'),
            subtitle: _('If enabled, shows percent used instead of percent remaining'),
            active: settings.get_boolean('show-used'),
        });
        usedRow.connect('notify::active', () => {
            settings.set_boolean('show-used', usedRow.active);
        });
        displayGroup.add(usedRow);

        // Include status
        const statusRow = new Adw.SwitchRow({
            title: _('Include Provider Status'),
            subtitle: _('Fetch and display provider status page information'),
            active: settings.get_boolean('include-status'),
        });
        statusRow.connect('notify::active', () => {
            settings.set_boolean('include-status', statusRow.active);
        });
        displayGroup.add(statusRow);
    }

    _testCli(cliPath, resultLabel) {
        resultLabel.label = _('Testing…');

        try {
            const proc = Gio.Subprocess.new(
                [cliPath, '--version'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        resultLabel.label = stdout.trim() || _('OK');
                        resultLabel.remove_css_class('error');
                        resultLabel.add_css_class('success');
                    } else {
                        resultLabel.label = stderr.trim() || _('Failed');
                        resultLabel.remove_css_class('success');
                        resultLabel.add_css_class('error');
                    }
                } catch (e) {
                    resultLabel.label = e.message;
                    resultLabel.remove_css_class('success');
                    resultLabel.add_css_class('error');
                }
            });
        } catch (e) {
            resultLabel.label = e.message;
            resultLabel.remove_css_class('success');
            resultLabel.add_css_class('error');
        }
    }
}

