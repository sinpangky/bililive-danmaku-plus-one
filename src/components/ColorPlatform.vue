<template>
  <details class="color-platform" :data-color-platform="platform" :open="open">
    <summary>
      <span class="color-platform__identity">
        <img class="color-platform__mark" :src="`../assets/icons/${platform}.svg`" alt="">
        <span>
          <strong>{{ label }}</strong>
          <small>{{ customCount ? `${customCount} 项自定义` : "使用默认颜色" }}</small>
        </span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
    </summary>
    <div class="color-platform__body">
      <div class="color-grid">
        <ColorField
          v-for="field in fields"
          :id="`color-${platform}-${field.key}`"
          :key="field.key"
          :color-key="field.key"
          :default-value="field.defaultValue"
          :label="field.label"
          :model-value="colors[field.key]"
          @invalid="emit('invalid')"
          @update:model-value="emit('updateColor', field.key, $event)"
        />
      </div>
      <button class="platform-color-reset" type="button" @click="emit('reset')">
        恢复 {{ label }} 全部默认颜色
      </button>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ColorSettingKey, ColorSettings, PlatformId } from "../core/types";
import ColorField from "./ColorField.vue";

const props = defineProps<{
  colors: ColorSettings;
  fields: ReadonlyArray<{ defaultValue: string; key: ColorSettingKey; label: string }>;
  label: string;
  open?: boolean;
  platform: PlatformId;
}>();

const emit = defineEmits<{
  invalid: [];
  reset: [];
  updateColor: [key: ColorSettingKey, value: string];
}>();

const customCount = computed(() => Object.values(props.colors).filter(Boolean).length);
</script>
