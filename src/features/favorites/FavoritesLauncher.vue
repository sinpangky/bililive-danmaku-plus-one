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
          </span>
        </div>
        <button
          type="button"
          class="bcp-favorites-icon-button bcp-favorites-close"
          aria-label="关闭收藏面板"
          title="关闭（Esc）"
          @click="emit('close')"
        >
          &#10005;
        </button>
      </header>

      <div class="bcp-favorites-subtitle">收藏一次，换个直播间也能发</div>

      <div class="bcp-favorites-divider" aria-hidden="true" />

      <div class="bcp-favorites-room">
        <span class="bcp-favorites-room-icon" aria-hidden="true">&#127968;</span>
        <span class="bcp-favorites-room-copy">
          <strong :title="state.room.roomName">{{ state.room.roomName }}</strong>
        </span>
        <span class="bcp-favorites-room-count">
          <strong>{{ state.currentCount }} 条</strong>
        </span>
      </div>

      <div class="bcp-favorites-divider" aria-hidden="true" />

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
            :placeholder="selectedRoom ? '搜索这个直播间的弹幕' : '搜索文字或 Emoji'"
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

      <div class="bcp-favorites-divider" aria-hidden="true" />

      <div class="bcp-favorites-list-heading">
        <span class="bcp-favorites-list-title">
          <button
            v-if="selectedRoom"
            type="button"
            class="bcp-favorites-room-back"
            aria-label="返回直播间列表"
            title="返回直播间列表（Esc）"
            @click="emit('backToRooms')"
          >
            &#8249;
          </button>
          <strong :title="selectedRoom?.roomName">{{ selectedRoom?.roomName || activeTab.label }}</strong>
          <small>{{ listSummary }}</small>
        </span>
        <label class="bcp-favorites-sort">
          <span>排序:</span>
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

      <ul v-else-if="!selectedRoom" class="bcp-favorites-groups" role="tabpanel">
        <li
          v-for="group in visibleGroups"
          :key="group.roomKey"
          class="bcp-favorites-group"
        >
          <button
            type="button"
            class="bcp-favorites-group-toggle"
            :aria-label="`进入${group.roomName}的收藏弹幕`"
            @click="emit('selectRoom', group.roomKey)"
          >
            <span class="bcp-favorites-group-copy">
              <strong :title="group.roomName">{{ group.roomName }}</strong>
              <small>
                {{ group.isCurrentRoom ? '当前直播间' : platformLabel(group.platform) }}
                · {{ group.items.length }} 条收藏
                · 已发送 {{ group.totalSendCount }} 次
              </small>
            </span>
            <span class="bcp-favorites-group-count">{{ group.items.length }}</span>
            <span class="bcp-favorites-group-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
            </span>
          </button>
        </li>
      </ul>

      <ol v-else class="bcp-favorites-list bcp-favorites-room-items" role="tabpanel">
        <FavoriteItemRow
          v-for="(item, index) in selectedItems"
          :key="`${selectedRoom.roomKey}:${item.id}`"
          :item="item"
          :pending-remove-id="pendingRemoveId"
          :shortcut-index="index"
          @add-to-room="emit('addToRoom', $event)"
          @request-remove="confirmRemove"
          @send="emit('send', $event)"
        />
      </ol>

      <div class="bcp-favorites-divider" aria-hidden="true" />

      <footer class="bcp-favorites-footer">
        <span class="bcp-favorites-shortcut-group">
          <kbd>Alt+Q</kbd>
          <span>短按打开</span>
        </span>
        <span class="bcp-favorites-shortcut-group">
          <kbd>Alt+Q</kbd>
          <span>长按轮盘</span>
        </span>
        <span class="bcp-favorites-shortcut-group">
          <kbd>1-9</kbd>
          <span>快速发送</span>
        </span>
        <span class="bcp-favorites-shortcut-group">
          <kbd>Esc</kbd>
          <span>{{ selectedRoom ? '返回直播间' : '关闭' }}</span>
        </span>
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
  selectRoom: [roomKey: string];
  sort: [sort: FavoriteSort];
  backToRooms: [];
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
const selectedRoom = computed(() => props.state.groups
  .find((group) => group.roomKey === props.state.selectedRoomKey));
const normalizedSearch = computed(() => props.state.search.replace(/\s+/g, " ").trim().toLowerCase());
const visibleGroups = computed(() => {
  if (!normalizedSearch.value) return props.state.groups;
  return props.state.groups.filter((group) => group.roomName.toLowerCase().includes(normalizedSearch.value)
    || group.items.some((item) => item.normalizedText.includes(normalizedSearch.value)));
});
const selectedItems = computed(() => {
  const group = selectedRoom.value;
  if (!group) return [];
  if (!normalizedSearch.value || group.roomName.toLowerCase().includes(normalizedSearch.value)) {
    return group.items;
  }
  return group.items.filter((item) => item.normalizedText.includes(normalizedSearch.value));
});
const selectedOption = computed(() => props.state.radialOptions
  .find((option) => option.key === props.state.selectedRadialKey));
const selectionHint = computed(() => selectedOption.value?.kind === "favorite"
  ? "松开 Q 立即发送"
  : "松开 Q 打开列表");
const hasResults = computed(() => props.state.view === "current"
  ? Boolean(props.state.items.length)
  : selectedRoom.value
    ? Boolean(selectedItems.value.length)
    : Boolean(visibleGroups.value.length));
const listSummary = computed(() => props.state.search
  ? props.state.view === "current"
    ? `找到 ${props.state.items.length} 条匹配收藏`
    : selectedRoom.value
      ? `找到 ${selectedItems.value.length} 条匹配收藏`
      : `找到 ${visibleGroups.value.length} 个相关直播间`
  : props.state.view === "current"
    ? "按所选顺序展示当前直播间内容"
    : selectedRoom.value
      ? `${selectedRoom.value.items.length} 条收藏，按所选顺序展示`
    : props.state.view === "other"
      ? `共 ${props.state.groups.length} 个直播间，先选择直播间`
      : `共 ${props.state.groups.length} 个直播间，选择后查看弹幕`);
const emptyState = computed(() => {
  if (props.state.search) {
    return {
      title: "没有找到匹配内容",
      detail: selectedRoom.value
        ? "试试更短的关键词，或清空搜索查看这个直播间的全部收藏。"
        : "试试更短的关键词，或清空搜索查看全部直播间。",
      action: null
    };
  }
  if (props.state.view === "current") {
    return {
      title: "本房还没有收藏",
      detail: "悬停一条支持收藏的弹幕并点击“收藏”，它会优先出现在这里。",
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

function platformLabel(platform: PlatformId): string {
  if (platform === "bilibili") return "Bilibili";
  if (platform === "douyin") return "抖音";
  if (platform === "douyu") return "斗鱼";
  return "虎牙";
}

function focusSearch(): void {
  searchRef.value?.focus({ preventScroll: true });
}

watch(() => [props.state.mode, props.state.view, props.state.search,
  props.state.sort, props.state.selectedRoomKey], () => {
  pendingRemoveId.value = "";
});

watch(() => props.state.mode, async (mode) => {
  if (mode !== "panel") return;
  await nextTick();
  panelRef.value?.focus({ preventScroll: true });
});
</script>
