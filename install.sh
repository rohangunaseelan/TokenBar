#!/bin/bash
# CodexBar GNOME Extension Installer
# Installs the extension to ~/.local/share/gnome-shell/extensions/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_UUID="codexbar@local"
EXT_SRC="$SCRIPT_DIR/$EXT_UUID"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "CodexBar GNOME Extension Installer"
echo "==================================="
echo

# Check source exists
if [ ! -d "$EXT_SRC" ]; then
    echo "Error: Extension source not found at $EXT_SRC"
    exit 1
fi

# Create extensions directory if needed
mkdir -p "$HOME/.local/share/gnome-shell/extensions"

# Remove existing installation
if [ -d "$EXT_DEST" ] || [ -L "$EXT_DEST" ]; then
    echo "Removing existing installation..."
    rm -rf "$EXT_DEST"
fi

# Copy extension files
echo "Installing extension to $EXT_DEST..."
cp -r "$EXT_SRC" "$EXT_DEST"

# Compile GSettings schema
echo "Compiling GSettings schema..."
if [ -d "$EXT_DEST/schemas" ]; then
    glib-compile-schemas "$EXT_DEST/schemas/"
    echo "Schema compiled successfully."
else
    echo "Warning: No schemas directory found."
fi

echo
echo "Installation complete!"
echo
echo "Next steps:"
echo "  1. Enable the extension:"
echo "     gnome-extensions enable $EXT_UUID"
echo
echo "  2. On Wayland: Log out and back in"
echo "     On X11: Press Alt+F2, type 'r', Enter"
echo
echo "  3. Configure via:"
echo "     gnome-extensions prefs $EXT_UUID"
echo
echo "Make sure 'codexbar' CLI is installed and in your PATH!"

