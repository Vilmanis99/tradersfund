export const LOCALIZED_ROUTE_PAIRS = [
  { en: '/', ru: '/ru' },
  { en: '/best-prop-firms-2026', ru: '/ru/luchshie-prop-firmy' },
  { en: '/best-crypto-prop-firms', ru: '/ru/luchshie-kripto-prop-firmy' },
  { en: '/blog/fundednext-review', ru: '/ru/obzor-fundednext' },
  { en: '/blog/funding-pips-review', ru: '/ru/obzor-fundingpips' },
  { en: '/blog/bright-funded-prop-firm', ru: '/ru/obzor-bright-funded' },
  {
    en: '/how-prop-firm-challenges-work',
    ru: '/ru/kak-rabotayut-chellendzhi-prop-firm',
  },
] as const

export const RUSSIAN_ONLY_ROUTES = [
  '/ru/dlya-russkoyazychnykh-treyderov',
  '/ru/fundednext-vs-fundingpips',
  '/ru/promokody-prop-firm',
  '/ru/rossiyskie-prop-kompanii',
] as const

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
