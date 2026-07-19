import type { PlatformId } from "../../core/types";

export const FAVORITES_SCHEMA_VERSION = 1;
export const FAVORITES_STORAGE_KEY = "danmakuEchoFavoritesV1";

export interface RoomContext {
  platform: PlatformId;
  roomId: string;
  roomKey: string;
  roomName: string;
  url: string;
}

export interface FavoriteOrigin {
  collectedAt: number;
  platform: PlatformId;
  roomId: string;
  roomKey: string;
  roomName: string;
}

export interface FavoriteRoomStats {
  addedToRoomAt?: number;
  lastSentAt: number;
  pinned: boolean;
  sendCount: number;
}

export interface FavoriteDanmaku {
  createdAt: number;
  globalPinned: boolean;
  id: string;
  lastSentAt: number;
  normalizedText: string;
  origins: FavoriteOrigin[];
  roomStats: Record<string, FavoriteRoomStats>;
  text: string;
  totalSendCount: number;
  updatedAt: number;
}

export interface FavoritesDatabase {
  items: FavoriteDanmaku[];
  schemaVersion: 1;
  updatedAt: number;
}

export type FavoriteView = "all" | "current" | "other";
export type FavoriteSort = "send-count" | "time-asc" | "time-desc";

export interface FavoriteDisplayItem extends FavoriteDanmaku {
  belongsToCurrentRoom: boolean;
  sourceLabel: string;
  sortTimestamp: number;
}

export interface FavoriteRoomGroup {
  isCurrentRoom: boolean;
  items: FavoriteDisplayItem[];
  latestCollectedAt: number;
  platform: PlatformId;
  roomId: string;
  roomKey: string;
  roomName: string;
  totalSendCount: number;
}
