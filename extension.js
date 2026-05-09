import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

const REFRESH_INTERVAL_SECONDS = 120;
const SSH_HOST_SETTING_KEY = "openwrt-host";
const SSH_PRIVATE_KEY_PATH_SETTING_KEY = "ssh-private-key-path";

const CountryFlagIndicator = GObject.registerClass(
class CountryFlagIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, "Country Flag Indicator");

        this._extension = extension;
        this._refreshTimerId = null;

        this._label = new St.Label({
            text: "🌐",
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "country-flag-label",
        });
        this.add_child(this._label);

        this._statusItem = new PopupMenu.PopupMenuItem("Resolving country...");
        this._statusItem.setSensitive(false);
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const vpnOnItem = new PopupMenu.PopupMenuItem("Turn VPN On");
        vpnOnItem.connect("activate", () => this._toggleVpn("start"));
        this.menu.addMenuItem(vpnOnItem);

        const vpnOffItem = new PopupMenu.PopupMenuItem("Turn VPN Off");
        vpnOffItem.connect("activate", () => this._toggleVpn("stop"));
        this.menu.addMenuItem(vpnOffItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupMenuItem("Refresh now");
        refreshItem.connect("activate", () => this._refreshCountryFlag());
        this.menu.addMenuItem(refreshItem);

        this._refreshCountryFlag();
        this._startTimer();
    }

    _startTimer() {
        this._clearTimer();
        this._refreshTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL_SECONDS,
            () => {
                this._refreshCountryFlag();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _clearTimer() {
        if (this._refreshTimerId !== null) {
            GLib.Source.remove(this._refreshTimerId);
            this._refreshTimerId = null;
        }
    }

    _refreshCountryFlag() {
        const scriptPath = `${this._extension.path}/ip_country_flag.py`;
        const [ok, stdout, stderr, exitCode] = GLib.spawn_command_line_sync(
            `python3 "${scriptPath}"`
        );

        if (!ok || exitCode !== 0) {
            const errText = stderr ? stderr.toString().trim() : "Unknown command failure";
            this._setErrorState(errText);
            return;
        }

        try {
            const outputText = stdout.toString();
            const parsed = JSON.parse(outputText);

            if (!parsed.ok) {
                this._setErrorState(parsed.error ?? "Country lookup failed");
                return;
            }

            const flag = parsed.flag ?? "🌐";
            const countryCode = parsed.country_code ?? "??";
            this._label.set_text(flag);
            this._statusItem.label.text = `Current country: ${countryCode}`;
        } catch (error) {
            this._setErrorState(`${error}`);
        }
    }

    _toggleVpn(action) {
        const settings = this._extension.getSettings();
        const host = settings.get_string(SSH_HOST_SETTING_KEY).trim();
        const privateKeyPath = settings.get_string(SSH_PRIVATE_KEY_PATH_SETTING_KEY).trim();

        if (!host) {
            this._setErrorState("Set OpenWrt SSH host in extension settings");
            return;
        }

        const remoteCommand = `/root/vpn-toggle ${action}`;
        const command = [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
        ];
        if (privateKeyPath) {
            command.push("-i", privateKeyPath);
        }
        command.push(host, remoteCommand);

        try {
            const [, stdoutBytes, stderrBytes, exitCode] = GLib.spawn_sync(
                null,
                command,
                null,
                GLib.SpawnFlags.SEARCH_PATH,
                null
            );

            if (exitCode === 0) {
                this._statusItem.label.text = action === "start"
                    ? "VPN command sent: ON"
                    : "VPN command sent: OFF";
                return;
            }

            const errText = stderrBytes ? stderrBytes.toString().trim() : "SSH command failed";
            this._setErrorState(errText || "SSH command failed");
        } catch (error) {
            this._setErrorState(`${error}`);
        }
    }

    _setErrorState(errorMessage) {
        this._label.set_text("🌐");
        this._statusItem.label.text = `Error: ${errorMessage}`;
    }

    destroy() {
        this._clearTimer();
        super.destroy();
    }
});

export default class CountryFlagByIpExtension extends Extension {
    enable() {
        this._indicator = new CountryFlagIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, "right");
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
