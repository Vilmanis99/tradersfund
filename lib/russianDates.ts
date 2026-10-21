/** Client-safe Russian date labels for dated evidence. */
const GENITIVE_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/**
 * "2026-10-20" -> "20 октября 2026 года" (or "20 октября" without the year).
 * Returns null for anything that is not a real ISO calendar date, so callers
 * can fall back instead of printing a malformed date.
 */
export function russianGenitiveDate(iso: string | null | undefined, options: { year?: boolean } = {}): string | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const date = new Date(`${iso}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null
  const label = `${date.getUTCDate()} ${GENITIVE_MONTHS[date.getUTCMonth()]}`
  return options.year === false ? label : `${label} ${date.getUTCFullYear()} года`
}
