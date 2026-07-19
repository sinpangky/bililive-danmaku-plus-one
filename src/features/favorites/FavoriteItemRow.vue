<template>
  <li :class="{ 'is-current-room': item.belongsToCurrentRoom }">
    <span
      class="bcp-favorites-shortcut"
      :aria-label="shortcutIndex >= 0 && shortcutIndex < 9 ? `快捷键 ${shortcutIndex + 1}` : undefined"
    >
      <kbd v-if="shortcutIndex >= 0 && shortcutIndex < 9">{{ shortcutIndex + 1 }}</kbd>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 4.25h9a1 1 0 0 1 1 1v14.1l-5.5-3.2-5.5 3.2V5.25a1 1 0 0 1 1-1Z" />
      </svg>
    </span>

    <span class="bcp-favorites-item-copy">
      <strong class="bcp-favorites-text" :title="item.text">{{ item.text }}</strong>
      <span class="bcp-favorites-meta">
        <span :class="['bcp-favorites-scope', { 'is-local': item.belongsToCurrentRoom }]">
          {{ item.belongsToCurrentRoom ? '本房' : '跨房' }}
        </span>
        <span :title="item.sourceLabel">{{ item.sourceLabel }}</span>
        <span :title="collectedAtTitle">收藏 {{ collectedAtLabel }}</span>
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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.5 4.25h9a1 1 0 0 1 1 1v14.1l-5.5-3.2-5.5 3.2V5.25a1 1 0 0 1 1-1Z" />
          <path d="M12 8v5M9.5 10.5h5" />
        </svg>
        <span>加入本房</span>
      </button>
      <button
        type="button"
        class="bcp-favorites-send"
        :aria-label="`发送收藏弹幕：${item.text}`"
        :title="`发送：${item.text}`"
        @click="emit('send', item.id)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4.75 5 14.5 7-14.5 7 2-7zM6.75 12h7" />
        </svg>
        <span>发送</span>
      </button>
      <button
        type="button"
        :class="['bcp-favorites-remove', { 'is-confirming': pendingRemoveId === item.id }]"
        :aria-label="pendingRemoveId === item.id ? `确认删除“${item.text}”` : `删除收藏“${item.text}”`"
        :title="pendingRemoveId === item.id ? '再次点击确认删除' : '删除收藏'"
        @click="emit('requestRemove', item.id)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.5 7.5h13M9 7.5v-2h6v2M8 10.5v6M12 10.5v6M16 10.5v6M7 7.5l.75 12h8.5l.75-12" />
        </svg>
        <span v-if="pendingRemoveId === item.id">确认</span>
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
const collectedAtLabel = computed(() => new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit"
}).format(collectedAt.value));
const collectedAtTitle = computed(() => new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short"
}).format(collectedAt.value));
</script>
