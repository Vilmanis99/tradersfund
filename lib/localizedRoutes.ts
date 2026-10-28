export const LOCALIZED_ROUTE_PAIRS = [
  { en: '/', ru: '/ru' },
  { en: '/best-prop-firms-2026', ru: '/ru/luchshie-prop-firmy' },
  { en: '/best-crypto-prop-firms', ru: '/ru/luchshie-kripto-prop-firmy' },
  { en: '/best-instant-funding-prop-firms', ru: '/ru/prop-firmy-bez-chelendzha' },
  { en: '/compare/bright-funded-vs-fundednext', ru: '/ru/fundednext-vs-bright-funded' },
  { en: '/compare/fundednext-vs-fundingpips', ru: '/ru/fundednext-vs-fundingpips' },
  { en: '/compare/bright-funded-vs-fundingpips', ru: '/ru/fundingpips-vs-bright-funded' },
  { en: '/compare/bright-funded-vs-ftmo', ru: '/ru/ftmo-vs-bright-funded' },
  { en: '/compare/ftmo-vs-fundednext', ru: '/ru/ftmo-vs-fundednext' },
  { en: '/prop-firm-discount-codes', ru: '/ru/promokody-prop-firm' },
  { en: '/blog/ftmo-review', ru: '/ru/obzor-ftmo' },
  { en: '/blog/fundednext-review', ru: '/ru/obzor-fundednext' },
  { en: '/blog/funding-pips-review', ru: '/ru/obzor-fundingpips' },
  { en: '/blog/bright-funded-prop-firm', ru: '/ru/obzor-bright-funded' },
  { en: '/blog/the5ers-review', ru: '/ru/obzor-the5ers' },
  { en: '/blog/crypto-fund-trader-review', ru: '/ru/obzor-crypto-fund-trader' },
  { en: '/blog/hash-hedge-review', ru: '/ru/obzor-hash-hedge' },
  { en: '/blog/what-is-a-prop-firm', ru: '/ru/chto-takoe-prop-firma' },
  {
    en: '/how-prop-firm-challenges-work',
    ru: '/ru/kak-rabotayut-chellendzhi-prop-firm',
  },
  // Trust page; RU copy in content/data/ru-how-we-make-money.json.
  { en: '/how-we-make-money', ru: '/ru/kak-my-zarabatyvaem' },
] as const

export const RUSSIAN_ONLY_ROUTES = [
  '/ru/dlya-russkoyazychnykh-treyderov',
  '/ru/prop-trejding',
  '/ru/forex-prop-firmy',
  '/ru/prop-firmy-s-ctrader',
  '/ru/fundednext-mt5',
  '/ru/funded-account',
  '/ru/fundednext-stellar-instant',
  '/ru/vyplaty-prop-firm',
  '/ru/prop-firmy-bez-kyc',
  '/ru/obzor-proplive',
  '/ru/obzor-eratrade',
  '/ru/obzor-kascapital',
  '/ru/obzor-teamtraders',
  '/ru/otzyvy-prop-firm',
  '/ru/ftmo-dlya-rossiyan',
  '/ru/fundingpips-pravila',
] as const

/**
 * Planned Russian routes: reserved slugs whose pages are not written yet.
 * They are NOT in the sitemap or linked anywhere until app/ru/<slug>/page.tsx
 * exists (see lib/russianPlannedRoutes.ts and docs/ru-writer-new-pages.md).
 * To publish one, move it into RUSSIAN_ONLY_ROUTES and RUSSIAN_ROUTE_EDITORIAL_DATES.
 */
// Empty since /ru/prop-trejding and /ru/funded-account were published (both are in
// RUSSIAN_ONLY_ROUTES and RUSSIAN_ROUTE_EDITORIAL_DATES); add new reserved slugs here.
export const RUSSIAN_PLANNED_ROUTES: readonly `/ru/${string}`[] = []

/**
 * RU version of /prop-firms/closed. The slug lives only in this constant (the page folder
 * app/ru/zakrytye-prop-firmy must match it; a rename is this line plus `git mv` of that folder).
 * Deliberately NOT in LOCALIZED_ROUTE_PAIRS / RUSSIAN_ONLY_ROUTES: the pair, sitemap entry,
 * hreflang, footer link and inlinks are gated by CLOSED_FIRMS_PUBLISHED (content/data/closed-firms.json)
 * through lib/closedFirms.ts, so the RU page stays noindex and unlinked exactly as long as the EN page.
 */
export const RU_CLOSED_FIRMS_PATH = '/ru/zakrytye-prop-firmy'
export const CLOSED_FIRMS_ROUTE_PAIR = { en: '/prop-firms/closed', ru: RU_CLOSED_FIRMS_PATH } as const

/**
 * The EN<->RU closed-firms pair for `pathname` when the list is `published`, otherwise undefined.
 * Pure (no data imports) so the client HeaderNav can use it with the flag passed in as a prop;
 * lib/closedFirms.ts closedFirmsRoutePair() applies it to CLOSED_FIRMS_PUBLISHED.
 */
export function closedFirmsPairFor(pathname: string, published: boolean): typeof CLOSED_FIRMS_ROUTE_PAIR | undefined {
  if (!published) return undefined
  return pathname === CLOSED_FIRMS_ROUTE_PAIR.en || pathname === CLOSED_FIRMS_ROUTE_PAIR.ru ? CLOSED_FIRMS_ROUTE_PAIR : undefined
}
/** Editorial date of the RU closed-firms page (sitemap lastmod floor and Article dateModified). */
export const RU_CLOSED_FIRMS_EDITORIAL_DATE = '2026-10-20'

export type RussianPlannedRoutePath = (typeof RUSSIAN_PLANNED_ROUTES)[number]

/** Editorial date per planned route; null until the writer publishes the page. */
export const RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES: Partial<Record<RussianPlannedRoutePath, string | null>> = {}

export type RussianRoutePath =
  | (typeof LOCALIZED_ROUTE_PAIRS)[number]['ru']
  | (typeof RUSSIAN_ONLY_ROUTES)[number]

// Route-level editorial dates for sitemap lastmod. Update one entry only when
// that page changes materially; product/evidence freshness is tracked
// separately in app/sitemap.ts. Never replace these with the deployment date.
export const RUSSIAN_ROUTE_EDITORIAL_DATES = {
  '/ru': '2026-10-20',
  '/ru/chto-takoe-prop-firma': '2026-10-20',
  '/ru/dlya-russkoyazychnykh-treyderov': '2026-10-20',
  '/ru/forex-prop-firmy': '2026-10-20',
  '/ru/fundednext-mt5': '2026-10-20',
  '/ru/funded-account': '2026-10-20',
  '/ru/fundednext-stellar-instant': '2026-10-20',
  '/ru/fundednext-vs-bright-funded': '2026-10-20',
  '/ru/ftmo-dlya-rossiyan': '2026-10-20',
  '/ru/ftmo-vs-bright-funded': '2026-10-20',
  '/ru/ftmo-vs-fundednext': '2026-10-21',
  '/ru/fundednext-vs-fundingpips': '2026-10-20',
  '/ru/fundingpips-vs-bright-funded': '2026-10-21',
  '/ru/fundingpips-pravila': '2026-10-28',
  '/ru/kak-my-zarabatyvaem': '2026-10-20',
  '/ru/kak-rabotayut-chellendzhi-prop-firm': '2026-10-14',
  '/ru/luchshie-kripto-prop-firmy': '2026-10-21',
  '/ru/luchshie-prop-firmy': '2026-10-20',
  '/ru/obzor-bright-funded': '2026-10-19',
  '/ru/obzor-crypto-fund-trader': '2026-10-26',
  '/ru/obzor-eratrade': '2026-10-20',
  '/ru/obzor-ftmo': '2026-10-20',
  '/ru/obzor-fundednext': '2026-10-20',
  '/ru/obzor-fundingpips': '2026-10-28',
  '/ru/obzor-hash-hedge': '2026-10-27',
  '/ru/obzor-kascapital': '2026-10-20',
  '/ru/obzor-proplive': '2026-10-20',
  '/ru/obzor-teamtraders': '2026-10-20',
  '/ru/obzor-the5ers': '2026-10-23',
  '/ru/otzyvy-prop-firm': '2026-10-20',
  '/ru/prop-trejding': '2026-10-20',
  '/ru/promokody-prop-firm': '2026-10-20',
  '/ru/prop-firmy-bez-chelendzha': '2026-10-20',
  '/ru/prop-firmy-bez-kyc': '2026-10-20',
  '/ru/prop-firmy-s-ctrader': '2026-10-20',
  '/ru/vyplaty-prop-firm': '2026-10-20',
} as const satisfies Record<RussianRoutePath, string>

/** Internal href for a Russian route only once it is registered above; null for unreleased pages. */
export function russianPublishedHref(href: string): string | null {
  return isRussianRoutePath(href.split('#')[0]) ? href : null
}

export function isRussianRoutePath(pathname: string): pathname is RussianRoutePath {
  return Object.prototype.hasOwnProperty.call(RUSSIAN_ROUTE_EDITORIAL_DATES, pathname)
}

export function russianRouteLastModified(
  pathname: RussianRoutePath,
  dataDate?: string | Date | null,
): Date {
  const editorialTime = new Date(
    `${RUSSIAN_ROUTE_EDITORIAL_DATES[pathname]}T00:00:00Z`,
  ).getTime()
  const candidateTime = dataDate == null ? Number.NaN : new Date(dataDate).getTime()
  return new Date(Math.max(
    editorialTime,
    Number.isFinite(candidateTime) ? candidateTime : editorialTime,
  ))
}

export function russianRouteDateModified(
  pathname: RussianRoutePath,
  dataDate?: string | Date | null,
): string {
  return russianRouteLastModified(pathname, dataDate).toISOString().slice(0, 10)
}

export type LocalizedRoutePair = (typeof LOCALIZED_ROUTE_PAIRS)[number]

export function getLocalizedRoutePair(pathname: string): LocalizedRoutePair | undefined {
  return LOCALIZED_ROUTE_PAIRS.find(pair => pair.en === pathname || pair.ru === pathname)
}

export function getLanguageAlternates(pathname: string) {
  const pair = getLocalizedRoutePair(pathname)
  if (!pair) return undefined
  return {
    en: pair.en,
    ru: pair.ru,
    'x-default': pair.en,
  }
}

/**
 * Rules pages (lib/rulesPages.ts): EN /prop-firms/<slug>/rules and its RU twin.
 * Template twins always exist as pages (noindex until complete); hand-written
 * RU rules pages count only once registered above. Paths only, so the client
 * language switcher can use them; hreflang/sitemap pairing is data-gated in
 * lib/rulesPages.ts rulesRoutePair().
 */
export const RU_RULES_TEMPLATE_SLUGS = ['bright-funded', 'crypto-fund-trader', 'ftmo', 'fundednext'] as const
/**
 * Hand-written RU rules pages that exist on this stack. Every entry must answer
 * 200 (npm run test:ru-rules-routes). /ru/fundingpips-pravila ships from
 * content/ru-fundingpips-rules (RU Writer, 28.10.2026).
 */
export const RU_RULES_HANDWRITTEN: Readonly<Record<string, string>> = {
  fundingpips: '/ru/fundingpips-pravila',
}

function rulesSwitchHref(pathname: string): string | null {
  const en = /^\/prop-firms\/([a-z0-9-]+)\/rules$/.exec(pathname)
  if (en) {
    const slug = en[1]
    if ((RU_RULES_TEMPLATE_SLUGS as readonly string[]).includes(slug)) return `/ru/${slug}-pravila`
    const handwritten = RU_RULES_HANDWRITTEN[slug]
    return handwritten && isRussianRoutePath(handwritten) ? handwritten : null
  }
  const ru = /^\/ru\/([a-z0-9-]+)-pravila$/.exec(pathname)
  if (ru) {
    const slug = ru[1]
    const known = (RU_RULES_TEMPLATE_SLUGS as readonly string[]).includes(slug)
      || RU_RULES_HANDWRITTEN[slug] === pathname
    return known ? `/prop-firms/${slug}/rules` : null
  }
  return null
}

export function getAlternateLanguageHref(pathname: string): string {
  const pair = getLocalizedRoutePair(pathname)
  if (pair) return pathname === pair.ru ? pair.en : pair.ru
  const rules = rulesSwitchHref(pathname)
  if (rules) return rules
  return pathname === '/ru' || pathname.startsWith('/ru/') ? '/' : '/ru'
}
