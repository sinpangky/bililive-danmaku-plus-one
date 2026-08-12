import { describe, expect, it } from 'vitest'
import {
  BILIBILI_EMOTICON_ITEM_SELECTOR,
  BILIBILI_EMOTICON_PACK_SELECTOR,
  BILIBILI_EMOTICON_PANEL_SELECTOR,
  BILIBILI_EMOTICON_TAB_SELECTOR,
  BILIBILI_INLINE_EMOJI_PACK_SELECTOR,
  PLATFORM_EMOJI_CATEGORY_SELECTORS,
} from '../editor-config'
import { BILIBILI_EMOJI_SURFACE_SELECTORS } from '../../bilibili/dom-config'

describe('Bilibili native Emoji panel selectors', () => {
  it('matches the current mounted pack and tab structure', () => {
    expect(BILIBILI_EMOTICON_PANEL_SELECTOR).toBe('.emoticons-pane')
    expect(BILIBILI_EMOTICON_PACK_SELECTOR).toBe('.emotion-wrap')
    expect(BILIBILI_INLINE_EMOJI_PACK_SELECTOR).toBe('.emotion-wrap.emoji-wrap')
    expect(BILIBILI_EMOTICON_ITEM_SELECTOR).toBe('.emoticon-item')
    expect(BILIBILI_EMOTICON_TAB_SELECTOR).toBe('.tab-pane-item')
    expect(PLATFORM_EMOJI_CATEGORY_SELECTORS).toContain('.tab-pane-item')
    expect(BILIBILI_EMOJI_SURFACE_SELECTORS).toContain('.emoticons-pane')
  })
})
