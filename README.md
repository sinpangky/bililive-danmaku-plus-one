# Danmaku Echo / 弹幕回声

<p align="center">
  <img src="assets/danmaku-echo-icon.png" width="180" alt="Danmaku Echo icon">
</p>

> 为虎牙直播、哔哩哔哩直播和抖音直播带来类似斗鱼的弹幕 `+1` 体验。
> One-click danmaku echoing for Huya Live, Bilibili Live, and Douyin Live.

[中文](#中文) · [English](#english)

![Version](https://img.shields.io/badge/version-1.0.0-orange)
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

### v1.0.0 版本说明

这是弹幕回声的首个开源版本，支持虎牙、哔哩哔哩和抖音直播聊天区、视频弹幕及全屏模式下的一键 `+1`。

> **已知问题：** 抖音适配仍存在少量 Bug。由于抖音直播弹幕使用 Canvas 绘制且页面结构会动态变化，部分直播间可能偶发弹幕识别、悬停响应、文字与 Emoji 分组或自动发送行为不一致的问题，后续版本会继续改进。

### 核心功能

- 鼠标悬停弹幕时显示 `+1` 按钮，点击后自动发送相同内容。
- 视频弹幕悬停后暂停，移出操作缓冲区后从原位置继续移动。
- 避免相邻或重叠的后续弹幕抢占当前选择。
- 过滤清晰度、设置菜单等播放器控件，只识别真实弹幕。
- 支持文字、Emoji 和最长 1000 个 Unicode 字符的弹幕识别；实际发送长度仍受平台规则限制。
- 抖音 Canvas 弹幕使用像素快照保持原生字体、描边和表情外观。
- 自动适配原生全屏，并在发送后释放官方输入框焦点。
- 提供 `Alt + 单击` 通用回退操作，应对直播站点类名调整。
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

克隆仓库后，直接在扩展程序页面加载仓库根目录即可。本项目没有运行时第三方依赖，也不需要构建步骤。

### 使用方法

1. 登录受支持平台并进入直播间。
2. 将鼠标移到右侧聊天消息或视频画面弹幕上。
3. 点击出现的 `+1` 按钮。
4. 扩展会写入官方输入框并触发官方发送流程。

点击浏览器工具栏中的扩展图标，可以总开关扩展、分别启用平台以及开关 `Alt + 单击` 回退功能。

### 开发与验证

需要 Node.js 18 或更高版本。

```powershell
npm run check
```

该命令会验证 Manifest、检查 JavaScript 语法并运行单元测试。

生成发布包：

```powershell
npm run package
```

发布 ZIP 会生成到 `dist/danmaku-echo-v<version>.zip`。

### 项目结构

```text
manifest.json              Manifest V3 清单
src/content.js             弹幕识别、悬停、输入与发送适配
src/content.css            页面内按钮、冻结层和提示样式
src/shared.js              平台判断、文本清洗和设置合并
src/douyin-page-hook.js    抖音 Canvas 捕获、分组与冻结适配
popup/                     扩展设置弹窗
scripts/package.ps1        可复现的发布包生成脚本
tests/                     清单校验、单元测试和浏览器测试夹具
```

### 隐私与权限

- 仅申请 `storage` 权限，用于保存扩展设置。
- 仅在虎牙直播、哔哩哔哩直播和抖音直播页面注入内容脚本。
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

### v1.0.0 release notes

This is the first open-source release of Danmaku Echo. It supports one-click `+1` actions in side chat, on-video danmaku, and fullscreen mode on Huya Live, Bilibili Live, and Douyin Live.

> **Known issue:** Douyin support still has a few bugs. Because its live danmaku is Canvas-rendered and its page structure changes dynamically, some rooms may occasionally show inconsistent danmaku detection, hover response, text-and-emoji grouping, or automatic sending. These cases will continue to be improved in later releases.

### Features

- Shows a `+1` action when a danmaku is hovered and sends the same content automatically.
- Pauses on-video danmaku on hover and resumes it from the held position after the pointer leaves.
- Keeps adjacent or overlapping danmaku from stealing the current selection.
- Rejects player controls such as quality and settings menus.
- Recognizes text, emoji, and messages up to 1,000 Unicode characters; the platform's own sending limit still applies.
- Preserves Douyin's native Canvas fonts, outlines, and emoji with pixel snapshots.
- Supports native fullscreen and releases official editor focus after sending.
- Includes an `Alt + click` fallback for future site markup changes.
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

Clone the repository and load its root directory as an unpacked extension. There are no runtime third-party dependencies and no build step is required.

### Usage

1. Sign in to a supported platform and open a live room.
2. Hover a side-chat message or an on-video danmaku.
3. Click the displayed `+1` button.
4. The extension fills the official editor and triggers the platform's official send flow.

Use the toolbar popup to enable or disable the extension, toggle individual platforms, and control the `Alt + click` fallback.

### Development and verification

Node.js 18 or newer is required.

```powershell
npm run check
```

This validates the manifest, checks JavaScript syntax, and runs the unit tests.

Create a release archive with:

```powershell
npm run package
```

The archive is written to `dist/danmaku-echo-v<version>.zip`.

### Project layout

```text
manifest.json              Manifest V3 definition
src/content.js             Danmaku detection, hover, editor, and send adapters
src/content.css            In-page action, frozen layer, and toast styles
src/shared.js              Platform detection, text parsing, and settings
src/douyin-page-hook.js    Douyin Canvas capture, grouping, and freeze adapter
popup/                     Extension settings popup
scripts/package.ps1        Reproducible release packaging
tests/                     Manifest checks, unit tests, and browser fixtures
```

### Privacy and permissions

- Requests only the `storage` permission for extension settings.
- Injects content scripts only on Huya Live, Bilibili Live, and Douyin Live.
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
