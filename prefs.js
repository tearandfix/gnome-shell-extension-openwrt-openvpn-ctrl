import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const SSH_HOST_SETTING_KEY = "openwrt-host";
const SSH_PRIVATE_KEY_PATH_SETTING_KEY = "ssh-private-key-path";

export default class OpenWrtOpenVpnCtrlPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: "General",
            icon_name: "network-vpn-symbolic",
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: "OpenWrt",
            description: "SSH target used to run /root/vpn-toggle on your router.",
        });
        page.add(group);

        const hostRow = new Adw.EntryRow({
            title: "OpenWrt SSH Host",
            text: settings.get_string(SSH_HOST_SETTING_KEY),
        });
        hostRow.set_input_hints(Gtk.InputHints.NO_EMOJI);
        hostRow.connect("changed", row => {
            settings.set_string(SSH_HOST_SETTING_KEY, row.text.trim());
        });
        group.add(hostRow);

        const keyPathRow = new Adw.EntryRow({
            title: "SSH Private Key Path",
            text: settings.get_string(SSH_PRIVATE_KEY_PATH_SETTING_KEY),
        });
        keyPathRow.set_input_hints(Gtk.InputHints.NO_EMOJI);
        keyPathRow.connect("changed", row => {
            settings.set_string(SSH_PRIVATE_KEY_PATH_SETTING_KEY, row.text.trim());
        });
        group.add(keyPathRow);
    }
}
