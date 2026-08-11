# bililive-danmaku-plus-one Changelog

本文件记录 bililive-danmaku-plus-one 的重要变更。

## [0.0.2] - 2026-08-12

### Added

- 新增 `复制` 快捷操作，直播画面与侧边聊天栏均使用 `+1 | 复制 | 收藏 | 回复` 顺序，并可在设置页独立开关。
- 新增 B 站侧边聊天栏弹幕胶囊开关，支持侧栏文字、Unicode Emoji、B 站小表情和单个房间表情。
- 新增剪贴板兼容回退与复制结果提示。
- 新增覆盖真实 B 站侧栏房间表情 DOM、荣耀等级标识、三类表情和操作条定位的单元、回归与 Chromium 场景测试。

### Changed

- 直播间默认配色改为灰黑与白色，移除旧的橙色默认值；设置页和收藏界面同步使用克制的深色主题。
- 侧栏操作条移到消息行外侧并与当前消息垂直居中，保留从消息到按钮的连续悬停区域，避免遮挡正文和中断手动选取。
- 内容脚本提前到 `document_end` 启动，并在 BFCache 恢复、播放器重新挂载和页面可见性变化时重新激活。
- B 站富文本识别按发送能力区分单发房间表情、可与文字混排的 B 站小表情和 Unicode Emoji。
- 将构建链中的 `brace-expansion`、`nanoid` 和 `postcss` 固定到已修复安全公告的兼容补丁版本。
- 浏览器 E2E 的单场景首次失败会使用全新浏览器配置重试一次；持续失败仍会阻断 CI，并保留两次诊断产物。

### Fixed

- 修复进入 `live.bilibili.com` 后插件偶尔不能立即响应悬停、需要等待或刷新页面的问题。
- 修复荣耀等级 40 级以上用户弹幕前的飘屏标识、荣耀等级和粉丝勋章被误当作弹幕内容或 B 站表情的问题。
- 修复侧栏胶囊与当前消息高度偏移过大、移动到按钮时误选下一条消息的问题。
- 修复侧栏胶囊遮挡弹幕正文，导致无法手动拖选复制的问题。
- 修复侧栏单个房间表情因 B 站同时渲染图片和同名文本标签而被误判为“房间表情 + 文字”的问题，包括 `[SAD]` 与 `SAD` 这类仅差规范化方括号的真实结构。
- 修复侧边聊天栏开启胶囊后仍不显示快捷操作，以及聊天栏滚动时胶囊位置不同步的问题。
- 修复直播画面中的单个房间表情缺少侧边栏专属 DOM 标记时，`+1` 被降级为发送 `[表情名]` 文字的问题；唯一匹配的面板型滚动表情现在会通过 B 站原生表情面板发送，同时不改变普通 B 站小表情和 Unicode Emoji 的文字发送路径。

### Compatibility

- 继续仅请求 `live.bilibili.com`、`storage` 和 `scripting` 权限，不新增站点或敏感权限。
- 收藏数据库、备份格式、消息类型和存储键保持兼容；新增操作开关对旧设置默认启用复制，不清空已有收藏或自定义颜色。

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
[0.0.2]: https://github.com/sinpangky/bililive-danmaku-plus-one/releases/tag/v0.0.2
[0.0.1]: https://github.com/sinpangky/bililive-danmaku-plus-one/releases/tag/v0.0.1
