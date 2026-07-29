#!/bin/bash
# CodexBar GNOME Extension Uninstaller
# Removes the extension from ~/.local/share/gnome-shell/extensions/

set -e

EXT_UUID="codexbar@local"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "CodexBar GNOME Extension Uninstaller"
echo "====================================="
echo

# Disable extension first (ignore errors if not enabled)
echo "Disabling extension..."
gnome-extensions disable "$EXT_UUID" 2>/dev/null || true

# Remove installation
if [ -d "$EXT_DEST" ] || [ -L "$EXT_DEST" ]; then
    echo "Removing $EXT_DEST..."
    rm -rf "$EXT_DEST"
    echo "Extension removed."
else
    echo "Extension not found at $EXT_DEST"
fi

echo
echo "Uninstallation complete!"
echo
echo "On Wayland: Log out and back in to fully unload."
echo "On X11: Press Alt+F2, type 'r', Enter"

