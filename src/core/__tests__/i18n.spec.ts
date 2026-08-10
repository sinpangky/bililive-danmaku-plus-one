import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { t } from '../i18n'

function locale(name: 'en' | 'zh_CN'): Record<string, { message: string }> {
  return JSON.parse(readFileSync(
    resolve(process.cwd(), `public/_locales/${name}/messages.json`),
    'utf8',
  ))
}

describe('extension i18n', () => {
  it('keeps English and Chinese locale keys complete', () => {
    expect(Object.keys(locale('en')).sort()).toEqual(Object.keys(locale('zh_CN')).sort())
  })

  it('uses a fixed Chinese manifest identity', () => {
    const manifest = JSON.parse(readFileSync(
      resolve(process.cwd(), 'public/manifest.json'),
      'utf8',
    ))
    expect(manifest.default_locale).toBe('zh_CN')
    expect(manifest.name).toBe('bililive-danmaku-plus-one')
    expect(manifest.description).toContain('B站直播')
    expect(manifest.action.default_title).toBe('bililive-danmaku-plus-one 设置')
  })

  it('falls back to Chinese when a runtime message is unavailable', () => {
    vi.stubGlobal('chrome', { i18n: { getMessage: () => '' } })
    expect(t('actionReply')).toBe('回复')
    expect(t('actionRepeatTitle', '测试')).toBe('复读：测试')
  })

  it('provides a Chinese fallback for every locale key', () => {
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } })
    for (const key of Object.keys(locale('zh_CN'))) {
      expect(t(key)).not.toBe(key)
    }
  })

  it('keeps Chinese text regardless of browser language and supports substitutions', () => {
    const getMessage = vi.fn<(key: string) => string>(
      (key) => key === 'actionReply' ? 'Reply' : '',
    )
    vi.stubGlobal('chrome', { i18n: { getMessage } })
    expect(t('actionReply')).toBe('回复')
    expect(getMessage).not.toHaveBeenCalled()
    expect(t('actionRepeatTitle', ['first'])).toContain('first')
    expect(t('actionRepeatTitle', 'second')).toContain('second')
    expect(t('missingKey')).toBe('missingKey')
  })
})
