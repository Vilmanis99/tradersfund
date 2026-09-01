export const LOCALIZED_ROUTE_PAIRS = [
  { en: '/', ru: '/ru' },
  { en: '/best-prop-firms-2026', ru: '/ru/luchshie-prop-firmy' },
  { en: '/best-crypto-prop-firms', ru: '/ru/luchshie-kripto-prop-firmy' },
  { en: '/best-instant-funding-prop-firms', ru: '/ru/prop-firmy-bez-chelendzha' },
  { en: '/compare/bright-funded-vs-fundednext', ru: '/ru/fundednext-vs-bright-funded' },
  { en: '/compare/fundednext-vs-fundingpips', ru: '/ru/fundednext-vs-fundingpips' },
  { en: '/prop-firm-discount-codes', ru: '/ru/promokody-prop-firm' },
  { en: '/blog/ftmo-review', ru: '/ru/obzor-ftmo' },
  { en: '/blog/fundednext-review', ru: '/ru/obzor-fundednext' },
  { en: '/blog/funding-pips-review', ru: '/ru/obzor-fundingpips' },
  { en: '/blog/bright-funded-prop-firm', ru: '/ru/obzor-bright-funded' },
  { en: '/blog/what-is-a-prop-firm', ru: '/ru/chto-takoe-prop-firma' },
  {
    en: '/how-prop-firm-challenges-work',
    ru: '/ru/kak-rabotayut-chellendzhi-prop-firm',
  },
] as const

export const RUSSIAN_ONLY_ROUTES = [
  '/ru/dlya-russkoyazychnykh-treyderov',
  '/ru/forex-prop-firmy',
  '/ru/prop-firmy-s-ctrader',
  '/ru/fundednext-mt5',
  '/ru/fundednext-stellar-instant',
  '/ru/rossiyskie-prop-kompanii',
  '/ru/vyplaty-prop-firm',
  '/ru/prop-firmy-bez-kyc',
  '/ru/obzor-proplive',
  '/ru/obzor-eratrade',
  '/ru/obzor-kascapital',
  '/ru/obzor-teamtraders',
  '/ru/otzyvy-prop-firm',
] as const

export type RussianRoutePath =
  | (typeof LOCALIZED_ROUTE_PAIRS)[number]['ru']
  | (typeof RUSSIAN_ONLY_ROUTES)[number]

// Route-level editorial dates for sitemap lastmod. Update one entry only when
// that page changes materially; product/evidence freshness is tracked
// separately in app/sitemap.ts. Never replace these with the deployment date.
export const RUSSIAN_ROUTE_EDITORIAL_DATES = {
  '/ru': '2026-09-01',
  '/ru/chto-takoe-prop-firma': '2026-08-28',
  '/ru/dlya-russkoyazychnykh-treyderov': '2026-09-01',
  '/ru/forex-prop-firmy': '2026-08-28',
  '/ru/fundednext-mt5': '2026-08-31',
  '/ru/fundednext-stellar-instant': '2026-08-31',
  '/ru/fundednext-vs-bright-funded': '2026-08-31',
  '/ru/fundednext-vs-fundingpips': '2026-08-24',
  '/ru/kak-rabotayut-chellendzhi-prop-firm': '2026-08-28',
  '/ru/luchshie-kripto-prop-firmy': '2026-08-28',
  '/ru/luchshie-prop-firmy': '2026-08-28',
  '/ru/obzor-bright-funded': '2026-09-01',
  '/ru/obzor-eratrade': '2026-09-01',
  '/ru/obzor-ftmo': '2026-08-28',
  '/ru/obzor-fundednext': '2026-08-31',
  '/ru/obzor-fundingpips': '2026-08-27',
  '/ru/obzor-kascapital': '2026-09-01',
  '/ru/obzor-proplive': '2026-09-01',
  '/ru/obzor-teamtraders': '2026-08-28',
  '/ru/otzyvy-prop-firm': '2026-08-28',
  '/ru/promokody-prop-firm': '2026-09-01',
  '/ru/prop-firmy-bez-chelendzha': '2026-08-31',
  '/ru/prop-firmy-bez-kyc': '2026-08-28',
  '/ru/prop-firmy-s-ctrader': '2026-08-28',
  '/ru/rossiyskie-prop-kompanii': '2026-09-01',
  '/ru/vyplaty-prop-firm': '2026-09-01',
} as const satisfies Record<RussianRoutePath, string>

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

export function getAlternateLanguageHref(pathname: string): string {
  const pair = getLocalizedRoutePair(pathname)
  if (pair) return pathname === pair.ru ? pair.en : pair.ru
  return pathname === '/ru' || pathname.startsWith('/ru/') ? '/' : '/ru'
}
