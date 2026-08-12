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
import {
  handleBilibiliEmoticonsInPage,
  isBilibiliEmoticonRequest,
  type BilibiliEmoticonResponse,
} from '../platforms/bilibili/page-emoticons'
import {
  isSendLogRequest,
  SEND_LOG_LIMIT,
  SEND_LOG_STORAGE_KEY,
  type SendLogEntryV1,
  type SendLogResponse,
} from '../features/send-log/types'

const favoritesRepository = createFavoritesRepository(chrome.storage.local)
let favoriteWriteQueue: Promise<void> = Promise.resolve()
let sendLogWriteQueue: Promise<void> = Promise.resolve()
const bilibiliEmoticonCatalogs = new Map<
  number,
  { pageRoomId: string; response: BilibiliEmoticonResponse }
>()
const bilibiliEmoticonCatalogBuilds = new Map<number, Promise<BilibiliEmoticonResponse>>()

function localGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (value) => resolve(value?.[key] as T | undefined))
  })
}

function localSet(value: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) =>
    chrome.storage.local.set(value, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    }),
  )
}

function sanitizeLog(entry: SendLogEntryV1): SendLogEntryV1 {
  const text = (value: unknown, limit = 2000) => String(value || '').slice(0, limit)
  return {
    ...entry,
    assets: (entry.assets || []).slice(0, 8).map((asset) => ({
      ...(Number.isFinite(asset.matchScore) ? { matchScore: Number(asset.matchScore) } : {}),
      nativePanel: Boolean(asset.nativePanel),
      ...(asset.resolution ? { resolution: text(asset.resolution, 80) } : {}),
      source: text(asset.source, 500),
      token: text(asset.token, 120),
    })),
    classification: text(entry.classification, 80),
    error: text(entry.error, 500),
    id: text(entry.id, 120),
    normalizedContent: text(entry.normalizedContent),
    parts: (entry.parts || []).slice(0, 40).map((part) => ({
      ...(part.text ? { text: text(part.text, 500) } : {}),
      ...(part.token ? { token: text(part.token, 120) } : {}),
      type: part.type,
    })),
    platform: 'bilibili',
    resultContent: text(entry.resultContent),
    sourceContent: text(entry.sourceContent),
    version: 1,
  }
}

async function appendSendLog(entry: SendLogEntryV1): Promise<void> {
  const operation = sendLogWriteQueue.then(async () => {
    const current = await localGet<SendLogEntryV1[]>(SEND_LOG_STORAGE_KEY)
    const entries = Array.isArray(current) ? current : []
    entries.unshift(sanitizeLog(entry))
    await localSet({ [SEND_LOG_STORAGE_KEY]: entries.slice(0, SEND_LOG_LIMIT) })
  })
  sendLogWriteQueue = operation.then(
    () => undefined,
    () => undefined,
  )
  return operation
}

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
  return (
    request.type === FAVORITE_WRITE_MESSAGE &&
    (operation === 'favorite' ||
      operation === 'add-to-room' ||
      operation === 'record-sent' ||
      operation === 'remove' ||
      operation === 'reorder-room') &&
    (operation === 'favorite'
      ? typeof request.text === 'string' &&
        Array.from(request.text).length > 0 &&
        Array.from(request.text).length <= 1000
      : operation === 'reorder-room'
        ? Array.isArray(request.ids) &&
          request.ids.length <= 200 &&
          request.ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 200) &&
          typeof request.targetRoomKey === 'string' &&
          /^bilibili:[^:]{1,300}$/.test(request.targetRoomKey)
        : typeof request.id === 'string' && request.id.length > 0 && request.id.length <= 200) &&
    Boolean(
      room &&
      typeof room === 'object' &&
      room.platform === 'bilibili' &&
      typeof room.roomId === 'string' &&
      room.roomId.length > 0 &&
      room.roomId.length <= 300 &&
      typeof room.roomKey === 'string' &&
      room.roomKey.length <= 320 &&
      typeof room.roomName === 'string' &&
      room.roomName.length > 0 &&
      room.roomName.length <= 500 &&
      typeof room.url === 'string' &&
      room.url.length > 0 &&
      room.url.length <= 4096 &&
      room.roomKey === `bilibili:${room.roomId}`,
    )
  )
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
      await favoritesRepository.reorderRoom(
        request.targetRoomKey || request.room.roomKey,
        request.ids || [],
      )
    } else {
      added = (
        await favoritesRepository.favorite(request.text || '', request.room, request.payload)
      ).added
    }
    try {
      await syncFavoritesToDirectory(favoritesRepository.database)
    } catch (error) {
      console.warn('[bililive-danmaku-plus-one] favorites directory sync failed', error)
    }
    return { added }
  })
  favoriteWriteQueue = operation.then(
    () => undefined,
    () => undefined,
  )
  return operation
}

async function syncFavoritesDirectory(): Promise<boolean> {
  await favoritesRepository.load()
  return syncFavoritesToDirectory(favoritesRepository.database)
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const senderUrl = sender.tab?.url || sender.url

  if (isSendLogRequest(message)) {
    if (message.operation === 'append') {
      if (!isBilibiliLiveUrl(senderUrl)) {
        sendResponse({ ok: false, error: 'invalid-send-log-sender' } satisfies SendLogResponse)
        return false
      }
      appendSendLog(message.entry)
        .then(() => sendResponse({ ok: true } satisfies SendLogResponse))
        .catch((error: unknown) =>
          sendResponse({ ok: false, error: String(error) } satisfies SendLogResponse),
        )
      return true
    }
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'invalid-send-log-reader' } satisfies SendLogResponse)
      return false
    }
    if (message.operation === 'clear') {
      localSet({ [SEND_LOG_STORAGE_KEY]: [] })
        .then(() => sendResponse({ ok: true, entries: [] } satisfies SendLogResponse))
        .catch((error: unknown) =>
          sendResponse({ ok: false, error: String(error) } satisfies SendLogResponse),
        )
      return true
    }
    localGet<SendLogEntryV1[]>(SEND_LOG_STORAGE_KEY)
      .then((entries) => {
        sendResponse({
          ok: true,
          entries: Array.isArray(entries) ? entries : [],
        } satisfies SendLogResponse)
      })
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: String(error) } satisfies SendLogResponse),
      )
    return true
  }

  if (isFavoriteWriteRequest(message)) {
    if (!isBilibiliLiveUrl(senderUrl)) {
      sendResponse({ ok: false, error: 'invalid-favorite-sender' } satisfies FavoriteWriteResponse)
      return false
    }
    writeFavorite(message)
      .then(({ added }) => {
        sendResponse({ ok: true, added } satisfies FavoriteWriteResponse)
      })
      .catch((error: unknown) => {
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
    chrome.scripting
      .executeScript({
        target: { tabId, frameIds: [0] },
        world: 'MAIN',
        func: sendBilibiliDanmakuInPage,
        args: [message.message],
      })
      .then(([result]) => {
        sendResponse(result?.result || { ok: false, error: 'empty-page-response' })
      })
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: String(error instanceof Error ? error.message : error),
        } satisfies BilibiliSendResponse)
      })
    return true
  }

  if (isBilibiliEmoticonRequest(message)) {
    const tabId = sender.tab?.id
    if (!isBilibiliLiveUrl(senderUrl) || typeof tabId !== 'number') {
      sendResponse({
        ok: false,
        error: 'invalid-bilibili-sender',
      } satisfies BilibiliEmoticonResponse)
      return false
    }
    const execute = () =>
      chrome.scripting
        .executeScript({
          target: { tabId, frameIds: [0] },
          world: 'MAIN',
          func: handleBilibiliEmoticonsInPage,
          args: [message],
        })
        .then(
          ([result]) =>
            (result?.result || {
              ok: false,
              error: 'empty-page-response',
            }) as BilibiliEmoticonResponse,
        )
    let operation: Promise<BilibiliEmoticonResponse>
    if (message.operation === 'catalog') {
      const pageRoomId = /^\/(\d+)/.exec(new URL(String(senderUrl)).pathname)?.[1] || ''
      const cached = bilibiliEmoticonCatalogs.get(tabId)
      if (cached && cached.pageRoomId === pageRoomId) {
        operation = Promise.resolve(cached.response)
      } else {
        operation = bilibiliEmoticonCatalogBuilds.get(tabId) || execute()
        bilibiliEmoticonCatalogBuilds.set(tabId, operation)
        operation = operation.then((response) => {
          if (response.ok && response.roomId) {
            bilibiliEmoticonCatalogs.set(tabId, { pageRoomId, response })
          }
          return response
        })
      }
    } else {
      operation = execute()
    }
    operation
      .then((response) => sendResponse(response))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: String(error instanceof Error ? error.message : error),
        } satisfies BilibiliEmoticonResponse)
      })
      .finally(() => {
        if (message.operation === 'catalog') bilibiliEmoticonCatalogBuilds.delete(tabId)
      })
    return true
  }

  if (
    (message as { type?: unknown } | null)?.type === FAVORITES_DIRECTORY_SYNC_MESSAGE &&
    sender.id === chrome.runtime.id
  ) {
    syncFavoritesDirectory()
      .then((synced) => {
        sendResponse({ ok: true, synced })
      })
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: String(error instanceof Error ? error.message : error),
        })
      })
    return true
  }

  return false
})
