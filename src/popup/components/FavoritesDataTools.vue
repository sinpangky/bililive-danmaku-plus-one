<template>
  <div class="favorites-data-tools" aria-labelledby="favorites-data-title">
    <span class="favorites-data-copy">
      <strong id="favorites-data-title">收藏数据备份</strong>
      <small>导出 JSON 留存；导入前会自动保存当前收藏副本。</small>
    </span>
    <span class="favorites-data-actions">
      <button type="button" :disabled="busy" @click="exportBackup">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v10M8 10l4 4 4-4M5 18h14" />
        </svg>
        导出备份
      </button>
      <button type="button" :disabled="busy" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V5M8 9l4-4 4 4M5 19h14" />
        </svg>
        导入备份
      </button>
      <input
        ref="fileInput"
        class="favorites-data-file"
        type="file"
        accept="application/json,.json"
        aria-label="选择收藏备份 JSON 文件"
        @change="importBackup"
      >
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  exportFavoritesData,
  importFavoritesData
} from "../../features/favorites/repository";

const emit = defineEmits<{
  status: [message: string, kind: "error" | "saved"];
}>();

const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function localStorageArea(): chrome.storage.StorageArea {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage) throw new Error("当前环境无法访问收藏存储");
  return storage;
}

function backupFileName(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `danmaku-echo-favorites-${day}.json`;
}

async function exportBackup(): Promise<void> {
  busy.value = true;
  try {
    const bundle = await exportFavoritesData(localStorageArea());
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFileName();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    emit("status", `已导出 ${bundle.database.items.length} 条收藏`, "saved");
  } catch (error) {
    emit("status", error instanceof Error ? error.message : "导出收藏失败", "error");
  } finally {
    busy.value = false;
  }
}

async function importBackup(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) {
    emit("status", "备份文件过大，已取消导入", "error");
    return;
  }

  busy.value = true;
  try {
    const text = await file.text();
    let preview: { database?: { items?: unknown[] }; format?: string };
    try {
      preview = JSON.parse(text) as typeof preview;
    } catch {
      throw new Error("备份文件不是有效的 JSON");
    }
    if (preview.format !== "danmaku-echo-favorites" || !Array.isArray(preview.database?.items)) {
      throw new Error("不是弹幕回声收藏备份文件");
    }
    const count = preview.database.items.length;
    if (!window.confirm(`确定用这份备份中的 ${count} 条收藏覆盖当前收藏吗？\n当前数据会先保留为本地回滚副本。`)) {
      return;
    }
    const imported = await importFavoritesData(localStorageArea(), text);
    emit("status", `已安全导入 ${imported.items.length} 条收藏`, "saved");
  } catch (error) {
    emit("status", error instanceof Error ? error.message : "导入收藏失败", "error");
  } finally {
    busy.value = false;
  }
}
</script>
