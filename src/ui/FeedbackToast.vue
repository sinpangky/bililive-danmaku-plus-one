<template>
  <div
    :class="[baseClass, `${baseClass}--${tone}`, { 'is-visible': visible }]"
    :data-bcp-one-owned="variant === 'common' ? 'true' : undefined"
    :data-bcp-douyin-owned="variant === 'douyin' ? 'true' : undefined"
    :role="tone === 'error' ? 'alert' : 'status'"
    :aria-live="tone === 'error' ? 'assertive' : 'polite'"
    :title="message"
    :aria-label="message"
  >
    {{ displayMessage }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  message: string;
  tone: string;
  variant: "common" | "douyin";
  visible: boolean;
}>();

const baseClass = computed(() => props.variant === "common"
  ? "bcp-one-toast"
  : "bcp-douyin-toast");
const displayMessage = computed(() => props.message);
</script>
