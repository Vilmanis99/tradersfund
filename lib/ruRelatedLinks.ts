import { RUSSIAN_ROUTE_EDITORIAL_DATES, type RussianRoutePath } from './localizedRoutes.ts'

/**
 * Typed RU internal-link map (RU SEO Lead plan, 20.10.2026, §2–§5).
 *
 * - `compare`: comparison links. Phase 2 VerdictBox «Сравнить с…» / NextStep.
 * - `alternatives`: Russia alternatives. Only firms whose firms.json russiaStatus
 *   is `available` may sit here (scripts/test-ru-related-links.mjs, check c).
 * - `related`: the «Похожие материалы» block at the end of the page (≤6).
 * In-body links stay in page copy; an href must not appear in both
 * (scripts/audit-ru-links.mjs, check d).
 *
 * Every href is rendered through russianPublishedHref(), so planned pages stay
 * plain data until their route is registered in lib/localizedRoutes.ts and no
 * 404 links ship. Anchors carry no Russia-access claims: access is shown as a
 * badge from russiaStatus next to review links.
 */
export type RuLinkSlot = 'compare' | 'alternatives' | 'related'

export interface RuRelatedLink {
  href: string
  anchor: string
  slot: RuLinkSlot
}

/** Planned RU pages from plan §3 that already have link maps. Not routes yet. */
export const RU_UPCOMING_ROUTES = [
  '/ru/ftmo-vs-fundednext',
  '/ru/fundingpips-vs-bright-funded',
  '/ru/fundednext-vs-the5ers',
  '/ru/ftmo-vs-fundingpips',
  '/ru/obzor-the5ers',
  '/ru/obzor-crypto-fund-trader',
  '/ru/obzor-hash-hedge',
  '/ru/obzor-topstep',
  '/ru/fundingpips-pravila',
  '/ru/prop-kompanii-v-rossii',
  '/ru/prop-kompanii-otzyvy',
  '/ru/bright-funded-vs-crypto-fund-trader',
] as const

export type RuUpcomingPath = (typeof RU_UPCOMING_ROUTES)[number]
export type RuMapPath = RussianRoutePath | RuUpcomingPath

/** Max cards in the «Похожие материалы» block. */
export const RU_RELATED_MAX = 6

/**
 * Editorial rule from the plan: FundedNext is never offered as a Russia
 * option, whatever its russiaStatus. It stays linkable in comparison context.
 */
export const RU_NOT_A_RUSSIA_OPTION: ReadonlySet<string> = new Set(['fundednext'])

/**
 * Firm behind each RU review route. `firm` is the key russiaStatusFor() reads
 * from firms.json; `local` marks Russian firms that are not in firms.json.
 * Array order is the tie-break inside a russiaStatus group (plan §4.1:
 * BrightFunded → Crypto Fund Trader → Hash Hedge first). Which reviews appear
 * on the hubs comes from the registered routes, not from this list.
 */
export const RU_REVIEW_FIRMS: ReadonlyArray<{ path: string; firm: string; name: string; local?: true }> = [
  { path: '/ru/obzor-bright-funded', firm: 'bright-funded', name: 'BrightFunded' },
  { path: '/ru/obzor-crypto-fund-trader', firm: 'crypto-fund-trader', name: 'Crypto Fund Trader' },
  { path: '/ru/obzor-hash-hedge', firm: 'hash-hedge', name: 'Hash Hedge' },
  { path: '/ru/obzor-fundingpips', firm: 'fundingpips', name: 'FundingPips' },
  { path: '/ru/obzor-ftmo', firm: 'ftmo', name: 'FTMO' },
  { path: '/ru/obzor-fundednext', firm: 'fundednext', name: 'FundedNext' },
  { path: '/ru/obzor-the5ers', firm: 'the5ers', name: 'The5ers' },
  { path: '/ru/obzor-topstep', firm: 'topstep', name: 'Topstep' },
  { path: '/ru/obzor-teamtraders', firm: 'teamtraders', name: 'TeamTraders', local: true },
  { path: '/ru/obzor-kascapital', firm: 'kascapital', name: 'KasCapital', local: true },
  { path: '/ru/obzor-proplive', firm: 'proplive', name: 'PropLive', local: true },
  { path: '/ru/obzor-eratrade', firm: 'eratrade', name: 'Era Trade', local: true },
]

const cmp = (href: string, anchor: string): RuRelatedLink => ({ href, anchor, slot: 'compare' })
const alt = (href: string, anchor: string): RuRelatedLink => ({ href, anchor, slot: 'alternatives' })
const rel = (href: string, anchor: string): RuRelatedLink => ({ href, anchor, slot: 'related' })

/** BrightFunded first, then Crypto Fund Trader (plan §0, §4.2).
 *  Hash Hedge is deliberately NOT an 'alternatives' (= Russia option) entry while its russiaStatus is not 'available' (currently 'unclear');
 *  test:ru-related-links (c) enforces that. It is linked as a plain 'related' review instead. */
const RUSSIA_ALTERNATIVES = [
  alt('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
  alt('/ru/obzor-crypto-fund-trader', 'Crypto Fund Trader отзывы'),
]

export const RU_RELATED: Partial<Record<RuMapPath, RuRelatedLink[]>> = {
  // Live reviews (plan §2)
  '/ru/obzor-bright-funded': [
    cmp('/ru/fundednext-vs-bright-funded', 'BrightFunded или FundedNext: сравнение'),
    cmp('/ru/ftmo-vs-bright-funded', 'BrightFunded как альтернатива FTMO'),
    alt('/ru/obzor-crypto-fund-trader', 'Crypto Fund Trader отзывы'),
    rel('/ru/obzor-hash-hedge', 'Крипто-проп Hash Hedge'),
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
    rel('/ru/luchshie-kripto-prop-firmy', 'Проп-трейдинг криптовалют'),
    rel('/ru/prop-firmy-s-ctrader', 'Проп-фирмы с cTrader'),
    rel('/ru/forex-prop-firmy', 'Форекс проп компании'),
    rel('/ru/prop-trejding', 'Что такое проп-трейдинг'),
  ],
  '/ru/obzor-fundednext': [
    cmp('/ru/fundednext-vs-bright-funded', 'FundedNext или BrightFunded'),
    cmp('/ru/fundednext-vs-fundingpips', 'FundedNext против FundingPips'),
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/ftmo-vs-fundednext', 'FTMO или FundedNext'),
    rel('/ru/funded-account', 'Funded account: что это'),
    rel('/ru/kak-rabotayut-chellendzhi-prop-firm', 'Как работают челленджи'),
    rel('/ru/vyplaty-prop-firm', 'Как платят проп-фирмы'),
  ],
  '/ru/obzor-ftmo': [
    cmp('/ru/ftmo-vs-bright-funded', 'FTMO или BrightFunded'),
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/ftmo-vs-fundednext', 'ФТМО или FundedNext'),
    rel('/ru/ftmo-vs-fundingpips', 'FTMO против FundingPips'),
    rel('/ru/forex-prop-firmy', 'Форекс проп компании'),
    rel('/ru/kak-rabotayut-chellendzhi-prop-firm', 'Как устроен челлендж'),
    rel('/ru/otzyvy-prop-firm', 'Отзывы о проп-фирмах'),
    rel('/ru/vyplaty-prop-firm', 'Выплаты проп-фирм'),
  ],
  '/ru/obzor-fundingpips': [
    cmp('/ru/fundednext-vs-fundingpips', 'Фандинг Пипс или FundedNext'),
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
    rel('/ru/ftmo-vs-fundingpips', 'FTMO или FundingPips'),
    rel('/ru/obzor-ftmo', 'ФТМО отзывы'),
    rel('/ru/prop-firmy-s-ctrader', 'Проп фирмы с cTrader'),
    rel('/ru/forex-prop-firmy', 'Форекс проп компании'),
    rel('/ru/kak-rabotayut-chellendzhi-prop-firm', 'Как работают челленджи'),
  ],
  '/ru/obzor-eratrade': [
    alt('/ru/obzor-bright-funded', 'Международная альтернатива — BrightFunded'),
    alt('/ru/obzor-crypto-fund-trader', 'Crypto Fund Trader'),
    rel('/ru/prop-kompanii-v-rossii', 'Проп компании в России'),
    rel('/ru/obzor-kascapital', 'Обзор KasCapital'),
    rel('/ru/obzor-teamtraders', 'TeamTraders: условия отбора'),
    rel('/ru/prop-trejding', 'Что такое проп-трейдинг'),
  ],
  '/ru/obzor-kascapital': [
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/prop-kompanii-v-rossii', 'Проп-компании для трейдеров в России'),
    rel('/ru/obzor-proplive', 'Обзор PropLive'),
    rel('/ru/prop-trejding', 'Что такое проп-трейдинг'),
    rel('/ru/funded-account', 'Funded account'),
  ],
  '/ru/obzor-proplive': [
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/prop-kompanii-v-rossii', 'Российские проп компании'),
    rel('/ru/obzor-kascapital', 'KasCapital отзывы'),
    rel('/ru/funded-account', 'Funded account'),
    rel('/ru/prop-trejding', 'Проп-трейдинг без вложений: как устроен'),
  ],
  '/ru/obzor-teamtraders': [
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/prop-kompanii-v-rossii', 'Проп трейдинг в России'),
    rel('/ru/obzor-eratrade', 'Обзор Era Trade'),
    rel('/ru/obzor-proplive', 'PropLive: условия'),
    rel('/ru/obzor-kascapital', 'Обзор KasCapital'),
    rel('/ru/vyplaty-prop-firm', 'Как платят проп-компании'),
  ],

  // Live comparisons (plan §2)
  '/ru/fundednext-vs-bright-funded': [
    cmp('/ru/obzor-bright-funded', 'Подробный обзор BrightFunded'),
    cmp('/ru/obzor-fundednext', 'Обзор FundedNext'),
    rel('/ru/ftmo-vs-bright-funded', 'BrightFunded против FTMO'),
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
    rel('/ru/obzor-crypto-fund-trader', 'Обзор Crypto Fund Trader'),
    rel('/ru/fundednext-vs-fundingpips', 'FundedNext или FundingPips'),
    rel('/ru/promokody-prop-firm', 'Промокоды BrightFunded'),
  ],
  '/ru/fundednext-vs-fundingpips': [
    cmp('/ru/obzor-fundingpips', 'FundingPips отзывы'),
    cmp('/ru/obzor-fundednext', 'Обзор FundedNext'),
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
    rel('/ru/ftmo-vs-fundingpips', 'FTMO против FundingPips'),
    rel('/ru/vyplaty-prop-firm', 'Сравнение выплат проп-фирм'),
    rel('/ru/promokody-prop-firm', 'Промокоды проп-фирм'),
    rel('/ru/forex-prop-firmy', 'Форекс проп компании'),
  ],
  '/ru/ftmo-vs-bright-funded': [
    cmp('/ru/obzor-ftmo', 'Обзор FTMO'),
    cmp('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    rel('/ru/ftmo-vs-fundednext', 'FTMO или FundedNext'),
    rel('/ru/ftmo-vs-fundingpips', 'FTMO против FundingPips'),
    rel('/ru/obzor-crypto-fund-trader', 'Обзор Crypto Fund Trader'),
    rel('/ru/forex-prop-firmy', 'Форекс проп компании'),
    rel('/ru/vyplaty-prop-firm', 'Выплаты проп-фирм'),
    rel('/ru/kak-rabotayut-chellendzhi-prop-firm', 'Как работают челленджи'),
  ],

  // Planned pages (plan §3); they switch on when each route is registered.
  '/ru/ftmo-vs-fundednext': [
    cmp('/ru/obzor-ftmo', 'Обзор FTMO'),
    cmp('/ru/obzor-fundednext', 'Обзор FundedNext'),
    alt('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    rel('/ru/ftmo-vs-bright-funded', 'Чем заменить FTMO: сравнение с BrightFunded'),
    rel('/ru/fundednext-vs-bright-funded', 'FundedNext или BrightFunded'),
  ],
  '/ru/fundingpips-vs-bright-funded': [
    cmp('/ru/obzor-fundingpips', 'Обзор FundingPips'),
    cmp('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    rel('/ru/fundednext-vs-fundingpips', 'FundedNext или FundingPips'),
    rel('/ru/ftmo-vs-bright-funded', 'FTMO или BrightFunded'),
    rel('/ru/obzor-crypto-fund-trader', 'Обзор Crypto Fund Trader'),
  ],
  '/ru/fundednext-vs-the5ers': [
    cmp('/ru/obzor-fundednext', 'Обзор FundedNext'),
    cmp('/ru/obzor-the5ers', 'The5ers отзывы'),
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/fundednext-vs-bright-funded', 'FundedNext или BrightFunded'),
  ],
  '/ru/ftmo-vs-fundingpips': [
    cmp('/ru/obzor-ftmo', 'Обзор FTMO'),
    cmp('/ru/obzor-fundingpips', 'Обзор FundingPips'),
    alt('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    rel('/ru/ftmo-vs-bright-funded', 'FTMO или BrightFunded'),
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
  ],
  '/ru/obzor-the5ers': [
    cmp('/ru/fundednext-vs-the5ers', 'FundedNext или The5ers'),
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/luchshie-prop-firmy', 'Рейтинг проп-компаний'),
    rel('/ru/dlya-russkoyazychnykh-treyderov', 'Проп-фирмы для русскоязычных трейдеров'),
  ],
  '/ru/obzor-crypto-fund-trader': [
    cmp('/ru/bright-funded-vs-crypto-fund-trader', 'BrightFunded или Crypto Fund Trader'),
    alt('/ru/obzor-bright-funded', 'BrightFunded'),
    rel('/ru/obzor-hash-hedge', 'Hash Hedge отзывы'),
    rel('/ru/luchshie-kripto-prop-firmy', 'Крипто проп компании'),
    rel('/ru/prop-firmy-bez-kyc', 'Проп-фирмы и KYC'),
  ],
  '/ru/obzor-hash-hedge': [
    alt('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    alt('/ru/obzor-crypto-fund-trader', 'CFT проп'),
    rel('/ru/luchshie-kripto-prop-firmy', 'Проп-трейдинг криптовалют'),
    rel('/ru/prop-firmy-bez-kyc', 'Проп без KYC'),
    rel('/ru/prop-kompanii-v-rossii', 'Проп компании в России'),
  ],
  '/ru/obzor-topstep': [
    ...RUSSIA_ALTERNATIVES,
    rel('/ru/luchshie-prop-firmy', 'Рейтинг проп-компаний'),
    rel('/ru/otzyvy-prop-firm', 'Отзывы о проп-фирмах'),
  ],
  '/ru/fundingpips-pravila': [
    alt('/ru/obzor-bright-funded', 'Обзор BrightFunded'),
    rel('/ru/fundednext-vs-fundingpips', 'FundedNext или FundingPips'),
    rel('/ru/fundingpips-vs-bright-funded', 'FundingPips или BrightFunded'),
    rel('/ru/kak-rabotayut-chellendzhi-prop-firm', 'Как работают челленджи'),
  ],
}

export function isRuRegisteredPath(href: string): boolean {
  return Object.prototype.hasOwnProperty.call(RUSSIAN_ROUTE_EDITORIAL_DATES, href.split('#')[0])
}

/** Map entries for one page and slot, keeping only registered (live) targets. */
export function ruPublishedLinks(path: string, slot: RuLinkSlot): RuRelatedLink[] {
  const links = RU_RELATED[path as RuMapPath] ?? []
  return links.filter(link => link.slot === slot && isRuRegisteredPath(link.href)).slice(0, slot === 'related' ? RU_RELATED_MAX : undefined)
}

export function ruReviewFirmFor(path: string) {
  return RU_REVIEW_FIRMS.find(item => item.path === path)
}

export type RuStatusLike = 'available' | 'restricted' | 'unclear' | 'unverified'

/**
 * Hub order (plan §4.1): open for RF first, then unclear, then restricted,
 * then unverified, then local Russian firms. Firms in RU_NOT_A_RUSSIA_OPTION
 * never sort into the "open" group. Status comes from the caller (firms.json
 * russiaStatus via russiaStatusFor) so this file stays data-free.
 */
export function ruReviewRank(item: { firm: string; local?: true }, status: RuStatusLike): number {
  if (item.local) return 4
  if (status === 'available') return RU_NOT_A_RUSSIA_OPTION.has(item.firm) ? 2 : 0
  if (status === 'unclear') return 1
  if (status === 'restricted') return 2
  return 3
}

/** Registered /ru/obzor-* routes with their firm, sorted for the hub list. */
export function ruAllReviews(statusFor: (firm: string) => RuStatusLike) {
  const order = new Map(RU_REVIEW_FIRMS.map((item, index) => [item.path, index]))
  return Object.keys(RUSSIAN_ROUTE_EDITORIAL_DATES)
    .filter(path => path.startsWith('/ru/obzor-'))
    .map(path => {
      const known = ruReviewFirmFor(path)
      const firm = known?.firm ?? path.replace('/ru/obzor-', '')
      const status = statusFor(firm)
      return { path, firm, name: known?.name ?? firm, local: known?.local, status, known: Boolean(known) }
    })
    .sort((a, b) => ruReviewRank(a, a.status) - ruReviewRank(b, b.status)
      || (order.get(a.path) ?? 999) - (order.get(b.path) ?? 999)
      || a.path.localeCompare(b.path))
}
