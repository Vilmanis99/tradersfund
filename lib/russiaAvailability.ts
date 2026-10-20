import firms from '@/content/data/firms.json'
import { outboundSlug } from '@/lib/outboundDestinations'

/**
 * Russia availability gate for /ru pages.
 *
 * Source of truth: `russiaStatus` in content/data/firms.json (populated from
 * the 2026-10-14 ru-availability check). Every firm keeps its sign-up CTA on
 * /ru pages; RuGoLink renders a Russia-access badge from this status.
 * EN pages never call this helper.
 */
export type RussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

const STATUS_BY_SLUG: Record<string, RussiaStatus> = Object.fromEntries(
  (firms as Array<{ name: string; russiaStatus?: RussiaStatus }>).map((firm) => [
    outboundSlug(firm.name),
    firm.russiaStatus ?? 'unverified',
  ]),
)

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

export function russiaStatusFor(slugOrName: string): RussiaStatus {
  const slug = outboundSlug(slugOrName)
  const key = ALIASES[slug] ?? slug
  return EXTRA_RESTRICTED[key] ?? STATUS_BY_SLUG[key] ?? 'unverified'
}

/**
 * Dated Russia-access evidence (`firmAccess[].status` in
 * content/data/russian-market-evidence.json) that the /ru pages can stand
 * behind. 'restricted' must agree with the firm's `russiaStatus` (the badge
 * source); 'conflicting' is the pre-2026-10-20 FundedNext record, still
 * accepted because it never describes the firm as available. Anything else,
 * including 'available' or a missing record, is not a documented boundary.
 */
export function isRussiaAccessEvidenceDocumented(
  slugOrName: string,
  evidenceStatus: string | null | undefined,
): boolean {
  if (evidenceStatus === 'restricted') return russiaStatusFor(slugOrName) === 'restricted'
  return evidenceStatus === 'conflicting'
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
