import { afterEach, describe, expect, it, vi } from 'vitest'

import { BILIBILI_EMOTICON_MESSAGE, handleBilibiliEmoticonsInPage } from '../page-emoticons'

const originalLocation = globalThis.location
const originalFetch = globalThis.fetch

afterEach(() => {
  Object.defineProperty(globalThis, 'location', { configurable: true, value: originalLocation })
  globalThis.fetch = originalFetch
  document.cookie = 'bili_jct=; Max-Age=0; path=/'
})

function jsonResponse(value: unknown): Response {
  return { json: async () => value, ok: true, status: 200 } as Response
}

function mockLiveRoom(): void {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { hostname: 'live.bilibili.com', pathname: '/8818471' },
  })
}

describe('Bilibili page emoticon API', () => {
  it('loads every permitted emoticon without opening the native panel', async () => {
    mockLiveRoom()
    globalThis.fetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { room_id: 8818471 } }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            data: [
              {
                emoticons: [
                  {
                    bulge_display: 1,
                    emoji: '开心',
                    emoticon_unique: 'room_8818471_happy',
                    is_dynamic: 1,
                    perm: 1,
                    url: 'http://i0.hdslb.com/bfs/live/happy.png',
                  },
                  {
                    emoji: '未解锁',
                    emoticon_unique: 'room_8818471_locked',
                    perm: 0,
                    url: 'https://i0.hdslb.com/bfs/live/locked.png',
                  },
                ],
                pkg_id: 42,
                pkg_name: '房间专属',
              },
            ],
          },
        }),
      )

    const result = await handleBilibiliEmoticonsInPage({
      operation: 'catalog',
      type: BILIBILI_EMOTICON_MESSAGE,
    })

    expect(result.emoticons).toEqual([
      {
        bulgeDisplay: 1,
        emoji: '开心',
        emoticonUnique: 'room_8818471_happy',
        isDynamic: 1,
        packageId: 42,
        packageName: '房间专属',
        url: 'https://i0.hdslb.com/bfs/live/happy.png',
      },
    ])
  })

  it('sends a cached large emoticon directly through msg/send', async () => {
    mockLiveRoom()
    document.cookie = 'bili_jct=test-csrf; path=/'
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { room_id: 8818471 } }))
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: '0' }))
    globalThis.fetch = fetchMock

    const emoticon = {
      bulgeDisplay: 1,
      emoji: '开心',
      emoticonUnique: 'room_8818471_happy',
      isDynamic: 1,
      packageId: 42,
      packageName: '房间专属',
      url: 'https://i0.hdslb.com/bfs/live/happy.png',
    }
    const result = await handleBilibiliEmoticonsInPage({
      emoticon,
      operation: 'send',
      type: BILIBILI_EMOTICON_MESSAGE,
    })

    expect(result.ok).toBe(true)
    const call = fetchMock.mock.calls[1]
    expect(call).toBeDefined()
    const options = call?.[1]
    if (!options) {
      throw new Error('missing msg/send request')
    }
    const body = options.body as URLSearchParams
    expect(body.get('dm_type')).toBe('1')
    expect(body.get('msg')).toBe('room_8818471_happy')
    expect(JSON.parse(String(body.get('emoticon_options')))).toEqual({
      bulge_display: 1,
      emoticon_unique: 'room_8818471_happy',
      is_dynamic: 1,
      url: 'https://i0.hdslb.com/bfs/live/happy.png',
    })
  })
})
