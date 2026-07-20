<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="设置导航">
      <div class="brand">
        <img class="brand__mark" :src="'../assets/icons/icon-128.png'" alt="">
        <span class="brand__copy">
          <strong>弹幕回声</strong>
          <small id="version">v{{ version }}</small>
        </span>
      </div>

      <nav class="nav-list">
        <a
          :class="['nav-item', { 'is-active': activeSection === 'general-settings' }]"
          href="#general-settings"
          :aria-current="activeSection === 'general-settings' ? 'page' : undefined"
          @click="activeSection = 'general-settings'"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z"/><path d="M19.1 13.2c.06-.4.06-.8 0-1.2l1.46-1.13-1.75-3.04-1.72.7a7.3 7.3 0 0 0-1.04-.6L15.8 6.1h-3.5l-.26 1.83c-.36.17-.7.37-1.03.6l-1.72-.7-1.75 3.04L9 12c-.03.4-.03.8 0 1.2l-1.46 1.13 1.75 3.04 1.72-.7c.33.23.67.43 1.03.6l.26 1.83h3.5l.26-1.83c.36-.17.7-.37 1.03-.6l1.72.7 1.75-3.04z"/></svg>
          <span>常规设置</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'platform-connections' }]"
          href="#platform-connections"
          :aria-current="activeSection === 'platform-connections' ? 'page' : undefined"
          @click="activeSection = 'platform-connections'"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx=".75"/><rect x="14" y="4" width="6" height="6" rx=".75"/><rect x="4" y="14" width="6" height="6" rx=".75"/><rect x="14" y="14" width="6" height="6" rx=".75"/></svg>
          <span>平台详情</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'favorites-guide' }]"
          href="#favorites-guide"
          :aria-current="activeSection === 'favorites-guide' ? 'page' : undefined"
          @click="activeSection = 'favorites-guide'"
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

      <main class="content-canvas">
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
                description="收藏通用文字弹幕；短按 Alt+Q 打开列表，长按呼出轮盘。"
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
            <div class="settings-card platform-card">
              <PlatformRow
                v-for="platform in platforms"
                :key="platform.id"
                v-model="settings.platforms[platform.id]"
                :platform="platform.id"
                :label="platform.label"
                @change="save"
              />
              <div class="platform-feature-heading">
                <strong>侧边聊天栏弹幕胶囊</strong>
                <small>弹幕胶囊包含 +1、回复和收藏；默认关闭，视频画面弹幕不受影响。</small>
              </div>
              <SettingSwitch
                id="side-chat-capsule-bilibili"
                v-model="settings.sideChatCapsule.bilibili"
                title="Bilibili 显示弹幕胶囊"
                description="开启后，悬停侧边聊天消息时显示 +1、回复和收藏按钮。"
                aria-label="在 Bilibili 侧边聊天栏显示弹幕胶囊"
                @change="save"
              />
              <SettingSwitch
                id="side-chat-capsule-huya"
                v-model="settings.sideChatCapsule.huya"
                title="虎牙显示弹幕胶囊"
                description="开启后，悬停侧边聊天消息时显示 +1、回复和收藏按钮。"
                aria-label="在虎牙侧边聊天栏显示弹幕胶囊"
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
                v-for="(platform, index) in platforms"
                :key="platform.id"
                :platform="platform.id"
                :label="platform.label"
                :colors="settings.colors[platform.id]"
                :fields="colorFields"
                :open="index === 0"
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
                    <li>常规标点</li>
                  </ul>
                </div>

                <div class="favorites-guide-preview" aria-label="收藏面板示意图">
                  <div class="favorites-preview-head">
                    <span>当前直播间</span>
                    <small>6 条本房收藏</small>
                  </div>
                  <div class="favorites-preview-tabs">
                    <span>本房收藏 <small>6</small></span>
                    <span class="is-active">其他直播间 <small>12</small></span>
                    <span>全部 <small>18</small></span>
                  </div>
                  <div class="favorites-preview-sort">
                    <span>其他直播间</span>
                    <small>排序：发送次数</small>
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>阿橙的直播间</strong><small>2 条收藏 · 已发送 11 次</small></span>
                    <em>2</em>
                    <b aria-hidden="true" />
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>小北的直播间</strong><small>4 条收藏 · 已发送 6 次</small></span>
                    <em>4</em>
                    <b aria-hidden="true" />
                  </div>
                  <div class="favorites-preview-group">
                    <span><strong>橘子汽水直播间</strong><small>6 条收藏 · 已发送 4 次</small></span>
                    <em>6</em>
                    <b aria-hidden="true" />
                  </div>
                </div>
              </div>

              <ol class="favorites-guide-flow" aria-label="收藏使用流程">
                <li>
                  <span class="favorites-flow-index">1</span>
                  <span><strong>先收藏</strong><small>悬停普通文字弹幕，点击“收藏”。</small></span>
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
                  收藏使用 Chrome 本地存储，不上传、不联网。平台图片表情和贴纸暂不支持。
                </span>
              </div>
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
import type { ColorSettingKey, PlatformId } from "../core/types";
import ColorPlatform from "./components/ColorPlatform.vue";
import PlatformRow from "./components/PlatformRow.vue";
import SettingSwitch from "./components/SettingSwitch.vue";
import { useSettings } from "./composables/useSettings";

const feedbackEmail = "2926074960@qq.com";
const platforms: ReadonlyArray<{ id: PlatformId; label: string }> = [
  { id: "bilibili", label: "Bilibili" },
  { id: "douyin", label: "Douyin" },
  { id: "huya", label: "Huya" }
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
  activeSection,
  copyFeedbackEmail,
  save,
  settings,
  setStatus,
  statusKind,
  statusMessage,
  statusVisible,
  version
} = useSettings();

const customColorCount = computed(() => platforms.reduce((total, platform) => (
  total + Object.values(settings.colors[platform.id]).filter(Boolean).length
), 0));
const activeSectionTitle = computed(() => ({
  "favorites-guide": "弹幕收藏",
  "platform-connections": "平台详情"
}[activeSection.value] || "常规设置"));

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
