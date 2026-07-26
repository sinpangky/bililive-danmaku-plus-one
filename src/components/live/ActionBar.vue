<template>
  <div
    :class="classes.bar"
    :hidden="!visible || visibleActions.length === 0"
    role="toolbar"
    aria-label="弹幕快捷操作"
    :data-bcp-one-owned="variant === 'common' ? 'true' : undefined"
    :data-bcp-douyin-owned="variant === 'douyin' ? 'true' : undefined"
    @pointerenter="emit('pointerenter')"
    @pointerleave="emit('pointerleave')"
    @pointerdown="emit('pointerdown', $event)"
    @mousedown="emit('pointerdown', $event)"
  >
    <template v-for="(action, index) in visibleActions" :key="action.key">
      <span
        v-if="index > 0"
        :class="classes.divider"
        aria-hidden="true"
        :data-bcp-one-owned="variant === 'common' ? 'true' : undefined"
        :data-bcp-douyin-owned="variant === 'douyin' ? 'true' : undefined"
      />
      <button
        type="button"
        :class="[classes.item, action.key === 'plusOne' && classes.plusOne]"
        :data-action="action.dataAction"
        :data-bcp-one-owned="variant === 'common' ? 'true' : undefined"
        :data-bcp-douyin-owned="variant === 'douyin' ? 'true' : undefined"
        :hidden="!visible"
        :disabled="action.key === 'plusOne' && sending"
        :title="actionTitle(action.key, action.label)"
        :aria-label="actionTitle(action.key, action.label)"
        @click="activate(action.key, $event)"
        @pointerenter="action.key === 'plusOne' && emit('pointerenter')"
      >
        {{ action.key === "plusOne" && sending ? "…" : action.label }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ActionSettings } from "../../core/types";

type ActionKey = keyof ActionSettings;

const props = withDefaults(defineProps<{
  actions: ActionSettings;
  message?: string;
  sender?: string;
  sending?: boolean;
  variant: "common" | "douyin";
  visible: boolean;
}>(), {
  message: "",
  sender: "",
  sending: false
});

const emit = defineEmits<{
  favorite: [event: MouseEvent];
  placeholder: [event: MouseEvent, action: "reply"];
  plusOne: [event: MouseEvent];
  pointerdown: [event: MouseEvent | PointerEvent];
  pointerenter: [];
  pointerleave: [];
}>();

const classes = computed(() => props.variant === "common" ? {
  bar: "bcp-one-actions",
  divider: "bcp-one-action-divider",
  item: "bcp-one-action",
  plusOne: "bcp-one-button"
} : {
  bar: "bcp-douyin-actions",
  divider: "bcp-douyin-action-divider",
  item: "bcp-douyin-action-item",
  plusOne: "bcp-douyin-button"
});

const visibleActions = computed(() => [
  { key: "plusOne" as const, label: "+1", dataAction: "plus-one" },
  { key: "reply" as const, label: "回复", dataAction: "reply" },
  { key: "favorite" as const, label: "收藏", dataAction: "favorite" }
].filter((action) => props.actions[action.key]));

function activate(action: ActionKey, event: MouseEvent): void {
  if (action === "plusOne") {
    emit("plusOne", event);
  } else if (action === "favorite") {
    emit("favorite", event);
  } else {
    emit("placeholder", event, "reply");
  }
}

function actionTitle(action: ActionKey, label: string): string {
  if (action === "plusOne") {
    return `复读：${props.message}`;
  }
  if (action === "reply") {
    return props.sender ? `回复 @${props.sender}` : `回复弹幕：${props.message}`;
  }
  return label;
}

</script>
