import { describe, expect, it } from 'vitest'

import {
  dispatchEditorEnter,
  placeEditorCaretAtEnd,
  readEditorText,
} from '../editor-dom'

describe('live editor DOM helpers', () => {
  it('reads native and contenteditable editor values', () => {
    const input = document.createElement('input')
    input.value = 'input value'
    const rich = document.createElement('div')
    rich.contentEditable = 'true'
    rich.textContent = 'rich value'

    expect(readEditorText(input)).toBe('input value')
    expect(readEditorText(rich)).toBe('rich value')
    expect(readEditorText(null)).toBe('')
  })

  it('places the native editor caret at the end', () => {
    const textarea = document.createElement('textarea')
    textarea.value = '弹幕'
    document.body.append(textarea)

    placeEditorCaretAtEnd(textarea)

    expect(textarea.selectionStart).toBe(2)
    expect(textarea.selectionEnd).toBe(2)
  })

  it('dispatches the complete Enter key sequence', () => {
    const input = document.createElement('input')
    const events: string[] = []
    for (const type of ['keydown', 'keypress', 'keyup']) {
      input.addEventListener(type, (event) => events.push(`${type}:${(event as KeyboardEvent).key}`))
    }

    dispatchEditorEnter(input)

    expect(events).toEqual(['keydown:Enter', 'keypress:Enter', 'keyup:Enter'])
  })
})
