<template>
  <li>
    <span
      v-if="shortcutIndex >= 0 && shortcutIndex < 9"
      class="bcp-favorites-shortcut"
      :aria-label="t('favoritesShortcutAria', String(shortcutIndex + 1))"
    >
      <kbd>{{ shortcutIndex + 1 }}</kbd>
    </span>

    <span class="bcp-favorites-item-copy">
      <strong class="bcp-favorites-text" :title="item.text">{{ item.text }}</strong>
      <span class="bcp-favorites-meta">
        <span :class="['bcp-favorites-scope', { 'is-local': item.belongsToCurrentRoom }]">
          {{ item.belongsToCurrentRoom ? t('favoritesScopeCurrent') : t('favoritesScopeOther') }}
        </span>
        <span :title="collectedAtTitle">{{ t('favoritesCollectedAt', collectedAtLabel) }}</span>
        <span>{{ t('favoritesSentCount', String(item.totalSendCount)) }}</span>
      </span>
    </span>

    <span class="bcp-favorites-item-actions">
      <button
        v-if="!item.belongsToCurrentRoom"
        type="button"
        class="bcp-favorites-secondary"
        :aria-label="t('favoritesAddRoomAria', item.text)"
        :title="t('favoritesAddRoom')"
        @click="emit('addToRoom', item.id)"
      >
        {{ t("favoritesAddRoom") }}
      </button>
      <button
        type="button"
        class="bcp-favorites-send"
        :aria-label="t('favoritesSendAria', item.text)"
        :title="t('favoritesSendTitle', item.text)"
        @click="emit('send', item.id)"
      >
        {{ t("favoritesSend") }}
      </button>
      <button
        type="button"
        :class="['bcp-favorites-remove', { 'is-confirming': pendingRemoveId === item.id }]"
        :aria-label="pendingRemoveId === item.id ? t('favoritesConfirmRemoveAria', item.text) : t('favoritesRemoveAria', item.text)"
        :title="pendingRemoveId === item.id ? t('favoritesConfirmRemoveTitle') : t('favoritesRemoveTitle')"
        @click="emit('requestRemove', item.id)"
      >
        {{ pendingRemoveId === item.id ? t('favoritesConfirm') : t('favoritesRemove') }}
      </button>
    </span>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FavoriteDisplayItem } from "./types";
import { t, uiLocale } from "../../core/i18n";

const props = defineProps<{
  item: FavoriteDisplayItem;
  pendingRemoveId: string;
  shortcutIndex: number;
}>();

const emit = defineEmits<{
  addToRoom: [id: string];
  requestRemove: [id: string];
  send: [id: string];
}>();

const collectedAt = computed(() => new Date(props.item.sortTimestamp));
const collectedAtLabel = computed(() => {
  const now = new Date();
  return collectedAt.value.getFullYear() === now.getFullYear()
    ? new Intl.DateTimeFormat(uiLocale(), { month: "2-digit", day: "2-digit" }).format(collectedAt.value)
    : new Intl.DateTimeFormat(uiLocale(), { year: "numeric", month: "2-digit", day: "2-digit" }).format(collectedAt.value);
});
const collectedAtTitle = computed(() => new Intl.DateTimeFormat(uiLocale(), {
  dateStyle: "medium",
  timeStyle: "short"
}).format(collectedAt.value));
</script>
