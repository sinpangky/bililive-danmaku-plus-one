import { createSelectorPlatformAdapter } from '../live/selector-adapter'
import { BILIBILI_PLATFORM_CONFIG } from './config'

export function createBilibiliAdapter() {
  return createSelectorPlatformAdapter({
    config: BILIBILI_PLATFORM_CONFIG,
    platform: 'bilibili',
  })
}
