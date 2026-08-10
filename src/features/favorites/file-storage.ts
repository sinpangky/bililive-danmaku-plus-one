import type { FavoriteDanmaku, FavoritesDatabase } from './types'

export const FAVORITES_DIRECTORY_SYNC_MESSAGE = 'danmaku-echo.favorites-directory-sync'
const DATABASE_NAME = 'danmakuEchoFavoritesFileStorage'
const DATABASE_VERSION = 1
const STORE_NAME = 'settings'
const DIRECTORY_HANDLE_KEY = 'directoryHandle'

export type WritableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('无法打开收藏目录配置'))
  })
}

export async function saveFavoritesDirectoryHandle(handle: WritableDirectoryHandle): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(handle, DIRECTORY_HANDLE_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('无法保存收藏目录权限'))
      transaction.onabort = () => reject(transaction.error || new Error('收藏目录权限保存已取消'))
    })
  } finally {
    database.close()
  }
}

export async function loadFavoritesDirectoryHandle(): Promise<WritableDirectoryHandle | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(DIRECTORY_HANDLE_KEY)
      request.onsuccess = () => resolve((request.result as WritableDirectoryHandle | undefined) || null)
      request.onerror = () => reject(request.error || new Error('无法读取收藏目录权限'))
    })
  } finally {
    database.close()
  }
}

function safeFilePart(value: string): string {
  // oxlint-disable-next-line no-control-regex -- Windows-invalid control characters cannot be file-name content.
  return value.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/[. ]+$/g, '').slice(0, 100) || 'unknown'
}

async function writeJson(directory: FileSystemDirectoryHandle, name: string, value: unknown): Promise<void> {
  const file = await directory.getFileHandle(name, { create: true })
  const writer = await file.createWritable()
  try {
    await writer.write(`${JSON.stringify(value, null, 2)}\n`)
  } finally {
    await writer.close()
  }
}

export async function syncFavoritesToDirectory(database: FavoritesDatabase): Promise<boolean> {
  const root = await loadFavoritesDirectoryHandle()
  if (!root || await root.queryPermission({ mode: 'readwrite' }) !== 'granted') return false

  const output = await root.getDirectoryHandle('favorites', { create: true })
  const rooms = new Map<string, {
    file: string
    items: FavoriteDanmaku[]
    roomId: string
    roomKey: string
    roomName: string
  }>()
  for (const item of database.items) {
    for (const origin of item.origins.filter((entry) => entry.platform === 'bilibili')) {
      const file = `bilibili-${safeFilePart(origin.roomId)}.json`
      const room = rooms.get(origin.roomKey) || {
        file,
        items: [],
        roomId: origin.roomId,
        roomKey: origin.roomKey,
        roomName: origin.roomName,
      }
      if (!room.items.some((entry) => entry.id === item.id)) room.items.push(item)
      rooms.set(origin.roomKey, room)
    }
  }

  const exportedAt = Date.now()
  for (const room of rooms.values()) {
    await writeJson(output, room.file, {
      exportedAt,
      format: 'danmaku-echo-bilibili-room-favorites',
      items: room.items,
      room: { id: room.roomId, key: room.roomKey, name: room.roomName },
      schemaVersion: 1,
    })
  }
  await writeJson(output, 'all-favorites.json', {
    database,
    exportedAt,
    format: 'danmaku-echo-favorites',
    schemaVersion: 2,
  })
  await writeJson(output, 'index.json', {
    exportedAt,
    format: 'danmaku-echo-bilibili-room-index',
    rooms: Array.from(rooms.values()).map((room) => ({
      count: room.items.length,
      file: room.file,
      roomId: room.roomId,
      roomKey: room.roomKey,
      roomName: room.roomName,
    })),
    schemaVersion: 1,
  })
  return true
}
