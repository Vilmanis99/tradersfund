import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getAllFirms, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { ruNotListedDate } from '@/lib/ruBasisWording'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-alpha-capital'
const TITLE = 'Alpha Capital: обзор 2026 — программы, цены и доступ из РФ'
const H1 = 'Alpha Capital: обзор и отзывы 2026'
const DESCRIPTION = 'Alpha Capital на русском: программы Alpha Pro, One, Swing и Direct, цены, правила и выплаты. Россия в списке ограничений — есть альтернативы.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['alpha capital', 'alpha capital отзывы', 'alpha capital обзор', 'alpha capital group', 'альфа капитал проп', 'alpha capital россия'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker capture /workspace/ru-data/2026-10-29-alpha-capital-ru-review.md
 * (evidence alpha-ru-review-2026-10-29) and RU SEO Lead brief 2026-11-05-obzor-alpha-capital.md (READY 29.10).
 * Ship-day Tracker SIGN OFF 06.11.2026 (/workspace/tradersfundhub/evidence/alpha-shipday-2026-11-06/SUMMARY.md):
 * Russia still restricted (unchanged vs 05.11 / 29.10); prices still match 29.10; omit promo codes entirely
 * (Nov codes FUNDED40/ALPHA20/10KFOR40 exist through 30 Nov but not checkout-verified — do not name or
 * promote; do NOT write that all codes ended 31.10). Ships Fri 6 Nov → datePublished 2026-11-06.
 * Alpha Capital is in firms.json with russiaStatus 'restricted' and no affiliateUrl:
 * /go/alpha-capital still exists and 302s to officialUrl (official_site_click). CR rule: every firm keeps a
 * CTA + Russia-access badge, including the reviewed firm — so the verdict box and sources use RuGoLink
 * /go/alpha-capital with btn-outline (info-only, not a sign-up CTA). Deliberately NOT using
 * RuReviewVerdictBox: it would render btn-primary above the alternatives, which the brief forbids.
 * Badge from RuGoLink/RuAccessBadgeView ← firms.json russiaStatus 'restricted' → tip label
 * «В списке ограничений» (CR standing 05.11; do not chase «Недоступно для РФ»).
 * List prices only (pricing page 21.09.2026, «по данным на 29.10.2026»); no promo codes on the page.
 */
const CHECKED = '2026-10-29'
const DATE_PUBLISHED = '2026-11-06'
/** Russia list, KYC article and checkout-country page: Tracker ship-day re-read 06.11.2026 (unchanged vs 05.11). */
const ACCESS_CHECKED = '2026-11-06'
const PRICES_CHECKED = '2026-10-29'
/** Official pricing page «Updated September 21, 2026 · Prices verified against live checkout on 21 September 2026». */
const PRICING_UPDATED = '2026-09-21'
/** Intercom article dates shown on the help pages. */
const COUNTRIES_UPDATED = '2026-07-06'
const AVAILABILITY_UPDATED = '2026-06-30'
const PLANS_UPDATED = '2026-07-22'
const SWING_UPDATED = '2026-07-24'
const DIRECT_UPDATED = '2026-09-21'
const BIWEEKLY_UPDATED = '2026-07-07'
const PAYOUTS_UPDATED = '2026-07-07'
/** Companies House record read by RU Writer. */
const REGISTRY_CHECKED = '2026-11-03'
/** Last valid Trustpilot read (Tracker, browser); later reads returned 403. */
const TRUSTPILOT_CHECKED = '2026-10-15'

const HELP = 'https://help.alphacapitalgroup.uk/en/articles/'
const SOURCES = {
  home: 'https://alphacapitalgroup.uk/',
  pricing: 'https://alphacapitalgroup.uk/resources/alpha-capital-2026-plan-pricing-update',
  availability: 'https://alphacapitalgroup.uk/resources/alpha-capital-country-availability-2026',
  product: 'https://alphacapitalgroup.uk/product',
  terms: 'https://alphacapitalgroup.uk/terms-and-conditions',
  registry: 'https://find-and-update.company-information.service.gov.uk/company/13719951',
  trustpilot: 'https://www.trustpilot.com/review/alphacapitalgroup.uk',
  countries: `${HELP}8775575-countries-with-limitations`,
  kyc: `${HELP}8420532-what-documentation-is-required-for-a-qualified-analyst-account`,
  biweekly: `${HELP}10570531-bi-weekly-performance-fee`,
  onDemand: `${HELP}10102634-on-demand-performance-fee`,
  one: `${HELP}10097421-alpha-one-6-10-12`,
  pro6: `${HELP}11378706-alpha-pro-6`,
  pro810: `${HELP}8420429-alpha-pro-8-10`,
  swing: `${HELP}9789907-alpha-swing`,
  three: `${HELP}10192958-alpha-three`,
  direct: `${HELP}16003693-alpha-direct`,
  minDays: `${HELP}6934224-what-are-the-minimum-and-maximum-trading-days-for-the-evaluation`,
  payouts: `${HELP}6933755-how-do-i-get-paid-performance-fees`,
  platforms: `${HELP}6933883-what-trading-platforms-are-available-for-use`,
  news: `${HELP}9293522-can-i-trade-news`,
  weekend: `${HELP}6934247-can-i-hold-trades-over-the-weekend`,
  ea: `${HELP}6934236-can-i-use-an-expert-advisor-ea`,
  copy: `${HELP}8786973-is-copy-trading-allowed`,
  thirdParty: `${HELP}7883145-third-party-payments`,
  addons: `${HELP}16004122-90-profit-split-and-swap-free-add-ons`,
  credentials: `${HELP}6933849-how-long-will-it-take-to-get-my-credentials`,
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
/** RU thousand separator: plain space ($1 097). */
const usd = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, ' ').replace('.', ',')}`

type PriceRow = { size: string; one: number | null; pro6: [number, number] | null; pro8: [number, number] | null; pro10: [number, number] | null; swing: number | null; direct: number | null }

/** List prices, USD, official pricing page (updated 21.09.2026, re-read 29.10.2026). Bi-weekly / on-demand for Pro. */
const PRICE_ROWS: PriceRow[] = [
  { size: '$2.5K', one: null, pro6: null, pro8: null, pro10: null, swing: null, direct: 30 },
  { size: '$5K', one: 47, pro6: [30, 27], pro8: [40, 37], pro10: [37, 33], swing: 70, direct: 67 },
  { size: '$10K', one: 87, pro6: [55, 47], pro8: [67, 57], pro10: [87, 77], swing: 147, direct: 97 },
  { size: '$25K', one: 187, pro6: [127, 117], pro8: [197, 177], pro10: [197, 177], swing: 247, direct: 197 },
  { size: '$50K', one: 277, pro6: [227, 217], pro8: [327, 297], pro10: [297, 267], swing: 357, direct: 257 },
  { size: '$100K', one: 477, pro6: [427, 397], pro8: [577, 527], pro10: [497, 447], swing: 577, direct: 457 },
  { size: '$200K', one: 947, pro6: [847, 797], pro8: [1_097, 997], pro10: [997, 897], swing: 1_097, direct: 897 },
]
const cell = (value: number | null) => (value == null ? '—' : usd(value))
const pair = (value: [number, number] | null) => (value == null ? '—' : `${usd(value[0])} / ${usd(value[1])}`)

type ProgramRow = { key: string; name: string; href: string; steps: string; targets: string; limits: string; days: string; payout: string }

const PROGRAMS: ProgramRow[] = [
  { key: 'alpha-pro-6', name: 'Alpha Pro 6%', href: SOURCES.pro6, steps: '2 этапа', targets: '6% → 6%', limits: 'дневной 3%, общий 6% статический', days: '3 на этапе', payout: 'раз в 14 дней или по запросу; 80%' },
  { key: 'alpha-pro-8', name: 'Alpha Pro 8%', href: SOURCES.pro810, steps: '2 этапа', targets: '8% → 5%', limits: 'дневной 4%, общий 8% статический', days: '3 на этапе', payout: 'раз в 14 дней или по запросу; 80%' },
  { key: 'alpha-pro-10', name: 'Alpha Pro 10%', href: SOURCES.pro810, steps: '2 этапа', targets: '10% → 5%', limits: 'дневной 5%, общий 10% статический', days: '3 на этапе', payout: 'раз в 14 дней или по запросу; 80%' },
  { key: 'alpha-one-10', name: 'Alpha One 10%', href: SOURCES.one, steps: '1 этап', targets: '10%', limits: 'дневной 4%, общий 6% trailing', days: '1', payout: 'по запросу; 80%' },
  { key: 'alpha-swing', name: 'Alpha Swing', href: SOURCES.swing, steps: '2 этапа', targets: '10% → 5%', limits: 'дневной 5%, общий 10% статический', days: '3 на этапе', payout: 'только по запросу; 80%' },
  { key: 'alpha-direct', name: 'Alpha Direct', href: SOURCES.direct, steps: 'без оценки', targets: 'нет', limits: 'дневной 3%, общий 5% trailing, риск 1% на актив', days: 'условия расходятся, уточните у поддержки', payout: 'по запросу; 90%' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли торговать в Alpha Capital из России?',
    a: `Нет. Справка фирмы (${asOf(ACCESS_CHECKED)}) прямо называет Россию: услуги не оказываются гражданам и резидентам стран из списка. Россию нельзя выбрать и в списке стран при оформлении заказа. Обходить ограничение через VPN мы не советуем: при KYC это запрещено правилами и ведёт к закрытию счёта.`,
  },
  {
    q: 'Сколько стоит челлендж Alpha Capital?',
    a: `Лист-цены ${asOf(PRICES_CHECKED)}: от ${usd(27)} (Alpha Pro 6% $5K с выплатой по запросу) до ${usd(1_097)} (Pro 8% и Swing $200K). Alpha Pro 6% $100K с выплатой раз в 14 дней — ${usd(427)}. На странице только лист-цены; итоговую сумму смотрите при оформлении заказа.`,
  },
  {
    q: 'Какая просадка и сколько дней торговать?',
    a: 'У Alpha Pro 6% дневной лимит 3% и общий 6% статический, у Pro 10% и Swing — 5% и 10%. У Alpha One 10% общий лимит 6% trailing. Минимум — 3 торговых дня на каждом этапе Pro и Swing, 1 день у One. Максимального срока нет, но действует правило неактивности 30 дней.',
  },
  {
    q: 'Какой сплит и как выводить прибыль?',
    a: 'Базовый сплит 80% (90% — платная опция для One и Pro с выплатой по запросу), у Alpha Direct — 90%. Выплаты через Rise, Wise и банковский перевод (WIRE, ACH, SWIFT); криптовалюта — только через Rise. Заявки обрабатывают в течение 2 рабочих дней.',
  },
  {
    q: 'Какие платформы доступны?',
    a: 'MetaTrader 5, cTrader, DXtrade и TradeLocker. Советники разрешены только на MT5 и только как инструменты управления риском; полностью автоматическая торговля запрещена.',
  },
  {
    q: 'Чем заменить Alpha Capital трейдеру из России?',
    a: `У BrightFunded России нет в списке ограничений (на ${ruNotListedDate('bright-funded')}), у Crypto Fund Trader — тоже (на ${ruNotListedDate('crypto-fund-trader')}). Это не гарантия доступа: страну, KYC и способ выплаты сверяйте до оплаты.`,
  },
]

export default function RussianAlphaCapitalReviewPage() {
  const alphaStatus = russiaStatusFor('alpha-capital')
  const fresh = isChallengeFresh({ sourceCapturedAt: CHECKED })
  const dateModified = russianRouteDateModified(PATH)
  const bright = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const brightSplit = bright.map(product => product.profitSplitPct).find(value => value != null)
  const brightFirm = getAllFirms().find(firm => firm.name === 'BrightFunded') as { futuresCountriesRestrictedPageDate?: string; futuresCountriesRestrictedSourceUrl?: string } | undefined
  const brightFuturesDate = brightFirm?.futuresCountriesRestrictedPageDate ?? null
  const brightFuturesUrl = brightFirm?.futuresCountriesRestrictedSourceUrl ?? null
  const closedHref = ruClosedFirmsHref()

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Alpha Capital' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: DATE_PUBLISHED,
    dateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  const src = (href: string, label: string) => (
    <a href={href} target="_blank" rel="nofollow noopener noreferrer">{label}</a>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {fresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-review="alpha-capital" data-russia-status-alpha-capital={alphaStatus}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
            {' / '}
            Обзор Alpha Capital
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Проверено {ruDate(CHECKED)} по официальным страницам
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Alpha Capital Group — британская проп-фирма с челленджами в одну и две фазы и счётом Alpha Direct без
            оценки. Условия у неё понятные и подробно описаны в справке, но для трейдеров из России главное другое:
            Россия стоит в списке стран, которым фирма услуги не оказывает. Ниже — что это значит, сколько стоят
            программы и чем фирму заменить.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-alpha-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{PROGRAMS.length}</strong><span>программ в продаже</span></div>
            <div className="ru-stat"><strong>{usd(27)}</strong><span>минимальная лист-цена (Pro 6% $5K)</span></div>
            <div className="ru-stat"><strong>80–90%</strong><span>доля трейдера</span></div>
            <div className="ru-stat"><strong>4</strong><span>платформы</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section ru-p1-verdict-section">
        <div className="ru-shell">
          <div className="ru-p1-verdict" data-ru-verdict={PATH} data-russian-alpha-verdict-box="info-only" aria-labelledby="ru-verdict-title">
            <div className="ru-p1-verdict__head">
              <div>
                <p id="ru-verdict-title" className="ru-p1-verdict__name">Alpha Capital</p>
                {/* Badge sits on the CTA row below (RuGoLink), same as RuReviewVerdictBox. */}
              </div>
            </div>
            <p className="ru-p1-verdict__line">
              Alpha Capital — аккуратная фирма для тех, кому она доступна: статический общий лимит в двухфазных Alpha
              Pro, выбор между выплатой раз в 14 дней и выплатой по запросу, четыре платформы и выплаты за 2 рабочих
              дня. Но Россия названа в справке прямо, причём и по гражданству, и по резидентству, а в списке стран при
              оформлении заказа её нет. Поэтому для резидента РФ это справочный обзор, а не рекомендация к покупке.
              Гражданину РФ, который живёт в другой стране и имеет её документ, справка о KYC допускает онбординг, но
              решает фирма, не мы. Если вы торгуете из России, смотрите альтернативы ниже: BrightFunded и Crypto Fund
              Trader.
            </p>
            <div className="ru-p1-cta ru-p1-cta--compact" data-russian-alpha-cta="verdict-box">
              <RuGoLink
                firm="alpha-capital"
                href="/go/alpha-capital?from=ru-alpha-capital-review-verdict-box"
                prefetch={false}
                rel={goLinkRel('alpha-capital')}
                target="_blank"
                className="btn-outline"
                data-ru-verdict-cta="alpha-capital"
              >
                Официальный сайт Alpha Capital <ExternalLink size={13} aria-hidden="true" />
              </RuGoLink>
              <span className="ru-p1-cta__note">Официальный сайт · без партнёрского соглашения · для резидентов других стран</span>
            </div>
            <div className="ru-p1-verdict__fit">
              <div>
                <p className="ru-p1-verdict__h">Подойдёт, если…</p>
                <ul>
                  <li>вы живёте не в стране из списка ограничений и проходите KYC по её документу;</li>
                  <li>нужен статический общий лимит и спокойный темп двух фаз;</li>
                  <li>важна выплата за 2 рабочих дня через Rise, Wise или банк.</li>
                </ul>
              </div>
              <div>
                <p className="ru-p1-verdict__h">Не подойдёт, если…</p>
                <ul>
                  <li>вы резидент России или торгуете из неё;</li>
                  <li>нужна полностью автоматическая торговля советником;</li>
                  <li>вы держите позиции на выходные на funded-счёте Alpha Pro.</li>
                </ul>
              </div>
            </div>
            <p className="ru-p1-verdict__checked">
              <a href="#sources">✓ Данные проверены {ruDate(CHECKED)}</a> · У сайта нет партнёрского договора с Alpha Capital.
            </p>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-alpha-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Alpha Capital">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: доступ из России</a></li>
                <li><a href="#company">Компания</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#example">Пример: Alpha Pro 6% $100K</a></li>
                <li><a href="#rules">Правила торговли</a></li>
                <li><a href="#payouts">Выплаты и сплит</a></li>
                <li><a href="#platforms">Платформы и оплата</a></li>
                <li><a href="#scaling">Масштабирование</a></li>
                <li><a href="#reviews">Отзывы</a></li>
                <li><a href="#compare">Альтернативы</a></li>
                <li><a href="#sources">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-alpha-verdict="summary">
            <h2>Коротко: доступна ли Alpha Capital из России</h2>
            <div className="ru-notice" data-russian-alpha-access={alphaStatus}>
              <RuAccessBadgeView firm="alpha-capital" status={alphaStatus} hint={false} />{' '}
              Справка «Countries with limitations» (статья от {ruDate(COUNTRIES_UPDATED)}, {asOf(ACCESS_CHECKED)})
              пишет: фирма «does not provide services to persons who are nationals of, or residents in» стран списка. В
              списке — Россия, Беларусь, Крым и подсанкционные районы Украины (Донецк, Луганск, Херсон, Запорожье).
              Страница о доступности по странам (обновлена {ruDate(AVAILABILITY_UPDATED)}) добавляет: Россию нельзя
              выбрать в списке стран при оформлении заказа. Казахстан в списке доступных стран есть.
            </div>
            <p>
              Справка о KYC уточняет два случая. Если трейдер из страны списка живёт в стране без ограничений и имеет
              документ этой страны, его могут принять. Если он живёт в стране из списка, его не примут даже с паспортом
              другой страны. VPN и VPS во время KYC запрещены, нарушение ведёт к закрытию счёта. Советов по обходу
              ограничений мы не даём.
            </p>
            <p>
              Русский язык ≠ доступ: даже если интерфейс или поддержка понятны, решают список стран, KYC и условия.
              Чем в целом отличаются проп-фирмы для русскоязычных — в нашем{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">гиде для русскоязычных трейдеров</Link>.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="alpha-capital-review">
              <strong>Раскрытие.</strong> У сайта нет партнёрского договора с Alpha Capital. Кнопка «официальный сайт»
              ведёт через /go/alpha-capital на alphacapitalgroup.uk без партнёрской атрибуции (info-only, не призыв к
              регистрации для резидентов РФ) и несёт бейдж доступа. Ссылка на BrightFunded в блоке альтернатив —
              партнёрская; ссылка на Crypto Fund Trader — обычная.
            </div>
            <div className="ru-actions" data-russian-alpha-cta="verdict">
              <Link href="#compare" className="btn-primary">
                Альтернативы для трейдеров из РФ <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <RuGoLink
                firm="alpha-capital"
                href="/go/alpha-capital?from=ru-alpha-capital-review-verdict"
                rel={goLinkRel('alpha-capital')}
                className="btn-outline"
              >
                Официальный сайт · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </div>
            <p className="ru-source-line">
              Ссылка на Alpha Capital не партнёрская: Traders Fund Hub не получает комиссию за этот переход.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.countries, 'Countries with limitations')}, {src(SOURCES.availability, 'доступность по странам')},{' '}
              {src(SOURCES.kyc, 'документы для KYC')} — {asOf(ACCESS_CHECKED)}.
            </p>
          </div>
        </section>

        <RuTelegramBlock placement="obzor-alpha-capital" />

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-alpha-entity={REGISTRY_CHECKED}>
            <h2>Компания: кто стоит за Alpha Capital</h2>
            <p>
              Оператор — <strong>Alpha Capital Group Limited</strong>, частная компания в Англии, номер в реестре
              Companies House 13719951. Зарегистрирована 02.11.2021, адрес — Харпенден, Англия; статус в реестре —
              действующая ({asOf(REGISTRY_CHECKED)}). Те же название и номер указаны в подвале сайта.
            </p>
            <p>
              Лицензии финансового регулятора фирма не заявляет: оценка и funded-счета (в терминах Alpha — Qualified
              Analyst) работают на симулированных счетах, а выплаты называются performance fee. Это обычная модель для
              проп-фирм; что она означает на практике, разобрано в материале{' '}
              <Link href="/ru/prop-trejding">что такое проп трейдинг</Link>. У страницы условий (Terms and Conditions)
              нет даты редакции.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.registry, 'Companies House')} ({asOf(REGISTRY_CHECKED)}), {src(SOURCES.home, 'подвал сайта')},{' '}
              {src(SOURCES.terms, 'Terms and Conditions')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted" data-russian-alpha-prices={PRICES_CHECKED}>
              Лист-цены в долларах США {asOf(PRICES_CHECKED)} — со страницы цен фирмы (обновлена{' '}
              {ruDate(PRICING_UPDATED)}; цифры без изменений при перечитывании 06.11.2026). Для Alpha Pro первая цифра —
              выплата раз в 14 дней, вторая — по запросу. На странице только лист-цены; итоговую сумму смотрите при
              оформлении заказа.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Лист-цены Alpha Capital">
              <table className="ru-table" data-russian-alpha-price-table={PRICES_CHECKED}>
                <caption className="sr-only">Лист-цены Alpha Capital по размеру счёта</caption>
                <thead>
                  <tr>
                    <th>Счёт</th>
                    <th>One 10%</th>
                    <th>Pro 6%</th>
                    <th>Pro 8%</th>
                    <th>Pro 10%</th>
                    <th>Swing</th>
                    <th>Direct</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_ROWS.map(row => (
                    <tr key={row.size}>
                      <th scope="row">{row.size}</th>
                      <td>{cell(row.one)}</td>
                      <td>{pair(row.pro6)}</td>
                      <td>{pair(row.pro8)}</td>
                      <td>{pair(row.pro10)}</td>
                      <td>{cell(row.swing)}</td>
                      <td>{cell(row.direct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы Alpha Capital">
              <table className="ru-table" data-russian-alpha-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы Alpha Capital: этапы, цели, лимиты, дни, выплаты</caption>
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Этапы</th>
                    <th>Цели</th>
                    <th>Лимиты убытка</th>
                    <th>Мин. дней</th>
                    <th>Выплата / сплит</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-alpha-product={program.key}>
                      <td><strong>{src(program.href, program.name)}</strong></td>
                      <td>{program.steps}</td>
                      <td>{program.targets}</td>
                      <td>{program.limits}</td>
                      <td>{program.days}</td>
                      <td>{program.payout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ru-shell ru-content">
            <p>
              Общий лимит у Pro и Swing статический — считается от начального баланса и не двигается. У One и Direct
              лимит trailing: он поднимается вслед за максимумом баланса, пока не дойдёт до начального баланса, и там
              фиксируется. Дневной лимит у Pro 6%, One и Direct считается от большего из баланса и эквити на конец
              прошлого дня. Как эти механики устроены в целом, объясняет{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гид о том, как работают челленджи</Link>.
            </p>
            <p>
              Суммарно на одного трейдера — не больше {usd(400_000)} на всех программах. Платные опции при покупке:
              сплит 90% (для всех One и для Pro с выплатой по запросу) и счёт без свопов; каждая стоит примерно 10% от
              цены плана. Справка описывает ещё One 6% и One 12%, но страница цен пишет, что сейчас продаётся
              только One 10%, — её цены и приведены.
            </p>
            <h3 data-russian-alpha-legacy="alpha-three">Что снято с продажи</h3>
            <p>
              {src(SOURCES.three, 'Alpha Three')} (три фазы: 8% → 4% → 4%, дневной 4%, общий 6%) по-прежнему описана в
              справке и условиях для уже купленных счетов, но страница доступности по странам пишет, что новым
              покупателям она не продаётся. На странице продуктов её тоже нет, поэтому цену мы не приводим.
            </p>
            <p data-russian-alpha-conflicts={CHECKED}>
              <strong>Где страницы фирмы расходятся.</strong> Некоторые старые страницы сайта ещё показывают прежние цены
              (например, One $50K за {usd(297)} вместо {usd(277)}). Мы печатаем цены со страницы цен, которую фирма
              сверяла с корзиной {ruDate(PRICING_UPDATED)}; при оформлении заказа проверьте сумму ещё раз.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.pricing, 'страница цен')} ({asOf(PRICES_CHECKED)}), справка по программам (ссылки
              в таблице, статьи от {ruDate(PLANS_UPDATED)}–{ruDate(DIRECT_UPDATED)}), {src(SOURCES.minDays, 'минимум дней')},{' '}
              {src(SOURCES.addons, 'платные опции')}, {src(SOURCES.product, 'страница продуктов')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-alpha-example="pro-6-biweekly-100k">
            <h2>Пример пути: Alpha Pro 6% $100K</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цена {asOf(PRICES_CHECKED)} и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li><strong>Взнос:</strong> {usd(427)} за версию с выплатой раз в 14 дней ({usd(397)} — с выплатой по запросу). Лист-цена; итоговую сумму смотрите при оформлении заказа.</li>
              <li><strong>Фаза 1 и фаза 2:</strong> цель 6% на каждой — по {usd(6_000)}. Минимум 3 торговых дня на фазе, верхнего срока нет.</li>
              <li><strong>Дневной лимит:</strong> 3% = {usd(3_000)} от большего из баланса и эквити на конец прошлого дня.</li>
              <li><strong>Общий лимит:</strong> 6% статический — эквити не должно опуститься до {usd(94_000)}.</li>
              <li><strong>Funded-счёт:</strong> позиции на выходные держать нельзя; за 5 минут до и после важных новостей нельзя открывать и закрывать сделки.</li>
              <li><strong>Первая выплата:</strong> заявку можно подать через 14 дней после первой сделки на funded-счёте; до неё нужно не меньше 5 торговых дней с одной и той же стратегией. Торговать минимальными лотами ради счёта дней нельзя.</li>
              <li><strong>Правило лучшего дня:</strong> для выплаты раз в 14 дней процент — на сайте не указано; минимальная прибыль — {usd(100)} брутто ({usd(80)} на руки).</li>
              <li><strong>Расчёт:</strong> прибыль {usd(3_000)} × 80% = {usd(2_400)}. Если бы вы выбрали выплату по запросу, лучший день не должен превышать 40% прибыли — не больше {usd(1_200)} из {usd(3_000)}.</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.pricing, 'страница цен')}, {src(SOURCES.pro6, 'Alpha Pro 6%')}, {src(SOURCES.biweekly, 'выплата раз в 14 дней')} (статья от {ruDate(BIWEEKLY_UPDATED)}),{' '}
              {src(SOURCES.onDemand, 'выплата по запросу')}, {src(SOURCES.weekend, 'выходные')}, {src(SOURCES.news, 'новости')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-alpha-rules={CHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li><strong>Новости:</strong> на оценке без ограничений. На funded-счетах Pro, One, Three и Direct нельзя открывать и закрывать сделки по затронутым инструментам за 5 минут до и после релиза. У Swing мягче: сделка, начатая за 2 минуты до или после новости, должна длиться больше 2 минут.</li>
              <li><strong>Выходные:</strong> у Pro можно на оценке, но нельзя на funded-счёте — прибыль по таким сделкам снимают. У One, Swing и Three можно на всех этапах. У Direct нельзя.</li>
              <li><strong>Лоты и плечо:</strong> у каждого размера счёта свой максимум лотов (у Pro $100K — 40 лотов, у Swing $100K — 20). Плечо на FX: Pro — 1:100, Three — 1:50, One, Swing и Direct — 1:30.</li>
              <li><strong>Советники:</strong> только на MT5 и только для управления риском и сделками (расчёт лота, стоп, безубыток), с предварительным одобрением. Полностью автоматические стратегии, HFT и арбитраж задержек запрещены; на Direct и счетах без свопов советники отключены.</li>
              <li><strong>Копирование:</strong> только со своего внешнего счёта после проверки владения; копировать чужие сделки нельзя. На cTrader, DXtrade и TradeLocker копирование недоступно.</li>
              <li><strong>Alpha Direct:</strong> риск 1% на актив действует с первой сделки — убыточные позиции по одному активу суммируются, и при достижении порога счёт закрывают.</li>
              <li><strong>Неактивность:</strong> на оценке действует правило 30 дней.</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.news, 'новости')}, {src(SOURCES.weekend, 'выходные')}, {src(SOURCES.ea, 'советники')},{' '}
              {src(SOURCES.copy, 'копирование')}, {src(SOURCES.direct, 'Alpha Direct')}, {src(SOURCES.swing, 'Alpha Swing')} (статья от {ruDate(SWING_UPDATED)}),{' '}
              {src(SOURCES.minDays, 'минимум дней')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-alpha-payouts={PAYOUTS_UPDATED}>
            <h2>Выплаты и сплит</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат Alpha Capital">
              <table className="ru-table">
                <caption className="sr-only">Циклы, правила и способы выплат Alpha Capital</caption>
                <tbody>
                  <tr><th scope="row">Сплит</th><td>80%; 90% — платная опция для One и Pro с выплатой по запросу; Alpha Direct — 90%</td></tr>
                  <tr><th scope="row">Раз в 14 дней (Pro, Three)</th><td>первая заявка через 14 дней после первой сделки; не меньше 5 торговых дней с одной стратегией; минимум {usd(100)} брутто; процент лучшего дня на сайте не указано</td></tr>
                  <tr><th scope="row">По запросу (Pro, Swing, One, Three)</th><td>лучший день — не больше 40% прибыли; минимум 2% прибыли от баланса</td></tr>
                  <tr><th scope="row">Alpha Direct</th><td>сначала запас 3% прибыли, затем минимум 1% сверху; лучший день — не больше 15%</td></tr>
                  <tr><th scope="row">Способы</th><td>Rise, Wise, банковский перевод (WIRE, ACH, SWIFT); криптовалюта — только через Rise</td></tr>
                  <tr><th scope="row">Срок</th><td>в течение 2 рабочих дней; по условиям — до 14 рабочих дней, если нужны дополнительные проверки</td></tr>
                </tbody>
              </table>
            </div>
            <p data-russian-alpha-direct-days="conflict">
              <strong>Минимум торговых дней на Alpha Direct.</strong> В статье о Direct такой строки нет, а таблица в
              условиях даёт для выплаты по запросу «N/A», а для выплаты раз в 14 дней — 5 дней. Условия расходятся,
              уточните у поддержки.
            </p>
            <p>
              Перед заявкой все сделки должны быть закрыты, пока заявка обрабатывается, счёт заблокирован. Найденное
              нарушение снимает прибыль по сделкам или за весь период, а выплата откладывается. KYC проходят перед
              выдачей funded-счёта, а на Direct — перед первой выплатой. Сравнить способы и сроки с другими фирмами можно
              в обзоре <Link href="/ru/vyplaty-prop-firm">как платят проп-компании</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.payouts, 'выплаты')} (статья от {ruDate(PAYOUTS_UPDATED)}), {src(SOURCES.biweekly, 'раз в 14 дней')},{' '}
              {src(SOURCES.onDemand, 'по запросу')}, {src(SOURCES.direct, 'Alpha Direct')}, {src(SOURCES.terms, 'Terms and Conditions')},{' '}
              {src(SOURCES.addons, 'опция 90%')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content" data-russian-alpha-platforms={CHECKED}>
            <h2>Платформы и способы оплаты</h2>
            <p>
              Платформы: MetaTrader 5, cTrader, DXtrade и TradeLocker. Для резидентов США MT5 недоступна, а cTrader не
              принимает новых клиентов из США. Если вы ищете фирму именно под cTrader, посмотрите подборку{' '}
              <Link href="/ru/prop-firmy-s-ctrader">проп-фирм с cTrader</Link>.
            </p>
            <p>
              Оплата челленджа: банковская карта, криптовалюта (доступ к счёту — до 24 часов) и PayPal; цены только в
              долларах США. Карта или счёт третьего лица не принимаются: имя плательщика сверяют с данными KYC. Какие
              именно карты и монеты проходят, на сайте не указано; оформление заказа мы не проверяли. Что меняется после
              прохождения оценки — в разделе о <Link href="/ru/funded-account">проп-счёте (funded account)</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.platforms, 'платформы')}, {src(SOURCES.credentials, 'оплата и выдача счёта')},{' '}
              {src(SOURCES.thirdParty, 'платежи третьих лиц')}, {src(SOURCES.availability, 'доступность по странам')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="scaling">
          <div className="ru-shell ru-content" data-russian-alpha-scaling={CHECKED}>
            <h2>Масштабирование</h2>
            <p>
              Условия плана масштабирования (шаги, проценты и сроки): на сайте не указано — в проверенных статьях их
              нет. Известны
              только потолок {usd(400_000)} на трейдера по всем программам и то, что счета Alpha Direct нельзя
              объединять и масштабировать.
            </p>
            <p className="ru-source-line">Источники: {src(SOURCES.pro6, 'Alpha Pro 6%')}, {src(SOURCES.direct, 'Alpha Direct')} — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-alpha-reviews="trustpilot-hidden">
            <h2>Отзывы об Alpha Capital</h2>
            <p>
              На {src(SOURCES.trustpilot, 'Trustpilot')} рейтинг Alpha Capital скрыт: площадка пишет, что оценка
              недоступна из-за нарушения её правил, и что часть поддельных отзывов удалена ({asOf(TRUSTPILOT_CHECKED)}).
              Поэтому звёзд мы не показываем; повторно загрузить страницу {ruDate(CHECKED)} не удалось. Непроверенные
              истории из блогов и чатов мы тоже не пересказываем. Как отличать полезные отзывы от шума — в нашем разборе{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывов о проп-фирмах</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из России</h2>
            <p data-russian-alpha-alt-basis="not-in-restricted-list">
              У BrightFunded в CFD-челлендже России нет в списке ограничений (на {ruNotListedDate('bright-funded')}), у
              Crypto Fund Trader — тоже нет (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия
              доступа. Статус BrightFunded относится только к челленджу: фьючерсный продукт BrightFunded
              {brightFuturesDate ? ` (справка обновлена ${ruDate(brightFuturesDate)})` : ''} ограничивает Россию,
              Беларусь и Украину{brightFuturesUrl ? <> — {src(brightFuturesUrl, 'список стран BrightFunded Futures')}</> : null}.
              Сводная таблица фирм — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-alpha-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-alpha-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит {brightSplit != null ? `${brightSplit}%` : 'по программе'}; CFD-челлендж.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-alpha-capital-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-alpha-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-alpha-capital-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p>
              Если вам важна криптовалюта, посмотрите <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link>;
              если нужен счёт сразу, без этапа оценки, как Alpha Direct, — подборку{' '}
              <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирм без челленджа</Link>, а для торговли валютными парами —{' '}
              <Link href="/ru/forex-prop-firmy">форекс проп-фирмы</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Статический общий лимит</strong> у Alpha Pro и Swing.</li>
                  <li><strong>Выбор цикла выплат:</strong> раз в 14 дней или по запросу.</li>
                  <li><strong>Выплата за 2 рабочих дня</strong> через Rise, Wise или банк.</li>
                  <li><strong>Четыре платформы</strong> и подробная справка по каждой программе.</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Россия в списке ограничений</strong> — по гражданству и резидентству.</li>
                  <li><strong>Нельзя держать выходные</strong> на funded-счёте Pro и на Direct.</li>
                  <li><strong>Советники только для управления риском</strong> и только на MT5.</li>
                  <li><strong>Противоречия</strong> между страницами: старые цены, минимум дней на Direct.</li>
                </ul>
              </article>
            </div>
            <p data-russian-alpha-precheck="closed-firms">
              До оплаты любой фирмы проверьте, нет ли её в списке{' '}
              {closedHref ? <Link href={closedHref}>закрытых проп-фирм</Link> : 'закрытых проп-фирм'} — Alpha Capital в
              нём нет.
            </p>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>Проверено {ruDate(CHECKED)} по официальным страницам Alpha Capital; реестр Companies House — {ruDate(REGISTRY_CHECKED)}.</p>
            <ul>
              <li>{src(SOURCES.countries, 'Countries with limitations')} (статья от {ruDate(COUNTRIES_UPDATED)}), {src(SOURCES.kyc, 'документы для KYC')}, {src(SOURCES.availability, 'доступность по странам')} (обновлена {ruDate(AVAILABILITY_UPDATED)}) — {asOf(ACCESS_CHECKED)}.</li>
              <li>{src(SOURCES.pricing, 'Страница цен')} (обновлена {ruDate(PRICING_UPDATED)}) — лист-цены {asOf(PRICES_CHECKED)}; {src(SOURCES.product, 'страница продуктов')}.</li>
              <li>Справка по программам: {src(SOURCES.pro6, 'Pro 6%')}, {src(SOURCES.pro810, 'Pro 8%/10%')}, {src(SOURCES.one, 'One')}, {src(SOURCES.three, 'Three')} (статьи от {ruDate(PLANS_UPDATED)}), {src(SOURCES.swing, 'Swing')} ({ruDate(SWING_UPDATED)}), {src(SOURCES.direct, 'Direct')} ({ruDate(DIRECT_UPDATED)}), {src(SOURCES.minDays, 'минимум дней')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.payouts, 'Выплаты')}, {src(SOURCES.biweekly, 'раз в 14 дней')}, {src(SOURCES.onDemand, 'по запросу')}, {src(SOURCES.addons, 'платные опции')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.news, 'Новости')}, {src(SOURCES.weekend, 'выходные')}, {src(SOURCES.ea, 'советники')}, {src(SOURCES.copy, 'копирование')}, {src(SOURCES.platforms, 'платформы')}, {src(SOURCES.credentials, 'оплата')}, {src(SOURCES.thirdParty, 'платежи третьих лиц')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.terms, 'Terms and Conditions')} (без даты) — {asOf(CHECKED)}; {src(SOURCES.registry, 'Companies House')} — {asOf(REGISTRY_CHECKED)}; {src(SOURCES.trustpilot, 'Trustpilot')} — {asOf(TRUSTPILOT_CHECKED)}.</li>
            </ul>
            <p data-russian-alpha-gaps={CHECKED}>
              На сайте не указано ({asOf(CHECKED)}): процент лучшего дня для выплаты раз в 14 дней; условия плана
              масштабирования; какие карты и монеты принимает корзина; дата редакции условий. Мы не регистрировались, не
              оплачивали челлендж и не получали выплату от Alpha Capital.
            </p>
            <div className="ru-notice" data-russian-risk-disclaimer="alpha-capital-review">
              <strong>Риск.</strong> Торговля с плечом связана с высоким риском. Большинство участников не проходит оценку,
              взнос после покупки обычно не возвращается. Счета на этапах оценки и funded — симулированные;
              вознаграждение выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <p className="ru-actions" data-russian-alpha-cta="final" data-russian-alpha-official="non-affiliate">
              <RuGoLink
                firm="alpha-capital"
                href="/go/alpha-capital?from=ru-alpha-capital-review-sources"
                rel={goLinkRel('alpha-capital')}
                className="btn-outline"
              >
                Официальный сайт, не партнёрская ссылка · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </p>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы об Alpha Capital</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
