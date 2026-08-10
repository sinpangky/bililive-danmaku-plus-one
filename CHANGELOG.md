# bililive-danmaku-plus-one Changelog

本文件记录 bililive-danmaku-plus-one 的重要变更。

## [0.0.1] - 2026-08-10

### Added

- 支持 B 站网页全屏和播放器全屏发送文字弹幕。
- 支持把收藏持续同步到用户授权目录下的 `favorites/` JSON 文件。
- 新增“功能面板”，可在收藏与独轮车功能之间切换。
- 支持通过“本房收藏”栏的 `+` 按钮手动添加收藏。
- 支持按添加时间正序初始化的自定义收藏顺序，并可拖动调整。
- 新增独轮车：支持按行发送、超长内容完整分段、总次数或总时长、固定或随机间隔，并可与本房收藏互相添加内容。

### Changed

- 新项目命名为 `bililive-danmaku-plus-one`，版本从 `0.0.1` 开始。
- 扩展缩减为 B 站专用版本，不再请求斗鱼、虎牙或抖音页面权限。
- 删除长按 `Alt+Q` 收藏轮盘；`Alt+Q` 仅用于打开或关闭功能面板。
- 弹幕操作条改为紧凑深黑色中文界面。
- 收藏面板改为灰黑主体、白色强调的中文界面。
- 仅当鼠标位于直播画面内时选择滚动弹幕，右侧聊天栏和其他页面区域不再触发。
- 弹幕操作条改为显示在所选弹幕正下方，并随弹幕字号等比例缩放。
- 收藏与独轮车页面使用统一面板高度；独轮车初始输入框缩减为两行。

### Fixed

- 修复发送 `+1` 后一段时间无法选择下一条弹幕的问题。
- 修复全屏状态下无法通过普通页面输入框发送弹幕的问题。
- 修复长弹幕越出播放器边缘后无法及时点击操作条的问题。
- 修复收藏行“发送”按钮在白色背景上仍显示白字的问题。

### Compatibility

- 收藏数据库、备份格式、消息类型和存储键保持兼容，升级不会主动清空旧收藏或设置。

## [2.2.0] - 2026-08-03

### Added

- Real unpacked-extension E2E coverage for stable Chrome and Edge through the DevTools extension protocol.
- Responsive settings-page E2E coverage in Chinese and English at compact, normal, and wide widths.
- Privacy-safe, in-memory diagnostics that can be copied from the settings page.
- Chinese and English Chrome i18n catalogs for the manifest, settings, actions, feedback, and ARIA labels.
- Platform adapter contracts and ordered rich-danmaku descriptors for incremental entry-point extraction.
- Shared editor DOM helpers, inert overlay snapshots, and platform Emoji configuration modules.
- Tag validation, deterministic release archives, SHA256 checksums, and GitHub Pages privacy publishing.

### Changed

- Replaced Douyin's 50 ms route polling with event-driven routing and a visible-page-only 1 second fallback.
- Bounded and released observers, timers, sender caches, and pending route work when pages are hidden or unloaded.
- Pinned GitHub Actions to immutable commits and updated CI to Node.js 22.22.2.
- Split the settings sidebar and top bar into focused Vue components and removed unused legacy CSS.

### Fixed

- Sender lookup exceptions no longer abort reply preparation without feedback.
- Browser packaging is deterministic and works consistently on Windows and Fedora.
- Settings-page header actions no longer wrap, overlap, or squeeze into vertical text.
- Every localized message now has a complete Chinese fallback.

### Compatibility

- Favorites remain on schema v2; existing favorites are retained without destructive migration.
- Permissions remain limited to the existing `storage`, `scripting`, and current host scope.

[2.2.0]: https://github.com/SadUnicorn171/danmaku-echo/releases/tag/v2.2.0
