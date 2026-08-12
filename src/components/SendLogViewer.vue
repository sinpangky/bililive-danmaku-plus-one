<template>
  <div class="send-log-viewer">
    <div class="send-log-toolbar">
      <span>{{ summary }}</span>
      <div>
        <button type="button" @click="load">刷新</button>
        <button type="button" :disabled="!entries.length" @click="copy">复制 JSON</button>
        <button type="button" :disabled="!entries.length" @click="clear">清空</button>
      </div>
    </div>
    <p class="send-log-note">
      日志只保存在浏览器本地，最多保留 200
      条。编辑器已清空只代表插件确认提交动作完成，服务端是否接受以直播间最终回显为准。
    </p>
    <div v-if="entries.length" class="send-log-list">
      <details v-for="entry in entries" :key="entry.id" class="send-log-entry">
        <summary>
          <time>{{ formatTime(entry.timestamp) }}</time>
          <strong :class="entry.success ? 'is-success' : 'is-error'">
            {{ entry.success ? '成功' : '失败' }}
          </strong>
          <span>{{ sourceLabel(entry.source) }}</span>
          <code>{{ entry.method }}</code>
          <em>{{ entry.resultContent || entry.normalizedContent || '无发送内容' }}</em>
        </summary>
        <dl>
          <dt>确认级别</dt>
          <dd>{{ entry.confirmation }}</dd>
          <dt>来源内容</dt>
          <dd>{{ entry.sourceContent || '空' }}</dd>
          <dt>标准化内容</dt>
          <dd>{{ entry.normalizedContent || '空' }}</dd>
          <dt>实际目标</dt>
          <dd>{{ entry.resultContent || '未尝试' }}</dd>
          <dt>分类</dt>
          <dd>{{ entry.classification }}</dd>
          <dt>耗时</dt>
          <dd>{{ entry.durationMs }} ms</dd>
          <dt>失败原因</dt>
          <dd>{{ entry.error || '无' }}</dd>
          <dt>结构</dt>
          <dd>
            <pre>{{ formatStructure(entry) }}</pre>
          </dd>
        </dl>
      </details>
    </div>
    <p v-else class="send-log-empty">还没有发送日志。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  SEND_LOG_MESSAGE,
  type SendLogEntryV1,
  type SendLogResponse,
} from '../features/send-log/types'

const emit = defineEmits<{ status: [message: string, kind?: 'error' | 'saved' | ''] }>()
const entries = ref<SendLogEntryV1[]>([])
const summary = computed(() => `最近 ${entries.value.length} 条发送记录`)

function request(operation: 'clear' | 'list'): Promise<SendLogResponse> {
  return chrome.runtime.sendMessage({ type: SEND_LOG_MESSAGE, operation })
}

async function load(): Promise<void> {
  try {
    const response = await request('list')
    if (!response.ok) throw new Error(response.error || 'log-read-failed')
    entries.value = response.entries || []
  } catch {
    emit('status', '发送日志读取失败', 'error')
  }
}

async function clear(): Promise<void> {
  try {
    const response = await request('clear')
    if (!response.ok) throw new Error(response.error || 'log-clear-failed')
    entries.value = []
    emit('status', '发送日志已清空', 'saved')
  } catch {
    emit('status', '发送日志清空失败', 'error')
  }
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(entries.value, null, 2))
    emit('status', '发送日志 JSON 已复制', 'saved')
  } catch {
    emit('status', '发送日志复制失败', 'error')
  }
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

function sourceLabel(source: SendLogEntryV1['source']): string {
  return {
    chat: '侧边栏',
    overlay: '画面弹幕',
    favorite: '收藏',
    'alt-click': 'Alt 点击',
    unknown: '未知入口',
  }[source]
}

function formatStructure(entry: SendLogEntryV1): string {
  return JSON.stringify({ assets: entry.assets, parts: entry.parts }, null, 2)
}

onMounted(load)
</script>

<style scoped lang="scss">
.send-log-viewer {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.send-log-toolbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}
.send-log-toolbar > span {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}
.send-log-toolbar > div {
  display: flex;
  gap: 8px;
}
button {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  min-height: 30px;
  padding: 4px 10px;
}
button:disabled {
  cursor: default;
  opacity: 0.45;
}
.send-log-note,
.send-log-empty {
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 19px;
  margin: 0;
  padding: 12px 16px;
}
.send-log-list {
  border-top: 1px solid var(--border);
  max-height: 520px;
  overflow: auto;
}
.send-log-entry + .send-log-entry {
  border-top: 1px solid var(--border);
}
summary {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: 118px 36px 58px 142px minmax(0, 1fr);
  padding: 11px 16px;
}
summary time,
summary span,
summary code {
  color: var(--text-secondary);
  font-size: 11px;
}
summary strong {
  font-size: 11px;
}
.is-success {
  color: #fff;
}
.is-error {
  color: var(--danger);
}
summary em {
  color: var(--text);
  font-size: 12px;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
dl {
  background: var(--surface-raised);
  display: grid;
  font-size: 12px;
  grid-template-columns: 92px minmax(0, 1fr);
  margin: 0;
  padding: 14px 16px;
}
dt {
  color: var(--text-muted);
  padding: 4px 8px 4px 0;
}
dd {
  color: var(--text);
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 4px 0;
}
pre {
  font:
    11px/17px ui-monospace,
    'Cascadia Mono',
    Consolas,
    monospace;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
