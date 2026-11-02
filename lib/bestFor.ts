// Explicit extensions keep this module executable from the Node test scripts.
import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
  type Firm,
  type PayoutFrequency,
  type RuleAvailability,
} from './firms.ts'
import { firmSlug } from './firmSlug.ts'
import { loadVerdict, type Verdict } from './verdicts.ts'

/**
 * Reusable "best prop firms for X" pages (W45).
 *
 *   EN  /best-prop-firms-for/<useCase>
 *   RU  /ru/luchshie-prop-firmy-dlya/<useCase>
 *
 * Index gate (operating-plan-4w §B + EA W45): a page is indexable only when
 * BOTH hold:
 *   1. a writer verdict exists at content/verdicts/best-for/<useCase>[.ru].md
 *   2. at least BEST_FOR_MIN_DIFF_FIELDS comparison fields differ across the
 *      ranked firms (non-null values, ≥2 distinct)
 *
 * Until both pass, the page renders with robots noindex and stays out of the
 * sitemap and hreflang. Placeholder slugs below are for writers / RU SEO Lead
 * to confirm; renaming is a one-line change in BEST_FOR_USE_CASES.
 *
 * Existing /prop-firms/<feature> slices (ea-allowed, news-trading) and the
 * /blog/prop-firms-with-weekly-payouts article are untouched. These routes are
 * the gated, verdict-backed ranking pages writers are waiting on.
 */

export const BEST_FOR_MIN_DIFF_FIELDS = 5
export const BEST_FOR_MIN_FIRMS = 2

export type BestForLang = 'en' | 'ru'
export type BestForRussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

function russiaStatusOf(firm: Firm): BestForRussiaStatus {
  const status = firm.russiaStatus
  if (status === 'available' || status === 'restricted' || status === 'unclear' || status === 'unverified') return status
  return 'unverified'
}
export type BestForUseCaseId =
  | 'eas'
  | 'news-trading'
  | 'scalping'
  | 'beginners'
  | 'weekly-payouts'
  | 'no-time-limit'

/** Comparison fields used for the ≥5 differing-fields index gate. */
export type BestForFieldKey =
  | 'profitSplitPct'
  | 'drawdownType'
  | 'payoutFrequency'
  | 'eaAllowed'
  | 'newsTradingAllowed'
  | 'platforms'
  | 'minTradingDays'
  | 'maxTradingDays'
  | 'consistencyRule'
  | 'phases'

export interface BestForFieldSpec {
  key: BestForFieldKey
  label: { en: string; ru: string }
  /** Stable string for equality; null = unverified / omit from the gate. */
  read: (firm: Firm, products: Challenge[]) => string | null
}

export interface BestForUseCase {
  id: BestForUseCaseId
  /** EN URL segment under /best-prop-firms-for/ */
  enSlug: string
  /** RU URL segment under /ru/luchshie-prop-firmy-dlya/ */
  ruSlug: string
  label: { en: string; ru: string }
  h1: { en: string; ru: string }
  /** Placeholder titles — RU SEO Lead / writers confirm before index. */
  metaTitle: { en: string; ru: string }
  metaDescription: { en: string; ru: string }
  intro: { en: string; ru: string }
  methodology: { en: string; ru: string }
  /** Fields shown in the comparison table and counted by the gate. */
  fields: BestForFieldKey[]
  /**
   * Firm qualifies when at least one fresh product (or the firm-level flag)
   * matches. Never invent: null / unverified never qualifies.
   */
  qualifies: (firm: Firm, products: Challenge[]) => boolean
  /** Optional note for writers/Tracker when structured data is thin. */
  dataNote?: string
  lastReviewed: string
}

export interface BestForRankedFirm {
  firm: Firm
  slug: string
  products: Challenge[]
  /** Short highlight under the name (from real data only). */
  highlight: string
  russiaStatus: BestForRussiaStatus
  /** Sign-up CTA on RU only when russiaStatus === 'available'. */
  showRuSignupCta: boolean
  fieldValues: Partial<Record<BestForFieldKey, string | null>>
}

export interface BestForPageModel {
  useCase: BestForUseCase
  lang: BestForLang
  path: string
  twinPath: string
  ranked: BestForRankedFirm[]
  differingFieldCount: number
  differingFields: BestForFieldKey[]
  hasVerdict: boolean
  verdict: Verdict | null
  /** True only when verdict exists AND ≥ BEST_FOR_MIN_DIFF_FIELDS differ. */
  indexable: boolean
  reasons: string[]
  lastReviewed: string
}

const FRESH = (product: Challenge, now = new Date()) => isChallengeFresh(product, now)

function primaryProducts(firm: Firm, now = new Date()): Challenge[] {
  return getChallengesByFirm(firmSlug(firm.name)).filter(product => FRESH(product, now))
}

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
  if (products.some(product => product.maxTradingDaysUnlimited === true && product.maxTradingDays == null)) {
    return 'unlimited'
  }
  const days = products
    .filter(product => product.maxTradingDaysUnlimited !== true)
    .map(product => product.maxTradingDays)
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

function platformsValue(firm: Firm, products: Challenge[]): string | null {
  void products
  const list = firm.platforms
  if (!list?.length) return null
  return [...new Set(list.map(item => item.trim()).filter(Boolean))].sort().join('|')
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
  eaAllowed: {
    key: 'eaAllowed',
    label: { en: 'EAs', ru: 'Советники (EA)' },
    read: (firm, products) => firmOrProductRule(
      firm.eaAllowed,
      products.map(product => product.rules?.ea),
    ),
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
    read: (firm, products) => platformsValue(firm, products),
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
}

const DEFAULT_FIELDS: BestForFieldKey[] = [
  'profitSplitPct',
  'drawdownType',
  'payoutFrequency',
  'eaAllowed',
  'newsTradingAllowed',
  'platforms',
  'minTradingDays',
  'consistencyRule',
  'phases',
]

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

function hasNoTimeLimit(_firm: Firm, products: Challenge[]): boolean {
  return products.some(
    product => product.maxTradingDaysUnlimited === true && product.maxTradingDays == null,
  )
}

/**
 * Beginners: a fresh product that is instant (phases === 0) or explicitly
 * sets minTradingDays === 0 (no minimum). A 1-step with an unverified or
 * positive minimum does not qualify on its own.
 */
function beginnerFriendly(_firm: Firm, products: Challenge[]): boolean {
  if (!products.length) return false
  return products.some(product =>
    product.phases === 0
    || product.minTradingDays === 0,
  )
}

/**
 * Scalping: no structured firm/challenge field yet. Until Tracker adds one,
 * only firms that explicitly allow EAs *and* news (common scalping combo) with
 * fresh products qualify as a conservative proxy — still never invents a
 * scalpingAllowed flag. Writers stay noindex until a real field lands.
 */
function scalpingProxy(firm: Firm, products: Challenge[]): boolean {
  if (!products.length) return false
  // Conservative: need allowed (not merely restricted) news OR allowed EA,
  // plus an on-demand / weekly / bi-weekly payout so the table has payout data.
  const newsOk = allowsNews(firm, products)
  const eaOk = allowsEa(firm, products) || firm.eaAllowed === 'restricted'
  const payout = payoutValue(firm, products)
  return (newsOk || eaOk) && payout != null
}

export const BEST_FOR_USE_CASES: BestForUseCase[] = [
  {
    id: 'eas',
    enSlug: 'eas',
    ruSlug: 'ea',
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
      en: 'These firms explicitly allow Expert Advisors on at least one current product. Restricted or unverified EA rules do not qualify. Ranked by our editorial score; affiliate status adds 0 points.',
      ru: 'Здесь только фирмы, которые явно разрешают советники хотя бы на одном актуальном продукте. Ограничения и «не подтверждено» не подходят. Порядок — по редакционному скору; партнёрский статус не влияет.',
    },
    methodology: {
      en: 'A firm qualifies when firms.json eaAllowed is true, or a challenge captured within 30 days sets EA permission to allowed. We never treat restricted or null as permission. Comparison fields come from the same firm and challenge records.',
      ru: 'Фирма попадает в список, если eaAllowed = true в firms.json или в челлендже не старше 30 дней EA явно разрешены. restricted и null не считаются разрешением. Поля сравнения — из тех же записей.',
    },
    fields: ['eaAllowed', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'platforms', 'newsTradingAllowed', 'phases', 'minTradingDays'],
    qualifies: allowsEa,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'news-trading',
    enSlug: 'news-trading',
    ruSlug: 'novostey',
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
      en: 'Only firms that explicitly allow news trading on a current product appear here. A marketing claim without a structured allowed flag does not qualify.',
      ru: 'В списке только фирмы с явным разрешением торговли на новостях на актуальном продукте. Маркетинговые формулировки без флага allowed не считаются.',
    },
    methodology: {
      en: 'Qualification: newsTradingAllowed === true on the firm, or a fresh challenge with news allowed. Restricted windows do not qualify. Field diffs use the comparison columns below.',
      ru: 'Критерий: newsTradingAllowed === true у фирмы или в свежем челлендже news = allowed. Окна ограничений не подходят. Различия считаем по колонкам ниже.',
    },
    fields: ['newsTradingAllowed', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'eaAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: allowsNews,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'scalping',
    enSlug: 'scalping',
    ruSlug: 'skalpinga',
    label: { en: 'Scalping', ru: 'Скальпинг' },
    h1: {
      en: 'Best Prop Firms for Scalping',
      ru: 'Лучшие проп-фирмы для скальпинга',
    },
    metaTitle: {
      en: 'Best Prop Firms for Scalping (2026) — Placeholder',
      ru: 'Проп-фирмы для скальпинга 2026 — черновик',
    },
    metaDescription: {
      en: 'Draft ranking for scalping prop firms. Stays noindex until Tracker adds a scalping field and a writer verdict lands.',
      ru: 'Черновой рейтинг проп-фирм для скальпинга. Остаётся noindex, пока Tracker не добавит поле и писатель — вердикт.',
    },
    intro: {
      en: 'There is no firm-wide scalpingAllowed field yet. This draft uses a conservative proxy (allowed news or EA plus a known payout cadence) so writers can see the template. It stays noindex until Tracker ships a real scalping rule field and a verdict is filed.',
      ru: 'Отдельного поля scalpingAllowed пока нет. Черновик использует осторожный прокси (разрешённые новости или EA плюс известная частота выплат), чтобы показать шаблон. Страница остаётся noindex, пока Tracker не добавит поле и не появится вердикт.',
    },
    methodology: {
      en: 'Proxy only: do not treat this list as a verified scalping allow-list. Once challenges expose a scalping / min-hold field, this use case will switch to that field and drop the proxy.',
      ru: 'Только прокси: не считайте список подтверждённым allow-list для скальпинга. Когда в челленджах появится поле скальпинга / min-hold, критерий переключится на него.',
    },
    fields: DEFAULT_FIELDS,
    qualifies: scalpingProxy,
    dataNote: 'Tracker: add challenge/firm scalpingAllowed or minHoldSeconds before writers index this page.',
    lastReviewed: '2026-11-02',
  },
  {
    id: 'beginners',
    enSlug: 'beginners',
    ruSlug: 'novichkov',
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
      en: 'Prop firms with simpler evaluation paths: no minimum trading days, one-step, or instant. Compare real splits, drawdown and payouts.',
      ru: 'Проп-фирмы с более простым входом: без минимума дней, один шаг или instant. Сравниваем сплит, просадку и выплаты.',
    },
    intro: {
      en: 'Beginner-friendly here means a fresh product with minTradingDays = 0 (no minimum) or an instant (0-phase) path — not marketing copy about being "easy".',
      ru: '«Для новичков» здесь значит свежий продукт с minTradingDays = 0 (без минимума) или instant (0 этапов) — не маркетинговое «просто».',
    },
    methodology: {
      en: 'Qualification uses structured phase and minTradingDays fields only. A null minimum does not mean zero. Consistency, drawdown and payout columns still come from firm/challenge data.',
      ru: 'Критерий — только структурированные phases и minTradingDays. null минимума не равен нулю. Консистентность, просадка и выплаты — из данных фирмы/челленджа.',
    },
    fields: ['phases', 'minTradingDays', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'consistencyRule', 'eaAllowed', 'platforms'],
    qualifies: beginnerFriendly,
    lastReviewed: '2026-11-02',
  },
  {
    id: 'weekly-payouts',
    enSlug: 'weekly-payouts',
    ruSlug: 'ezhenedelnykh-vyplat',
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
      en: 'Prop firms whose current products pay on a weekly cadence. Distinct from the /blog/prop-firms-with-weekly-payouts guide.',
      ru: 'Проп-фирмы с еженедельной частотой выплат на актуальных продуктах. Отдельная страница от гайда в блоге.',
    },
    intro: {
      en: 'A firm qualifies only when payoutFrequency is weekly on the firm record or on a challenge captured within 30 days. Bi-weekly and on-demand do not qualify.',
      ru: 'Фирма попадает в список только при payoutFrequency = weekly у фирмы или в челлендже не старше 30 дней. Bi-weekly и on-demand не подходят.',
    },
    methodology: {
      en: 'Weekly only — not bi-weekly. Distinct from /blog/prop-firms-with-weekly-payouts (editorial guide). This page is the gated ranking template.',
      ru: 'Только weekly, не bi-weekly. Отдельно от /blog/prop-firms-with-weekly-payouts. Здесь — шаблон рейтинга с гейтом.',
    },
    fields: ['payoutFrequency', 'profitSplitPct', 'drawdownType', 'eaAllowed', 'newsTradingAllowed', 'platforms', 'minTradingDays', 'phases'],
    qualifies: hasWeeklyPayout,
    dataNote: 'Few firms currently mark weekly in data; page may stay below the 5-field / 2-firm gate until Tracker expands coverage.',
    lastReviewed: '2026-11-02',
  },
  {
    id: 'no-time-limit',
    enSlug: 'no-time-limit',
    ruSlug: 'bez-limita-vremeni',
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
      en: 'Prop firms whose challenges set maxTradingDaysUnlimited with no finite day cap. Compare splits, drawdown and payouts.',
      ru: 'Проп-фирмы с maxTradingDaysUnlimited и без числового лимита дней. Сравниваем сплит, просадку и выплаты.',
    },
    intro: {
      en: 'Unlimited means maxTradingDaysUnlimited === true and maxTradingDays is null on a fresh product. A missing max day count alone never qualifies.',
      ru: '«Без лимита» — это maxTradingDaysUnlimited === true и maxTradingDays = null на свежем продукте. Пропуск числа дней сам по себе не подходит.',
    },
    methodology: {
      en: 'Follows AGENTS.md: unlimited requires the explicit flag; null maxTradingDays without the flag stays unverified.',
      ru: 'По AGENTS.md: безлимит только с явным флагом; null без флага остаётся «не подтверждено».',
    },
    fields: ['maxTradingDays', 'profitSplitPct', 'drawdownType', 'payoutFrequency', 'minTradingDays', 'consistencyRule', 'eaAllowed', 'platforms'],
    qualifies: hasNoTimeLimit,
    lastReviewed: '2026-11-02',
  },
]

export function getBestForUseCase(idOrSlug: string): BestForUseCase | undefined {
  return BEST_FOR_USE_CASES.find(
    useCase => useCase.id === idOrSlug || useCase.enSlug === idOrSlug || useCase.ruSlug === idOrSlug,
  )
}

export function enBestForPath(useCase: BestForUseCase): string {
  return `/best-prop-firms-for/${useCase.enSlug}`
}

export function ruBestForPath(useCase: BestForUseCase): string {
  return `/ru/luchshie-prop-firmy-dlya/${useCase.ruSlug}`
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

function highlightFor(useCase: BestForUseCase, firm: Firm, products: Challenge[], lang: BestForLang): string {
  const split = splitValue(firm, products)
  const payout = payoutValue(firm, products)
  const parts: string[] = []
  if (split) parts.push(lang === 'ru' ? `сплит ${split}%` : `${split}% split`)
  if (payout) parts.push(payout.replace(/-/g, ' '))
  if (useCase.id === 'no-time-limit') parts.push(lang === 'ru' ? 'без лимита срока' : 'no time limit')
  if (useCase.id === 'eas') parts.push(lang === 'ru' ? 'EA разрешены' : 'EAs allowed')
  if (useCase.id === 'news-trading') parts.push(lang === 'ru' ? 'новости разрешены' : 'news allowed')
  if (useCase.id === 'weekly-payouts') parts.push(lang === 'ru' ? 'еженедельно' : 'weekly')
  if (!parts.length) return lang === 'ru' ? `скор ${firm.score}` : `score ${firm.score}`
  return parts.join(' · ')
}

export function rankBestFor(
  useCase: BestForUseCase,
  lang: BestForLang = 'en',
  now = new Date(),
): BestForRankedFirm[] {
  const firms = getAllFirms()
  const ranked: BestForRankedFirm[] = []
  for (const firm of firms) {
    const products = primaryProducts(firm, now)
    if (!useCase.qualifies(firm, products)) continue
    const slug = firmSlug(firm.name)
    const fieldValues: Partial<Record<BestForFieldKey, string | null>> = {}
    for (const key of useCase.fields) {
      fieldValues[key] = BEST_FOR_FIELD_SPECS[key].read(firm, products)
    }
    const status = russiaStatusOf(firm)
    ranked.push({
      firm,
      slug,
      products,
      highlight: highlightFor(useCase, firm, products, lang),
      russiaStatus: status,
      showRuSignupCta: status === 'available',
      fieldValues,
    })
  }
  ranked.sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))
  return ranked
}

export function buildBestForPageModel(
  useCaseId: string,
  lang: BestForLang,
  now = new Date(),
): BestForPageModel | null {
  const useCase = getBestForUseCase(useCaseId)
  if (!useCase) return null
  const ranked = rankBestFor(useCase, lang, now)
  const { count, fields } = countDifferingFields(ranked, useCase.fields)
  let verdict: Verdict | null = null
  try {
    verdict = loadVerdict('best-for', useCase.id, lang)
  } catch (error) {
    // Invalid verdict files must fail the build loudly (same as rules pages).
    throw error
  }
  const hasVerdict = verdict != null
  const reasons: string[] = []
  if (ranked.length < BEST_FOR_MIN_FIRMS) {
    reasons.push(`need at least ${BEST_FOR_MIN_FIRMS} ranked firms (have ${ranked.length})`)
  }
  if (count < BEST_FOR_MIN_DIFF_FIELDS) {
    reasons.push(`need ≥${BEST_FOR_MIN_DIFF_FIELDS} differing fields (have ${count}: ${fields.join(', ') || 'none'})`)
  }
  if (!hasVerdict) {
    reasons.push(`missing writer verdict content/verdicts/best-for/${useCase.id}${lang === 'ru' ? '.ru' : ''}.md`)
  }
  const indexable = reasons.length === 0
  return {
    useCase,
    lang,
    path: lang === 'ru' ? ruBestForPath(useCase) : enBestForPath(useCase),
    twinPath: lang === 'ru' ? enBestForPath(useCase) : ruBestForPath(useCase),
    ranked,
    differingFieldCount: count,
    differingFields: fields,
    hasVerdict,
    verdict,
    indexable,
    reasons,
    lastReviewed: useCase.lastReviewed,
  }
}

export function getBestForPageModels(now = new Date()): BestForPageModel[] {
  return BEST_FOR_USE_CASES.flatMap(useCase => ([
    buildBestForPageModel(useCase.id, 'en', now)!,
    buildBestForPageModel(useCase.id, 'ru', now)!,
  ]))
}

export function indexableBestForPaths(now = new Date()): string[] {
  return getBestForPageModels(now).filter(model => model.indexable).map(model => model.path)
}

/**
 * EN↔RU hreflang pair only when BOTH sides are indexable (same rule as rules pages).
 */
export function bestForRoutePair(pathname: string, now = new Date()): { en: string; ru: string } | undefined {
  const useCase = BEST_FOR_USE_CASES.find(
    item => enBestForPath(item) === pathname || ruBestForPath(item) === pathname,
  )
  if (!useCase) return undefined
  const en = buildBestForPageModel(useCase.id, 'en', now)
  const ru = buildBestForPageModel(useCase.id, 'ru', now)
  if (!en?.indexable || !ru?.indexable) return undefined
  return { en: en.path, ru: ru.path }
}

/** Placeholder slug list for RU SEO Lead / writers to confirm. */
export function bestForSlugManifest(): Array<{
  id: BestForUseCaseId
  en: string
  ru: string
  dataNote?: string
}> {
  return BEST_FOR_USE_CASES.map(useCase => ({
    id: useCase.id,
    en: enBestForPath(useCase),
    ru: ruBestForPath(useCase),
    dataNote: useCase.dataNote,
  }))
}
