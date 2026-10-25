/** Reader-facing Russian date (DD.MM.YYYY). Non-ISO input is returned unchanged. */
export function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : iso
}
