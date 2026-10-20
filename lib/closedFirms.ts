import data from '../content/data/closed-firms.json'

export type ClosedFirmSection = 'closed' | 'offline'

export interface ClosedFirm {
  slug: string
  name: string
  section: ClosedFirmSection
  status: string
  dateLabel: string
  date: string
  quote: string
  quoteBasis: 'primary' | 'secondary'
  quoteVia?: string
  /** Overrides the default quote label, e.g. for a server response rather than a statement. */
  quoteLabel?: string
  primarySource: string
  archivedSource?: string
  note?: string
}

const FIRMS = data.firms as ClosedFirm[]

/** While false the page stays noindex and out of the sitemap. */
export const CLOSED_FIRMS_PUBLISHED = data.published === true
export const CLOSED_FIRMS_CAPTURED_AT = data.capturedAt

export function getClosedFirms(section?: ClosedFirmSection): ClosedFirm[] {
  return FIRMS.filter(firm => !section || firm.section === section).sort((a, b) => b.date.localeCompare(a.date))
}
