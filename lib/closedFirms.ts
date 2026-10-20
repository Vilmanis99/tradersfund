import data from '../content/data/closed-firms.json'

export type ClosedFirmSection = 'closed' | 'offline'
export type SourceType = 'primary' | 'secondary'

/** One claim on the page. Secondary claims must name who reported them. */
export interface SourcedClaim {
  text: string
  sourceType: SourceType
  reportedBy?: { name: string; url: string }
}

export interface ClosedFirm {
  slug: string
  name: string
  section: ClosedFirmSection
  /** ISO date, used for ordering only. */
  date: string
  status: SourcedClaim
  dateLabel: SourcedClaim
  quote: SourcedClaim
  /** Overrides the default quote label, e.g. for a server response rather than a statement. */
  quoteLabel?: string
  /** Extra facts that only trade press supports. */
  reported: SourcedClaim[]
  primarySource: string
  archivedSource?: string
  note?: string
}

const FIRMS = data.firms as ClosedFirm[]

// A secondary claim without a named, linked source would read as fact.
for (const firm of FIRMS) {
  for (const claim of [firm.status, firm.dateLabel, firm.quote, ...firm.reported]) {
    if (claim.sourceType === 'secondary' && !(claim.reportedBy?.name && claim.reportedBy.url)) {
      throw new Error(`closed-firms.json: ${firm.slug} has a secondary claim without reportedBy`)
    }
  }
}

/** While false the page stays noindex and out of the sitemap. */
export const CLOSED_FIRMS_PUBLISHED = data.published === true
export const CLOSED_FIRMS_CAPTURED_AT = data.capturedAt

export function getClosedFirms(section?: ClosedFirmSection): ClosedFirm[] {
  return FIRMS.filter(firm => !section || firm.section === section).sort((a, b) => b.date.localeCompare(a.date))
}
