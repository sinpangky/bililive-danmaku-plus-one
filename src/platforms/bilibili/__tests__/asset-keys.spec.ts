import { describe, expect, it } from 'vitest'

import { normalizedAssetKeys } from '../../douyin/rich-data'

describe('Bilibili Emoji resource correlation', () => {
  it('matches the player source with Bilibili side-chat resize suffixes', () => {
    const player = normalizedAssetKeys(
      'https://i0.hdslb.com/bfs/live/69312e99a00d1db2de34ef2db9220c5686643a3f.png',
      'https://live.bilibili.com/8818471',
    )
    const sideChat = normalizedAssetKeys(
      'https://i0.hdslb.com/bfs/live/69312e99a00d1db2de34ef2db9220c5686643a3f.png@20h.webp',
      'https://live.bilibili.com/8818471',
    )

    expect(player).toContain('stem:69312e99a00d1db2de34ef2db9220c5686643a3f.png')
    expect(sideChat).toContain('stem:69312e99a00d1db2de34ef2db9220c5686643a3f.png')
  })
})
