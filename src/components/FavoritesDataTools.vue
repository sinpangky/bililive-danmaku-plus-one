<template>
  <div class="favorites-data-tools" aria-labelledby="favorites-data-title">
    <span class="favorites-data-copy">
      <strong id="favorites-data-title">{{ t("favoritesBackupTitle") }}</strong>
      <small>{{ t("favoritesBackupDescription") }}</small>
    </span>
    <span class="favorites-data-actions">
      <button type="button" :disabled="busy" @click="chooseStorageDirectory">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 7.5h6l1.8 2H20.5v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
          <path d="M3.5 8V6a2 2 0 0 1 2-2h4l1.8 2h5.2" />
        </svg>
        {{ t("favoritesDirectoryChoose") }}
      </button>
      <button type="button" :disabled="busy" @click="exportBackup">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v10M8 10l4 4 4-4M5 18h14" />
        </svg>
        {{ t("favoritesBackupExport") }}
      </button>
      <button type="button" :disabled="busy" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V5M8 9l4-4 4 4M5 19h14" />
        </svg>
        {{ t("favoritesBackupImport") }}
      </button>
      <input
        ref="fileInput"
        class="favorites-data-file"
        type="file"
        accept="application/json,.json"
        :aria-label="t('favoritesBackupFileAria')"
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
} from "../features/favorites/repository";
import {
  FAVORITES_DIRECTORY_SYNC_MESSAGE,
  saveFavoritesDirectoryHandle,
  type WritableDirectoryHandle
} from "../features/favorites/file-storage";
import { t } from "../core/i18n";

const emit = defineEmits<{
  status: [message: string, kind: "error" | "saved"];
}>();

const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function localStorageArea(): chrome.storage.StorageArea {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage) throw new Error(t("favoritesStorageUnavailable"));
  return storage;
}

function backupFileName(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `danmaku-echo-favorites-${day}.json`;
}

async function chooseStorageDirectory(): Promise<void> {
  const picker = (window as typeof window & {
    showDirectoryPicker?: (options: { id: string; mode: "readwrite" }) =>
      Promise<WritableDirectoryHandle>;
  }).showDirectoryPicker;
  if (!picker) {
    emit("status", t("favoritesDirectoryUnsupported"), "error");
    return;
  }
  busy.value = true;
  try {
    const handle = await picker.call(window, { id: "danmaku-echo-favorites", mode: "readwrite" });
    if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") {
      throw new Error(t("favoritesDirectoryPermissionDenied"));
    }
    await saveFavoritesDirectoryHandle(handle);
    const response = await chrome.runtime.sendMessage({ type: FAVORITES_DIRECTORY_SYNC_MESSAGE });
    if (!response?.ok || !response.synced) {
      throw new Error(response?.error || t("favoritesDirectorySyncFailed"));
    }
    emit("status", t("favoritesDirectorySelected", handle.name), "saved");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    emit("status", error instanceof Error ? error.message : t("favoritesDirectorySyncFailed"), "error");
  } finally {
    busy.value = false;
  }
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
    emit("status", t("favoritesBackupExported", String(bundle.database.items.length)), "saved");
  } catch (error) {
    emit("status", error instanceof Error ? error.message : t("favoritesBackupExportFailed"), "error");
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
    emit("status", t("favoritesBackupTooLarge"), "error");
    return;
  }

  busy.value = true;
  try {
    const text = await file.text();
    let preview: { database?: { items?: unknown[] }; format?: string };
    try {
      preview = JSON.parse(text) as typeof preview;
    } catch {
      throw new Error(t("favoritesBackupInvalidJson"));
    }
    if (preview.format !== "danmaku-echo-favorites" || !Array.isArray(preview.database?.items)) {
      throw new Error(t("favoritesBackupWrongFormat"));
    }
    const count = preview.database.items.length;
    if (!window.confirm(t("favoritesBackupConfirm", String(count)))) {
      return;
    }
    const imported = await importFavoritesData(localStorageArea(), text);
    await chrome.runtime.sendMessage({ type: FAVORITES_DIRECTORY_SYNC_MESSAGE });
    emit("status", t("favoritesBackupImported", String(imported.items.length)), "saved");
  } catch (error) {
    emit("status", error instanceof Error ? error.message : t("favoritesBackupImportFailed"), "error");
  } finally {
    busy.value = false;
  }
}
</script>

<style lang="scss">
.favorites-data-tools {
  align-items: center;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding: 14px 20px;
}

.favorites-data-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.favorites-data-copy strong {
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
}

.favorites-data-copy small {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 17px;
}

.favorites-data-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.favorites-data-actions button {
  align-items: center;
  background: #14171a;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 16px;
  color: var(--text);
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
}

.favorites-data-actions button:hover,
.favorites-data-actions button:focus-visible {
  background: var(--surface-muted);
  border-color: #fff;
}

.favorites-data-actions button:disabled {
  cursor: wait;
  opacity: .55;
}

.favorites-data-actions svg {
  fill: none;
  height: 15px;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
  width: 15px;
}

.favorites-data-file {
  display: none;
}

@media (max-width: 900px) {
  .favorites-data-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .favorites-data-actions button {
    flex: 1;
    justify-content: center;
  }
}
</style>
