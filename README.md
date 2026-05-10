# OpenWRT OpenVPN Ctrl (GNOME Shell Extension)

A GNOME Shell extension that lets you start and stop an OpenVPN client running on your OpenWrt router over SSH. It also shows a country flag emoji in the top panel based on the current public IP geolocation.

## How it works

- The panel indicator displays the country flag emoji for the current public IP, resolved via `ipapi.co`.
- The flag refreshes automatically every 120 seconds and on demand via the menu.
- VPN toggle commands are sent to the router over SSH by running `/root/vpn-toggle <start|stop>`.
- The SSH host and private key path are read from GSettings at the time of each command.

### Indicator menu

| Item | Action |
|---|---|
| Current country: XX | Status (non-interactive) |
| Turn VPN On | SSH → `/root/vpn-toggle start` |
| Turn VPN Off | SSH → `/root/vpn-toggle stop` |
| Refresh now | Re-fetch geolocation immediately |
| Settings | Open extension preferences |

## Requirements

- GNOME Shell 50+
- Internet access to `ipapi.co`
- OpenWrt router reachable over SSH with `/root/vpn-toggle` installed

## Install (local development)

1. Run the installer:

   ```bash
   ./install.sh
   ```

   The installer:
   - Copies `extension.js`, `prefs.js`, `metadata.json`, and the GSettings schema to `~/.local/share/gnome-shell/extensions/openwrt-openvpn-ctrl@tearandfix.github.com/`
   - Compiles the GSettings schema
   - Generates a fresh ed25519 SSH key pair (`openwrt_automation` / `openwrt_automation.pub`) in the extension directory
   - Sets `ssh-private-key-path` to the generated key (only if currently empty)
   - Enables the extension via `gnome-extensions enable`

2. Copy the generated public key to your router:

   ```bash
   cat ~/.local/share/gnome-shell/extensions/openwrt-openvpn-ctrl@tearandfix.github.com/openwrt_automation.pub
   # Append the output to /root/.ssh/authorized_keys on your OpenWrt router
   ```

3. Copy `vpn-toggle` to your router:

   ```bash
   scp vpn-toggle root@<router-ip>:/root/vpn-toggle
   ssh root@<router-ip> chmod +x /root/vpn-toggle
   ```

4. Restart GNOME Shell:
   - X11: press `Alt+F2`, type `r`, press Enter.
   - Wayland: log out and log in again.

## Configuration

Open **Settings** from the indicator menu, or run:

```bash
gnome-extensions prefs openwrt-openvpn-ctrl@tearandfix.github.com
```

| Setting | Description | Example |
|---|---|---|
| OpenWrt SSH Host | SSH destination passed to `ssh` | `root@192.168.1.1` |
| SSH Private Key Path | Path to ed25519 private key (`-i` flag) | `~/.local/…/openwrt_automation` |

Settings can also be read/written directly:

```bash
gsettings get org.gnome.shell.extensions.openwrt-openvpn-ctrl openwrt-host
gsettings set org.gnome.shell.extensions.openwrt-openvpn-ctrl openwrt-host 'root@192.168.1.1'
```

## Debugging

```bash
journalctl -f /usr/bin/gnome-shell
```

Log lines are prefixed with `[openwrt-vpn]`.
