import {
  FAVORITES_DIRECTORY_SYNC_MESSAGE,
  syncFavoritesToDirectory,
} from '../features/favorites/file-storage'
import { createFavoritesRepository } from '../features/favorites/repository'
import {
  FAVORITE_WRITE_MESSAGE,
  type FavoriteWriteRequest,
  type FavoriteWriteResponse,
} from '../features/favorites/types'
import {
  isBilibiliSendRequest,
  sendBilibiliDanmakuInPage,
  type BilibiliSendResponse,
} from '../platforms/bilibili/page-send'

const favoritesRepository = createFavoritesRepository(chrome.storage.local)
let favoriteWriteQueue: Promise<void> = Promise.resolve()

function isBilibiliLiveUrl(value: unknown): boolean {
  try {
    return new URL(String(value || '')).hostname === 'live.bilibili.com'
  } catch {
    return false
  }
}

function isFavoriteWriteRequest(value: unknown): value is FavoriteWriteRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<FavoriteWriteRequest>
  const operation = request.operation || 'favorite'
  const room = request.room
  return request.type === FAVORITE_WRITE_MESSAGE &&
    (operation === 'favorite' || operation === 'add-to-room' ||
      operation === 'record-sent' || operation === 'remove' || operation === 'reorder-room') &&
    (operation === 'favorite'
      ? typeof request.text === 'string' && Array.from(request.text).length > 0 &&
        Array.from(request.text).length <= 1000
      : operation === 'reorder-room'
        ? Array.isArray(request.ids) && request.ids.length <= 200 &&
          request.ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 200) &&
          typeof request.targetRoomKey === 'string' &&
          /^bilibili:[^:]{1,300}$/.test(request.targetRoomKey)
        : typeof request.id === 'string' && request.id.length > 0 && request.id.length <= 200) &&
    Boolean(room && typeof room === 'object' && room.platform === 'bilibili' &&
      typeof room.roomId === 'string' && room.roomId.length > 0 && room.roomId.length <= 300 &&
      typeof room.roomKey === 'string' && room.roomKey.length <= 320 &&
      typeof room.roomName === 'string' && room.roomName.length > 0 && room.roomName.length <= 500 &&
      typeof room.url === 'string' && room.url.length > 0 && room.url.length <= 4096 &&
      room.roomKey === `bilibili:${room.roomId}`)
}

async function writeFavorite(request: FavoriteWriteRequest): Promise<{ added: boolean }> {
  const operation = favoriteWriteQueue.then(async () => {
    const kind = request.operation || 'favorite'
    let added = false
    if (kind === 'add-to-room') {
      await favoritesRepository.addToRoom(request.id || '', request.room)
    } else if (kind === 'record-sent') {
      await favoritesRepository.recordSent(request.id || '', request.room)
    } else if (kind === 'remove') {
      await favoritesRepository.remove(request.id || '')
    } else if (kind === 'reorder-room') {
      await favoritesRepository.reorderRoom(request.targetRoomKey || request.room.roomKey, request.ids || [])
    } else {
      added = (await favoritesRepository.favorite(
        request.text || "", request.room, request.payload,
      )).added
    }
    try {
      await syncFavoritesToDirectory(favoritesRepository.database)
    } catch (error) {
      console.warn('[bililive-danmaku-plus-one] favorites directory sync failed', error)
    }
    return { added }
  })
  favoriteWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function syncFavoritesDirectory(): Promise<boolean> {
  await favoritesRepository.load()
  return syncFavoritesToDirectory(favoritesRepository.database)
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const senderUrl = sender.tab?.url || sender.url

  if (isFavoriteWriteRequest(message)) {
    if (!isBilibiliLiveUrl(senderUrl)) {
      sendResponse({ ok: false, error: 'invalid-favorite-sender' } satisfies FavoriteWriteResponse)
      return false
    }
    writeFavorite(message).then(({ added }) => {
      sendResponse({ ok: true, added } satisfies FavoriteWriteResponse)
    }).catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: String(error instanceof Error ? error.message : error),
      } satisfies FavoriteWriteResponse)
    })
    return true
  }

  if (isBilibiliSendRequest(message)) {
    const tabId = sender.tab?.id
    if (!isBilibiliLiveUrl(senderUrl) || typeof tabId !== 'number') {
      sendResponse({ ok: false, error: 'invalid-bilibili-sender' } satisfies BilibiliSendResponse)
      return false
    }
    chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      world: 'MAIN',
      func: sendBilibiliDanmakuInPage,
      args: [message.message],
    }).then(([result]) => {
      sendResponse(result?.result || { ok: false, error: 'empty-page-response' })
    }).catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: String(error instanceof Error ? error.message : error),
      } satisfies BilibiliSendResponse)
    })
    return true
  }

  if ((message as { type?: unknown } | null)?.type === FAVORITES_DIRECTORY_SYNC_MESSAGE &&
      sender.id === chrome.runtime.id) {
    syncFavoritesDirectory().then((synced) => {
      sendResponse({ ok: true, synced })
    }).catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: String(error instanceof Error ? error.message : error),
      })
    })
    return true
  }

  return false
})
