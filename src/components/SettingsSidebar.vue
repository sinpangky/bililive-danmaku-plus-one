<template>
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
        @click.prevent="emit('navigate', 'general-settings')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z"/><path d="M19.1 13.2c.06-.4.06-.8 0-1.2l1.46-1.13-1.75-3.04-1.72.7a7.3 7.3 0 0 0-1.04-.6L15.8 6.1h-3.5l-.26 1.83c-.36.17-.7.37-1.03.6l-1.72-.7-1.75 3.04L9 12c-.03.4-.03.8 0 1.2l-1.46 1.13 1.75 3.04 1.72-.7c.33.23.67.43 1.03.6l.26 1.83h3.5l.26-1.83c.36-.17.7-.37 1.03-.6l1.72.7 1.75-3.04z"/></svg>
        <span>{{ t('settingsGeneral') }}</span>
      </a>
      <a
        :class="['nav-item', { 'is-active': activeSection === 'platform-connections' }]"
        href="#platform-connections"
        :aria-current="activeSection === 'platform-connections' ? 'location' : undefined"
        @click.prevent="emit('navigate', 'platform-connections')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx=".75"/><rect x="14" y="4" width="6" height="6" rx=".75"/><rect x="4" y="14" width="6" height="6" rx=".75"/><rect x="14" y="14" width="6" height="6" rx=".75"/></svg>
        <span>{{ t('settingsPlatforms') }}</span>
      </a>
      <a
        :class="['nav-item', { 'is-active': activeSection === 'side-chat-capsule' }]"
        href="#side-chat-capsule"
        :aria-current="activeSection === 'side-chat-capsule' ? 'location' : undefined"
        @click.prevent="emit('navigate', 'side-chat-capsule')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9.25H9.25L5 19z"/></svg>
        <span>{{ t('settingsSideCapsule') }}</span>
      </a>
      <a
        :class="['nav-item', { 'is-active': activeSection === 'platform-colors' }]"
        href="#platform-colors"
        :aria-current="activeSection === 'platform-colors' ? 'location' : undefined"
        @click.prevent="emit('navigate', 'platform-colors')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.25a7.75 7.75 0 1 0 0 15.5h1.25a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h3.75A4 4 0 0 0 19.75 10 7.75 7.75 0 0 0 12 4.25Z"/><circle cx="8" cy="10" r=".75" class="filled"/><circle cx="10.25" cy="7.25" r=".75" class="filled"/><circle cx="14" cy="7.25" r=".75" class="filled"/><circle cx="16.25" cy="10" r=".75" class="filled"/></svg>
        <span>{{ t('settingsColors') }}</span>
      </a>
      <a
        :class="['nav-item', { 'is-active': activeSection === 'favorites-guide' }]"
        href="#favorites-guide"
        :aria-current="activeSection === 'favorites-guide' ? 'location' : undefined"
        @click.prevent="emit('navigate', 'favorites-guide')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="m12 7.8 1.3 2.64 2.92.42-2.11 2.06.5 2.9L12 14.45l-2.61 1.37.5-2.9-2.11-2.06 2.92-.42z"/></svg>
        <span>{{ t('settingsFavorites') }}</span>
      </a>
      <a
        :class="['nav-item', { 'is-active': activeSection === 'send-logs' }]"
        href="#send-logs"
        :aria-current="activeSection === 'send-logs' ? 'location' : undefined"
        @click.prevent="emit('navigate', 'send-logs')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75h12v14.5H6zM9 8h6M9 12h6M9 16h4"/></svg>
        <span>发送日志</span>
      </a>
      <a class="nav-item" href="https://github.com/SadUnicorn171/danmaku-echo" target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 10.75v5"/><circle cx="12" cy="7.75" r=".6" class="filled"/></svg>
        <span>{{ t('settingsAbout') }}</span>
      </a>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { SettingsSectionId } from '../core/settings-sections'
import { t } from '../core/i18n'

defineProps<{
  activeSection: SettingsSectionId
  version: string
}>()

const emit = defineEmits<{
  navigate: [section: SettingsSectionId]
}>()
</script>

<style scoped lang="scss">
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
  text-decoration: none;
  transition: background-color 140ms ease, color 140ms ease;
}

.nav-item:hover {
  background: rgb(255 255 255 / 6%);
  color: var(--text);
}

.nav-item:focus-visible {
  outline: 2px solid rgb(255 255 255 / 48%);
  outline-offset: -2px;
}

.nav-item.is-active {
  background: rgb(255 255 255 / 11%);
  color: var(--text);
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

.nav-item svg .filled {
  fill: currentColor;
  stroke: none;
}

@media (max-width: 900px) {
  .sidebar {
    flex-basis: 200px;
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
