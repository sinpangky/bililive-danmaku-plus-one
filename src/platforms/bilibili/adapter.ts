import { LIVE_PLATFORM_CONFIG } from '../live/config'
import { createSelectorPlatformAdapter } from '../live/selector-adapter'

export function createBilibiliAdapter() {
  return createSelectorPlatformAdapter({
    config: LIVE_PLATFORM_CONFIG.bilibili,
    platform: 'bilibili',
  })
}
