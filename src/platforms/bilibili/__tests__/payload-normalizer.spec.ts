import { describe, expect, it } from 'vitest'

import {
  authoritativeBilibiliText,
  bilibiliPayloadTextFromParts,
  isBilibiliMedalAccessibilityLabel,
  normalizeBilibiliPayloadParts,
  textPayloadFromAuthoritativeBilibiliText,
} from '../payload-normalizer'

describe('Bilibili payload normalization', () => {
  it('recognizes Honor-level medal accessibility text as metadata', () => {
    expect(isBilibiliMedalAccessibilityLabel("这是 TA 的荣耀等级勋章 (●'◡'●)ﾉ♥")).toBe(true)
    expect(isBilibiliMedalAccessibilityLabel('打call')).toBe(false)
  })

  it('removes the side-chat label duplicated immediately after an inline Emoji image', () => {
    const emoji = { token: '[委屈]' }
    const parts = normalizeBilibiliPayloadParts([
      { text: '222', type: 'text' },
      { asset: emoji, type: 'emoji' },
      { text: '[委屈]', type: 'text' },
    ])

    expect(parts).toEqual([
      { text: '222', type: 'text' },
      { asset: emoji, type: 'emoji' },
    ])
    expect(bilibiliPayloadTextFromParts(parts)).toBe('222[委屈]')
  })

  it('removes an unbracketed accessible label for a large Emoji', () => {
    const emoji = { token: '[开心]' }
    expect(
      normalizeBilibiliPayloadParts([
        { asset: emoji, type: 'emoji' },
        { text: '开心', type: 'text' },
      ]),
    ).toEqual([{ asset: emoji, type: 'emoji' }])
  })

  it('preserves two identical Emoji images sent intentionally', () => {
    const first = { token: '[委屈]' }
    const second = { token: '[委屈]' }
    const parts = normalizeBilibiliPayloadParts([
      { text: '222', type: 'text' },
      { asset: first, type: 'emoji' },
      { asset: second, type: 'emoji' },
      { text: '[委屈]', type: 'text' },
    ])

    expect(parts).toEqual([
      { text: '222', type: 'text' },
      { asset: first, type: 'emoji' },
      { asset: second, type: 'emoji' },
    ])
    expect(bilibiliPayloadTextFromParts(parts)).toBe('222[委屈][委屈]')
  })

  it('does not remove unrelated text following an Emoji', () => {
    const emoji = { token: '[委屈]' }
    expect(
      normalizeBilibiliPayloadParts([
        { asset: emoji, type: 'emoji' },
        { text: '继续加油', type: 'text' },
      ]),
    ).toEqual([
      { asset: emoji, type: 'emoji' },
      { text: '继续加油', type: 'text' },
    ])
  })
})

describe('Bilibili authoritative message text', () => {
  it('keeps the exact number and order of inline Emoji tokens', () => {
    const text = '哭哭惹[大哭][大哭]继续[委屈]'
    expect(authoritativeBilibiliText(text)).toBe(text)
    expect(textPayloadFromAuthoritativeBilibiliText(text)).toEqual({
      assets: [],
      parts: [{ text, type: 'text' }],
      plainText: text,
      text,
    })
  })

  it('does not invent an Emoji token from an accessible DOM label', () => {
    expect(textPayloadFromAuthoritativeBilibiliText('文字[委屈][委屈]')?.text).toBe(
      '文字[委屈][委屈]',
    )
  })
})
