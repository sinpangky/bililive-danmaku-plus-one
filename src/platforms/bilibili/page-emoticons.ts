export const BILIBILI_EMOTICON_MESSAGE = 'danmaku-echo.bilibili-emoticons'

export interface BilibiliPageEmoticon {
  bulgeDisplay: number
  emoji: string
  emoticonUnique: string
  isDynamic: number
  packageId: number
  packageName: string
  url: string
}

export type BilibiliEmoticonRequest =
  | { operation: 'catalog'; type: typeof BILIBILI_EMOTICON_MESSAGE }
  | {
      emoticon: BilibiliPageEmoticon
      operation: 'send'
      type: typeof BILIBILI_EMOTICON_MESSAGE
    }

export interface BilibiliEmoticonResponse {
  emoticons?: BilibiliPageEmoticon[]
  error?: string
  ok: boolean
  roomId?: string
}

export function isBilibiliEmoticonRequest(value: unknown): value is BilibiliEmoticonRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<BilibiliEmoticonRequest>
  if (request.type !== BILIBILI_EMOTICON_MESSAGE) return false
  if (request.operation === 'catalog') return true
  const emoticon = (request as Partial<Extract<BilibiliEmoticonRequest, { operation: 'send' }>>)
    .emoticon
  return (
    request.operation === 'send' &&
    Boolean(
      emoticon &&
      typeof emoticon === 'object' &&
      typeof emoticon.emoticonUnique === 'string' &&
      emoticon.emoticonUnique.length > 0 &&
      emoticon.emoticonUnique.length <= 300 &&
      typeof emoticon.url === 'string' &&
      /^https?:\/\//.test(emoticon.url) &&
      emoticon.url.length <= 4096,
    )
  )
}

// Serialized by chrome.scripting and executed in Bilibili's MAIN world.
export async function handleBilibiliEmoticonsInPage(
  request: BilibiliEmoticonRequest,
): Promise<BilibiliEmoticonResponse> {
  try {
    if (location.hostname !== 'live.bilibili.com') return { ok: false, error: 'invalid-page' }
    const pathRoomId = /^\/(\d+)/.exec(location.pathname)?.[1] || ''
    if (!pathRoomId) return { ok: false, error: 'room-not-found' }
    const roomResponse = await fetch(
      `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(pathRoomId)}`,
      { credentials: 'include' },
    )
    const roomResult = await roomResponse.json()
    const roomId = String(roomResult?.data?.room_id || pathRoomId)
    if (!roomResponse.ok || !roomId) return { ok: false, error: 'room-not-found' }

    if (request.operation === 'catalog') {
      const response = await fetch(
        `https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons?platform=pc&room_id=${encodeURIComponent(roomId)}`,
        { credentials: 'include' },
      )
      const result = await response.json()
      if (!response.ok || Number(result?.code) !== 0) {
        return { ok: false, error: String(result?.message || `http-${response.status}`) }
      }
      const packages = Array.isArray(result?.data?.data) ? result.data.data : []
      const emoticons: BilibiliPageEmoticon[] = []
      packages.slice(0, 100).forEach((pkg: Record<string, unknown>) => {
        const packageEmoticons = Array.isArray(pkg.emoticons) ? pkg.emoticons : []
        packageEmoticons.slice(0, 500).forEach((item: Record<string, unknown>) => {
          const unique = String(item.emoticon_unique || '')
          const url = String(item.url || '').replace(/^http:/, 'https:')
          if (!unique || !/^https?:\/\//.test(url) || Number(item.perm) !== 1) return
          emoticons.push({
            bulgeDisplay: Number(item.bulge_display) || 0,
            emoji: String(item.emoji || '').slice(0, 120),
            emoticonUnique: unique.slice(0, 300),
            isDynamic: Number(item.is_dynamic) || 0,
            packageId: Number(pkg.pkg_id) || 0,
            packageName: String(pkg.pkg_name || '').slice(0, 200),
            url: url.slice(0, 4096),
          })
        })
      })
      return { ok: true, roomId, emoticons: emoticons.slice(0, 3000) }
    }

    const cookieValue = (name: string): string => {
      const prefix = `${name}=`
      const entry = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
      return entry ? decodeURIComponent(entry.slice(prefix.length)) : ''
    }
    const csrf = cookieValue('bili_jct')
    if (!csrf) return { ok: false, error: 'not-signed-in' }
    const emoticon = request.emoticon
    const body = new URLSearchParams({
      bubble: '0',
      color: '16777215',
      csrf,
      csrf_token: csrf,
      dm_type: '1',
      emoticon_options: JSON.stringify({
        bulge_display: emoticon.bulgeDisplay,
        emoticon_unique: emoticon.emoticonUnique,
        is_dynamic: emoticon.isDynamic,
        url: emoticon.url,
      }),
      fontsize: '25',
      mode: '1',
      msg: emoticon.emoticonUnique,
      rnd: String(Math.floor(Date.now() / 1000)),
      roomid: roomId,
    })
    const response = await fetch('https://api.live.bilibili.com/msg/send', {
      body,
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      method: 'POST',
    })
    const result = await response.json()
    if (response.ok && Number(result?.code) === 0) return { ok: true, roomId }
    return { ok: false, error: String(result?.message || result?.msg || `http-${response.status}`) }
  } catch (error) {
    return { ok: false, error: String(error instanceof Error ? error.message : error) }
  }
}
