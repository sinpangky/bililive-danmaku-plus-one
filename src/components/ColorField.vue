<template>
  <div class="color-field" :data-color-key="colorKey">
    <label class="color-field__label" :for="id">
      <span>{{ label }}</span>
      <small>默认 {{ defaultValue }}</small>
    </label>
    <div class="color-control">
      <input
        class="color-picker"
        type="color"
        :value="modelValue || defaultValue"
        :aria-label="`${label}选色`"
        @input="onPickerInput"
      >
      <input
        :id="id"
        v-model="draft"
        class="color-text"
        type="text"
        inputmode="text"
        maxlength="7"
        :placeholder="`默认 ${defaultValue}`"
        :aria-invalid="invalid"
        spellcheck="false"
        autocomplete="off"
        @input="onTextInput"
        @change="onTextChange"
      >
      <button class="color-reset" type="button" :aria-label="`恢复${label}默认颜色`" @click="reset">
        默认
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { normalizeHexColor } from "../core/shared";
import type { ColorSettingKey } from "../core/types";

const props = defineProps<{
  colorKey: ColorSettingKey;
  defaultValue: string;
  id: string;
  label: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  invalid: [];
  "update:modelValue": [value: string];
}>();

const draft = ref(props.modelValue);
const invalid = ref(false);

watch(() => props.modelValue, (value) => {
  draft.value = value;
  invalid.value = false;
});

function commit(raw: string, showError: boolean): void {
  const trimmed = raw.trim();
  const value = normalizeHexColor(trimmed);
  invalid.value = Boolean(trimmed && !value);
  if (invalid.value) {
    if (showError) emit("invalid");
    return;
  }
  draft.value = value;
  emit("update:modelValue", value);
}

function onTextInput(): void {
  commit(draft.value, false);
}

function onTextChange(): void {
  commit(draft.value, true);
}

function onPickerInput(event: Event): void {
  commit((event.currentTarget as HTMLInputElement).value, false);
}

function reset(): void {
  draft.value = "";
  invalid.value = false;
  emit("update:modelValue", "");
}
</script>
