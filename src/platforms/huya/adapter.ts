import { LIVE_PLATFORM_CONFIG } from '../live/config'
import { createSelectorPlatformAdapter } from '../live/selector-adapter'

export function createHuyaAdapter() {
  return createSelectorPlatformAdapter({
    config: LIVE_PLATFORM_CONFIG.huya,
    platform: 'huya',
  })
}
