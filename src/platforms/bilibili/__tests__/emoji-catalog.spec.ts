import { describe, expect, it } from 'vitest'

import { selectUniqueBilibiliCatalogEntry } from '../emoji-catalog'

describe('Bilibili equipped Emoji catalog', () => {
  it('selects an exact resource across different packs even when names match', () => {
    const selected = selectUniqueBilibiliCatalogEntry(
      [
        {
          available: true,
          descriptor: { keys: ['path:/pack-a/happy.webp'], token: '[开心]' },
          identity: 'pack-a-happy',
          value: 'pack-a',
        },
        {
          available: true,
          descriptor: { keys: ['path:/pack-b/happy.webp'], token: '[开心]' },
          identity: 'pack-b-happy',
          value: 'pack-b',
        },
      ],
      { keys: ['path:/pack-b/happy.webp'], token: '[开心]' },
    )

    expect(selected?.value).toBe('pack-b')
  })

  it('refuses to guess when two packs expose only the same display name', () => {
    expect(
      selectUniqueBilibiliCatalogEntry(
        [
          {
            available: true,
            descriptor: { keys: [], token: '[开心]' },
            identity: 'pack-a-happy',
            value: 'pack-a',
          },
          {
            available: true,
            descriptor: { keys: [], token: '[开心]' },
            identity: 'pack-b-happy',
            value: 'pack-b',
          },
        ],
        { keys: [], token: '[开心]' },
      ),
    ).toBeNull()
  })

  it('excludes locked or otherwise unavailable items', () => {
    const selected = selectUniqueBilibiliCatalogEntry(
      [
        {
          available: false,
          descriptor: { keys: ['path:/locked.webp'], token: '[泪目]' },
          identity: 'locked',
          value: 'locked',
        },
        {
          available: true,
          descriptor: { keys: ['path:/available.webp'], token: '[泪目]' },
          identity: 'available',
          value: 'available',
        },
      ],
      { keys: ['path:/available.webp'], token: '[泪目]' },
    )

    expect(selected?.value).toBe('available')
    expect(
      selectUniqueBilibiliCatalogEntry(
        [
          {
            available: false,
            descriptor: { keys: ['path:/locked.webp'], token: '[泪目]' },
            identity: 'locked',
            value: 'locked',
          },
        ],
        { keys: ['path:/locked.webp'], token: '[泪目]' },
      ),
    ).toBeNull()
  })
})
