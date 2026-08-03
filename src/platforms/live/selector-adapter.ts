import type {
  DanmakuDescriptor,
  ExtensionSettings,
  LivePlatformAdapter,
  PlatformId,
} from '../../core/types'
import type { LivePlatformConfig } from './config'
import { describeDanmaku } from './descriptor'

function closest(path: EventTarget[], selectors: readonly string[]): Element | null {
  for (const target of path) {
    if (!(target instanceof Element)) continue
    for (const selector of selectors) {
      try {
        const match = target.closest(selector)
        if (match) return match
      } catch {
        // Ignore selectors unsupported by the current browser.
      }
    }
  }
  return null
}

function visible(element: Element): boolean {
  const style = getComputedStyle(element)
  return element.isConnected && style.display !== 'none' && style.visibility !== 'hidden'
}

export function createSelectorPlatformAdapter(options: {
  config: LivePlatformConfig
  nativeCapsuleVisible?: (settings: ExtensionSettings) => boolean
  platform: PlatformId
}): LivePlatformAdapter {
  const { config, platform } = options
  return {
    cleanup() {},
    describe(candidate, source) {
      return describeDanmaku(platform, config, candidate, source)
    },
    findCandidate(path) {
      const video = closest(path, config.overlayMessages)
      if (video) return { element: video, source: 'video' }
      const chat = closest(path, config.messages)
      return chat ? { element: chat, source: 'chat' } : null
    },
    findOfficialEditor() {
      for (const selector of config.inputs) {
        try {
          const editor = document.querySelector(selector)
          if (editor && visible(editor)) return editor
        } catch {
          // Ignore selectors unsupported by the current browser.
        }
      }
      return null
    },
    nativeCapsuleVisible(settings) {
      return options.nativeCapsuleVisible?.(settings) ?? true
    },
    resolveSender(descriptor: DanmakuDescriptor) {
      return { id: descriptor.senderId, name: descriptor.senderName }
    },
  }
}
