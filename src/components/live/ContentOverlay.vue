<template>
  <ActionBar
    :actions="state.actions"
    :message="state.message"
    :sender="state.sender"
    :sending="state.sending"
    variant="common"
    :visible="state.actionVisible"
    @placeholder="(event, action) => emit('placeholder', event, action)"
    @favorite="(event) => emit('favorite', event)"
    @plus-one="(event) => emit('plusOne', event)"
    @pointerdown="(event) => emit('pointerdown', event)"
    @pointerenter="emit('pointerenter')"
    @pointerleave="emit('pointerleave')"
  />
  <FeedbackToast
    v-if="state.toast"
    :key="state.toast.id"
    :message="state.toast.message"
    :tone="state.toast.tone"
    variant="common"
    :visible="state.toast.visible"
  />
</template>

<script setup lang="ts">
import ActionBar from "./ActionBar.vue";
import FeedbackToast from "./FeedbackToast.vue";
import type { OverlayUiState } from "./content-overlay";

defineProps<{
  state: OverlayUiState;
}>();

const emit = defineEmits<{
  favorite: [event: MouseEvent];
  placeholder: [event: MouseEvent, action: "reply"];
  plusOne: [event: MouseEvent];
  pointerdown: [event: MouseEvent | PointerEvent];
  pointerenter: [];
  pointerleave: [];
}>();

</script>

<style lang="scss">
.bcp-one-portal {
  all: initial;
  inset: 0;
  pointer-events: none;
  position: fixed;
  z-index: 2147483647;
}

.bcp-one-actions {
  all: initial;
  align-items: center;
  background: linear-gradient(
    0deg,
    var(--bcp-action-start, #fd8101),
    var(--bcp-action-end, #fd8101)
  );
  border: 0;
  border-radius: 16px;
  box-sizing: border-box;
  color: var(--bcp-action-text, #fff);
  display: flex;
  height: 40px;
  overflow: hidden;
  padding: 0;
  pointer-events: auto;
  position: fixed;
  user-select: none;
  width: max-content;
  z-index: 2147483647;
}

.bcp-one-actions[hidden] {
  display: none !important;
}

.bcp-one-action {
  all: initial;
  align-items: center;
  align-self: stretch;
  box-sizing: border-box;
  color: var(--bcp-action-text, #fff);
  cursor: pointer;
  display: flex;
  flex: 0 0 56px;
  font:
    600 16px/22px 'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-feature-settings:
    'ss01' on,
    'cv01' on;
  justify-content: center;
  min-width: 56px;
  padding: 0 12px;
  pointer-events: auto;
  transition:
    background-color 140ms ease,
    transform 140ms ease;
  white-space: nowrap;
  width: 56px;
}

.bcp-one-action[data-action="plus-one"] {
  font-size: 14.4px;
}

.bcp-one-action:hover {
  background: rgb(255 255 255 / 12%);
}

.bcp-one-action:active {
  transform: scale(0.96);
}

.bcp-one-action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--bcp-focus-ring, #fd8101) 55%, transparent);
  outline-offset: -3px;
}

.bcp-one-action-divider {
  align-self: center;
  background: #fff;
  border-radius: 999px;
  box-sizing: border-box;
  display: block;
  flex: 0 0 2px;
  height: 24px;
  max-width: 2px;
  min-width: 2px;
  pointer-events: none;
  width: 2px;
}

.bcp-one-target {
  outline: 1px solid color-mix(in srgb, var(--bcp-selection, #fd8101) 55%, transparent) !important;
  outline-offset: 2px !important;
}

[data-bcp-douyu-own-chat-content='true'],
[data-bcp-douyu-own-overlay='true'] [class*='text-'] {
  border-radius: 4px !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bcp-selection, #fd8101) 72%, transparent) !important;
  outline: 1px solid rgb(255 255 255 / 72%) !important;
  outline-offset: 4px !important;
}

html[data-bcp-douyu-native-capsule-hidden='true'] [class*='interactive-element-'],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='reply-button-'],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='action-button-'],
html[data-bcp-douyu-native-capsule-hidden='true']
  :is(div, span):not([class*='danmuItem-']):has(> [class*='interactive-element-']):has(
    > [class*='reply-button-']
  ),
html[data-bcp-douyu-native-capsule-hidden='true']
  :is(div, span):not([class*='danmuItem-']):has(> [class*='interactive-element-']):has(
    > [class*='action-button-']
  ),
html[data-bcp-douyu-native-capsule-hidden='true']
  :is(div, span):not([class*='danmuItem-']):has(> [class*='reply-button-']):has(
    > [class*='action-button-']
  ),
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='danmuItem-'] [data-action='plus-one' i],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='danmuItem-'] [data-action='plusOne' i],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='danmuItem-'] [data-action='reply' i],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='danmuItem-'] [data-action='collect' i],
html[data-bcp-douyu-native-capsule-hidden='true'] [class*='danmuItem-'] [data-action='favorite' i],
html[data-bcp-douyu-native-capsule-hidden='true']
  [class*='danmuItem-']
  :is(div, span):has(> [class*='reply-button-']):has(> [class*='action-button-']),
html[data-bcp-douyu-native-capsule-hidden='true'] [data-bcp-douyu-native-action-hidden='true'] {
  display: none !important;
  pointer-events: none !important;
}

.bcp-one-frozen,
.bcp-one-frozen * {
  animation: none !important;
  pointer-events: none !important;
  transition: none !important;
}

.bcp-one-toast {
  align-items: center;
  background: var(--bcp-panel-background, #fd8101);
  border: 0;
  border-radius: 16px;
  box-sizing: border-box;
  color: var(--bcp-action-text, #fff);
  display: flex;
  font:
    600 16px/22px 'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-feature-settings:
    'ss01' on,
    'cv01' on;
  height: auto;
  justify-content: center;
  left: 50%;
  min-height: 36px;
  min-width: 84px;
  max-width: min(420px, calc(100vw - 32px));
  opacity: 0;
  overflow: visible;
  overflow-wrap: anywhere;
  padding: 9px 16px;
  pointer-events: none;
  position: fixed;
  top: 28px;
  transform: translate(-50%, -8px) scale(0.96);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
  text-align: center;
  white-space: normal;
  width: max-content;
  z-index: 2147483647;
}

.bcp-one-toast.is-visible {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.bcp-one-toast--success {
  background: var(--bcp-success, #27ae60);
}

.bcp-one-toast--warning {
  background: var(--bcp-warning, #e6a000);
}

.bcp-one-toast--error {
  background: var(--bcp-error, #ff4747);
}
</style>
