# TokenBar GNOME Extension

A GNOME Shell extension that displays AI tool usage (Codex, Claude, Gemini, Antigravity) and rate limits in your top panel.
Forked from https://github.com/steipete/TokenBar

![GNOME Shell 45+](https://img.shields.io/badge/GNOME%20Shell-45%2B-blue)

## Features

- **Panel indicator** showing current usage percentage
- **Dropdown menu** with detailed usage for all enabled providers:
  - Session (5-hour) and Weekly rate limits
  - Tertiary limits (e.g., Sonnet for Claude)
  - Credits remaining (Codex)
  - Provider status (optional)
- **Configurable refresh interval** (30s to 1 hour)
- **Multiple provider support**: Codex, Claude, Gemini, Antigravity, or all at once

## Prerequisites

### 1. Install the TokenBar CLI

The extension requires the `TokenBar` CLI tool to fetch usage data. You have two options:

#### Option A: Download from GitHub Releases

```bash
# Download the latest Linux release
curl -LO https://github.com/user/TokenBar/releases/latest/download/TokenBarCLI-linux-x86_64.tar.gz

# Extract
tar -xzf TokenBarCLI-linux-x86_64.tar.gz

# Move to a location in your PATH
sudo mv TokenBar /usr/local/bin/
# or for user-local install:
mkdir -p ~/.local/bin
mv TokenBar ~/.local/bin/
```

#### Option B: Build from Source

Requires Swift 6.2+:

```bash
cd TokenBar-Mac

# Build the CLI
swift build -c release --product TokenBarCLI

# Install
sudo cp .build/release/TokenBarCLI /usr/local/bin/TokenBar
# or
cp .build/release/TokenBarCLI ~/.local/bin/TokenBar
```

### 2. Install Provider CLIs

The `TokenBar` CLI requires the actual AI provider CLIs to be installed and authenticated:

- **Codex**: `npm i -g @openai/codex` or `bun add -g @openai/codex`
- **Claude**: Install Claude Code CLI and authenticate
- **Gemini**: Install Gemini CLI and authenticate

## Installation

### From Source (Recommended for Development)

```bash
cd TokenBar-GNOME

# Install to local GNOME extensions directory
./install.sh

# Compile the GSettings schema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/TokenBar@local/schemas/

# Enable the extension
gnome-extensions enable TokenBar@local

# On Wayland: Log out and back in, or restart GNOME Shell
# On X11: Press Alt+F2, type 'r', press Enter
```

### Manual Installation

```bash
# Create extensions directory if needed
mkdir -p ~/.local/share/gnome-shell/extensions/

# Copy extension files
cp -r TokenBar@local ~/.local/share/gnome-shell/extensions/

# Compile schemas
glib-compile-schemas ~/.local/share/gnome-shell/extensions/TokenBar@local/schemas/

# Enable
gnome-extensions enable TokenBar@local
```

## Configuration

Open the extension preferences:

```bash
gnome-extensions prefs TokenBar@local
```

Or use GNOME's Extensions app.

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| CLI Path | Path to `TokenBar` executable | `TokenBar` |
| Provider | Which provider(s) to monitor | `codex` |
| Refresh Interval | Seconds between refreshes | `300` (5 min) |
| Show Label | Display percentage in panel | `true` |
| Show Used | Show used% instead of remaining% | `false` |
| Include Status | Fetch provider status pages | `false` |

## Troubleshooting

### Extension not appearing

1. Make sure the extension is enabled:
   ```bash
   gnome-extensions list --enabled | grep TokenBar
   ```

2. Check for errors:
   ```bash
   journalctl -f /usr/bin/gnome-shell
   ```

3. On Wayland, you must log out and back in after installing/enabling.

### CLI not found

1. Verify `TokenBar` is in your PATH:
   ```bash
   which TokenBar
   TokenBar --version
   ```

2. If installed to a non-standard location, set the full path in preferences.

3. Common paths to try:
   - `/usr/local/bin/TokenBar`
   - `~/.local/bin/TokenBar`
   - `/opt/homebrew/bin/TokenBar` (if using Homebrew on Linux)

### No data / "Error" in menu

1. Test the CLI manually:
   ```bash
   TokenBar usage --format json --provider codex
   ```

2. Make sure the underlying provider CLI is installed and authenticated:
   ```bash
   codex --version   # For Codex
   claude --version  # For Claude
   gemini --version  # For Gemini
   ```

3. Check if the provider requires authentication:
   ```bash
   codex login       # Authenticate Codex
   ```

### GSettings schema errors

Recompile the schemas:
```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/TokenBar@local/schemas/
```

## Development

### Live reload (X11 only)

```bash
# After making changes, reload GNOME Shell
# Press Alt+F2, type 'r', press Enter
```

### Debugging

```bash
# Watch extension logs
journalctl -f -o cat /usr/bin/gnome-shell | grep -i TokenBar

# Or for all GNOME Shell logs
journalctl -f -o cat /usr/bin/gnome-shell
```

### Running preferences standalone

```bash
gnome-extensions prefs TokenBar@local
```

## Architecture

```
TokenBar@local/
├── metadata.json          # Extension metadata (UUID, GNOME versions)
├── extension.js           # Main extension (panel indicator + menu)
├── prefs.js               # GTK4/Adwaita preferences window
├── stylesheet.css         # Custom styles
└── schemas/
    └── org.gnome.shell.extensions.TokenBar.gschema.xml
```

The extension spawns `TokenBar usage --format json` periodically and parses the JSON output to update the UI. No provider-specific logic is in the extension itself—all data fetching is delegated to the CLI.

## License

Same license as the parent TokenBar project.

