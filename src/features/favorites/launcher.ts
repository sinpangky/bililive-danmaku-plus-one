import { createApp, nextTick, reactive } from "vue";
import type { PlatformId } from "../../core/types";
import { t } from "../../core/i18n";
import favoritesStyles from "../../assets/styles/favorites.scss?inline";
import FavoritesLauncher from "./FavoritesLauncher.vue";
import { createFavoritesRepository } from "./repository";
import { currentRoomContext } from "./room-context";
import { groupedFavorites, rankedFavorites } from "./ranking";
import {
  DEFAULT_UNICYCLE_CONFIG,
  normalizeUnicycleConfig,
  UNICYCLE_STORAGE_KEY,
  unicycleIntervalMilliseconds,
  unicycleMessages,
  type UnicycleConfig,
} from "./unicycle";
import {
  FAVORITES_STORAGE_KEY,
  FAVORITE_WRITE_MESSAGE,
  type FavoriteDisplayItem,
  type FavoritePayload,
  type FavoriteRoomGroup,
  type FavoriteSort,
  type FavoriteView,
  type FavoriteWriteRequest,
  type FavoriteWriteResponse,
  type RoomContext
} from "./types";

export interface FavoritesLauncherState {
  currentCount: number;
  groups: FavoriteRoomGroup[];
  items: FavoriteDisplayItem[];
  loading: boolean;
  mode: "closed" | "panel";
  otherCount: number;
  room: RoomContext;
  search: string;
  selectedRoomKey: string;
  sort: FavoriteSort;
  toolView: "favorites" | "unicycle";
  totalCount: number;
  unicycleConfig: UnicycleConfig;
  unicycleLastMessage: string;
  unicycleMessageCount: number;
  unicycleRunning: boolean;
  unicycleSentCount: number;
  platformMaxLength: number;
  view: FavoriteView;
}

interface FavoritesRuntimeOptions {
  enabled(): boolean;
  maxMessageLength: number;
  platform: PlatformId;
  sendFavorite(payload: FavoritePayload): Promise<boolean>;
  showToast(message: string, tone?: string): void;
}

export interface FavoritesRuntime {
  destroy(): void;
  favoriteText(text: string, payload?: unknown): Promise<boolean | null>;
  openPanel(view?: FavoriteView): void;
}

type FavoritesRuntimeScope = typeof globalThis & {
  __danmakuEchoFavoritesRuntime?: FavoritesRuntime;
};

const FAVORITES_UI_VERSION = 2;
const OWNER_SELECTOR = "[data-bcp-favorites-runtime-owner='true']";
const STALE_PORTAL_SELECTOR = ".bcp-favorites-host, .bcp-favorites-portal";
const OPEN_REQUEST_EVENT = "danmaku-echo:favorites-open";
const FAVORITE_WRITE_TIMEOUT = 6_000;

function runtimeId(extensionId: string): string {
  const random = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${extensionId}:${random}`;
}

function claimUiOwnership(ownerId: string, extensionId: string): HTMLElement | null {
  const markers = Array.from(document.querySelectorAll<HTMLElement>(OWNER_SELECTOR));
  const current = markers
    .sort((first, second) => Number(second.dataset.bcpFavoritesUiVersion || 0)
      - Number(first.dataset.bcpFavoritesUiVersion || 0))[0];
  const currentVersion = Number(current?.dataset.bcpFavoritesUiVersion || 0);
  if (current && (currentVersion > FAVORITES_UI_VERSION
      || (currentVersion === FAVORITES_UI_VERSION
        && current.dataset.bcpFavoritesExtensionId !== extensionId))) {
    markers.slice(1).forEach((marker) => marker.remove());
    return null;
  }
  markers.forEach((marker) => marker.remove());
  const marker = document.createElement("span");
  marker.hidden = true;
  marker.dataset.bcpFavoritesRuntimeOwner = "true";
  marker.dataset.bcpFavoritesExtensionId = extensionId;
  marker.dataset.bcpFavoritesOwnerId = ownerId;
  marker.dataset.bcpFavoritesUiVersion = String(FAVORITES_UI_VERSION);
  marker.dataset.bcpOneOwned = "true";
  document.documentElement.appendChild(marker);
  return marker;
}

function extensionContextAvailable(extensionId: string): boolean {
  try {
    return Boolean(globalThis.chrome?.runtime?.id)
      && globalThis.chrome.runtime.id === extensionId;
  } catch {
    return false;
  }
}

function favoriteErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  return /extension context invalidated|receiving end does not exist|message port closed/i.test(message)
    ? t("favoritesExtensionUpdated")
    : message || t("favoritesActionFailed");
}

function mutateFavoriteInBackground(
  request: Omit<FavoriteWriteRequest, "type">
): Promise<FavoriteWriteResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(t("favoritesServiceTimeout")));
    }, FAVORITE_WRITE_TIMEOUT);
    try {
      chrome.runtime.sendMessage({ ...request, type: FAVORITE_WRITE_MESSAGE }, (
        response: FavoriteWriteResponse | undefined
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
          } else if (!response?.ok) {
            reject(new Error(response?.error || t("favoritesServiceUnavailable")));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
  });
}

function writeFavoriteInBackground(
  text: string,
  room: RoomContext,
  payload?: unknown
): Promise<FavoriteWriteResponse> {
  return mutateFavoriteInBackground({
    operation: "favorite",
    payload,
    room,
    text
  });
}

function editableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']"
  ));
}

export function createFavoritesRuntime(options: FavoritesRuntimeOptions) {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage) {
    return null;
  }
  const runtimeScope = globalThis as FavoritesRuntimeScope;
  runtimeScope.__danmakuEchoFavoritesRuntime?.destroy();
  const repository = createFavoritesRepository(storage);
  const room = (): RoomContext => currentRoomContext(options.platform);
  const extensionId = globalThis.chrome?.runtime?.id || "standalone";
  const ownerId = runtimeId(extensionId);
  const ownerMarker = claimUiOwnership(ownerId, extensionId);

  if (!ownerMarker) {
    let destroyed = false;
    const passiveRuntime: FavoritesRuntime = {
      destroy(): void {
        destroyed = true;
        if (runtimeScope.__danmakuEchoFavoritesRuntime === passiveRuntime) {
          delete runtimeScope.__danmakuEchoFavoritesRuntime;
        }
      },
      async favoriteText(): Promise<null> {
        // The page-level Douyin renderer broadcasts its request to every
        // isolated extension world. Only the runtime owning the current UI may
        // write storage or show feedback; stale/passive runtimes yield silently.
        return null;
      },
      openPanel(view: FavoriteView = "current"): void {
        if (destroyed || !options.enabled()) return;
        document.dispatchEvent(new CustomEvent(OPEN_REQUEST_EVENT, { detail: { view } }));
      }
    };
    runtimeScope.__danmakuEchoFavoritesRuntime = passiveRuntime;
    return passiveRuntime;
  }
  const activeOwnerMarker = ownerMarker;

  document.querySelectorAll(STALE_PORTAL_SELECTOR).forEach((node) => node.remove());
  const initialRoom = currentRoomContext(options.platform);
  const state = reactive<FavoritesLauncherState>({
    currentCount: 0,
    groups: [],
    items: [],
    loading: true,
    mode: "closed",
    otherCount: 0,
    room: initialRoom,
    search: "",
    selectedRoomKey: "",
    sort: "custom",
    toolView: "favorites",
    totalCount: 0,
    unicycleConfig: { ...DEFAULT_UNICYCLE_CONFIG },
    unicycleLastMessage: "",
    unicycleMessageCount: 0,
    unicycleRunning: false,
    unicycleSentCount: 0,
    platformMaxLength: Math.max(1, Math.min(Math.trunc(options.maxMessageLength), 1_000)),
    view: "current"
  });
  const portal = document.createElement("div");
  portal.className = "bcp-favorites-host";
  portal.dataset.bcpFavoritesOwned = "true";
  portal.dataset.bcpFavoritesUiVersion = String(FAVORITES_UI_VERSION);
  portal.dataset.bcpFavoritesOwnerId = ownerId;
  portal.dataset.bcpOneOwned = "true";
  portal.dataset.bcpDouyinOwned = "true";
  portal.style.setProperty("all", "initial", "important");
  portal.style.setProperty("position", "fixed", "important");
  portal.style.setProperty("inset", "0", "important");
  portal.style.setProperty("z-index", "2147483647", "important");
  portal.style.setProperty("pointer-events", "none", "important");
  const shadowRoot = portal.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = favoritesStyles;
  const mountPoint = document.createElement("div");
  mountPoint.className = "bcp-favorites-portal";
  shadowRoot.append(style, mountPoint);
  const app = createApp(FavoritesLauncher, {
    state,
    onAddToRoom: (id: string) => void addToRoom(id),
    onAddToUnicycle: (id: string) => void addFavoriteToUnicycle(id),
    onAddManualFavorite: (text: string) => void addManualFavorite(text),
    onAddUnicycleToFavorites: () => void addUnicycleToFavorites(),
    onBackToRooms: () => backToRooms(),
    onChangeView: (view: FavoriteView) => changeView(view),
    onClose: close,
    onRemove: (id: string) => void remove(id),
    onReorder: (payload: { sourceId: string; targetId: string }) => void reorder(payload),
    onSearch: (value: string) => {
      state.search = value;
      refresh();
    },
    onSend: (id: string) => void sendById(id),
    onSelectRoom: (roomKey: string) => selectRoom(roomKey),
    onSort: (sort: FavoriteSort) => changeSort(sort),
    onToolView: (view: "favorites" | "unicycle") => {
      state.toolView = view;
    },
    onUnicycleStart: () => void startUnicycle(),
    onUnicycleStop: () => stopUnicycle(),
    onUnicycleUpdate: (config: UnicycleConfig) => void updateUnicycle(config),
  });
  app.mount(mountPoint);

  let hotkeyDown = false;
  let restoreFocus: HTMLElement | null = null;
  let unsubscribe = () => {};
  let destroyed = false;
  let unicycleRunToken = 0;
  let unicycleTimer: ReturnType<typeof setTimeout> | undefined;

  const onVisibilityChange = () => {
    if (document.hidden) cancelGesture();
  };
  const onWindowBlur = () => cancelGesture();

  function ownsUi(): boolean {
    return activeOwnerMarker.isConnected
      && activeOwnerMarker.dataset.bcpFavoritesOwnerId === ownerId
      && activeOwnerMarker.dataset.bcpFavoritesExtensionId === extensionId
      && Number(activeOwnerMarker.dataset.bcpFavoritesUiVersion) === FAVORITES_UI_VERSION;
  }

  function removeForeignPortal(node: Node): void {
    if (node instanceof Element && node.matches(STALE_PORTAL_SELECTOR) && node !== portal) {
      node.remove();
    }
  }

  const uiObserver = new MutationObserver((records) => {
    if (!ownsUi()) {
      runtime.destroy();
      return;
    }
    records.forEach((record) => record.addedNodes.forEach(removeForeignPortal));
  });

  const onExternalOpen = (event: Event) => {
    const requested = (event as CustomEvent<{ view?: FavoriteView }>).detail?.view;
    openPanel(requested === "other" || requested === "all" ? requested : "current");
  };

  function ensureHost(): void {
    if (destroyed) return;
    if (!ownsUi()) {
      runtime.destroy();
      return;
    }
    const host = document.fullscreenElement || document.documentElement;
    if (portal.parentNode !== host) host.appendChild(portal);
  }

  function unicyclePayload(text: string): FavoritePayload {
    return {
      assets: [],
      parts: [{ text, type: "text" }],
      plainText: text,
      text,
    };
  }

  function refreshUnicycleCount(): void {
    state.unicycleMessageCount = unicycleMessages(
      state.unicycleConfig.content,
      state.unicycleConfig.maxMessageLength,
      state.platformMaxLength,
    ).length;
  }

  function writeUnicycleConfig(config: UnicycleConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      storage.set({ [UNICYCLE_STORAGE_KEY]: config }, () => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve();
      });
    });
  }

  async function updateUnicycle(value: UnicycleConfig): Promise<void> {
    const config = normalizeUnicycleConfig(value);
    state.unicycleConfig = config;
    refreshUnicycleCount();
    try {
      await writeUnicycleConfig(config);
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  function loadUnicycleConfig(): void {
    storage.get([UNICYCLE_STORAGE_KEY], (values) => {
      if (destroyed) return;
      state.unicycleConfig = normalizeUnicycleConfig(values?.[UNICYCLE_STORAGE_KEY]);
      refreshUnicycleCount();
    });
  }

  function stopUnicycle(showFeedback = true): void {
    const wasRunning = state.unicycleRunning;
    unicycleRunToken += 1;
    if (unicycleTimer !== undefined) clearTimeout(unicycleTimer);
    unicycleTimer = undefined;
    state.unicycleRunning = false;
    if (wasRunning && showFeedback) options.showToast(t("unicycleStopped"), "info");
  }

  function waitForUnicycle(milliseconds: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      unicycleTimer = setTimeout(() => {
        unicycleTimer = undefined;
        resolve(token === unicycleRunToken && !destroyed);
      }, milliseconds);
    });
  }

  async function startUnicycle(): Promise<void> {
    if (state.unicycleRunning) return;
    const config = normalizeUnicycleConfig(state.unicycleConfig);
    const messages = unicycleMessages(
      config.content,
      config.maxMessageLength,
      state.platformMaxLength,
    );
    if (!messages.length) {
      options.showToast(t("unicycleEmpty"), "warning");
      return;
    }
    await updateUnicycle(config);
    const token = ++unicycleRunToken;
    const deadline = Date.now() + config.totalDurationSeconds * 1_000;
    state.unicycleRunning = true;
    state.unicycleSentCount = 0;
    state.unicycleLastMessage = "";
    options.showToast(t("unicycleStarted"), "success");

    while (token === unicycleRunToken && !destroyed) {
      if (config.runMode === "count" && state.unicycleSentCount >= config.totalCount) break;
      if (config.runMode === "duration" && Date.now() >= deadline) break;
      const message = messages[state.unicycleSentCount % messages.length];
      const success = await options.sendFavorite(unicyclePayload(message));
      if (token !== unicycleRunToken || destroyed) return;
      if (!success) {
        stopUnicycle(false);
        options.showToast(t("unicycleSendFailed"), "error");
        return;
      }
      state.unicycleSentCount += 1;
      state.unicycleLastMessage = message;
      if (config.runMode === "count" && state.unicycleSentCount >= config.totalCount) break;
      const interval = unicycleIntervalMilliseconds(config);
      if (config.runMode === "duration" && Date.now() + interval >= deadline) break;
      if (!(await waitForUnicycle(interval, token))) return;
    }

    if (token === unicycleRunToken) {
      state.unicycleRunning = false;
      options.showToast(t("unicycleCompleted", String(state.unicycleSentCount)), "success");
    }
  }

  async function addManualFavorite(textValue: string): Promise<void> {
    const text = String(textValue || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    try {
      const response = await writeFavoriteInBackground(text, room());
      options.showToast(
        response.added ? t("favoritesManualAdded") : t("favoritesAlreadySaved"),
        "success",
      );
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  async function addUnicycleToFavorites(): Promise<void> {
    const messages = Array.from(new Set(unicycleMessages(
      state.unicycleConfig.content,
      1_000,
      1_000,
    )));
    if (!messages.length) {
      options.showToast(t("unicycleEmpty"), "warning");
      return;
    }
    let added = 0;
    try {
      for (const message of messages) {
        const response = await writeFavoriteInBackground(message, room());
        if (response.added) added += 1;
      }
      options.showToast(t("unicycleAddedToFavorites", String(added)), "success");
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  async function addFavoriteToUnicycle(id: string): Promise<void> {
    const item = repository.database.items.find((entry) => entry.id === id);
    if (!item) return;
    const content = [state.unicycleConfig.content.replace(/\s+$/, ""), item.text]
      .filter(Boolean)
      .join("\n");
    await updateUnicycle({ ...state.unicycleConfig, content });
    state.toolView = "unicycle";
    options.showToast(t("favoritesAddedToUnicycle"), "success");
  }

  function refresh(): void {
    state.room = room();
    state.currentCount = rankedFavorites(
      repository.database.items,
      state.room,
      "current"
    ).length;
    const otherGroups = groupedFavorites(repository.database.items, state.room, "other");
    state.otherCount = new Set(otherGroups.flatMap((group) => group.items.map((item) => item.id))).size;
    state.totalCount = repository.database.items.length;
    state.items = state.view === "current"
      ? rankedFavorites(repository.database.items, state.room, "current", state.search, state.sort)
      : [];
    state.groups = state.view === "current"
      ? []
      : groupedFavorites(repository.database.items, state.room, state.view, "", state.sort);
    if (state.selectedRoomKey
        && !state.groups.some((group) => group.roomKey === state.selectedRoomKey)) {
      state.selectedRoomKey = "";
    }
  }

  function close(): void {
    const focusTarget = state.mode === "panel" ? restoreFocus : null;
    state.mode = "closed";
    restoreFocus = null;
    if (focusTarget?.isConnected) {
      void nextTick(() => focusTarget.focus({ preventScroll: true }));
    }
  }

  function openPanel(view: FavoriteView = "current"): void {
    if (!options.enabled()) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement
        && !portal.contains(activeElement) && !shadowRoot.contains(activeElement)) {
      restoreFocus = activeElement;
    }
    ensureHost();
    state.view = view;
    state.search = "";
    state.selectedRoomKey = "";
    state.mode = "panel";
    refresh();
  }

  async function sendById(id: string): Promise<void> {
    const item = repository.database.items.find((entry) => entry.id === id);
    if (!item) return;
    portal.dataset.bcpFavoritesLastSend = item.text;
    portal.dataset.bcpFavoritesLastSendResult = "pending";
    close();
    const currentRoom = room();
    const success = await options.sendFavorite(item.payload);
    portal.dataset.bcpFavoritesLastSendResult = success ? "success" : "failed";
    if (success) {
      try {
        await mutateFavoriteInBackground({ id, operation: "record-sent", room: currentRoom });
      } catch (error) {
        options.showToast(t("favoritesSendCountSaveFailed", favoriteErrorMessage(error)), "warning");
      }
    }
  }

  async function addToRoom(id: string): Promise<void> {
    try {
      await mutateFavoriteInBackground({ id, operation: "add-to-room", room: room() });
      options.showToast(t("favoritesAddedToRoom"), "success");
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await mutateFavoriteInBackground({ id, operation: "remove", room: room() });
      options.showToast(t("favoritesRemoved"), "success");
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  async function reorder({ sourceId, targetId }: { sourceId: string; targetId: string }): Promise<void> {
    if (state.sort !== "custom" || state.search || sourceId === targetId) return;
    const selectedGroup = state.groups.find((group) => group.roomKey === state.selectedRoomKey);
    const items = state.view === "current" ? state.items : selectedGroup?.items || [];
    const orderedIds = items.map((item) => item.id);
    const sourceIndex = orderedIds.indexOf(sourceId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    orderedIds.splice(targetIndex, 0, orderedIds.splice(sourceIndex, 1)[0]);
    const targetRoomKey = state.view === "current"
      ? state.room.roomKey
      : selectedGroup?.roomKey || state.room.roomKey;
    try {
      await mutateFavoriteInBackground({
        ids: orderedIds,
        operation: "reorder-room",
        room: room(),
        targetRoomKey,
      });
      options.showToast(t("favoritesOrderSaved"), "success");
    } catch (error) {
      options.showToast(favoriteErrorMessage(error), "error");
    }
  }

  function changeView(view: FavoriteView): void {
    state.view = view;
    state.selectedRoomKey = "";
    refresh();
  }

  function changeSort(sort: FavoriteSort): void {
    state.sort = sort;
    refresh();
  }

  function selectRoom(roomKey: string): void {
    if (state.view === "current" || !state.groups.some((group) => group.roomKey === roomKey)) return;
    state.selectedRoomKey = roomKey;
    state.search = "";
  }

  function backToRooms(): void {
    state.selectedRoomKey = "";
    state.search = "";
  }

  function visiblePanelItems(): FavoriteDisplayItem[] {
    if (state.toolView !== "favorites") return [];
    if (state.view === "current") return state.items;
    const group = state.groups.find((entry) => entry.roomKey === state.selectedRoomKey);
    if (!group) return [];
    const query = state.search.replace(/\s+/g, " ").trim().toLowerCase();
    if (!query || group.roomName.toLowerCase().includes(query)) return group.items;
    return group.items.filter((item) => item.normalizedText.includes(query));
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && state.mode !== "closed") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.mode === "panel" && state.selectedRoomKey) backToRooms();
      else close();
      return;
    }
    if (state.mode === "panel" && !editableTarget(event.target)
        && /^[1-9]$/.test(event.key)) {
      const item = visiblePanelItems()[Number(event.key) - 1];
      if (item) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void sendById(item.id);
      }
      return;
    }
    if (event.code !== "KeyQ" || !event.altKey || event.ctrlKey || event.metaKey
        || event.repeat || editableTarget(event.target) || !options.enabled()) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    hotkeyDown = true;
    if (state.mode === "panel") close();
    else openPanel("current");
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.code !== "KeyQ" || !hotkeyDown) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hotkeyDown = false;
  }

  function cancelGesture(): void {
    hotkeyDown = false;
  }

  const storageChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
    changes,
    areaName
  ) => {
    if (areaName === "local" && changes[FAVORITES_STORAGE_KEY]) {
      void repository.load().catch((error) => {
        console.warn("[Bilibili Danmaku +1] favorites refresh failed", error);
      });
    }
    if (areaName === "local" && changes[UNICYCLE_STORAGE_KEY] && !state.unicycleRunning) {
      state.unicycleConfig = normalizeUnicycleConfig(changes[UNICYCLE_STORAGE_KEY].newValue);
      refreshUnicycleCount();
    }
  };

  const runtime: FavoritesRuntime = {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelGesture();
      stopUnicycle(false);
      unsubscribe();
      uiObserver.disconnect();
      try {
        chrome.storage.onChanged.removeListener(storageChanged);
      } catch {
        // Reloading the unpacked extension invalidates the old isolated world.
      }
      document.removeEventListener(OPEN_REQUEST_EVENT, onExternalOpen);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("fullscreenchange", ensureHost, true);
      document.removeEventListener("webkitfullscreenchange", ensureHost, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      app.unmount();
      portal.remove();
      if (activeOwnerMarker.dataset.bcpFavoritesOwnerId === ownerId) activeOwnerMarker.remove();
      if (runtimeScope.__danmakuEchoFavoritesRuntime === runtime) {
        delete runtimeScope.__danmakuEchoFavoritesRuntime;
      }
    },
    async favoriteText(text: string, payload?: unknown): Promise<boolean | null> {
      if (!options.enabled()) return false;
      if (!extensionContextAvailable(extensionId)) {
        options.showToast(t("favoritesExtensionUpdated"), "error");
        return false;
      }
      const pendingFeedback = setTimeout(() => {
        options.showToast(t("favoritesSaving"), "info");
      }, 300);
      try {
        const currentRoom = room();
        const response = await writeFavoriteInBackground(text, currentRoom, payload);
        const added = Boolean(response.added);
        options.showToast(added ? t("toastFavoriteSaved") : t("favoritesAlreadySaved"), "success");
        return true;
      } catch (error) {
        options.showToast(favoriteErrorMessage(error), "error");
        return false;
      } finally {
        clearTimeout(pendingFeedback);
      }
    },
    openPanel
  };
  runtimeScope.__danmakuEchoFavoritesRuntime = runtime;
  ensureHost();
  loadUnicycleConfig();
  unsubscribe = repository.subscribe(() => {
    state.loading = false;
    refresh();
  });
  void repository.load().then(() => {
    if (repository.recoveredFromBackup) {
      options.showToast(t("favoritesRecovered"), "warning");
    }
  }).catch((error) => {
    state.loading = false;
    options.showToast(favoriteErrorMessage(error), "error");
    console.warn("[Bilibili Danmaku +1] favorites load failed", error);
  });
  uiObserver.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener(OPEN_REQUEST_EVENT, onExternalOpen);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("fullscreenchange", ensureHost, true);
  document.addEventListener("webkitfullscreenchange", ensureHost, true);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onWindowBlur);
  chrome.storage.onChanged.addListener(storageChanged);

  return runtime;
}
