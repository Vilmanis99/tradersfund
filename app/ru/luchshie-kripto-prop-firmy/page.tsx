import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Database,
  ExternalLink,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import { cryptoMarketEvidence } from '@/lib/cryptoMarketEvidence'
import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
  type Challenge,
  type ChallengeAccountSize,
} from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import {
  getLanguageAlternates,
  getLocalizedRoutePair,
  russianRouteDateModified,
} from '@/lib/localizedRoutes'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import RuPendingLink from '@/components/RuPendingLink'
import russianMarketEvidence from '@/content/data/russian-market-evidence.json'
import firmCheckEvidence from '@/content/data/firm-check-evidence-2026-10-20.json'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { RUSSIA_STATUS_ORDER } from '@/lib/russianRanking'
import Breadcrumbs from '@/components/Breadcrumbs'
import RuFundedNextAccessCaveat, { FUNDEDNEXT_RU_ACCESS_CHECKED } from '@/components/RuFundedNextAccessCaveat'
import fpAccessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'

const PATH = '/ru/luchshie-kripto-prop-firmy'
const TITLE = 'Крипто проп-компании 2026: открытые и закрытые для РФ'
// Firm names per Russia status come from firms.json russiaStatus (russiaStatusFor), never hard-coded.
// Restricted firms keep a CTA per the RU rule, after every open firm; FundedNext goes last.
const RESTRICTED_ACCESS_CTAS = ['ftmo', 'city-traders-imperium', 'ofp-funding', 'fundednext'] as const
const RESTRICTED_CTA_NAMES: Record<(typeof RESTRICTED_ACCESS_CTAS)[number], string> = { ftmo: 'FTMO', 'city-traders-imperium': 'CTI', 'ofp-funding': 'OFP', fundednext: 'FundedNext' }
const ACCESS_LIST_SLUGS = ['bright-funded', 'crypto-fund-trader', 'ftmo', 'city-traders-imperium', 'ofp-funding'] as const
const ACCESS_LIST_NAMES: Record<(typeof ACCESS_LIST_SLUGS)[number], string> = {
  'bright-funded': 'BrightFunded',
  'crypto-fund-trader': 'Crypto Fund Trader',
  ftmo: 'FTMO',
  'city-traders-imperium': 'CTI',
  'ofp-funding': 'OFP',
}
function namesWithStatus(slugs: readonly string[], names: Record<string, string>, open: boolean) {
  return slugs.filter(slug => (russiaStatusFor(slug) === 'available') === open && (open || russiaStatusFor(slug) === 'restricted')).map(slug => names[slug])
}
function ruJoin(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`
}
const OPEN_NAMES = namesWithStatus(ACCESS_LIST_SLUGS, ACCESS_LIST_NAMES, true)
const CLOSED_NAMES = namesWithStatus([...ACCESS_LIST_SLUGS, 'fundednext'], { ...ACCESS_LIST_NAMES, fundednext: 'FundedNext' }, false)
// Literal for the SEO audit; release-crawl checks the built length (140–160) and that these statuses still match firms.json.
const DESCRIPTION = 'Крипто проп-компании 2026: BrightFunded и Crypto Fund Trader открыты для РФ, FTMO, CTI, OFP и FundedNext — нет. Криптопары, плечо, комиссии, цены и выплаты.'
// RU SEO Lead approved 22.10, numberless by design
const SOCIAL_TITLE = 'Лучшие крипто-проп-фирмы 2026: сравнение и доступ из РФ'
const SOCIAL_DESCRIPTION = 'Сравнение крипто-проп-фирм 2026: правила, цены, выплаты, торговые инструменты и статус доступа из России по официальным источникам, с датой проверки.'
export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'проп трейдинг криптовалют',
    'крипто проп фирма',
    'крипто проп компания',
    'проп трейдинг компании криптовалют',
    'проп компании криптовалюты',
    'проп компании для трейдеров криптовалют',
    'проп компании крипта',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: SOCIAL_TITLE, description: SOCIAL_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: SOCIAL_TITLE, description: SOCIAL_DESCRIPTION },
}

function freshEvidence(evidence: { sourceCapturedAt: string }) {
  const date = evidence.sourceCapturedAt
  const parsed = new Date(`${date}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    && isChallengeFresh(evidence)
}

/** ISO date ≤30 days old (same window as isChallengeFresh). */
function freshIso(date: string | null | undefined, now = new Date()) {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return false
  const day = date.slice(0, 10)
  const age = Math.floor((now.getTime() - new Date(`${day}T00:00:00Z`).getTime()) / 86_400_000)
  return age >= 0 && age <= 30
}

function ruDate(iso: string) {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
}

// Tracker's CFT evidence text names a third-party venue; the standing rule keeps that name off /ru pages.
// Tracker can empty the watch list; keep its row shape typed even when the JSON array is empty.
const cryptoWatch = cryptoMarketEvidence.watch as Array<{ firmSlug: string; firmName: string; status: string; sourceUrl: string; sourceCapturedAt: string; nextStepRu?: string }>

// OFP: Tracker c9915bb records open gaps (Classic/Plus crypto leverage, symbol list, checkout prices); the RU copy states them as unpublished, never as numbers.
const EVIDENCE_TEXT_OVERRIDES: Record<string, { evidenceRu?: string; scopeNoteRu?: string }> = {
  'crypto-fund-trader': {
    evidenceRu: 'По FAQ CFT (cryptofundtrader.com/faq/), на Match-Trader и MetaTrader 5 доступно более 720 инструментов, из них 556 криптовалют; плечо по криптовалютам на счетах Advanced — 1:100. Вознаграждение — банковским переводом (EUR или USD) или на кошелёк в USDT (ERC20/TRC20), BTC или ETH.',
    scopeNoteRu: 'Привязаны Evaluation, Accelerated и Instant. Ascend исключён (в магазине недоступен к покупке, проверенной цены нет), Break тоже (открытое расхождение цен и надпись «sold out»). На MT5 и Match-Trader те же программы дают также форекс, индексы, сырьё и акции.',
  },
  'ofp-funding': {
    scopeNoteRu: 'Привязаны все 6 программ Instant из наших данных: все счета OFP работают на одной платформе OFP (Sirix). Плечо по криптовалютам OFP публикует только для Instant Lite (правила торговли: «Crypto 1:1/2», динамическое); для Instant Classic и Instant Plus оно не опубликовано. Список криптосимволов OFP не публикует. Цены OFP — с главной страницы ofpfunding.com, в корзине не подтверждены (для оформления нужен вход в аккаунт); открытое расхождение источников по отображению тарифов остаётся.',
  },
}

function evidenceText(evidence: { firmSlug: string; evidence: string; evidenceRu?: string; scopeNote?: string; scopeNoteRu?: string }) {
  const override = EVIDENCE_TEXT_OVERRIDES[evidence.firmSlug]
  return {
    evidence: override?.evidenceRu ?? evidence.evidenceRu ?? evidence.evidence,
    scope: override?.scopeNoteRu ?? evidence.scopeNoteRu ?? evidence.scopeNote ?? '',
  }
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function drawdownLabel(product: Challenge) {
  if (!product.drawdownType) return 'не подтверждена'
  return drawdownLabels[product.drawdownType] ?? product.drawdownType
}

function valueRange(values: number[], suffix = '') {
  const unique = [...new Set(values)].sort((a, b) => a - b)
  if (!unique.length) return 'не подтверждено'
  return unique.length === 1
    ? `${unique[0]}${suffix}`
    : `${unique[0]}–${unique.at(-1)}${suffix}`
}

function splitLabel(products: Challenge[]) {
  const values = products.flatMap(product => product.profitSplitPct == null ? [] : [product.profitSplitPct])
  return `${valueRange(values, '%')}${values.length && values.length < products.length ? '; часть условий не подтверждена' : ''}`
}

type PublishedCost = { currency: 'USD' | 'EUR'; amount: number }

// Same currency rule as minimumPublishedEntry() in lib/landings.ts: the USD
// figure when the firm publishes one, otherwise its own EUR fee. Never
// converted (AGENTS.md: a firm that prices in EUR keeps priceEur).
function minimumPublishedCost(product: Challenge, tier: ChallengeAccountSize): PublishedCost | null {
  const usd = minimumCostToFundedUsd(product, tier)
  if (usd != null && usd > 0) return { currency: 'USD', amount: usd }
  if (tier.priceUsd != null || tier.priceEur == null || tier.priceEur <= 0) return null
  // A USD-denominated add-on cannot be summed with a EUR fee without an FX rate.
  const usdExtras = (tier.payLaterUsd ?? 0) + (tier.activationFeeUsd ?? product.activationFeeUsd ?? 0)
  return usdExtras > 0 ? null : { currency: 'EUR', amount: tier.priceEur }
}

function hasPublishedCost(product: Challenge) {
  return product.accountSizes.some(tier => minimumPublishedCost(product, tier) != null)
}

function minimumKnownCost(products: Challenge[]) {
  const costs = products.flatMap(product => product.accountSizes.flatMap(tier => {
    const cost = minimumPublishedCost(product, tier)
    return cost ? [cost] : []
  }))
  // Both currencies are shown when both are published (e.g. USD firms and EUR-only BrightFunded/FTMO), never converted.
  const format = (amount: number) => amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const parts = (['USD', 'EUR'] as const).flatMap(currency => {
    const amounts = costs.filter(cost => cost.currency === currency).map(cost => cost.amount)
    return amounts.length ? [currency === 'USD' ? `$${format(Math.min(...amounts))}` : `€${format(Math.min(...amounts))}`] : []
  })
  return parts.length ? parts.join(' / ') : 'не подтверждены'
}

function localizedReviewHref(reviewUrl: string) {
  return getLocalizedRoutePair(reviewUrl)?.ru ?? reviewUrl
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая крипто-проп-фирма лучшая в 2026 году?',
    a: 'Единого победителя нет: сравнивайте конкретную программу, инструмент и этап. Для резидентов РФ из открытых фирм в рейтинге — BrightFunded (более 48 криптопар, плечо 1:5) и Crypto Fund Trader (556 криптовалют на Match-Trader и MetaTrader 5 по FAQ CFT), по данным на 21.10.2026. FTMO, CTI, OFP и FundedNext для резидентов РФ закрыты. В таблицу попадают только программы с актуальными источниками и известными ценами.',
  },
  {
    q: 'Крипто-проп-фирма даёт реальные BTC или ETH?',
    a: 'Не обязательно. Симулированный счёт или CFD на BTCUSD не означает передачу биткоинов на ваш кошелёк. Название следующего этапа, включая Master Account, также не доказывает, что трейдер получил реальные активы или брокерский капитал.',
  },
  {
    q: 'Почему выплата в USDC не делает фирму крипто-проп-компанией?',
    a: 'Потому что способ получения денег не определяет торговый инструмент. У BrightFunded есть и то и другое, но по разным источникам: справка о криптоинструментах называет более 48 криптовалютных пар (по данным на 20.10.2026), а справка о выплатах — перевод в USDC по сети ERC-20 и банковский перевод в EUR (по данным на 14.10.2026). Фирма, которая только платит в USDC, крипто-проп-компанией от этого не становится.',
  },
  {
    q: 'Можно ли держать криптопозиции на выходных?',
    a: 'Только если это разрешено правилами выбранной программы и этапа. Круглосуточный базовый рынок не отменяет расписание терминала, обслуживание и ограничения переноса позиций. Проверяйте оценочный и следующий этап отдельно.',
  },
  {
    q: 'Можно ли зарегистрироваться из России?',
    a: `Не во всех фирмах на этой странице. Мы показываем и открытые, и закрытые для РФ фирмы, чтобы было видно, почему известное имя не подходит. Россию в своих ограничениях не называют ${ruJoin(OPEN_NAMES)}; ${ruJoin(CLOSED_NAMES)} резидентов России не обслуживают (по данным на 20.10.2026). У FundingPips статус неясен. Даже у открытой фирмы до оплаты проверьте платформу, документы для KYC, способ платежа и будущей выплаты; при неясных условиях получите письменный ответ фирмы.`,
  },
  {
    q: 'Подходит ли FundingPips для криптотрейдинга?',
    a: 'В этом сравнении источник связан только с 1 Step Flex: указаны комиссия 0,04%, плечо 1:2 на оценке и 1:1 на счёте Master Account. Это временное правило из датированной справки; другие программы фирмы не наследуют его автоматически.',
  },
  {
    q: 'Какие криптовалюты доступны у Maven?',
    a: 'В проверенной справке перечислены BTCEUR, BTCUSD, ETHBTC и ETHUSD. Это список инструментов для рассматриваемых CFD-программ, а не доказательство таких же контрактов в отдельных программах Prediction Markets. Перед торговлей проверьте символ в своей платформе.',
  },
  {
    q: 'Почему в сравнении нет некоторых известных фирм?',
    a: 'Одного названия фирмы или выплаты в криптовалюте недостаточно. Нужны актуальное подтверждение торговых инструментов и проверенные цены и правила каждой заявленной программы. Неполные проверки перечислены отдельно; это не обвинение фирмы и не вывод о закрытии её услуг.',
  },
]

export default function RussianCryptoPropFirmsPage() {
  const firms = getAllFirms()
  const mapped = cryptoMarketEvidence.ranked.map(evidence => ({
    evidence,
    firm: firms.find(candidate => candidate.name === evidence.firmName),
    products: getChallengesByFirm(evidence.firmSlug).filter(product => evidence.productSlugs.includes(product.productSlug)),
  }))
  // Re-evaluate on every render: newer prices cannot renew old instrument evidence.
  const snapshots = mapped.flatMap(({ evidence, firm, products }) =>
    firm && freshEvidence(evidence) && evidence.productSlugs.length > 0
      && products.length === evidence.productSlugs.length
      && products.every(product => freshEvidence(product) && hasPublishedCost(product))
      ? [{ evidence, firm, products }] : [],
  ).sort((a, b) => {
    const aKey = (a.evidence.marketModel === 'crypto-native' ? 100 : 0) + a.firm.score
    const bKey = (b.evidence.marketModel === 'crypto-native' ? 100 : 0) + b.firm.score
    // Russia access first (open, then unclear, then restricted), as on the other /ru rankings.
    return RUSSIA_STATUS_ORDER[russiaStatusFor(a.evidence.firmSlug)] - RUSSIA_STATUS_ORDER[russiaStatusFor(b.evidence.firmSlug)]
      || Number(b.evidence.firmSlug === 'bright-funded') - Number(a.evidence.firmSlug === 'bright-funded')
      || bKey - aKey || a.firm.name.localeCompare(b.firm.name)
  })
  const payoutEvidence = cryptoMarketEvidence.payoutAlternative
  const ofpEvidence = cryptoMarketEvidence.ranked.find(item => item.firmSlug === 'ofp-funding') as { priceRecheck?: { sourceUrl: string; sourceCapturedAt: string } } | undefined
  const ofpPriceRecheck = ofpEvidence?.priceRecheck && freshIso(ofpEvidence.priceRecheck.sourceCapturedAt) ? ofpEvidence.priceRecheck : undefined
  const firmCheckDate = firmCheckEvidence.checkedAt.slice(0, 10)
  const firmCheckFresh = freshIso(firmCheckDate)
  const brightFirm = firms.find(candidate => candidate.name === 'BrightFunded')
  const brightCrypto = (brightFirm as (typeof brightFirm & { assetsEvidence?: { sourceUrl: string; sourceCapturedAt: string } }) | undefined)?.assetsEvidence
  const brightCryptoFresh = Boolean(brightCrypto && freshIso(brightCrypto.sourceCapturedAt) && brightFirm?.assets.includes('Crypto'))
  const cftAccess = russianMarketEvidence.firmAccess.find(item => item.firmSlug === 'crypto-fund-trader')
  const cftAccessObservation = cftAccess && 'sourceObservations' in cftAccess
    ? (cftAccess.sourceObservations as Array<{ sourceUrl: string; sourceCapturedAt: string; quote: string }>).find(item => item.quote.startsWith('Match-Trader:'))
    : undefined
  const shortlist = ACCESS_LIST_SLUGS
    .map((slug, index) => ({ slug, index, status: russiaStatusFor(slug) }))
    .sort((a, b) => RUSSIA_STATUS_ORDER[a.status] - RUSSIA_STATUS_ORDER[b.status] || a.index - b.index)
  const shortlistCrypto = (slug: (typeof ACCESS_LIST_SLUGS)[number]) => {
    const evidence = cryptoMarketEvidence.ranked.find(item => item.firmSlug === slug)
    if (!evidence || !freshEvidence(evidence)) {
      return <>данных Prop Firm Tracker о криптоинструментах за последние 30 дней нет — список инструментов не приводим.</>
    }
    return <>{evidenceText(evidence).evidence} (по данным на {ruDate(evidence.sourceCapturedAt)}) <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener">Источник</a></>
  }
  const shortlistAccess = (slug: (typeof ACCESS_LIST_SLUGS)[number], status: string) => {
    if (slug === 'crypto-fund-trader' && cftAccessObservation && freshIso(cftAccessObservation.sourceCapturedAt)) {
      return `на Match-Trader ограничений по странам нет; MT5 недоступен жителям США (по данным на ${ruDate(cftAccessObservation.sourceCapturedAt)})`
    }
    if (!firmCheckFresh) return 'список ограничений требует повторной проверки'
    return status === 'restricted'
      ? `Россия в официальном списке ограничений (по данным на ${ruDate(firmCheckDate)})`
      : `Россия не названа в официальном списке ограничений (по данным на ${ruDate(firmCheckDate)})`
  }
  const shortlistReview: Record<(typeof ACCESS_LIST_SLUGS)[number], ReactNode> = {
    'bright-funded': <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор</Link>,
    'crypto-fund-trader': <><RuPendingLink href="/ru/obzor-crypto-fund-trader" className="btn-outline">Русский обзор</RuPendingLink> <Link href="/blog/crypto-fund-trader-review" hrefLang="en" className="btn-outline">Обзор на английском</Link></>,
    ftmo: <Link href="/ru/obzor-ftmo" className="btn-outline">Русский обзор</Link>,
    'city-traders-imperium': <Link href="/blog/city-traders-imperium-review" hrefLang="en" className="btn-outline">Обзор на английском</Link>,
    'ofp-funding': <Link href="/blog/ofp-funding-review" hrefLang="en" className="btn-outline">Обзор на английском</Link>,
  }
  const evidenceDates = [
    ...mapped.flatMap(({ evidence, products }) => [
      { label: `инструменты ${evidence.firmName}`, capturedAt: evidence.sourceCapturedAt },
      { label: `цены и правила ${evidence.firmName}`, capturedAt: products.length === evidence.productSlugs.length
        ? products.map(product => product.sourceCapturedAt).sort()[0] ?? '' : '' },
    ]),
    { label: 'способы выплаты BrightFunded', capturedAt: payoutEvidence.sourceCapturedAt },
  ]
  const hasFreshEvidence = mapped.length > 0 && snapshots.length === mapped.length && freshEvidence(payoutEvidence)
  const productCount = snapshots.reduce((total, snapshot) => total + snapshot.products.length, 0)
  const partnerCount = snapshots.filter(snapshot => Boolean(snapshot.firm.affiliateUrl)).length
  const lastModified = russianRouteDateModified(PATH, '2026-09-08')
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Крипто-проп-фирмы' },
  ])
  const list = itemListSchema(snapshots.map(snapshot => ({ ...snapshot.firm, reviewUrl: localizedReviewHref(snapshot.firm.reviewUrl) })), TITLE)
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: lastModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {snapshots.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />}
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-crypto-hero="search-and-product-evidence">
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> От криптоинструмента к условиям счёта</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Сравниваем программы для торговли криптоинструментами: стоимость участия, комиссии, кредитное плечо
            и ограничения риска. Отдельно разбираем выплаты в криптовалюте и доступ из своей страны — это разные вопросы.
          </p>
          <p className="ru-source-line" data-russian-crypto-access-pointer="top">Кто из этих фирм открыт для резидентов РФ, а кто закрыт, — в разделе <a href="#dostup-iz-rossii">«Крипто проп-компании и Россия»</a>.</p>
          <div className="ru-review-meta" aria-label="Редакционные данные рейтинга крипто-проп-фирм">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
          </div>
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-stats">
            <div className="ru-stat"><strong>{snapshots.length}</strong><span>фирм с актуальными источниками в сравнении</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>программ с известными ценами</span></div>
            <div className="ru-stat"><strong>{partnerCount} из {snapshots.length}</strong><span>партнёрские фирмы; порядок не меняется</span></div>
            <div className="ru-stat"><strong>{cryptoWatch.length}</strong><span>незавершённых проверок других фирм</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#ranking" className="btn-primary">Открыть сравнение <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Выбрать по стране</Link>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-crypto-article="long-form">
        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <div className="ru-notice ru-disclosure ru-review-top-disclosure" data-russian-affiliate-disclosure="crypto-ranking">
              <strong>Партнёрские ссылки.</strong> Мы можем получить комиссию при переходе к партнёру.
              Она даёт <strong>0 баллов</strong> в сравнении и не подтверждает условия программы.
              Коммерческий статус указан возле каждой фирмы. Фирмы, закрытые для резидентов РФ, идут последними, с бейджем доступа и пометкой «резидентам РФ недоступна»: резидентам России мы их не рекомендуем.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание рейтинга крипто-проп-фирм">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#crypto-shortlist">Открытые для РФ сначала</a></li>
                <li><a href="#country-check">Страна и KYC</a></li>
                <li><a href="#ranking">Фирмы с актуальными источниками</a></li>
                <li><a href="#comparison">Цены и условия программ</a></li>
                <li><a href="#firm-decisions">Как выбрать по фирме</a></li>
                <li><a href="#crypto-risk">Комиссия, плечо и выходные</a></li>
                <li><a href="#payout-boundary">Торговля против USDC-выплаты</a></li>
                <li><a href="#evidence-watch">Незавершённые проверки</a></li>
                <li><a href="#dostup-iz-rossii">Доступ из России</a></li>
                <li><a href="#sources">Первичные источники</a></li>
                <li><a href="#alternatives">Следующий шаг</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="crypto-shortlist">
          <div className="ru-shell" data-russian-crypto-shortlist="russia-access-first">
            <div className="ru-content">
              <h2>Крипто-проп-фирмы: сначала открытые для РФ, затем закрытые</h2>
              <p>Порядок — по доступу для резидентов России (бейдж берётся из нашей базы), затем редакционный. Закрытые фирмы мы оставили в списке, потому что их часто ищут: бейдж показывает, почему они не подходят трейдеру из РФ. Ссылки на их сайты идут последними, с пометкой «резидентам РФ недоступна»; резидентам России мы их не рекомендуем.</p>
            </div>
            <div className="ru-grid">
              {shortlist.map(({ slug, status }, position) => (
                <article className="ru-card" key={slug} data-russian-crypto-shortlist-firm={slug} data-russia-status={status}>
                  <div className="ru-card-head">
                    <div>
                      <span className="ru-pill">#{position + 1}</span>
                      <h3>{ACCESS_LIST_NAMES[slug] === 'CTI' ? 'City Traders Imperium (CTI)' : ACCESS_LIST_NAMES[slug] === 'OFP' ? 'OFP Funding' : ACCESS_LIST_NAMES[slug]} <RuAccessBadge firm={slug} /></h3>
                    </div>
                  </div>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> Криптовалюта: {shortlistCrypto(slug)}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Доступ: {shortlistAccess(slug, status)}</li>
                  </ul>
                  <div className="ru-actions">
                    {shortlistReview[slug]}
                    {status === 'restricted' ? (
                      <>
                        <RuGoLink firm={slug} href={`/go/${slug}?from=ru-crypto-top-${slug}`} rel={goLinkRel(slug)} className="btn-outline">Сайт {ACCESS_LIST_NAMES[slug]} <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                        <span className="ru-muted" data-russian-crypto-restricted-cta={slug}>для резидентов других стран; резидентам РФ {ACCESS_LIST_NAMES[slug]} недоступна</span>
                      </>
                    ) : <RuGoLink firm={slug} href={`/go/${slug}?from=ru-crypto-top-${slug}`} rel={goLinkRel(slug)} className="btn-primary">Перейти в {ACCESS_LIST_NAMES[slug]} <ArrowRight size={14} aria-hidden="true" /></RuGoLink>}
                  </div>
                </article>
              ))}
            </div>
            <p className="ru-source-line">Сведения о криптоинструментах — из данных Prop Firm Tracker по официальным страницам фирм. Цены, правила программ и даты проверки — в рейтинге ниже.</p>
          </div>
        </section>

        <section className="ru-section" id="country-check">
          <div className="ru-shell">
            <div className="ru-notice" data-russian-country-boundary="crypto-not-access">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Русский язык не означает доступность страны.</strong>{' '}
              До оплаты проверьте гражданство, страну проживания, документы для KYC, ограничения фирмы и платформы,
              способы платежа и выплаты. Русскоязычным трейдерам в разных странах могут быть доступны разные условия.
              Не используйте ложные документы или неверные сведения для обхода ограничений.{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">Как проверить доступ из своей страны →</Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="ranking">
          <div className="ru-shell" data-russian-crypto-ranking="source-gated" data-russian-crypto-product-count={productCount} data-russian-crypto-partner-count={partnerCount}>
            <div className="ru-content">
              <h2>Криптопрограммы с проверенными ценами — включая фирмы, закрытые для РФ</h2>
              <p>Для включения нужны два подтверждения: фирма публикует криптоинструменты для рассматриваемых программ, а цены и правила каждой из них проверены в пределах 30 дней. Сейчас в выборке: фирм — {snapshots.length}, программ — {productCount}. Это не проверка надёжности будущей выплаты и не разрешение зарегистрироваться из любой страны: у каждой фирмы стоит бейдж доступа для резидентов РФ, а закрытые для РФ фирмы стоят последними и резидентам России не рекомендуются.</p>
              {!snapshots.length && <p className="ru-notice" data-russian-crypto-empty="recapture-required">Сейчас нет полной выборки со свежими источниками и известными ценами. Ниже сохранён датированный разбор правил; актуальные числовые карточки появятся после повторной проверки. <Link href="/ru/luchshie-prop-firmy#podbor">Открыть общий подбор программ →</Link></p>}
            </div>
            <div className="ru-grid">
              {snapshots.map((snapshot, index) => {
                const { evidence, products, firm } = snapshot
                const affiliate = Boolean(firm.affiliateUrl)
                const productNames = products.map(product => product.productName)
                const drawdowns = [...new Set(products.map(drawdownLabel))]
                const reviewHref = localizedReviewHref(firm.reviewUrl)
                return (
                  <article className="ru-card" key={evidence.firmSlug} data-russian-crypto-firm={evidence.firmSlug} data-russian-crypto-commercial={affiliate ? 'partner' : 'independent'}>
                    <div className="ru-card-head">
                      <div>
                        <span className="ru-pill">#{index + 1} · {affiliate ? 'партнёр' : 'без партнёрской ссылки'}</span>
                        <h2>{firm.name} <RuAccessBadge firm={evidence.firmSlug} /></h2>
                      </div>
                      <span className="ru-score">TFH {firm.score.toFixed(1)}/10</span>
                    </div>
                    <ul className="ru-facts">
                      <li><ShieldCheck size={14} aria-hidden="true" /> {products.length} программ: {productNames.slice(0, 3).join(', ')}{productNames.length > 3 ? ` и ещё ${productNames.length - 3}` : ''}</li>
                      <li><BadgeDollarSign size={14} aria-hidden="true" /> Минимальные известные расходы (в валюте фирмы, без пересчёта): {minimumKnownCost(products)}; начальная доля вознаграждения: {splitLabel(products)}</li>
                      <li><ShieldCheck size={14} aria-hidden="true" /> Просадка: {drawdowns.join(', ')}. Срок выплаты зависит от программы и условий запроса — см. обзор.</li>
                      <li><Database size={14} aria-hidden="true" /> {evidenceText(evidence).evidence}</li>
                    </ul>
                    <p className="ru-muted">{evidenceText(evidence).scope}</p>
                    <p className="ru-source-line">Инструменты — по данным на {ruDate(evidence.sourceCapturedAt)}. Цены и правила — по данным на {ruDate(products.map(product => product.sourceCapturedAt).sort()[0])} (самая ранняя проверка).</p>
                    <div className="ru-actions">
                      <Link href={reviewHref} className="btn-outline">{reviewHref.startsWith('/ru/') ? 'Русский обзор' : 'Английский обзор'}</Link>
                      <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Источник <ExternalLink size={13} aria-hidden="true" /></a>
                      {affiliate ? (
                        <RuGoLink firm={evidence.firmSlug} href={`/go/${evidence.firmSlug}?from=ru-crypto-ranking`} rel="sponsored nofollow noopener" className={russiaStatusFor(evidence.firmSlug) === 'restricted' ? 'btn-outline' : 'btn-primary'}>
                          Проверить текущие условия <ArrowRight size={14} aria-hidden="true" />
                        </RuGoLink>
                      ) : (
                        // No affiliate CTA: the Russia-access badge (firms.json russiaStatus) still renders on the ranked card.
                        <RuAccessBadge firm={evidence.firmSlug} />
                      )}
                      {russiaStatusFor(evidence.firmSlug) === 'restricted' ? <span className="ru-muted" data-russian-crypto-restricted-cta={affiliate ? evidence.firmSlug : undefined} data-russian-crypto-restricted-label={evidence.firmSlug}>для резидентов других стран; резидентам РФ {firm.name} недоступна</span> : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison">
          <div className="ru-shell" data-russian-crypto-comparison="current-source-mapped-products">
            <div className="ru-content">
              <h2>Сравнение стоимости и правил</h2>
              <p>Показаны минимальные известные расходы по программам из выборки в той валюте, в которой их публикует фирма (USD или EUR, без пересчёта по курсу), а не только рекламный первый платёж. Для Buy Now, Pay Later у Maven учитывается и обязательная доплата. У подписки минимум предполагает прохождение за первый платёжный период; повторные попытки, дополнительные периоды и опции увеличат расходы. Здесь нет прогноза прибыли или окупаемости.</p>
            </div>
            {snapshots.length > 0 && <div className="ru-table-wrap" role="region" aria-label="Сравнение криптопрограмм — таблицу можно прокрутить" tabIndex={0}>
              <table className="ru-table">
                <thead><tr><th scope="col">Фирма</th><th scope="col">Модель</th><th scope="col">Программы</th><th scope="col">Известные расходы (валюта фирмы)</th><th scope="col">Начальная доля</th><th scope="col">Просадка</th><th scope="col">Коммерческий статус</th></tr></thead>
                <tbody>
                  {snapshots.map(({ evidence, products, firm }) => (
                    <tr key={evidence.firmSlug}>
                      <td><strong>{firm.name}</strong></td>
                      <td>{evidence.marketModel === 'crypto-native' ? 'криптовалютные инструменты' : 'CFD на разные рынки'}</td>
                      <td>{products.length}</td>
                      <td>{minimumKnownCost(products)}</td>
                      <td>{splitLabel(products)}</td>
                      <td>{[...new Set(products.map(drawdownLabel))].join(', ')}</td>
                      <td>{firm.affiliateUrl ? 'партнёр' : 'без комиссии TFH'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
            {ofpPriceRecheck && snapshots.some(item => item.evidence.firmSlug === 'ofp-funding') && (
              <p className="ru-source-line" data-russian-crypto-ofp-prices="homepage-not-checkout">
                Цены OFP — с <a href={ofpPriceRecheck.sourceUrl} target="_blank" rel="nofollow noopener">главной страницы ofpfunding.com</a> (по данным на {ruDate(ofpPriceRecheck.sourceCapturedAt)}); в корзине они не подтверждены, потому что оформление доступно только после входа в аккаунт.
              </p>
            )}
          </div>
        </section>

        <section className="ru-section" id="firm-decisions">
          <div className="ru-shell ru-content" data-russian-crypto-decision-guide="product-not-logo">
            <h2>Как выбрать криптопрограмму: сначала доступ из РФ, затем инструмент и правила</h2>
            <p className="ru-source-line">FundedNext, FTMO, CTI и OFP резидентам РФ недоступны — их карточки нужны тем, кто живёт в других странах. Разбор ниже относится к датам источников в конце статьи. Отсутствие фирмы в текущей таблице не удаляет её исторический разбор и не подтверждает закрытие программы.</p>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>BrightFunded: криптопары во всех трёх челленджах</h3>
                <p>Справка BrightFunded перечисляет более 48 криптопар к USD; плечо по криптовалютам 1:5 одинаково для челленджей и funded-счетов (по данным на 21.10.2026). Цены BrightFunded публикует в EUR, поэтому в таблице они стоят в евро без пересчёта.</p>
                <Link href="/ru/obzor-bright-funded" className="ru-card-link">Обзор BrightFunded →</Link>
              </article>
              <article className="ru-card">
                <h3>Crypto Fund Trader: Evaluation, Accelerated и Instant</h3>
                <p>По <a href="https://cryptofundtrader.com/faq/" target="_blank" rel="nofollow noopener">FAQ CFT</a> на Match-Trader и MetaTrader 5 — 556 криптовалют среди более чем 720 инструментов; плечо по криптовалютам на счетах Advanced — 1:100 (по данным на 21.10.2026). У Instant начальная доля вознаграждения ниже, чем у оценочных программ, — подробности ниже.</p>
                <Link href="/blog/crypto-fund-trader-review" hrefLang="en" className="ru-card-link">Обзор CFT на английском →</Link>
              </article>
              <article className="ru-card">
                <h3>FundedNext: один список инструментов, разные правила счетов</h3>
                <p>Справка указывает размеры криптоконтрактов 1, 100 и 1 000 в зависимости от пары и распространяет спецификации на все счета. В нашем разборе это Stellar 2-Step, Stellar 1-Step, Stellar Lite и Stellar Instant. Общий инструмент не делает их одинаковыми: число оценочных этапов, просадка и условия вознаграждения различаются.</p>
                <Link href="/ru/obzor-fundednext" className="ru-card-link">Цены и правила FundedNext →</Link>
              </article>
              <article className="ru-card">
                <h3>FundingPips: только 1 Step Flex</h3>
                <p>Справка 1 Step Flex указывает комиссию 0,04%, плечо 1:2 на оценке и 1:1 на следующем счёте Master Account. Изменение плеча названо временным. Для Zero, Pro, Standard и 2 Step Flex нужны отдельные подтверждения — нельзя перенести на них условия этого документа.</p>
                <Link href="/ru/obzor-fundingpips" className="ru-card-link">Открыть полный русский обзор →</Link>
              </article>
              <article className="ru-card">
                <h3>Maven: четыре пары в справке по инструментам</h3>
                <p>FAQ перечисляет BTCEUR, BTCUSD, ETHBTC и ETHUSD. Важно проверить валюту котировки: BTCUSD и BTCEUR — не один и тот же контракт. Отдельные программы Prediction Markets не включены: список CFD-инструментов не подтверждает их условия. Партнёрский статус отмечается в карточке и не влияет на порядок сравнения.</p>
                <Link href="/blog/maven-prop-firm-review" hrefLang="en" className="ru-card-link">Открыть английский обзор →</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="crypto-risk">
          <div className="ru-shell ru-content">
            <h2>Комиссия, плечо, выходные и просадка важнее числа пар</h2>
            <p><strong>Комиссия.</strong> В примере FundingPips один лот ETH/USD при цене $2 600 даёт комиссию $1,04 по формуле «объём × цена × 0,04%». Это опубликованный пример расчёта, не результат торговли. Уточните, как учитываются открытие и закрытие сделки, спред и перенос позиции; одна цифра комиссии не описывает все расходы стратегии.</p>
            <p><strong>Плечо.</strong> Большее плечо уменьшает требуемую маржу для той же позиции, но не увеличивает разрешённый убыток. У 1 Step Flex условия оценки и следующего счёта различаются, поэтому расчёт позиции нужно проверить заново после перехода. Размер условного счёта также не является личным капиталом трейдера.</p>
            <p><strong>Выходные.</strong> Работа базового крипторынка не гарантирует непрерывную работу терминала. Проверьте обслуживание, спред, перенос открытых позиций и требования закрыться перед выходными. У разрешения торговать BTCUSD и разрешения держать сделку до понедельника разные основания.</p>
            <p><strong>Просадка.</strong> При статическом лимите общий порог привязан к исходной базе; при следящем лимите он может подниматься за результатом счёта. Узнайте, используется баланс или стоимость счёта с открытой прибылью и убытком, когда пересчитывается порог и что происходит после выплаты. Сам процент без этой механики недостаточен для выбора.</p>
          </div>
        </section>

        <section className="ru-section" id="payout-boundary">
          <div className="ru-shell ru-content" data-russian-crypto-payout-boundary="bright-funded-crypto-and-usdc">
            <h2>Торговля криптовалютой и выплата в USDC — разные маршруты</h2>
            <p>У BrightFunded это два отдельных факта из двух справок. Торговля: {brightCryptoFresh && brightCrypto ? <>более 48 криптовалютных пар (по данным на {ruDate(brightCrypto.sourceCapturedAt)})</> : 'список криптоинструментов требует повторной проверки'}. Выплата: USDC по сети ERC-20 или банковский перевод в EUR. Сама по себе выплата в USDC фирму крипто-проп-компанией не делает: место в списке выше BrightFunded получила за криптопары, а не за способ перевода.</p>
            <p className="ru-source-line" data-russian-crypto-payout-status={freshEvidence(payoutEvidence) ? 'dated' : 'recapture-required'}>Источник по способам выплаты: {payoutEvidence.sourceCapturedAt || 'дата не подтверждена'}. {!freshEvidence(payoutEvidence) && 'Проверка устарела или дата недостоверна: описание выше является датированным разбором, а не подтверждением действующих способов перевода.'}</p>
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрская ссылка.</strong> Переход ниже может принести нам комиссию. Это не подтверждает возможность получить USDC в каждой стране. До оплаты проверьте доступность метода для своих документов и места проживания.
            </div>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор BrightFunded</Link>
              <a href={payoutEvidence.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальная справка о выплатах</a>
              <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-crypto-ranking-payout-alternative" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить условия BrightFunded <ArrowRight size={14} aria-hidden="true" />
              </RuGoLink>
            </div>
          </div>
        </section>

        <section className="ru-section" id="evidence-watch">
          <div className="ru-shell" data-russian-crypto-watch-count={cryptoWatch.length}>
            <div className="ru-content">
              <h2>Какие проверки ещё не завершены</h2>
              <p>Для перечисленных ниже фирм не хватает проверки отдельных криптопрограмм либо актуальных сведений об инструментах и условиях. Это не обвинение фирмы, не подтверждение отсутствия криптоторговли и не вывод о закрытии услуги. Причина указана отдельно для каждого случая.</p>
            </div>
            {cryptoWatch.length === 0 ? <p className="ru-source-line" data-russian-crypto-watch-empty="true">Сейчас в данных Prop Firm Tracker нет фирм, у которых проверка криптоинструментов не завершена.</p> : null}
            {cryptoWatch.length > 0 && <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Статус</th><th>Источник по рынкам</th><th>Что требуется</th></tr></thead>
                <tbody>
                  {cryptoWatch.map(item => (
                    <tr key={item.firmSlug}>
                      <td><strong>{item.firmName}</strong></td>
                      <td>{item.status === 'product-capture-needed' ? 'нужна проверка отдельных криптопрограмм' : 'нужно обновить рынок или продукты'}</td>
                      <td><a href={item.sourceUrl} target="_blank" rel="nofollow noopener">{item.sourceCapturedAt}</a></td>
                      <td>{item.nextStepRu ? item.nextStepRu : item.status === 'product-capture-needed'
                        ? 'Отдельные криптопрограммы нельзя оценивать по ценам и правилам валютных счетов.'
                        : 'Нужна повторная проверка первичных источников, прежде чем использовать старые условия в сравнении.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
            <div className="ru-content" data-russian-crypto-cft-correction="2026-09-08">
              <h3>Crypto Fund Trader: что исправили 8 сентября</h3>
              <p>Повторно проверили 15 базовых цен в трёх программах: Evaluation, Accelerated и Instant. По данным на 21.10.2026 Prop Firm Tracker связал криптоинструменты CFT с этими тремя программами, поэтому CFT теперь стоит в рейтинге выше. Ascend и Break в рейтинг не входят.</p>
              <p>В проверенных начальных вариантах Instant доля вознаграждения составляет 50%, а не 80% стандартных оценочных программ. Для общего порядка запроса указаны 15 торговых дней или 30 календарных дней; отдельный путь Instant без минимального числа дней требует 10% симулированной прибыли и запроса на выплату с переходом на следующий уровень. Это не обещание немедленного перевода денег.</p>
              <p data-russian-crypto-cft-ascend="not-purchasable">Ascend завершается фиксированным вознаграждением после оценки, а не обычным счётом с постоянной долей прибыли. Ascend сейчас не продаётся: по данным на 19.10.2026 все шесть позиций Ascend ($5K–$200K) в магазине CFT недоступны к покупке, и проверка магазина 20.10.2026 это подтвердила. Поэтому цены Ascend мы не показываем и в расчётах не используем. Цены Break по данным на 14.10.2026: $70 / $140 / $200 за $25K / $50K / $100K плюс обязательный сбор за активацию $138 / $198 / $328 после прохождения; по данным на 19.10.2026 позиции Break в магазине доступны, хотя на странице Break стоит надпись «sold out». Поэтому самый дешёвый доступный к покупке вход у CFT — Accelerated $5K за $40. Наличие размера и итоговую цену проверьте в корзине. Это не вывод о закрытии программ и не подтверждение регистрации из какой-либо страны.</p>
              <p className="ru-source-line">Это датированное исправление нашего материала, не установленная дата изменения правил фирмы. Цены Break — <a href="https://cryptofundtrader.com/terms-and-conditions/" target="_blank" rel="nofollow noopener noreferrer">условия CFT</a> и <a href="https://cryptofundtrader.com/shop/" target="_blank" rel="nofollow noopener noreferrer">магазин CFT</a>, по данным на 14.10.2026; доступность Break к покупке — <a href="https://cryptofundtrader.com/" target="_blank" rel="nofollow noopener noreferrer">главная страница</a> и магазин, по данным на 19.10.2026; Ascend не продаётся — магазин CFT, по данным на 19.10.2026, с проверкой магазина 20.10.2026 (Prop Firm Tracker). Официальные источники и нерешённые вопросы перечислены в журнале; перед оплатой проверьте условия заново.</p>
              <div className="ru-actions">
                <Link href="/blog/crypto-fund-trader-review" hrefLang="en" className="btn-outline">Полный обзор CFT — на английском</Link>
                <Link href="/prop-firm-challenge-changes?products=crypto-fund-trader%3Ainstant%2Ccrypto-fund-trader%3Aascend%2Ccrypto-fund-trader%3Abreak#change-ledger" hrefLang="en" className="ru-card-link">Источники исправлений — на английском →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="dostup-iz-rossii">
          <div className="ru-shell ru-content" data-russian-crypto-russia-access="open-and-closed">
            <h2>Крипто проп-компании и Россия: кто открыт, а кто закрыт</h2>
            <p>
              На этой странице есть и фирмы, закрытые для резидентов России: мы их не прячем, но и регистрироваться не предлагаем.
              Россию в своих ограничениях не называют {ruJoin(OPEN_NAMES)}. Закрыты для РФ {ruJoin(CLOSED_NAMES)} (по данным на 20.10.2026).
              У FundingPips статус неясен — подробности в таблице.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ крипто-проп-фирм для резидентов РФ">
              <table className="ru-table" data-russian-crypto-access-table="open-and-closed">
                <thead><tr><th>Фирма</th><th>Доступ для РФ</th><th>Что известно</th></tr></thead>
                <tbody>
                  {shortlist.map(({ slug, status }) => (
                    <tr key={slug} data-russian-crypto-access-row={slug}>
                      <td><strong>{ACCESS_LIST_NAMES[slug] === 'CTI' ? 'City Traders Imperium' : ACCESS_LIST_NAMES[slug] === 'OFP' ? 'OFP Funding' : ACCESS_LIST_NAMES[slug]}</strong></td>
                      <td><RuAccessBadge firm={slug} /></td>
                      <td>{shortlistAccess(slug, status)}</td>
                    </tr>
                  ))}
                  <tr data-russian-crypto-access-row="fundednext">
                    <td><strong>FundedNext</strong></td>
                    <td><RuAccessBadge firm="fundednext" /></td>
                    <td>подвал сайта fundednext.com исключает резидентов России (по данным на {FUNDEDNEXT_RU_ACCESS_CHECKED}); резидентам РФ не рекомендуем</td>
                  </tr>
                  <tr data-russian-crypto-access-row="fundingpips">
                    <td><strong>FundingPips</strong></td>
                    <td><RuAccessBadge firm="fundingpips" /></td>
                    <td>Россия не названа{freshIso(fpAccessEvidence.sourceCapturedAt) ? `, но фирма ссылается на санкционные списки FATF и ЕС/ООН (по данным на ${ruDate(fpAccessEvidence.sourceCapturedAt)})` : ''}; до оплаты получите письменный ответ поддержки</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3>Проп-компании для трейдеров криптовалют из РФ: что проверить</h3>
            <ul>
              <li><strong>Платформа.</strong> У Crypto Fund Trader ограничений по странам нет только на Match-Trader, а MT5 закрыт для жителей США{cftAccessObservation && freshIso(cftAccessObservation.sourceCapturedAt) ? ` (по данным на ${ruDate(cftAccessObservation.sourceCapturedAt)})` : ''}.</li>
              <li><strong>Цена входа.</strong> Crypto Fund Trader Evaluation на $10 000 — $110, на $100 000 — $660 (по данным на 20.10.2026).</li>
              <li><strong>Доля.</strong> 80% в оценочных программах Crypto Fund Trader, но 50% в Instant — подробнее в блоке выше.</li>
              <li><strong>Выплата.</strong> BrightFunded платит в USDC (ERC-20) или банковским переводом в EUR (по данным на {ruDate(payoutEvidence.sourceCapturedAt)}). Crypto Fund Trader платит в USDT (ERC20/TRC20), BTC, ETH или банковским переводом в EUR или USD (по данным на 20.10.2026).</li>
            </ul>
            <h3>Крипта в проп-трейдинге: оплата из России</h3>
            <p>
              Crypto Fund Trader принимает карту, PayPal, Apple Pay, Google Pay и криптовалюту (<a href="https://cryptofundtrader.com/faq/" target="_blank" rel="nofollow noopener noreferrer">FAQ CFT</a>,
              по данным на 19.10.2026; на странице Get Started и в условиях названы только карта и криптовалюта). Работают ли карты, выпущенные в России, фирма не сообщает; криптовалюта — способ, который от карты не зависит. Полная таблица доступа — на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для россиян</Link>.
            </p>
            <div className="ru-actions" data-russian-crypto-access-ctas="open-first-restricted-last">
              <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-crypto-russia-access-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-crypto-russia-access-1" rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-crypto-russia-access-2" rel={goLinkRel('fundingpips')} className="btn-outline">FundingPips</RuGoLink>
            </div>
            <div className="ru-actions" data-russian-crypto-access-ctas="restricted-last">
              {RESTRICTED_ACCESS_CTAS.filter(slug => russiaStatusFor(slug) === 'restricted').map(slug => (
                <RuGoLink key={slug} firm={slug} href={`/go/${slug}?from=ru-crypto-russia-access-${slug}`} rel={goLinkRel(slug)} className="btn-outline">{RESTRICTED_CTA_NAMES[slug]}</RuGoLink>
              ))}
              <span className="ru-muted" data-russian-crypto-restricted-cta="russia-access">для резидентов других стран; резидентам РФ эти фирмы недоступны</span>
            </div>
            <RuFundedNextAccessCaveat />
          </div>
        </section>

        <section className="ru-section" id="alternatives">
          <div className="ru-shell ru-content">
            <h2>Следующий шаг для русскоязычного криптотрейдера</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={21} color="var(--accent-light)" aria-hidden="true" /><h3>1. Сначала страна</h3><p>Уточните гражданство, проживание, документы и доступные способы платежа и выплаты. Криптокошелёк сам по себе не подтверждает соответствие условиям фирмы.</p><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="ru-card-link">Проверки для своей страны →</Link></article>
              <article className="ru-card"><BadgeDollarSign size={21} color="var(--accent-light)" aria-hidden="true" /><h3>2. Затем точная программа</h3><p>Сопоставьте обязательные платежи, расчёт просадки, комиссию, плечо, требования к прибыльным дням и условия запроса вознаграждения.</p><Link href="/ru/luchshie-prop-firmy#podbor" className="ru-card-link">Подобрать программы →</Link></article>
              <article className="ru-card"><WalletCards size={21} color="var(--accent-light)" aria-hidden="true" /><h3>3. Только потом оплата</h3><p>Перед платежом повторно откройте правила и проверьте итоговую сумму. Если ответ о стране или способе выплаты неясен, сохраните письменное разъяснение поддержки.</p><Link href="/ru/prop-firmy-bez-kyc" className="ru-card-link">Что нужно для KYC →</Link></article>
            </div>
            <div className="ru-review-author" aria-label="Автор рейтинга крипто-проп-фирм">
              <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
              <div>
                <strong>Автор: Edris Derakhshi</strong>
                <p>Автор обзоров и руководств Traders Fund Hub. В этом рейтинге различаем торговлю криптоактивами, оплату участия и получение прибыли в криптовалюте. Партнёрская комиссия не меняет порядок фирм.</p>
                <Link href="/authors/edris-derakhshi" hrefLang="en">Профиль автора — на английском</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Первичные источники и границы проверки</h2>
            <p>Даты по инструментам и способам выплаты ниже независимы от дат ценовых записей. Новая проверка справки о криптовалюте не означает повторную проверку стоимости челленджа, всех его правил или доступа по стране.</p>
            <ul>
              {mapped.map(({ evidence, products }) => <li key={evidence.firmSlug}>
                <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener">{evidence.firmName}: справка об инструментах</a> — {evidence.sourceCapturedAt || 'дата не подтверждена'}.
                {' '}Проверки программ: {[...new Set(products.map(product => product.sourceCapturedAt || 'дата не подтверждена'))].sort().join(', ') || 'записи отсутствуют'}.
              </li>)}
              <li><a href={payoutEvidence.sourceUrl} target="_blank" rel="nofollow noopener">BrightFunded: способы выплаты</a> — {payoutEvidence.sourceCapturedAt || 'дата не подтверждена'}. Доступность конкретного метода для читателя не подтверждена.</li>
              <li>CFT: <a href="https://cryptofundtrader.com/faq/" target="_blank" rel="nofollow noopener">FAQ</a> и <a href="https://cryptofundtrader.com/terms-and-conditions/" target="_blank" rel="nofollow noopener">условия программ</a>. Основания исправления от 8 сентября разобраны выше; полные проверки Ascend и Break остаются незавершёнными.</li>
            </ul>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы</h2>
            {!hasFreshEvidence && <p className="ru-source-line">Ответы сохраняют датированный разбор. Часть источников или цен требует повторной проверки; не считайте эти ответы подтверждением текущего предложения.</p>}
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
