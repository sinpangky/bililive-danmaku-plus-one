import { describe, expect, it } from 'vitest'
import { SenderCorrelationCache, senderMessageKey } from '../sender-correlation'

describe('SenderCorrelationCache', () => {
  it('keeps a sender available after its chat row is gone', () => {
    const cache = new SenderCorrelationCache()
    cache.remember(['你好 [微笑]', '你好[微笑]'], ' 测试用户：', { observedAt: 1_000 })

    expect(cache.resolve('你好[微笑]', { observedAt: 1_020, now: 1_020 })).toBe('测试用户')
  })

  it('uses stable message ids when rendered text differs', () => {
    const cache = new SenderCorrelationCache()
    cache.remember('侧边聊天文本', '用户731', {
      ids: ['message-731'],
      observedAt: 2_000,
    })

    expect(
      cache.resolve('画面渲染文本', {
        ids: ['message-731'],
        observedAt: 2_010,
        now: 2_010,
      }),
    ).toBe('用户731')
  })

  it('uses observation time to disambiguate repeated messages', () => {
    const cache = new SenderCorrelationCache()
    const now = Date.now()
    cache.remember('来了', '较早用户', { observedAt: now - 4_000, now })
    cache.remember('来了', '较晚用户', { observedAt: now, now })

    expect(cache.resolve('来了', { observedAt: now - 3_950, now })).toBe('较早用户')
    expect(cache.resolve('来了', { observedAt: now - 50, now })).toBe('较晚用户')
  })

  it('matches harmless whitespace differences and rejects expired entries', () => {
    const cache = new SenderCorrelationCache(500)
    cache.remember('打 得 不 错', '空格用户', { observedAt: 1_000 })

    expect(senderMessageKey('打\u200B 得\u00A0不错')).toBe('打得不错')
    expect(cache.resolve('打得不错', { now: 1_200 })).toBe('空格用户')
    expect(cache.resolve('打得不错', { now: 1_600 })).toBe('')
  })
})
