# Store listing and privacy disclosures (2.2.0)

## Single purpose

Danmaku Echo provides consistent danmaku actions on Huya, Bilibili, Douyin, and Douyu Live: users can echo a side-chat or on-video message through the site's official editor, prepare a reply, and keep reusable danmaku in browser-local favorites.

## Permission justifications

- **Storage:** saves user-selected settings and locally favorited danmaku. Browser sync may synchronize settings; favorites remain in local extension storage. Schema v2 remains backward compatible.
- **Scripting:** restores the packaged Douyin live runtime after single-page navigation into a supported live route. It neither downloads nor executes remote code.
- **Host access:** recognizes danmaku and drives the existing official editor on supported Huya, Bilibili, Douyin, and Douyu live pages. The broader `www.douyin.com/*` match only detects navigation into `/follow/live/*`; non-live routes run a lightweight URL bootstrap.

## Remote code

No. All JavaScript, CSS, images, and dependencies are bundled in the submitted Manifest V3 package. There are no external scripts or modules, remote Wasm, `eval()`, `new Function()`, or downloaded executable code.

## Data use

The extension does not collect, upload, sell, or share user data. Preferences use browser-managed storage, and favorites stay in `storage.local`. Diagnostics are privacy-filtered, generated in memory, and copied only after a user action; they are not persisted or uploaded.

## Privacy policy

https://sadunicorn171.github.io/danmaku-echo/
