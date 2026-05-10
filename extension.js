import Soup from "gi://Soup";
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
const IPAPI_URL = "https://ipapi.co/json/";

function countryCodeToFlag(code) {
    code = (code || "").trim().toUpperCase();
    if (code.length !== 2 || !/^[A-Z]{2}$/.test(code))
        return "🌐";
    const base = 0x1F1E6;
    return String.fromCodePoint(base + code.charCodeAt(0) - 65) +
           String.fromCodePoint(base + code.charCodeAt(1) - 65);
}

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

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const settingsItem = new PopupMenu.PopupMenuItem("Settings");
        settingsItem.connect("activate", () => this._extension.openPreferences());
        this.menu.addMenuItem(settingsItem);

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

    async _refreshCountryFlag() {
        console.log(`[openwrt-vpn] Fetching country from ${IPAPI_URL}`);
        try {
            const session = new Soup.Session();
            const message = Soup.Message.new("GET", IPAPI_URL);
            message.request_headers.append("User-Agent", "country-flag-gnome-extension/1.0");
            message.request_headers.append("Accept", "application/json");

            const bytes = await new Promise((resolve, reject) => {
                session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (source, result) => {
                    try {
                        resolve(source.send_and_read_finish(result));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            console.log(`[openwrt-vpn] HTTP status: ${message.status_code}`);

            if (message.status_code !== 200) {
                this._setErrorState(`HTTP ${message.status_code}`);
                return;
            }

            const decoder = new TextDecoder();
            const body = decoder.decode(bytes.toArray());

            const data = JSON.parse(body);
            const countryCode = (data.country_code || "").trim().toUpperCase();
            console.log(`[openwrt-vpn] Country code: ${countryCode}`);

            if (countryCode.length !== 2) {
                this._setErrorState("Could not read a valid country code");
                return;
            }

            this._label.set_text(countryCodeToFlag(countryCode));
            this._statusItem.label.text = `Current country: ${countryCode}`;
            console.log(`[openwrt-vpn] Flag updated to ${countryCode}`);
        } catch (error) {
            console.error(`[openwrt-vpn] Error fetching country: ${error}`);
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
            const [, , stderrBytes, exitCode] = GLib.spawn_sync(
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
