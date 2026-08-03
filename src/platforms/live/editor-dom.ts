export function readEditorText(editor: Element | null | undefined): string {
  if (!editor) return ''
  if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) {
    return editor.value
  }
  return editor.textContent || ''
}

export function placeEditorCaretAtEnd(editor: Element): void {
  if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) {
    const length = editor.value.length
    if (typeof editor.setSelectionRange === 'function') {
      editor.setSelectionRange(length, length)
    }
    return
  }
  if (
    editor instanceof HTMLElement
    && (editor.isContentEditable
      || (editor.hasAttribute('contenteditable')
        && editor.getAttribute('contenteditable') !== 'false'))
  ) {
    const selection = getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

export function dispatchEditorEnter(editor: Element): void {
  const init = {
    bubbles: true,
    cancelable: true,
    code: 'Enter',
    composed: true,
    key: 'Enter',
    keyCode: 13,
    which: 13,
  }
  editor.dispatchEvent(new KeyboardEvent('keydown', init))
  editor.dispatchEvent(new KeyboardEvent('keypress', init))
  editor.dispatchEvent(new KeyboardEvent('keyup', init))
}
