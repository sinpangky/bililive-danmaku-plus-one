<template>
  <div
    v-if="state.cardMounted"
    :class="['bcp-douyin-card', { 'is-visible': state.cardActive }]"
    :hidden="!state.cardVisible"
    data-bcp-douyin-owned="true"
    data-bcp-douyin-interaction-card="true"
    role="group"
    :data-track-id="state.metadata.trackId"
    :data-kind="state.metadata.kind"
    :data-message="state.metadata.message"
    :data-selection-id="state.metadata.selectionId"
    :data-selection-phase="state.metadata.selectionPhase"
    :data-side="state.side"
    :style="{
      left: `${state.left}px`,
      top: `${state.top}px`,
      visibility: state.measuring ? 'hidden' : undefined
    }"
    @pointerenter="emit('cardEnter')"
    @pointermove="emit('cardMove')"
    @pointerleave="emit('cardLeave')"
  >
    <div class="bcp-douyin-preview" data-bcp-douyin-owned="true" :title="state.message">
      <template v-if="hasRenderableContent(state.content)">
        <RichPreviewItem
          v-for="(item, index) in state.content"
          :key="index"
          :item="item"
          :inherited-style="state.previewStyle"
        />
      </template>
      <span v-else class="bcp-douyin-preview-text">{{ state.message }}</span>
    </div>
    <ActionBar
      :actions="state.actions"
      :message="state.message"
      :sender="state.sender"
      :sending="state.sending"
      variant="douyin"
      :visible="state.cardVisible"
      @placeholder="(event, action) => emit('placeholder', event, action)"
      @favorite="(event) => emit('favorite', event)"
      @plus-one="(event) => emit('plusOne', event)"
      @pointerdown="(event) => emit('pointerdown', event)"
    />
  </div>
  <FeedbackToast
    v-if="state.toast"
    :key="state.toast.id"
    :message="state.toast.message"
    :tone="state.toast.tone"
    variant="douyin"
    :visible="state.toast.visible"
  />
</template>

<script setup lang="ts">
import ActionBar from "./ActionBar.vue";
import FeedbackToast from "./FeedbackToast.vue";
import RichPreviewItem from "./RichPreviewItem.vue";
import type { ActionSettings } from "../core/types";
import type { DouyinOverlayState } from "./douyin-overlay";

defineProps<{ state: DouyinOverlayState }>();
const emit = defineEmits<{
  cardEnter: [];
  cardLeave: [];
  cardMove: [];
  favorite: [event: MouseEvent];
  placeholder: [event: MouseEvent, action: "reply"];
  plusOne: [event: MouseEvent];
  pointerdown: [event: MouseEvent | PointerEvent];
}>();

function hasRenderableContent(content: unknown[]): boolean {
  return content.some((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const item = raw as { content?: unknown[]; src?: unknown; text?: unknown; type?: unknown };
    if (item.type === "text") return Boolean(String(item.text ?? ""));
    if (item.type === "image") return typeof item.src === "string" && Boolean(item.src);
    return Array.isArray(item.content) && hasRenderableContent(item.content);
  });
}
</script>
