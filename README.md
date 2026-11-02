# firefox-tab-collector

Press one key to gather every YouTube tab from all of your Firefox windows into one new window.
It works with any window manager or desktop that can bind a key to a command (niri, Sway, Hyprland, GNOME, KDE, …).

What it does:
- Gathers YouTube tabs from all normal windows into one new window. The tabs keep their order, window by window.
- If you have more than one homepage (`youtube.com/`) open, it closes the extras. The one you used most recently becomes the first tab.
- If the YouTube tabs are already alone in one window, it reorders them there instead of opening another window.
- It ignores private windows and `music.youtube.com`.

## How it works

Firefox gives outside programs no way to control tabs, so the work is done by a small extension.

1. `yt-collect` opens the trigger address `http://yt-collect.invalid/` in the Firefox that's already running.
2. The extension blocks that request, closes the trigger tab, and collects the tabs.

The `.invalid` domain can never resolve, so the trigger never reaches the network. The extension's toolbar button runs the same collection.

## Install

### 1. The extension

Regular Firefox only installs signed add-ons. Signing is free and can be private (unlisted):

1. Get API credentials at https://addons.mozilla.org/developers/addon/api/key/.
2. Sign the extension:

   ```sh
   cd extension
   WEB_EXT_API_KEY='user:…' WEB_EXT_API_SECRET='…' npx web-ext sign --channel=unlisted
   ```

3. Open the `.xpi` from `extension/web-ext-artifacts/` in Firefox. Drag it into a window, or use File → Open File.

Before signing again, increase `version` in `manifest.json`. AMO won't sign the same version twice.

To try it without signing, go to `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" and pick `extension/manifest.json`. That copy is removed when Firefox restarts.

### 2. The trigger script

`yt-collect` assumes Firefox from Flatpak (`org.mozilla.firefox`). If you installed Firefox some other way, change the last line to:

```sh
exec firefox --new-tab "http://yt-collect.invalid/"
```

### 3. A keybinding

For niri (`~/.config/niri/config.kdl`, inside `binds { }`):

```kdl
Mod+Y hotkey-overlay-title="Collect YouTube Tabs" { spawn "/path/to/firefox-tab-collector/yt-collect"; }
```

## License

[MIT](LICENSE)
