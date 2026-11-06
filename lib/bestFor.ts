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
import { activePinIndex, RU_RANKING_PINS, type RankingRussiaStatus } from './russianRanking.ts'
import { RU_REVIEW_FIRMS } from './ruRelatedLinks.ts'
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
 * page. EN order is pure data. RU order: Russia-open firms first (active
 * RU_RANKING_PINS ahead within that group), then non-open — data sort inside
 * each group (lib/russianRanking.ts activePinIndex; RuGoLink 2026-10-14).
 */

export const BEST_FOR_MIN_DIFF_FIELDS = 5
export const BEST_FOR_MIN_FIRMS = 2

/** Lead sentence when ≥1 listed firm is russiaStatus available (RU Writer 2026-11-02). */
export const RU_BEST_FOR_NOTE_OPEN_LEAD =
  'Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки'

export const RU_BEST_FOR_NOTE_THEN_UNCLEAR =
  'Затем — фирмы, у которых статус для РФ неясен.'

export const RU_BEST_FOR_NOTE_THEN_RESTRICTED =
  'Затем — фирмы, у которых Россия в списке ограничений.'

export const RU_BEST_FOR_NOTE_END_RESTRICTED =
  'В конце — фирмы, у которых Россия в списке ограничений.'

export const RU_BEST_FOR_NOTE_THEN_MIXED =
  'Затем — остальные фирмы (статус для РФ неясен или Россия в списке ограничений).'

export const RU_BEST_FOR_NOTE_INSIDE_GROUPS =
  'Внутри групп порядок определяется данными, указанными выше.'

/**
 * @deprecated Prefer ruBestForCtaRankNote(ranked). Kept as the open+unclear (no pin) composition
 * for older call sites / docs.
 */
export const RU_BEST_FOR_CTA_RANK_NOTE_OPEN =
  `${RU_BEST_FOR_NOTE_OPEN_LEAD}. ${RU_BEST_FOR_NOTE_THEN_UNCLEAR} ${RU_BEST_FOR_NOTE_INSIDE_GROUPS}`

/** Full note when an active pin is listed+available and only unclear firms follow (beginners shape). */
export function ruBestForCtaRankNotePinned(partnerDisplayName: string): string {
  return `${RU_BEST_FOR_NOTE_OPEN_LEAD}; среди них первым стоит наш партнёр ${partnerDisplayName}. ${RU_BEST_FOR_NOTE_THEN_UNCLEAR} ${RU_BEST_FOR_NOTE_INSIDE_GROUPS}`
}

/**
 * Beginners — RU SEO Lead (2026-11-02).
 * Hard filters: (1) russiaStatus !== restricted (RU; EN skips), (2) entry price
 * ≤ currency cap (USD or EUR — never convert), (3) required price field present
 * in the currency used. Freshness via isChallengeFresh (30d).
 * Ranking signals: no time limit, minDays≤5, static/EOD, payout speed, then
 * entry as fraction of its own cap (never FX conversion).
 */
/** Ranking preference: ≤ this many min trading days scores best. */
export const BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS = 5
/** @deprecated alias — prefer BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS */
export const BEGINNER_MAX_MIN_TRADING_DAYS = BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS
/**
 * USD entry ceiling for the beginners hard filter (not a firm quote).
 * Prices shown on pages always come from challenge captures — never hardcode
 * a firm’s fee here.
 */
export const BEGINNER_MAX_ENTRY_PRICE_USD = 99
/**
 * EUR entry ceiling for products that publish only a EUR fee (never convert to USD).
 * Same numeric level as the USD cap so EUR-only CFDs can qualify.
 */
export const BEGINNER_MAX_ENTRY_PRICE_EUR = 99
/** Preferred drawdown types for the beginners ranking signal (not a hard filter). */
export const BEGINNER_PREFERRED_DRAWDOWN_TYPES = ['static', 'eod-trailing'] as const
/** @deprecated alias */
export const BEGINNER_ALLOWED_DRAWDOWN_TYPES = BEGINNER_PREFERRED_DRAWDOWN_TYPES

export type BestForLang = 'en' | 'ru'
export type BestForRussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

function isRuNoteUnclearStatus(status: BestForRussiaStatus): boolean {
  return status === 'unclear' || status === 'unverified'
}

/**
 * Whether non-open listed firms are unclear-then-restricted in list order, or mixed by data.
 * Best-for RU sort only splits available vs not; inside non-open it keeps the data comparator,
 * so live lists are usually mixed when both statuses appear.
 */
export function ruBestForNonOpenOrder(
  nonOpen: ReadonlyArray<{ russiaStatus: BestForRussiaStatus }>,
): 'unclear-only' | 'restricted-only' | 'unclear-then-restricted' | 'mixed' | 'none' {
  if (!nonOpen.length) return 'none'
  const hasUnclear = nonOpen.some(row => isRuNoteUnclearStatus(row.russiaStatus))
  const hasRestricted = nonOpen.some(row => row.russiaStatus === 'restricted')
  if (hasUnclear && !hasRestricted) return 'unclear-only'
  if (hasRestricted && !hasUnclear) return 'restricted-only'
  let seenRestricted = false
  for (const row of nonOpen) {
    if (row.russiaStatus === 'restricted') seenRestricted = true
    else if (isRuNoteUnclearStatus(row.russiaStatus) && seenRestricted) return 'mixed'
  }
  return 'unclear-then-restricted'
}

/**
 * Data-driven RU ranking disclosure for the rendered sort-rule block (RU Writer 2026-11-02).
 * Composes only sentences that match the firms actually listed. Does not change sort order.
 * Empty when fewer than two status groups appear (e.g. no available firms, or only available).
 */
export function ruBestForCtaRankNote(
  ranked: ReadonlyArray<{ slug: string; russiaStatus: BestForRussiaStatus; firm: { name: string } }>,
): string {
  if (!ranked.length) return ''
  const hasAvailable = ranked.some(row => row.russiaStatus === 'available')
  const nonOpen = ranked.filter(row => row.russiaStatus !== 'available')
  const order = ruBestForNonOpenOrder(nonOpen)
  if (!hasAvailable) return ''
  if (order === 'none') return ''

  const statusBySlug = new Map<string, RankingRussiaStatus>(
    ranked.map(row => [row.slug, row.russiaStatus]),
  )
  const statusFor = (slug: string): RankingRussiaStatus => statusBySlug.get(slug) ?? 'unverified'

  let partnerName: string | null = null
  for (const pin of RU_RANKING_PINS) {
    const row = ranked.find(item => item.slug === pin)
    if (!row) continue
    if (activePinIndex(pin, statusFor) < 0) continue
    partnerName = row.firm.name
    break
  }

  const parts: string[] = []
  let open = RU_BEST_FOR_NOTE_OPEN_LEAD
  if (partnerName) open += `; среди них первым стоит наш партнёр ${partnerName}`
  open += '.'
  parts.push(open)

  if (order === 'unclear-only') {
    parts.push(RU_BEST_FOR_NOTE_THEN_UNCLEAR)
  } else if (order === 'restricted-only') {
    parts.push(RU_BEST_FOR_NOTE_THEN_RESTRICTED)
  } else if (order === 'unclear-then-restricted') {
    parts.push(RU_BEST_FOR_NOTE_THEN_UNCLEAR)
    parts.push(RU_BEST_FOR_NOTE_END_RESTRICTED)
  } else if (order === 'mixed') {
    parts.push(RU_BEST_FOR_NOTE_THEN_MIXED)
  }

  // available + non-open description ⇒ ≥2 groups
  parts.push(RU_BEST_FOR_NOTE_INSIDE_GROUPS)
  return parts.join(' ')
}

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

/** Visible "How we ranked" copy — plain reader language; must match the comparator. */
export const BEST_FOR_SORT_RULES: Record<BestForUseCaseId, { en: string; ru: string }> = {
  eas: {
    en: 'How we ranked: highest profit share first, then fewer required trading days, then firm name A–Z. Editorial score and affiliate status are not used.',
    ru: 'Как ранжируем: сначала большая доля прибыли, затем меньше обязательных торговых дней, затем имя A–Z. Редакционный скор не влияет.',
  },
  'news-trading': {
    en: 'How we ranked: highest profit share first, then fewer days to the first payout, then firm name A–Z. Affiliate status is not used.',
    ru: 'Как ранжируем: сначала большая доля прибыли, затем меньше дней до первой выплаты, затем имя A–Z.',
  },
  scalping: {
    en: 'How we ranked: programmes that explicitly require no minimum hold time first, then highest profit share, then firm name A–Z. If a firm has not published a hold-time rule yet, we may use a labelled stand-in; a missing rule is never treated as “no minimum”.',
    ru: 'Как ранжируем: сначала программы с явным «без минимума удержания», затем большая доля прибыли, затем имя A–Z. Если правило удержания ещё не опубликовано, возможен помеченный запасной критерий; отсутствие правила никогда не считается «без минимума».',
  },
  beginners: {
    en: 'How we ranked: programmes with no evaluation time limit first, then those with at most 5 minimum trading days (fewer ranks higher), then static or end-of-day drawdown (if the type is not stated, they rank last), then faster first payout, then lower entry relative to the cap in that programme’s own currency ($99 or €99, never converted), then firm name A–Z. Affiliate status is not used. We leave out programmes above the price cap, without a published price, or with data older than 30 days.',
    ru: 'Как ранжируем: сначала программы без лимита срока оценки, затем с минимумом торговых дней не больше 5 (чем меньше, тем выше), затем со статичной просадкой или просадкой по закрытию дня (если тип не указан — в конце), затем с более быстрой первой выплатой, затем дешевле относительно потолка в своей валюте ($99 или €99, без конвертации). В список не попадают фирмы, у которых Россия в списке ограничений, программы дороже потолка или без цены, а также данные старше 30 дней.',
  },
  'weekly-payouts': {
    en: 'How we ranked: highest profit share first, then fewer days to the first payout, then firm name A–Z. Only programmes that pay every week qualify.',
    ru: 'Как ранжируем: сначала большая доля прибыли, затем меньше дней до первой выплаты, затем имя A–Z. Подходят только программы с еженедельными выплатами.',
  },
  'no-time-limit': {
    en: 'How we ranked: among programmes with no evaluation time limit — highest profit share first, then fewer required trading days, then firm name A–Z.',
    ru: 'Как ранжируем: среди программ без лимита срока оценки — сначала большая доля прибыли, затем меньше обязательных дней, затем имя A–Z.',
  },
  'low-drawdown': {
    en: 'How we ranked: among programmes that publish loss limits as percentages — lowest overall loss limit first, then lowest daily loss limit, then firm name A–Z. Programmes that only publish dollar caps (common on futures) are listed in a separate unranked group; we never convert dollars into percentages.',
    ru: 'Как ранжируем: среди программ с лимитами убытка в процентах — сначала меньший общий лимит, затем меньший дневной, затем имя A–Z. Программы только с лимитами в долларах (часто фьючерсы) — отдельная группа без ранга; доллары в проценты не переводим.',
  },
  'small-accounts': {
    en: 'How we ranked: smallest published account size first, then highest profit share, then firm name A–Z. Challenge price is not used for this ranking.',
    ru: 'Как ранжируем: сначала наименьший опубликованный размер счёта, затем большая доля прибыли, затем имя A–Z. Цена челленджа в этом рейтинге не используется.',
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
  /** Beginners RU: firms excluded solely because russiaStatus === restricted. */
  excludedRestrictedFirms?: { slug: string; name: string; reviewPath: string | null }[]
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
 * Prefers phaseEvaluationTimeLimits (schema/Tracker) → evaluationTimeLimit →
 * legacy phasesDetail → legacy maxTradingDaysUnlimited only when structured
 * fields are absent. Returns { ok, viaProxy }.
 */
export function productHasNoTimeLimit(product: Challenge): { ok: boolean; viaProxy: boolean } {
  const phaseLimits = product.phaseEvaluationTimeLimits
  if (Array.isArray(phaseLimits) && phaseLimits.length > 0) {
    if (phaseLimits.every(isValidTimeLimit)) {
      const allUnlimited = phaseLimits.every(limit => limit.unlimited === true && limit.days === null)
      return { ok: allUnlimited, viaProxy: false }
    }
    return { ok: false, viaProxy: false }
  }
  if (product.evaluationTimeLimit !== undefined) {
    if (!isValidTimeLimit(product.evaluationTimeLimit)) return { ok: false, viaProxy: false }
    const limit = product.evaluationTimeLimit
    return { ok: limit.unlimited === true && limit.days === null, viaProxy: false }
  }
  // Legacy phasesDetail only when schema fields are absent
  const legacyPhases = product.phasesDetail
  if (Array.isArray(legacyPhases) && legacyPhases.length > 0) {
    const limits = legacyPhases.map(phase => phase.evaluationTimeLimit)
    if (limits.every(isValidTimeLimit)) {
      const allUnlimited = limits.every(limit => limit!.unlimited === true && limit!.days === null)
      return { ok: allUnlimited, viaProxy: false }
    }
    return { ok: false, viaProxy: false }
  }
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

export function lowestEntryPriceEur(product: Challenge): number | null {
  const prices = (product.accountSizes ?? [])
    .map(tier => tier.priceEur)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (!prices.length) return null
  return Math.min(...prices)
}

export type BeginnerEntryQuote = {
  currency: 'USD' | 'EUR'
  price: number
  cap: number
  /** price / cap — cross-currency ranking key; never an FX conversion. */
  ratio: number
}

/**
 * Beginners entry quote: prefer USD when any priceUsd exists; else EUR-only.
 * Never converts currencies.
 */
export function beginnerEntryQuote(
  product: Challenge,
  opts: { maxUsd?: number; maxEur?: number } = {},
): BeginnerEntryQuote | null {
  const maxUsd = opts.maxUsd ?? BEGINNER_MAX_ENTRY_PRICE_USD
  const maxEur = opts.maxEur ?? BEGINNER_MAX_ENTRY_PRICE_EUR
  const usd = lowestEntryPriceUsd(product)
  if (usd != null) {
    return { currency: 'USD', price: usd, cap: maxUsd, ratio: usd / maxUsd }
  }
  const eur = lowestEntryPriceEur(product)
  if (eur != null) {
    return { currency: 'EUR', price: eur, cap: maxEur, ratio: eur / maxEur }
  }
  return null
}

function entryPriceUsdValue(_firm: Firm, products: Challenge[]): string | null {
  const prices = products.map(lowestEntryPriceUsd).filter((value): value is number => value != null)
  if (!prices.length) return null
  return String(Math.min(...prices))
}

/** Best (lowest-ratio) beginner quote across products — for ranking + display. */
export function bestBeginnerEntryQuote(
  products: Challenge[],
  opts?: { maxUsd?: number; maxEur?: number },
): BeginnerEntryQuote | null {
  let best: BeginnerEntryQuote | null = null
  for (const product of products) {
    const quote = beginnerEntryQuote(product, opts)
    if (!quote) continue
    if (
      !best
      || quote.ratio < best.ratio
      || (quote.ratio === best.ratio && quote.currency === 'USD' && best.currency === 'EUR')
      || (quote.ratio === best.ratio && quote.currency === best.currency && quote.price < best.price)
    ) {
      best = quote
    }
  }
  return best
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
  | 'price-missing'
  | 'price-too-high'
  | 'russia-restricted'
  /** @deprecated kept for older diagnostics — mapped from price-missing */
  | 'price-usd-missing'
  /** @deprecated mapped from price-too-high */
  | 'price-usd-too-high'

export type BeginnerProductOpts = {
  maxEntryPriceUsd?: number
  maxEntryPriceEur?: number
  now?: Date
}

export type BeginnerFirmOpts = BeginnerProductOpts & {
  /** RU page applies this; EN beginners skips (Russia access is not a natural EN filter). */
  applyRussiaFilter?: boolean
}

/**
 * Hard product filters for beginners: fresh capture + published price within
 * the matching currency cap (USD preferred when present; else EUR-only).
 * Never converts currencies. Unlimited / min days / drawdown / payout are ranking only.
 */
export function beginnerProductFailures(
  product: Challenge,
  opts: BeginnerProductOpts = {},
): BeginnerFilterFailReason[] {
  const maxUsd = opts.maxEntryPriceUsd ?? BEGINNER_MAX_ENTRY_PRICE_USD
  const maxEur = opts.maxEntryPriceEur ?? BEGINNER_MAX_ENTRY_PRICE_EUR
  const now = opts.now ?? new Date()
  const reasons: BeginnerFilterFailReason[] = []
  if (!isChallengeFresh(product, now)) reasons.push('not-fresh')
  const quote = beginnerEntryQuote(product, { maxUsd, maxEur })
  if (!quote) {
    reasons.push('price-missing')
    reasons.push('price-usd-missing')
  } else if (quote.price > quote.cap) {
    reasons.push('price-too-high')
    if (quote.currency === 'USD') reasons.push('price-usd-too-high')
  }
  return reasons
}

export function isBeginnerFriendlyProduct(
  product: Challenge,
  opts?: BeginnerProductOpts,
): boolean {
  return beginnerProductFailures(product, opts).length === 0
}

export function beginnerFirmFailures(
  firm: Firm,
  products: Challenge[],
  opts: BeginnerFirmOpts = {},
): BeginnerFilterFailReason[] {
  const reasons: BeginnerFilterFailReason[] = []
  if (opts.applyRussiaFilter && russiaStatusOf(firm) === 'restricted') {
    reasons.push('russia-restricted')
  }
  const passing = products.filter(product => isBeginnerFriendlyProduct(product, opts))
  if (passing.length) return reasons

  if (!products.length) {
    reasons.push('not-fresh')
    return [...new Set(reasons)]
  }
  const allReasons = products.map(product => beginnerProductFailures(product, opts))
  if (allReasons.every(list => list.includes('not-fresh'))) reasons.push('not-fresh')
  else if (allReasons.every(list => list.includes('price-missing') || list.includes('price-usd-missing'))) {
    reasons.push('price-missing')
    reasons.push('price-usd-missing')
  } else if (allReasons.some(list => list.includes('price-too-high') || list.includes('price-usd-too-high'))) {
    reasons.push('price-too-high')
  } else if (allReasons.some(list => list.includes('price-missing') || list.includes('price-usd-missing'))) {
    reasons.push('price-missing')
  } else reasons.push('not-fresh')
  return [...new Set(reasons)]
}

export function beginnerFriendly(
  firm: Firm,
  products: Challenge[],
  opts: BeginnerFirmOpts = {},
): boolean {
  return beginnerFirmFailures(firm, products, opts).length === 0
}

export function listBeginnerFriendlyFirms(
  now = new Date(),
  opts: { applyRussiaFilter?: boolean; maxEntryPriceUsd?: number } = {},
) {
  return getAllFirms().flatMap(firm => {
    const products = primaryProducts(firm, now).filter(product =>
      isBeginnerFriendlyProduct(product, { now, maxEntryPriceUsd: opts.maxEntryPriceUsd }),
    )
    if (!beginnerFriendly(firm, products, { now, ...opts })) return []
    if (!products.length) return []
    return [{
      firmSlug: firmSlug(firm.name),
      firmName: firm.name,
      russiaStatus: russiaStatusOf(firm),
      products: products.map(product => {
        const quote = beginnerEntryQuote(product)!
        return {
          productSlug: product.productSlug,
          minTradingDays: product.minTradingDays ?? null,
          drawdownType: product.drawdownType == null ? null : String(product.drawdownType),
          entryPriceUsd: quote.currency === 'USD' ? quote.price : null,
          entryPriceEur: quote.currency === 'EUR' ? quote.price : null,
          entryCurrency: quote.currency,
          entryRatio: quote.ratio,
          noTimeLimit: productHasNoTimeLimit(product).ok,
          viaTimeLimitProxy: productHasNoTimeLimit(product).viaProxy,
          payoutFirstDays: product.payoutFirstDays ?? null,
        }
      }),
    }]
  })
}

function ruReviewPathForSlug(slug: string): string | null {
  const hit = RU_REVIEW_FIRMS.find(entry => entry.firm === slug)
  return hit?.path ?? null
}

/** Firms that would pass beginners hard product filters but are russiaStatus === restricted. */
export function listBeginnersExcludedRestricted(
  now = new Date(),
  opts: { maxEntryPriceUsd?: number; maxEntryPriceEur?: number } = {},
) {
  return getAllFirms().flatMap(firm => {
    if (russiaStatusOf(firm) !== 'restricted') return []
    const products = primaryProducts(firm, now).filter(product =>
      isBeginnerFriendlyProduct(product, {
        now,
        maxEntryPriceUsd: opts.maxEntryPriceUsd,
        maxEntryPriceEur: opts.maxEntryPriceEur,
      }),
    )
    if (!products.length) return []
    const slug = firmSlug(firm.name)
    return [{ slug, name: firm.name, reviewPath: ruReviewPathForSlug(slug) }]
  }).sort((a, b) => a.name.localeCompare(b.name))
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
      en: 'Prop firms that explicitly allow Expert Advisors. Compare profit shares, payouts, drawdown and platforms — every figure from firm data.',
      ru: 'Проп-фирмы, где явно разрешены советники. Сравниваем долю прибыли, выплаты, просадку и платформы — только из данных фирм.',
    },
    intro: {
      en: 'These firms explicitly allow Expert Advisors on at least one current product. Firms that ban EAs or leave EA permission unconfirmed do not qualify.',
      ru: 'Здесь только фирмы, которые явно разрешают советники хотя бы на одном актуальном продукте. Запрет советников или «не подтверждено» не подходят.',
    },
    methodology: {
      en: 'A firm qualifies when its profile marks EAs as allowed, or a challenge captured within 30 days explicitly allows EAs.',
      ru: 'Фирма попадает в список, если в профиле советники разрешены или в челлендже не старше 30 дней это явно указано.',
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
      en: 'A firm qualifies when its profile allows news trading, or a challenge captured within 30 days explicitly allows it.',
      ru: 'Фирма попадает в список, если в профиле разрешена торговля на новостях или это явно указано в челлендже не старше 30 дней.',
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
      en: 'Prop firms with an explicit no-minimum hold time. A missing hold rule is never treated as “no minimum”.',
      ru: 'Проп-фирмы с явным «без минимума удержания». Если правило не заявлено, это никогда не считается нулём.',
    },
    intro: {
      en: 'Scalping-friendly means a fresh product that explicitly requires no minimum hold time. If the firm has not published that rule yet, a labelled stand-in may appear; a missing rule never counts as “no minimum”.',
      ru: '«Для скальпинга» — свежий продукт с явным «без минимума удержания». Если правило ещё не опубликовано, возможен помеченный запасной критерий; отсутствие правила не считается «без минимума».',
    },
    methodology: {
      en: 'We prefer the published minimum-hold rule on each product (not a generic “scalping allowed” flag). Explicit “no minimum” ranks first; not stated never ranks as zero. If the field is still missing, a labelled stand-in may qualify the firm.',
      ru: 'Берём опубликованное правило минимального удержания по продукту (не общий флаг «скальпинг разрешён»). Явное «без минимума» — выше; «не заявлено» никогда не ноль. Если поля ещё нет — возможен помеченный запасной критерий.',
    },
    fields: ['minHoldSeconds', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: scalpingProxy,
    dataNote: 'Minimum-hold rules come from product captures. Until published, a labelled stand-in (news/EA plus a known payout path) may qualify a firm — a missing rule is never treated as zero.',
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
      en: 'Lower-priced prop programmes for beginners, ranked by time limit, trading days, drawdown type and payout speed from fresh firm data.',
      ru: 'Более доступные программы для новичков: рейтинг по лимиту срока, торговым дням, типу просадки и скорости выплат по свежим данным фирм.',
    },
    intro: {
      en: 'Beginner-friendly means a fresh product with a published entry fee at or under our ceiling. No time limit, low minimum trading days, static or end-of-day drawdown and payout speed rank the list — they are not hard filters. The English page does not filter on Russia access.',
      ru: '«Для новичков» — свежий продукт с опубликованным входом не выше потолка. Без лимита срока, низкий минимум дней, статичная или дневная просадка и скорость выплат ранжируют список, но не отсекают. Фирмы, у которых Россия в списке ограничений, исключены (список ниже).',
    },
    methodology: {
      en: `Hard filters: data captured within 30 days; entry fee within $${BEGINNER_MAX_ENTRY_PRICE_USD} or €${BEGINNER_MAX_ENTRY_PRICE_EUR} in the fee’s own currency (USD preferred when both exist, never converted). Ranking signals: no time limit, then at most ${BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS} minimum trading days, then static or end-of-day drawdown, then faster first payout, then lower fee relative to that currency’s cap. Every Russian-page firm keeps a sign-up link with a Russia-access badge.`,
      ru: `Жёсткие фильтры: данные не старше 30 дней; вход ≤$${BEGINNER_MAX_ENTRY_PRICE_USD} или ≤€${BEGINNER_MAX_ENTRY_PRICE_EUR} в валюте цены (при обеих предпочитаем доллары; без конвертации). Ранжирование: без лимита срока → минимум дней ≤${BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS} → статичная или дневная просадка → быстрее первая выплата → ниже доля от потолка своей валюты. У каждой фирмы в RU-рейтинге — ссылка регистрации и бейдж доступа для РФ.`,
    },
    fields: ['maxTradingDays', 'minTradingDays', 'drawdownType', 'entryPriceUsd', 'profitSplitPct', 'payoutFrequency', 'payoutFirstDays', 'consistencyRule', 'phases'],
    qualifies: (firm, products) => beginnerFriendly(firm, products, { applyRussiaFilter: false }),
    dataNote: `Entry caps: $${BEGINNER_MAX_ENTRY_PRICE_USD} / €${BEGINNER_MAX_ENTRY_PRICE_EUR}; we rank by fee ÷ that currency’s cap (no FX). Every RU firm — ranked or excluded for listing Russia on its restriction list — keeps a sign-up link and Russia-access badge.`,
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
      en: 'A firm qualifies only when it pays every week. Bi-weekly and on-demand schedules do not qualify.',
      ru: 'Подходят только программы с выплатами каждую неделю. Раз в две недели и по запросу — нет.',
    },
    methodology: {
      en: 'Weekly payouts only. The English URL is left unset so we do not duplicate the blog guide at /blog/prop-firms-with-weekly-payouts.',
      ru: 'Только еженедельные выплаты. Отдельной EN-страницы нет — есть гайд /blog/prop-firms-with-weekly-payouts.',
    },
    fields: ['payoutFrequency', 'payoutFirstDays', 'profitSplitPct', 'drawdownType', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: hasWeeklyPayout,
    relatedPaths: { ru: ['/blog/prop-firms-with-weekly-payouts'] },
    dataNote: 'English route intentionally unset (blog duplicate). Russian page only until EN Writer decides otherwise.',
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
      en: 'Prop firms with no evaluation time limit on a current product.',
      ru: 'Проп-фирмы без лимита срока оценки на актуальном продукте.',
    },
    intro: {
      en: '“No time limit” means the firm publishes an unlimited evaluation window on the product (or on every phase). An older “unlimited days” flag is only a labelled stand-in when the newer field is still missing.',
      ru: '«Без лимита» — у продукта (или у каждого этапа) опубликован неограниченный срок оценки. Старый флаг «без лимита дней» — только помеченный запасной вариант, если нового поля ещё нет.',
    },
    methodology: {
      en: 'We prefer the structured evaluation time-limit fields on each product. “Not stated” never counts as unlimited. An older unlimited-days flag is only a labelled stand-in when those fields are missing.',
      ru: 'Предпочитаем структурированные поля срока оценки по продукту. «Не заявлено» никогда не считается «без лимита». Старый флаг — только помеченный запасной вариант, если новых полей нет.',
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
      en: 'Ranked by overall then daily percentage loss limits. Futures dollar caps are listed separately — never converted to percentages.',
      ru: 'Ранг по общему, затем дневному лимиту убытка в процентах. Долларные лимиты фьючерсов — отдельно, без перевода в проценты.',
    },
    intro: {
      en: 'We rank programmes that publish max and daily loss as percentages, from lowest to highest. Programmes that only publish dollar caps (common for futures) appear in a separate unranked group — dollar amounts are never converted into percentages.',
      ru: 'Ранжируем программы с лимитами убытка в процентах — от меньшего к большему. Только долларовые лимиты (часто фьючерсы) — отдельная группа без ранга; доллары в проценты не переводим.',
    },
    methodology: {
      en: 'Comparison columns: overall loss %, daily loss %, drawdown type, profit share, payout timing, minimum trading days and phases. Dollar caps stay in the unranked group.',
      ru: 'Сравниваем: общий лимит убытка %, дневной %, тип просадки, долю прибыли, сроки выплат, минимум дней и этапы. Долларовые лимиты остаются в группе без ранга.',
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
      en: 'Ranked by the smallest published account size, not by challenge price.',
      ru: 'Ранг по наименьшему опубликованному размеру счёта, не по цене челленджа.',
    },
    intro: {
      en: 'The smallest published account size wins. Challenge fee is shown when known but never drives this ranking.',
      ru: 'Побеждает наименьший опубликованный размер счёта. Цена челленджа показывается, но не определяет порядок.',
    },
    methodology: {
      en: 'We sort by the smallest published account size. Ties break on higher profit share, then firm name.',
      ru: 'Сортируем по наименьшему опубликованному размеру счёта. При равенстве — большая доля прибыли, затем имя.',
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
      // Lexicographic: unlimited → minDays≤5 → minDays → preferred DD →
      // payoutFirstDays → entry ratio to own cap (no FX) → USD before EUR on tie.
      const unlimited = products.some(product => productHasNoTimeLimit(product).ok) ? 0 : 1
      const daysList = products
        .map(product => product.minTradingDays)
        .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
      const bestDays = daysList.length ? Math.min(...daysList) : null
      const daysPreferred = bestDays != null && bestDays <= BEGINNER_PREFERRED_MAX_MIN_TRADING_DAYS ? 0 : 1
      const preferredDd = products.some(product =>
        product.drawdownType != null
        && (BEGINNER_PREFERRED_DRAWDOWN_TYPES as readonly string[]).includes(product.drawdownType),
      ) ? 0 : 1
      const firstDays = products
        .map(product => product.payoutFirstDays)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      const bestFirst = firstDays.length ? Math.min(...firstDays) : null
      const quote = bestBeginnerEntryQuote(products)
      return [
        unlimited,
        daysPreferred,
        numOrInf(bestDays, 9999),
        preferredDd,
        numOrInf(bestFirst, 9999),
        numOrInf(quote?.ratio ?? null, 9999),
        quote?.currency === 'EUR' ? 1 : 0,
        numOrInf(quote?.price ?? null, 999999),
      ]
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
): { ranked: BestForRankedFirm[]; unrankedUsd: BestForRankedFirm[]; excludedRestricted: { slug: string; name: string; reviewPath: string | null }[] } {
  const ranked: BestForRankedFirm[] = []
  const unrankedUsd: BestForRankedFirm[] = []

  const excludedRestricted: { slug: string; name: string; reviewPath: string | null }[] = []

  for (const firm of getAllFirms()) {
    const products = primaryProducts(firm, now)
    const slug = firmSlug(firm.name)
    if (useCase.id === 'beginners') {
      // EN skips Russia filter (not a natural EN criterion). RU excludes restricted
      // firms that otherwise pass hard product filters, and lists them in a note.
      const applyRussia = lang === 'ru'
      if (applyRussia && russiaStatusOf(firm) === 'restricted') {
        const wouldPass = products.some(product => isBeginnerFriendlyProduct(product, { now }))
        if (wouldPass) excludedRestricted.push({ slug, name: firm.name, reviewPath: ruReviewPathForSlug(slug) })
        continue
      }
      if (!beginnerFriendly(firm, products, { now, applyRussiaFilter: false })) continue
    } else if (!useCase.qualifies(firm, products)) {
      continue
    }
    const qualified = qualifyingProductsFor(useCase, firm, products, now)
    if (!qualified.length && useCase.id !== 'low-drawdown') continue

    if (useCase.id === 'low-drawdown') {
      const pctProducts = qualified.filter(product => productDrawdownBasis(product) === 'pct')
      // USD footnote only: omit products Tracker marks soldToNewBuyers===false.
      // Leave pctProducts / primaryProducts / other use cases untouched.
      const usdProducts = qualified.filter(
        product => productDrawdownBasis(product) === 'usd' && product.soldToNewBuyers !== false,
      )
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
          showRuSignupCta: true, // RU site rule: every listed firm gets CTA + Russia-access badge
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
      showRuSignupCta: true, // RU site rule: every listed firm gets CTA + Russia-access badge
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
  // RU CTA standing rule (RuGoLink 2026-10-14): available first, active pins
  // ahead within that group, then existing data sort inside each group.
  // EN keeps the pure data order above.
  if (lang === 'ru') {
    const statusBySlug = new Map<string, RankingRussiaStatus>(
      ranked.map(row => [row.slug, row.russiaStatus]),
    )
    const statusFor = (slug: string): RankingRussiaStatus => statusBySlug.get(slug) ?? 'unverified'
    ranked.sort((a, b) => {
      const aOpen = statusFor(a.slug) === 'available'
      const bOpen = statusFor(b.slug) === 'available'
      if (aOpen !== bOpen) return aOpen ? -1 : 1
      if (aOpen) {
        const pinA = activePinIndex(a.slug, statusFor)
        const pinB = activePinIndex(b.slug, statusFor)
        const pinRank = (pin: number) => (pin < 0 ? Number.POSITIVE_INFINITY : pin)
        const pinCmp = pinRank(pinA) - pinRank(pinB)
        if (pinCmp !== 0) return pinCmp
      }
      return byRule(a, b)
    })
  }
  unrankedUsd.sort((a, b) => a.firm.name.localeCompare(b.firm.name))
  // FundedNext last among excluded (CR 2026-11-02); otherwise name A–Z.
  excludedRestricted.sort((a, b) => {
    if (a.slug === 'fundednext') return 1
    if (b.slug === 'fundednext') return -1
    return a.name.localeCompare(b.name)
  })
  return { ranked, unrankedUsd, excludedRestricted }
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
  /** Override content/ root for tests — never write into the real content/ tree from tests. */
  verdictRoot = process.cwd(),
): BestForPageModel | null {
  const useCase = getBestForUseCase(useCaseId)
  if (!useCase) return null
  const path = bestForPath(useCase.id, lang)
  if (!path) return null // language slug unset → no page

  const { ranked, unrankedUsd, excludedRestricted } = rankBestFor(useCase, lang, now)
  const gatePool = useCase.id === 'low-drawdown' ? ranked : ranked
  const { count, fields } = countDifferingFields(gatePool, useCase.fields.filter(key => {
    // USD-only columns don't count toward the %-ranking gate
    if (useCase.id === 'low-drawdown' && (key === 'maxLossUsd' || key === 'dailyLossUsd')) return false
    return true
  }))

  let verdict: Verdict | null = null
  try {
    verdict = loadVerdict('best-for', useCase.id, lang, verdictRoot)
  } catch (error) {
    throw error
  }
  const hasVerdict = verdict != null
  const reasons: string[] = []
  if (gatePool.length < BEST_FOR_MIN_FIRMS) {
    reasons.push(`need at least ${BEST_FOR_MIN_FIRMS} ranked firms (have ${gatePool.length})`)
  }
  if (count < BEST_FOR_MIN_DIFF_FIELDS) {
    const fieldLabels = fields.map(key => BEST_FOR_FIELD_SPECS[key].label[lang]).join(', ')
    reasons.push(`need ≥${BEST_FOR_MIN_DIFF_FIELDS} differing fields (have ${count}: ${fieldLabels || 'none'})`)
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
    sortRule: (() => {
      const base = BEST_FOR_SORT_RULES[useCase.id][lang]
      if (lang !== 'ru') return base
      const note = ruBestForCtaRankNote(ranked)
      return note ? `${base} ${note}` : base
    })(),
    usedScalpingProxy,
    usedTimeLimitProxy,
    excludedRestrictedFirms: useCase.id === 'beginners' && lang === 'ru' ? excludedRestricted : undefined,
  }
}

export function getBestForPageModels(now = new Date(), verdictRoot = process.cwd()): BestForPageModel[] {
  const models: BestForPageModel[] = []
  for (const useCase of BEST_FOR_USE_CASES) {
    for (const lang of ['en', 'ru'] as BestForLang[]) {
      const model = buildBestForPageModel(useCase.id, lang, now, verdictRoot)
      if (model) models.push(model)
    }
  }
  return models
}

export function indexableBestForPaths(now = new Date(), verdictRoot = process.cwd()): string[] {
  return getBestForPageModels(now, verdictRoot).filter(model => model.indexable).map(model => model.path)
}

/**
 * EN↔RU hreflang only when BOTH sides exist AND both are indexable.
 * weekly-payouts (EN unset) and low-drawdown/small-accounts (RU unset) never pair.
 */
export function bestForRoutePair(pathname: string, now = new Date(), verdictRoot = process.cwd()): { en: string; ru: string } | undefined {
  const id = bestForUseCaseIdFromPath(pathname)
  if (!id) return undefined
  const enPath = bestForPath(id, 'en')
  const ruPath = bestForPath(id, 'ru')
  if (!enPath || !ruPath) return undefined
  const en = buildBestForPageModel(id, 'en', now, verdictRoot)
  const ru = buildBestForPageModel(id, 'ru', now, verdictRoot)
  if (!en?.indexable || !ru?.indexable) return undefined
  return { en: en.path, ru: ru.path }
}

/** Feature-page reverse link target — only when the EN best-for page is indexable. */
export function bestForIndexableFeatureLink(featureSlug: 'ea-allowed' | 'news-trading', verdictRoot = process.cwd()): string | null {
  const id: BestForUseCaseId = featureSlug === 'ea-allowed' ? 'eas' : 'news-trading'
  const model = buildBestForPageModel(id, 'en', new Date(), verdictRoot)
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
