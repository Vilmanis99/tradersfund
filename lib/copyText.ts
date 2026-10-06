/** A rejected clipboard permission can still succeed through the legacy browser action. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* Try the browser's legacy copy action before offering manual copying. */ }
  const previous = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.left = '-9999px'
  document.body.appendChild(field)
  try {
    field.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
    if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
  }
}
