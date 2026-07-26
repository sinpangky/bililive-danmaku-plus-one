import { describe, expect, it } from 'vitest'

import { appendedMutationValue } from '../input-order'

describe('appendedMutationValue', () => {
  it('keeps consecutive image Emoji after the existing text', () => {
    expect(appendedMutationValue('你好', '[微笑][微笑]你好')).toBe('你好[微笑][微笑]')
  })

  it('moves an Emoji inserted at a stale caret back to the current end', () => {
    expect(appendedMutationValue('打得不错啊[微笑]', '[微笑]打得不错啊[微笑]')).toBe(
      '打得不错啊[微笑][微笑]',
    )
  })

  it('leaves an already appended Emoji unchanged', () => {
    expect(appendedMutationValue('你好', '你好[微笑]')).toBe('你好[微笑]')
  })

  it('does not rewrite unrelated editor mutations', () => {
    expect(appendedMutationValue('你好', '您好啊')).toBeNull()
  })
})
