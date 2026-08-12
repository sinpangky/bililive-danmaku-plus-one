import { describe, expect, it } from 'vitest'

import {
  classifyBilibiliRichPayload,
  hasBilibiliInlineTextContent,
  isSingleBilibiliEmojiPayload,
} from '../rich-payload'

describe('Bilibili rich payload classification', () => {
  it('keeps Unicode Emoji together with surrounding text', () => {
    const payload = {
      assets: [{ keys: [], token: '👋' }],
      parts: [
        { text: '你好', type: 'text' },
        { asset: { token: '👋' }, type: 'emoji' },
      ],
      text: '你好👋',
    }

    expect(classifyBilibiliRichPayload(payload)).toEqual({
      kind: 'unicode-emoji-text',
      text: '你好👋',
    })
  })

  it('rebuilds common Bilibili Emoji inline with text', () => {
    const emoji = { keys: ['name:大哭'], token: '[大哭]' }
    const payload = {
      assets: [emoji],
      parts: [
        { text: '加油', type: 'text' },
        { asset: emoji, type: 'emoji' },
      ],
      text: '加油 [大哭]',
    }

    expect(classifyBilibiliRichPayload(payload)).toEqual({
      kind: 'inline-emoji-text',
      text: '加油[大哭]',
    })
    expect(hasBilibiliInlineTextContent(payload)).toBe(true)
  })

  it('does not treat the duplicate accessible Emoji label as real surrounding text', () => {
    const emoji = { keys: ['name:委屈'], token: '[委屈]' }
    expect(
      hasBilibiliInlineTextContent({
        assets: [emoji],
        parts: [
          { asset: emoji, type: 'emoji' },
          { text: '[委屈]', type: 'text' },
        ],
        text: '[委屈]',
      }),
    ).toBe(false)
  })

  it('classifies one native room Emoji as a panel-only send', () => {
    const emoji = {
      keys: ['native-panel:room-happy-42'],
      token: '[主播表情9]',
    }
    const payload = {
      assets: [emoji],
      parts: [{ asset: emoji, type: 'emoji' }],
      text: '[主播表情9]',
    }

    expect(isSingleBilibiliEmojiPayload(payload)).toBe(true)
    expect(classifyBilibiliRichPayload(payload)).toEqual({
      kind: 'panel-emoji-single',
      text: '[主播表情9]',
    })
  })

  it('ignores Bilibili duplicate text metadata beside one native room Emoji', () => {
    const emoji = {
      keys: ['native-panel:anchor-wave'],
      token: '[主播挥手]',
    }
    const payload = {
      assets: [emoji],
      parts: [
        { asset: emoji, type: 'emoji' },
        { text: '\u200B [主播挥手] ', type: 'text' },
      ],
      text: '[主播挥手][主播挥手]',
    }

    expect(isSingleBilibiliEmojiPayload(payload)).toBe(true)
    expect(classifyBilibiliRichPayload(payload)).toEqual({
      kind: 'panel-emoji-single',
      text: '[主播挥手]',
    })
  })

  it('treats the unbracketed side-chat label as metadata for the same room Emoji', () => {
    const emoji = {
      keys: ['native-panel:room_889434_86267'],
      token: '[SAD]',
    }
    const payload = {
      assets: [emoji],
      parts: [
        { asset: emoji, type: 'emoji' },
        { text: 'SAD', type: 'text' },
      ],
      text: '[SAD]SAD',
    }

    expect(isSingleBilibiliEmojiPayload(payload)).toBe(true)
    expect(classifyBilibiliRichPayload(payload)).toEqual({
      kind: 'panel-emoji-single',
      text: '[SAD]',
    })
  })

  it('rejects native room Emoji mixed with text or other Emoji', () => {
    const emoji = {
      keys: ['native-panel:room-happy-42'],
      token: '[主播表情9]',
    }
    const payload = {
      assets: [emoji],
      parts: [
        { text: '你好', type: 'text' },
        { asset: emoji, type: 'emoji' },
      ],
      text: '你好[主播表情9]',
    }

    expect(isSingleBilibiliEmojiPayload(payload)).toBe(false)
    expect(classifyBilibiliRichPayload(payload).kind).toBe('panel-emoji-mixed')
  })

  it('does not guess an unidentified image is an inline Emoji', () => {
    expect(
      classifyBilibiliRichPayload({
        assets: [{ keys: ['raw:https://example.test/unknown.webp'], token: '' }],
        parts: [{ asset: { token: '' }, type: 'emoji' }],
        text: '图片表情',
      }).kind,
    ).toBe('unknown-image')
  })
})
