import {
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  type FavoriteDanmaku,
  type FavoriteOrigin,
  type FavoriteRoomStats,
  type FavoritesDatabase,
  type RoomContext
} from "./types";

type StorageAreaLike = Pick<chrome.storage.StorageArea, "get" | "set">;

function emptyDatabase(): FavoritesDatabase {
  return { items: [], schemaVersion: FAVORITES_SCHEMA_VERSION, updatedAt: 0 };
}

function favoriteId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const random = typeof globalThis.crypto?.getRandomValues === "function"
    ? Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)), (value) => value.toString(36)).join("")
    : Math.random().toString(36).slice(2);
  return `fav-${Date.now().toString(36)}-${random}`;
}

export function normalizeFavoriteText(value: unknown, maxLength = 1_000): string {
  const normalized = String(value == null ? "" : value)
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Preserve U+200D: it joins many valid Unicode emoji sequences such as
    // family and profession emoji.  Only remove invisible formatting marks
    // that cannot carry first-version favorite content by themselves.
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(normalized).slice(0, maxLength).join("");
}

export function favoriteKey(value: unknown): string {
  return normalizeFavoriteText(value).toLowerCase();
}

function validOrigin(value: unknown): value is FavoriteOrigin {
  if (!value || typeof value !== "object") return false;
  const origin = value as Partial<FavoriteOrigin>;
  return Boolean(origin.roomKey && origin.roomId && origin.platform && origin.roomName);
}

function normalizeStats(value: unknown): Record<string, FavoriteRoomStats> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    if (!raw || typeof raw !== "object") return [];
    const stats = raw as Partial<FavoriteRoomStats>;
    return [[key, {
      addedToRoomAt: Number(stats.addedToRoomAt) || undefined,
      lastSentAt: Number(stats.lastSentAt) || 0,
      pinned: Boolean(stats.pinned),
      sendCount: Math.max(0, Number(stats.sendCount) || 0)
    }]];
  }));
}

function normalizeDatabase(value: unknown): FavoritesDatabase {
  if (!value || typeof value !== "object") return emptyDatabase();
  const source = value as Partial<FavoritesDatabase>;
  const items = Array.isArray(source.items) ? source.items.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const candidate = raw as Partial<FavoriteDanmaku>;
    const text = normalizeFavoriteText(candidate.text);
    if (!text) return [];
    const now = Date.now();
    return [{
      createdAt: Number(candidate.createdAt) || now,
      globalPinned: Boolean(candidate.globalPinned),
      id: String(candidate.id || favoriteId()),
      lastSentAt: Number(candidate.lastSentAt) || 0,
      normalizedText: favoriteKey(text),
      origins: Array.isArray(candidate.origins) ? candidate.origins.filter(validOrigin) : [],
      roomStats: normalizeStats(candidate.roomStats),
      text,
      totalSendCount: Math.max(0, Number(candidate.totalSendCount) || 0),
      updatedAt: Number(candidate.updatedAt) || now
    } satisfies FavoriteDanmaku];
  }) : [];
  return {
    items,
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    updatedAt: Number(source.updatedAt) || 0
  };
}

function storageGet(area: StorageAreaLike): Promise<FavoritesDatabase> {
  return new Promise((resolve) => {
    area.get(FAVORITES_STORAGE_KEY, (result) => {
      resolve(normalizeDatabase(result?.[FAVORITES_STORAGE_KEY]));
    });
  });
}

function storageSet(area: StorageAreaLike, database: FavoritesDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    area.set({ [FAVORITES_STORAGE_KEY]: database }, () => {
      const error = globalThis.chrome?.runtime?.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function roomStats(item: FavoriteDanmaku, roomKey: string): FavoriteRoomStats {
  return item.roomStats[roomKey] || { lastSentAt: 0, pinned: false, sendCount: 0 };
}

export function createFavoritesRepository(area: StorageAreaLike) {
  let database = emptyDatabase();
  const listeners = new Set<(database: FavoritesDatabase) => void>();

  function notify(): void {
    listeners.forEach((listener) => listener(database));
  }

  async function persist(): Promise<void> {
    database.updatedAt = Date.now();
    await storageSet(area, database);
    notify();
  }

  return {
    async addToRoom(id: string, room: RoomContext): Promise<void> {
      const item = database.items.find((entry) => entry.id === id);
      if (!item) return;
      const now = Date.now();
      if (!item.origins.some((origin) => origin.roomKey === room.roomKey)) {
        item.origins.push({
          collectedAt: now,
          platform: room.platform,
          roomId: room.roomId,
          roomKey: room.roomKey,
          roomName: room.roomName
        });
      }
      item.roomStats[room.roomKey] = {
        ...roomStats(item, room.roomKey),
        addedToRoomAt: now
      };
      item.updatedAt = now;
      await persist();
    },
    async favorite(textValue: unknown, room: RoomContext): Promise<{ added: boolean; item: FavoriteDanmaku }> {
      const text = normalizeFavoriteText(textValue);
      if (!text) throw new Error("收藏内容为空");
      const key = favoriteKey(text);
      const now = Date.now();
      let item = database.items.find((entry) => entry.normalizedText === key);
      const added = !item;
      if (!item) {
        item = {
          createdAt: now,
          globalPinned: false,
          id: favoriteId(),
          lastSentAt: 0,
          normalizedText: key,
          origins: [],
          roomStats: {},
          text,
          totalSendCount: 0,
          updatedAt: now
        };
        database.items.push(item);
      }
      if (!item.origins.some((origin) => origin.roomKey === room.roomKey)) {
        item.origins.push({
          collectedAt: now,
          platform: room.platform,
          roomId: room.roomId,
          roomKey: room.roomKey,
          roomName: room.roomName
        });
      }
      item.roomStats[room.roomKey] = {
        ...roomStats(item, room.roomKey),
        addedToRoomAt: item.roomStats[room.roomKey]?.addedToRoomAt || now
      };
      item.updatedAt = now;
      await persist();
      return { added, item };
    },
    get database(): FavoritesDatabase {
      return database;
    },
    async load(): Promise<FavoritesDatabase> {
      database = await storageGet(area);
      notify();
      return database;
    },
    async recordSent(id: string, room: RoomContext): Promise<void> {
      const item = database.items.find((entry) => entry.id === id);
      if (!item) return;
      const now = Date.now();
      const stats = roomStats(item, room.roomKey);
      item.roomStats[room.roomKey] = {
        ...stats,
        lastSentAt: now,
        sendCount: stats.sendCount + 1
      };
      item.lastSentAt = now;
      item.totalSendCount += 1;
      item.updatedAt = now;
      await persist();
    },
    async remove(id: string): Promise<void> {
      database.items = database.items.filter((entry) => entry.id !== id);
      await persist();
    },
    subscribe(listener: (database: FavoritesDatabase) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
