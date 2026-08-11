<template>
  <header class="topbar">
    <h1>{{ activeSectionTitle }}</h1>
    <div class="topbar__actions">
      <div class="resource-links">
        <a
          href="https://github.com/SadUnicorn171/danmaku-echo"
          target="_blank"
          rel="noreferrer"
          :title="t('settingsHelp')"
          :aria-label="t('settingsHelp')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M9.9 9.45a2.25 2.25 0 1 1 3.55 1.83c-.9.63-1.45 1.1-1.45 2.22"/><circle cx="12" cy="16.25" r=".6" class="filled"/></svg>
          <span>{{ t('settingsHelp') }}</span>
        </a>
        <button
          id="diagnostics-copy"
          class="feedback-copy"
          type="button"
          :title="t('settingsCopyDiagnosticsTitle')"
          :aria-label="t('settingsCopyDiagnostics')"
          @click="emit('copy-diagnostics')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.75h8.5L19 8.25v11H7z"/><path d="M15.5 4.75v3.5H19M4.5 8H7M4.5 12H7M4.5 16H7"/></svg>
          <span>{{ t('settingsCopyDiagnostics') }}</span>
        </button>
      </div>
      <label class="master-control" for="enabled">
        <span>{{ t('settingsGlobalStatus') }}</span>
        <input
          id="enabled"
          v-model="enabled"
          type="checkbox"
          role="switch"
          :aria-label="t('ariaEnableExtension')"
          @change="emit('save')"
        >
      </label>
    </div>
  </header>
</template>

<script setup lang="ts">
import { t } from '../core/i18n'

defineProps<{
  activeSectionTitle: string
}>()

const enabled = defineModel<boolean>('enabled', { required: true })
const emit = defineEmits<{
  'copy-diagnostics': []
  save: []
}>()
</script>

<style scoped lang="scss">
.topbar {
  align-items: center;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  flex: 0 0 56px;
  gap: 20px;
  height: 56px;
  justify-content: space-between;
  padding: 0 24px;
  position: relative;
  z-index: 2;
}

.topbar h1 {
  flex: 0 0 auto;
  font-size: 18px;
  font-weight: 500;
  line-height: 28px;
  margin: 0;
  white-space: nowrap;
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
  flex: 0 0 auto;
  gap: 16px;
  margin-left: auto;
}

.resource-links {
  border-right: 1px solid var(--border);
  flex: 0 0 auto;
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
  text-decoration: none;
  white-space: nowrap;
}

.resource-links a:hover,
.resource-links button:hover {
  color: var(--text);
}

.resource-links a:focus-visible,
.resource-links button:focus-visible {
  border-radius: 3px;
  outline: 2px solid rgb(255 255 255 / 48%);
  outline-offset: 2px;
}

.feedback-copy code {
  color: var(--text);
  font: 500 12px/20px ui-monospace, "Cascadia Mono", Consolas, monospace;
  white-space: nowrap;
  user-select: text;
}

.resource-links svg {
  fill: none;
  flex: 0 0 14px;
  height: 14px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
  width: 14px;
}

.resource-links svg .filled {
  fill: currentColor;
  stroke: none;
}

.master-control {
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 14px;
  gap: 8px;
  line-height: 20px;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .topbar {
    padding-left: 20px;
    padding-right: 20px;
  }

  .topbar__actions,
  .resource-links {
    gap: 12px;
  }

  .resource-links {
    padding-right: 16px;
  }

  .feedback-copy code {
    display: none;
  }
}

@media (max-width: 900px) {
  .topbar {
    gap: 12px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .topbar__actions {
    gap: 10px;
  }

  .resource-links {
    gap: 4px;
    padding-right: 10px;
  }

  .resource-links a,
  .resource-links button {
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .resource-links > a span,
  .resource-links > button span {
    display: none;
  }
}
</style>
