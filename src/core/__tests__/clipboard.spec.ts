import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeClipboardText } from '../clipboard'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')

afterEach(() => {
  vi.restoreAllMocks()
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
  if (execCommandDescriptor) {
    Object.defineProperty(document, 'execCommand', execCommandDescriptor)
  } else {
    Reflect.deleteProperty(document, 'execCommand')
  }
})

describe('clipboard writer', () => {
  it('copies the complete danmaku text through the Clipboard API', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await expect(writeClipboardText('测试弹幕 👋')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('测试弹幕 👋')
  })

  it('uses the selection fallback when Clipboard API access is rejected', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi
          .fn<(value: string) => Promise<void>>()
          .mockRejectedValue(new Error('denied')),
      },
    })
    const execCommand = vi.fn<(command: string) => boolean>().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await expect(writeClipboardText('备用复制')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })
})
