<template>
  <section class="bcp-unicycle" aria-labelledby="bcp-unicycle-title">
    <div class="bcp-unicycle-heading">
      <span>
        <strong id="bcp-unicycle-title">{{ t("unicycleTitle") }}</strong>
        <small>{{ t("unicycleMessageCount", String(messageCount)) }}</small>
      </span>
      <span :class="['bcp-unicycle-status', { 'is-running': running }]">
        {{ running ? t("unicycleRunning") : t("unicycleIdle") }}
      </span>
    </div>

    <label class="bcp-unicycle-content">
      <span>{{ t("unicycleContent") }}</span>
      <textarea
        :value="config.content"
        :disabled="running"
        :placeholder="t('unicycleContentPlaceholder')"
        rows="2"
        @input="update({ content: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <div class="bcp-unicycle-controls">
      <div class="bcp-unicycle-control-row">
        <span class="bcp-unicycle-control-label">{{ t("unicycleRunMode") }}</span>
        <div class="bcp-unicycle-segmented" role="group" :aria-label="t('unicycleRunMode')">
          <button
            type="button"
            :class="{ 'is-active': config.runMode === 'count' }"
            :disabled="running"
            @click="update({ runMode: 'count' })"
          >
            {{ t("unicycleTotalCount") }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': config.runMode === 'duration' }"
            :disabled="running"
            @click="update({ runMode: 'duration' })"
          >
            {{ t("unicycleTotalDuration") }}
          </button>
        </div>
        <label class="bcp-unicycle-number">
          <input
            :value="config.runMode === 'count' ? config.totalCount : config.totalDurationSeconds"
            :disabled="running"
            type="number"
            min="1"
            :max="config.runMode === 'count' ? 10000 : 86400"
            step="1"
            @input="updateInteger(config.runMode === 'count' ? 'totalCount' : 'totalDurationSeconds', $event)"
          >
          <span>{{ config.runMode === "count" ? t("unicycleTimes") : t("unicycleSeconds") }}</span>
        </label>
      </div>

      <div class="bcp-unicycle-control-row">
        <span class="bcp-unicycle-control-label">{{ t("unicycleIntervalMode") }}</span>
        <div class="bcp-unicycle-segmented" role="group" :aria-label="t('unicycleIntervalMode')">
          <button
            type="button"
            :class="{ 'is-active': config.intervalMode === 'fixed' }"
            :disabled="running"
            @click="update({ intervalMode: 'fixed' })"
          >
            {{ t("unicycleFixedInterval") }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': config.intervalMode === 'random' }"
            :disabled="running"
            @click="update({ intervalMode: 'random' })"
          >
            {{ t("unicycleRandomInterval") }}
          </button>
        </div>
        <label v-if="config.intervalMode === 'fixed'" class="bcp-unicycle-number">
          <input
            :value="config.fixedIntervalSeconds"
            :disabled="running"
            type="number"
            min="1"
            max="3600"
            step="1"
            @input="updateInteger('fixedIntervalSeconds', $event)"
          >
          <span>{{ t("unicycleSeconds") }}</span>
        </label>
        <span v-else class="bcp-unicycle-range">
          <label class="bcp-unicycle-number">
            <input
              :value="config.minIntervalSeconds"
              :disabled="running"
              type="number"
              min="1"
              max="3600"
              step="1"
              :aria-label="t('unicycleMinimumInterval')"
              @input="updateInteger('minIntervalSeconds', $event)"
            >
            <span>{{ t("unicycleSeconds") }}</span>
          </label>
          <span aria-hidden="true">-</span>
          <label class="bcp-unicycle-number">
            <input
              :value="config.maxIntervalSeconds"
              :disabled="running"
              type="number"
              min="1"
              max="3600"
              step="1"
              :aria-label="t('unicycleMaximumInterval')"
              @input="updateInteger('maxIntervalSeconds', $event)"
            >
            <span>{{ t("unicycleSeconds") }}</span>
          </label>
        </span>
      </div>

      <div class="bcp-unicycle-control-row">
        <label class="bcp-unicycle-inline-label" for="bcp-unicycle-max-length">
          {{ t("unicycleMaxLength") }}
        </label>
        <label class="bcp-unicycle-number">
          <input
            id="bcp-unicycle-max-length"
            :value="config.maxMessageLength"
            :disabled="running"
            type="number"
            min="1"
            :max="platformMaxLength"
            step="1"
            @input="updateInteger('maxMessageLength', $event)"
          >
          <span>{{ t("unicycleCharacters") }}</span>
        </label>
        <small>{{ t("unicycleEffectiveMax", String(effectiveMaxLength)) }}</small>
      </div>
    </div>

    <div v-if="running || sentCount" class="bcp-unicycle-progress" aria-live="polite">
      <strong>{{ t("unicycleSentProgress", String(sentCount)) }}</strong>
      <span v-if="lastMessage" :title="lastMessage">{{ lastMessage }}</span>
    </div>

    <div class="bcp-unicycle-actions">
      <button
        type="button"
        class="bcp-unicycle-save-favorites"
        :disabled="running || !messageCount"
        @click="emit('addToFavorites')"
      >
        {{ t("unicycleAddToFavorites") }}
      </button>
      <button
        v-if="!running"
        type="button"
        class="bcp-unicycle-start"
        :disabled="!messageCount"
        @click="emit('start')"
      >
        {{ t("unicycleStart") }}
      </button>
      <button v-else type="button" class="bcp-unicycle-stop" @click="emit('stop')">
        {{ t("unicycleStop") }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { t } from "../../core/i18n";
import type { UnicycleConfig } from "./unicycle";

const props = defineProps<{
  config: UnicycleConfig;
  lastMessage: string;
  messageCount: number;
  platformMaxLength: number;
  running: boolean;
  sentCount: number;
}>();

const emit = defineEmits<{
  addToFavorites: [];
  start: [];
  stop: [];
  update: [config: UnicycleConfig];
}>();

const effectiveMaxLength = computed(() => Math.min(
  props.config.maxMessageLength,
  props.platformMaxLength,
));

function update(patch: Partial<UnicycleConfig>): void {
  emit("update", { ...props.config, ...patch });
}

function updateInteger(key: keyof UnicycleConfig, event: Event): void {
  const input = event.target as HTMLInputElement;
  update({ [key]: Math.trunc(Number(input.value)) || 1 });
}
</script>
