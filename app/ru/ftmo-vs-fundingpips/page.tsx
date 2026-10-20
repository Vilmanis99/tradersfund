import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { ArrowRight, CheckCircle2, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RuPendingLink from '@/components/RuPendingLink'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import Breadcrumbs from '@/components/Breadcrumbs'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import { challengeCurrency, challengeTierEconomics, minimumCostToFundedUsd, getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { goLinkRel } from '@/lib/russiaAvailability'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import fpAccessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'

const PATH = '/ru/ftmo-vs-fundingpips'
const TITLE = 'FTMO или FundingPips: сравнение 2026 и доступ из России'
const DESCRIPTION = 'FTMO или FundingPips: 2-Step, 1-Step и Zero, взносы в EUR и USD, просадка, доля, выплаты и платформы. FTMO закрыта для РФ, у FundingPips статус неясен.'
const FROM = 'ru-comparison-ftmo-fundingpips'

// Every date below is a Prop Firm Tracker capture on origin/daily/2026-10-20b or a merged Tracker data branch
// (data/fundingpips-reward-methods-2026-10-20 @4a230e1, data/key-facts-2026-10-20 @366f156). Gaps: docs/ru-ftmo-vs-fundingpips-notes.md.
/** content/data/firm-check-evidence-2026-10-20.json → unchangedConfirmed.restrictedCountries (FTMO who-can-join, FundingPips Get Started). */
const COUNTRIES_CHECKED = '20.10.2026'
/** content/data/challenges/_captures/fundingpips-2026-10-20.json → refundTerms, briefAsks (checkout, EA, copy trading), scaling (Prime). */
const TRACKER_FP = '20.10.2026'
/** content/data/challenges/_captures/fundingpips-2026-10-20.json → rewardMethods; russian-market-evidence.json payoutEvidence[fundingpips] (data/fundingpips-reward-methods-2026-10-20). */
const FP_REWARD_METHODS = '20.10.2026'
const FP_PAYOUT_COUNTRIES = 'Бельгия, Франция, Германия, Италия, Нидерланды, Испания, Бразилия, Колумбия, Мексика, Нигерия, ЮАР, Великобритания, Турция и Индонезия'
/** content/data/challenges/*.json consistencyRules (data/key-facts-2026-10-20 e007be8/d74b1da, official pages checked 2026-10-20). */
const CONSISTENCY_CHECKED = '20.10.2026'
/** firms.json FTMO payoutMethodsCapturedAt + payoutFrequencyNote. */
const FTMO_PAYOUTS = '20.10.2026'
/** content/data/challenges/_captures/ftmo-2026-10-14.json (split 80/90, fee refund rules, overnight/weekend). */
const FTMO_1410 = '14.10.2026'
/** content/data/firm-rules/_captures/firm-rules-2026-10-15.json (FTMO news/weekend wording, FundingPips platforms). */
const RULES_1510 = '15.10.2026'
/** content/data/challenges/_captures/ftmo-2026-10-19.json (TradingView via OANDA). */
const FTMO_PLATFORMS = '19.10.2026'
const BRIGHT_COUNTRIES = '20.10.2026'
/** content/data/russian-bright-funded-evidence.json → sources.countries / countryTerms (help list of 6 vs Terms §2 list of 5). */
const BRIGHT_CONFLICT = '19.10.2026'
/** Prop Firm Tracker, /workspace/ru-data/2026-10-19-ftmo-brightfunded-payments.md §1 (ftmo.com payment-methods FAQ, checked 2026-10-19). */
const FTMO_CHECKOUT = '19.10.2026'
/** content/data/challenges/_captures/crypto-fund-trader-2026-10-19.json (MT5 is the only platform CFT says is unavailable to US residents). */
const CFT_MT5 = '19.10.2026'
const CFT_ACCESS = '20.10.2026'

/** content/data/russian-fundingpips-access-evidence.json (Get Started, FATF and EU/UN sanctions wording); hidden once older than 30 days. */
const FP_FATF_FRESH = freshDate(fpAccessEvidence.sourceCapturedAt)
const FP_FATF = FP_FATF_FRESH
  ? `оговорка о санкционных списках FATF и ЕС/ООН (по данным на ${ruDate(fpAccessEvidence.sourceCapturedAt)})`
  : 'оговорка о санкционных списках, которую нужно перепроверить'

const SRC = {
  ftmoCountries: 'https://ftmo.com/en/faq/who-can-join-ftmo/',
  ftmoWithdraw: 'https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/',
  ftmoObjectives: 'https://ftmo.com/en/trading-objectives/',
  ftmoTwoStep: 'https://ftmo.com/en/2-step-challenge/',
  ftmoPromoOnDemand: 'https://promo.ftmo.com/m26b-practice-trading-without-risk/',
  ftmoPayments: 'https://ftmo.com/en/faq/what-payment-methods-are-available/',
  brightTerms: 'https://brightfunded.com/terms-and-conditions',
  fpGetStarted: 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started',
  fpRewardMethods: 'https://help.fundingpips.com/hc/en-us/articles/34504564970385-Reward-Methods',
  fpWorkspace: 'https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace',
  fpConduct: 'https://help.fundingpips.com/hc/en-us/articles/34505029138449-Trading-Conduct-and-Security-Standards',
  fpTerms: 'https://fundingpips.com/terms-and-conditions',
  brightCountries: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded',
  cftFaq: 'https://cryptofundtrader.com/faq/',
}

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что лучше: FTMO или FundingPips?',
    a: `Для резидента России — ни одна из двух не подтверждена. FTMO прямо называет Российскую Федерацию в списке ограничений (по данным на ${COUNTRIES_CHECKED}), у FundingPips Россия не названа, но есть ${FP_FATF}. Если обе фирмы вам доступны, выбирайте по продукту: FTMO — возвратный взнос в 2-Step, доля 90% в 1-Step, MT4 и TradingView; FundingPips — еженедельные выплаты в 2 Step Pro, счёт Zero без оценки и маршрут 100% по запросу.`,
  },
  {
    q: 'Работает ли FTMO в России?',
    a: `Нет. Российская Федерация входит в официальный список стран, резидентам которых FTMO не оказывает услуги; в том же списке Беларусь, Казахстан, Киргизия, Таджикистан и Узбекистан (по данным на ${COUNTRIES_CHECKED}). Подробно — на странице «FTMO для россиян».`,
  },
  {
    q: 'Работает ли FundingPips в России?',
    a: `Не подтверждено. FundingPips не принимает резидентов Ирана, Вьетнама и ОАЭ, Россию не называет (по данным на ${COUNTRIES_CHECKED}); при этом есть ${FP_FATF}. Регистрацию, KYC и оплату с российскими документами мы не проверяли — сначала получите письменный ответ поддержки.`,
  },
  {
    q: 'Какую проп-фирму выбрать резиденту РФ вместо них?',
    a: `Начните с BrightFunded: Россия не названа в её списке ограничений (по данным на ${BRIGHT_COUNTRIES}). Второй вариант — Crypto Fund Trader: на Match-Trader фирма ограничений по странам не указывает (по данным на ${CFT_ACCESS}). Ни один из списков не означает индивидуального одобрения: проверка личности и способ оплаты — отдельные шаги.`,
  },
  {
    q: 'Чем отличается FTMO 1-Step от FundingPips 1 Step Flex?',
    a: `У FTMO 1-Step цель 10%, дневной лимит 3% и общий 10%, который подтягивается по итогам дня; доля 90%, а лучший день не должен давать больше 50% общей прибыли (для заказов с 12.10.2026). У 1 Step Flex цель 12%, лимиты 3% и 12% статично, доля 80% раз в две недели или 100% по запросу при правиле стабильности 35% (по данным на ${CONSISTENCY_CHECKED}). Подвижный лимит строже после прибыли, статический прощает откаты, но цель выше.`,
  },
  {
    q: 'Есть ли у FTMO аналог FundingPips Zero?',
    a: 'В наших данных нет: у FTMO только оценки 2-Step и 1-Step. FundingPips Zero стартует сразу на мастер-счёте с дневным лимитом 3%, подвижным общим 5% и долей 95% (по данным на 19.10.2026).',
  },
]

type Firm = 'FTMO' | 'FundingPips'
type ProductRow = { firm: Firm; product: Challenge; price: string }
type ConsistencyRule = { percent: number; scope: string; appliesTo: string; sourceUrl: string }

function ruDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso
}

function validPrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

function validCaptureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function freshProduct(product: Challenge) {
  return validCaptureDate(product.sourceCapturedAt) && isChallengeFresh(product)
}

function freshDate(value: string | null | undefined, now = new Date()) {
  if (!value || !validCaptureDate(value)) return false
  const age = Math.floor((now.getTime() - new Date(`${value}T00:00:00Z`).getTime()) / 86_400_000)
  return age >= 0 && age <= 30
}

function formatPrice(value: number, currency: 'USD' | 'EUR') {
  return `${currency === 'EUR' ? '€' : '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function priceRange(product: Challenge) {
  const currency = challengeCurrency(product)
  const values = product.accountSizes
    .map(tier => (currency === 'EUR' ? tier.priceEur : tier.priceUsd))
    .filter(validPrice)
    .sort((a, b) => a - b)
  if (!values.length) return 'не опубликована'
  return values[0] === values.at(-1)
    ? formatPrice(values[0], currency)
    : `${formatPrice(values[0], currency)}–${formatPrice(values.at(-1)!, currency)}`
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value < 0 || value > 100 ? 'не подтверждено' : `${value}%`
}

function targetLabel(product: Challenge) {
  if (product.phases === 0) return 'без оценочного этапа'
  return Array.from({ length: product.phases }, (_, index) => percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function drawdownLabel(product: Challenge) {
  return ({
    static: 'статическая',
    trailing: 'подвижная',
    'eod-trailing': 'подвижная по итогам дня (EOD)',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

function splitLabel(product: Challenge) {
  return validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? percent(product.profitSplitPct) : 'зависит от маршрута'
}

function daysLabel(product: Challenge) {
  if (product.firmSlug === 'fundingpips' && product.productSlug === '2-step-pro' && product.minTradingDays === 0) return 'нет (новые и сброшенные счета; купленные до 26.08.2026 — 1)'
  if (product.firmSlug === 'fundingpips' && product.productSlug === 'zero') return 'нет оценки; 7 прибыльных дней от 0,25% за 30 дней'
  if (product.firmSlug === 'fundingpips' && product.productSlug === '2-step-standard' && product.minTradingDays === 3) return '3 (без минимума с опцией дневного лимита 3%)'
  return minimumTradingDaysLabel(product.minTradingDays ?? null, 'ru')
}

function payoutLabel(product: Challenge) {
  if (product.firmSlug === 'ftmo') {
    return product.payoutFirstDays === 14 ? `по запросу, с 14-го дня после первой сделки (по данным на ${FTMO_PAYOUTS})` : 'срок не подтверждён'
  }
  if (product.firmSlug === 'fundingpips' && product.productSlug === '2-step-standard') return 'еженедельно 60%, раз в две недели 80% или по запросу 100%'
  if (product.payoutFirstDays == null || !Number.isInteger(product.payoutFirstDays) || product.payoutFirstDays < 0) return 'зависит от выбранного маршрута'
  const frequency = ({
    weekly: 'далее еженедельно',
    'bi-weekly': 'далее раз в две недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'цикл не указан'
  return `первый запрос через ${product.payoutFirstDays} дн.; ${frequency}`
}

function consistencyRules(product: Challenge | undefined): ConsistencyRule[] {
  const rules = (product as (Challenge & { consistencyRules?: ConsistencyRule[] }) | undefined)?.consistencyRules
  return Array.isArray(rules) ? rules.filter(rule => Number.isFinite(rule.percent) && rule.percent > 0 && rule.percent <= 100) : []
}

function onDemandConsistency(product: Challenge | undefined) {
  return consistencyRules(product).find(rule => /on-demand/i.test(rule.appliesTo))
}

function tierCost(product: Challenge | undefined, size: number) {
  if (!product) return { fee: 'не подтверждено', recovery: '—' }
  const tier = product.accountSizes.find(candidate => candidate.sizeUsd === size)
  const currency = challengeCurrency(product)
  const fee = currency === 'USD' ? tier?.priceUsd : tier?.priceEur
  if (!tier || !validPrice(fee)) return { fee: 'нет такого размера', recovery: '—' }
  const cost = currency === 'USD' ? minimumCostToFundedUsd(product, tier) : fee
  const economics = validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? challengeTierEconomics(product, tier) : null
  return {
    fee: validPrice(cost) ? formatPrice(cost, currency) : 'не подтверждено',
    recovery: economics && validPrice(economics.breakEvenProfit) ? formatPrice(economics.breakEvenProfit, currency) : 'не рассчитывается: доля зависит от маршрута',
  }
}

const SHARED_SIZES = [10000, 25000, 50000, 100000, 200000]

export default function RussianFtmoVsFundingPipsPage() {
  const firms = getAllFirms()
  const ftmoFirm = firms.find(firm => firm.name === 'FTMO')
  const fpFirm = firms.find(firm => firm.name === 'FundingPips')
  const ftmoProducts = getChallengesByFirm('ftmo')
  const fpProducts = getChallengesByFirm('fundingpips')
  const relevantProducts = [...ftmoProducts, ...fpProducts]
  const productRows: ProductRow[] = [
    ...ftmoProducts.filter(freshProduct).map(product => ({ firm: 'FTMO' as const, product, price: priceRange(product) })),
    ...fpProducts.filter(freshProduct).map(product => ({ firm: 'FundingPips' as const, product, price: priceRange(product) })),
  ]
  const find = (firm: Firm, slug: string) => productRows.find(row => row.firm === firm && row.product.productSlug === slug)?.product
  const ftmoTwo = find('FTMO', 'ftmo-challenge-2-step')
  const ftmoOne = find('FTMO', 'ftmo-challenge-1-step')
  const fpOne = find('FundingPips', '1-step-flex')
  const fpFlex = find('FundingPips', '2-step-flex')
  const fpPro = find('FundingPips', '2-step-pro')
  const fpStandard = find('FundingPips', '2-step-standard')
  const fpZero = find('FundingPips', 'zero')
  const sourceDates = relevantProducts.map(product => product.sourceCapturedAt).filter(validCaptureDate).sort()
  const latestCapture = sourceDates.at(0) ?? 'дата не указана'
  const articleDateModified = russianRouteDateModified(PATH, latestCapture)
  const completeEvidence = relevantProducts.length > 0 && productRows.length === relevantProducts.length
    && productRows.every(row => row.product.accountSizes.some(tier => validPrice(tier.priceUsd) || validPrice(tier.priceEur)))
    && [ftmoTwo, ftmoOne, fpOne, fpFlex, fpPro, fpStandard, fpZero].every(Boolean)
  const missingPair = <p className="ru-muted">Условия одного или обоих продуктов требуют повторной проверки. Числовое сравнение этой пары временно скрыто.</p>
  const ftmoRows = productRows.filter(row => row.firm === 'FTMO')
  const fpRows = productRows.filter(row => row.firm === 'FundingPips')
  const short = (product: Challenge) => product.productName.replace('FTMO Challenge: ', '').replace('FundingPips ', '')
  const fpConsistencyModels = [fpOne, fpFlex, fpPro, fpStandard].filter(product => onDemandConsistency(product)?.percent === 35)
  const fpConsistencyAll = fpConsistencyModels.length === 4
  const ftmoOneConsistency = consistencyRules(ftmoOne)[0]
  const corporate = (firm: typeof ftmoFirm, place: string) => firm && freshDate(firm.corporateCapturedAt)
    ? `${firm.founded} / ${firm.legalEntity}, ${place} (по данным на ${ruDate(firm.corporateCapturedAt!)})`
    : 'требует повторной проверки'
  const trustpilot = (firm: typeof ftmoFirm) => firm && firm.trustpilotScore != null && firm.trustpilotCount != null && freshDate(firm.trustpilotCapturedAt)
    ? `оценка ${firm.trustpilotScore}, отзывов: ${firm.trustpilotCount.toLocaleString('ru-RU')} (по данным на ${ruDate(firm.trustpilotCapturedAt!)})`
    : 'требует повторной проверки'
  const ftmoPayoutMethodsFresh = freshDate(ftmoFirm?.payoutMethodsCapturedAt)
  const keyFields: Array<{ field: string; ftmo: ReactNode; fp: ReactNode }> = [
    {
      field: 'Доступ для резидентов РФ',
      ftmo: <>Российская Федерация в списке ограничений <RuAccessBadge firm="ftmo" /></>,
      fp: <>Россия не названа; {FP_FATF} <RuAccessBadge firm="fundingpips" /></>,
    },
    { field: 'Основана / юрлицо', ftmo: corporate(ftmoFirm, 'Прага'), fp: corporate(fpFirm, 'офис в Дубае') },
    { field: 'Платформы', ftmo: `${ftmoFirm?.platforms.join(', ') ?? '—'} (TradingView — через брокерский профиль OANDA, по данным на ${FTMO_PLATFORMS})`, fp: `${fpFirm?.platforms.join(', ') ?? '—'} (по данным на ${RULES_1510})` },
    { field: 'Рынки', ftmo: ftmoFirm?.assets.includes('Stocks') ? 'форекс, индексы, сырьё, криптовалюта и акции' : 'форекс, индексы, сырьё, криптовалюта', fp: fpFirm?.assets.includes('Stocks') ? 'включая акции' : 'форекс, индексы, сырьё, криптовалюта; акций нет' },
    { field: 'Программы (свежие записи)', ftmo: ftmoRows.map(row => short(row.product)).join(', ') || '—', fp: fpRows.map(row => short(row.product)).join(', ') || '—' },
    { field: 'Валюта и диапазон взноса', ftmo: ftmoRows.map(row => `${short(row.product)}: ${row.price}`).join('; ') || '—', fp: fpRows.map(row => `${short(row.product)}: ${row.price}`).join('; ') || '—' },
    { field: 'Минимум торговых дней', ftmo: ftmoRows.map(row => `${short(row.product)}: ${daysLabel(row.product)}`).join('; ') || '—', fp: fpRows.map(row => `${short(row.product)}: ${daysLabel(row.product)}`).join('; ') || '—' },
    {
      field: 'Правило стабильности',
      ftmo: ftmoOneConsistency ? `1-Step: ${ftmoOneConsistency.percent}% общей прибыли на лучший день, для заказов с 12.10.2026 (по данным на ${CONSISTENCY_CHECKED})` : 'требует повторной проверки',
      fp: fpConsistencyAll ? `35% — только для выплаты 100% по запросу, во всех четырёх оценках; Zero — ${fpZero?.consistencyRulePct ?? 15}% (по данным на ${CONSISTENCY_CHECKED})` : 'требует повторной проверки',
    },
    { field: 'Доля вознаграждения', ftmo: `2-Step ${ftmoTwo ? splitLabel(ftmoTwo) : '—'} (90% через Scaling Plan или Premium); 1-Step ${ftmoOne ? splitLabel(ftmoOne) : '—'} (по данным на ${FTMO_1410})`, fp: `1 Step Flex и 2 Step Pro — 80%; 2 Step Flex — 80% или 95%; 2 Step Standard — 60% или 80%; у всех, кроме Zero, — 100% по запросу при условиях; Zero — 95%` },
    { field: 'Первая выплата', ftmo: `по запросу, с 14-го дня после первой сделки (по данным на ${FTMO_PAYOUTS})`, fp: fpRows.map(row => `${short(row.product)}: ${payoutLabel(row.product)}`).join('; ') || '—' },
    {
      field: 'Способы выплаты',
      ftmo: ftmoPayoutMethodsFresh ? `банковский перевод, Visa Direct / Mastercard Send (до $20 000), Skrill (до $3 000), криптовалюта (по данным на ${FTMO_PAYOUTS})` : 'требует повторной проверки',
      fp: `карта Visa/Mastercard (Pay to Card — только в 14 странах), USDT/USDC только в сети ERC-20, Rise, банковский перевод (те же 14 стран); минимум 1% мастер-счёта, для Rise и банка — $500 (по данным на ${FP_REWARD_METHODS})`,
    },
    { field: 'Возврат взноса', ftmo: `2-Step — с первой выплатой; 1-Step — нет (по данным на ${FTMO_1410})`, fp: `справка: 2 Step Standard — с 4-м вознаграждением; условия: «ALL PAYMENTS ARE FINAL» (по данным на ${TRACKER_FP})` },
    { field: 'Trustpilot', ftmo: trustpilot(ftmoFirm), fp: trustpilot(fpFirm) },
  ]
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'FTMO или FundingPips' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: articleDateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {completeEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-partner-comparison="ftmo-fundingpips" data-russian-comparison-editorial-date={articleDateModified}>
          <RussianDataFreshnessNotice firmSlugs={['ftmo', 'fundingpips']} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Сравнение · доступ проверен {COUNTRIES_CHECKED}</div>
          <h1>FTMO или FundingPips: что выбрать в 2026 году</h1>
          <p className="ru-lead">
            FTMO работает с 2015 года, FundingPips (Funding Pips, «Фандинг Пипс») — с 2022-го (по данным на 14.10.2026). По цене и лимитам их классические двухэтапные программы почти совпадают, но для резидента
            России главный вопрос другой — доступ. Ниже — доступ по странам, программы, просадка, взносы в EUR и USD, доля
            вознаграждения, выплаты, платформы и отзывы.
          </p>
          <div className="ru-notice" data-russian-access-answer="first-screen">
            <strong>Коротко о доступе (по данным на {COUNTRIES_CHECKED}):</strong>
            <ul>
              <li>FTMO <RuAccessBadge firm="ftmo" /> — Российская Федерация, Беларусь и Казахстан в официальном списке ограничений.</li>
              <li>FundingPips <RuAccessBadge firm="fundingpips" /> — закрыта для Ирана, Вьетнама и ОАЭ; Россия не названа, но есть {FP_FATF}.</li>
              <li>Ни одна из двух фирм не подтверждена для РФ. Россию не называет в своих ограничениях BrightFunded — с неё и начинайте.</li>
            </ul>
          </div>
          <p className="ru-source-line">Автор: редакция Traders Fund Hub · Редакционная проверка: {articleDateModified}. Даты источников указаны у каждого факта.</p>
          <div className="ru-actions" data-russian-comparison-cta="bright-funded-first">
            <RuGoLink firm="bright-funded" href={`/go/bright-funded?from=${FROM}-bright-funded`} rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">
              Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">Россия не названа в ограничениях BrightFunded (по данным на {BRIGHT_COUNTRIES})</span>
          </div>
          <div className="ru-actions" data-russian-comparison-firm-ctas="ftmo-fundingpips">
            <RuGoLink firm="fundingpips" href={`/go/fundingpips?from=${FROM}`} rel={goLinkRel('fundingpips')} className="btn-outline">
              Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">доступ для резидентов РФ не подтверждён; резидентам ОАЭ недоступно</span>
          </div>
          <div className="ru-actions" data-russian-comparison-ftmo-cta="secondary-restricted">
            <RuGoLink firm="ftmo" href={`/go/ftmo?from=${FROM}`} rel={goLinkRel('ftmo')} className="btn-outline">
              Сайт FTMO <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">резидентов России FTMO не принимает</span>
          </div>
          <nav className="ru-review-toc" aria-label="Содержание сравнения">
            <Link href="#verdikt">Вердикт</Link> · <Link href="#dostup">Доступ</Link> · <Link href="#programmy">Программы</Link> · <Link href="#dva-etapa">Два этапа</Link> · <Link href="#odin-etap">Один этап</Link> · <Link href="#bez-ocenki">Без оценки</Link> · <Link href="#stoimost">Стоимость</Link> · <Link href="#vyplaty">Выплаты</Link> · <Link href="#platformy">Платформы</Link> · <Link href="#otzyvy">Отзывы</Link> · <Link href="#alternativy">Альтернативы</Link> · <Link href="#sources">Источники</Link>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="comparison-not-access">
            <strong>Русский язык страницы не означает доступ.</strong>{' '}
            Решают гражданство, место проживания, проверка личности, способ оплаты и способ выплаты. Не используйте VPN,
            чужие документы или неверный адрес для обхода ограничений.
          </div>
          <p className="ru-source-line">С FundingPips и BrightFunded у нас партнёрские программы: после регистрации по ссылкам на странице мы можем получить комиссию. У FTMO и Crypto Fund Trader партнёрства с нами нет. Это не подтверждение доступа для вашего профиля.</p>
        </div>
      </section>

      <section className="ru-section" id="verdikt">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-verdict="by-trader-type">
          <h2>Короткий вердикт: близкие программы, разный доступ</h2>
          <p>
            <strong>Живёте в России.</strong> Из этой пары подтверждённого варианта нет. FTMO Россию прямо ограничивает, у
            FundingPips статус неясен: Россия не названа, но есть {FP_FATF}. Платить за челлендж FundingPips без письменного
            «да» от поддержки мы бы не стали. Из России смотрите <Link href="/ru/obzor-bright-funded">BrightFunded</Link> или
            Crypto Fund Trader — в этом порядке.
          </p>
          <p>
            <strong>Живёте в ОАЭ.</strong> FundingPips для вас закрыта, хотя её офис в Дубае. FTMO эмираты в списке ограничений не называет.
          </p>
          <p>
            <strong>Живёте в стране, открытой для обеих.</strong> В классической модели FTMO 2-Step и FundingPips 2 Step Standard
            близки: лимиты {ftmoTwo ? percent(ftmoTwo.dailyLossPct) : '—'} в день и {ftmoTwo ? percent(ftmoTwo.maxLossPct) : '—'} статично, цели {ftmoTwo ? targetLabel(ftmoTwo) : '—'} против {fpStandard ? targetLabel(fpStandard) : '—'}.
            Различаются выплаты, перенос позиций и возврат взноса.
          </p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-comparison-pick="ftmo">
              <h3>FTMO, если…</h3>
              <ul>
                <li>нужен гарантированный возврат взноса за двухэтапную оценку: у FTMO 2-Step он возвращается с первой выплатой (по данным на {FTMO_1410});</li>
                <li>нужна более низкая цель в одноэтапной оценке: {ftmoOne ? targetLabel(ftmoOne) : '—'} у FTMO 1-Step против {fpOne ? targetLabel(fpOne) : '—'} у 1 Step Flex;</li>
                <li>нужна доля 90% без дополнительных условий допуска — её даёт FTMO 1-Step;</li>
                <li>вы торгуете акциями, на MT4 или TradingView: их указывает FTMO, у FundingPips — MT5, cTrader и Match-Trader, без акций.</li>
              </ul>
            </article>
            <article className="ru-card" data-russian-comparison-pick="fundingpips">
              <h3>FundingPips, если…</h3>
              <ul>
                <li>нужны еженедельные выплаты: 2 Step Pro — 80% еженедельно, первый запрос через {fpPro?.payoutFirstDays ?? '—'} дней; у FTMO первый запрос — с 14-го дня;</li>
                <li>нужен счёт без оценки: Zero — доля 95% при правиле стабильности 15%; у FTMO такого продукта в наших данных нет;</li>
                <li>нужна выплата 100%: у всех моделей FundingPips, кроме Zero, есть маршрут по запросу с условиями допуска;</li>
                <li>нужен маленький стартовый счёт: у FundingPips есть $5K, у FTMO минимальный размер — $10K.</li>
              </ul>
            </article>
          </div>
          <p className="ru-muted">Перенос позиций через ночь и выходные не делает ни одну фирму однозначно свободнее: у FTMO ограничения действуют только для счёта типа Standard (у Swing их нет), у FundingPips перенос разрешён на оценке, а на мастер-счёте нужна опция Swing. Подробнее — в разделе о платформах и правилах.</p>
        </div>
      </section>

      <section className="ru-section" id="dostup">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Доступ: Россия, Беларусь, Казахстан, ОАЭ</h2>
          <p>Таблица собрана по официальным спискам ограничений (по данным на {COUNTRIES_CHECKED}). «Не названа» означает только то, что страны нет в тексте ограничений: регистрацию с документами этих стран мы не тестировали.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ по странам">
            <table className="ru-table" data-russian-access-table="ru-by-kz-ae">
              <thead><tr><th>Страна</th><th>FTMO</th><th>FundingPips</th></tr></thead>
              <tbody>
                <tr><td><strong>Россия</strong></td><td>закрыта</td><td>не названа; {FP_FATF} — неясно</td></tr>
                <tr><td><strong>Беларусь</strong></td><td>закрыта</td><td>не названа; {FP_FATF_FRESH ? 'та же оговорка — неясно' : 'неясно'}</td></tr>
                <tr><td><strong>Казахстан</strong></td><td>закрыт</td><td>не назван</td></tr>
                <tr><td><strong>ОАЭ</strong></td><td>не названы</td><td>закрыта для резидентов</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            FTMO также закрыта для Киргизии, Таджикистана и Узбекистана, а по Украине ограничивает только Крым, Севастополь,
            Донецкую, Херсонскую, Луганскую и Запорожскую области. Полный разбор — на странице{' '}
            <Link href="/ru/ftmo-dlya-rossiyan">FTMO для россиян</Link>, а сводка по другим фирмам — на странице{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для русскоязычных трейдеров</Link>. VPN, чужие документы или неверный адрес
            — основание для отказа в выплате или закрытия счёта.
          </p>
          <p className="ru-source-line">
            Источники: <a href={SRC.ftmoCountries} target="_blank" rel="noopener noreferrer">FTMO: Who can join FTMO</a>; <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips: Get Started</a> ({COUNTRIES_CHECKED}).
            Доступ к FundingPips подробнее — в <Link href="/ru/obzor-fundingpips#dostup-iz-rossii">обзоре FundingPips</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="programmy">
        <div className="ru-shell">
          <h2>Программы: FTMO 2-Step и 1-Step против пяти моделей FundingPips</h2>
          <p className="ru-muted">Сначала ключевые различия фирм, затем все продукты со свежей проверкой. Значения выводятся из датированных записей; если запись старше 30 дней, строка скрывается.</p>
          {!completeEvidence && <p className="ru-notice" data-russian-comparison-evidence-status="recapture-required">Часть данных требует повторной проверки. Полное числовое сравнение сейчас не подтверждено.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Ключевые различия FTMO и FundingPips">
            <table className="ru-table" data-russian-comparison-key-fields={keyFields.length}>
              <thead><tr><th>Параметр</th><th>FTMO</th><th>FundingPips</th></tr></thead>
              <tbody>{keyFields.map(row => <tr key={row.field}><td><strong>{row.field}</strong></td><td>{row.ftmo}</td><td>{row.fp}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Все программы FTMO и FundingPips">
            <table className="ru-table" data-russian-comparison-product-count={productRows.length} data-russian-comparison-source-links={productRows.length}>
              <thead><tr><th>Фирма</th><th>Программа</th><th>Цель</th><th>Лимиты убытка</th><th>Мин. дней</th><th>Взнос</th><th>Доля</th><th>Выплата</th><th>Источник</th></tr></thead>
              <tbody>
                {productRows.map(row => (
                  <tr key={`${row.firm}-${row.product.productSlug}`} data-russian-comparison-product={`${row.product.firmSlug}:${row.product.productSlug}`}>
                    <td><strong>{row.firm}</strong></td>
                    <td>{row.product.productName}</td>
                    <td>{targetLabel(row.product)}</td>
                    <td>Дневной: {percent(row.product.dailyLossPct)}; общий: {percent(row.product.maxLossPct)}; {drawdownLabel(row.product)}</td>
                    <td>{daysLabel(row.product)}</td>
                    <td>{row.price}</td>
                    <td>{splitLabel(row.product)}</td>
                    <td>{payoutLabel(row.product)}</td>
                    <td><a href={row.product.sourceUrl} target="_blank" rel="noopener noreferrer">{ruDate(row.product.sourceCapturedAt)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!productRows.length && <p className="ru-notice">Нет программ с актуальной проверкой. Цены временно скрыты.</p>}
          <p className="ru-source-line">Самая ранняя проверка программ: {ruDate(latestCapture)}. Цены — без акций и промокодов. Правила каждой фирмы подробно — в <Link href="/ru/obzor-ftmo">обзоре FTMO</Link> и <Link href="/ru/obzor-fundingpips">обзоре FundingPips</Link>; <RuPendingLink href="/ru/fundingpips-pravila">правила FundingPips на русском</RuPendingLink>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-scenarios="like-for-like-pairs">
          <div id="dva-etapa">
            <h2>Два этапа: пары, которые реально сравнимы</h2>
            {ftmoTwo && fpStandard ? <article data-russian-comparison-pair="two-step-standard">
              <h3>FTMO 2-Step или FundingPips 2 Step Standard</h3>
              <p>
                Самая близкая пара. Цели: {targetLabel(ftmoTwo)} у FTMO и {targetLabel(fpStandard)} у FundingPips, так что первый этап у
                FundingPips на 2 пункта легче, второй одинаков. Лимиты совпадают: дневной {percent(ftmoTwo.dailyLossPct)} и {percent(fpStandard.dailyLossPct)},
                общий {percent(ftmoTwo.maxLossPct)} и {percent(fpStandard.maxLossPct)}; граница у FTMO {drawdownLabel(ftmoTwo)}, у FundingPips {drawdownLabel(fpStandard)}.
                У FundingPips есть опция с дневным лимитом 3% — тогда минимума дней нет. Минимум дней в базовой версии:
                {' '}{daysLabel(ftmoTwo)} у FTMO и {daysLabel(fpStandard)} у FundingPips.
              </p>
              <p>
                После оценки FTMO платит 80% (90% через Scaling Plan или Premium, по данным на {FTMO_1410}), запрос — по требованию с 14-го дня.
                У 2 Step Standard единой доли нет: еженедельно 60%, раз в две недели 80% или по запросу 100% — для последнего нужно
                правило стабильности {onDemandConsistency(fpStandard)?.percent ?? 35}% (по данным на {CONSISTENCY_CHECKED}).
              </p>
              <p data-russian-fundingpips-refund-conflict="help-vs-terms">
                <strong>Возврат взноса.</strong> У FTMO 2-Step взнос возвращается с первой выплатой вознаграждения (по данным на {FTMO_1410}).
                У FundingPips источники расходятся: по справке (Get Started и Reward Methods) взнос за 2 Step Standard возвращается с четвёртым
                вознаграждением на мастер-счёте, на 1 Step Flex, 2 Step Flex, 2 Step Pro и Zero это не распространяется. В общих условиях этого
                пункта нет: там сказано «ALL PAYMENTS ARE FINAL», а регистрационный взнос назван невозвратным, кроме случаев, когда возврат
                требует закон (по данным на {TRACKER_FP}). Не рассчитывайте на возврат от FundingPips, пока поддержка не подтвердит его письменно.
              </p>
              <p className="ru-source-line">Источники: <a href={ftmoTwo.sourceUrl} target="_blank" rel="noopener noreferrer">FTMO 2-Step</a> ({ruDate(ftmoTwo.sourceCapturedAt)}); <a href={fpStandard.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Standard</a> ({ruDate(fpStandard.sourceCapturedAt)}); <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">справка Get Started</a>, <a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">Reward Methods</a> и <a href={SRC.fpTerms} target="_blank" rel="noopener noreferrer">условия FundingPips</a> ({TRACKER_FP}).</p>
            </article> : <article><h3>FTMO 2-Step или FundingPips 2 Step Standard</h3>{missingPair}</article>}

            {ftmoTwo && fpFlex && fpPro ? <article data-russian-comparison-pair="two-step-flex-pro">
              <h3>FTMO 2-Step или 2 Step Flex / 2 Step Pro</h3>
              <p>
                2 Step Flex требует больше прибыли ({targetLabel(fpFlex)}), зато даёт общий запас {percent(fpFlex.maxLossPct)} при дневном {percent(fpFlex.dailyLossPct)}.
                2 Step Pro — противоположность: цели {targetLabel(fpPro)}, но лимиты всего {percent(fpPro.dailyLossPct)} и {percent(fpPro.maxLossPct)}.
                У FTMO 2-Step один вариант: {targetLabel(ftmoTwo)}, {percent(ftmoTwo.dailyLossPct)} и {percent(ftmoTwo.maxLossPct)}.
              </p>
              <p>
                Выплаты: 2 Step Flex — 80% с одним торговым днём или 95% с тремя прибыльными днями, раз в две недели; 2 Step Pro — 80% еженедельно,
                первый запрос через {fpPro.payoutFirstDays} дней. Минимум дней у Pro — {daysLabel(fpPro)}.
              </p>
              <p className="ru-source-line">Источники: <a href={fpFlex.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Flex</a> ({ruDate(fpFlex.sourceCapturedAt)}); <a href={fpPro.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Pro</a> ({ruDate(fpPro.sourceCapturedAt)}).</p>
            </article> : <article><h3>FTMO 2-Step или 2 Step Flex / 2 Step Pro</h3>{missingPair}</article>}
          </div>

          {ftmoOne && fpOne ? <article id="odin-etap" data-russian-comparison-pair="one-step">
            <h2>Один этап: FTMO 1-Step или FundingPips 1 Step Flex</h2>
            <p>
              Главное — механика общего лимита. У FTMO 1-Step он {percent(ftmoOne.maxLossPct)} и {drawdownLabel(ftmoOne)}: граница идёт вверх вслед за
              закрытием дня. У 1 Step Flex — {percent(fpOne.maxLossPct)}, {drawdownLabel(fpOne)}. Цель {targetLabel(ftmoOne)} против {targetLabel(fpOne)}, дневной лимит
              {' '}{percent(ftmoOne.dailyLossPct)} и {percent(fpOne.dailyLossPct)}.
            </p>
            <p>
              {ftmoOneConsistency ? <>У FTMO 1-Step есть правило стабильности {ftmoOneConsistency.percent}%: лучший день не должен давать больше этой доли общей прибыли — и для прохождения, и для выплат на счёте FTMO; оно действует для счетов из заказов с 12.10.2026 (по данным на {CONSISTENCY_CHECKED}). </> : null}
              У 1 Step Flex правила стабильности на оценке нет; {onDemandConsistency(fpOne) ? `${onDemandConsistency(fpOne)!.percent}% требуется только для выплаты 100% по запросу` : 'условия выплаты 100% по запросу требуют проверки'} (по данным на {CONSISTENCY_CHECKED}).
              Доля: {splitLabel(ftmoOne)} у FTMO; у FundingPips — 80% раз в две недели или 100% по запросу. Взнос за FTMO 1-Step не возвращается (по данным на {FTMO_1410}), за 1 Step Flex — тоже.
            </p>
            <p className="ru-source-line">Источники: <a href={ftmoOne.sourceUrl} target="_blank" rel="noopener noreferrer">FTMO 1-Step</a> ({ruDate(ftmoOne.sourceCapturedAt)}); <a href={SRC.ftmoObjectives} target="_blank" rel="noopener noreferrer">FTMO Trading Objectives</a> ({CONSISTENCY_CHECKED}); <a href={fpOne.sourceUrl} target="_blank" rel="noopener noreferrer">1 Step Flex</a> ({ruDate(fpOne.sourceCapturedAt)}).</p>
          </article> : <article id="odin-etap"><h2>Один этап: FTMO 1-Step или FundingPips 1 Step Flex</h2>{missingPair}</article>}

          <article id="bez-ocenki" data-russian-comparison-pair="zero-only-fundingpips">
            <h2>Без оценки: только у FundingPips (Zero)</h2>
            {fpZero ? <p>
              Zero стартует сразу на мастер-счёте, взнос {priceRange(fpZero)}. Дневной лимит {percent(fpZero.dailyLossPct)}, общий {percent(fpZero.maxLossPct)} —
              {' '}{drawdownLabel(fpZero)}: идёт за максимальным капиталом и фиксируется на стартовом балансе после первых +5%. Доля {splitLabel(fpZero)}, выплаты
              раз в две недели. Условия жёсткие: правило стабильности {fpZero.consistencyRulePct ?? 15}%, не меньше 7 прибыльных дней от 0,25% в каждом скользящем
              30-дневном окне, а торговля в новостное окно и перенос через выходные — грубые нарушения (по данным на {ruDate(fpZero.sourceCapturedAt)}).
              У FTMO продукта без оценки в наших данных нет. Другие варианты — в подборке <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирм без челленджа</Link>.
            </p> : missingPair}
          </article>
        </div>
      </section>

      <section className="ru-section" id="stoimost">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Стоимость на одинаковом размере счёта</h2>
          <p>Взносы FTMO — в евро, FundingPips — в долларах. Курс мы не подставляем, поэтому сравнивайте столбцы с учётом валюты. Цены — без акций. «Возврат затрат» посчитан методикой сайта из взноса и доли вознаграждения; где доля зависит от маршрута, расчёт не делаем.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Стоимость одинаковых размеров счёта">
            <table className="ru-table" data-russian-comparison-cost="shared-sizes">
              <thead><tr><th>Счёт</th><th>FTMO 2-Step (EUR)</th><th>FP 2 Step Standard (USD)</th><th>FP 2 Step Pro (USD)</th><th>FTMO 1-Step (EUR)</th><th>FP 1 Step Flex (USD)</th></tr></thead>
              <tbody>{SHARED_SIZES.map(size => {
                const cells = [ftmoTwo, fpStandard, fpPro, ftmoOne, fpOne].map(product => tierCost(product, size))
                return <tr key={size} data-russian-comparison-cost-size={size}>
                  <td>${size.toLocaleString('en-US')}</td>
                  {cells.map((cell, index) => <td key={index}>{cell.fee}<br /><span className="ru-muted">возврат затрат: {cell.recovery}</span></td>)}
                </tr>
              })}</tbody>
            </table>
          </div>
          <p>У FundingPips есть и счета $5K (все модели), а у 2 Step Pro и Zero — $200K; у FTMO самый маленький счёт — $10K. Размер $2.5K у Pro и Standard в наших данных без подтверждённой цены. Промокоды, дополнения и комиссия способа оплаты в таблицу не входят — действующие предложения на странице <Link href="/ru/promokody-prop-firm">промокодов проп-фирм</Link>.</p>
          <p>
            Потолок капитала не различает фирмы: у FTMO рост идёт через Scaling Plan, у FundingPips — через счёт Prime, который на главной
            подписан «до $2M» и доступен только по приглашению FundingPips (по данным на {TRACKER_FP}).
          </p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Сплит и выплаты</h2>
          <p data-russian-ftmo-payout-methods="visa-direct-mastercard-send">
            <strong>FTMO.</strong> 2-Step — 80% по умолчанию, 90% через Scaling Plan или Premium; 1-Step — 90% (по данным на {FTMO_1410}).
            Вознаграждение запрашивается по требованию — на 14-й или любой следующий день после первой сделки.
            {ftmoPayoutMethodsFresh ? <> Способы: банковский перевод, мгновенный перевод через Visa Direct / Mastercard Send (до $20 000), Skrill (до $3 000) и криптовалюта (по данным на {FTMO_PAYOUTS}).</> : <> Способы выплаты требуют повторной проверки.</>}
          </p>
          <p>
            <strong>FundingPips.</strong> Единой доли нет: 1 Step Flex — 80% раз в две недели; 2 Step Flex — 80% с одним торговым днём или 95% с тремя
            прибыльными днями; 2 Step Pro — 80% еженедельно; 2 Step Standard — 60% еженедельно или 80% раз в две недели; Zero — 95% раз в две недели.
            Кроме Zero, у каждой модели есть выплата 100% по запросу (On Demand).
          </p>
          <p data-russian-fundingpips-consistency={fpConsistencyAll ? 'on-demand-35-all-four' : 'recheck'}>
            {fpConsistencyAll
              ? <>Условие выплаты 100% по запросу одинаково для всех четырёх оценочных моделей — 1 Step Flex, 2 Step Flex, 2 Step Pro и 2 Step Standard: правило стабильности 35%, то есть ни один торговый день не должен давать больше 35% общей прибыли (по данным на {CONSISTENCY_CHECKED}). На прохождение оценки и на обычные циклы выплат это правило не влияет.</>
              : <>Условия допуска к выплате 100% по запросу требуют повторной проверки.</>}
          </p>
          <p data-russian-fundingpips-payout-methods="reward-methods">
            <strong>Способы выплаты FundingPips</strong> (по данным на {FP_REWARD_METHODS}): карта Visa/Mastercard (Pay to Card — только в отдельных странах),
            криптовалюта USDT или USDC только в сети ERC-20, Rise и банковский перевод. Минимум — 1% размера мастер-счёта для карты и криптовалюты,
            $500 для Rise и банковского перевода. Заявку обрабатывают 1–3 рабочих дня, ещё 1–2 рабочих дня деньги идут до кошелька или счёта.
            С крипто-выплат удерживаются комиссии сервиса и сети, но их размер не опубликован. Если Rise в вашей стране не поддерживается,
            выплата автоматически уходит в криптовалюту. Получатель — только счёт или кошелёк на ваше имя.
          </p>
          <p className="ru-notice" data-russian-fundingpips-payout-countries="pay-to-card-bank-14">
            Pay to Card и банковский перевод FundingPips перечисляет только для 14 стран: {FP_PAYOUT_COUNTRIES}.
            России, Беларуси, Украины и Казахстана в этом списке нет (по данным на {FP_REWARD_METHODS}).
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.ftmoWithdraw} target="_blank" rel="noopener noreferrer">FTMO: How do I withdraw my profits</a> и <a href={SRC.ftmoPromoOnDemand} target="_blank" rel="noopener noreferrer">FTMO: on demand после 14 дней</a> ({FTMO_PAYOUTS}); <a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">FundingPips: Reward Methods</a> ({FP_REWARD_METHODS}). Сравнение выплат у других фирм — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="oplata">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Оплата челленджа</h2>
          <p>
            <strong>FundingPips</strong> перечисляет карты Visa и Mastercard (только на ваше имя), Google Pay и Apple Pay, PayPal, Neteller, Skrill,
            Paysafe Card и криптовалюту. Фирма предупреждает, что набор способов и комиссии зависят от региона (по данным на {TRACKER_FP}). Список взят со справочной страницы, на кассе его не проверяли.
          </p>
          <p>
            <strong>FTMO</strong> для резидентов России закрыта, так что её касса важна только тем, кто живёт в других странах. Бесплатно:
            карта (Visa, Mastercard, Diners Club, Discover), Apple Pay, Google Pay, Revolut Pay. С комиссией 3%: PayPal, Skrill и криптовалюта.
            Банковский перевод — только в EUR/CZK, 2–5 рабочих дней (по данным на {FTMO_CHECKOUT}).
          </p>
          <p>Ни одна из фирм не упоминает «Мир» или карты российских банков, поэтому мы не утверждаем, что они сработают.</p>
          <p className="ru-source-line">Источники: <a href={SRC.ftmoPayments} target="_blank" rel="noopener noreferrer">FTMO: payment methods</a> ({FTMO_CHECKOUT}); <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips Get Started</a> ({TRACKER_FP}).</p>
        </div>
      </section>

      <section className="ru-section" id="platformy">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Платформы, советники, новости, перенос позиций</h2>
          <p>
            Платформы FTMO: {ftmoFirm?.platforms.join(', ')}; TradingView подключается через брокерский профиль OANDA (по данным на {FTMO_PLATFORMS}).
            Платформы FundingPips: {fpFirm?.platforms.join(', ')} (по данным на {RULES_1510}). Если вам нужен cTrader, он есть у обеих — другие
            варианты в подборке <Link href="/ru/prop-firmy-s-ctrader">проп-фирм с cTrader</Link>.
          </p>
          <p>
            Советники и копирование. У FundingPips сторонний советник допустим только как менеджер сделок или риска; свой советник может
            торговать полностью автоматически при подтверждении авторства. Копировать сделки между своими счетами FundingPips и со счёта
            FundingPips на внешний можно, а во FundingPips со стороннего источника — нельзя (по данным на {TRACKER_FP}). Условия FTMO для
            советников сверяйте в правилах выбранной программы.
          </p>
          <p>
            Новости и перенос позиций. У FTMO ограничения на торговлю во время выбранных новостей, а также на перенос через ночь и выходные
            действуют только для счёта FTMO типа Standard; на оценке их нет, у типа Swing — нет вовсе (по данным на {RULES_1510}). У FundingPips перенос
            через ночь и выходные разрешён на оценке, а на мастер-счёте требует опции Swing (по данным на {fpStandard ? ruDate(fpStandard.sourceCapturedAt) : TRACKER_FP}); в Zero
            торговля в новостное окно и перенос через выходные — грубые нарушения.
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.ftmoTwoStep} target="_blank" rel="noopener noreferrer">FTMO 2-Step (новости, перенос)</a>; <a href={SRC.fpWorkspace} target="_blank" rel="noopener noreferrer">FundingPips: платформы</a>; <a href={SRC.fpConduct} target="_blank" rel="noopener noreferrer">FundingPips: советники и копирование</a>.</p>
        </div>
      </section>

      <section className="ru-section" id="otzyvy">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-trustpilot="data-driven">
          <h2>Отзывы на Trustpilot</h2>
          <ul>
            <li><strong>FTMO:</strong> {trustpilot(ftmoFirm)}.</li>
            <li><strong>FundingPips:</strong> {trustpilot(fpFirm)}.</li>
          </ul>
          <p>Оценка и число отзывов — сигнал, а не проверка выплат: по ним не видно, сколько авторов живут в вашей стране и получали выплату тем же способом, что нужен вам. Как отличить проверяемый отзыв от рекламы — в руководстве <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell" data-russian-alternatives="bright-funded-first">
          <h2>Если FTMO и FundingPips не подходят: альтернативы для трейдеров из РФ</h2>
          <p className="ru-muted">Порядок редакционный. Бейдж показывает статус доступа для резидентов РФ по нашим данным.</p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-alternative="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded <RuAccessBadge firm="bright-funded" /></h3>
              <p className="ru-muted">Россия не названа в списке ограничений BrightFunded (по данным на {BRIGHT_COUNTRIES}). Взносы в EUR, как у FTMO.</p>
              <p className="ru-muted" data-russian-bright-country-conflict="help-six-terms-five">Списки расходятся: справка называет шесть стран, включая Пакистан, а п. 2 условий — пять, без Пакистана; Россию не называет ни один (по данным на {BRIGHT_CONFLICT}).</p>
              <p className="ru-source-line"><Link href="/ru/obzor-bright-funded">Обзор BrightFunded</Link> · <Link href="/ru/ftmo-vs-bright-funded">FTMO или BrightFunded</Link> · <RuPendingLink href="/ru/fundingpips-vs-bright-funded">FundingPips или BrightFunded</RuPendingLink></p>
              <div className="ru-actions">
                <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-ftmo-vs-fundingpips-alt-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Перейти в BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russian-alternative="crypto-fund-trader">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Crypto Fund Trader <RuAccessBadge firm="crypto-fund-trader" /></h3>
              <p className="ru-muted">На Match-Trader фирма ограничений по странам не указывает (по данным на {CFT_ACCESS}); MT5 закрыт только для резидентов США (по данным на {CFT_MT5}). Подходит, если нужен упор на криптовалюту.</p>
              <p className="ru-source-line"><RuPendingLink href="/ru/obzor-crypto-fund-trader">Обзор Crypto Fund Trader</RuPendingLink> · <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link></p>
              <div className="ru-actions">
                <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-ftmo-vs-fundingpips-alt-cft" rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Перейти в Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
          </div>
          <p className="ru-source-line">
            Другие сравнения: <RuPendingLink href="/ru/ftmo-vs-fundednext">FTMO или FundedNext</RuPendingLink> · <Link href="/ru/fundednext-vs-fundingpips">FundingPips против FundedNext</Link> (FundedNext резидентам РФ недоступна).
            Полный рейтинг с отметкой доступа — <Link href="/ru/luchshie-prop-firmy">лучшие проп-фирмы для трейдеров из РФ</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-decision="four-checks">
          <h2>Как выбрать за 4 проверки</h2>
          <p>Если модель с оценкой и долей вознаграждения для вас новая, сначала прочитайте, <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работают челленджи проп-фирм</Link>.</p>
          <ol>
            <li><strong>Страна.</strong> Найдите свою страну проживания и гражданство в обоих списках. Если FTMO вас не принимает, сравнение на этом закончено; для FundingPips из России или Беларуси сначала получите письменный ответ поддержки.</li>
            <li><strong>Тип продукта.</strong> Один этап, два этапа или без оценки (Zero есть только у FundingPips).</li>
            <li><strong>Лимиты убытка.</strong> Статический или подвижный лимит, дневной лимит и минимум дней — под вашу худшую серию сделок.</li>
            <li><strong>Полная стоимость и выплата.</strong> Взнос в своей валюте (EUR или USD), возврат взноса, повторная попытка и способ, которым вы реально сможете получить деньги.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и дата проверки</h2>
          <p>Цены, цели, лимиты, доли и сроки выплат взяты из датированных записей Prop Firm Tracker по программам. Списки стран — по данным на {COUNTRIES_CHECKED}; способы выплаты FTMO — на {FTMO_PAYOUTS}; способы выплаты, возврат взноса и касса FundingPips — на {TRACKER_FP}; правила стабильности — на {CONSISTENCY_CHECKED}.</p>
          <ul>
            {relevantProducts.map(product => <li key={`${product.firmSlug}:${product.productSlug}`}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.productName}: официальные условия</a> — {validCaptureDate(product.sourceCapturedAt) ? ruDate(product.sourceCapturedAt) : 'дата не подтверждена'}.</li>)}
            <li><a href={SRC.ftmoCountries} target="_blank" rel="noopener noreferrer">FTMO: кто может участвовать</a> — {COUNTRIES_CHECKED}.</li>
            <li><a href={SRC.ftmoPayments} target="_blank" rel="noopener noreferrer">FTMO: способы оплаты</a> — Prop Firm Tracker, {FTMO_CHECKOUT}.</li>
            <li><a href={SRC.ftmoWithdraw} target="_blank" rel="noopener noreferrer">FTMO: запрос вознаграждения и способы выплаты</a> — {FTMO_PAYOUTS}.</li>
            <li><a href={SRC.ftmoObjectives} target="_blank" rel="noopener noreferrer">FTMO: Trading Objectives (правило стабильности 1-Step)</a> — {CONSISTENCY_CHECKED}.</li>
            <li><a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips: Get Started (страны, оплата, возврат взноса)</a> — {TRACKER_FP}.</li>
            <li><a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">FundingPips: Reward Methods (способы, минимумы и сроки выплат, страны Pay to Card и банковского перевода)</a> — {FP_REWARD_METHODS}.</li>
            <li><a href={SRC.fpTerms} target="_blank" rel="noopener noreferrer">FundingPips: условия (ALL PAYMENTS ARE FINAL)</a> — {TRACKER_FP}.</li>
            <li><a href={SRC.brightCountries} target="_blank" rel="noopener noreferrer">BrightFunded: ограничения по странам</a> — {BRIGHT_COUNTRIES}; <a href={SRC.brightTerms} target="_blank" rel="noopener noreferrer">условия BrightFunded, п. 2</a> — {BRIGHT_CONFLICT}; <a href={SRC.cftFaq} target="_blank" rel="noopener noreferrer">Crypto Fund Trader: FAQ</a> — {CFT_ACCESS}.</li>
          </ul>
          <p>Мы не тестировали регистрацию, KYC и оплату с российскими документами и картами. Если фирма меняет правила, сравнение нужно повторить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="comparison">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            У FundingPips и BrightFunded с нами партнёрские программы, у FTMO и Crypto Fund Trader — нет. Комиссия не меняет таблицы,
            порядок и оценку доступа.
          </div>
          <div className="ru-notice" data-russian-risk-disclaimer="comparison">
            <strong>Риск.</strong> Оценочные программы платные, и при нарушении лимита взнос не возвращается. Торговля с плечом может
            привести к быстрой потере взноса. Доля вознаграждения и прошлые выплаты не обещают дохода. Платите только ту сумму, потерю
            которой готовы принять.
          </div>
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href={`/go/bright-funded?from=${FROM}-footer`} rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="crypto-fund-trader" href={`/go/crypto-fund-trader?from=${FROM}-footer-cft`} rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Перейти в Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
