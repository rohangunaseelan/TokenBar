#!/bin/bash
# CodexBar GNOME Extension Development Helper
# Symlinks extension for development and watches for changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_UUID="codexbar@local"
EXT_SRC="$SCRIPT_DIR/$EXT_UUID"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "CodexBar GNOME Extension Dev Setup"
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

# Create symlink for development
echo "Creating symlink: $EXT_DEST -> $EXT_SRC"
ln -s "$EXT_SRC" "$EXT_DEST"

# Compile GSettings schema
echo "Compiling GSettings schema..."
if [ -d "$EXT_SRC/schemas" ]; then
    glib-compile-schemas "$EXT_SRC/schemas/"
    echo "Schema compiled successfully."
fi

echo
echo "Development setup complete!"
echo
echo "Extension is symlinked - changes to source files take effect on reload."
echo
echo "To enable:"
echo "  gnome-extensions enable $EXT_UUID"
echo
echo "To reload (X11 only):"
echo "  Press Alt+F2, type 'r', Enter"
echo
echo "To watch logs:"
echo "  journalctl -f -o cat /usr/bin/gnome-shell | grep -i codexbar"
echo
echo "To open preferences:"
echo "  gnome-extensions prefs $EXT_UUID"

