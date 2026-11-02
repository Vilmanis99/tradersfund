// Explicit extensions keep this module executable from the Node test scripts.
import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
  type EvaluationTimeLimit,
  type Firm,
  type PayoutFrequency,
  type RuleAvailability,
} from './firms.ts'
import { firmSlug } from './firmSlug.ts'
import { loadVerdict, type Verdict } from './verdicts.ts'

/**
 * Reusable "best prop firms for X" pages (W45).
 *
 * Slugs live in BEST_FOR_SLUGS (per id × language). null = no route for that
 * language (404 / not built). Flat paths only — nested hubs must 404.
 *
 * Index gate (per language, independent): writer verdict AND ≥5 differing
 * comparison fields across ≥2 ranked firms. Hreflang only when BOTH langs pass.
 *
 * Sort rules are explicit per id (see BEST_FOR_SORT_RULES) and rendered on the
 * page. Affiliate status never affects order.
 */

export const BEST_FOR_MIN_DIFF_FIELDS = 5
export const BEST_FOR_MIN_FIRMS = 2

/** Beginners thresholds — RU SEO Lead's final call. */
export const BEGINNER_MAX_MIN_TRADING_DAYS = 5
/** Default $99 ≈ ~p40 of published accountSizes.priceUsd (p25≈59, p50≈110). */
export const BEGINNER_MAX_ENTRY_PRICE_USD = 99
export const BEGINNER_ALLOWED_DRAWDOWN_TYPES = ['static', 'eod-trailing'] as const

export type BestForLang = 'en' | 'ru'
export type BestForRussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

export type BestForUseCaseId =
  | 'eas'
  | 'news-trading'
  | 'scalping'
  | 'beginners'
  | 'weekly-payouts'
  | 'no-time-limit'
  | 'low-drawdown'
  | 'small-accounts'

/**
 * Per-language URL slugs (path segment after / or /ru/).
 * Writers / RU SEO Lead edit here — null means that language has no page.
 */
export const BEST_FOR_SLUGS: Record<BestForUseCaseId, { en: string | null; ru: string | null }> = {
  eas: { en: 'best-prop-firms-for-eas', ru: 'luchshie-prop-firmy-dlya-sovetnikov' },
  'news-trading': {
    en: 'best-prop-firms-for-news-trading',
    ru: 'luchshie-prop-firmy-dlya-torgovli-na-novostyakh',
  },
  scalping: { en: 'best-prop-firms-for-scalping', ru: 'luchshie-prop-firmy-dlya-skalpinga' },
  beginners: { en: 'best-prop-firms-for-beginners', ru: 'luchshie-prop-firmy-dlya-novichkov' },
  // EN unset: would duplicate /blog/prop-firms-with-weekly-payouts
  'weekly-payouts': { en: null, ru: 'luchshie-prop-firmy-s-ezhenedelnymi-vyplatami' },
  'no-time-limit': {
    en: 'best-prop-firms-for-no-time-limit',
    ru: 'luchshie-prop-firmy-bez-limita-vremeni',
  },
  // RU unset until RU SEO Lead supplies slugs
  'low-drawdown': { en: 'best-prop-firms-for-low-drawdown', ru: null },
  'small-accounts': { en: 'best-prop-firms-for-small-accounts', ru: null },
}

/** Visible "How we ranked" copy — must match the comparator exactly. */
export const BEST_FOR_SORT_RULES: Record<BestForUseCaseId, { en: string; ru: string }> = {
  eas: {
    en: 'How we ranked: highest profit split first, then fewest min trading days, then firm name A–Z. Editorial score and affiliate status are not used.',
    ru: 'Как ранжируем: сначала больший сплит, затем меньший минимум торговых дней, затем имя A–Z. Редакционный скор и партнёрский статус не влияют.',
  },
  'news-trading': {
    en: 'How we ranked: highest profit split first, then fewest days to first payout, then firm name A–Z. Affiliate status is not used.',
    ru: 'Как ранжируем: сначала больший сплит, затем меньше дней до первой выплаты, затем имя A–Z. Партнёрский статус не влияет.',
  },
  scalping: {
    en: 'How we ranked: products with minHoldSeconds = 0 first (explicitly no minimum hold), then highest profit split, then firm name A–Z. When minHoldSeconds is absent we fall back to a labelled proxy; null never ranks as zero.',
    ru: 'Как ранжируем: сначала продукты с minHoldSeconds = 0 (явный «без минимума»), затем больший сплит, затем имя A–Z. Если поля ещё нет — помеченный прокси; null никогда не равен нулю.',
  },
  beginners: {
    en: 'How we ranked: lowest USD entry fee first, then fewest min trading days, then firm name A–Z among firms that pass the beginners filter. Affiliate status is not used.',
    ru: 'Как ранжируем: сначала низкий вход в USD, затем меньший минимум дней, затем имя A–Z среди фирм, прошедших фильтр для новичков. Партнёрский статус не влияет.',
  },
  'weekly-payouts': {
    en: 'How we ranked: highest profit split first, then fewest days to first payout, then firm name A–Z. Only payoutFrequency = weekly qualifies.',
    ru: 'Как ранжируем: сначала больший сплит, затем меньше дней до первой выплаты, затем имя A–Z. Подходит только payoutFrequency = weekly.',
  },
  'no-time-limit': {
    en: 'How we ranked: highest profit split first, then fewest min trading days, then firm name A–Z among products with an unlimited evaluation time limit.',
    ru: 'Как ранжируем: сначала больший сплит, затем меньший минимум дней, затем имя A–Z среди продуктов без лимита срока оценки.',
  },
  'low-drawdown': {
    en: 'How we ranked: among %-based products, lowest maxLossPct first, then lowest dailyLossPct, then firm name A–Z. USD-cap (futures) products are listed in a separate unranked group — dollar caps are never converted to %.',
    ru: 'Как ранжируем: среди продуктов с % — сначала меньший maxLossPct, затем dailyLossPct, затем имя A–Z. Продукты с USD-капами (фьючерсы) — отдельная группа без ранга; доллары в % не переводим.',
  },
  'small-accounts': {
    en: 'How we ranked: smallest available accountSizes.sizeUsd first, then highest profit split, then firm name A–Z. Price is not used for this ranking.',
    ru: 'Как ранжируем: сначала наименьший accountSizes.sizeUsd, затем больший сплит, затем имя A–Z. Цена в этом рейтинге не используется.',
  },
}

export type BestForFieldKey =
  | 'profitSplitPct'
  | 'drawdownType'
  | 'payoutFrequency'
  | 'payoutFirstDays'
  | 'eaAllowed'
  | 'newsTradingAllowed'
  | 'platforms'
  | 'minTradingDays'
  | 'maxTradingDays'
  | 'consistencyRule'
  | 'phases'
  | 'entryPriceUsd'
  | 'minHoldSeconds'
  | 'maxLossPct'
  | 'dailyLossPct'
  | 'smallestAccountUsd'
  | 'maxLossUsd'
  | 'dailyLossUsd'

export interface BestForFieldSpec {
  key: BestForFieldKey
  label: { en: string; ru: string }
  read: (firm: Firm, products: Challenge[]) => string | null
}

export interface BestForUseCase {
  id: BestForUseCaseId
  label: { en: string; ru: string }
  h1: { en: string; ru: string }
  metaTitle: { en: string; ru: string }
  metaDescription: { en: string; ru: string }
  intro: { en: string; ru: string }
  methodology: { en: string; ru: string }
  fields: BestForFieldKey[]
  qualifies: (firm: Firm, products: Challenge[]) => boolean
  /** Related EN feature / blog paths always linked from the best-for page. */
  relatedPaths?: Partial<Record<BestForLang, string[]>>
  dataNote?: string
  lastReviewed: string
}

export interface BestForRankedFirm {
  firm: Firm
  slug: string
  products: Challenge[]
  highlight: string
  russiaStatus: BestForRussiaStatus
  showRuSignupCta: boolean
  fieldValues: Partial<Record<BestForFieldKey, string | null>>
  /** For low-drawdown: pct = ranked; usd = unranked footnote group. */
  drawdownBasis?: 'pct' | 'usd'
  /** Numeric sort keys used by the comparator (tests assert determinism). */
  sortKeys: number[]
}

export interface BestForPageModel {
  useCase: BestForUseCase
  lang: BestForLang
  path: string
  twinPath: string | null
  ranked: BestForRankedFirm[]
  /** Unranked USD-cap rows on low-drawdown pages. */
  unrankedUsd?: BestForRankedFirm[]
  differingFieldCount: number
  differingFields: BestForFieldKey[]
  hasVerdict: boolean
  verdict: Verdict | null
  indexable: boolean
  reasons: string[]
  lastReviewed: string
  h1: string
  metaTitle: string
  metaDescription: string
  sortRule: string
  usedScalpingProxy?: boolean
  usedTimeLimitProxy?: boolean
}

function russiaStatusOf(firm: Firm): BestForRussiaStatus {
  const status = firm.russiaStatus
  if (status === 'available' || status === 'restricted' || status === 'unclear' || status === 'unverified') {
    return status
  }
  return 'unverified'
}

const FRESH = (product: Challenge, now = new Date()) => isChallengeFresh(product, now)

function primaryProducts(firm: Firm, now = new Date()): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(product => FRESH(product, now))
}

/* ── Tracker helpers: evaluationTimeLimit + minHoldSeconds ─────────── */

function isValidTimeLimit(value: EvaluationTimeLimit | null | undefined): value is EvaluationTimeLimit {
  if (!value || typeof value !== 'object') return false
  if (typeof value.unlimited !== 'boolean') return false
  if (!(value.days === null || (typeof value.days === 'number' && Number.isFinite(value.days)))) return false
  // Valid states: {N,false}, {null,true}, {null,false}
  if (value.unlimited === true && value.days !== null) return false
  if (value.unlimited === false && value.days !== null && !(value.days > 0)) return false
  return true
}

/**
 * Product has no evaluation time limit.
 * Prefers Tracker evaluationTimeLimit / phasesDetail; falls back to legacy
 * maxTradingDaysUnlimited only when the new field is absent (not when it is
 * present-but-unknown). Returns { ok, viaProxy }.
 */
export function productHasNoTimeLimit(product: Challenge): { ok: boolean; viaProxy: boolean } {
  const phases = product.phasesDetail
  if (Array.isArray(phases) && phases.length > 0) {
    const limits = phases.map(phase => phase.evaluationTimeLimit)
    if (limits.every(isValidTimeLimit)) {
      const allUnlimited = limits.every(limit => limit!.unlimited === true && limit!.days === null)
      return { ok: allUnlimited, viaProxy: false }
    }
    // Some phase entries missing/invalid → unknown, never a pass
    return { ok: false, viaProxy: false }
  }
  if (product.evaluationTimeLimit !== undefined) {
    if (!isValidTimeLimit(product.evaluationTimeLimit)) return { ok: false, viaProxy: false }
    const limit = product.evaluationTimeLimit
    return { ok: limit.unlimited === true && limit.days === null, viaProxy: false }
  }
  // Legacy proxy — only when Tracker field is absent
  const legacy = product.maxTradingDaysUnlimited === true && product.maxTradingDays == null
  return { ok: legacy, viaProxy: legacy }
}

/** True when rules.minHoldSeconds key is present (even if null). */
export function hasMinHoldSecondsField(product: Challenge): boolean {
  return !!product.rules && Object.prototype.hasOwnProperty.call(product.rules, 'minHoldSeconds')
}

/**
 * Scalping-friendly: minHoldSeconds === 0.
 * null / missing → not a structured pass (caller may apply labelled proxy).
 */
export function isScalpingFriendlyProduct(product: Challenge): boolean {
  if (!hasMinHoldSecondsField(product)) return false
  return product.rules!.minHoldSeconds === 0
}

export function minHoldSecondsLabel(product: Challenge): string | null {
  if (!hasMinHoldSecondsField(product)) return null
  const value = product.rules!.minHoldSeconds
  if (value === null) return 'not-stated'
  if (value === 0) return '0'
  if (typeof value === 'number') return String(value)
  return null
}

/* ── Field readers ─────────────────────────────────────────────────── */

function ruleFlag(value: RuleAvailability | undefined): string | null {
  if (value === true) return 'allowed'
  if (value === false) return 'blocked'
  if (value === 'restricted') return 'restricted'
  return null
}

function firmOrProductRule(
  firmValue: RuleAvailability | undefined,
  productValues: Array<RuleAvailability | undefined>,
): string | null {
  const fromProducts = productValues.map(ruleFlag).filter((value): value is string => value != null)
  if (fromProducts.length) {
    const distinct = [...new Set(fromProducts)]
    return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
  }
  return ruleFlag(firmValue)
}

function minTradingDaysValue(products: Challenge[]): string | null {
  const values = products
    .map(product => product.minTradingDays)
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  if (!values.length) return null
  return String(Math.min(...values))
}

function maxTradingDaysValue(products: Challenge[]): string | null {
  if (products.some(product => productHasNoTimeLimit(product).ok)) return 'unlimited'
  const days = products
    .map(product => {
      if (product.evaluationTimeLimit && isValidTimeLimit(product.evaluationTimeLimit) && !product.evaluationTimeLimit.unlimited) {
        return product.evaluationTimeLimit.days
      }
      return product.maxTradingDays
    })
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
  if (!days.length) return null
  return String(Math.max(...days))
}

function consistencyValue(products: Challenge[]): string | null {
  const labels = products.map(product => {
    if (product.consistencyRuleApplies === false && product.consistencyRulePct == null) return 'none'
    if (typeof product.consistencyRulePct === 'number') return `${product.consistencyRulePct}%`
    if (product.consistencyRuleApplies === true) return 'applies'
    return null
  }).filter((value): value is string => value != null)
  if (!labels.length) return null
  const distinct = [...new Set(labels)]
  return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
}

function phasesValue(products: Challenge[]): string | null {
  if (!products.length) return null
  const distinct = [...new Set(products.map(product => String(product.phases)))]
  return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
}

function splitValue(firm: Firm, products: Challenge[]): string | null {
  const fromProducts = products
    .map(product => product.profitSplitPct)
    .filter((value): value is number => typeof value === 'number')
  if (fromProducts.length) return String(Math.max(...fromProducts))
  return typeof firm.profitSplitPct === 'number' ? String(firm.profitSplitPct) : null
}

function splitNumber(firm: Firm, products: Challenge[]): number | null {
  const raw = splitValue(firm, products)
  return raw == null ? null : Number(raw)
}

function drawdownValue(firm: Firm, products: Challenge[]): string | null {
  const fromProducts = products
    .map(product => product.drawdownType)
    .filter((value): value is NonNullable<typeof value> => value != null)
  if (fromProducts.length) {
    const distinct = [...new Set(fromProducts)]
    return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
  }
  return firm.drawdownType ?? null
}

function payoutValue(firm: Firm, products: Challenge[]): string | null {
  const fromProducts = products
    .map(product => product.payoutFrequency)
    .filter((value): value is PayoutFrequency => value != null)
  if (fromProducts.length) {
    const distinct = [...new Set(fromProducts)]
    return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
  }
  return firm.payoutFrequency ?? null
}

function payoutFirstDaysValue(products: Challenge[]): string | null {
  const values = products
    .map(product => product.payoutFirstDays)
    .filter((value): value is number => typeof value === 'number' && value >= 0)
  if (!values.length) return null
  return String(Math.min(...values))
}

function platformsValue(firm: Firm): string | null {
  const list = firm.platforms
  if (!list?.length) return null
  return [...new Set(list.map(item => item.trim()).filter(Boolean))].sort().join('|')
}

export function lowestEntryPriceUsd(product: Challenge): number | null {
  const prices = (product.accountSizes ?? [])
    .map(tier => tier.priceUsd)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (!prices.length) return null
  return Math.min(...prices)
}

function entryPriceUsdValue(_firm: Firm, products: Challenge[]): string | null {
  const prices = products.map(lowestEntryPriceUsd).filter((value): value is number => value != null)
  if (!prices.length) return null
  return String(Math.min(...prices))
}

function smallestAccountUsd(products: Challenge[]): number | null {
  const sizes = products.flatMap(product =>
    (product.accountSizes ?? [])
      .map(tier => tier.sizeUsd)
      .filter((value): value is number => typeof value === 'number' && value > 0),
  )
  if (!sizes.length) return null
  return Math.min(...sizes)
}

function maxLossPctValue(products: Challenge[]): string | null {
  const values = products
    .map(product => product.maxLossPct)
    .filter((value): value is number => typeof value === 'number')
  if (!values.length) return null
  return String(Math.min(...values))
}

function dailyLossPctValue(products: Challenge[]): string | null {
  const values = products
    .map(product => product.dailyLossPct)
    .filter((value): value is number => typeof value === 'number')
  if (!values.length) return null
  return String(Math.min(...values))
}

function maxLossUsdValue(products: Challenge[]): string | null {
  const values = products.flatMap(product =>
    (product.accountSizes ?? [])
      .map(tier => tier.maxLossUsd)
      .filter((value): value is number => typeof value === 'number' && value > 0),
  )
  if (!values.length) return null
  return String(Math.min(...values))
}

function dailyLossUsdValue(products: Challenge[]): string | null {
  const values = products.flatMap(product =>
    (product.accountSizes ?? [])
      .map(tier => tier.dailyLossUsd)
      .filter((value): value is number => typeof value === 'number' && value > 0),
  )
  if (!values.length) return null
  return String(Math.min(...values))
}

function minHoldSecondsValue(_firm: Firm, products: Challenge[]): string | null {
  const labels = products.map(minHoldSecondsLabel).filter((value): value is string => value != null)
  if (!labels.length) return null
  const distinct = [...new Set(labels)]
  return distinct.length === 1 ? distinct[0] : `mixed:${distinct.sort().join(',')}`
}

export const BEST_FOR_FIELD_SPECS: Record<BestForFieldKey, BestForFieldSpec> = {
  profitSplitPct: {
    key: 'profitSplitPct',
    label: { en: 'Profit split', ru: 'Доля прибыли' },
    read: (firm, products) => splitValue(firm, products),
  },
  drawdownType: {
    key: 'drawdownType',
    label: { en: 'Drawdown type', ru: 'Тип просадки' },
    read: (firm, products) => drawdownValue(firm, products),
  },
  payoutFrequency: {
    key: 'payoutFrequency',
    label: { en: 'Payout frequency', ru: 'Частота выплат' },
    read: (firm, products) => payoutValue(firm, products),
  },
  payoutFirstDays: {
    key: 'payoutFirstDays',
    label: { en: 'First payout (days)', ru: 'Первая выплата (дни)' },
    read: (_firm, products) => payoutFirstDaysValue(products),
  },
  eaAllowed: {
    key: 'eaAllowed',
    label: { en: 'EAs', ru: 'Советники (EA)' },
    read: (firm, products) => firmOrProductRule(firm.eaAllowed, products.map(product => product.rules?.ea)),
  },
  newsTradingAllowed: {
    key: 'newsTradingAllowed',
    label: { en: 'News trading', ru: 'Торговля на новостях' },
    read: (firm, products) => firmOrProductRule(
      firm.newsTradingAllowed,
      products.map(product => product.rules?.news),
    ),
  },
  platforms: {
    key: 'platforms',
    label: { en: 'Platforms', ru: 'Платформы' },
    read: (firm) => platformsValue(firm),
  },
  minTradingDays: {
    key: 'minTradingDays',
    label: { en: 'Min trading days', ru: 'Мин. торговых дней' },
    read: (_firm, products) => minTradingDaysValue(products),
  },
  maxTradingDays: {
    key: 'maxTradingDays',
    label: { en: 'Time limit', ru: 'Лимит срока' },
    read: (_firm, products) => maxTradingDaysValue(products),
  },
  consistencyRule: {
    key: 'consistencyRule',
    label: { en: 'Consistency rule', ru: 'Правило консистентности' },
    read: (_firm, products) => consistencyValue(products),
  },
  phases: {
    key: 'phases',
    label: { en: 'Evaluation phases', ru: 'Этапы оценки' },
    read: (_firm, products) => phasesValue(products),
  },
  entryPriceUsd: {
    key: 'entryPriceUsd',
    label: { en: 'Lowest entry (USD)', ru: 'Мин. вход (USD)' },
    read: (firm, products) => entryPriceUsdValue(firm, products),
  },
  minHoldSeconds: {
    key: 'minHoldSeconds',
    label: { en: 'Min hold (sec)', ru: 'Мин. удержание (сек)' },
    read: (firm, products) => minHoldSecondsValue(firm, products),
  },
  maxLossPct: {
    key: 'maxLossPct',
    label: { en: 'Max loss %', ru: 'Макс. убыток %' },
    read: (_firm, products) => maxLossPctValue(products),
  },
  dailyLossPct: {
    key: 'dailyLossPct',
    label: { en: 'Daily loss %', ru: 'Дневной убыток %' },
    read: (_firm, products) => dailyLossPctValue(products),
  },
  smallestAccountUsd: {
    key: 'smallestAccountUsd',
    label: { en: 'Smallest account', ru: 'Мин. счёт' },
    read: (_firm, products) => {
      const size = smallestAccountUsd(products)
      return size == null ? null : String(size)
    },
  },
  maxLossUsd: {
    key: 'maxLossUsd',
    label: { en: 'Max loss (USD)', ru: 'Макс. убыток (USD)' },
    read: (_firm, products) => maxLossUsdValue(products),
  },
  dailyLossUsd: {
    key: 'dailyLossUsd',
    label: { en: 'Daily loss (USD)', ru: 'Дневной убыток (USD)' },
    read: (_firm, products) => dailyLossUsdValue(products),
  },
}

/* ── Qualifiers ────────────────────────────────────────────────────── */

function allowsEa(firm: Firm, products: Challenge[]): boolean {
  if (firm.eaAllowed === true) return true
  return products.some(product => product.rules?.ea === true)
}

function allowsNews(firm: Firm, products: Challenge[]): boolean {
  if (firm.newsTradingAllowed === true) return true
  return products.some(product => product.rules?.news === true)
}

function hasWeeklyPayout(firm: Firm, products: Challenge[]): boolean {
  if (firm.payoutFrequency === 'weekly') return true
  return products.some(product => product.payoutFrequency === 'weekly')
}

function hasNoTimeLimitFirm(_firm: Firm, products: Challenge[]): boolean {
  return products.some(product => productHasNoTimeLimit(product).ok)
}

export type BeginnerFilterFailReason =
  | 'not-fresh'
  | 'no-unlimited'
  | 'min-trading-days-missing'
  | 'min-trading-days-too-high'
  | 'drawdown-missing'
  | 'drawdown-not-static-or-eod'
  | 'price-usd-missing'
  | 'price-usd-too-high'

export function beginnerProductFailures(
  product: Challenge,
  opts: { maxMinTradingDays?: number; maxEntryPriceUsd?: number; now?: Date } = {},
): BeginnerFilterFailReason[] {
  const maxMin = opts.maxMinTradingDays ?? BEGINNER_MAX_MIN_TRADING_DAYS
  const maxPrice = opts.maxEntryPriceUsd ?? BEGINNER_MAX_ENTRY_PRICE_USD
  const now = opts.now ?? new Date()
  const reasons: BeginnerFilterFailReason[] = []
  if (!isChallengeFresh(product, now)) reasons.push('not-fresh')
  if (!productHasNoTimeLimit(product).ok) reasons.push('no-unlimited')
  if (typeof product.minTradingDays !== 'number' || !Number.isInteger(product.minTradingDays) || product.minTradingDays < 0) {
    reasons.push('min-trading-days-missing')
  } else if (product.minTradingDays > maxMin) {
    reasons.push('min-trading-days-too-high')
  }
  if (product.drawdownType == null) reasons.push('drawdown-missing')
  else if (!(BEGINNER_ALLOWED_DRAWDOWN_TYPES as readonly string[]).includes(product.drawdownType)) {
    reasons.push('drawdown-not-static-or-eod')
  }
  const price = lowestEntryPriceUsd(product)
  if (price == null) reasons.push('price-usd-missing')
  else if (price > maxPrice) reasons.push('price-usd-too-high')
  return reasons
}

export function isBeginnerFriendlyProduct(
  product: Challenge,
  opts?: { maxMinTradingDays?: number; maxEntryPriceUsd?: number; now?: Date },
): boolean {
  return beginnerProductFailures(product, opts).length === 0
}

export function beginnerFriendly(
  _firm: Firm,
  products: Challenge[],
  opts?: { maxMinTradingDays?: number; maxEntryPriceUsd?: number; now?: Date },
): boolean {
  return products.some(product => isBeginnerFriendlyProduct(product, opts))
}

export function listBeginnerFriendlyFirms(now = new Date()) {
  return getAllFirms().flatMap(firm => {
    const products = primaryProducts(firm, now).filter(product => isBeginnerFriendlyProduct(product, { now }))
    if (!products.length) return []
    return [{
      firmSlug: firmSlug(firm.name),
      firmName: firm.name,
      products: products.map(product => ({
        productSlug: product.productSlug,
        minTradingDays: product.minTradingDays as number,
        drawdownType: String(product.drawdownType),
        entryPriceUsd: lowestEntryPriceUsd(product) as number,
        viaTimeLimitProxy: productHasNoTimeLimit(product).viaProxy,
      })),
    }]
  })
}

/** Scalping: structured minHoldSeconds===0, else labelled proxy when field absent. */
function scalpingProxy(firm: Firm, products: Challenge[]): boolean {
  if (!products.length) return false
  if (products.some(isScalpingFriendlyProduct)) return true
  // Proxy only when EVERY product is missing the field (Tracker not filled yet)
  if (products.every(product => !hasMinHoldSecondsField(product))) {
    const newsOk = allowsNews(firm, products)
    const eaOk = allowsEa(firm, products) || firm.eaAllowed === 'restricted'
    return (newsOk || eaOk) && payoutValue(firm, products) != null
  }
  return false
}

function lowDrawdownQualifies(_firm: Firm, products: Challenge[]): boolean {
  // %-based OR USD-cap (never mix into one ranked list)
  return products.some(product =>
    typeof product.maxLossPct === 'number'
    || (product.accountSizes ?? []).some(tier => typeof tier.maxLossUsd === 'number' && tier.maxLossUsd > 0),
  )
}

function smallAccountQualifies(_firm: Firm, products: Challenge[]): boolean {
  return smallestAccountUsd(products) != null
}

function productDrawdownBasis(product: Challenge): 'pct' | 'usd' | null {
  if (typeof product.maxLossPct === 'number') return 'pct'
  if ((product.accountSizes ?? []).some(tier => typeof tier.maxLossUsd === 'number' && tier.maxLossUsd > 0)) return 'usd'
  return null
}

/* ── Use cases ─────────────────────────────────────────────────────── */

export const BEST_FOR_USE_CASES: BestForUseCase[] = [
  {
    id: 'eas',
    label: { en: 'EAs & bots', ru: 'Советники и боты' },
    h1: {
      en: 'Best Prop Firms That Allow Expert Advisors (EAs)',
      ru: 'Лучшие проп-фирмы, где разрешены советники (EA)',
    },
    metaTitle: {
      en: 'Best Prop Firms for EAs (2026) — Ranked',
      ru: 'Проп-фирмы с EA 2026 — рейтинг',
    },
    metaDescription: {
      en: 'Prop firms that explicitly allow Expert Advisors. Compare profit splits, payouts, drawdown and platforms — every figure from firm data.',
      ru: 'Проп-фирмы, где явно разрешены советники. Сравниваем долю прибыли, выплаты, просадку и платформы — только из данных фирм.',
    },
    intro: {
      en: 'These firms explicitly allow Expert Advisors on at least one current product. Restricted or unverified EA rules do not qualify.',
      ru: 'Здесь только фирмы, которые явно разрешают советники хотя бы на одном актуальном продукте. Ограничения и «не подтверждено» не подходят.',
    },
    methodology: {
      en: 'A firm qualifies when firms.json eaAllowed is true, or a challenge captured within 30 days sets EA permission to allowed.',
      ru: 'Фирма попадает в список, если eaAllowed = true в firms.json или в челлендже не старше 30 дней EA явно разрешены.',
    },
    fields: ['eaAllowed', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'platforms', 'newsTradingAllowed', 'phases', 'minTradingDays'],
    qualifies: allowsEa,
    relatedPaths: { en: ['/prop-firms/ea-allowed'] },
    lastReviewed: '2026-11-02',
  },
  {
    id: 'news-trading',
    label: { en: 'News trading', ru: 'Торговля на новостях' },
    h1: {
      en: 'Best Prop Firms That Allow News Trading',
      ru: 'Лучшие проп-фирмы с торговлей на новостях',
    },
    metaTitle: {
      en: 'Best Prop Firms for News Trading (2026)',
      ru: 'Проп-фирмы для торговли на новостях 2026',
    },
    metaDescription: {
      en: 'Prop firms that explicitly allow news trading. Compare splits, drawdown, payouts and EA rules from verified firm data.',
      ru: 'Проп-фирмы, где явно разрешена торговля на новостях. Сравниваем сплит, просадку, выплаты и правила EA по проверенным данным.',
    },
    intro: {
      en: 'Only firms that explicitly allow news trading on a current product appear here.',
      ru: 'В списке только фирмы с явным разрешением торговли на новостях на актуальном продукте.',
    },
    methodology: {
      en: 'Qualification: newsTradingAllowed === true on the firm, or a fresh challenge with news allowed.',
      ru: 'Критерий: newsTradingAllowed === true у фирмы или в свежем челлендже news = allowed.',
    },
    fields: ['newsTradingAllowed', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'payoutFirstDays', 'eaAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: allowsNews,
    relatedPaths: { en: ['/prop-firms/news-trading'] },
    lastReviewed: '2026-11-02',
  },
  {
    id: 'scalping',
    label: { en: 'Scalping', ru: 'Скальпинг' },
    h1: {
      en: 'Best Prop Firms for Scalping',
      ru: 'Лучшие проп-фирмы для скальпинга',
    },
    metaTitle: {
      en: 'Best Prop Firms for Scalping (2026)',
      ru: 'Проп-фирмы для скальпинга 2026',
    },
    metaDescription: {
      en: 'Prop firms with an explicit no-minimum hold (minHoldSeconds = 0). Null means not stated — never treated as zero.',
      ru: 'Проп-фирмы с явным «без минимума удержания» (minHoldSeconds = 0). null = не заявлено, никогда не ноль.',
    },
    intro: {
      en: 'Scalping-friendly means rules.minHoldSeconds === 0 on a fresh product. When Tracker has not filled the field yet, a labelled proxy may appear; null never counts as zero.',
      ru: '«Для скальпинга» — это rules.minHoldSeconds === 0 на свежем продукте. Пока Tracker не заполнил поле, возможен помеченный прокси; null не равен нулю.',
    },
    methodology: {
      en: 'Uses Tracker rules.minHoldSeconds (not scalpingAllowed). 0 = no minimum; null = not stated. Absent field → labelled proxy until Tracker lands.',
      ru: 'Поле Tracker rules.minHoldSeconds (не scalpingAllowed). 0 = без минимума; null = не заявлено. Нет поля → помеченный прокси.',
    },
    fields: ['minHoldSeconds', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: scalpingProxy,
    dataNote: 'Tracker fills rules.minHoldSeconds per product. Until present, a labelled proxy (news/EA + known payout) may qualify firms — never treat null as 0.',
    lastReviewed: '2026-11-02',
  },
  {
    id: 'beginners',
    label: { en: 'Beginners', ru: 'Для новичков' },
    h1: {
      en: 'Best Prop Firms for Beginners',
      ru: 'Лучшие проп-фирмы для новичков',
    },
    metaTitle: {
      en: 'Best Prop Firms for Beginners (2026)',
      ru: 'Проп-фирмы для новичков 2026',
    },
    metaDescription: {
      en: 'No time limit, low min trading days, static/EOD drawdown, low USD entry — from firm data only.',
      ru: 'Без лимита срока, низкий минимум дней, static/EOD просадка, низкий вход в USD — только из данных.',
    },
    intro: {
      en: 'Beginner-friendly means one fresh product with no time limit, min trading days at or under our threshold, static or EOD drawdown, and a low published USD entry fee.',
      ru: '«Для новичков» — один свежий продукт без лимита срока, с минимумом дней не выше порога, просадкой static/EOD и низким входом в USD.',
    },
    methodology: {
      en: `See isBeginnerFriendlyProduct: unlimited evaluationTimeLimit (or labelled legacy proxy), minTradingDays≤${BEGINNER_MAX_MIN_TRADING_DAYS}, drawdown static|eod-trailing, priceUsd≤$${BEGINNER_MAX_ENTRY_PRICE_USD}. Missing fields fail closed.`,
      ru: `См. isBeginnerFriendlyProduct: unlimited evaluationTimeLimit (или помеченный legacy-прокси), minTradingDays≤${BEGINNER_MAX_MIN_TRADING_DAYS}, drawdown static|eod-trailing, priceUsd≤$${BEGINNER_MAX_ENTRY_PRICE_USD}.`,
    },
    fields: ['maxTradingDays', 'minTradingDays', 'drawdownType', 'entryPriceUsd', 'profitSplitPct', 'payoutFrequency', 'consistencyRule', 'phases', 'eaAllowed'],
    qualifies: beginnerFriendly,
    dataNote: `Thresholds: minDays≤${BEGINNER_MAX_MIN_TRADING_DAYS}, priceUsd≤$${BEGINNER_MAX_ENTRY_PRICE_USD} (RU SEO Lead). Uses evaluationTimeLimit when present.`,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'weekly-payouts',
    label: { en: 'Weekly payouts', ru: 'Еженедельные выплаты' },
    h1: {
      en: 'Best Prop Firms With Weekly Payouts',
      ru: 'Лучшие проп-фирмы с еженедельными выплатами',
    },
    metaTitle: {
      en: 'Best Prop Firms With Weekly Payouts (2026)',
      ru: 'Проп-фирмы с еженедельными выплатами 2026',
    },
    metaDescription: {
      en: 'Prop firms whose current products pay weekly. EN ranking lives on the blog guide; this RU page is the gated twin.',
      ru: 'Проп-фирмы с еженедельными выплатами на актуальных продуктах. EN — в блоге; здесь RU-рейтинг с гейтом.',
    },
    intro: {
      en: 'A firm qualifies only when payoutFrequency is weekly. Bi-weekly and on-demand do not qualify.',
      ru: 'Только payoutFrequency = weekly. Bi-weekly и on-demand не подходят.',
    },
    methodology: {
      en: 'Weekly only. EN slug unset to avoid duplicating /blog/prop-firms-with-weekly-payouts.',
      ru: 'Только weekly. EN-страница не строится — есть гайд /blog/prop-firms-with-weekly-payouts.',
    },
    fields: ['payoutFrequency', 'payoutFirstDays', 'profitSplitPct', 'drawdownType', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: hasWeeklyPayout,
    relatedPaths: { ru: ['/blog/prop-firms-with-weekly-payouts'] },
    dataNote: 'EN route intentionally unset (blog duplicate). RU only until EN Writer decides otherwise.',
    lastReviewed: '2026-11-02',
  },
  {
    id: 'no-time-limit',
    label: { en: 'No time limit', ru: 'Без лимита времени' },
    h1: {
      en: 'Best Prop Firms With No Time Limit',
      ru: 'Лучшие проп-фирмы без лимита времени',
    },
    metaTitle: {
      en: 'Best Prop Firms With No Time Limit (2026)',
      ru: 'Проп-фирмы без лимита времени 2026',
    },
    metaDescription: {
      en: 'Prop firms with unlimited evaluation time (evaluationTimeLimit.unlimited or legacy flag).',
      ru: 'Проп-фирмы без лимита срока оценки (evaluationTimeLimit.unlimited или legacy-флаг).',
    },
    intro: {
      en: 'Unlimited means evaluationTimeLimit {days:null, unlimited:true}, or every phasesDetail phase unlimited. Legacy maxTradingDaysUnlimited is a labelled fallback only when the new field is absent.',
      ru: 'Без лимита — evaluationTimeLimit {days:null, unlimited:true} или все фазы в phasesDetail. Legacy maxTradingDaysUnlimited — только помеченный запасной вариант.',
    },
    methodology: {
      en: 'Tracker evaluationTimeLimit / phasesDetail preferred. {null,false} = unknown (never a pass). Legacy proxy only when field absent.',
      ru: 'Предпочтительно evaluationTimeLimit / phasesDetail. {null,false} = неизвестно. Legacy-прокси только если поля нет.',
    },
    fields: ['maxTradingDays', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'minTradingDays', 'consistencyRule', 'eaAllowed', 'platforms'],
    qualifies: hasNoTimeLimitFirm,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'low-drawdown',
    label: { en: 'Low drawdown', ru: 'Низкая просадка' },
    h1: {
      en: 'Prop Firms With the Lowest Drawdown Rules',
      ru: 'Проп-фирмы с наименьшей просадкой',
    },
    metaTitle: {
      en: 'Prop Firms With Lowest Drawdown Rules (2026)',
      ru: 'Проп-фирмы с низкой просадкой 2026',
    },
    metaDescription: {
      en: 'Ranked by maxLossPct then dailyLossPct. Futures USD caps listed separately — never converted to %.',
      ru: 'Ранг по maxLossPct и dailyLossPct. USD-капы фьючерсов — отдельно, без перевода в %.',
    },
    intro: {
      en: 'We rank %-based max/daily loss products from lowest to highest. Products that only publish USD caps (common for futures) appear in a separate unranked group — dollar amounts are never converted into percentages.',
      ru: 'Ранжируем продукты с % max/daily loss от меньшего к большему. Только USD-капы (часто фьючерсы) — отдельная группа без ранга; доллары в проценты не переводим.',
    },
    methodology: {
      en: 'Fields: maxLossPct, dailyLossPct, drawdownType, profitSplitPct, payoutFrequency/payoutFirstDays, minTradingDays/phases. USD caps via accountSizes.maxLossUsd/dailyLossUsd stay unranked.',
      ru: 'Поля: maxLossPct, dailyLossPct, drawdownType, profitSplitPct, payoutFrequency/payoutFirstDays, minTradingDays/phases. USD-капы не ранжируются.',
    },
    fields: ['maxLossPct', 'dailyLossPct', 'drawdownType', 'profitSplitPct', 'payoutFrequency', 'payoutFirstDays', 'minTradingDays', 'phases', 'maxLossUsd', 'dailyLossUsd'],
    qualifies: lowDrawdownQualifies,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'small-accounts',
    label: { en: 'Small accounts', ru: 'Небольшие счета' },
    h1: {
      en: 'Best Prop Firms for Small Accounts',
      ru: 'Лучшие проп-фирмы для небольших счетов',
    },
    metaTitle: {
      en: 'Best Prop Firms for Small Accounts (2026)',
      ru: 'Проп-фирмы для небольших счетов 2026',
    },
    metaDescription: {
      en: 'Ranked by the smallest available account size (sizeUsd), not by challenge price.',
      ru: 'Ранг по наименьшему доступному размеру счёта (sizeUsd), не по цене челленджа.',
    },
    intro: {
      en: 'Smallest published accountSizes.sizeUsd wins. Challenge fee is shown when known but never drives this ranking.',
      ru: 'Побеждает наименьший accountSizes.sizeUsd. Цена челленджа показывается, но не определяет порядок.',
    },
    methodology: {
      en: 'Sort key = min(accountSizes.sizeUsd). Tie-break: profitSplitPct desc, then name.',
      ru: 'Ключ сортировки = min(accountSizes.sizeUsd). Тай-брейк: сплит по убыванию, затем имя.',
    },
    fields: ['smallestAccountUsd', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'minTradingDays', 'phases', 'entryPriceUsd', 'eaAllowed'],
    qualifies: smallAccountQualifies,
    lastReviewed: '2026-11-02',
  },
]

export const BEST_FOR_RETIRED_NESTED_PATHS = [
  '/best-prop-firms-for',
  '/best-prop-firms-for/eas',
  '/best-prop-firms-for/news-trading',
  '/best-prop-firms-for/scalping',
  '/best-prop-firms-for/beginners',
  '/best-prop-firms-for/weekly-payouts',
  '/best-prop-firms-for/no-time-limit',
  '/ru/luchshie-prop-firmy-dlya',
  '/ru/luchshie-prop-firmy-dlya/ea',
  '/ru/luchshie-prop-firmy-dlya/novostey',
  '/ru/luchshie-prop-firmy-dlya/skalpinga',
  '/ru/luchshie-prop-firmy-dlya/novichkov',
  '/ru/luchshie-prop-firmy-dlya/ezhenedelnykh-vyplat',
  '/ru/luchshie-prop-firmy-dlya/bez-limita-vremeni',
] as const

export function getBestForUseCase(id: string): BestForUseCase | undefined {
  return BEST_FOR_USE_CASES.find(useCase => useCase.id === id)
}

export function bestForPath(id: BestForUseCaseId, lang: BestForLang): string | null {
  const slug = BEST_FOR_SLUGS[id]?.[lang]
  if (!slug) return null
  return lang === 'ru' ? `/ru/${slug}` : `/${slug}`
}

export function enBestForPath(useCase: BestForUseCase): string | null {
  return bestForPath(useCase.id, 'en')
}

export function ruBestForPath(useCase: BestForUseCase): string | null {
  return bestForPath(useCase.id, 'ru')
}

/** All built flat paths (languages with a slug). */
export function allBestForPaths(): string[] {
  const paths: string[] = []
  for (const id of Object.keys(BEST_FOR_SLUGS) as BestForUseCaseId[]) {
    for (const lang of ['en', 'ru'] as BestForLang[]) {
      const path = bestForPath(id, lang)
      if (path) paths.push(path)
    }
  }
  return paths
}

export function bestForUseCaseIdFromPath(pathname: string): BestForUseCaseId | undefined {
  for (const id of Object.keys(BEST_FOR_SLUGS) as BestForUseCaseId[]) {
    if (bestForPath(id, 'en') === pathname || bestForPath(id, 'ru') === pathname) return id
  }
  return undefined
}

export function countDifferingFields(
  ranked: BestForRankedFirm[],
  fieldKeys: BestForFieldKey[],
): { count: number; fields: BestForFieldKey[] } {
  if (ranked.length < BEST_FOR_MIN_FIRMS) return { count: 0, fields: [] }
  const differing: BestForFieldKey[] = []
  for (const key of fieldKeys) {
    const values = ranked
      .map(row => row.fieldValues[key] ?? null)
      .filter((value): value is string => value != null && value !== '')
    if (new Set(values).size >= 2) differing.push(key)
  }
  return { count: differing.length, fields: differing }
}

function numOrInf(value: number | null | undefined, missingAs: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : missingAs
}

function compareSortKeys(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

function buildSortKeys(id: BestForUseCaseId, firm: Firm, products: Challenge[]): number[] {
  const split = splitNumber(firm, products)
  const minDays = products
    .map(product => product.minTradingDays)
    .filter((value): value is number => typeof value === 'number')
  const minDay = minDays.length ? Math.min(...minDays) : null
  const firstPayout = products
    .map(product => product.payoutFirstDays)
    .filter((value): value is number => typeof value === 'number')
  const first = firstPayout.length ? Math.min(...firstPayout) : null
  const nameKey = firm.name.toLowerCase()
  // Encode name as a stable secondary via char codes sum is weak; use localeCompare in tie — store 0 and compare name outside.
  void nameKey

  switch (id) {
    case 'eas':
      return [-numOrInf(split, -1), numOrInf(minDay, 9999)]
    case 'news-trading':
    case 'weekly-payouts':
      return [-numOrInf(split, -1), numOrInf(first, 9999)]
    case 'scalping': {
      const holds = products.map(minHoldSecondsLabel)
      const hasZero = holds.includes('0') ? 0 : 1
      return [hasZero, -numOrInf(split, -1)]
    }
    case 'beginners': {
      const price = entryPriceUsdValue(firm, products)
      return [numOrInf(price == null ? null : Number(price), 999999), numOrInf(minDay, 9999)]
    }
    case 'no-time-limit':
      return [-numOrInf(split, -1), numOrInf(minDay, 9999)]
    case 'low-drawdown': {
      const maxLoss = products
        .map(product => product.maxLossPct)
        .filter((value): value is number => typeof value === 'number')
      const daily = products
        .map(product => product.dailyLossPct)
        .filter((value): value is number => typeof value === 'number')
      return [
        numOrInf(maxLoss.length ? Math.min(...maxLoss) : null, 9999),
        numOrInf(daily.length ? Math.min(...daily) : null, 9999),
      ]
    }
    case 'small-accounts': {
      const size = smallestAccountUsd(products)
      return [numOrInf(size, 999999999), -numOrInf(split, -1)]
    }
    default:
      return [-numOrInf(split, -1)]
  }
}

function highlightFor(useCase: BestForUseCase, firm: Firm, products: Challenge[], lang: BestForLang): string {
  const split = splitValue(firm, products)
  const payout = payoutValue(firm, products)
  const parts: string[] = []
  if (split) parts.push(lang === 'ru' ? `сплит ${split}%` : `${split}% split`)
  if (payout) parts.push(payout.replace(/-/g, ' '))
  if (useCase.id === 'small-accounts') {
    const size = smallestAccountUsd(products)
    if (size != null) parts.push(lang === 'ru' ? `от $${size.toLocaleString('en-US')}` : `from $${size.toLocaleString('en-US')}`)
  }
  if (useCase.id === 'low-drawdown') {
    const maxLoss = maxLossPctValue(products)
    if (maxLoss) parts.push(lang === 'ru' ? `макс. убыток ${maxLoss}%` : `max loss ${maxLoss}%`)
  }
  if (useCase.id === 'beginners' || useCase.id === 'no-time-limit') {
    if (maxTradingDaysValue(products) === 'unlimited') {
      parts.push(lang === 'ru' ? 'без лимита срока' : 'no time limit')
    }
  }
  if (useCase.id === 'eas') parts.push(lang === 'ru' ? 'EA разрешены' : 'EAs allowed')
  if (useCase.id === 'news-trading') parts.push(lang === 'ru' ? 'новости разрешены' : 'news allowed')
  if (useCase.id === 'weekly-payouts') parts.push(lang === 'ru' ? 'еженедельно' : 'weekly')
  if (!parts.length) return lang === 'ru' ? `скор ${firm.score}` : `score ${firm.score}`
  return parts.join(' · ')
}

function qualifyingProductsFor(useCase: BestForUseCase, firm: Firm, products: Challenge[], now: Date): Challenge[] {
  if (useCase.id === 'beginners') {
    return products.filter(product => isBeginnerFriendlyProduct(product, { now }))
  }
  if (useCase.id === 'scalping') {
    const structured = products.filter(isScalpingFriendlyProduct)
    if (structured.length) return structured
    if (products.every(product => !hasMinHoldSecondsField(product)) && scalpingProxy(firm, products)) {
      return products
    }
    return []
  }
  if (useCase.id === 'no-time-limit') {
    return products.filter(product => productHasNoTimeLimit(product).ok)
  }
  if (useCase.id === 'low-drawdown') {
    return products.filter(product => productDrawdownBasis(product) != null)
  }
  if (useCase.id === 'weekly-payouts') {
    return products.filter(product => product.payoutFrequency === 'weekly' || firm.payoutFrequency === 'weekly')
  }
  if (useCase.id === 'eas') {
    return products.filter(product => product.rules?.ea === true || firm.eaAllowed === true)
  }
  if (useCase.id === 'news-trading') {
    return products.filter(product => product.rules?.news === true || firm.newsTradingAllowed === true)
  }
  return products
}

export function rankBestFor(
  useCase: BestForUseCase,
  lang: BestForLang = 'en',
  now = new Date(),
): { ranked: BestForRankedFirm[]; unrankedUsd: BestForRankedFirm[] } {
  const ranked: BestForRankedFirm[] = []
  const unrankedUsd: BestForRankedFirm[] = []

  for (const firm of getAllFirms()) {
    const products = primaryProducts(firm, now)
    if (!useCase.qualifies(firm, products)) continue
    const slug = firmSlug(firm.name)
    const qualified = qualifyingProductsFor(useCase, firm, products, now)
    if (!qualified.length && useCase.id !== 'low-drawdown') continue

    if (useCase.id === 'low-drawdown') {
      const pctProducts = qualified.filter(product => productDrawdownBasis(product) === 'pct')
      const usdProducts = qualified.filter(product => productDrawdownBasis(product) === 'usd')
      const pushRow = (source: Challenge[], basis: 'pct' | 'usd', bucket: BestForRankedFirm[]) => {
        if (!source.length) return
        const fieldValues: Partial<Record<BestForFieldKey, string | null>> = {}
        for (const key of useCase.fields) {
          fieldValues[key] = BEST_FOR_FIELD_SPECS[key].read(firm, source)
        }
        const status = russiaStatusOf(firm)
        bucket.push({
          firm,
          slug,
          products: source,
          highlight: highlightFor(useCase, firm, source, lang),
          russiaStatus: status,
          showRuSignupCta: status === 'available',
          fieldValues,
          drawdownBasis: basis,
          sortKeys: buildSortKeys(useCase.id, firm, source),
        })
      }
      pushRow(pctProducts, 'pct', ranked)
      pushRow(usdProducts, 'usd', unrankedUsd)
      continue
    }

    const fieldValues: Partial<Record<BestForFieldKey, string | null>> = {}
    for (const key of useCase.fields) {
      fieldValues[key] = BEST_FOR_FIELD_SPECS[key].read(firm, qualified)
    }
    const status = russiaStatusOf(firm)
    ranked.push({
      firm,
      slug,
      products: qualified,
      highlight: highlightFor(useCase, firm, qualified, lang),
      russiaStatus: status,
      showRuSignupCta: status === 'available',
      fieldValues,
      sortKeys: buildSortKeys(useCase.id, firm, qualified),
    })
  }

  const byRule = (a: BestForRankedFirm, b: BestForRankedFirm) => {
    const cmp = compareSortKeys(a.sortKeys, b.sortKeys)
    if (cmp !== 0) return cmp
    return a.firm.name.localeCompare(b.firm.name)
  }
  ranked.sort(byRule)
  unrankedUsd.sort((a, b) => a.firm.name.localeCompare(b.firm.name))
  return { ranked, unrankedUsd }
}

function displayCopy(useCase: BestForUseCase, lang: BestForLang, verdict: Verdict | null) {
  return {
    h1: verdict?.h1?.trim() || useCase.h1[lang],
    metaTitle: verdict?.title?.trim() || useCase.metaTitle[lang],
    metaDescription: verdict?.description?.trim() || useCase.metaDescription[lang],
  }
}

export function buildBestForPageModel(
  useCaseId: string,
  lang: BestForLang,
  now = new Date(),
): BestForPageModel | null {
  const useCase = getBestForUseCase(useCaseId)
  if (!useCase) return null
  const path = bestForPath(useCase.id, lang)
  if (!path) return null // language slug unset → no page

  const { ranked, unrankedUsd } = rankBestFor(useCase, lang, now)
  const gatePool = useCase.id === 'low-drawdown' ? ranked : ranked
  const { count, fields } = countDifferingFields(gatePool, useCase.fields.filter(key => {
    // USD-only columns don't count toward the %-ranking gate
    if (useCase.id === 'low-drawdown' && (key === 'maxLossUsd' || key === 'dailyLossUsd')) return false
    return true
  }))

  let verdict: Verdict | null = null
  try {
    verdict = loadVerdict('best-for', useCase.id, lang)
  } catch (error) {
    throw error
  }
  const hasVerdict = verdict != null
  const reasons: string[] = []
  if (gatePool.length < BEST_FOR_MIN_FIRMS) {
    reasons.push(`need at least ${BEST_FOR_MIN_FIRMS} ranked firms (have ${gatePool.length})`)
  }
  if (count < BEST_FOR_MIN_DIFF_FIELDS) {
    reasons.push(`need ≥${BEST_FOR_MIN_DIFF_FIELDS} differing fields (have ${count}: ${fields.join(', ') || 'none'})`)
  }
  if (!hasVerdict) {
    reasons.push(`missing writer verdict content/verdicts/best-for/${useCase.id}${lang === 'ru' ? '.ru' : ''}.md`)
  }

  const twin = bestForPath(useCase.id, lang === 'ru' ? 'en' : 'ru')
  const usedScalpingProxy = useCase.id === 'scalping' && ranked.some(row =>
    row.products.every(product => !hasMinHoldSecondsField(product)),
  )
  const usedTimeLimitProxy = (useCase.id === 'no-time-limit' || useCase.id === 'beginners')
    && ranked.some(row => row.products.some(product => productHasNoTimeLimit(product).viaProxy))

  const copy = displayCopy(useCase, lang, verdict)
  return {
    useCase,
    lang,
    path,
    twinPath: twin,
    ranked,
    unrankedUsd: useCase.id === 'low-drawdown' ? unrankedUsd : undefined,
    differingFieldCount: count,
    differingFields: fields,
    hasVerdict,
    verdict,
    indexable: reasons.length === 0,
    reasons,
    lastReviewed: useCase.lastReviewed,
    h1: copy.h1,
    metaTitle: copy.metaTitle,
    metaDescription: copy.metaDescription,
    sortRule: BEST_FOR_SORT_RULES[useCase.id][lang],
    usedScalpingProxy,
    usedTimeLimitProxy,
  }
}

export function getBestForPageModels(now = new Date()): BestForPageModel[] {
  const models: BestForPageModel[] = []
  for (const useCase of BEST_FOR_USE_CASES) {
    for (const lang of ['en', 'ru'] as BestForLang[]) {
      const model = buildBestForPageModel(useCase.id, lang, now)
      if (model) models.push(model)
    }
  }
  return models
}

export function indexableBestForPaths(now = new Date()): string[] {
  return getBestForPageModels(now).filter(model => model.indexable).map(model => model.path)
}

/**
 * EN↔RU hreflang only when BOTH sides exist AND both are indexable.
 * weekly-payouts (EN unset) and low-drawdown/small-accounts (RU unset) never pair.
 */
export function bestForRoutePair(pathname: string, now = new Date()): { en: string; ru: string } | undefined {
  const id = bestForUseCaseIdFromPath(pathname)
  if (!id) return undefined
  const enPath = bestForPath(id, 'en')
  const ruPath = bestForPath(id, 'ru')
  if (!enPath || !ruPath) return undefined
  const en = buildBestForPageModel(id, 'en', now)
  const ru = buildBestForPageModel(id, 'ru', now)
  if (!en?.indexable || !ru?.indexable) return undefined
  return { en: en.path, ru: ru.path }
}

/** Feature-page reverse link target — only when the EN best-for page is indexable. */
export function bestForIndexableFeatureLink(featureSlug: 'ea-allowed' | 'news-trading'): string | null {
  const id: BestForUseCaseId = featureSlug === 'ea-allowed' ? 'eas' : 'news-trading'
  const model = buildBestForPageModel(id, 'en')
  if (!model?.indexable) return null
  return model.path
}

export function bestForSlugManifest() {
  return BEST_FOR_USE_CASES.map(useCase => ({
    id: useCase.id,
    en: bestForPath(useCase.id, 'en'),
    ru: bestForPath(useCase.id, 'ru'),
    sortRule: BEST_FOR_SORT_RULES[useCase.id],
    dataNote: useCase.dataNote,
  }))
}
