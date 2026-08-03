<template>
  <li>
    <span
      v-if="shortcutIndex >= 0 && shortcutIndex < 9"
      class="bcp-favorites-shortcut"
      :aria-label="`快捷键 ${shortcutIndex + 1}`"
    >
      <kbd>{{ shortcutIndex + 1 }}</kbd>
    </span>

    <span class="bcp-favorites-item-copy">
      <strong class="bcp-favorites-text" :title="item.text">{{ item.text }}</strong>
      <span class="bcp-favorites-meta">
        <span :class="['bcp-favorites-scope', { 'is-local': item.belongsToCurrentRoom }]">
          {{ item.belongsToCurrentRoom ? '本房' : '其他' }}
        </span>
        <span :title="collectedAtTitle">收藏于 {{ collectedAtLabel }}</span>
        <span>已发送 {{ item.totalSendCount }} 次</span>
      </span>
    </span>

    <span class="bcp-favorites-item-actions">
      <button
        v-if="!item.belongsToCurrentRoom"
        type="button"
        class="bcp-favorites-secondary"
        :aria-label="`将“${item.text}”加入当前直播间收藏`"
        title="加入本房"
        @click="emit('addToRoom', item.id)"
      >
        加入本房
      </button>
      <button
        type="button"
        class="bcp-favorites-send"
        :aria-label="`发送收藏弹幕：${item.text}`"
        :title="`发送：${item.text}`"
        @click="emit('send', item.id)"
      >
        发送
      </button>
      <button
        type="button"
        :class="['bcp-favorites-remove', { 'is-confirming': pendingRemoveId === item.id }]"
        :aria-label="pendingRemoveId === item.id ? `确认删除“${item.text}”` : `删除收藏“${item.text}”`"
        :title="pendingRemoveId === item.id ? '再次点击确认删除' : '删除收藏'"
        @click="emit('requestRemove', item.id)"
      >
        {{ pendingRemoveId === item.id ? '确认' : '删除' }}
      </button>
    </span>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FavoriteDisplayItem } from "./types";

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
    ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(collectedAt.value)
    : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(collectedAt.value);
});
const collectedAtTitle = computed(() => new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short"
}).format(collectedAt.value));
</script>
