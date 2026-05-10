#!/usr/bin/env bash
set -euo pipefail

UUID="openwrt-openvpn-ctrl@tearandfix.github.com"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_BASENAME="openwrt_automation"
KEY_PATH="${TARGET_DIR}/${KEY_BASENAME}"
SETTINGS_SCHEMA="org.gnome.shell.extensions.openwrt-openvpn-ctrl"
SETTINGS_KEY="ssh-private-key-path"

echo "Installing extension to: ${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"

# Copy extension files
cp -f "${SCRIPT_DIR}/metadata.json" "${TARGET_DIR}/metadata.json"
cp -f "${SCRIPT_DIR}/extension.js" "${TARGET_DIR}/extension.js"
cp -f "${SCRIPT_DIR}/prefs.js" "${TARGET_DIR}/prefs.js"
mkdir -p "${TARGET_DIR}/schemas"
cp -f "${SCRIPT_DIR}/schemas/org.gnome.shell.extensions.openwrt-openvpn-ctrl.gschema.xml" \
  "${TARGET_DIR}/schemas/org.gnome.shell.extensions.openwrt-openvpn-ctrl.gschema.xml"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "${TARGET_DIR}/schemas"
else
  echo "glib-compile-schemas not found. Settings UI may not work until schemas are compiled."
fi

# Generate a fresh SSH key pair for OpenWrt automation
rm -f "${KEY_PATH}" "${KEY_PATH}.pub"
ssh-keygen -t ed25519 -f "${KEY_PATH}" -C "${KEY_BASENAME}" -N "" >/dev/null
chmod 600 "${KEY_PATH}"
chmod 644 "${KEY_PATH}.pub"

# Set extension default key path in user settings (only if unset)
if command -v gsettings >/dev/null 2>&1; then
  CURRENT_KEY_PATH="$(GSETTINGS_SCHEMA_DIR="${TARGET_DIR}/schemas" gsettings get "${SETTINGS_SCHEMA}" "${SETTINGS_KEY}" 2>/dev/null || true)"
  CURRENT_KEY_PATH="$(printf "%s" "${CURRENT_KEY_PATH}" | sed "s/^'//;s/'$//")"
  if [[ -z "${CURRENT_KEY_PATH}" ]]; then
    GSETTINGS_SCHEMA_DIR="${TARGET_DIR}/schemas" gsettings set "${SETTINGS_SCHEMA}" "${SETTINGS_KEY}" "${KEY_PATH}" || true
  fi
else
  echo "gsettings not found. Set SSH private key path manually in extension settings."
fi

if command -v gnome-extensions >/dev/null 2>&1; then
  echo "Enabling extension: ${UUID}"
  gnome-extensions enable "${UUID}" || true
else
  echo "gnome-extensions CLI not found. Enable manually in Extensions app."
fi

cat <<EOF
Done.
If the indicator does not appear immediately:
- Wayland: log out and log in again.
- X11: press Alt+F2, type r, press Enter.
Public key generated at: ${KEY_PATH}.pub
Install it on your router in ~/.ssh/authorized_keys.
EOF
