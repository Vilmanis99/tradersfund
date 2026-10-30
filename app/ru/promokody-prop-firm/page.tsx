import type { Metadata } from 'next'
import RuAllReviews from '@/components/RuAllReviews'
import Link from '@/components/SafeLink'
import { ArrowRight, BadgePercent, CalendarCheck, ShieldAlert } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import CopyableCodePill from '@/components/CopyableCodePill'
import { getAllDeals, type Deal } from '@/lib/deals'
import { getAllChallenges, isChallengeFresh, getAllFirms } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import { breadcrumbSchema, ruFaqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel, futuresRestrictedInRussia, russiaBasisDateFor, russiaSourceDateFor } from '@/lib/russiaAvailability'
import { RU_EXTRA_RUSSIA_BASIS } from '@/lib/ruAccessExtra'
import fundingPipsAccessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'
import cftPaymentsCapture from '@/content/data/challenges/_captures/crypto-fund-trader-2026-10-20.json'
import promoRecheck from '@/content/data/ru-promo-recheck.json'
import Breadcrumbs from '@/components/Breadcrumbs'
import { FUNDEDNEXT_RU_ACCESS_NOTE } from '@/components/RuFundedNextAccessCaveat'
import { ruNotListedDates } from '@/lib/ruBasisWording'
import { ruAccessDate } from '@/lib/ruAccessLabel'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { formatRuDate, ruMonthYear } from '@/lib/ruDate'

export const revalidate = 86400

const PATH = '/ru/promokody-prop-firm'
// Месяц выпуска берётся из даты сборки/перегенерации (Europe/Riga): сборка в ноябре даёт «ноябрь 2026».
// Коды — только из content/data/deals.json; даты проверки — из deals.json (verifiedOn), сверки Tracker
// (content/data/ru-promo-recheck.json) и firms.json discountCodeCapturedAt.
const MONTH_LABEL = ruMonthYear()
// Per-firm Russia-source dates: CFT from firms.json russiaSourceCapturedAt (FAQ/Terms 7.3 re-read 23.10.2026,
// research/russia-evidence-brightfunded-cft-2026-10-23.md); FundingPips from russian-fundingpips-access-evidence.json.
const CFT_RU_SOURCE_DATE = ruAccessDate(russiaSourceDateFor('crypto-fund-trader') ?? promoRecheck.checkedAt)
// CFT payment list (card, PayPal, Apple/Google Pay, crypto): first named in the FAQ on 19.10.2026, last re-read in the 20.10.2026 capture; the 14.10.2026 capture had card + crypto only.
const CFT_PAYMENTS_CHECKED = ruAccessDate(cftPaymentsCapture.articleSlotRecapture.capturedAt)
const FP_ACCESS_CHECKED = ruAccessDate(fundingPipsAccessEvidence.sourceCapturedAt)
const FTMO_CHECKED = russiaSourceDateFor('ftmo') ?? promoRecheck.checkedAt
const BF_FUTURES_RU_RESTRICTED = futuresRestrictedInRussia('bright-funded')
const BF_FUTURES_FIRM = getAllFirms().find(firm => firmSlug(firm.name) === 'bright-funded')
const BF_FUTURES_CHECKED = BF_FUTURES_FIRM?.futuresCountriesRestrictedCapturedAt ?? null
// TITLE/DESCRIPTION — статичные строки (их читает аудит, 120–160 и ≤60 символов) с месяцем выпуска ISSUE_MONTH;
// на странице месяц подставляется из ruMonthYear(), поэтому сборка в ноябре даёт «ноябрь 2026», в декабре — «декабрь 2026».
// Самый длинный месяц («сентябрь») удлиняет строки на 2 символа: DESCRIPTION держим ≤158 символов.
const ISSUE_MONTH = 'ноябрь 2026'
const TITLE = 'Промокоды проп-фирм — ноябрь 2026: коды с датой проверки'
const DESCRIPTION = 'Промокоды проп-фирм, ноябрь 2026, с датой проверки: BrightFunded и Crypto Fund Trader — РФ нет в списках ограничений. Upscale: статус неясен. Почему нет FTMO.'
const PAGE_TITLE = TITLE.replace(ISSUE_MONTH, MONTH_LABEL)
const PAGE_DESCRIPTION = DESCRIPTION.replace(ISSUE_MONTH, MONTH_LABEL)

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  keywords: [
    'промокоды проп фирм',
    'промокод fundingpips',
    'upscale проп промокод',
    'промокод brightfunded',
    'промокод crypto fund trader',
    'промокод ftmo',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: PAGE_TITLE, description: PAGE_DESCRIPTION },
}

type HubFirm = {
  slug: string
  name: string
  review: string | null
  russiaNote: string
  external?: string
  /** Stable anchor for deep links from reviews (e.g. obzor-bright-funded → #bright-offer-status). */
  anchor?: string
  /** Anchor on the verified-deal block, present only while a checked code is live. */
  dealAnchor?: string
}

// Фирмы без РФ в списке ограничений (BrightFunded/CFT: firms.json russiaBasis); Upscale — статус для РФ неясен (lib/ruAccessExtra.ts russiaStatus, Условия прочитаны 26.10.2026); FundedNext с 20.10.2026 — недоступна для РФ (подвал сайта; firms.json russiaStatus restricted). Коды подтягиваются из content/data/deals.json;
// пока там нет проверенного кода, карточка показывает плейсхолдер «код ожидается».
// Порядок: без РФ в списке ограничений → доступ неясен → недоступна (FundedNext), BrightFunded первым.
// BrightFunded: секция кодов #bright-funded-promokody рендерится только при коде BrightFunded в deals.json, поэтому у карточки нет dealAnchor.
const hubFirms: HubFirm[] = [
  { slug: 'bright-funded', name: 'BrightFunded', review: '/ru/obzor-bright-funded', anchor: 'bright-offer-status', russiaNote: `Россия не в списке ограничений челленджей (CFD) на ${ruNotListedDates(['bright-funded'])}; исключены лица из санкционных списков.${BF_FUTURES_RU_RESTRICTED ? ` У BrightFunded Futures свой список стран, и Россия в нём есть${BF_FUTURES_CHECKED ? ` (на ${formatRuDate(BF_FUTURES_CHECKED)})` : ''}.` : ''}` },
  { slug: 'crypto-fund-trader', name: 'Crypto Fund Trader', review: '/ru/obzor-crypto-fund-trader', russiaNote: `На Match-Trader ограничений по странам нет (по данным на ${formatRuDate(CFT_RU_SOURCE_DATE)}). Оплата: карта, PayPal, Apple/Google Pay, криптовалюта (по данным на ${formatRuDate(CFT_PAYMENTS_CHECKED)}).` },
  { slug: 'upscale', name: 'Upscale', review: null, russiaNote: `Статус для РФ неясен: Условия (15.05.2026) исключают резидентов стран под санкциями США/ЕС/Великобритании; для вывода нужен KYC по паспорту (на ${ruAccessDate(RU_EXTRA_RUSSIA_BASIS.upscale.russiaSourceCapturedAt)}). В FAQ сказано иное, но обязывающий текст — Условия. Выплаты в USDT.`, external: 'https://upscale.trade/ru/' },
  { slug: 'fundingpips', name: 'FundingPips', review: '/ru/obzor-fundingpips', dealAnchor: 'fundingpips-kod', russiaNote: `Доступ для РФ не ясен (проверено ${formatRuDate(FP_ACCESS_CHECKED)}).` },
  { slug: 'fundednext', name: 'FundedNext (CFD)', review: '/ru/obzor-fundednext', dealAnchor: 'fundednext-promokod', russiaNote: FUNDEDNEXT_RU_ACCESS_NOTE },
]

/** Русский текст условий кода из deals.json (поля amountLabel/scope/note там на английском). Без перевода код показывается без пересказа условий. */
const DEAL_TEXT_RU: Record<string, { amount: string; scope: string; note: string; sourceLabel: string; excludedSizeUsd?: number }> = {
  'fundingpips:HELLO': {
    amount: 'Скидка 20%',
    scope: 'только первая покупка; счета $100K исключены',
    note: 'Код вводится до оплаты. Дата окончания не опубликована.',
    sourceLabel: 'справка FundingPips: Get Started',
    excludedSizeUsd: 100_000,
  },
}

function dealTextRu(deal: Deal) {
  return DEAL_TEXT_RU[`${deal.firmSlug}:${deal.code ?? ''}`] ?? null
}

/** utm placement for the per-firm code sections (separate from the card CTAs). */
function campaignFor(deal: Deal): string {
  return `ru-promokody-prop-firm-${deal.firmSlug}-code`
}

/** Дата последней проверки кодов фирмы: проверенный код (deals.json verifiedOn), иначе позднейшая из сверки Tracker и firms.json discountCodeCapturedAt. */
function codeCheckDate(slug: string, deal: Deal | undefined): string | null {
  if (deal) return deal.verifiedOn
  const firm = getAllFirms().find(candidate => firmSlug(candidate.name) === slug)
  const dates = [
    (promoRecheck.firms as Record<string, { checkedAt: string } | undefined>)[slug]?.checkedAt,
    firm?.discountCodeCapturedAt,
  ].filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
  return dates.sort().at(-1) ?? null
}

function money(value: number, currency: 'USD' | 'EUR'): string {
  const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return currency === 'USD' ? `$${fixed}` : `€${fixed}`
}

function sizeLabel(size: number | null | undefined): string {
  if (!size) return '—'
  return size >= 1000 ? `$${size / 1000}K` : `$${size}`
}

function withDiscount(price: number, pct: number): number {
  return Math.round(price * (100 - pct)) / 100
}

function buildFaqs(brightDeals: Deal[], fundingPipsDeal: Deal | undefined, brightChecked: string | null): RussianFaqItem[] {
  const fpText = fundingPipsDeal ? dealTextRu(fundingPipsDeal) : null
  return [
    ...(brightDeals.length > 0 ? [{
      q: 'Есть ли промокод BrightFunded?',
      a: `Да: ${brightDeals.map(deal => `${deal.code ?? 'скидка по ссылке'}${deal.pct && !deal.pctIsUpTo ? ` (${deal.pct}%)` : ''}`).join(', ')}, проверено ${formatRuDate(brightDeals.map(deal => deal.verifiedOn).sort().at(-1))} на официальной странице фирмы. Код снижает цену челленджа, но не меняет правила страны: Россия не в списке ограничений челленджей BrightFunded (на ${ruNotListedDates(['bright-funded'])}), а BrightFunded Futures Россию ограничивает.`,
    }] : [{
      q: 'Есть ли промокод BrightFunded?',
      a: `${brightChecked ? `На ${formatRuDate(brightChecked)}` : 'Сейчас'} проверенного кода BrightFunded у нас нет, поэтому раздел с кодами BrightFunded на странице не показывается. Код появится здесь только с датой проверки по официальной странице фирмы. России нет в списке ограничений челленджей BrightFunded (на ${ruNotListedDates(['bright-funded'])}); BrightFunded Futures — отдельный продукт, и Россия в его списке стран есть.`,
    }]),
    ...(fundingPipsDeal ? [{
      q: `Работает ли промокод ${fundingPipsDeal.code ?? 'FundingPips'}?`,
      a: `Код ${fundingPipsDeal.code ?? ''} даёт скидку ${fundingPipsDeal.pct ?? ''}%${fpText ? `: ${fpText.scope}` : ''}. Проверено ${formatRuDate(fundingPipsDeal.verifiedOn)} по официальной справке FundingPips. Доступ для резидентов России у FundingPips не ясен (проверено ${formatRuDate(FP_ACCESS_CHECKED)}): промокод этот вопрос не решает.`,
    }] : []),
    {
      q: 'Есть ли промокод FTMO для россиян?',
      a: 'Нет смысла его искать: Россия входит в официальный список стран, где FTMO не предоставляет услуги, а до профинансированного этапа FTMO проверяет личность. Скидка не поможет пройти KYC.',
    },
    {
      q: 'Где взять рабочий промокод FundedNext?',
      a: 'Резидентам России FundedNext недоступна, поэтому для них код не имеет смысла. Для других стран мы публикуем код FundedNext, только если проверили его условия на официальной странице и поставили дату. Не доверяйте кодам без даты на сторонних сайтах.',
    },
    {
      q: 'Можно ли сложить два промокода?',
      a: 'Как правило, при оформлении принимается один код. Совместимость кода с распродажей мы указываем в карточке только после отдельной проверки условий фирмы.',
    },
    {
      q: 'Почему старые промокоды исчезают со страницы?',
      a: 'Мы скрываем предложение, если проверка старше 30 дней или опубликованная дата окончания прошла. Каждый месяц страница обновляется заново.',
    },
    {
      q: 'Можно ли использовать VPN, если страна ограничена?',
      a: 'Нет. VPN не меняет гражданство, резидентство и документы KYC; FundedNext прямо называет VPN и ложные данные о стране основанием для закрытия аккаунта.',
    },
  ]
}

function dealFor(slug: string, deals: Deal[]): Deal | undefined {
  return deals.find(deal => deal.firmSlug === slug)
}

export default function RussianPromoHubPage() {
  const deals = getAllDeals()
  const challenges = getAllChallenges()
  const brightDeals = deals.filter(deal => deal.firmSlug === 'bright-funded')
  const fundingPipsDeal = deals.find(deal => deal.firmSlug === 'fundingpips' && deal.code)
  const fundingPipsText = fundingPipsDeal ? dealTextRu(fundingPipsDeal) : null
  // BrightFunded: EUR prices of fresh products (priceUsd is null in challenges/bright-funded.json); rendered only with a BrightFunded code.
  const brightDealPct = brightDeals.find(deal => deal.pct && !deal.pctIsUpTo)?.pct ?? null
  const brightRows = challenges
    .filter(product => product.firmSlug === 'bright-funded' && isChallengeFresh(product))
    .flatMap(product => product.accountSizes
      .filter(tier => tier.priceEur != null && tier.priceEur > 0)
      .map(tier => ({ product: product.productName, size: tier.sizeUsd, price: tier.priceEur as number, capturedAt: product.sourceCapturedAt })))
  // FundingPips HELLO: USD list prices of fresh products, minus the code %, excluding the size the code does not cover.
  const fundingPipsPct = fundingPipsDeal?.pct && !fundingPipsDeal.pctIsUpTo ? fundingPipsDeal.pct : null
  const fundingPipsRows = challenges
    .filter(product => product.firmSlug === 'fundingpips' && isChallengeFresh(product))
    .flatMap(product => product.accountSizes
      .filter(tier => tier.priceUsd != null && tier.priceUsd > 0 && tier.sizeUsd !== fundingPipsText?.excludedSizeUsd)
      .map(tier => ({ product: product.productName, size: tier.sizeUsd, price: tier.priceUsd as number, capturedAt: product.sourceCapturedAt })))
  const fundingPipsCaptures = [...new Set(fundingPipsRows.map(row => row.capturedAt))].sort()
  const checkLog = hubFirms.map(firm => {
    const deal = dealFor(firm.slug, deals)
    return { firm, deal, checked: codeCheckDate(firm.slug, deal) }
  })
  const checkDates = checkLog.map(row => row.checked).filter((date): date is string => Boolean(date)).sort()
  const latestCheck = checkDates.at(-1) ?? promoRecheck.checkedAt
  const brightChecked = checkLog.find(row => row.firm.slug === 'bright-funded')?.checked ?? null
  const faqs = buildFaqs(brightDeals, fundingPipsDeal, brightChecked)
  // Article dateModified, sitemap lastmod and visible dates share lib/ruRouteLastmod.generated.ts (588fa9ac kept deals.verifiedOn as the data date).
  const dealsModified = [...deals.map(deal => deal.verifiedOn).filter(Boolean)].sort().at(-1) ?? promoRecheck.checkedAt
  const dateModified = russianRouteDateModified(PATH, dealsModified)
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Промокоды проп-фирм' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    dateModified,
  }
  const liveCount = hubFirms.filter(firm => dealFor(firm.slug, deals)).length

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ruFaqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-promo-hub={latestCheck}>
          <div className="ru-eyebrow"><CalendarCheck size={14} aria-hidden="true" /> Выпуск: {MONTH_LABEL} · последняя проверка кодов {formatRuDate(latestCheck)}</div>
          <h1>Промокоды проп-фирм — {MONTH_LABEL}</h1>
          <p className="ru-lead">
            Большинство «промокодов» в выдаче — это коды без даты, которые давно не работают. Здесь их нет: каждый код
            стоит рядом с датой, когда мы сверили его условия на официальной странице фирмы. У каждой фирмы — отметка доступа из РФ: это страница для русскоязычных трейдеров в любой стране.
            У BrightFunded и Crypto Fund Trader России нет в их списках ограничений (на {ruNotListedDates(['bright-funded', 'crypto-fund-trader'])}). У Upscale статус для РФ неясен (на {ruAccessDate(RU_EXTRA_RUSSIA_BASIS.upscale.russiaSourceCapturedAt)}): Условия (15.05.2026) исключают резидентов стран под санкциями США/ЕС/Великобритании, а для вывода нужен KYC по паспорту.
          </p>
          <p className="ru-notice" data-russian-country-boundary="deals-not-access">
            <strong>Промокод — это не доступ.</strong> Код снижает цену, но не меняет правила фирмы о гражданстве, резидентстве и KYC: проверьте страну до оплаты.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="promo-hub">
            <strong>Партнёрское раскрытие.</strong> По ссылкам на этой странице Traders Fund Hub может получить комиссию.
            Скидку даёт только действующий механизм фирмы; партнёрская ссылка сама по себе цену не снижает.
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{hubFirms.filter(firm => russiaBasisDateFor(firm.slug)).length}</strong><span>фирмы без РФ в списке ограничений</span></div>
            <div className="ru-stat"><strong>{liveCount}</strong><span>кодов с проверкой не старше 30 дней</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kody">
        <div className="ru-shell">
          <h2>Рабочие промокоды на {MONTH_LABEL}</h2>
          <div className="ru-grid">
            {hubFirms.map((firm, index) => {
              const deal = dealFor(firm.slug, deals)
              const dealText = deal ? dealTextRu(deal) : null
              const checked = codeCheckDate(firm.slug, deal)
              const from = `ru-promokody-prop-firm-card-${index + 1}`
              return (
                <article className="ru-card" key={firm.slug} id={firm.anchor} data-russian-promo-firm={firm.slug} data-russian-promo-status={deal ? 'verified' : 'pending'}>
                  <div className="ru-card-head">
                    <h3><BadgePercent size={18} aria-hidden="true" /> {firm.name}</h3>
                    {/* access badge rendered next to the CTA by RuGoLink (PR #6) */}
                  </div>
                  <p className="ru-muted">{firm.russiaNote}</p>
                  {deal ? (
                    <div id={firm.dealAnchor}>
                      {deal.code ? <CopyableCodePill code={deal.code} pct={deal.pctIsUpTo ? undefined : deal.pct} locale="ru" analyticsFirm={firm.slug} /> : <p><strong>Скидка применяется по ссылке, код вводить не нужно.</strong></p>}
                      {dealText
                        ? <p><strong>{dealText.amount}</strong> · {dealText.scope}</p>
                        : <p>Условия кода — на официальной странице фирмы по ссылке ниже.</p>}
                      <p className="ru-source-line">
                        Проверено {formatRuDate(deal.verifiedOn)}{deal.expiresOn ? ` · действует до ${formatRuDate(deal.expiresOn)}` : ''} ·{' '}
                        <a href={deal.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{dealText?.sourceLabel ?? 'официальная страница фирмы'}</a>
                      </p>
                      {dealText ? <p className="ru-muted">{dealText.note}</p> : null}
                    </div>
                  ) : (
                    <div className="ru-notice" data-russian-promo-placeholder={firm.slug}>
                      <strong>Код ожидается.</strong> {checked ? `На ${formatRuDate(checked)}` : 'Сейчас'} проверенного кода {firm.name} нет. Код появится
                      здесь с датой проверки, когда мы сверим его условия на официальной странице фирмы.
                    </div>
                  )}
                  <div className="ru-actions">
                    {firm.review ? <Link href={firm.review} className="btn-outline">Обзор</Link> : null}
                    {firm.external ? (
                      // TODO: заменить на /go/upscale после проверки партнёрской программы Upscale
                      <>
                      <a href={firm.external} target="_blank" rel="nofollow noopener noreferrer" className="btn-primary">
                        Перейти в {firm.name} <ArrowRight size={14} aria-hidden="true" />
                      </a>
                      {' '}
                      <RuAccessBadgeView firm={firm.slug} status={RU_EXTRA_RUSSIA_BASIS.upscale.russiaStatus} hint={false} />
                      </>
                    ) : (
                      <RuGoLink firm={firm.slug} href={`/go/${firm.slug}?from=${from}`} rel={goLinkRel(firm.slug)} className={firm.slug === 'fundednext' ? 'btn-outline' : 'btn-primary'}>
                        Перейти в {firm.name} <ArrowRight size={14} aria-hidden="true" />
                      </RuGoLink>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {brightDeals.length > 0 && <section className="ru-section" id="bright-funded-promokody">
        <div className="ru-shell ru-content" data-russian-deals-featured-partner="bright-funded" data-russian-deals-bright="current-product-codes" data-russian-deals-bright-price-rows={brightRows.length}>
          <h2>Промокоды BrightFunded</h2>
          <p>
            {brightDeals.map(deal => deal.code ?? 'скидка по ссылке').join(', ')} · проверено {formatRuDate(brightDeals.map(deal => deal.verifiedOn).sort().at(-1))} на официальной странице фирмы.
            Код относится к челленджам (CFD): России нет в их списке ограничений (на {ruNotListedDates(['bright-funded'])}){BF_FUTURES_RU_RESTRICTED ? ', а BrightFunded Futures Россию ограничивает' : ''}.
          </p>
          {brightDeals.filter(deal => deal.code).map(deal => (
            <CopyableCodePill key={deal.code} code={deal.code as string} pct={deal.pctIsUpTo ? undefined : deal.pct} locale="ru" analyticsFirm={deal.firmSlug} analyticsPlacement={campaignFor(deal)} analyticsOfferType="public_checkout" />
          ))}
          {brightRows.length > 0 && brightDealPct ? (
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Цены BrightFunded с кодом">
              <table className="ru-table">
                <thead><tr><th>Программа</th><th>Счёт</th><th>Цена, EUR</th><th>С кодом (расчёт), EUR</th></tr></thead>
                <tbody>
                  {brightRows.map(row => (
                    <tr key={`${row.product}-${row.size}`}><td>{row.product}</td><td>{sizeLabel(row.size)}</td><td>{money(row.price, 'EUR')}</td><td>{money(withDiscount(row.price, brightDealPct), 'EUR')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href={`/go/bright-funded?from=${campaignFor(brightDeals[0])}`} rel={goLinkRel('bright-funded')} className="btn-primary">
              Перейти в BrightFunded <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
          </div>
        </div>
      </section>}

      {fundingPipsDeal && <section className="ru-section" id="fundingpips-promokod">
        <div className="ru-shell ru-content" data-russian-deals-secondary="fundingpips">
          <h2>Промокод FundingPips {fundingPipsDeal.code}</h2>
          <p>
            <RuAccessBadgeView firm="fundingpips" status="unclear" hint={false} />{' '}
            Код {fundingPipsDeal.code} даёт {fundingPipsDeal.pct}% скидки{fundingPipsText ? `: ${fundingPipsText.scope}` : ''}. Проверено {formatRuDate(fundingPipsDeal.verifiedOn)}, источник:{' '}
            <a href={fundingPipsDeal.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{fundingPipsText?.sourceLabel ?? 'официальная страница FundingPips'}</a>.
            {fundingPipsText ? ` ${fundingPipsText.note}` : ''} Доступ для резидентов России у FundingPips не ясен (проверено {formatRuDate(FP_ACCESS_CHECKED)}).
          </p>
          <CopyableCodePill code={fundingPipsDeal.code as string} pct={fundingPipsDeal.pctIsUpTo ? undefined : fundingPipsDeal.pct} locale="ru" analyticsFirm={fundingPipsDeal.firmSlug} analyticsPlacement={campaignFor(fundingPipsDeal)} analyticsOfferType="public_checkout" />
          {fundingPipsRows.length > 0 && fundingPipsPct ? (
            <>
              <div className="ru-table-wrap" tabIndex={0} role="region" aria-label={`Цены FundingPips с кодом ${fundingPipsDeal.code}`}>
                <table className="ru-table" data-russian-deals-discount-table="currency-preserved">
                  <caption className="sr-only">Цены FundingPips в USD до и после кода {fundingPipsDeal.code}</caption>
                  <thead><tr><th>Программа</th><th>Счёт</th><th>Цена, USD</th><th>С кодом {fundingPipsDeal.code} (расчёт), USD</th></tr></thead>
                  <tbody>
                    {fundingPipsRows.map(row => (
                      <tr key={`${row.product}-${row.size}`}><td>{row.product}</td><td>{sizeLabel(row.size)}</td><td>{money(row.price, 'USD')}</td><td>{money(withDiscount(row.price, fundingPipsPct), 'USD')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ru-source-line">
                Цены — из наших данных о программах FundingPips (по данным на {fundingPipsCaptures.map(date => formatRuDate(date)).join(', ')}), валюта USD как у фирмы.
                Колонка «с кодом» — наш расчёт: цена минус {fundingPipsPct}%. {fundingPipsText?.excludedSizeUsd ? `Счета ${sizeLabel(fundingPipsText.excludedSizeUsd)} в таблице нет: код на них не действует. ` : ''}Итоговую сумму сверяйте на странице оплаты.
              </p>
            </>
          ) : null}
          <div className="ru-actions">
            <Link href="/ru/obzor-fundingpips" className="btn-outline">Обзор FundingPips</Link>
            <RuGoLink firm="fundingpips" href={`/go/fundingpips?from=${campaignFor(fundingPipsDeal)}`} rel={goLinkRel('fundingpips')} className="btn-outline">
              Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
          </div>
        </div>
      </section>}

      <section className="ru-section" id="proverka-kodov">
        <div className="ru-shell ru-content" data-russian-deals-expiry="thirty-day-fail-closed">
          <h2>Журнал проверки кодов</h2>
          <p>
            Коды сверяются по официальным страницам фирм; оплату мы не проводим. Код с проверкой старше 30 дней или с прошедшей датой окончания
            со страницы исчезает автоматически, пока мы не проверим его снова.
          </p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Журнал проверки кодов по фирмам">
            <table className="ru-table">
              <thead><tr><th>Фирма</th><th>Проверено</th><th>Результат</th></tr></thead>
              <tbody>
                {checkLog.map(({ firm, deal, checked }) => (
                  <tr key={firm.slug}>
                    <td>{firm.name}</td>
                    <td>{checked ? formatRuDate(checked) : '—'}</td>
                    <td>{deal?.code ? `код ${deal.code} на странице` : deal ? 'скидка по ссылке на странице' : 'проверенного кода нет'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kak-primenit">
        <div className="ru-shell ru-content">
          <h2>Как применить промокод</h2>
          <ol>
            <li><strong>Выберите продукт до кода.</strong> Резидентам России FundedNext недоступна (подвал сайта; Futures тоже ограничивает Россию, по данным на 20.10.2026); для других стран у FundedNext берите нужный CFD-челлендж. У BrightFunded код и список стран относятся к конкретному продукту: челленджи (CFD) и BrightFunded Futures проверяются отдельно.</li>
            <li><strong>Введите код на странице оплаты</strong> в поле купона — или перейдите по ссылке, если скидка применяется автоматически (это указано в карточке).</li>
            <li><strong>Сверьте итоговую сумму до оплаты.</strong> Если цена не изменилась, код не сработал — не платите в расчёте на скидку.</li>
            <li><strong>Выбирайте способ оплаты, не зависящий от карты.</strong> У Crypto Fund Trader в официальном списке есть криптовалюта; Upscale тоже принимает криптовалюту, но статус для РФ у неё неясен, а для вывода нужен KYC по паспорту. Работают ли карты, выпущенные в России, фирмы официально не сообщают.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="summirovanie">
        <div className="ru-shell ru-content">
          <h2>Какие коды суммируются</h2>
          <p>
            Данных о совместимости кодов на {formatRuDate(latestCheck)} нет: мы не проверяли сложение кода с сезонной распродажей ни у одной
            из {hubFirms.length} фирм этой страницы. Таблица появится здесь, когда такая проверка будет.
          </p>
        </div>
      </section>

      <section className="ru-section" id="ftmo">
        <div className="ru-shell ru-content">
          <h2><ShieldAlert size={20} aria-hidden="true" /> Промокод FTMO: почему его здесь нет</h2>
          <p>
            <span className="ru-badge ru-badge--closed">Недоступно для РФ · проверено {formatRuDate(FTMO_CHECKED)}</span>{' '}
            Россия, Беларусь и Казахстан — в официальном списке стран, где FTMO не оказывает услуги. Скидка на челлендж
            ничего не даст: до профинансированного этапа FTMO проверяет личность. Подробнее — в разборе{' '}
            <Link href="/ru/ftmo-dlya-rossiyan">«FTMO для россиян»</Link>, полная таблица — на странице{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">«Проп-фирмы для россиян в 2026»</Link>.
          </p>
          <div className="ru-notice" data-russian-risk-disclaimer="promo-hub">
            <strong>Риск.</strong> Скидка снижает цену попытки, но не шанс её пройти. Торговля с плечом связана с высоким
            риском; оплата за челлендж не возвращается.
          </div>
        </div>
      </section>

      <RuAllReviews marker="promokody" />

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
