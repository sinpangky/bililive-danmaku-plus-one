# bililive-danmaku-plus-one 浏览器商店资料（0.0.1）

## 单一用途描述

bililive-danmaku-plus-one 仅在 B 站直播画面中提供弹幕 `+1`、回复、全屏发送、本地收藏和用户主动配置的独轮车循环发送。右侧聊天栏和播放器外区域不会触发滚动弹幕选择。

## 权限理由

- `storage`：保存设置、浏览器本地收藏和用户主动选择的本地目录授权信息。
- `scripting`：在 B 站网页全屏或播放器全屏时，于 B 站页面上下文中执行用户主动触发的官方弹幕发送。
- `https://live.bilibili.com/*`：识别直播画面弹幕、显示快捷操作并使用 B 站官方输入框或发送接口。

## 远程代码与数据使用

所有 JavaScript、CSS、图片与依赖均包含在 Manifest V3 安装包内，不下载或执行远程代码。扩展不收集、上传、出售或共享用户数据。收藏与独轮车配置保存在 `storage.local`，收藏只在用户授权后同步到用户选择的本地目录。诊断信息经脱敏，只在用户点击后复制，不自动上传。

## 来源

本项目基于 [SadUnicorn171/danmaku-echo](https://github.com/SadUnicorn171/danmaku-echo) `2.2.0` 修改，使用 GPL-3.0-or-later 许可证。
