import firms from '@/content/data/firms.json'
import { outboundSlug } from '@/lib/outboundDestinations'
import { resolveRussiaStatus, russiaStatusesBySlug, type RussiaStatus, type RussiaStatusFirm } from './russiaStatus.ts'

/**
 * Russia availability gate for /ru pages.
 *
 * Source of truth: `russiaStatus` in content/data/firms.json (populated from
 * the 2026-10-14 ru-availability check). Every firm keeps its sign-up CTA on
 * /ru pages; RuGoLink renders a Russia-access badge from this status.
 * EN pages never call this helper.
 */
export type { RussiaStatus } from './russiaStatus.ts'

const STATUS_BY_SLUG = russiaStatusesBySlug(firms as RussiaStatusFirm[])

export function russiaStatusFor(slugOrName: string): RussiaStatus {
  return resolveRussiaStatus(STATUS_BY_SLUG, slugOrName)
}

/** One `firmAccess[]` record from content/data/russian-market-evidence.json. */
export interface RussiaAccessEvidence {
  status: string
  sourceUrls: string[]
  sourceObservations?: Array<{ sourceUrl: string; sourceCapturedAt?: string; quote?: string }>
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * True when a firm's dated Russia-access record is one the /ru pages can stand
 * behind: 'restricted' must agree with the firm's `russiaStatus` (the badge
 * source); 'conflicting' (the pre-2026-10-20 FundedNext record) is accepted
 * because it never describes the firm as available. Every listed source must
 * be an https page with a dated, quoted observation, so adding a source keeps
 * the gate open while an unquoted or missing source closes it. No source count
 * is pinned.
 */
export function isRussiaAccessEvidenceDocumented(
  slugOrName: string,
  evidence: RussiaAccessEvidence | null | undefined,
): boolean {
  if (!evidence) return false
  // The evidence status must agree with firms.json russiaStatus: a documented
  // restriction backs 'restricted', a documented source conflict backs 'unclear'.
  // A mismatch (e.g. 'conflicting' evidence for a firm now marked restricted)
  // means the page copy written for one state cannot be shown as current.
  const statusOk = evidence.status === 'restricted'
    ? russiaStatusFor(slugOrName) === 'restricted'
    : evidence.status === 'conflicting' && russiaStatusFor(slugOrName) === 'unclear'
  if (!statusOk || !Array.isArray(evidence.sourceUrls) || evidence.sourceUrls.length === 0) return false
  const observations = evidence.sourceObservations ?? []
  return evidence.sourceUrls.every(url => /^https:\/\/\S+$/.test(url) && observations.some(item =>
    item.sourceUrl === url && typeof item.quote === 'string' && item.quote.trim().length > 0
    && typeof item.sourceCapturedAt === 'string' && ISO_DATE.test(item.sourceCapturedAt)))
}

const AFFILIATE_SLUGS = new Set(
  (firms as Array<{ name: string; affiliateUrl?: string | null }>)
    .filter((firm) => Boolean(firm.affiliateUrl))
    .map((firm) => outboundSlug(firm.name)),
)

/** rel for a /go/ link: sponsored only when the firm has a configured affiliate URL. */
export function goLinkRel(slug: string): string {
  return AFFILIATE_SLUGS.has(slug) ? 'sponsored nofollow noopener' : 'nofollow noopener'
}
