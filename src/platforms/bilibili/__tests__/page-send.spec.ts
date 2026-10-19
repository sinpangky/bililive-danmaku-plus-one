import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BILIBILI_SEND_MESSAGE,
  isBilibiliSendRequest,
  sendBilibiliDanmakuInPage,
} from '../page-send'

function jsonResponse(value: unknown, status = 200): Response {
  return { json: async () => value, ok: status >= 200 && status < 300, status } as Response
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('location', new URL('https://live.bilibili.com/123'))
  vi.spyOn(document, 'cookie', 'get').mockReturnValue('bili_jct=test-csrf; other=value')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Bilibili page-context sending', () => {
  it('accepts only bounded non-empty send requests', () => {
    expect(isBilibiliSendRequest({ type: BILIBILI_SEND_MESSAGE, message: '前方高能' })).toBe(true)
    expect(isBilibiliSendRequest({ type: BILIBILI_SEND_MESSAGE, message: '   ' })).toBe(false)
    expect(isBilibiliSendRequest({ type: BILIBILI_SEND_MESSAGE, message: '弹'.repeat(1001) })).toBe(false)
    expect(isBilibiliSendRequest({ type: 'another-message', message: '前方高能' })).toBe(false)
  })

  it('keeps the injected function self-contained and on official endpoints', () => {
    const source = sendBilibiliDanmakuInPage.toString()
    expect(source).toContain('api.live.bilibili.com/room/v1/Room/room_init')
    expect(source).toContain('api.live.bilibili.com/msg/send')
    expect(source).toMatch(/cookieValue\(["']bili_jct["']\)/)
    expect(source).not.toContain('chrome.')
  })

  it('sends exact text and inline Emoji with login cookies and the canonical room id', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { room_id: 8818471 } }))
      .mockResolvedValueOnce(jsonResponse({ code: 0 }))

    expect(await sendBilibiliDanmakuInPage('前方高能 😀 [妙]')).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenNthCalledWith(1,
      'https://api.live.bilibili.com/room/v1/Room/room_init?id=123',
      { credentials: 'include' },
    )
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'https://api.live.bilibili.com/msg/send',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    const body = fetchMock.mock.calls[1]?.[1]?.body as URLSearchParams
    expect(body.get('msg')).toBe('前方高能 😀 [妙]')
    expect(body.get('roomid')).toBe('8818471')
    expect(body.get('csrf')).toBe('test-csrf')
    expect(body.get('csrf_token')).toBe('test-csrf')
  })

  it('does not make a send request without a logged-in CSRF cookie', async () => {
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('other=value')
    expect(await sendBilibiliDanmakuInPage('测试')).toEqual({
      ok: false, error: 'not-signed-in',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the server rejection reason instead of reporting a successful send', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { room_id: 8818471 } }))
      .mockResolvedValueOnce(jsonResponse({ code: -101, message: '请先登录' }))
    expect(await sendBilibiliDanmakuInPage('测试')).toEqual({ ok: false, error: '请先登录' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry an HTTP failure or a network error', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { room_id: 8818471 } }))
      .mockResolvedValueOnce(jsonResponse({}, 429))
    expect(await sendBilibiliDanmakuInPage('测试')).toEqual({ ok: false, error: 'http-429' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mockReset().mockRejectedValueOnce(new Error('Failed to fetch'))
    expect(await sendBilibiliDanmakuInPage('测试')).toEqual({ ok: false, error: 'Failed to fetch' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
