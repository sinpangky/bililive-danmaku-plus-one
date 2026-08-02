<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="设置导航">
      <div class="brand">
        <img class="brand__mark" src="/assets/icons/icon-128.png" alt="">
        <span class="brand__copy">
          <strong>弹幕回声</strong>
          <small id="version">v{{ version }}</small>
        </span>
      </div>

      <nav class="nav-list">
        <a
          :class="['nav-item', { 'is-active': activeSection === 'general-settings' }]"
          href="#general-settings"
          :aria-current="activeSection === 'general-settings' ? 'location' : undefined"
          @click.prevent="scrollToSection('general-settings')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z"/><path d="M19.1 13.2c.06-.4.06-.8 0-1.2l1.46-1.13-1.75-3.04-1.72.7a7.3 7.3 0 0 0-1.04-.6L15.8 6.1h-3.5l-.26 1.83c-.36.17-.7.37-1.03.6l-1.72-.7-1.75 3.04L9 12c-.03.4-.03.8 0 1.2l-1.46 1.13 1.75 3.04 1.72-.7c.33.23.67.43 1.03.6l.26 1.83h3.5l.26-1.83c.36-.17.7-.37 1.03-.6l1.72.7 1.75-3.04z"/></svg>
          <span>常规设置</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'platform-connections' }]"
          href="#platform-connections"
          :aria-current="activeSection === 'platform-connections' ? 'location' : undefined"
          @click.prevent="scrollToSection('platform-connections')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx=".75"/><rect x="14" y="4" width="6" height="6" rx=".75"/><rect x="4" y="14" width="6" height="6" rx=".75"/><rect x="14" y="14" width="6" height="6" rx=".75"/></svg>
          <span>平台详情</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'side-chat-capsule' }]"
          href="#side-chat-capsule"
          :aria-current="activeSection === 'side-chat-capsule' ? 'location' : undefined"
          @click.prevent="scrollToSection('side-chat-capsule')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9.25H9.25L5 19z"/></svg>
          <span>聊天栏胶囊</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'native-danmaku-capsule' }]"
          href="#native-danmaku-capsule"
          :aria-current="activeSection === 'native-danmaku-capsule' ? 'location' : undefined"
          @click.prevent="scrollToSection('native-danmaku-capsule')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="5" height="5" rx=".5"/><rect x="10" y="4" width="5" height="5" rx=".5"/><rect x="16" y="4" width="5" height="5" rx=".5"/><rect x="4" y="10" width="5" height="5" rx=".5"/><rect x="16" y="10" width="5" height="5" rx=".5"/><rect x="4" y="16" width="5" height="5" rx=".5"/><rect x="10" y="16" width="5" height="5" rx=".5"/><rect x="16" y="16" width="5" height="5" rx=".5"/><path d="M9 8h2v8H9zM14 8h2v8h-2z"/></svg>
          <span>原生胶囊</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'platform-colors' }]"
          href="#platform-colors"
          :aria-current="activeSection === 'platform-colors' ? 'location' : undefined"
          @click.prevent="scrollToSection('platform-colors')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.25a7.75 7.75 0 1 0 0 15.5h1.25a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h3.75A4 4 0 0 0 19.75 10 7.75 7.75 0 0 0 12 4.25Z"/><circle cx="8" cy="10" r=".75" class="filled"/><circle cx="10.25" cy="7.25" r=".75" class="filled"/><circle cx="14" cy="7.25" r=".75" class="filled"/><circle cx="16.25" cy="10" r=".75" class="filled"/></svg>
          <span>直播间颜色</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'favorites-guide' }]"
          href="#favorites-guide"
          :aria-current="activeSection === 'favorites-guide' ? 'location' : undefined"
          @click.prevent="scrollToSection('favorites-guide')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="m12 7.8 1.3 2.64 2.92.42-2.11 2.06.5 2.9L12 14.45l-2.61 1.37.5-2.9-2.11-2.06 2.92-.42z"/></svg>
          <span>弹幕收藏</span>
        </a>
        <a class="nav-item" href="https://github.com/SadUnicorn171/danmaku-echo" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 10.75v5"/><circle cx="12" cy="7.75" r=".6" class="filled"/></svg>
          <span>关于</span>
        </a>
      </nav>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <h1>{{ activeSectionTitle }}</h1>
        <div class="topbar__actions">
          <div class="resource-links">
            <a href="https://github.com/SadUnicorn171/danmaku-echo#使用方法" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M9.9 9.45a2.25 2.25 0 1 1 3.55 1.83c-.9.63-1.45 1.1-1.45 2.22"/><circle cx="12" cy="16.25" r=".6" class="filled"/></svg>
              <span>帮助</span>
            </a>
            <button
              id="feedback-copy"
              class="feedback-copy"
              type="button"
              title="点击复制反馈邮箱"
              :aria-label="`复制反馈邮箱 ${feedbackEmail}`"
              @click="copyFeedbackEmail(feedbackEmail)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9.25H9.25L5 19z"/></svg>
              <span>反馈</span>
              <code>{{ feedbackEmail }}</code>
            </button>
          </div>
          <label class="master-control" for="enabled">
            <span>全局状态</span>
            <input
              id="enabled"
              v-model="settings.enabled"
              type="checkbox"
              role="switch"
              aria-label="启用弹幕回声"
              @change="save"
            >
          </label>
        </div>
      </header>

      <main ref="contentCanvas" class="content-canvas">
        <div class="settings-container">
          <section id="general-settings" class="settings-section" aria-labelledby="features-title">
            <h2 id="features-title">交互功能</h2>
            <div class="settings-card">
              <SettingSwitch
                id="feature-enabled"
                v-model="settings.enabled"
                title="弹幕快捷操作"
                description="自动识别弹幕，并显示 +1、回复与收藏快捷操作。"
                aria-label="启用弹幕功能增强"
                @change="save"
              />
              <SettingSwitch
                id="action-plus-one"
                v-model="settings.actions.plusOne"
                title="显示 +1"
                description="在弹幕快捷操作条中显示 +1 选项。"
                aria-label="显示加一选项"
                @change="save"
              />
              <SettingSwitch
                id="action-reply"
                v-model="settings.actions.reply"
                title="显示回复"
                description="点击后自动 @ 弹幕发送者，并聚焦输入框等待输入。"
                aria-label="显示回复选项"
                @change="save"
              />
              <SettingSwitch
                id="action-favorite"
                v-model="settings.actions.favorite"
                title="显示收藏"
                description="收藏文字、Unicode Emoji 与平台图片表情；短按 Alt+Q 打开列表，长按呼出轮盘。"
                aria-label="显示收藏选项"
                @change="save"
              />
              <SettingSwitch
                id="altClick"
                v-model="settings.altClick"
                title="Alt + 单击通用回退"
                description="直播站点结构变化时，按住 Alt 单击弹幕仍可尝试快速复读。"
                @change="save"
              />
            </div>
          </section>

          <section id="platform-connections" class="settings-section" aria-labelledby="platforms-title">
            <h2 id="platforms-title">平台启用状态</h2>
            <div class="settings-card">
              <SettingSwitch
                v-for="platform in platforms"
                :id="`platform-${platform.id}`"
                :key="platform.id"
                v-model="settings.platforms[platform.id]"
                :title="platform.label"
                description="启用后可在该平台直播间使用弹幕快捷操作与收藏功能。"
                :aria-label="`启用${platform.label}平台`"
                @change="save"
              />
            </div>
          </section>

          <section id="side-chat-capsule" class="settings-section" aria-labelledby="side-chat-capsule-title">
            <h2 id="side-chat-capsule-title">侧边聊天栏弹幕胶囊</h2>
            <div class="settings-card">
              <SettingSwitch
                id="side-chat-capsule-bilibili"
                v-model="settings.sideChatCapsule.bilibili"
                title="Bilibili 显示弹幕胶囊"
                description="开启后，悬停 Bilibili 侧边聊天消息时显示 +1、回复和收藏按钮。"
                aria-label="在 Bilibili 侧边聊天栏显示弹幕胶囊"
                @change="save"
              />
              <SettingSwitch
                id="side-chat-capsule-huya"
                v-model="settings.sideChatCapsule.huya"
                title="虎牙显示弹幕胶囊"
                description="开启后，悬停虎牙侧边聊天消息时显示 +1、回复和收藏按钮。"
                aria-label="在虎牙侧边聊天栏显示弹幕胶囊"
                @change="save"
              />
              <SettingSwitch
                id="side-chat-capsule-douyu"
                v-model="settings.sideChatCapsule.douyu"
                title="斗鱼显示弹幕胶囊"
                description="开启后，悬停斗鱼侧边聊天消息时显示 +1、回复和收藏按钮。"
                aria-label="在斗鱼侧边聊天栏显示弹幕胶囊"
                @change="save"
              />
            </div>
          </section>

          <section id="native-danmaku-capsule" class="settings-section" aria-labelledby="native-capsule-title">
            <h2 id="native-capsule-title">斗鱼播放器原生胶囊</h2>
            <div class="settings-card">
              <SettingSwitch
                id="native-danmaku-capsule-douyu"
                v-model="settings.nativeDanmakuCapsule.douyu"
                title="显示斗鱼原生弹幕胶囊"
                description="开启后恢复斗鱼播放器自带的 +1、回复和收藏胶囊，可能与插件快捷操作同时显示。"
                aria-label="显示斗鱼播放器原生弹幕胶囊"
                @change="save"
              />
            </div>
          </section>

          <section id="platform-colors" class="settings-section color-settings-section" aria-labelledby="colors-title">
            <div class="color-section-heading">
              <div>
                <h2 id="colors-title">直播间颜色</h2>
                <p>每个平台独立生效；留空或恢复默认时，继续使用插件内置颜色。</p>
              </div>
              <span id="color-count" class="color-count">{{ customColorCount }} 项自定义</span>
            </div>
            <div class="color-platform-list">
              <ColorPlatform
                v-for="platform in platforms"
                :key="platform.id"
                :platform="platform.id"
                :label="platform.label"
                :colors="settings.colors[platform.id]"
                :fields="colorFields"
                @invalid="setStatus('颜色值请使用 #RRGGBB 格式', 'error')"
                @reset="resetPlatformColors(platform.id)"
                @update-color="(key, value) => setColor(platform.id, key, value)"
              />
            </div>
          </section>

          <section id="favorites-guide" class="settings-section" aria-labelledby="favorites-title">
            <div class="section-heading">
              <div>
                <h2 id="favorites-title">弹幕收藏</h2>
                <p>把常用弹幕留在手边，在全屏直播中也能快速找到和发送。</p>
              </div>
              <span>本地存储</span>
            </div>
            <div class="favorites-page-card">
              <div class="favorites-guide-intro">
                <div class="favorites-guide-statement">
                  <span class="favorites-guide-plus" aria-hidden="true">+1</span>
                  <h3>收藏一次，<br>到哪都能发。</h3>
                  <p>进入直播间时先显示本房收藏；“其他直播间”和“全部”先选直播间，再进入独立的弹幕选择页。</p>
                  <ul aria-label="当前支持的收藏内容">
                    <li>普通文字</li>
                    <li>Unicode Emoji</li>
                    <li>平台图片表情与混排内容</li>
                  </ul>
                </div>

                <div class="favorites-guide-preview" aria-label="收藏面板示意图">
                  <div class="favorites-preview-head">
                    <span>当前直播间</span>
                    <small>3 条本房收藏</small>
                  </div>
                  <div class="favorites-preview-tabs">
                    <span class="is-active">本房收藏 <small>3</small></span>
                    <span>其他直播间 <small>8</small></span>
                    <span>全部 <small>11</small></span>
                  </div>
                  <div class="favorites-preview-sort">
                    <span>其他直播间</span>
                    <small>排序：发送次数</small>
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>老张的游戏间</strong><small>3 条收藏 · 已发送 14 次</small></span>
                    <em>3</em>
                    <b aria-hidden="true" />
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>小鱼聊电影</strong><small>2 条收藏 · 已发送 7 次</small></span>
                    <em>2</em>
                    <b aria-hidden="true" />
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>大刘音乐台</strong><small>3 条收藏 · 已发送 9 次</small></span>
                    <em>3</em>
                    <b aria-hidden="true" />
                  </div>
                </div>
              </div>

              <ol class="favorites-guide-flow" aria-label="收藏使用流程">
                <li>
                  <span class="favorites-flow-index">1</span>
                  <span><strong>先收藏</strong><small>悬停支持收藏的弹幕，点击“收藏”。</small></span>
                </li>
                <li>
                  <span class="favorites-flow-index">2</span>
                  <span><strong>短按打开列表</strong><small><kbd>Alt</kbd> + <kbd>Q</kbd>，再按 1–9 发送。</small></span>
                </li>
                <li>
                  <span class="favorites-flow-index">3</span>
                  <span><strong>长按打开轮盘</strong><small>指向一条收藏，松开 <kbd>Q</kbd> 发送。</small></span>
                </li>
              </ol>

              <div class="favorites-guide-note">
                <strong>本地</strong>
                <span>
                  所有可识别弹幕均可收藏，内容只保存在 Chrome 本地。发送平台图片表情时，当前平台和账号需仍可使用对应资源。
                </span>
              </div>

              <FavoritesDataTools @status="setStatus" />
            </div>
          </section>
        </div>
      </main>
    </section>
  </div>

  <p
    id="status"
    :class="['save-status', { 'is-visible': statusVisible }, statusKind && `is-${statusKind}`]"
    role="status"
    aria-live="polite"
  >
    {{ statusMessage }}
  </p>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ColorSettingKey, PlatformId } from "./core/types";
import ColorPlatform from "./components/ColorPlatform.vue";
import FavoritesDataTools from "./components/FavoritesDataTools.vue";
import SettingSwitch from "./components/SettingSwitch.vue";
import { useSectionNavigation } from "./composables/useSectionNavigation";
import { useSettings } from "./composables/useSettings";

const feedbackEmail = "sadunicorn1113@gmail.com";
const platforms: ReadonlyArray<{ id: PlatformId; label: string }> = [
  { id: "bilibili", label: "Bilibili" },
  { id: "douyin", label: "抖音" },
  { id: "douyu", label: "斗鱼" },
  { id: "huya", label: "虎牙" }
];
const colorFields: ReadonlyArray<{
  defaultValue: string;
  key: ColorSettingKey;
  label: string;
}> = [
  { key: "actionStart", label: "+1 渐变起始", defaultValue: "#FD8101" },
  { key: "actionEnd", label: "+1 渐变结束", defaultValue: "#FD8101" },
  { key: "actionText", label: "+1 按钮文字", defaultValue: "#FFFFFF" },
  { key: "focusRing", label: "键盘焦点光环", defaultValue: "#FD8101" },
  { key: "selection", label: "弹幕选中高亮", defaultValue: "#FD8101" },
  { key: "panelBackground", label: "提示浮层背景", defaultValue: "#FD8101" },
  { key: "panelText", label: "提示浮层文字", defaultValue: "#FFFFFF" },
  { key: "success", label: "成功状态", defaultValue: "#27AE60" },
  { key: "warning", label: "警告状态", defaultValue: "#E6A000" },
  { key: "error", label: "失败状态", defaultValue: "#FF4747" }
];

const {
  copyFeedbackEmail,
  save,
  settings,
  setStatus,
  statusKind,
  statusMessage,
  statusVisible,
  version
} = useSettings();
const { activeSection, contentCanvas, scrollToSection } = useSectionNavigation([
  "general-settings",
  "platform-connections",
  "side-chat-capsule",
  "native-danmaku-capsule",
  "platform-colors",
  "favorites-guide"
] as const);

const customColorCount = computed(() => platforms.reduce((total, platform) => (
  total + Object.values(settings.colors[platform.id]).filter(Boolean).length
), 0));
const activeSectionTitle = computed(() => ({
  "favorites-guide": "弹幕收藏",
  "general-settings": "常规设置",
  "native-danmaku-capsule": "原生胶囊",
  "platform-colors": "直播间颜色",
  "platform-connections": "平台详情",
  "side-chat-capsule": "聊天栏胶囊"
}[activeSection.value]));

function setColor(platform: PlatformId, key: ColorSettingKey, value: string): void {
  settings.colors[platform][key] = value;
  save();
}

function resetPlatformColors(platform: PlatformId): void {
  colorFields.forEach((field) => {
    settings.colors[platform][field.key] = "";
  });
  save();
}
</script>

<style lang="scss">
:root {
  color-scheme: light;
  font-family: "Microsoft YaHei UI", "PingFang SC", "Segoe UI", sans-serif;
  --canvas: #f3f3f3;
  --surface: #f9f9f9;
  --surface-muted: #eeeeee;
  --border: #c4c7c7;
  --text: #1a1c1c;
  --text-secondary: #444748;
  --text-muted: #747878;
  --success: #27ae60;
  --danger: #ff4747;
  --shadow: 0 1px 1px rgb(0 0 0 / 5%);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--canvas);
  min-height: 600px;
  min-width: 800px;
  scroll-behavior: smooth;
}

body {
  color: var(--text);
  margin: 0;
  min-height: 600px;
  min-width: 800px;
}

button,
input {
  font: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

.app-shell {
  background: var(--canvas);
  display: flex;
  height: 100vh;
  min-height: 600px;
  overflow: hidden;
  width: 100%;
}

.sidebar {
  align-items: stretch;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex: 0 0 240px;
  flex-direction: column;
  padding: 24px 17px 24px 16px;
  position: relative;
  z-index: 2;
}

.brand {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  padding: 0 8px;
}

.brand__mark {
  border-radius: 4px;
  display: block;
  flex: 0 0 32px;
  height: 32px;
  object-fit: contain;
  width: 32px;
}

.brand__copy {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
}

.brand__copy strong {
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
}

.brand__copy small {
  color: var(--text-secondary);
  font-family: Georgia, serif;
  font-size: 10px;
  line-height: 15px;
}

.nav-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  align-items: center;
  border-radius: 6px;
  color: var(--text-secondary);
  display: flex;
  font-size: 14px;
  gap: 12px;
  line-height: 20px;
  min-height: 36px;
  padding: 8px 12px;
  transition: background-color 140ms ease, color 140ms ease;
}

.nav-item:hover:not(.is-disabled) {
  background: rgb(228 226 226 / 32%);
  color: var(--text);
}

.nav-item:focus-visible {
  outline: 2px solid rgb(39 174 96 / 38%);
  outline-offset: -2px;
}

.nav-item.is-active {
  background: rgb(228 226 226 / 50%);
  color: #646464;
}

.nav-item.is-disabled {
  cursor: default;
}

.nav-item svg {
  fill: none;
  flex: 0 0 16px;
  height: 16px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.65;
  width: 16px;
}

.nav-item svg .filled,
.resource-links svg .filled,
.platform-status svg .filled {
  fill: currentColor;
  stroke: none;
}

.main-area {
  background: var(--canvas);
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.topbar {
  align-items: center;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  flex: 0 0 56px;
  height: 56px;
  justify-content: space-between;
  padding: 0 24px;
  position: relative;
  z-index: 2;
}

.topbar h1 {
  font-size: 18px;
  font-weight: 500;
  line-height: 28px;
  margin: 0;
}

.topbar__actions,
.resource-links,
.resource-links a,
.resource-links button,
.master-control {
  align-items: center;
  display: flex;
}

.topbar__actions {
  gap: 16px;
}

.resource-links {
  border-right: 1px solid var(--border);
  gap: 16px;
  padding-right: 20px;
}

.resource-links a,
.resource-links button {
  background: transparent;
  border: 0;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  gap: 4px;
  line-height: 20px;
  margin: 0;
  padding: 0;
}

.resource-links a:hover,
.resource-links button:hover {
  color: var(--text);
}

.resource-links a:focus-visible,
.resource-links button:focus-visible {
  border-radius: 3px;
  outline: 2px solid rgb(39 174 96 / 38%);
  outline-offset: 2px;
}

.feedback-copy code {
  color: var(--text);
  font: 500 12px/20px ui-monospace, "Cascadia Mono", Consolas, monospace;
  user-select: text;
}

.resource-links svg {
  fill: none;
  height: 14px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
  width: 14px;
}

.master-control {
  cursor: pointer;
  font-size: 14px;
  gap: 8px;
  line-height: 20px;
  white-space: nowrap;
}

.content-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 32px max(32px, calc((100% - 768px) / 2));
  position: relative;
  scrollbar-color: #c8caca transparent;
  scrollbar-width: thin;
  z-index: 1;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin: 0 auto;
  max-width: 768px;
  width: 100%;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-margin-top: 24px;
}

.settings-section h2 {
  color: #000;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .05em;
  line-height: 20px;
  margin: 0;
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.section-heading {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.section-heading > div {
  min-width: 0;
}

.section-heading p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 20px;
  margin: 4px 0 0;
}

.section-heading > span {
  background: rgb(253 129 1 / 10%);
  border: 1px solid rgb(253 129 1 / 26%);
  border-radius: 999px;
  color: #b65c00;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .07em;
  line-height: 16px;
  padding: 3px 8px;
  white-space: nowrap;
}

.favorites-page-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
}

.favorites-page-card::before {
  background: #fd8101;
  content: "";
  height: 3px;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 1;
}

.favorites-guide-intro {
  display: grid;
  grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.2fr);
  min-height: 300px;
}

.favorites-guide-statement {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 36px 32px 32px;
}

.favorites-guide-plus {
  align-items: center;
  background: #fd8101;
  border-radius: 16px;
  color: #fff;
  display: flex;
  font: 700 17px/1 Bahnschrift, "Segoe UI", sans-serif;
  height: 36px;
  justify-content: center;
  margin-bottom: 24px;
  width: 46px;
}

.favorites-guide-statement h3 {
  color: #171717;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: -.035em;
  line-height: 37px;
  margin: 0;
}

.favorites-guide-statement > p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
  margin: 15px 0 0;
  max-width: 290px;
}

.favorites-guide-statement ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 15px;
  list-style: none;
  margin: auto 0 0;
  padding: 20px 0 0;
}

.favorites-guide-statement li {
  color: var(--text-muted);
  font-size: 9px;
  line-height: 16px;
  padding-left: 10px;
  position: relative;
}

.favorites-guide-statement li::before {
  background: #fd8101;
  border-radius: 999px;
  content: "";
  height: 4px;
  left: 0;
  position: absolute;
  top: 6px;
  width: 4px;
}

.favorites-guide-preview {
  align-self: stretch;
  background: #fffaf5;
  border-left: 1px solid rgb(253 129 1 / 22%);
  min-width: 0;
  padding: 35px 30px 26px;
}

.favorites-preview-head,
.favorites-preview-tabs,
.favorites-preview-sort,
.favorites-preview-group {
  align-items: center;
  display: flex;
}

.favorites-preview-head {
  justify-content: space-between;
  margin-bottom: 18px;
}

.favorites-preview-head > span {
  color: #202020;
  font-size: 11px;
  font-weight: 600;
}

.favorites-preview-head > small {
  color: #777;
  font-size: 8px;
}

.favorites-preview-tabs {
  border-bottom: 1px solid #d4d5d3;
  gap: 20px;
  margin-bottom: 0;
}

.favorites-preview-tabs > span {
  color: #888;
  font-size: 8px;
  line-height: 30px;
  padding: 0;
  position: relative;
  white-space: nowrap;
}

.favorites-preview-tabs > span.is-active {
  color: #202020;
}

.favorites-preview-tabs > span.is-active::after {
  background: #fd8101;
  bottom: -1px;
  content: "";
  height: 2px;
  left: 0;
  position: absolute;
  right: 0;
}

.favorites-preview-tabs small {
  color: inherit;
  font-size: 7px;
  margin-left: 3px;
}

.favorites-preview-sort {
  border-bottom: 1px solid #dedfdd;
  justify-content: space-between;
  min-height: 30px;
}

.favorites-preview-sort > span {
  color: #555;
  font-size: 8px;
  font-weight: 600;
}

.favorites-preview-sort > small {
  color: #777;
  font-size: 7px;
}

.favorites-preview-group {
  border-bottom: 1px solid #dedfdd;
  gap: 8px;
  min-height: 47px;
}

.favorites-preview-group > b {
  border-color: transparent transparent transparent #fd8101;
  border-style: solid;
  border-width: 4px 0 4px 6px;
  height: 0;
  transform-origin: 3px 4px;
  width: 0;
}

.favorites-preview-group > span {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.favorites-preview-group strong {
  color: #222;
  font-size: 9px;
  font-weight: 600;
}

.favorites-preview-group small {
  color: #888;
  font-size: 7px;
  margin-top: 1px;
}

.favorites-preview-group > em {
  align-items: center;
  border: 1px solid #d4d5d3;
  border-radius: 10px;
  color: #777;
  display: flex;
  font-size: 7px;
  font-style: normal;
  height: 19px;
  justify-content: center;
  width: 25px;
}

.favorites-guide-flow {
  display: grid;
  gap: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #dfe0de;
}

.favorites-guide-flow li {
  align-items: center;
  display: flex;
  gap: 13px;
  min-height: 92px;
  padding: 18px 22px;
}

.favorites-guide-flow li + li {
  border-left: 1px solid #dfe0de;
}

.favorites-flow-index {
  align-items: center;
  border: 2px solid #fd8101;
  border-radius: 50%;
  color: #b65c00;
  display: flex;
  flex: 0 0 28px;
  font: 600 11px/1 Bahnschrift, "Segoe UI", sans-serif;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.favorites-guide-flow li > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.favorites-guide-flow li strong {
  color: #222;
  font-size: 11px;
  font-weight: 600;
  line-height: 17px;
}

.favorites-guide-flow li small {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 17px;
  margin-top: 2px;
}

.favorites-guide-flow kbd {
  background: #f0f2f2;
  border: 1px solid #d2d7d7;
  border-radius: 4px;
  box-shadow: inset 0 -1px #c8cdcd;
  color: #303535;
  font-family: inherit;
  font-size: 9px;
  padding: 1px 4px;
}

.favorites-guide-note {
  align-items: center;
  background: #faf7f3;
  border-top: 1px solid #e4ded6;
  display: flex;
  gap: 10px;
  padding: 12px 20px;
}

.favorites-guide-note strong {
  color: #b65c00;
  font-size: 10px;
  font-weight: 600;
  line-height: 20px;
}

.favorites-guide-note > span {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 18px;
}

.save-status {
  background: rgb(249 249 249 / 96%);
  border: 1px solid var(--border);
  border-radius: 4px;
  bottom: 18px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
  color: var(--text-muted);
  font-size: 12px;
  line-height: 18px;
  margin: 0;
  opacity: 0;
  padding: 6px 10px;
  pointer-events: none;
  position: fixed;
  right: 20px;
  transform: translateY(8px);
  transition: opacity 140ms ease, transform 140ms ease;
  z-index: 5;
}

.save-status.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.save-status.is-saved {
  border-color: rgb(39 174 96 / 35%);
  color: #197d43;
}

.save-status.is-error {
  border-color: rgb(201 76 76 / 35%);
  color: var(--danger);
}

@media (max-width: 900px) {
  .sidebar {
    flex-basis: 200px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .content-canvas {
    padding-left: 24px;
    padding-right: 24px;
  }

  .setting-copy small {
    font-size: 13px;
  }

  .color-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .color-field:nth-child(odd) {
    border-right: 0;
  }

  .favorites-guide-intro {
    grid-template-columns: minmax(0, 1fr);
  }

  .favorites-guide-statement > p {
    max-width: 430px;
  }

  .favorites-guide-statement ul {
    margin-top: 0;
  }

  .favorites-guide-preview {
    border-left: 0;
    border-top: 1px solid #dedfdd;
  }

  .favorites-guide-flow {
    grid-template-columns: minmax(0, 1fr);
  }

  .favorites-guide-flow li {
    min-height: 0;
  }

  .favorites-guide-flow li + li {
    border-left: 0;
    border-top: 1px solid #dfe0de;
  }

  .favorites-data-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .favorites-data-actions button {
    flex: 1;
    justify-content: center;
  }
}

@media (max-height: 700px) {
  .content-canvas {
    padding-bottom: 24px;
    padding-top: 24px;
  }

  .settings-container {
    gap: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
</style>

