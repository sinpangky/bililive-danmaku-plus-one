<template>
  <div class="app-shell">
    <aside class="sidebar" :aria-label="t('settingsNavigation')">
      <div class="brand">
        <img class="brand__mark" src="/assets/icons/icon-128.png" alt="">
        <span class="brand__copy">
          <strong>{{ t('extensionName') }}</strong>
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
          <span>{{ t('settingsGeneral') }}</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'platform-connections' }]"
          href="#platform-connections"
          :aria-current="activeSection === 'platform-connections' ? 'location' : undefined"
          @click.prevent="scrollToSection('platform-connections')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx=".75"/><rect x="14" y="4" width="6" height="6" rx=".75"/><rect x="4" y="14" width="6" height="6" rx=".75"/><rect x="14" y="14" width="6" height="6" rx=".75"/></svg>
          <span>{{ t('settingsPlatforms') }}</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'side-chat-capsule' }]"
          href="#side-chat-capsule"
          :aria-current="activeSection === 'side-chat-capsule' ? 'location' : undefined"
          @click.prevent="scrollToSection('side-chat-capsule')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9.25H9.25L5 19z"/></svg>
          <span>{{ t('settingsSideCapsule') }}</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'native-danmaku-capsule' }]"
          href="#native-danmaku-capsule"
          :aria-current="activeSection === 'native-danmaku-capsule' ? 'location' : undefined"
          @click.prevent="scrollToSection('native-danmaku-capsule')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="5" height="5" rx=".5"/><rect x="10" y="4" width="5" height="5" rx=".5"/><rect x="16" y="4" width="5" height="5" rx=".5"/><rect x="4" y="10" width="5" height="5" rx=".5"/><rect x="16" y="10" width="5" height="5" rx=".5"/><rect x="4" y="16" width="5" height="5" rx=".5"/><rect x="10" y="16" width="5" height="5" rx=".5"/><rect x="16" y="16" width="5" height="5" rx=".5"/><path d="M9 8h2v8H9zM14 8h2v8h-2z"/></svg>
          <span>{{ t('settingsNativeCapsule') }}</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'platform-colors' }]"
          href="#platform-colors"
          :aria-current="activeSection === 'platform-colors' ? 'location' : undefined"
          @click.prevent="scrollToSection('platform-colors')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.25a7.75 7.75 0 1 0 0 15.5h1.25a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h3.75A4 4 0 0 0 19.75 10 7.75 7.75 0 0 0 12 4.25Z"/><circle cx="8" cy="10" r=".75" class="filled"/><circle cx="10.25" cy="7.25" r=".75" class="filled"/><circle cx="14" cy="7.25" r=".75" class="filled"/><circle cx="16.25" cy="10" r=".75" class="filled"/></svg>
          <span>{{ t('settingsColors') }}</span>
        </a>
        <a
          :class="['nav-item', { 'is-active': activeSection === 'favorites-guide' }]"
          href="#favorites-guide"
          :aria-current="activeSection === 'favorites-guide' ? 'location' : undefined"
          @click.prevent="scrollToSection('favorites-guide')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="m12 7.8 1.3 2.64 2.92.42-2.11 2.06.5 2.9L12 14.45l-2.61 1.37.5-2.9-2.11-2.06 2.92-.42z"/></svg>
          <span>{{ t('settingsFavorites') }}</span>
        </a>
        <a class="nav-item" href="https://github.com/SadUnicorn171/danmaku-echo" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 10.75v5"/><circle cx="12" cy="7.75" r=".6" class="filled"/></svg>
          <span>{{ t('settingsAbout') }}</span>
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
              <span>{{ t('settingsHelp') }}</span>
            </a>
            <button
              id="feedback-copy"
              class="feedback-copy"
              type="button"
              :title="t('settingsCopyFeedbackTitle')"
              :aria-label="t('settingsCopyFeedbackAria', feedbackEmail)"
              @click="copyFeedbackEmail(feedbackEmail)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9.25H9.25L5 19z"/></svg>
              <span>{{ t('settingsFeedback') }}</span>
              <code>{{ feedbackEmail }}</code>
            </button>
            <button
              id="diagnostics-copy"
              class="feedback-copy"
              type="button"
              :title="t('settingsCopyDiagnosticsTitle')"
              :aria-label="t('settingsCopyDiagnostics')"
              @click="copyCurrentPageDiagnostics"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.75h8.5L19 8.25v11H7z"/><path d="M15.5 4.75v3.5H19M4.5 8H7M4.5 12H7M4.5 16H7"/></svg>
              <span>{{ t('settingsCopyDiagnostics') }}</span>
            </button>
          </div>
          <label class="master-control" for="enabled">
            <span>{{ t('settingsGlobalStatus') }}</span>
            <input
              id="enabled"
              v-model="settings.enabled"
              type="checkbox"
              role="switch"
              :aria-label="t('ariaEnableExtension')"
              @change="save"
            >
          </label>
        </div>
      </header>

      <main ref="contentCanvas" class="content-canvas">
        <div class="settings-container">
          <section id="general-settings" class="settings-section" aria-labelledby="features-title">
            <h2 id="features-title">{{ t('settingsInteractionFeatures') }}</h2>
            <div class="settings-card">
              <SettingSwitch
                id="feature-enabled"
                v-model="settings.enabled"
                :title="t('settingsQuickActions')"
                :description="t('settingsQuickActionsDescription')"
                :aria-label="t('ariaEnableExtension')"
                @change="save"
              />
              <SettingSwitch
                id="action-plus-one"
                v-model="settings.actions.plusOne"
                :title="t('settingsShowPlusOne')"
                :description="t('settingsShowPlusOneDescription')"
                :aria-label="t('ariaShowPlusOne')"
                @change="save"
              />
              <SettingSwitch
                id="action-reply"
                v-model="settings.actions.reply"
                :title="t('settingsShowReply')"
                :description="t('settingsShowReplyDescription')"
                :aria-label="t('ariaShowReply')"
                @change="save"
              />
              <SettingSwitch
                id="action-favorite"
                v-model="settings.actions.favorite"
                :title="t('settingsShowFavorite')"
                :description="t('settingsShowFavoriteDescription')"
                :aria-label="t('ariaShowFavorite')"
                @change="save"
              />
              <SettingSwitch
                id="altClick"
                v-model="settings.altClick"
                :title="t('settingsAltClick')"
                :description="t('settingsAltClickDescription')"
                @change="save"
              />
            </div>
          </section>

          <section id="platform-connections" class="settings-section" aria-labelledby="platforms-title">
            <h2 id="platforms-title">{{ t('settingsPlatformStatus') }}</h2>
            <div class="settings-card">
              <SettingSwitch
                v-for="platform in platforms"
                :id="`platform-${platform.id}`"
                :key="platform.id"
                v-model="settings.platforms[platform.id]"
                :title="platform.label"
                :description="t('settingsPlatformDescription')"
                :aria-label="t('settingsEnablePlatformAria', platform.label)"
                @change="save"
              />
            </div>
          </section>

          <section id="side-chat-capsule" class="settings-section" aria-labelledby="side-chat-capsule-title">
            <h2 id="side-chat-capsule-title">{{ t('settingsSideCapsuleTitle') }}</h2>
            <div class="settings-card">
              <SettingSwitch
                id="side-chat-capsule-bilibili"
                v-model="settings.sideChatCapsule.bilibili"
                :title="t('settingsSideCapsulePlatformTitle', t('platformBilibili'))"
                :description="t('settingsSideCapsulePlatformDescription', t('platformBilibili'))"
                :aria-label="t('settingsSideCapsulePlatformAria', t('platformBilibili'))"
                @change="save"
              />
              <SettingSwitch
                id="side-chat-capsule-huya"
                v-model="settings.sideChatCapsule.huya"
                :title="t('settingsSideCapsulePlatformTitle', t('platformHuya'))"
                :description="t('settingsSideCapsulePlatformDescription', t('platformHuya'))"
                :aria-label="t('settingsSideCapsulePlatformAria', t('platformHuya'))"
                @change="save"
              />
              <SettingSwitch
                id="side-chat-capsule-douyu"
                v-model="settings.sideChatCapsule.douyu"
                :title="t('settingsSideCapsulePlatformTitle', t('platformDouyu'))"
                :description="t('settingsSideCapsulePlatformDescription', t('platformDouyu'))"
                :aria-label="t('settingsSideCapsulePlatformAria', t('platformDouyu'))"
                @change="save"
              />
            </div>
          </section>

          <section id="native-danmaku-capsule" class="settings-section" aria-labelledby="native-capsule-title">
            <h2 id="native-capsule-title">{{ t('settingsDouyuNativeTitle') }}</h2>
            <div class="settings-card">
              <SettingSwitch
                id="native-danmaku-capsule-douyu"
                v-model="settings.nativeDanmakuCapsule.douyu"
                :title="t('settingsDouyuNativeToggle')"
                :description="t('settingsDouyuNativeDescription')"
                :aria-label="t('settingsDouyuNativeToggle')"
                @change="save"
              />
            </div>
          </section>

          <section id="platform-colors" class="settings-section color-settings-section" aria-labelledby="colors-title">
            <div class="color-section-heading">
              <div>
                <h2 id="colors-title">{{ t('settingsColors') }}</h2>
                <p>{{ t('settingsColorsDescription') }}</p>
              </div>
              <span id="color-count" class="color-count">{{ t('settingsCustomColorCount', String(customColorCount)) }}</span>
            </div>
            <div class="color-platform-list">
              <ColorPlatform
                v-for="platform in platforms"
                :key="platform.id"
                :platform="platform.id"
                :label="platform.label"
                :colors="settings.colors[platform.id]"
                :fields="colorFields"
                @invalid="setStatus(t('settingsInvalidColor'), 'error')"
                @reset="resetPlatformColors(platform.id)"
                @update-color="(key, value) => setColor(platform.id, key, value)"
              />
            </div>
          </section>

          <section id="favorites-guide" class="settings-section" aria-labelledby="favorites-title">
            <div class="section-heading">
              <div>
                <h2 id="favorites-title">{{ t('settingsFavorites') }}</h2>
                <p>{{ t('settingsFavoritesDescription') }}</p>
              </div>
              <span>{{ t('settingsLocalStorage') }}</span>
            </div>
            <div class="favorites-page-card">
              <div class="favorites-guide-intro">
                <div class="favorites-guide-statement">
                  <span class="favorites-guide-plus" aria-hidden="true">+1</span>
                  <h3>{{ t('settingsFavoritesStatementLine1') }}<br>{{ t('settingsFavoritesStatementLine2') }}</h3>
                  <p>{{ t('settingsFavoritesGuideDescription') }}</p>
                  <ul :aria-label="t('settingsFavoritesSupportedAria')">
                    <li>{{ t('settingsFavoritesPlainText') }}</li>
                    <li>Unicode Emoji</li>
                    <li>{{ t('settingsFavoritesRichText') }}</li>
                  </ul>
                </div>

                <div class="favorites-guide-preview" :aria-label="t('settingsFavoritesPreviewAria')">
                  <div class="favorites-preview-head">
                    <span>{{ t('favoritesCurrentRoom') }}</span>
                    <small>{{ t('favoritesRoomItemCount', '3') }}</small>
                  </div>
                  <div class="favorites-preview-tabs">
                    <span class="is-active">{{ t('favoritesCurrent') }} <small>3</small></span>
                    <span>{{ t('favoritesOtherRooms') }} <small>8</small></span>
                    <span>{{ t('favoritesAll') }} <small>11</small></span>
                  </div>
                  <div class="favorites-preview-sort">
                    <span>{{ t('favoritesOtherRooms') }}</span>
                    <small>{{ t('favoritesSortSendCountLabel') }}</small>
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

              <ol class="favorites-guide-flow" :aria-label="t('settingsFavoritesFlowAria')">
                <li>
                  <span class="favorites-flow-index">1</span>
                  <span><strong>{{ t('settingsFavoritesStepSave') }}</strong><small>{{ t('settingsFavoritesStepSaveDescription') }}</small></span>
                </li>
                <li>
                  <span class="favorites-flow-index">2</span>
                  <span><strong>{{ t('settingsFavoritesStepList') }}</strong><small><kbd>Alt</kbd> + <kbd>Q</kbd>{{ t('settingsFavoritesStepListDescription') }}</small></span>
                </li>
                <li>
                  <span class="favorites-flow-index">3</span>
                  <span><strong>{{ t('settingsFavoritesStepWheel') }}</strong><small>{{ t('settingsFavoritesStepWheelDescription') }} <kbd>Q</kbd>。</small></span>
                </li>
              </ol>

              <div class="favorites-guide-note">
                <strong>{{ t('settingsLocal') }}</strong>
                <span>{{ t('settingsFavoritesPrivacyNote') }}</span>
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
import { t } from "./core/i18n";

const feedbackEmail = "sadunicorn1113@gmail.com";
const platforms: ReadonlyArray<{ id: PlatformId; label: string }> = [
  { id: "bilibili", label: t("platformBilibili") },
  { id: "douyin", label: t("platformDouyin") },
  { id: "douyu", label: t("platformDouyu") },
  { id: "huya", label: t("platformHuya") }
];
const colorFields: ReadonlyArray<{
  defaultValue: string;
  key: ColorSettingKey;
  label: string;
}> = [
  { key: "actionStart", label: t("colorActionStart"), defaultValue: "#FD8101" },
  { key: "actionEnd", label: t("colorActionEnd"), defaultValue: "#FD8101" },
  { key: "actionText", label: t("colorActionText"), defaultValue: "#FFFFFF" },
  { key: "focusRing", label: t("colorFocusRing"), defaultValue: "#FD8101" },
  { key: "selection", label: t("colorSelection"), defaultValue: "#FD8101" },
  { key: "panelBackground", label: t("colorPanelBackground"), defaultValue: "#FD8101" },
  { key: "panelText", label: t("colorPanelText"), defaultValue: "#FFFFFF" },
  { key: "success", label: t("colorSuccess"), defaultValue: "#27AE60" },
  { key: "warning", label: t("colorWarning"), defaultValue: "#E6A000" },
  { key: "error", label: t("colorError"), defaultValue: "#FF4747" }
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
  "favorites-guide": t("settingsFavorites"),
  "general-settings": t("settingsGeneral"),
  "native-danmaku-capsule": t("settingsNativeCapsule"),
  "platform-colors": t("settingsColors"),
  "platform-connections": t("settingsPlatforms"),
  "side-chat-capsule": t("settingsSideCapsule")
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

async function writeClipboardText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.readOnly = true;
    input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(input);
    try {
      input.select();
      return document.execCommand("copy");
    } finally {
      input.remove();
    }
  }
}

async function copyCurrentPageDiagnostics(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== "number") throw new Error("active-tab-unavailable");
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "danmaku-echo.diagnostics.snapshot"
    });
    if (!response?.ok || !response.snapshot) throw new Error("diagnostics-unavailable");
    const copied = await writeClipboardText(JSON.stringify(response.snapshot, null, 2));
    if (!copied) throw new Error("clipboard-rejected");
    setStatus(t("settingsDiagnosticsCopied"), "saved");
  } catch {
    setStatus(t("settingsDiagnosticsUnavailable"), "error");
  }
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
