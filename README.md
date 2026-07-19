# Danmaku Echo / 弹幕回声

<p align="center">
  <img src="assets/danmaku-echo-icon.png" width="180" alt="Danmaku Echo icon">
</p>

> 为虎牙直播、哔哩哔哩直播和抖音直播带来类似斗鱼的弹幕 `+1` 体验。
> One-click danmaku echoing for Huya Live, Bilibili Live, and Douyin Live.

[中文](#中文) · [English](#english) · [隐私权政策](PRIVACY.md)

![Version](https://img.shields.io/badge/version-1.1.4-orange)
![Manifest](https://img.shields.io/badge/Chrome-Manifest%20V3-blue)
![License](https://img.shields.io/badge/license-GPL--3.0--or--later-green)

## 中文

### 项目简介

Danmaku Echo（弹幕回声）是一个适用于 Chrome 和 Edge 的 Manifest V3 浏览器扩展。它会为直播间右侧聊天区和视频画面上的滚动弹幕添加 `+1` 按钮，让你可以像使用斗鱼弹幕 `+1` 一样，一键复读当前弹幕。

### 支持平台

| 平台 | 右侧聊天区 | 视频弹幕 | 全屏模式 |
| --- | --- | --- | --- |
| 虎牙直播 | ✅ | ✅ | ✅ |
| 哔哩哔哩直播 | ✅ | ✅ | ✅ |
| 抖音直播 | ✅ | ✅（Canvas） | ✅ |

### v1.1.4 版本说明

本版本加入弹幕收藏第一版。收藏只保存在 `chrome.storage.local`，不会上传或跨设备同步；相同文字在全局只保留一份，但会记录它来自哪些平台和直播间。打开收藏时默认聚焦本房内容；“其他直播间”和“全部”先按直播间分组，展开直播间后再选择弹幕发送或加入当前房间。

第一版仅收藏普通文字、Unicode Emoji 和常规标点。Bilibili 主播图片表情、抖音平台图片 Emoji、贴纸等富媒体会被明确拒绝，避免把替代文字误当作原资源收藏。

在直播间短按 `Alt + Q` 会打开固定收藏面板，可搜索、按发送次数或收藏时间排序，并使用数字键 `1–9` 发送已展开的弹幕；长按 `Alt + Q` 会在鼠标位置打开轮盘，本房常用收藏可直接指向并松开发送，“其他收藏”和“更多”会进入对应列表。原生全屏时界面会挂载到 `document.fullscreenElement` 内，因此全屏状态也可操作。

### 抖音 DOM 接管说明

此版本为抖音视频弹幕启用独立的安全 DOM 接管。扩展旁路读取官方 Worker 已解码的 `addBarrage` 数据，保留原消息投递和原生 Worker，然后按同一弹道模型渲染可交互的真实 DOM 弹幕；不拦截 WebSocket、不解析私有协议，也不复制 Canvas 像素。

每条 DOM 弹幕拥有独立状态。鼠标进入时只冻结当前条目的可视位置；`+1` 发送成功或鼠标移出后，会从悬停位置按原速度继续移动，不再快速追赶后台轨迹，因此不会产生弹射感。`+1` 按钮固定预留在弹幕文字后方，悬停不会拉伸弹幕，也不会把操作误绑定到相邻条目。

抖音主站会从普通页面通过 SPA 无刷新进入直播间，因此扩展在 `www.douyin.com/*` 仅常驻一个轻量 URL 启动器；路由进入 `/follow/live/*` 时才补注入页面钩子、设置通道和样式。直接打开 `live.douyin.com/*` 仍从 `document_start` 启动。若钩子较晚才认领到现有 Canvas，则会等待官方 `clear` 后的新弹幕或安全过期窗口，避免隐藏尚未同步的原生内容。

只有当首批 DOM 节点已经连接时，扩展才使用 `visibility: hidden` 隐藏原生 Canvas；Worker 继续在后台运行。设置关闭、心跳超时、渲染异常、Canvas 移除、切房、停止或销毁实例时会立即恢复 Canvas。抖音右侧聊天区仍使用独立的 DOM 消息适配与官方发送流程。

### 核心功能

- 鼠标悬停弹幕时显示 `+1` 按钮，点击后自动发送相同内容。
- 点击“回复”会自动填入 `@发送者 `，聚焦官方输入框并等待用户继续输入，不会自动发送。
- 点击“收藏”会把纯文字、Unicode Emoji 和常规标点保存到浏览器本地；平台图片表情等富媒体不会被降级收藏为替代文字。
- 收藏跨直播间可用且本房优先；短按 `Alt + Q` 打开列表，长按呼出鼠标轮盘，全屏模式同样可用。
- 回复会按显示模式选择输入面：普通模式写入侧边聊天框，全屏模式优先写入播放器快捷回复栏。
- 虎牙与哔哩哔哩的视频弹幕悬停后暂停，移出操作缓冲区后从原位置继续移动。
- 抖音视频弹幕由安全 DOM 层连续渲染，单条悬停暂停、从原位原速续行，且 `+1` 始终位于并绑定当前条目后方。
- 避免相邻或重叠的后续弹幕抢占当前选择。
- 过滤清晰度、设置菜单等播放器控件，只识别真实弹幕。
- 支持文字、Emoji 和最长 1000 个 Unicode 字符的弹幕识别；实际发送长度仍受平台规则限制。
- 抖音 DOM 弹幕会根据官方数据还原文字、描边、颜色与表情，并将表情映射回官方发送文本。
- 支持抖音首次进入直播间、SPA 切房和 Worker/OffscreenCanvas 弹幕，无需二次刷新页面。
- 自动适配原生全屏，并在发送后释放官方输入框焦点。
- 提供 `Alt + 单击` 通用回退操作，应对直播站点类名调整。
- 可分别为虎牙、哔哩哔哩和抖音设置 `+1` 按钮、选中高亮、提示浮层及状态颜色；留空时使用内置默认值。
- 设置通过 `chrome.storage.sync` 保存，不读取账号凭据。

### 安装

#### 从 Release 安装

1. 从 GitHub Releases 下载 ZIP，并解压到固定目录。
2. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的目录。
5. 刷新已经打开的直播页面。

> Chrome/Edge 开发者模式不能直接加载 ZIP，请务必先解压。

#### 从源码安装

克隆仓库后先安装开发依赖并构建，再在扩展程序页面加载 `build/extension` 目录：

```powershell
npm install
npm run build
```

`build/extension` 是唯一应加载的未打包扩展目录；仓库根目录保留源代码、测试和构建配置。

### 使用方法

1. 登录受支持平台并进入直播间。
2. 将鼠标移到右侧聊天消息或视频画面弹幕上。
3. 点击出现的 `+1` 按钮。
4. 扩展会写入官方输入框并触发官方发送流程。

如需回复，点击同一操作条中的“回复”；扩展会填入 `@发送者 ` 并把光标放到官方输入框末尾，后续内容与发送动作由用户完成。
普通模式使用侧边聊天框；进入全屏后使用播放器内可见的快捷回复栏。

如需收藏，点击操作条中的“收藏”。短按 `Alt + Q` 打开本房收藏列表；“其他直播间”和“全部”会先显示直播间名称，展开后才能选择其中弹幕。列表支持搜索、发送次数/时间正序/时间倒序排序、数字键 `1–9` 快速发送、加入本房和删除。长按 `Alt + Q` 约 0.18 秒会在鼠标位置打开轮盘，移动指针选择后松开即可发送，移回中心或按 `Esc` 取消。

点击浏览器工具栏中的扩展图标，可以总开关扩展、分别启用平台以及开关 `Alt + 单击` 回退功能。

抖音调试：在直播页按 `Ctrl + Alt + D`，扩展会把启动链路、Canvas 实例、DOM 接管状态、活动节点数、回退原因和最近事件输出到开发者工具控制台。日志前缀为 `[Danmaku Echo]`。

### 开发与验证

需要 Node.js 20.19 或更高版本（Vite 8 的要求）。

启动 Vue 设置页开发预览：

```powershell
npm run dev
```

```powershell
npm run check
```

该命令会进行 TypeScript 类型检查、使用 Vite 构建 `build/extension`、验证构建产物中的 Manifest，并运行语法与单元测试。

仅构建扩展时运行：

```powershell
npm run build
```

生成发布包：

```powershell
npm run package
```

发布 ZIP 会从 `build/extension` 生成到 `dist/danmaku-echo-v<version>.zip`。

### 项目结构

```text
manifest.json              Manifest V3 清单（构建时原样复制）
src/core/                  跨平台共享类型、文本清洗和设置合并
src/entries/               后台、内容脚本和页面 Hook 的 Vite 构建入口
src/features/favorites/    本地收藏仓库、房间识别、排序、Vue 面板与轮盘运行时
src/platforms/live/        通用直播平台配置
src/platforms/bilibili/    哔哩哔哩 DOM 选择器与平台适配配置
src/platforms/douyin/      抖音协议、弹幕轨迹、富文本和消息模型
src/popup/                 Vue 3 扩展设置页面及其入口
src/popup/components/      设置开关、平台状态和颜色编辑 Vue 组件
src/popup/composables/     设置读取、同步保存和页面状态
src/ui/                    直播间操作条、提示框和抖音卡片 Vue 组件
src/styles/                各内容脚本对应的页面样式
scripts/package.ps1        可复现的发布包生成脚本
scripts/build-extension.mjs Vite 多入口扩展构建脚本
build/extension/           可加载、可发布的生成产物（不提交）
tests/                     清单校验、单元测试和浏览器测试夹具
```

### 隐私与权限

- 申请 `storage` 权限保存扩展设置及本地弹幕收藏；设置使用 `chrome.storage.sync`，收藏使用 `chrome.storage.local` 且不会上传。
- 申请 `scripting` 权限仅用于抖音首次进房和 SPA 进房时补注入直播运行时。
- 抖音主机权限覆盖 `live.douyin.com/*` 与 `www.douyin.com/*`；普通抖音页面只运行不读取页面内容的轻量 URL 启动器，完整功能仅在直播路由启用，不覆盖其他网站。
- 完整功能脚本仅在虎牙直播、哔哩哔哩直播和抖音直播页面启用。
- 不读取 Cookie、密码或登录令牌，不调用私有直播接口。
- 不收集、上传或出售用户数据。

### 兼容性说明

直播平台会持续调整页面结构，本项目通过平台选择器、语义探测和开放 Shadow DOM 探测提高兼容性，但站点大改版后仍可能需要更新。扩展不能绕过登录、禁言、会员/粉丝限制、验证码、平台限流或官方弹幕长度限制。

### 开源协议

本项目使用 [GNU General Public License v3.0 or later](LICENSE) 发布。

Copyright © 2026 sadUnicorn.

这是一份强著佐权许可证：如果你公开发布、分发或提供本项目的修改版、移植版或其他衍生作品，必须继续使用 GPL-3.0-or-later，并向接收者提供完整的对应源代码和许可证文本。GPL 不要求未向他人分发的私人修改必须公开。

### 参与贡献

欢迎提交 Issue 和 Pull Request。请在提交前运行 `npm run check`，并在涉及平台页面结构时说明测试平台、直播模式和浏览器版本。

### 免责声明

本项目与虎牙、哔哩哔哩、抖音及其关联公司无关。请遵守各平台服务条款和社区规则，避免高频复读或骚扰行为。软件按“原样”提供，不附带任何保证。

---

## English

### Overview

Danmaku Echo is a Manifest V3 browser extension for Chrome and Edge. It adds a `+1` button to live-chat messages and on-video scrolling danmaku, providing a one-click echo experience similar to Douyu's native danmaku `+1` feature.

### Supported platforms

| Platform | Side chat | On-video danmaku | Fullscreen |
| --- | --- | --- | --- |
| Huya Live | ✅ | ✅ | ✅ |
| Bilibili Live | ✅ | ✅ | ✅ |
| Douyin Live | ✅ | ✅ (Canvas) | ✅ |

### v1.1.4 release notes

This release adds the first version of danmaku favorites. Favorites stay in `chrome.storage.local`; they are neither uploaded nor synchronized between devices. Equal normalized text is stored once globally while retaining its platform and room origins. The launcher focuses the current room by default; **Other rooms** and **All** first show room groups, then reveal their messages when expanded.

The first version accepts ordinary text, Unicode emoji, and regular punctuation only. Bilibili image emotes, Douyin platform-image emoji, stickers, and other rich assets are explicitly rejected instead of being downgraded to alt text.

Short-press `Alt + Q` in a live room to open the fixed panel, where search, send-count/collection-time sorting, number keys `1–9` for visible expanded messages, add-to-room, and delete are available. Hold `Alt + Q` to open a cursor-centered radial menu: current-room favorites send directly on release, while **Other favorites** and **More** open the corresponding grouped list. In native fullscreen the launcher mounts inside `document.fullscreenElement`.

### Douyin DOM takeover

This release introduces a dedicated safe DOM takeover for Douyin's on-video danmaku. The extension observes already-decoded `addBarrage` instructions sent to the official Worker, preserves their original delivery and the native Worker, and renders interactive DOM danmaku from the same lane model. It does not intercept WebSockets, decode private protocols, or copy Canvas pixels.

Every DOM barrage has independent interaction state. Hover freezes only that node's visible position. After a successful `+1` or pointer leave, it resumes from the held position at its original speed instead of rapidly catching up to the background trajectory, eliminating the slingshot effect. The fixed `+1` area now sits after the message text without stretching the barrage or rebinding to a neighbor.

Douyin can enter a live room from an ordinary page through SPA navigation, so only a lightweight URL bootstrap stays on `www.douyin.com/*`; it injects the page hook, settings channel, and styles when the route enters `/follow/live/*`. Direct `live.douyin.com/*` loads still start at `document_start`. If a late hook recovers an existing Canvas, takeover waits for an official `clear` plus new barrages or a safe expiry window so unsynchronized native content is never hidden.

The native Canvas is hidden with `visibility: hidden` only after the first DOM nodes are connected, while the Worker keeps running in the background. Disabling settings, a heartbeat timeout, renderer failure, Canvas removal, room navigation, stop, or destroy restores the Canvas immediately. Douyin's side chat keeps its separate DOM-message adapter and official send path.

### Features

- Shows a `+1` action when a danmaku is hovered and sends the same content automatically.
- The Reply action inserts `@sender `, focuses the official editor, and waits for user input without sending automatically.
- The Favorite action stores plain text, Unicode emoji, and regular punctuation locally while rejecting platform image emotes and other rich assets.
- Favorites work across rooms with current-room priority; short-press `Alt + Q` for the panel or hold it for the radial menu, including in fullscreen.
- Reply targets the side-chat editor in normal mode and the visible in-player quick editor in fullscreen mode.
- Pauses Huya and Bilibili on-video danmaku on hover, then resumes it from the held position after the pointer leaves.
- Continuously renders Douyin danmaku in a safe DOM layer with per-item hover pause, same-speed resume from the held position, and a correctly bound trailing `+1` action.
- Keeps adjacent or overlapping danmaku from stealing the current selection.
- Rejects player controls such as quality and settings menus.
- Recognizes text, emoji, and messages up to 1,000 Unicode characters; the platform's own sending limit still applies.
- Reconstructs Douyin text, outlines, colors, and emoji from official danmaku data and maps emoji back to official send tokens.
- Supports first room entry, SPA room changes, and Worker/OffscreenCanvas danmaku on Douyin without a second refresh.
- Supports native fullscreen and releases official editor focus after sending.
- Includes an `Alt + click` fallback for future site markup changes.
- Provides independent Huya, Bilibili, and Douyin colors for the `+1` action, selection highlight, overlays, and status feedback; blank values keep the built-in defaults.
- Stores settings with `chrome.storage.sync` and never reads account credentials.

### Installation

#### From a release

1. Download a ZIP from GitHub Releases and extract it to a permanent directory.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the extracted directory.
5. Refresh any live-room tabs that were already open.

> Developer mode cannot load the ZIP directly. Extract it first.

#### From source

Clone the repository, install the development dependencies, build it, then load `build/extension` as an unpacked extension:

```powershell
npm install
npm run build
```

`build/extension` is the only directory intended to be loaded as an unpacked extension. The repository root contains source code, tests, and build configuration.

### Usage

1. Sign in to a supported platform and open a live room.
2. Hover a side-chat message or an on-video danmaku.
3. Click the displayed `+1` button.
4. The extension fills the official editor and triggers the platform's official send flow.

Use the toolbar popup to enable or disable the extension, toggle individual platforms, and control the `Alt + click` fallback.

Click **Favorite** in a danmaku action bar to store it. Short-press `Alt + Q` for the current-room list; search, number-key sending, other-room browsing, add-to-room, and deletion are available there. Hold `Alt + Q` for about 0.18 seconds to open the cursor-centered radial menu, point to an item, and release to send; move back to the center or press `Esc` to cancel.

For Douyin diagnostics, press `Ctrl + Alt + D` in a live room. Startup, Canvas instances, DOM-takeover state, active-node counts, fallback reasons, and recent events are written to DevTools with the `[Danmaku Echo]` prefix.

### Development and verification

Node.js 20.19 or newer is required (the Vite 8 requirement).

Start the Vue settings-page development preview with:

```powershell
npm run dev
```

```powershell
npm run check
```

This type-checks TypeScript, builds `build/extension` with Vite, validates the built manifest, and runs the syntax and unit tests.

To build the extension only:

```powershell
npm run build
```

Create a release archive with:

```powershell
npm run package
```

The archive is built from `build/extension` and written to `dist/danmaku-echo-v<version>.zip`.

### Project layout

```text
manifest.json              Manifest V3 definition (copied during the build)
src/core/                  Cross-platform types, text parsing, and settings
src/entries/               Vite entries for background, content scripts, and page hooks
src/features/favorites/    Local repository, room identity, ranking, Vue panel, and radial runtime
src/platforms/live/        Shared live-platform configuration
src/platforms/bilibili/    Bilibili DOM selectors and adapter configuration
src/platforms/douyin/      Douyin protocol, trajectory, rich-data, and message models
src/popup/                 Vue 3 extension settings page and entry
src/popup/components/      Vue settings, platform, and color controls
src/popup/composables/     Settings loading, sync persistence, and page state
src/ui/                    Vue action bars, feedback toasts, and Douyin card UI
src/styles/                Page styles associated with each content script
scripts/package.ps1        Reproducible release packaging
scripts/build-extension.mjs Vite multi-entry extension build script
build/extension/           Loadable, releasable build output (not committed)
tests/                     Manifest checks, unit tests, and browser fixtures
```

### Privacy and permissions

- Requests `storage` for synchronized settings and local favorites. Favorites use `chrome.storage.local` and are never uploaded.
- Requests `scripting` only to recover the Douyin live runtime on direct and SPA room entry.
- Its Douyin host permission covers `live.douyin.com/*` and `www.douyin.com/*`. Ordinary Douyin pages run only a lightweight URL bootstrap that does not read page content; the complete runtime activates only on live routes and never on unrelated sites.
- Activates complete feature scripts only on Huya Live, Bilibili Live, and Douyin Live pages.
- Does not read cookies, passwords, or login tokens and does not call private live APIs.
- Does not collect, upload, or sell user data.

### Compatibility

Live platforms regularly change their markup. The extension combines platform selectors, semantic detection, and open Shadow DOM traversal, but major site updates may still require adapter changes. It cannot bypass login, moderation, membership, CAPTCHA, rate, or official message-length restrictions.

### License

Released under the [GNU General Public License v3.0 or later](LICENSE).

Copyright © 2026 sadUnicorn.

This is a strong copyleft license. If you publish, convey, or distribute a modified, ported, or otherwise derivative version, you must license the entire covered work under GPL-3.0-or-later and provide recipients with the complete corresponding source code and license text. Private modifications that are not conveyed to others do not have to be published under the GPL.

### Contributing

Issues and pull requests are welcome. Run `npm run check` before submitting changes. For platform adapter changes, include the tested platform, live-room mode, and browser version.

### Disclaimer

This project is not affiliated with Huya, Bilibili, Douyin, or their respective companies. Follow each platform's terms and community rules, and avoid abusive or high-frequency echoing. The software is provided “as is”, without warranty.
