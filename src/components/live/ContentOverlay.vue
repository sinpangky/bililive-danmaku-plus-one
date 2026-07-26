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
