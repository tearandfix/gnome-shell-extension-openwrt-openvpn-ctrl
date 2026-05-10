# OpenWRT OpenVPN Ctrl (GNOME Shell Extension)


This GNOME Shell extension allow controlling OpenVPN client running on your OpenWRT router. 
It also shows a country flag in the top panel based on your current public IP geolocation. 

## How it works

- `extension.js` adds a panel indicator and periodically refreshes it.
- The panel displays the flag and the country code in the indicator menu.

## Requirements

- GNOME Shell 45+
- Internet access to `ipapi.co`

## Install (local development)

1. Run the installer:

   ```bash
   ./install.sh
   ```

2. The installer will:
   - copy extension files to `~/.local/share/gnome-shell/extensions/openwrt-openvpn-ctrl@tearandfix`
   - generate a fresh SSH key pair in that directory:
     - private key: `openwrt_automation`
     - public key: `openwrt_automation.pub`
   - set `ssh-private-key-path` in extension settings (if currently empty) to the generated private key path

3. Add the generated public key to your OpenWrt router (`~/.ssh/authorized_keys`).

4. Restart GNOME Shell:
   - X11: press `Alt+F2`, type `r`, press Enter.
   - Wayland: log out and log in again.

5. Enable the extension:

   ```bash
   gnome-extensions enable openwrt-openvpn-ctrl@tearandfix
   ```

## Manual refresh

Open the indicator menu and click **Refresh now**.
