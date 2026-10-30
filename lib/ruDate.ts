/** Reader-facing Russian date (DD.MM.YYYY). Non-ISO input is returned unchanged. */
export function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : iso
}

/**
 * Locale-aware reader date for components shared by EN and RU pages.
 * RU renders DD.MM.YYYY; any other locale gets the input back unchanged, so EN output stays byte-identical.
 * Only for visible text: JSON-LD, datetime/content attributes, meta tags and URLs keep ISO.
 */
export function localeDate(iso: string, locale: string): string
export function localeDate(iso: string | null | undefined, locale: string): string | null | undefined
export function localeDate(iso: string | null | undefined, locale: string): string | null | undefined {
  return locale === 'ru' ? formatRuDate(iso) : iso
}

const ISO_DATE_IN_TEXT = /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/g

/**
 * Rewrites every standalone YYYY-MM-DD inside a visible Russian string as DD.MM.YYYY.
 * For text that is also emitted elsewhere with ISO dates (e.g. FAQ answers reused in FAQPage JSON-LD):
 * format at render time and leave the source string untouched.
 */
export function ruDatesInText(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(ISO_DATE_IN_TEXT, (_, year: string, month: string, day: string) => `${day}.${month}.${year}`)
}

const RU_MONTHS_NOMINATIVE = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

/** «ноябрь 2026»: month and year of `now` in Riga time (lowercase nominative), for monthly RU page labels. */
export function ruMonthYear(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Riga' }).formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value ?? String(now.getUTCFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? now.getUTCMonth() + 1)
  return `${RU_MONTHS_NOMINATIVE[month - 1]} ${year}`
}
