import { firmSlug } from './firmSlug.ts'

/**
 * Pure Russia-status resolver shared by lib/russiaAvailability.ts (which feeds it
 * content/data/firms.json) and server-side row builders (which feed it
 * getAllFirms()). No data import here, so callers choose where firm data is read.
 */
export type RussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

/** Firms not in firms.json that are known to restrict Russia. */
const EXTRA_RESTRICTED: Record<string, RussiaStatus> = {
  the5ers: 'restricted',
  'the-5ers': 'restricted',
}

const ALIASES: Record<string, string> = {
  e8: 'e8-markets',
  apex: 'apex-trader-funding',
  lucid: 'lucid-trading',
  'funding-pips': 'fundingpips',
  brightfunded: 'bright-funded',
}

/**
 * Why a firm is 'available'. 'not-on-restricted-list' = Russia is absent from the firm's published restriction
 * lists, nothing more (EA rule 2026-10-23); it renders the neutral «нет в списке ограничений (на DD.MM.YYYY)» badge.
 * 'positive-evidence' (or no basis) keeps «Открыта для РФ». russiaStatus, sorting and every === 'available' branch
 * are unchanged by the basis.
 */
export type RussiaBasis = 'not-on-restricted-list' | 'positive-evidence'

export type RussiaStatusFirm = { name: string; russiaStatus?: RussiaStatus; russiaBasis?: string; russiaSourceCapturedAt?: string }

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** slug -> evidence date for 'available' firms whose basis is 'not-on-restricted-list'. A missing/invalid date throws (data error). */
export function russiaBasisDatesBySlug(firms: readonly RussiaStatusFirm[]): Record<string, string> {
  const dates: Record<string, string> = {}
  for (const firm of firms) {
    if (firm.russiaBasis !== 'not-on-restricted-list' || firm.russiaStatus !== 'available') continue
    if (!firm.russiaSourceCapturedAt || !ISO_DAY.test(firm.russiaSourceCapturedAt)) throw new Error(`${firm.name}: russiaBasis 'not-on-restricted-list' needs russiaSourceCapturedAt (YYYY-MM-DD)`)
    dates[firmSlug(firm.name)] = firm.russiaSourceCapturedAt
  }
  return dates
}

export function resolveRussiaBasisDate(datesBySlug: Record<string, string>, slugOrName: string): string | null {
  const slug = firmSlug(slugOrName)
  return datesBySlug[ALIASES[slug] ?? slug] ?? null
}

export function russiaStatusesBySlug(firms: readonly RussiaStatusFirm[]): Record<string, RussiaStatus> {
  return Object.fromEntries(firms.map((firm) => [firmSlug(firm.name), firm.russiaStatus ?? 'unverified']))
}

/**
 * Pending 'available' firms (firms-pending.json, not in firms.json): slug -> the entry's own russiaSourceCapturedAt
 * (YYYY-MM-DD) or null when it has no valid one, plus its basis. EA 2026-10-26: they render the neutral
 * «нет в списке ограничений (на DD.MM.YYYY)» badge, or «ограничений по странам не опубликовано (на DD.MM.YYYY)» when
 * the entry's russiaBasis is 'no-published-country-list' (undated when null), while their status stays 'unverified'.
 * Keys: name slug and explicit slug, like russiaStatusesWithPending. A firms.json firm with the same slug is skipped.
 */
export type RussiaPendingBasis = 'not-on-restricted-list' | 'no-published-country-list'
export type RussiaPendingMarker = { date: string | null; basis: RussiaPendingBasis }

export function russiaPendingNotListedBySlug(
  firms: readonly RussiaStatusFirm[],
  pending: readonly (RussiaStatusFirm & { slug?: string })[],
): Record<string, RussiaPendingMarker> {
  const inFirms = new Set(firms.map((firm) => firmSlug(firm.name)))
  const out: Record<string, RussiaPendingMarker> = {}
  for (const firm of pending) {
    if (firm.russiaStatus !== 'available') continue
    const keys = [...new Set([firmSlug(firm.name), firm.slug ? firmSlug(firm.slug) : null])].filter((key): key is string => Boolean(key))
    if (keys.some((key) => inFirms.has(ALIASES[key] ?? key))) continue
    const date = firm.russiaSourceCapturedAt && ISO_DAY.test(firm.russiaSourceCapturedAt) ? firm.russiaSourceCapturedAt : null
    // Modelled in data, never inferred from an empty countriesRestricted (EA 2026-10-26).
    const basis: RussiaPendingBasis = firm.russiaBasis === 'no-published-country-list' ? 'no-published-country-list' : 'not-on-restricted-list'
    for (const key of keys) out[key] = { date, basis }
  }
  return out
}

/** { date, basis } for a pending 'available' firm (date may be null), else null. */
export function resolvePendingNotListed(bySlug: Record<string, RussiaPendingMarker>, slugOrName: string): RussiaPendingMarker | null {
  const slug = firmSlug(slugOrName)
  const key = ALIASES[slug] ?? slug
  return key in bySlug ? { ...bySlug[key] } : null
}

/**
 * Status map with a fallback for firms that are not in firms.json yet: content/data/firms-pending.json `russiaStatus`
 * (RU SEO Lead 2026-10-26, for RU reviews of pending firms such as Spice Prop, Goat Funded Trader, Blue Guardian).
 * firms.json always wins: a firm listed there keeps its own status (or 'unverified' when it has none), even if a
 * pending entry with the same slug says otherwise. A pending entry without a valid russiaStatus adds nothing, so it
 * still resolves to 'unverified'. Pending firms never get a russiaBasis date (russiaBasisDatesBySlug reads firms.json only).
 * A pending 'available' is NOT promoted (stays 'unverified'): it would render «Открыта для РФ» from unpublished data
 * (e.g. TeamTraders, inferred from the operator, no eligibility clause), which test:ru-access-basis rejects. Only the
 * cautious statuses 'restricted' and 'unclear' fall back; 'available' needs a firms.json entry.
 * EA 2026-10-26: such a firm keeps status 'unverified' here (ranking, counters, CTA gating never treat it as available);
 * its badge is the neutral «нет в списке ограничений» label via russiaPendingNotListedBySlug + ruAccessBadge.
 */
const PENDING_FALLBACK_STATUSES: readonly RussiaStatus[] = ['restricted', 'unclear']
export function russiaStatusesWithPending(
  firms: readonly RussiaStatusFirm[],
  pending: readonly (RussiaStatusFirm & { slug?: string })[],
): Record<string, RussiaStatus> {
  const fallback: Record<string, RussiaStatus> = {}
  for (const firm of pending) {
    if (!firm.russiaStatus || !PENDING_FALLBACK_STATUSES.includes(firm.russiaStatus)) continue
    for (const key of new Set([firmSlug(firm.name), firm.slug ? firmSlug(firm.slug) : null])) if (key) fallback[key] = firm.russiaStatus
  }
  // Same keys as russiaStatusesBySlug (resolveRussiaStatus applies ALIASES on lookup).
  return { ...fallback, ...russiaStatusesBySlug(firms) }
}

export function resolveRussiaStatus(statusBySlug: Record<string, RussiaStatus>, slugOrName: string): RussiaStatus {
  const slug = firmSlug(slugOrName)
  const key = ALIASES[slug] ?? slug
  return EXTRA_RESTRICTED[key] ?? statusBySlug[key] ?? 'unverified'
}
