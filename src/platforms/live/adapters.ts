import type { LivePlatformAdapter } from '../../core/types'
import { createBilibiliAdapter } from '../bilibili/adapter'
import { createDouyuAdapter } from '../douyu/adapter'
import { createHuyaAdapter } from '../huya/adapter'

export function createLivePlatformAdapter(platform: 'bilibili' | 'douyu' | 'huya'): LivePlatformAdapter {
  if (platform === 'bilibili') return createBilibiliAdapter()
  if (platform === 'douyu') return createDouyuAdapter()
  return createHuyaAdapter()
}
