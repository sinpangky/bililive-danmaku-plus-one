import { describe, expect, it } from 'vitest'

import {
  BILIBILI_EXCLUSIVE_EMOJI_ATTRIBUTES,
  BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX,
  bilibiliNamedEmojiFallbackText,
} from '../emoji-payload'

function asset(token: string, keys: string[] = []) {
  return { keys: [`name:${token.slice(1, -1)}`, ...keys], src: '', token }
}

describe('bilibiliNamedEmojiFallbackText', () => {
  it('treats data-file-id as the room image identity attribute', () => {
    expect(BILIBILI_EXCLUSIVE_EMOJI_ATTRIBUTES).toContain('data-file-id')
  })

  it('repeats a single ordinary named Emoji as its bracket token', () => {
    const cry = asset('[大哭]')

    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [cry],
        parts: [{ asset: cry, type: 'emoji' }],
        text: '[大哭]',
      }),
    ).toBe('[大哭]')
  })

  it('preserves the exact text and repeated Emoji order', () => {
    const firstCry = asset('[大哭]')
    const secondCry = asset('[大哭]')

    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [firstCry, secondCry],
        parts: [
          { text: '加油啊', type: 'text' },
          { asset: firstCry, type: 'emoji' },
          { asset: secondCry, type: 'emoji' },
        ],
        text: '加油啊 [大哭] [大哭]',
      }),
    ).toBe('加油啊[大哭][大哭]')
  })

  it('keeps Emoji located before and after text in their original positions', () => {
    const left = asset('[哇]')
    const right = asset('[大哭]')

    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [left, right],
        parts: [
          { asset: left, type: 'emoji' },
          { text: '打得不错啊', type: 'text' },
          { asset: right, type: 'emoji' },
        ],
      }),
    ).toBe('[哇]打得不错啊[大哭]')
  })

  it('leaves room-exclusive image Emoji on the native panel path', () => {
    const exclusive = asset('[主播开心]', [
      `${BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX}room-happy-42`,
    ])

    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [exclusive],
        parts: [{ asset: exclusive, type: 'emoji' }],
        text: '[主播开心]',
      }),
    ).toBe('')
  })

  it('uses serialized text for an older favorite without ordered parts', () => {
    const firstCry = asset('[大哭]')
    const secondCry = asset('[大哭]')

    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [firstCry, secondCry],
        text: '加油啊 [大哭] [大哭]',
      }),
    ).toBe('加油啊 [大哭] [大哭]')
  })

  it('does not turn an unnamed image into literal text', () => {
    expect(
      bilibiliNamedEmojiFallbackText({
        assets: [{ keys: ['path:/emoji.webp'], src: '/emoji.webp', token: '' }],
        text: '图片表情',
      }),
    ).toBe('')
  })
})
