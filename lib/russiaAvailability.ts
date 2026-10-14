import firms from '@/content/data/firms.json'
import { outboundSlug } from '@/lib/outboundDestinations'

/**
 * Russia availability gate for /ru pages.
 *
 * Source of truth: `russiaStatus` in content/data/firms.json (populated from
 * the 2026-10-14 ru-availability check). Firms marked `restricted` or
 * `unclear` must not get a sign-up CTA or /go/ link on Russian pages.
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

/** True when a /ru page must hide sign-up CTAs and /go/ links for this firm. */
export function isHiddenOnRussianPages(slugOrName: string): boolean {
  const status = russiaStatusFor(slugOrName)
  return status === 'restricted' || status === 'unclear'
}

/** /go/ href for RU pages, or null when the firm is hidden for Russia. */
export function ruGoHref(slug: string, from: string): string | null {
  return isHiddenOnRussianPages(slug) ? null : `/go/${slug}?from=${from}`
}

export const RUSSIA_ALTERNATIVES = [
  { name: 'Upscale', href: 'https://upscale.trade/ru/', external: true, sponsored: false },
  { name: 'Crypto Fund Trader', href: '/go/crypto-fund-trader?from=ru-restricted-alternatives', external: false, sponsored: true },
  { name: 'BrightFunded', href: '/ru/obzor-bright-funded', external: false, sponsored: false },
  { name: 'FundedNext CFD', href: '/ru/obzor-fundednext', external: false, sponsored: false },
] as const
