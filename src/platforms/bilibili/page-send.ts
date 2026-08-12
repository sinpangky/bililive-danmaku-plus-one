export const BILIBILI_SEND_MESSAGE = 'danmaku-echo.bilibili-send'

export interface BilibiliSendRequest {
  message: string
  type: typeof BILIBILI_SEND_MESSAGE
}

export interface BilibiliSendResponse {
  error?: string
  ok: boolean
}

export function isBilibiliSendRequest(value: unknown): value is BilibiliSendRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<BilibiliSendRequest>
  return request.type === BILIBILI_SEND_MESSAGE &&
    typeof request.message === 'string' &&
    Array.from(request.message.trim()).length > 0 &&
    Array.from(request.message).length <= 1000
}

// This function is serialized by chrome.scripting and runs in Bilibili's MAIN
// world. Keep it self-contained: imported values are unavailable there.
export async function sendBilibiliDanmakuInPage(rawMessage: string): Promise<BilibiliSendResponse> {
  try {
    if (location.hostname !== 'live.bilibili.com') {
      return { ok: false, error: 'invalid-page' }
    }
    const message = String(rawMessage || '')
    if (!message.trim() || Array.from(message).length > 1000) {
      return { ok: false, error: 'invalid-message' }
    }

    const cookieValue = (name: string): string => {
      const prefix = `${name}=`
      const entry = document.cookie.split(';').map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
      return entry ? decodeURIComponent(entry.slice(prefix.length)) : ''
    }
    const csrf = cookieValue('bili_jct')
    if (!csrf) return { ok: false, error: 'not-signed-in' }

    const pathRoomId = /^\/(\d+)/.exec(location.pathname)?.[1] || ''
    if (!pathRoomId) return { ok: false, error: 'room-not-found' }

    const roomResponse = await fetch(
      `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(pathRoomId)}`,
      { credentials: 'include' },
    )
    const roomResult = await roomResponse.json()
    const roomId = String(roomResult?.data?.room_id || pathRoomId)
    if (!roomResponse.ok || !roomId) return { ok: false, error: 'room-not-found' }

    const body = new URLSearchParams({
      bubble: '0',
      msg: message,
      color: '16777215',
      mode: '1',
      fontsize: '25',
      rnd: String(Math.floor(Date.now() / 1000)),
      roomid: roomId,
      csrf,
      csrf_token: csrf,
      jumpfrom: '0',
      reply_attr: '0',
      reply_mid: '0',
      replay_dmid: '0',
      room_type: '0',
      statistics: JSON.stringify({ appId: 100, platform: 5 }),
    })
    const sendResponse = await fetch('https://api.live.bilibili.com/msg/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    })
    const result = await sendResponse.json()
    if (sendResponse.ok && Number(result?.code) === 0) return { ok: true }
    return { ok: false, error: String(result?.message || result?.msg || `http-${sendResponse.status}`) }
  } catch (error) {
    return { ok: false, error: String(error instanceof Error ? error.message : error) }
  }
}
