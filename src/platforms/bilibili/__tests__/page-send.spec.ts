import { describe, expect, it } from 'vitest'

import {
  BILIBILI_SEND_MESSAGE,
  isBilibiliSendRequest,
  sendBilibiliDanmakuInPage,
} from '../page-send'

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
})
