import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { createFavoritesRuntime } from '../../features/favorites/launcher'
import type { FavoritePayload } from '../../features/favorites/types'
import { BILIBILI_SEND_MESSAGE, type BilibiliSendResponse } from '../../platforms/bilibili/page-send'

vi.mock('../../features/favorites/launcher', () => ({
  createFavoritesRuntime: vi.fn<typeof createFavoritesRuntime>(() => null),
}))

const originalFullscreen = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
let response: BilibiliSendResponse | undefined
let transportError: string | undefined
let runtimeError: { message: string } | undefined
let throwOnSend = false
let sendFavorite: Parameters<typeof createFavoritesRuntime>[0]['sendFavorite']

type RuntimeSend = (
  request: { type: string; operation?: string; entry?: unknown },
  callback?: (response?: BilibiliSendResponse & { emoticons?: unknown[] }) => void,
) => void

const sendMessage = vi.fn<RuntimeSend>((request, callback) => {
  if (request.type === BILIBILI_SEND_MESSAGE) {
    if (throwOnSend) throw new Error('Extension context invalidated.')
    runtimeError = transportError ? { message: transportError } : undefined
    if (response || runtimeError) callback?.(response)
    runtimeError = undefined
  } else {
    callback?.({ ok: true, emoticons: [] })
  }
})

function textPayload(text = '前方高能 😀'): FavoritePayload {
  return { assets: [], parts: [{ type: 'text', text }], plainText: text, text }
}

function textRequests() {
  return sendMessage.mock.calls.filter(([request]) => request.type === BILIBILI_SEND_MESSAGE)
}

function toastText(): string {
  return document.querySelector('.bcp-one-toast')?.textContent || ''
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  sendMessage.mockClear()
  vi.mocked(createFavoritesRuntime).mockClear()
  response = { ok: true }
  transportError = undefined
  runtimeError = undefined
  throwOnSend = false
  document.body.innerHTML = `
    <section class="bpx-player-container"></section>
    <div class="chat-input-ctnr">
      <textarea class="chat-input">正在编写的草稿</textarea>
      <button type="submit">发送</button>
    </div>`
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  vi.stubGlobal('location', new URL('https://live.bilibili.com/8818471'))
  vi.stubGlobal('__bulletPlusOneLoaded', false)
  vi.stubGlobal('chrome', {
    runtime: {
      get lastError() { return runtimeError },
      sendMessage,
      onMessage: { addListener: vi.fn<() => void>(), removeListener: vi.fn<() => void>() },
    },
    storage: { onChanged: { addListener: vi.fn<() => void>(), removeListener: vi.fn<() => void>() } },
  })
  await import('../../core/shared')
  await import('../content')
  const options = vi.mocked(createFavoritesRuntime).mock.calls.at(-1)?.[0]
  if (!options) throw new Error('Content runtime did not initialize its send callback')
  sendFavorite = options.sendFavorite
})

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalFullscreen) Object.defineProperty(document, 'fullscreenElement', originalFullscreen)
  else Reflect.deleteProperty(document, 'fullscreenElement')
  document.body.innerHTML = ''
})

describe('Bilibili content sending', () => {
  it.each(['normal', 'web-fullscreen', 'native-fullscreen'])(
    'uses the page API in %s mode without modifying the native draft',
    async (mode) => {
      const player = document.querySelector<HTMLElement>('.bpx-player-container')!
      if (mode === 'native-fullscreen') {
        Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: player })
      } else if (mode === 'web-fullscreen') {
        vi.spyOn(player, 'getBoundingClientRect').mockReturnValue(
          new DOMRect(0, 0, innerWidth, innerHeight),
        )
      }
      const editor = document.querySelector('textarea')!
      editor.focus()
      const input = vi.fn<() => void>()
      const keydown = vi.fn<() => void>()
      const click = vi.fn<() => void>()
      editor.addEventListener('input', input)
      editor.addEventListener('keydown', keydown)
      document.querySelector('button')!.addEventListener('click', click)

      expect(await sendFavorite(textPayload())).toBe(true)
      expect(textRequests()).toEqual([
        [{ type: BILIBILI_SEND_MESSAGE, message: '前方高能 😀' }, expect.any(Function)],
      ])
      expect(editor.value).toBe('正在编写的草稿')
      expect(document.activeElement).toBe(editor)
      expect(input).not.toHaveBeenCalled()
      expect(keydown).not.toHaveBeenCalled()
      expect(click).not.toHaveBeenCalled()
    },
  )

  it('sends even when no native input exists', async () => {
    document.querySelector('.chat-input-ctnr')!.remove()
    expect(await sendFavorite(textPayload())).toBe(true)
    expect(textRequests()).toHaveLength(1)
  })

  it('routes mixed text and inline Bilibili Emoji through the same API', async () => {
    const asset = { keys: ['name:妙'], src: 'https://example.com/miao.png', token: '[妙]' }
    const payload: FavoritePayload = {
      assets: [asset],
      parts: [{ type: 'text', text: '太强了 ' }, { type: 'emoji', asset }],
      plainText: '太强了',
      text: '太强了 [妙]',
    }
    expect(await sendFavorite(payload)).toBe(true)
    expect(textRequests()[0]?.[0]).toEqual({
      type: BILIBILI_SEND_MESSAGE, message: '太强了 [妙]',
    })
    expect(document.querySelector('textarea')!.value).toBe('正在编写的草稿')
  })

  it('sends a player overlay +1 through the API without any native editor', async () => {
    document.querySelector('.chat-input-ctnr')!.remove()
    const player = document.querySelector('.bpx-player-container')!
    player.innerHTML = `
      <div class="bilibili-live-player-video-danmaku">
        <div class="bili-danmaku-x-dm"><span class="bili-danmaku-x-dm-content">前方高能</span></div>
      </div>`
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(100, 100, 120, 25),
    ] as unknown as DOMRectList)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 100, 120, 25),
    )
    const message = document.querySelector('.bili-danmaku-x-dm-content')!
    message.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: 150, clientY: 110 }))
    await nextTick()
    const button = document.querySelector<HTMLElement>('[data-action="plus-one"]')
    expect(button).not.toBeNull()
    button!.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(textRequests()[0]?.[0]).toEqual({ type: BILIBILI_SEND_MESSAGE, message: '前方高能' })
    expect(toastText()).toContain('已执行 +1')
  })

  it.each([
    ['not-signed-in', '请先登录B站'],
    ['发送频率过快', '弹幕发送失败：发送频率过快'],
  ])('reports API rejection %s without falling back to the editor', async (error, toast) => {
    response = { ok: false, error }
    expect(await sendFavorite(textPayload())).toBe(false)
    await nextTick()
    expect(toastText()).toContain(toast)
    expect(toastText()).not.toContain('未找到')
    expect(document.querySelector('textarea')!.value).toBe('正在编写的草稿')
    expect(textRequests()).toHaveLength(1)
    const log = sendMessage.mock.calls.find(([request]) => request.operation === 'append')?.[0].entry
    expect(log).toMatchObject({
      method: 'page-context-api', success: false, error, confirmation: 'none',
    })
  })

  it('reports an uncertain timeout without submitting a second message', async () => {
    response = undefined
    const pending = sendFavorite(textPayload())
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBe(false)
    await nextTick()
    expect(toastText()).toContain('请检查聊天记录后再重试')
    expect(textRequests()).toHaveLength(1)
    expect(document.querySelector('textarea')!.value).toBe('正在编写的草稿')
    // A late reply must not turn the timed-out send into a second success.
    textRequests()[0]?.[1]?.({ ok: true })
    await nextTick()
    expect(toastText()).not.toContain('已执行 +1')
  })

  it.each(['callback', 'throw'])('reports extension transport failure via %s', async (kind) => {
    transportError = 'Extension context invalidated.'
    throwOnSend = kind === 'throw'
    expect(await sendFavorite(textPayload())).toBe(false)
    await nextTick()
    expect(toastText()).toContain('Extension context invalidated.')
    expect(document.querySelector('textarea')!.value).toBe('正在编写的草稿')
    expect(textRequests()).toHaveLength(1)
  })

  it('blocks concurrent sends and releases its busy state after failure', async () => {
    response = undefined
    const first = sendFavorite(textPayload())
    await vi.advanceTimersByTimeAsync(800)
    expect(await sendFavorite(textPayload('第二条'))).toBe(false)
    expect(textRequests()).toHaveLength(1)
    textRequests()[0]?.[1]?.({ ok: false, error: '发送失败' })
    expect(await first).toBe(false)
    await vi.advanceTimersByTimeAsync(800)
    response = { ok: true }
    expect(await sendFavorite(textPayload('重试'))).toBe(true)
    expect(textRequests()).toHaveLength(2)
  })
})
