<template>
  <label class="platform-row" :data-platform="platform" :data-enabled="String(modelValue)">
    <input
      :id="`platform-${platform}`"
      class="platform-input"
      type="checkbox"
      :checked="modelValue"
      @change="onChange"
    >
    <span class="platform-identity">
      <span :class="['platform-logo', `platform-logo--${platform}`]" aria-hidden="true">
        <img :src="`../assets/icons/${platform}.svg`" alt="">
      </span>
      <strong>{{ label }}</strong>
    </span>
    <span class="platform-status">
      <svg class="platform-status__on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.25 2.25 4.75-5"/></svg>
      <svg class="platform-status__off" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8.5v4.25"/><circle cx="12" cy="15.5" r=".55" class="filled"/></svg>
      <span>{{ modelValue ? "已启用" : "未启用" }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
import type { PlatformId } from "../../core/types";

defineProps<{
  label: string;
  modelValue: boolean;
  platform: PlatformId;
}>();

const emit = defineEmits<{
  change: [];
  "update:modelValue": [value: boolean];
}>();

function onChange(event: Event): void {
  emit("update:modelValue", (event.currentTarget as HTMLInputElement).checked);
  emit("change");
}
</script>
