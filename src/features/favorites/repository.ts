import {
  FAVORITES_BACKUP_STORAGE_KEY,
  FAVORITES_IMPORT_BACKUP_STORAGE_KEY,
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  type FavoriteAsset,
  type FavoriteDanmaku,
  type FavoriteOrigin,
  type FavoritePart,
  type FavoritePayload,
  type FavoriteRoomStats,
  type FavoritesDatabase,
  type RoomContext
} from "./types";

type StorageAreaLike = Pick<chrome.storage.StorageArea, "get" | "set">;
const STORAGE_OPERATION_TIMEOUT = 4_000;

function emptyDatabase(): FavoritesDatabase {
  return {
    items: [],
    revision: 0,
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    updatedAt: 0,
    writeId: ""
  };
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
    // oxlint-disable-next-line no-control-regex -- storage text must reject C0 controls.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Preserve U+200D: it joins many valid Unicode emoji sequences such as
    // family and profession emoji.  Only remove invisible formatting marks
    // that cannot carry favorite content by themselves.
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(normalized).slice(0, maxLength).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeFavoriteAsset(value: unknown): FavoriteAsset | null {
  if (!isRecord(value)) return null;
  const keys = Array.isArray(value.keys)
    ? Array.from(new Set(value.keys.map((key) => String(key || "").trim().slice(0, 256))
      .filter(Boolean))).slice(0, 24)
    : [];
  const src = String(value.src || "").trim().slice(0, 4_096);
  const token = normalizeFavoriteText(value.token, 120);
  if (!keys.length && !src && !token) return null;
  return { keys, src, token };
}

const GENERIC_RICH_LABEL = /^(?:图片|图片表情|表情|emoji|emote|image|sticker|贴纸)$/i;
const IMAGE_FILE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

function humanAssetName(value: unknown): string {
  let name = normalizeFavoriteText(value, 120);
  if (!name) return "";
  const bracketed = /^\[([^\]\n]{1,80})\]$/.exec(name);
  if (bracketed) name = bracketed[1].trim();
  try {
    name = decodeURIComponent(name);
  } catch {
    // Resource metadata is not guaranteed to be URI encoded.
  }
  name = name.replace(/[?#].*$/, "").replace(IMAGE_FILE_EXTENSION, "").trim();
  if (!name || GENERIC_RICH_LABEL.test(name)
      || /^(?:data|blob|https?):/i.test(name)
      || /[\\/]/.test(name)
      || Array.from(name).length > 80) {
    return "";
  }
  // Long hexadecimal/resource ids identify the asset but are not a useful
  // user-facing name. Keep ordinary English names such as "super-happy".
  if (/^(?:\d{6,}|[a-f\d]{12,}|[a-z\d_-]{24,})$/i.test(name)) return "";
  return name;
}

function formattedAssetName(value: unknown): string {
  const name = humanAssetName(value);
  if (!name) return "";
  return /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3)/u.test(name)
    ? name
    : `[${name}]`;
}

export function favoriteAssetDisplayName(assetValue: unknown): string {
  const asset = normalizeFavoriteAsset(assetValue);
  if (!asset) return "";
  const fromToken = formattedAssetName(asset.token);
  if (fromToken) return fromToken;

  const candidates = [
    ...asset.keys.filter((key) => key.startsWith("name:")).map((key) => key.slice(5)),
    ...asset.keys.filter((key) => key.startsWith("raw:") && /^raw:\[[^\]]+\]$/.test(key))
      .map((key) => key.slice(4)),
    ...asset.keys.filter((key) => key.startsWith("file:")).map((key) => key.slice(5))
  ];
  return candidates.map(formattedAssetName).find(Boolean) || "";
}

function normalizeFavoriteParts(value: unknown, assets: FavoriteAsset[], plainText: string): FavoritePart[] {
  if (!Array.isArray(value)) {
    return [
      ...(plainText ? [{ text: plainText, type: "text" as const }] : []),
      ...assets.map((asset) => ({ asset, type: "emoji" as const }))
    ];
  }
  let remainingTextLength = 1_000;
  const parts: FavoritePart[] = [];
  value.slice(0, 40).forEach((raw) => {
    if (!isRecord(raw)) return;
    if (raw.type === "text" && remainingTextLength > 0) {
      const text = normalizeFavoriteText(raw.text, remainingTextLength);
      remainingTextLength -= Array.from(text).length;
      if (text) parts.push({ text, type: "text" });
      return;
    }
    if (raw.type === "emoji") {
      const asset = normalizeFavoriteAsset(raw.asset);
      if (asset) parts.push({ asset, type: "emoji" });
    }
  });
  return parts;
}

export function normalizeFavoritePayload(value: unknown, fallbackText: unknown = ""): FavoritePayload {
  const record = isRecord(value) ? value : {};
  const fallback = normalizeFavoriteText(fallbackText);
  const text = normalizeFavoriteText(Object.hasOwn(record, "text") ? record.text : fallback) || fallback;
  const plainText = normalizeFavoriteText(
    Object.hasOwn(record, "plainText") ? record.plainText : text
  );
  const assets = Array.isArray(record.assets)
    ? record.assets.map(normalizeFavoriteAsset)
      .filter((asset): asset is FavoriteAsset => Boolean(asset)).slice(0, 8)
    : [];
  const parts = normalizeFavoriteParts(record.parts, assets, plainText);
  return { assets, parts, plainText, text };
}

export function favoriteDisplayText(payloadValue: unknown, fallbackText: unknown = ""): string {
  const payload = normalizeFavoritePayload(payloadValue, fallbackText);
  if (!payload.assets.length) return payload.text;

  let namedAssetCount = 0;
  const ordered = payload.parts.flatMap((part) => {
    if (part.type === "text") return part.text ? [part.text] : [];
    const name = favoriteAssetDisplayName(part.asset);
    if (name) namedAssetCount += 1;
    return name ? [name] : [];
  });
  const orderedText = normalizeFavoriteText(ordered.join(" "));
  if (namedAssetCount && orderedText) return orderedText;

  const names = payload.assets.map(favoriteAssetDisplayName).filter(Boolean);
  if (names.length) {
    return normalizeFavoriteText([payload.plainText, ...names].filter(Boolean).join(" "));
  }
  return payload.text;
}

function assetKey(asset: FavoriteAsset): string {
  const priority = ["fragment:", "stem:", "file:", "path:", "name:", "raw:"];
  for (const prefix of priority) {
    const key = asset.keys.filter((candidate) => candidate.startsWith(prefix)).sort()[0];
    if (key) return key;
  }
  return asset.keys.slice().sort()[0] || asset.token.toLowerCase() || asset.src.toLowerCase();
}

function richAssetSignature(payload: FavoritePayload): string {
  return payload.assets.map(assetKey).sort().join("\u0002");
}

export function favoriteKey(value: unknown, payloadValue?: unknown): string {
  const text = normalizeFavoriteText(value).toLowerCase();
  const payload = normalizeFavoritePayload(payloadValue, text);
  if (!payload.assets.length) return text;
  return `${text}\u0001${payload.assets.map(assetKey).join("\u0002")}`;
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
      customOrder: Number.isFinite(Number(stats.customOrder))
        ? Number(stats.customOrder)
        : undefined,
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
    const payload = normalizeFavoritePayload(candidate.payload, candidate.text);
    const text = favoriteDisplayText(payload, candidate.text);
    if (!text) return [];
    const now = Date.now();
    return [{
      createdAt: Number(candidate.createdAt) || now,
      globalPinned: Boolean(candidate.globalPinned),
      id: String(candidate.id || favoriteId()),
      lastSentAt: Number(candidate.lastSentAt) || 0,
      normalizedText: favoriteKey(text, payload),
      origins: Array.isArray(candidate.origins) ? candidate.origins.filter(validOrigin) : [],
      payload,
      roomStats: normalizeStats(candidate.roomStats),
      text,
      totalSendCount: Math.max(0, Number(candidate.totalSendCount) || 0),
      updatedAt: Number(candidate.updatedAt) || now
    } satisfies FavoriteDanmaku];
  }) : [];
  return {
    items,
    revision: Math.max(0, Number(source.revision) || 0),
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    updatedAt: Number(source.updatedAt) || 0,
    writeId: String(source.writeId || "").slice(0, 160)
  };
}

function storedDatabase(value: unknown): FavoritesDatabase | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  if (value.items.some((item) => !isRecord(item)
      || !String(item.id || "").trim()
      || (!normalizeFavoriteText(item.text) && !isRecord(item.payload)))) {
    return null;
  }
  const normalized = normalizeDatabase(value);
  if (normalized.items.length !== value.items.length
      || new Set(normalized.items.map((item) => item.id)).size !== normalized.items.length) {
    return null;
  }
  return normalized;
}

function storageValues(area: StorageAreaLike): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("读取收藏超时，请重试"));
    }, STORAGE_OPERATION_TIMEOUT);
    try {
      area.get([FAVORITES_STORAGE_KEY, FAVORITES_BACKUP_STORAGE_KEY], (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const error = globalThis.chrome?.runtime?.lastError;
          if (error) reject(new Error(error.message));
          else resolve(result || {});
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

async function storageGet(area: StorageAreaLike): Promise<{
  database: FavoritesDatabase;
  recoveredFromBackup: boolean;
}> {
  const values = await storageValues(area);
  const primaryValue = values[FAVORITES_STORAGE_KEY];
  const primary = storedDatabase(primaryValue);
  if (primary) return { database: primary, recoveredFromBackup: false };

  const backup = storedDatabase(values[FAVORITES_BACKUP_STORAGE_KEY]);
  if (backup) return { database: backup, recoveredFromBackup: true };
  if (primaryValue === undefined || primaryValue === null) {
    return { database: emptyDatabase(), recoveredFromBackup: false };
  }
  throw new Error("收藏数据损坏，且没有可用的本地备份");
}

function storageWrite(area: StorageAreaLike, update: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("保存收藏超时，请重试"));
    }, STORAGE_OPERATION_TIMEOUT);
    try {
      area.set(update, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const error = globalThis.chrome?.runtime?.lastError;
          if (error) reject(new Error(error.message));
          else resolve();
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

async function storageSet(area: StorageAreaLike, database: FavoritesDatabase): Promise<void> {
  await storageWrite(area, {
    [FAVORITES_STORAGE_KEY]: database,
    [FAVORITES_BACKUP_STORAGE_KEY]: database
  });
  const values = await storageValues(area);
  const verified = storedDatabase(values[FAVORITES_STORAGE_KEY]);
  if (!verified || verified.writeId !== database.writeId
      || verified.revision !== database.revision) {
    throw new Error("收藏写入校验失败，请重试");
  }
}

export interface FavoritesExportBundle {
  database: FavoritesDatabase;
  exportedAt: number;
  format: "danmaku-echo-favorites";
  schemaVersion: typeof FAVORITES_SCHEMA_VERSION;
}

export async function exportFavoritesData(area: StorageAreaLike): Promise<FavoritesExportBundle> {
  const loaded = await storageGet(area);
  return {
    database: loaded.database,
    exportedAt: Date.now(),
    format: "danmaku-echo-favorites",
    schemaVersion: FAVORITES_SCHEMA_VERSION
  };
}

export async function importFavoritesData(
  area: StorageAreaLike,
  value: unknown
): Promise<FavoritesDatabase> {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("备份文件不是有效的 JSON");
    }
  }
  if (!isRecord(parsed) || parsed.format !== "danmaku-echo-favorites"
      || !Object.hasOwn(parsed, "database")) {
    throw new Error("不是 bililive-danmaku-plus-one 收藏备份文件");
  }
  const incoming = storedDatabase(parsed.database);
  if (!incoming) throw new Error("收藏备份内容损坏或格式不完整");

  const current = (await storageGet(area)).database;
  incoming.revision = Math.max(current.revision, incoming.revision) + 1;
  incoming.updatedAt = Date.now();
  incoming.writeId = favoriteId();
  await storageWrite(area, {
    [FAVORITES_STORAGE_KEY]: incoming,
    [FAVORITES_BACKUP_STORAGE_KEY]: incoming,
    [FAVORITES_IMPORT_BACKUP_STORAGE_KEY]: current
  });
  const values = await storageValues(area);
  const verified = storedDatabase(values[FAVORITES_STORAGE_KEY]);
  if (!verified || verified.writeId !== incoming.writeId) {
    throw new Error("导入后校验失败，原收藏已保留在本地备份中");
  }
  return verified;
}

function roomStats(item: FavoriteDanmaku, roomKey: string): FavoriteRoomStats {
  return item.roomStats[roomKey] || { lastSentAt: 0, pinned: false, sendCount: 0 };
}

function nextCustomOrder(items: FavoriteDanmaku[], roomKey: string): number {
  const orders = items.flatMap((item) => {
    const stats = item.roomStats[roomKey];
    if (!stats) return [];
    const order = Number(stats.customOrder);
    return Number.isFinite(order) ? [order] : [];
  });
  return orders.length ? Math.max(...orders) + 1 : Date.now();
}

export function createFavoritesRepository(area: StorageAreaLike) {
  let database = emptyDatabase();
  let recoveredFromBackup = false;
  let operationQueue: Promise<void> = Promise.resolve();
  const listeners = new Set<(database: FavoritesDatabase) => void>();

  function notify(): void {
    listeners.forEach((listener) => listener(database));
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function loadLatest(): Promise<void> {
    const loaded = await storageGet(area);
    database = loaded.database;
    recoveredFromBackup = loaded.recoveredFromBackup;
  }

  async function persist(): Promise<void> {
    database.updatedAt = Date.now();
    database.revision += 1;
    database.writeId = favoriteId();
    await storageSet(area, database);
    notify();
  }

  function mutate<T>(operation: () => { changed: boolean; result: T }): Promise<T> {
    return enqueue(async () => {
      await loadLatest();
      const mutation = operation();
      if (mutation.changed || recoveredFromBackup) {
        await persist();
        recoveredFromBackup = false;
      } else {
        notify();
      }
      return mutation.result;
    });
  }

  return {
    async addToRoom(id: string, room: RoomContext): Promise<void> {
      return mutate(() => {
        const item = database.items.find((entry) => entry.id === id);
        if (!item) return { changed: false, result: undefined };
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
          addedToRoomAt: now,
          customOrder: item.roomStats[room.roomKey]?.customOrder
            ?? nextCustomOrder(database.items, room.roomKey)
        };
        item.updatedAt = now;
        return { changed: true, result: undefined };
      });
    },
    async favorite(
      textValue: unknown,
      room: RoomContext,
      payloadValue?: unknown
    ): Promise<{ added: boolean; item: FavoriteDanmaku }> {
      const payload = normalizeFavoritePayload(payloadValue, textValue);
      const text = favoriteDisplayText(payload, textValue);
      if (!text) throw new Error("收藏内容为空");
      const key = favoriteKey(text, payload);
      return mutate(() => {
        const now = Date.now();
        let item = database.items.find((entry) => entry.normalizedText === key);
        if (!item && payload.assets.length && !payload.plainText) {
          const signature = richAssetSignature(payload);
          item = database.items.find((entry) =>
            !entry.payload.plainText
            && GENERIC_RICH_LABEL.test(entry.text)
            && richAssetSignature(entry.payload) === signature);
          if (item) {
            item.normalizedText = key;
            item.payload = payload;
            item.text = text;
          }
        }
        const added = !item;
        if (!item) {
          item = {
            createdAt: now,
            globalPinned: false,
            id: favoriteId(),
            lastSentAt: 0,
            normalizedText: key,
            origins: [],
            payload,
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
          addedToRoomAt: item.roomStats[room.roomKey]?.addedToRoomAt || now,
          customOrder: item.roomStats[room.roomKey]?.customOrder
            ?? nextCustomOrder(database.items, room.roomKey)
        };
        item.updatedAt = now;
        return { changed: true, result: { added, item } };
      });
    },
    get database(): FavoritesDatabase {
      return database;
    },
    get recoveredFromBackup(): boolean {
      return recoveredFromBackup;
    },
    async load(): Promise<FavoritesDatabase> {
      return enqueue(async () => {
        await loadLatest();
        if (recoveredFromBackup) {
          await persist();
        } else {
          notify();
        }
        return database;
      });
    },
    async recordSent(id: string, room: RoomContext): Promise<void> {
      return mutate(() => {
        const item = database.items.find((entry) => entry.id === id);
        if (!item) return { changed: false, result: undefined };
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
        return { changed: true, result: undefined };
      });
    },
    async reorderRoom(roomKey: string, orderedIds: string[]): Promise<void> {
      return mutate(() => {
        const uniqueIds = Array.from(new Set(orderedIds));
        const byId = new Map(database.items.map((item) => [item.id, item]));
        let changed = false;
        uniqueIds.forEach((id, index) => {
          const item = byId.get(id);
          if (!item || (!item.roomStats[roomKey]
              && !item.origins.some((origin) => origin.roomKey === roomKey))) return;
          const stats = item.roomStats[roomKey] || {
            lastSentAt: 0,
            pinned: false,
            sendCount: 0,
          };
          if (stats.customOrder !== index + 1) changed = true;
          stats.customOrder = index + 1;
          item.roomStats[roomKey] = stats;
          item.updatedAt = Date.now();
        });
        return { changed, result: undefined };
      });
    },
    async remove(id: string): Promise<void> {
      return mutate(() => {
        const next = database.items.filter((entry) => entry.id !== id);
        const changed = next.length !== database.items.length;
        database.items = next;
        return { changed, result: undefined };
      });
    },
    subscribe(listener: (database: FavoritesDatabase) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
