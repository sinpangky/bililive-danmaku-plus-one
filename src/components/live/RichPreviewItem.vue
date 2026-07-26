<template>
  <span v-if="itemType === 'text'" class="bcp-douyin-preview-text" :style="textStyle">
    {{ text }}
  </span>
  <img
    v-else-if="itemType === 'image' && source"
    class="bcp-douyin-preview-image"
    :src="source"
    alt=""
    draggable="false"
    @error="($event.currentTarget as HTMLImageElement).remove()"
  >
  <template v-else>
    <RichPreviewItem
      v-for="(child, index) in children"
      :key="index"
      :item="child"
      :inherited-style="mergedStyle"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { rendererPaint } from "../../platforms/douyin/barrage-model";

defineOptions({ name: "RichPreviewItem" });

interface PreviewItem {
  [key: string]: unknown;
  content?: unknown[];
  src?: string;
  style?: Record<string, unknown>;
  text?: unknown;
  type?: string;
}

const props = withDefaults(defineProps<{
  inheritedStyle?: Record<string, unknown>;
  item: unknown;
}>(), {
  inheritedStyle: () => ({})
});

const value = computed<PreviewItem>(() => (
  props.item && typeof props.item === "object" ? props.item as PreviewItem : {}
));
const itemType = computed(() => value.value.type || "container");
const mergedStyle = computed(() => ({
  ...props.inheritedStyle,
  ...value.value,
  ...value.value.style
}));
const text = computed(() => value.value.text == null ? "" : String(value.value.text));
const source = computed(() => typeof value.value.src === "string" ? value.value.src : "");
const children = computed(() => Array.isArray(value.value.content) ? value.value.content : []);
const textStyle = computed(() => ({
  color: rendererPaint(mergedStyle.value.color, false) || "#ffffff",
  fontFamily: String(mergedStyle.value.fontFamily || "inherit"),
  fontWeight: String(mergedStyle.value.fontWeight || 600)
}));
</script>
