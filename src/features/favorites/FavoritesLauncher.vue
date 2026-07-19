<template>
  <div
    v-if="state.mode !== 'closed'"
    :class="['bcp-favorites-layer', `is-${state.mode}`]"
    data-bcp-favorites-owned="true"
    @pointerdown.self="emit('close')"
  >
    <section
      v-if="state.mode === 'panel'"
      ref="panelRef"
      class="bcp-favorites-panel"
      data-bcp-favorites-owned="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bcp-favorites-title"
      tabindex="-1"
      @pointerdown.stop
      @keydown.ctrl.k.prevent="focusSearch"
    >
      <header class="bcp-favorites-header">
        <div class="bcp-favorites-brand">
          <span class="bcp-favorites-brand-mark" aria-hidden="true">+1</span>
          <span class="bcp-favorites-heading">
            <strong id="bcp-favorites-title">收藏弹幕</strong>
            <span class="bcp-favorites-eyebrow">收藏一次，换个直播间也能发</span>
          </span>
        </div>
        <button
          type="button"
          class="bcp-favorites-icon-button bcp-favorites-close"
          aria-label="关闭收藏面板"
          title="关闭（Esc）"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
        </button>
      </header>

      <div class="bcp-favorites-room">
        <span class="bcp-favorites-room-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="4" y="6" width="16" height="12" rx="3" />
            <path d="m9 10 3 2 3-2M8 3.75h8" />
          </svg>
        </span>
        <span class="bcp-favorites-room-copy">
          <small>当前直播间</small>
          <strong :title="state.room.roomName">{{ state.room.roomName }}</strong>
        </span>
        <span class="bcp-favorites-room-count">
          <strong>{{ state.currentCount }}</strong>
          <small>条本房收藏</small>
        </span>
      </div>

      <div class="bcp-favorites-toolbar">
        <nav class="bcp-favorites-tabs" aria-label="收藏范围" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="state.view === tab.key"
            :class="{ 'is-active': state.view === tab.key }"
            @click="emit('changeView', tab.key)"
          >
            <span>{{ tab.label }}</span>
            <small>{{ tabCount(tab.key) }}</small>
          </button>
        </nav>

        <label class="bcp-favorites-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.75" cy="10.75" r="5.75" />
            <path d="m15 15 4 4" />
          </svg>
          <span class="bcp-favorites-visually-hidden">搜索收藏弹幕</span>
          <input
            ref="searchRef"
            :value="state.search"
            type="search"
            placeholder="搜索文字或 Emoji"
            autocomplete="off"
            @input="emit('search', ($event.target as HTMLInputElement).value)"
          >
          <button
            v-if="state.search"
            type="button"
            aria-label="清空搜索"
            title="清空搜索"
            @click="emit('search', '')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8 8 8M16 8l-8 8" /></svg>
          </button>
          <kbd v-else>Ctrl K</kbd>
        </label>
      </div>

      <div class="bcp-favorites-list-heading">
        <span class="bcp-favorites-list-title">
          <strong>{{ activeTab.label }}</strong>
          <small>{{ listSummary }}</small>
        </span>
        <label class="bcp-favorites-sort">
          <span>排序</span>
          <select
            :value="state.sort"
            aria-label="弹幕排序方式"
            @change="emit('sort', ($event.target as HTMLSelectElement).value as FavoriteSort)"
          >
            <option value="send-count">发送次数</option>
            <option value="time-desc">时间倒序</option>
            <option value="time-asc">时间正序</option>
          </select>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
        </label>
      </div>

      <div v-if="state.loading" class="bcp-favorites-loading" role="status" aria-label="正在读取本地收藏">
        <span v-for="index in 3" :key="index" class="bcp-favorites-skeleton" />
      </div>

      <div v-else-if="!hasResults" class="bcp-favorites-empty" role="status">
        <span class="bcp-favorites-empty-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7.5 4.25h9a1 1 0 0 1 1 1v14.1l-5.5-3.2-5.5 3.2V5.25a1 1 0 0 1 1-1Z" />
            <path d="m9.5 10.5 1.6 1.6 3.4-3.4" />
          </svg>
        </span>
        <strong>{{ emptyState.title }}</strong>
        <p>{{ emptyState.detail }}</p>
        <button
          v-if="emptyState.action"
          type="button"
          @click="emit('changeView', emptyState.action.view)"
        >
          {{ emptyState.action.label }}
        </button>
      </div>

      <ol v-else-if="state.view === 'current'" class="bcp-favorites-list" role="tabpanel">
        <FavoriteItemRow
          v-for="(item, index) in state.items"
          :key="item.id"
          :item="item"
          :pending-remove-id="pendingRemoveId"
          :shortcut-index="index"
          @add-to-room="emit('addToRoom', $event)"
          @request-remove="confirmRemove"
          @send="emit('send', $event)"
        />
      </ol>

      <ul v-else class="bcp-favorites-groups" role="tabpanel">
        <li
          v-for="group in state.groups"
          :key="group.roomKey"
          :class="['bcp-favorites-group', { 'is-expanded': isGroupExpanded(group.roomKey) }]"
        >
          <button
            type="button"
            class="bcp-favorites-group-toggle"
            :aria-expanded="isGroupExpanded(group.roomKey)"
            :aria-controls="groupPanelId(group.roomKey)"
            @click="emit('toggleGroup', group.roomKey)"
          >
            <span class="bcp-favorites-group-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
            </span>
            <span class="bcp-favorites-group-copy">
              <strong :title="group.roomName">{{ group.roomName }}</strong>
              <small>
                {{ group.isCurrentRoom ? '当前直播间' : platformLabel(group.platform) }}
                · {{ group.items.length }} 条收藏
                · 已发送 {{ group.totalSendCount }} 次
              </small>
            </span>
            <span class="bcp-favorites-group-count">{{ group.items.length }}</span>
          </button>
          <ol
            v-if="isGroupExpanded(group.roomKey)"
            :id="groupPanelId(group.roomKey)"
            class="bcp-favorites-list bcp-favorites-group-items"
          >
            <FavoriteItemRow
              v-for="(item, index) in group.items"
              :key="`${group.roomKey}:${item.id}`"
              :item="item"
              :pending-remove-id="pendingRemoveId"
              :shortcut-index="groupedShortcutIndex(group.roomKey, index)"
              @add-to-room="emit('addToRoom', $event)"
              @request-remove="confirmRemove"
              @send="emit('send', $event)"
            />
          </ol>
        </li>
      </ul>

      <footer class="bcp-favorites-footer">
        <span><kbd>Alt</kbd><kbd>Q</kbd> 短按打开</span>
        <span><kbd>Alt</kbd><kbd>Q</kbd> 长按轮盘</span>
        <span><kbd>1–9</kbd> 快速发送</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </footer>
    </section>

    <div
      v-else-if="state.mode === 'radial'"
      class="bcp-favorites-radial"
      :style="{ left: `${state.centerX}px`, top: `${state.centerY}px` }"
      data-bcp-favorites-owned="true"
      role="menu"
      aria-label="弹幕收藏轮盘"
    >
      <div class="bcp-favorites-radial-hint" aria-hidden="true">
        按住 Alt + Q · 指向后松开发送
      </div>
      <div :class="['bcp-favorites-radial-center', { 'has-selection': selectedOption }]">
        <span v-if="!selectedOption" class="bcp-favorites-radial-monogram" aria-hidden="true">+1</span>
        <strong>{{ selectedOption?.label || '收藏轮盘' }}</strong>
        <span>{{ selectedOption ? selectionHint : '移向一个选项' }}</span>
      </div>
      <button
        v-for="option in state.radialOptions"
        :key="option.key"
        type="button"
        :class="['bcp-favorites-radial-item', `is-${option.kind}`, {
          'is-selected': option.key === state.selectedRadialKey
        }]"
        :style="{
          left: `${Math.cos(option.angle * Math.PI / 180) * 132}px`,
          top: `${Math.sin(option.angle * Math.PI / 180) * 132}px`
        }"
        tabindex="-1"
      >
        <span class="bcp-favorites-radial-item-icon" aria-hidden="true">
          <svg v-if="option.kind === 'favorite'" viewBox="0 0 24 24">
            <path d="m5 6 14 6-14 6 2-6zM7 12h7" />
          </svg>
          <svg v-else-if="option.kind === 'other'" viewBox="0 0 24 24">
            <circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="8" r="2.5" />
            <path d="M3.75 18c.35-3 1.9-4.5 4.25-4.5s3.9 1.5 4.25 4.5M13 13c2.8-.7 5.7.65 6.5 4" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" />
          </svg>
        </span>
        <span>{{ option.label }}</span>
        <small>{{ option.detail }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import FavoriteItemRow from "./FavoriteItemRow.vue";
import type { PlatformId } from "../../core/types";
import type { FavoriteSort, FavoriteView } from "./types";
import type { FavoritesLauncherState } from "./launcher";

const props = defineProps<{ state: FavoritesLauncherState }>();
const emit = defineEmits<{
  addToRoom: [id: string];
  changeView: [view: FavoriteView];
  close: [];
  remove: [id: string];
  search: [value: string];
  send: [id: string];
  sort: [sort: FavoriteSort];
  toggleGroup: [roomKey: string];
}>();

const panelRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const pendingRemoveId = ref("");
const tabs: Array<{ key: FavoriteView; label: string }> = [
  { key: "current", label: "本房收藏" },
  { key: "other", label: "其他直播间" },
  { key: "all", label: "全部" }
];

const activeTab = computed(() => tabs.find((tab) => tab.key === props.state.view) || tabs[0]);
const selectedOption = computed(() => props.state.radialOptions
  .find((option) => option.key === props.state.selectedRadialKey));
const selectionHint = computed(() => selectedOption.value?.kind === "favorite"
  ? "松开 Q 立即发送"
  : "松开 Q 打开列表");
const hasResults = computed(() => props.state.view === "current"
  ? Boolean(props.state.items.length)
  : Boolean(props.state.groups.length));
const listSummary = computed(() => props.state.search
  ? props.state.view === "current"
    ? `找到 ${props.state.items.length} 条匹配收藏`
    : `找到 ${props.state.groups.length} 个相关直播间`
  : props.state.view === "current"
    ? "按所选顺序展示当前直播间内容"
    : props.state.view === "other"
      ? `共 ${props.state.groups.length} 个直播间，展开后选择弹幕`
      : `共 ${props.state.groups.length} 个直播间、${props.state.totalCount} 条收藏`);
const emptyState = computed(() => {
  if (props.state.search) {
    return {
      title: "没有找到匹配内容",
      detail: "试试更短的关键词，或清空搜索查看全部收藏。",
      action: null
    };
  }
  if (props.state.view === "current") {
    return {
      title: "本房还没有收藏",
      detail: "悬停一条普通文字弹幕并点击“收藏”，它会优先出现在这里。",
      action: props.state.otherCount
        ? { label: `查看其他直播间的 ${props.state.otherCount} 条收藏`, view: "other" as const }
        : null
    };
  }
  if (props.state.view === "other") {
    return {
      title: "没有其他直播间收藏",
      detail: "你在其他直播间收藏的普通文字与 Unicode Emoji 会显示在这里。",
      action: { label: "返回本房收藏", view: "current" as const }
    };
  }
  return {
    title: "收藏库还是空的",
    detail: "从直播画面或聊天栏收藏一条弹幕后，就能在任意直播间快速发送。",
    action: null
  };
});

function tabCount(view: FavoriteView): number {
  if (view === "current") return props.state.currentCount;
  if (view === "other") return props.state.otherCount;
  return props.state.totalCount;
}

function confirmRemove(id: string): void {
  if (pendingRemoveId.value === id) {
    pendingRemoveId.value = "";
    emit("remove", id);
    return;
  }
  pendingRemoveId.value = id;
}

function isGroupExpanded(roomKey: string): boolean {
  return props.state.expandedRoomKeys.includes(roomKey);
}

function groupPanelId(roomKey: string): string {
  return `bcp-favorites-group-${Array.from(roomKey)
    .map((character) => character.codePointAt(0)?.toString(36) || "0")
    .join("-")}`;
}

function groupedShortcutIndex(roomKey: string, itemIndex: number): number {
  let offset = 0;
  for (const group of props.state.groups) {
    if (!isGroupExpanded(group.roomKey)) continue;
    if (group.roomKey === roomKey) return offset + itemIndex;
    offset += group.items.length;
  }
  return -1;
}

function platformLabel(platform: PlatformId): string {
  if (platform === "bilibili") return "Bilibili";
  if (platform === "douyin") return "抖音";
  return "虎牙";
}

function focusSearch(): void {
  searchRef.value?.focus({ preventScroll: true });
}

watch(() => [props.state.mode, props.state.view, props.state.search, props.state.sort], () => {
  pendingRemoveId.value = "";
});

watch(() => props.state.mode, async (mode) => {
  if (mode !== "panel") return;
  await nextTick();
  panelRef.value?.focus({ preventScroll: true });
});
</script>
