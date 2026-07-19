<template>
  <label class="setting-row" :for="id">
    <span class="setting-copy">
      <strong>{{ title }}</strong>
      <small>{{ description }}</small>
    </span>
    <input
      :id="id"
      type="checkbox"
      role="switch"
      :aria-label="ariaLabel || title"
      :checked="modelValue"
      @change="onChange"
    >
  </label>
</template>

<script setup lang="ts">
defineProps<{
  ariaLabel?: string;
  description: string;
  id: string;
  modelValue: boolean;
  title: string;
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
