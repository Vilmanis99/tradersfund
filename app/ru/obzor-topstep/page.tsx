import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, Globe2, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RuPendingLink from '@/components/RuPendingLink'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import Breadcrumbs from '@/components/Breadcrumbs'
import {
  challengeTierEconomics,
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, RUSSIAN_ROUTE_EDITORIAL_DATES, russianRouteDateModified } from '@/lib/localizedRoutes'
import topstepRecheck from '@/content/data/challenges/_captures/topstep-2026-10-20.json'
import topstepGaps from '@/content/data/challenges/_captures/topstep-ru-gaps-2026-10-20.json'

const PATH = '/ru/obzor-topstep'
const TITLE = 'Topstep: обзор 2026 — фьючерсный проп и доступ из России'
const H1 = 'Topstep: обзор и отзывы 2026'

// Every fact below that is not read from firms.json or challenges/topstep.json
// comes from Prop Firm Tracker's 2026-10-20 captures: the core recheck
// (topstep-2026-10-20.json) and the RU gap capture (topstep-ru-gaps-2026-10-20.json:
// eligibility, payout methods, entity, TopstepX, automation, news, taxes, minimum days).
const RECHECK_DATE = topstepRecheck.capturedAt
const GAPS_DATE = topstepGaps.capturedAt
const ACCESS_SOURCE = {
  url: topstepGaps.eligibility.sourceUrl,
  capturedAt: topstepGaps.capturedAt,
  pageDated: topstepGaps.eligibility.dateModified.slice(0, 10),
  quote: 'Citizens of these countries can\'t trade or receive payouts: … Belarus … Russia … Ukraine … Crimea (incl. Donetsk, Luhansk, Kherson, Zaporizhzhia)',
}
const PRICING_URL = 'https://help.topstep.com/en/articles/14289835-topstep-pricing-and-payment-questions'
const MLL_URL = 'https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit'
const PARAMETERS_URL = 'https://help.topstep.com/en/articles/8284197-trading-combine-parameters'
const CONSISTENCY_URL = 'https://help.topstep.com/en/articles/8284208-consistency-at-topstep'
const PAYOUT_URL = 'https://help.topstep.com/en/articles/8284233-topstep-payout-policy'
const HOURS_URL = 'https://help.topstep.com/en/articles/8284206-when-and-what-products-can-i-trade'
const PROHIBITED_URL = 'https://help.topstep.com/en/articles/10305426-prohibited-trading-strategies-at-topstep'
const TOPSTEPX_URL = 'https://help.topstep.com/en/articles/14434175-topstepx'
const QUANTOWER_URL = 'https://help.topstep.com/en/articles/8284179-quantower-connection-instructions'
const PROP_URL = 'https://www.topstep.com/topstep-prop'
const TERMS_URL = 'https://www.topstep.com/terms-of-use'
const API_URL = 'https://help.topstep.com/en/articles/11187768-topstepx-api-access'
const NEWS_URL = 'https://help.topstep.com/en/articles/13613539-risk-adjustments-high-risk-high-volatility'
// Prop Firm Tracker delta check 23.10.2026 (11:07–11:08 Riga), evidence:
// /workspace/tradersfundhub/evidence/topstep-delta-2026-10-23/README.md (+ raw/, txt-new/).
// Eligibility, payout policy 8284233, prices 14289835 and Terms were unchanged vs 20.10;
// 13613539 changed 21.10 (Live < $3,000: 1 contract on Tier 1 news), 14434175 changed 22.10 (login).
const DELTA_CHECKED = '2026-10-23'
const NEWS_CHANGED = '2026-10-21'
const TOPSTEPX_CHANGED = '2026-10-22'

const CIS_COUNTRIES: Array<[string, string]> = [
  ['Russia', 'Россия'],
  ['Belarus', 'Беларусь'],
  ['Ukraine', 'Украина'],
  ['Crimea', 'Крым'],
  ['Kazakhstan', 'Казахстан'],
  ['Uzbekistan', 'Узбекистан'],
  ['Kyrgyzstan', 'Кыргызстан'],
  ['Armenia', 'Армения'],
  ['Georgia', 'Грузия'],
  ['Azerbaijan', 'Азербайджан'],
  ['Moldova', 'Молдова'],
]

function ruDate(iso: string | null | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'дата не указана'
  return iso.split('-').reverse().join('.')
}

function usd(value: number | null | undefined) {
  return value == null ? '—' : `$${Math.round(value).toLocaleString('en-US')}`
}

function sizeLabel(sizeUsd: number) {
  return `${sizeUsd / 1000}K`
}

function ruNumber(value: number) {
  return value.toLocaleString('ru-RU')
}

function topstepFirm() {
  const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === 'topstep')
  if (!firm) throw new Error('Topstep is missing from firms.json')
  return firm
}

const DESCRIPTION = 'Topstep: обзор фьючерсного пропа. Trading Combine, цены подписки, трейлинг-просадка, сплит 90% и правила. Россия в списке ограничений — есть альтернативы.'
// Used only if firms.json stops supporting the two data claims in DESCRIPTION
// (profitSplitPct 90, Russia restricted); keeps the snippet true at build time.
const DESCRIPTION_NEUTRAL = 'Topstep: обзор фьючерсного пропа. Trading Combine, цены подписки, трейлинг-просадка, выплаты и правила. Доступ из России проверьте до оплаты подписки.'

function searchDescription() {
  const firm = topstepFirm()
  const holds = firm.profitSplitPct === 90
    && Boolean(firm.countriesRestricted?.includes('Russia'))
    && russiaStatusFor('topstep') === 'restricted'
  return holds ? DESCRIPTION : DESCRIPTION_NEUTRAL
}

const SEARCH_DESCRIPTION = searchDescription()

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: SEARCH_DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: SEARCH_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: SEARCH_DESCRIPTION },
}

export default function RussianTopstepReviewPage() {
  const firms = getAllFirms()
  const firm = topstepFirm()
  const products = getChallengesByFirm('topstep')
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const allFresh = products.length > 0 && freshProducts.length === products.length
  const standard = freshProducts.find(product => product.productSlug === 'trading-combine-standard-path')
  const noActivation = freshProducts.find(product => product.productSlug === 'trading-combine-no-activation-fee-path')
  const reference = standard ?? noActivation
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? RECHECK_DATE
  const dateModified = russianRouteDateModified(PATH, latestCapture)
  const recheckFresh = isChallengeFresh({ sourceCapturedAt: RECHECK_DATE })
  const accessFresh = isChallengeFresh({ sourceCapturedAt: ACCESS_SOURCE.capturedAt })
  const trustpilotFresh = firm.trustpilotScore != null && firm.trustpilotCount != null
    && isChallengeFresh({ sourceCapturedAt: firm.trustpilotCapturedAt ?? '' })
  const status = russiaStatusFor('topstep')
  const restricted = firm.countriesRestricted ?? []
  const cisListed = CIS_COUNTRIES.filter(([en]) => restricted.includes(en))
  const cisNotListed = CIS_COUNTRIES.filter(([en]) => !restricted.includes(en))
  const kazakhstanListed = restricted.includes('Kazakhstan')
  const kazakhstanNamed = kazakhstanListed || topstepGaps.eligibility.kazakhstanNamed
  const germanyXfaOnly = topstepGaps.eligibility.xfaOnly.includes('Germany')
  const split = firm.profitSplitPct
  const consistency = reference?.consistencyRulePct ?? null
  const target = reference?.profitTargets?.phase1 ?? null
  const mllTiers = (reference?.accountSizes ?? []).map(tier => ({ size: tier.sizeUsd, mll: tier.maxLossUsd ?? null }))
  const mllLine = mllTiers.length ? mllTiers.map(tier => usd(tier.mll)).join(' / ') : 'не подтверждён'
  const sizesLine = mllTiers.length ? mllTiers.map(tier => sizeLabel(tier.size)).join(' / ') : '—'
  const targetDollars = mllTiers.length && target != null ? mllTiers.map(tier => usd(tier.size * target / 100)).join(' / ') : '—'
  const priceLine = (product: Challenge | undefined) => product
    ? product.accountSizes.map(tier => usd(tier.priceUsd)).join(' / ')
    : 'требует повторной проверки'
  const activationFee = standard?.activationFeeUsd ?? null
  const payoutDate = firm.payoutMethodsCapturedAt ?? GAPS_DATE
  const platforms = firm.platforms ?? []
  const futuresFirms = firms
    .filter(candidate => candidate.assets?.includes('Futures'))
    .map(candidate => ({ name: candidate.name, slug: outboundSlug(candidate.name), status: russiaStatusFor(candidate.name) }))
  const openFutures = futuresFirms.filter(candidate => candidate.status === 'available')
  const unverifiedFutures = futuresFirms.filter(candidate => candidate.status === 'unverified' || candidate.status === 'unclear')
  const alternatives = ['bright-funded', 'crypto-fund-trader'].flatMap(slug => {
    const alternative = firms.find(candidate => outboundSlug(candidate.name) === slug)
    if (!alternative) return []
    const altProducts = getChallengesByFirm(slug).filter(product => isChallengeFresh(product))
    return [{ slug, firm: alternative, products: altProducts, partner: Boolean(alternative.affiliateUrl) }]
  })
  const partnerNames = alternatives.filter(item => item.partner).map(item => item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name)
  const nonPartnerNames = alternatives.filter(item => !item.partner).map(item => item.firm.name)
  const isRestricted = status === 'restricted' && restricted.includes('Russia')
  const breakEvenMonths = standard && noActivation
    ? standard.accountSizes.flatMap(tier => {
      const other = noActivation.accountSizes.find(candidate => candidate.sizeUsd === tier.sizeUsd)
      if (!other || tier.priceUsd == null || other.priceUsd == null || other.priceUsd <= tier.priceUsd || !standard.activationFeeUsd) return []
      return [{ size: tier.sizeUsd, months: standard.activationFeeUsd / (other.priceUsd - tier.priceUsd) }]
    })
    : []

  const sourcePages = [
    ...topstepRecheck.pagesRead.map(page => ({ url: page.url, date: RECHECK_DATE })),
    { url: ACCESS_SOURCE.url, date: ACCESS_SOURCE.capturedAt },
    ...topstepGaps.pagesRead.map(page => ({ url: page.url, date: GAPS_DATE })),
    { url: NEWS_URL, date: DELTA_CHECKED },
    { url: TOPSTEPX_URL, date: DELTA_CHECKED },
  ].reduce<Array<{ url: string; date: string }>>((list, page) => {
    const existing = list.find(item => item.url === page.url)
    if (!existing) list.push(page)
    else if (page.date > existing.date) existing.date = page.date
    return list
  }, [])

  const faqs: RussianFaqItem[] = [
    {
      q: 'Можно ли пройти Topstep из России?',
      a: isRestricted ? `Нет. Россия есть в списке стран, гражданам и жителям которых Topstep не даёт торговать и получать выплаты (по данным на ${ruDate(ACCESS_SOURCE.capturedAt)}); там же Беларусь, Украина и Крым. Topstep смотрит и на гражданство, и на постоянное место жительства. Торговать нельзя и во время поездки в страну из списка: Topstep пишет «не торгуйте, пока вы там». VPN, чужой адрес или неверные данные в KYC ведут к проверке и закрытию счёта, а не к допуску.` : 'Статус России в наших данных изменился; сверьте актуальный список стран Topstep до оплаты.',
    },
    {
      q: 'Сколько стоит Trading Combine?',
      a: `Это ежемесячная подписка, а не разовый взнос. Путь Standard стоит ${priceLine(standard)} в месяц за счета ${sizesLine} плюс разовая активация ${usd(activationFee)} за каждый полученный Express Funded Account. Путь No Activation Fee стоит ${priceLine(noActivation)} в месяц без активации. Путь нельзя сменить после покупки (по данным на ${ruDate(latestCapture)}). Это базовые цены без налогов: НДС, GST или sales tax Topstep добавляет при оформлении в зависимости от страны; суммы для стран СНГ и ЕС мы не видели (по данным на ${ruDate(GAPS_DATE)}).`,
    },
    {
      q: 'Что такое Maximum Loss Limit в Topstep?',
      a: `Это единственное жёсткое правило Trading Combine: ${mllLine} для счетов ${sizesLine}. Лимит подтягивается вверх по балансу на конец дня, никогда не опускается и фиксируется на стартовом балансе. Касание лимита в течение дня, в том числе по незакрытой позиции, — это нарушение.`,
    },
    {
      q: 'Какой сплит и как выводить прибыль?',
      a: `Трейдер получает ${split ?? '—'}% прибыли, заявку можно подать по требованию в часы работы биржи CME после выполнения условий выплаты. Способы выплаты: Prop-to-Brokerage и Aeropay — только США; Wise — только Китай, Канада и Великобритания; ACH — банки США, $30; Wire/SWIFT — международный перевод, 5–10 рабочих дней, $30. Минимальная заявка — $125. Пример Topstep: заявка $500 через ACH − $50 (10%) − $30 = $420 на руки. Криптовалюты и Rise в списке нет, выплата идёт только на счёт на ваше имя (по данным на ${ruDate(payoutDate)}).`,
    },
    {
      q: 'Есть ли у Topstep правило консистентности?',
      a: `Да. В Trading Combine лучший день не должен превышать ${consistency ?? '—'}% цели по прибыли, иначе цель растёт. На Express Funded Account маршрут XFA Consistency требует не меньше 3 торговых дней хотя бы с одной сделкой в каждый, а лучший день — не больше 40% общей чистой прибыли; за раз можно вывести до 50% баланса, но не больше $3,000 / $4,000 / $6,000 для счетов 50K / 100K / 150K, минимум $125 (по данным на ${ruDate(GAPS_DATE)}).`,
    },
    {
      q: 'Чем заменить Topstep трейдеру из РФ?',
      a: (openFutures.length === 0 ? 'В наших данных нет фьючерсной проп-фирмы, открытой для резидентов России. ' : `Из фьючерсных фирм открытыми для РФ в наших данных отмечены: ${openFutures.map(item => item.name).join(', ')}. `) + 'Ближайшие варианты — BrightFunded и Crypto Fund Trader, но это CFD- и крипто-программы, а не биржевые фьючерсы CME. Правила просадки, инструменты и выплаты у них другие, поэтому сравнивайте условия заново, а не переносите опыт Topstep.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Topstep' },
  ])
  const faqSchemaReady = allFresh && recheckFresh && accessFresh
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: SEARCH_DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: RUSSIAN_ROUTE_EDITORIAL_DATES[PATH],
    dateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
    about: { '@type': 'Organization', name: 'Topstep', url: firm.officialUrl },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {faqSchemaReady && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-topstep-review="restricted-info-only">
          <RussianDataFreshnessNotice firmSlugs={['topstep']} />
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Условия Topstep проверены {ruDate(latestCapture)}</div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Topstep — проп-фирма для торговли фьючерсами на биржах CME, COMEX, NYMEX и CBOT. Вы платите ежемесячную подписку,
            проходите одну оценку Trading Combine и получаете симулированный Express Funded Account с долей прибыли {split ?? '—'}%.
            {isRestricted
              ? 'Главное для читателя из России — в первом блоке: резидентов РФ Topstep не принимает.'
              : 'Доступ из России проверьте в первом блоке до чтения остальных условий.'}
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>пути оплаты с проверенными ценами</span></div>
            <div className="ru-stat"><strong>{target != null ? `${target}%` : '—'}</strong><span>цель в одной фазе</span></div>
            <div className="ru-stat"><strong>{split != null ? `${split}%` : '—'}</strong><span>доля трейдера</span></div>
            <div className="ru-stat"><strong>{firm.affiliateUrl ? 'да' : 'нет'}</strong><span>партнёрская связь с Topstep</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-topstep-article="long-form-source-first">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Topstep">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#dostup-iz-rossii">Доступ из России и СНГ</a></li>
                <li><a href="#vyvod">Наш вывод</a></li>
                <li><a href="#kak-rabotaet">Trading Combine → XFA → Live</a></li>
                <li><a href="#ceny">Цены подписки</a></li>
                <li><a href="#pravila">Maximum Loss Limit и консистентность</a></li>
                <li><a href="#vyplaty">Выплаты и сплит {split ?? '—'}%</a></li>
                <li><a href="#platformy">TopstepX и Quantower</a></li>
                <li><a href="#ogranicheniya">Новости, ночь, советники</a></li>
                <li><a href="#otzyvy">Отзывы о Topstep</a></li>
                <li><a href="#alternativy">Альтернативы для РФ</a></li>
                <li><a href="#plusy-minusy">Плюсы и минусы</a></li>
                <li><a href="#istochniki">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="dostup-iz-rossii" data-russian-country-boundary="topstep-russia-restricted" data-russian-access-answer="first-screen">
            <h2>{isRestricted ? 'Коротко: Topstep закрыт для резидентов РФ, Беларуси и Украины' : 'Коротко: доступ к Topstep из России'}</h2>
            <div className="ru-notice" data-russian-topstep-access={status}>
              <strong>Статус для России: <RuAccessBadge firm="topstep" /></strong>{' '}
              В официальном списке стран, где Topstep не даёт торговать и получать выплаты, названы{' '}
              {cisListed.map(([, ru]) => ru).join(', ') || 'страны не указаны'} (по данным на {ruDate(ACCESS_SOURCE.capturedAt)}).
              VPN, чужой адрес или неверные данные в KYC не превращают запрет в допуск: это нарушение правил, после которого счёт
              проверяет команда Trust.
            </div>
            <p>
              Topstep оценивает допуск по двум признакам сразу — гражданству и постоянному месту жительства. Если вы живёте в стране
              из списка ограничений, торговать нельзя при любом паспорте. Если у вас гражданство страны из списка, но вы постоянно живёте
              в разрешённой стране, Topstep пишет «возможно»: нужно отправить документ о постоянном проживании и банковскую выписку из
              этой страны, решение принимает команда Trust. Это рассмотрение, а не гарантия. Торговать нельзя и во время поездки
              в страну из списка: Topstep пишет «не торгуйте, пока вы там», а сделка оттуда, даже разовая, может запустить проверку команды Trust.
            </p>
            <p>
              {kazakhstanListed
                ? 'Казахстан в нашем списке ограничений Topstep есть.'
                : kazakhstanNamed
                  ? 'Казахстан упомянут на странице допуска Topstep — сверьте, в каком списке.'
                  : 'Казахстан на странице допуска Topstep не назван ни в одном списке — ни среди запрещённых, ни среди стран «только XFA». Это не значит, что Казахстан открыт: допуск оттуда мы не подтверждаем.'}{' '}
              Среди запрещённых не названы также: {cisNotListed.filter(([en]) => en !== 'Kazakhstan').map(([, ru]) => ru).join(', ')}.
              Отсутствие страны в списке — ещё не подтверждение допуска: Topstep предупреждает, что список может меняться в любой момент.
              {germanyXfaOnly
                ? ' Отдельно есть страны, где доступен только Express Funded Account без перехода на Live-счёт; среди них Германия.'
                : ' Отдельно есть страны, где доступен только Express Funded Account без перехода на Live-счёт.'}{' '}
              Если вы живёте в стране, которую Topstep допускает, обзор ниже применим — но страну, документы и способ выплаты нужно
              сверить с Topstep до оплаты. Общий разбор — в гиде{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для русскоязычных трейдеров</Link>.
            </p>
            <p className="ru-source-line">
              Источник: <a href={ACCESS_SOURCE.url} target="_blank" rel="noopener noreferrer">Am I Eligible to Trade with Topstep?</a>{' '}
              (страница от {ruDate(ACCESS_SOURCE.pageDated)}; проверка Prop Firm Tracker по данным на {ruDate(ACCESS_SOURCE.capturedAt)}).
              {!accessFresh && ' Проверка старше 30 дней: перед оплатой откройте список заново.'}
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="vyvod" data-russian-topstep-verdict="futures-day-trading">
            <h2>Наш вывод</h2>
            <p>
              Topstep — понятный выбор для дневного трейдера фьючерсами, который живёт в разрешённой стране. Правило по сути одно:
              Maximum Loss Limit в долларах ({mllLine}), который подтягивается по балансу на конец дня. Дневного лимита в Combine нет,
              формального минимума дней тоже нет (на практике — два торговых дня), а прибыль делится {split ?? '—'}/{split != null ? 100 - split : '—'}. Цена — подписка, поэтому медленное
              прохождение стоит дороже: каждый месяц списывается заново, пока вы не пройдёте оценку или не отмените подписку.
            </p>
            <p>
              Слабые места тоже конкретные. Все позиции нужно закрыть до 15:10 по Чикаго, переносить сделки через ночь и выходные
              нельзя, а консистентность {consistency ?? '—'}% мешает пройти оценку одним удачным днём. Вне США, Китая, Канады и Великобритании
              единственный способ выплаты — Wire/SWIFT с комиссией $30. Для резидента России вывод проще: Topstep {isRestricted ? 'недоступен' : 'требует отдельной проверки страны'}, а фьючерсной
              замены, открытой для РФ, в наших данных {openFutures.length === 0 ? 'нет' : `немного: ${openFutures.map(item => item.name).join(', ')}`}. Если вы готовы перейти на CFD или криптовалюту, смотрите{' '}
              <a href="#alternativy">альтернативы</a> — сначала BrightFunded, затем Crypto Fund Trader.
            </p>
            <div className="ru-actions">
              <Link href="#alternativy" className="btn-primary">Альтернативы для трейдеров из РФ <ArrowRight size={14} aria-hidden="true" /></Link>
              <RuGoLink firm="topstep" href="/go/topstep?from=ru-review-topstep" rel={goLinkRel('topstep')} className="btn-outline">
                Для резидентов других стран: сайт Topstep <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </div>
            <p className="ru-source-line">Ссылка на Topstep не партнёрская: Traders Fund Hub не получает комиссию за этот переход.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="kak-rabotaet" data-russian-topstep-path="combine-xfa-live">
            <h2>Как работает Topstep: Trading Combine → Express Funded Account (XFA) → Live</h2>
            <p>
              Topstep (по-русски иногда пишут «Топстеп») с {firm.founded ?? '—'} года продаёт доступ к оценке на симулированном счёте.
              Это проп трейдинг фьючерсы: торгуются биржевые контракты, а не CFD.
              Если вы ещё не знаете, как устроены такие проверки, начните с гида{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работают челленджи</Link>. У Topstep путь из трёх ступеней:
            </p>
            <ol>
              <li>
                <strong>Trading Combine</strong> — одна фаза оценки. Цель — {target ?? '—'}% от размера счёта: {targetDollars} на счетах {sizesLine}.
                Процент — наш пересчёт: Topstep публикует цель в долларах.
              </li>
              <li>
                <strong>Express Funded Account (XFA)</strong> — симулированный финансируемый счёт после прохождения. Баланс XFA стартует
                с нуля, выплаты идут из прибыли на этом счёте.
              </li>
              <li>
                <strong>Live Funded Account</strong> — отдельная ступень, на которую Topstep переводит часть трейдеров по своему решению.
                По данным самой Topstep за 2025 год, на Live позвали 0,71% трейдеров XFA.
              </li>
            </ol>
            <p data-russian-topstep-entity="topsteptrader-llc">
              Trading Combine и XFA ведёт компания TopstepTrader, LLC — дочерняя компания Topstep LLC из Чикаго (по{' '}
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">условиям использования</a> и подвалу сайта Topstep, по данным на {ruDate(GAPS_DATE)}).
              Размер — до $150,000 на один счёт, одновременно можно держать до 5 активных XFA.
            </p>
            <p>
              Та же статистика Topstep за 2025 год: успешно завершено 16,8% начатых Trading Combine, хотя бы раз дошли до следующего этапа
              51,8% участников, выплату получили 33,3% трейдеров с финансированием. Это данные фирмы по прошлым когортам, а не наш
              прогноз и не независимый аудит. Для сравнения моделей в целом есть гиды{' '}
              <RuPendingLink href="/ru/prop-trejding">что такое проп-трейдинг</RuPendingLink> и{' '}
              <RuPendingLink href="/ru/funded-account">funded account</RuPendingLink>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="ceny" data-russian-topstep-price-count={freshProducts.reduce((total, product) => total + product.accountSizes.length, 0)}>
            <h2>Цены: подписка Standard и No Activation Fee</h2>
            <p>
              Trading Combine продаётся как ежемесячная подписка. Она продлевается, пока вы не пройдёте оценку или не отмените её.
              Путь выбирается при покупке и потом не меняется. Цены в USD, по данным на {ruDate(latestCapture)}:
            </p>
            {freshProducts.length > 0 ? (
              <div className="ru-table-wrap">
                <table className="ru-table">
                  <thead>
                    <tr><th>Счёт</th><th>Standard, в месяц</th><th>No Activation Fee, в месяц</th><th>Maximum Loss Limit</th></tr>
                  </thead>
                  <tbody>
                    {(reference?.accountSizes ?? []).map(tier => (
                      <tr key={tier.sizeUsd}>
                        <td>{sizeLabel(tier.sizeUsd)}</td>
                        <td>{usd(standard?.accountSizes.find(item => item.sizeUsd === tier.sizeUsd)?.priceUsd)}</td>
                        <td>{usd(noActivation?.accountSizes.find(item => item.sizeUsd === tier.sizeUsd)?.priceUsd)}</td>
                        <td>{usd(tier.maxLossUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ru-notice">Цены Topstep проверялись больше 30 дней назад и скрыты до повторной проверки.</p>
            )}
            <p data-russian-topstep-tax="checkout">
              Это базовые цены без налогов. В зависимости от страны Topstep добавляет НДС, GST или sales tax и показывает сумму при
              оформлении заказа. Суммы для стран СНГ и ЕС мы не видели: проверка шла без оформления заказа (по данным на {ruDate(GAPS_DATE)}).
            </p>
            <p>
              На пути Standard после прохождения нужно заплатить активацию {usd(activationFee)} — один раз за каждый полученный XFA.
              На пути No Activation Fee активации нет, но месячная цена выше. Topstep также даёт скидку на No Activation Fee
              ($10 / $20 / $30 в месяц), если при покупке включить необязательный дневной лимит убытка; это условная скидка, не базовая цена.
            </p>
            <h3>Сколько стоит дойти до XFA</h3>
            <p>
              Минимальный расход — если пройти оценку в первый месяц: месячная цена плюс активация на Standard. Валовая прибыль для
              компенсации — этот расход, делённый на долю трейдера {split ?? '—'}%. Последний столбец показывает ту же сумму в долях
              Maximum Loss Limit: сколько «запаса» нужно заработать, чтобы просто вернуть затраты.
            </p>
            {freshProducts.map(product => (
              <div key={product.productSlug} data-russian-topstep-pricing-product={product.productSlug}>
                <h4>{product.productSlug === 'trading-combine-standard-path' ? 'Standard' : 'No Activation Fee'}</h4>
                <div className="ru-table-wrap">
                  <table className="ru-table">
                    <thead><tr><th>Счёт</th><th>Минимальный расход</th><th>Через 3 месяца подписки</th><th>Прибыль для компенсации</th><th>В долях MLL</th></tr></thead>
                    <tbody>
                      {product.accountSizes.map(tier => {
                        const economics = challengeTierEconomics(product, tier)
                        const threeMonths = tier.priceUsd != null ? tier.priceUsd * 3 + (product.activationFeeUsd ?? 0) : null
                        return (
                          <tr key={tier.sizeUsd}>
                            <td>{sizeLabel(tier.sizeUsd)}</td>
                            <td>{usd(economics?.minimumCost)}</td>
                            <td>{usd(threeMonths)}</td>
                            <td>{usd(economics?.breakEvenProfit)}</td>
                            <td>{economics?.rMultiple != null ? economics.rMultiple.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {breakEvenMonths.length > 0 && (
              <p data-russian-topstep-path-breakeven={breakEvenMonths.length}>
                Какой путь дешевле, зависит от того, сколько месяцев займёт оценка. No Activation Fee выгоднее, если пройти быстрее, чем за{' '}
                {breakEvenMonths.map(item => `${item.months.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} мес. на ${sizeLabel(item.size)}`).join(', ')};
                при более долгой оценке дешевле Standard. Это арифметика по базовым ценам без налогов и скидок.
              </p>
            )}
            <p>
              Сброс счёта стоит столько же, сколько месяц подписки на выбранном пути. Если XFA закрыт до первой выплаты, Topstep
              предлагает Back2Funded — повторную активацию за $599 / $699 / $829, не больше двух раз на один XFA, в течение 30 календарных
              дней после закрытия. <a href={PRICING_URL} target="_blank" rel="noopener noreferrer">Цены и оплата в справке Topstep</a>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="pravila" data-russian-topstep-risk="usd-mll-eod">
            <h2>Правила: Maximum Loss Limit {mllLine}, EOD-трейлинг</h2>
            <p>
              Topstep называет Trading Combine счётом «с одним правилом и двумя целями». Правило — Maximum Loss Limit (MLL): {mllLine}{' '}
              на счетах {sizesLine}. Цели — прибыль {target ?? '—'}% и консистентность.
            </p>
            <ul>
              <li>MLL поднимается вслед за балансом на конец торгового дня и никогда не опускается.</li>
              <li>Когда MLL доходит до стартового баланса, он фиксируется навсегда.</li>
              <li>Лимит контролируется и внутри дня, включая незакрытый результат: касание лимита — нарушение, счёт ликвидируется сразу.</li>
              <li>На XFA баланс стартует с нуля, а после первой выплаты MLL устанавливается на $0.</li>
            </ul>
            <h3>Почему у Topstep лимит в долларах, а не в процентах</h3>
            <p>
              Topstep публикует лимит фиксированной суммой для каждого размера счёта, и в процентах она не одинакова: {mllTiers
                .map(tier => tier.mll != null ? `${(tier.mll / tier.size * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% на ${sizeLabel(tier.size)}` : null)
                .filter(Boolean).join(', ')}. Поэтому в наших данных процент максимальной просадки намеренно не заполнен: единый процент
              исказил бы правило. Сравнивая Topstep с CFD-фирмами, переводите их проценты в доллары, а не наоборот.
            </p>
            <h3>Консистентность {consistency ?? '—'}% и дневной лимит</h3>
            <p>
              Лучший день в Trading Combine не может превышать {consistency ?? '—'}% цели по прибыли. Если превысил — цель растёт; округления
              и запаса нет. Обязательного дневного лимита убытка в Combine нет; необязательный лимит $1,000 / $2,000 / $3,000 можно включить
              сами, и тогда торговля останавливается до следующей сессии.{' '}
              <a href={CONSISTENCY_URL} target="_blank" rel="noopener noreferrer">Правило консистентности</a>.
            </p>
            <h3>Минимальный срок: формально нет, на практике два дня</h3>
            <p data-russian-topstep-min-days="two-day-practical">
              Обязательного минимума торговых дней у Topstep нет. Но из-за правила консистентности лучший день не может превышать
              {' '}{consistency ?? '—'}% прибыли, поэтому за один день оценку не пройти: справка и продуктовая страница одинаково пишут,
              что пройти можно «всего за два дня» (по данным на {ruDate(GAPS_DATE)}). <a href={PARAMETERS_URL} target="_blank" rel="noopener noreferrer">Параметры Trading Combine</a>{' · '}
              <a href={MLL_URL} target="_blank" rel="noopener noreferrer">Maximum Loss Limit</a>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="vyplaty" data-russian-topstep-payout="on-demand-usd-rails">
            <h2>Выплаты и сплит {split ?? '—'}%</h2>
            <p>
              Трейдер получает {split ?? '—'}% прибыли, Topstep — остальное. Заявку подают по требованию в часы работы CME, но только
              после выполнения условий одного из двух маршрутов XFA (по данным на {ruDate(RECHECK_DATE)}):
            </p>
            <ul>
              <li><strong>XFA Standard</strong> — 5 выигрышных торговых дней с прибылью от $150 и положительный результат с прошлой выплаты (для первой выплаты последнее не требуется).</li>
              <li><strong>XFA Consistency</strong> — не меньше 3 торговых дней хотя бы с одной сделкой в каждый, лучший день — не больше 40% общей чистой прибыли.</li>
            </ul>
            <p>Маршрут выбирают при активации XFA.</p>
            <p>
              Минимальная заявка — $125, максимальная — 50% баланса, но не больше потолка: на XFA Standard $2,000 / $3,000 / $5,000,
              на XFA Consistency $3,000 / $4,000 / $6,000 для счетов 50K / 100K / 150K. Одобрение может занять 1–3 рабочих дня, и это отдельно от срока самого перевода.
            </p>
            <p data-russian-topstep-payout-methods="official-table">
              Вывод прибыли — по таблице из политики выплат Topstep (по данным на {ruDate(payoutDate)}, при повторной проверке
              Prop Firm Tracker {ruDate(DELTA_CHECKED)} текст не изменился). Комиссии указаны так, как их пишет сама Topstep:
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Способ</th><th>Где доступен</th><th>Срок</th><th>Комиссия Topstep</th></tr></thead>
                <tbody>
                  <tr><td>Prop-to-Brokerage</td><td>только США</td><td>в тот же день*</td><td>нет</td></tr>
                  <tr><td>Aeropay</td><td>только банки США</td><td>сразу после одобрения</td><td>нет комиссии Topstep**</td></tr>
                  <tr><td>Wise</td><td>Китай, Канада, Великобритания</td><td>1–3 рабочих дня</td><td>нет комиссии Topstep**</td></tr>
                  <tr><td>ACH</td><td>только банки США</td><td>1–3 рабочих дня</td><td>$30</td></tr>
                  <tr><td>Wire/SWIFT</td><td>международный перевод</td><td>5–10 рабочих дней</td><td>$30</td></tr>
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">
              * Если заявка подана до 12:00 по Чикаго (CT). ** Topstep не берёт комиссию за Aeropay и Wise, но банк или сам сервис
              могут взять свою. Сроки ориентировочные, без выходных и праздников; внутреннее одобрение может занять 1–3 рабочих дня.
            </p>
            <p>
              Wise вернули в августе 2026 года только для трейдеров из Китая, Канады и Великобритании; в остальных странах, по словам
              Topstep, он по-прежнему недоступен. Для русскоязычного трейдера, живущего в допущенной стране вне этих трёх, Wise не вариант.
            </p>
            <p data-russian-topstep-payout-example="policy-ach-500">
              Пример из самой политики выплат (ACH, заявка $500): $500 минус $50 (доля Topstep 10%) минус $30 (комиссия за обработку) = $420 на руки.
              Для международного перевода Wire/SWIFT арифметика та же: $500 − $50 − $30 = $420, срок 5–10 рабочих дней, плюс возможные
              комиссии вашего банка и банков-посредников. Это пример, не прогноз. Меньше $125 заявку подать нельзя.
            </p>
            <p>
              Криптовалюты и Rise в списке нет, а выплата приходит только на банковский счёт на ваше имя. Для трейдера из допущенной
              страны вне США, Китая, Канады и Великобритании это значит, что получать деньги придётся переводом Wire/SWIFT; проверьте
              заранее, примет ли его ваш банк. Как другие фирмы решают этот вопрос — в разборе{' '}
              <Link href="/ru/vyplaty-prop-firm">как платят проп-компании</Link>.
            </p>
            <p className="ru-source-line"><a href={PAYOUT_URL} target="_blank" rel="noopener noreferrer">Политика выплат Topstep</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="platformy" data-russian-topstep-platforms={platforms.length}>
            <h2>Платформы: {platforms.join(' и ') || 'не указаны'}</h2>
            <p>
              TopstepX — торговая платформа самой Topstep, через неё подключаются счета Combine и XFA. Quantower подключается через TopstepX и доступен только на Trading Combine
              и XFA, не на Live-счёте. График TopstepX не подключается к внешним платформам вроде TradingView (по данным на{' '}
              {ruDate(firm.platformEvidence?.sourceCapturedAt ?? GAPS_DATE)}). Совместимость других сторонних платформ в нашей проверке не подтверждена.
              Логин в TopstepX тот же, что и в Topstep Dashboard (справка обновлена {ruDate(TOPSTEPX_CHANGED)}, проверено {ruDate(DELTA_CHECKED)}).
            </p>
            <p>
              Встроенный копировщик сделок в TopstepX работает только на Combine и XFA, не на Live. Ведущий счёт в группе должен иметь самый
              маленький максимальный размер позиции, а разница в правилах масштабирования может отключить копирование. Поэтому
              копирование в наших данных отмечено как «ограничено», а не как свободно разрешённое.{' '}
              <a href={TOPSTEPX_URL} target="_blank" rel="noopener noreferrer">TopstepX</a>{' · '}
              <a href={QUANTOWER_URL} target="_blank" rel="noopener noreferrer">Quantower</a>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="ogranicheniya" data-russian-topstep-rules="news-overnight-ea">
            <h2>Что запрещено или ограничено: новости, перенос через ночь и выходные, советники</h2>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Правило</th><th>Статус</th><th>Что именно сказано</th></tr></thead>
                <tbody>
                  <tr><td>Торговля на новостях</td><td>{reference?.rules?.news === 'restricted' ? 'ограничена' : reference?.rules?.news ?? '—'}</td><td>Для новостей Tier 1 (CPI, FOMC, NFP, PPI) с 5 минут до выхода и до 5 минут после нельзя открывать новые позиции в мини-контрактах на индексы и металлы, а по микроконтрактам действует лимит размера; открытые позиции держать можно. Отдельно запрещено входить максимальным размером позиции прямо в запланированную важную новость. С {ruDate(NEWS_CHANGED)} на Live-счёте с балансом ниже $3,000 во время новостей Tier 1 можно торговать не больше чем 1 контрактом.</td></tr>
                  <tr><td>Перенос через ночь</td><td>{reference?.rules?.overnight === false ? 'нельзя' : '—'}</td><td>Все позиции закрываются до 15:10 по Чикаго в будни, торговля возобновляется в 17:00. Свинг-трейдинга нет.</td></tr>
                  <tr><td>Перенос через выходные</td><td>{reference?.rules?.weekend === false ? 'нельзя' : '—'}</td><td>В пятницу счёт должен быть без позиций до открытия в воскресенье.</td></tr>
                  <tr><td>Советники и алгоритмы</td><td>{reference?.rules?.ea === 'restricted' ? 'ограничены' : reference?.rules?.ea ?? '—'}</td><td>Боты разрешены через API TopstepX/ProjectX ($29 в месяц), кроме высокочастотной торговли (HFT). VPS и VPN запрещены, на Live-счёте API нет; при сбое алгоритма исключений не делают.</td></tr>
                  <tr><td>Копирование сделок</td><td>{reference?.rules?.copyTrading === 'restricted' ? 'ограничено' : reference?.rules?.copyTrading ?? '—'}</td><td>Только Combine и XFA, ведущий счёт с наименьшим лимитом позиции.</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Это правила фьючерсной сессии, а не CFD. Торгуются только контракты бирж CME, COMEX, NYMEX и CBOT; спот-форекса нет,
              валютные и криптовалютные фьючерсы — не то же самое, что спот-валюта или спот-криптовалюта. Отдельно Topstep запрещает
              использование несправедливых технологий и эксплуатацию особенностей симулятора.{' '}
              <a href={HOURS_URL} target="_blank" rel="noopener noreferrer">Часы и инструменты</a>{' · '}
              <a href={PROHIBITED_URL} target="_blank" rel="noopener noreferrer">Запрещённые стратегии</a>{' · '}
              <a href={NEWS_URL} target="_blank" rel="noopener noreferrer">Новости Tier 1</a> (справка обновлена {ruDate(NEWS_CHANGED)}, проверено {ruDate(DELTA_CHECKED)}){' · '}
              <a href={API_URL} target="_blank" rel="noopener noreferrer">API TopstepX</a> (по данным на {ruDate(GAPS_DATE)}).
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="otzyvy" data-russian-topstep-trustpilot={trustpilotFresh ? 'dated' : 'recapture-required'}>
            <h2>Отзывы о Topstep</h2>
            {trustpilotFresh ? (
              <p>
                На Trustpilot у Topstep оценка {String(firm.trustpilotScore).replace('.', ',')} из 5, отзывов: {ruNumber(firm.trustpilotCount ?? 0)}
                (по данным на {ruDate(firm.trustpilotCapturedAt)}). При таком числе отзывов одна волна жалоб или похвал мало меняет
                среднюю оценку, поэтому читайте не цифру, а повторяющиеся темы.{' '}
                {firm.trustpilotUrl && <a href={firm.trustpilotUrl} target="_blank" rel="noopener noreferrer">Профиль на Trustpilot</a>}.
              </p>
            ) : (
              <p className="ru-notice">Оценка Trustpilot проверялась больше 30 дней назад и скрыта до повторной проверки.</p>
            )}
            <p>
              Как читать такие отзывы: жалобы на проп-фирмы чаще всего касаются отказа в выплате, внезапного закрытия счёта и правил,
              которые трейдер не прочитал заранее. У Topstep типичные точки конфликта предсказуемы из правил выше — касание MLL по
              незакрытой позиции, рост цели из-за консистентности и условия первой выплаты. Перед покупкой сверьте их с собственной
              стратегией, а не только с оценкой. Как отличать полезный отзыв от шума — в материале{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>
              <RuPendingLink href="/ru/prop-kompanii-otzyvy">{' '}и в разборе «проп компании отзывы»</RuPendingLink>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="alternativy" data-russian-alternatives="bright-funded-first">
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="topstep-alternatives">
              <strong>Коммерческое раскрытие.</strong>{' '}
              {partnerNames.length > 0
                ? `${partnerNames.join(', ')} — наш партнёр: при регистрации по помеченной ссылке Traders Fund Hub может получить комиссию. `
                : 'Ни одна из фирм ниже не является нашим партнёром. '}
              {['Topstep', ...nonPartnerNames].join(' и ')} нашими партнёрами не являются.{' '}
              Русский язык сайта не означает доступ из вашей страны: статус для РФ показан отдельно у каждой фирмы.
            </div>
            <h2>Альтернативы Topstep для трейдеров из России</h2>
            <p data-russian-topstep-futures-open={openFutures.length}>
              Сначала честный ответ: в нашей базе {futuresFirms.length} фьючерсных проп-фирм, и{' '}
              {openFutures.length === 0
                ? 'ни одна из них не отмечена как открытая для резидентов России'
                : `открытыми для РФ отмечены: ${openFutures.map(item => item.name).join(', ')}`}
              {unverifiedFutures.length > 0 ? `; статус ${unverifiedFutures.map(item => item.name).join(', ')} не проверен` : ''}.
              Поэтому прямой замены Topstep для резидента РФ мы не знаем, и любая альтернатива Topstep из списка ниже — это другой рынок. Ниже — фирмы с другими инструментами (CFD и криптовалюта),
              которые в наших данных Россию не ограничивают. Это не биржевые фьючерсы CME: другая просадка, другие часы торговли и другие
              способы выплаты.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-topstep-futures-table={futuresFirms.length}>
                <thead><tr><th>Фьючерсная проп-фирма</th><th>Доступ для РФ</th></tr></thead>
                <tbody>
                  {futuresFirms.map(item => (
                    <tr key={item.slug}><td>{item.name}</td><td><RuAccessBadge firm={item.slug} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-grid">
              {alternatives.map(item => (
                <article className="ru-card" key={item.slug} data-russian-topstep-alternative={item.slug}>
                  <div className="ru-card-head">
                    <h3>{item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name}</h3>
                    <span className="ru-score">{item.partner ? 'Партнёр' : 'Без партнёрства'}</span>
                  </div>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> Программ с проверенными данными: {item.products.length}</li>
                    <li><Globe2 size={14} aria-hidden="true" /> Инструменты: {(item.firm.assets ?? []).map(asset => ({ Forex: 'форекс', Indices: 'индексы', Commodities: 'сырьё', Crypto: 'криптовалюта' } as Record<string, string>)[asset] ?? asset).join(', ')}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Страна и KYC проверяются до оплаты</li>
                  </ul>
                  <p>
                    {item.slug === 'bright-funded'
                      ? 'CFD-программы 1-Step и 2-Step со взносом в EUR. Ближе всего к Topstep по логике «одна понятная граница убытка», но просадка считается в процентах, а позиции можно держать по другим правилам.'
                      : 'Крипто-ориентированные программы оценки. Подходит, если вы готовы торговать криптовалютой вместо фьючерсов; условия выплат и платформы сверяйте на сайте фирмы.'}
                  </p>
                  <div className="ru-actions">
                    {item.slug === 'bright-funded'
                      ? <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор BrightFunded</Link>
                      : <RuPendingLink href="/ru/obzor-crypto-fund-trader" className="btn-outline">Crypto Fund Trader как альтернатива</RuPendingLink>}
                    <RuGoLink firm={item.slug} href={`/go/${item.slug}?from=ru-topstep-alternative-${item.slug}`} rel={goLinkRel(item.slug)} className={item.slug === 'bright-funded' ? 'btn-primary' : 'btn-outline'}>
                      Проверить {item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name} <ArrowRight size={14} aria-hidden="true" />
                    </RuGoLink>
                  </div>
                </article>
              ))}
            </div>
            <p>
              Третий вариант — <RuPendingLink href="/ru/obzor-hash-hedge">крипто-проп Hash Hedge</RuPendingLink>; его статус для РФ мы
              показываем только после проверки в нашей базе. Полный список с доступом по странам — в{' '}
              <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="plusy-minusy" data-russian-topstep-fit="pros-cons">
            <h2>Плюсы и минусы Topstep</h2>
            <p>Для резидентов стран, где Topstep работает:</p>
            <div className="ru-grid">
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li>Одна фаза оценки и одно жёсткое правило — Maximum Loss Limit в долларах.</li>
                  <li>Нет обязательного дневного лимита убытка в Trading Combine.</li>
                  <li>Доля трейдера {split ?? '—'}% и заявки на выплату по требованию.</li>
                  <li>Два пути оплаты: можно выбрать дешёвый месяц с активацией или дороже без неё.</li>
                  <li>Фирма публикует статистику прохождения и выплат за 2025 год.</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  {cisListed.length > 0 && <li>{cisListed.map(([, ru]) => ru).join(', ')} — в списке ограничений.</li>}
                  <li>Подписка продлевается каждый месяц, пока вы не пройдёте оценку или не отмените её.</li>
                  <li>MLL контролируется внутри дня по незакрытым позициям.</li>
                  <li>Нельзя держать позиции через ночь и выходные.</li>
                  <li>Вне США, Китая, Канады и Великобритании выплата только через Wire/SWIFT: $30 и 5–10 рабочих дней.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="istochniki" data-russian-topstep-sources="dated">
            <h2>Источники и дата проверки</h2>
            <p>
              Цены, цели, MLL, доля и правила взяты из карточки фирмы и записей программ Topstep в нашей базе, проверенных Prop Firm
              Tracker {ruDate(latestCapture)}. Условия выплат, часы торговли и ограничения сверены с официальной справкой в ту же дату.
              Список стран, способы выплаты, компания, API, новости, налоги и минимальный срок — по дополнительной проверке Prop Firm Tracker
              {' '}{ruDate(GAPS_DATE)}; страница допуска Topstep датирована {ruDate(ACCESS_SOURCE.pageDated)}.
              {' '}{ruDate(DELTA_CHECKED)} Prop Firm Tracker перепроверил допуск, политику выплат, цены и условия использования — без изменений.
              Лимит в 1 контракт на новостях Tier 1 для Live-счетов с балансом ниже $3,000 — по справке о рисках, обновлённой {ruDate(NEWS_CHANGED)};
              логин TopstepX — по справке, обновлённой {ruDate(TOPSTEPX_CHANGED)}.
              {trustpilotFresh && ` Оценка Trustpilot — на ${ruDate(firm.trustpilotCapturedAt)}.`}
            </p>
            {!recheckFresh && <p className="ru-notice">Детальная проверка правил старше 30 дней: условия выплат и ограничения ниже требуют повторной сверки.</p>}
            <ul>
              {sourcePages.map(page => (
                <li key={page.url}><a href={page.url} target="_blank" rel="noopener noreferrer">{new URL(page.url).pathname.split('/').pop()?.replace(/^\d+-/, '').replace(/-/g, ' ') || page.url}</a> — проверено {ruDate(page.date)}</li>
              ))}
            </ul>
            <p className="ru-source-line">Англоязычная версия: <Link href="/blog/topstep-review" hrefLang="en">Topstep review</Link>. Официальный сайт: <a href={PROP_URL} target="_blank" rel="noopener noreferrer">topstep.com</a>.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="topstep">
              <strong>Риск.</strong> Торговля фьючерсами с плечом связана с высоким риском. Подписка за оценку не возвращается при нарушении правил.
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="faq">
            <h2>Частые вопросы</h2>
            {!faqSchemaReady && <p className="ru-notice">Часть источников требует повторной проверки. Ответы сохраняют датированный разбор и не подтверждают действующие условия.</p>}
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
