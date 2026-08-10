# bililive-danmaku-plus-one store listing (0.0.1)

## Single purpose

bililive-danmaku-plus-one provides +1, reply preparation, fullscreen sending, local favorites, and a user-configured repeating sender for on-video danmaku on Bilibili Live. Side chat and areas outside the player do not trigger on-video danmaku selection.

## Permission justifications

- **Storage:** saves settings, browser-local favorites, and the handle for a local folder explicitly selected by the user.
- **Scripting:** performs a user-initiated official danmaku request in the Bilibili page context when the player is in web or native fullscreen.
- **Host access:** recognizes on-video danmaku and uses the official editor or send endpoint only on `https://live.bilibili.com/*`.

## Remote code and data use

All JavaScript, CSS, images, and dependencies are bundled in the Manifest V3 package. The extension does not collect, upload, sell, or share user data. Favorites and repeating-sender settings stay in `storage.local`; favorites are synchronized to a local folder only after explicit user authorization. Privacy-filtered diagnostics are copied only after a user action and are never uploaded automatically.

## Origin

Based on [SadUnicorn171/danmaku-echo](https://github.com/SadUnicorn171/danmaku-echo) 2.2.0 and distributed under GPL-3.0-or-later.
