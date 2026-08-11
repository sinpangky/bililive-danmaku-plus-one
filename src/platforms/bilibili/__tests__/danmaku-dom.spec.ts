import { afterEach, describe, expect, it } from 'vitest'

import { BILIBILI_PREFIX_TEXT_SELECTOR, isBilibiliDecorativePrefixImage } from '../dom-config'
import { BILIBILI_PLATFORM_CONFIG } from '../config'

describe('Bilibili prefixed danmaku DOM', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('uses the prefix text container as the message and ignores its badge image', () => {
    document.body.innerHTML = `
      <div class="bili-danmaku-x-dm">
        <img class="bili-danmaku-x-dm-emoji honor-level-40"
          data-emoji-name="[荣耀等级40]" alt="[荣耀等级40]" src="/badge.png">
        <span class="bili-danmaku-x-prefixImage-text-container">一窝一窝</span>
      </div>
    `
    const candidate = document.querySelector('.bili-danmaku-x-dm')!
    const image = candidate.querySelector('img')!

    expect(BILIBILI_PLATFORM_CONFIG.messageText[0]).toBe(BILIBILI_PREFIX_TEXT_SELECTOR)
    expect(candidate.querySelector(BILIBILI_PREFIX_TEXT_SELECTOR)?.textContent).toBe('一窝一窝')
    expect(isBilibiliDecorativePrefixImage(image, candidate)).toBe(true)
  })

  it('does not discard an image-only Emoji as a decorative prefix', () => {
    document.body.innerHTML = `
      <div class="bili-danmaku-x-dm">
        <img class="bili-danmaku-x-dm-img" alt="[大哭]" src="/emoji.webp">
      </div>
    `
    const candidate = document.querySelector('.bili-danmaku-x-dm')!
    const image = candidate.querySelector('img')!

    expect(isBilibiliDecorativePrefixImage(image, candidate)).toBe(false)
  })

  it('keeps a real inline Emoji when it is inside the prefixed message text', () => {
    document.body.innerHTML = `
      <div class="bili-danmaku-x-dm">
        <img class="honor-level-40" alt="[荣耀等级40]" src="/badge.png">
        <span class="bili-danmaku-x-prefixImage-text-container">
          加油<img class="bili-danmaku-x-dm-emoji" alt="[大哭]" src="/emoji.webp">
        </span>
      </div>
    `
    const candidate = document.querySelector('.bili-danmaku-x-dm')!
    const images = candidate.querySelectorAll('img')

    expect(isBilibiliDecorativePrefixImage(images[0], candidate)).toBe(true)
    expect(isBilibiliDecorativePrefixImage(images[1], candidate)).toBe(false)
  })
})
