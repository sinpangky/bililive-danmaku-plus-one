export async function writeClipboardText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall back to the legacy copy command when page permissions reject the API.
  }

  const input = document.createElement('textarea')
  input.value = value
  input.readOnly = true
  input.style.cssText =
    'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;width:1px;height:1px'
  ;(document.body || document.documentElement).append(input)
  try {
    input.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    input.remove()
  }
}
