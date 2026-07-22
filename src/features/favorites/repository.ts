import {
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
    async favorite(
      textValue: unknown,
      room: RoomContext,
      payloadValue?: unknown
    ): Promise<{ added: boolean; item: FavoriteDanmaku }> {
      const payload = normalizeFavoritePayload(payloadValue, textValue);
      const text = favoriteDisplayText(payload, textValue);
      if (!text) throw new Error("收藏内容为空");
      const key = favoriteKey(text, payload);
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
