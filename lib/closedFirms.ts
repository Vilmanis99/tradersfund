import data from '../content/data/closed-firms.json'
import ruData from '../content/data/closed-firms.ru.json'
import { CLOSED_FIRMS_ROUTE_PAIR, RU_CLOSED_FIRMS_PATH } from './localizedRoutes'

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

// ---------------------------------------------------------------------------
// Russian version (/ru/zakrytye-prop-firmy). Text only: content/data/closed-firms.ru.json is keyed by
// slug and every RU string inherits sourceType and reportedBy from the EN claim it translates.

export type ClosedFirmsLocale = 'en' | 'ru'

/** A claim as rendered. `original` is the EN wording kept next to a translated quote. */
export interface ClosedFirmClaimView extends SourcedClaim {
  original?: string
  /** True when no RU text exists and the EN original is shown as is. */
  untranslated?: boolean
}

export interface ClosedFirmView extends Omit<ClosedFirm, 'status' | 'dateLabel' | 'quote' | 'reported'> {
  status: ClosedFirmClaimView
  dateLabel: ClosedFirmClaimView
  quote: ClosedFirmClaimView
  reported: ClosedFirmClaimView[]
  noteUntranslated?: boolean
}

interface RuClosedFirmText {
  status?: string
  dateLabel?: string
  /** null: show the original wording only (no translation). */
  quote?: string | null
  quoteLabel?: string
  reported?: string[]
  note?: string
}

const RU_TEXT = (ruData as { firms: Record<string, RuClosedFirmText> }).firms
export const CLOSED_FIRMS_RU_CAPTURED_AT = (ruData as { capturedAt: string }).capturedAt

const EN_SLUGS = new Set(FIRMS.map(firm => firm.slug))
for (const [slug, text] of Object.entries(RU_TEXT)) {
  const firm = FIRMS.find(candidate => candidate.slug === slug)
  if (!firm) throw new Error(`closed-firms.ru.json: ${slug} is not a slug in closed-firms.json`)
  if (text.reported && text.reported.length !== firm.reported.length) {
    throw new Error(`closed-firms.ru.json: ${slug} has ${text.reported.length} reported items, closed-firms.json has ${firm.reported.length}`)
  }
}

function translated(claim: SourcedClaim, ru: string | undefined): ClosedFirmClaimView {
  return ru ? { ...claim, text: ru } : { ...claim, untranslated: true }
}

function toView(firm: ClosedFirm, locale: ClosedFirmsLocale): ClosedFirmView {
  if (locale === 'en') return firm
  const ru = RU_TEXT[firm.slug] ?? {}
  return {
    ...firm,
    status: translated(firm.status, ru.status),
    dateLabel: translated(firm.dateLabel, ru.dateLabel),
    // A translated quote keeps the original next to it; quote: null shows the original only.
    quote: ru.quote ? { ...firm.quote, text: ru.quote, original: firm.quote.text } : { ...firm.quote, untranslated: true },
    // EN quoteLabel overrides are English; RU uses its own override or the RU default labels.
    quoteLabel: ru.quoteLabel,
    reported: firm.reported.map((claim, index) => translated(claim, ru.reported?.[index])),
    note: firm.note ? (ru.note ?? firm.note) : undefined,
    noteUntranslated: Boolean(firm.note && !ru.note),
  }
}

/** Same filter and order as getClosedFirms, with the text for one locale. */
export function getClosedFirmViews(locale: ClosedFirmsLocale, section?: ClosedFirmSection): ClosedFirmView[] {
  return getClosedFirms(section).map(firm => toView(firm, locale))
}

/** Section ids (#slug) per locale. Outreach links to these anchors, so EN and RU must match. */
export function closedFirmAnchorIds(locale: ClosedFirmsLocale): string[] {
  return getClosedFirmViews(locale).map(firm => firm.slug).sort()
}
if (JSON.stringify(closedFirmAnchorIds('en')) !== JSON.stringify(closedFirmAnchorIds('ru'))
  || closedFirmAnchorIds('ru').some(id => !EN_SLUGS.has(id))) {
  throw new Error('closed firms: RU and EN anchor ids differ')
}

/** Slugs listed in closed-firms.json without RU text (rendered in English, marked lang="en"). */
export function closedFirmsMissingRuText(): string[] {
  return FIRMS.filter(firm => !RU_TEXT[firm.slug]).map(firm => firm.slug)
}

// Everything that advertises the RU page follows the same flag as the EN page.

/** RU page href for inlinks and the footer, or null while the list is unpublished. */
export function ruClosedFirmsHref(): string | null {
  return CLOSED_FIRMS_PUBLISHED ? RU_CLOSED_FIRMS_PATH : null
}

/** The EN<->RU pair while published; undefined otherwise or for any other path. */
export function closedFirmsRoutePair(pathname: string): typeof CLOSED_FIRMS_ROUTE_PAIR | undefined {
  if (!CLOSED_FIRMS_PUBLISHED) return undefined
  return pathname === CLOSED_FIRMS_ROUTE_PAIR.en || pathname === CLOSED_FIRMS_ROUTE_PAIR.ru ? CLOSED_FIRMS_ROUTE_PAIR : undefined
}

/** hreflang alternates for metadata, only while published. */
export function closedFirmsLanguageAlternates() {
  if (!CLOSED_FIRMS_PUBLISHED) return undefined
  return { en: CLOSED_FIRMS_ROUTE_PAIR.en, ru: CLOSED_FIRMS_ROUTE_PAIR.ru, 'x-default': CLOSED_FIRMS_ROUTE_PAIR.en }
}
