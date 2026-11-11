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

const PATH = '/ru/obzor-my-funded-futures'
const TITLE = 'My Funded Futures: обзор 2026 — цены, правила и доступ из РФ'
const H1 = 'My Funded Futures: обзор и отзывы 2026'
const DESCRIPTION = 'My Funded Futures: обзор фьючерсного пропа. Rapid/Flex/Pro, цены, сплит до 90%, consistency и выплаты. Россия в списке ограничений — есть альтернативы.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'my funded futures',
    'my funded futures отзывы',
    'mff обзор',
    'my funded futures россия',
    'myfundedfutures',
    'фьючерсный проп',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker evidence /workspace/tradersfundhub/evidence/mff-ru-review-2026-11-04/SUMMARY.md
 * (captured 04.11.2026) + rolling recheck 05.11.2026 on origin/daily/2026-11-04 (0711633a; values unchanged).
 * Brief: /workspace/ru-seo/briefs/2026-11-10-obzor-my-funded-futures.md (GATE PASSED 04.11).
 * Ships Tue 10 Nov → datePublished 2026-11-10.
 * MFF is in firms.json with russiaStatus 'restricted' and no affiliateUrl: /go/my-funded-futures 302s to
 * officialUrl (official_site_click). CR rule: reviewed firm keeps CTA + Russia badge → RuGoLink with
 * btn-outline (info-only). Badge from RuAccessBadgeView ← firms.json → «В списке ограничений» (Dev 03.11;
 * brief still says older «Недоступно для РФ» — do not hardcode). BrightFunded CTA above firm official link.
 * List prices only «по данным на 04.11.2026»; codes CLUB/FIFTYOFF named only as coupon-page listings
 * (worded «указаны на официальной странице купонов на 10.11.2026»; not checkout-verified, not in CTAs).
 */
const CHECKED = '2026-11-04'
const DATE_PUBLISHED = '2026-11-10'
/** Restricted Countries Policy help article read date. */
const ACCESS_CHECKED = '2026-11-04'
/** Help article dateModified (Restricted Countries Policy). */
const COUNTRIES_PAGE_MODIFIED = '2026-10-14'
const PRICES_CHECKED = '2026-11-04'
/** Ship-day coupon-page listing date (10.11 re-read; not a price/ACCESS capture bump). */
const COUPONS_LISTED = '2026-11-10'
/** Rolling recheck of plan pages + Help Centre; values unchanged vs 04.11. */
const RULES_RECHECKED = '2026-11-05'
const TRUSTPILOT_CHECKED = '2026-10-26'
const CORPORATE_CHECKED = '2026-10-26'
const PAYOUT_GUIDE_UPDATED = '2026-08-26'
const PAYMENT_METHODS_UPDATED = '2026-10-05'
const PLATFORMS_UPDATED = '2026-10-08'
const CONSISTENCY_HELP_UPDATED = '2026-09-25'
const NEWS_HELP_UPDATED = '2026-08-31'
const SESSION_HELP_UPDATED = '2026-08-24'
const FAIR_PLAY_UPDATED = '2026-10-30'
const ONE_TIME_FROM = '2026-08-25'
const KYC_UPDATED = '2026-10-13'

const HELP = 'https://help.myfundedfutures.com/en/articles/'
const SOURCES = {
  home: 'https://myfundedfutures.com/',
  rapid: 'https://myfundedfutures.com/plans/rapid',
  rapidEod: 'https://myfundedfutures.com/plans/rapid-eod',
  pro: 'https://myfundedfutures.com/plans/pro',
  builder: 'https://myfundedfutures.com/plans/builder',
  coupons: 'https://myfundedfutures.com/coupons',
  terms: 'https://myfundedfutures.com/terms',
  termsMarketing: 'https://marketing.myfundedfutures.com/terms',
  trustpilot: 'https://www.trustpilot.com/review/myfundedfutures.com',
  restricted: `${HELP}8229993-restricted-countries-policy`,
  kyc: `${HELP}9717961-kyc-aml-policies`,
  consistency: `${HELP}11994562-consistency-rule-at-my-fundedfutures`,
  news: `${HELP}8230009-news-trading-policy`,
  session: `${HELP}9558251-permitted-times-to-trade`,
  fairPlay: `${HELP}8444599-fair-play-and-prohibited-trading-practices`,
  platforms: `${HELP}8528335-overview-of-supported-platforms-at-mffu`,
  payments: `${HELP}17339138-accepted-payment-methods`,
  firstPayout: `${HELP}11542406-guide-to-your-first-payout-quick-and-easy-process`,
  payoutOverview: `${HELP}13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts`,
  oneTime: `${HELP}16596524-inactivity-rule-one-time-payment-model`,
  activation: `${HELP}12398151-does-myfundedfutures-charge-activation-fees`,
  rapidFirstPayout: `${HELP}13134709-rapid-plan-50k-a-comprehensive-look`,
  refunds: `${HELP}11542523-refund-cancellation-policy-transparent-and-trader-first`,
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
const usd = (value: number) =>
  `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, ' ')}`

type PriceRow = {
  size: string
  rapid: number | null
  rapidEod: number | null
  pro: number | null
  builder: number | null
}

/** List prices USD, one-time, $0 activation — plan pages 04.11.2026. */
const PRICE_ROWS: PriceRow[] = [
  { size: '$25K', rapid: 145, rapidEod: 145, pro: null, builder: 105 },
  { size: '$50K', rapid: 209, rapidEod: 225, pro: 265, builder: 153 },
  { size: '$100K', rapid: 356, rapidEod: null, pro: 401, builder: 282 },
  { size: '$150K', rapid: 463, rapidEod: null, pro: 557, builder: 398 },
]
const cell = (value: number | null) => (value == null ? '—' : usd(value))

type ProgramRow = {
  key: string
  name: string
  href: string
  targets: string
  dd: string
  consistency: string
  days: string
  payout: string
}

const PROGRAMS: ProgramRow[] = [
  {
    key: 'rapid',
    name: 'Rapid',
    href: SOURCES.rapid,
    targets: '$1 500 / $3 000 / $6 000 / $9 000',
    dd: 'EOD на оценке; на sim-funded — intraday trailing; MLL locks at +$100',
    consistency: '50% (только оценка)',
    days: '2',
    payout: 'ежедневно; min $500; сплит 90/10; буфер $1 100–$4 600',
  },
  {
    key: 'rapid-eod',
    name: 'Rapid EOD',
    href: SOURCES.rapidEod,
    targets: '$1 500 / $3 000',
    dd: 'EOD trailing на оценке и sim-funded; locks at +$100',
    consistency: '30% (только оценка)',
    days: '4',
    payout: 'ежедневно; min $500 на странице плана; сплит 90/10',
  },
  {
    key: 'pro',
    name: 'Pro',
    href: SOURCES.pro,
    targets: '$3 000 / $6 000 / $9 000',
    dd: 'EOD; после первой выплаты MLL становится статическим (+$100 к балансу)',
    consistency: '50% (только оценка)',
    days: '2',
    payout: 'через 14 календарных дней; min $1 000; сплит 80/20; буфер $2 100–$4 600',
  },
  {
    key: 'builder',
    name: 'Builder',
    href: SOURCES.builder,
    targets: '$1 500 / $3 000 / $6 000 / $9 000',
    dd: 'EOD trailing; мягкий дневной лимит (soft pause)',
    consistency: 'нет на оценке; 50% на sim-funded',
    days: '1',
    payout: 'каждые 48 часов; сплит 80/20; лимит выплат за цикл',
  },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли пройти My Funded Futures из России?',
    a: `Нет. Справка фирмы «Restricted Countries Policy» (страница от ${ruDate(COUNTRIES_PAGE_MODIFIED)}, ${asOf(ACCESS_CHECKED)}) прямо называет Россию, Беларусь, Украину, Казахстан и Крым в списке ограничений. Трейдеры из этих стран не могут купить новый счёт или сделать reset, пока находятся там. Обход через VPN мы не советуем: при KYC это нарушение правил.`,
  },
  {
    q: 'Сколько стоит оценка MFF?',
    a: `Лист-цены ${asOf(PRICES_CHECKED)}, разовый взнос, активация $0: Rapid от ${usd(145)} до ${usd(463)}, Rapid EOD ${usd(145)} / ${usd(225)}, Pro от ${usd(265)} до ${usd(557)}, Builder от ${usd(105)} до ${usd(398)}. На странице только лист-цены; итоговую сумму смотрите при оформлении заказа. Универсального промокода для резидентов РФ нет — фирма в списке ограничений.`,
  },
  {
    q: 'Чем Rapid отличается от Rapid EOD / Flex / Pro?',
    a: `Rapid — intraday-trailing на sim-funded, consistency 50%, минимум 2 дня, сплит 90%. Rapid EOD держит EOD-просадку и на funded, consistency 30%, минимум 4 дня, тоже 90%. Pro — EOD, consistency 50%, первая выплата через 14 дней, сплит 80%. Builder — без consistency на оценке, мягкий дневной лимит, сплит 80%. Flex в продаже не отображается (legacy; ${asOf(CHECKED)}).`,
  },
  {
    q: 'Какой сплит и как выводить?',
    a: `По продуктам: Rapid и Rapid EOD — 90/10, Pro и Builder — 80/20 (${asOf(CHECKED)}). Выплаты через Riseworks; ACH/Plaid — только для трейдеров из США. Дальше — банковский перевод или криптовалюта. Обработка 6–12 рабочих часов (без праздников). KYC нужен до первой выплаты.`,
  },
  {
    q: 'На каких платформах можно торговать?',
    a: `NinjaTrader, Hyperprop, Tradovate, TradingView, Quantower, Volumetrica, DeepChart/DeepDom и ATAS — справка о платформах (статья от ${ruDate(PLATFORMS_UPDATED)}, ${asOf(CHECKED)}).`,
  },
  {
    q: 'Чем заменить MFF трейдеру из РФ?',
    a: `У BrightFunded России нет в списке ограничений (на ${ruNotListedDate('bright-funded')}), у Crypto Fund Trader — тоже (на ${ruNotListedDate('crypto-fund-trader')}). Это CFD- и крипто-программы, а не биржевые фьючерсы CME: просадка, часы и выплаты другие. Страну, KYC и способ выплаты сверяйте до оплаты.`,
  },
]

export default function RussianMyFundedFuturesReviewPage() {
  const mffStatus = russiaStatusFor('my-funded-futures')
  const fresh = isChallengeFresh({ sourceCapturedAt: CHECKED })
  const dateModified = russianRouteDateModified(PATH)
  const bright = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const brightSplit = bright.map(product => product.profitSplitPct).find(value => value != null)
  const brightFirm = getAllFirms().find(firm => firm.name === 'BrightFunded') as
    | { futuresCountriesRestrictedPageDate?: string; futuresCountriesRestrictedSourceUrl?: string }
    | undefined
  const brightFuturesDate = brightFirm?.futuresCountriesRestrictedPageDate ?? null
  const brightFuturesUrl = brightFirm?.futuresCountriesRestrictedSourceUrl ?? null
  const closedHref = ruClosedFirmsHref()

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор My Funded Futures' },
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
    <a href={href} target="_blank" rel="nofollow noopener noreferrer">
      {label}
    </a>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {fresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-review="my-funded-futures" data-russia-status-my-funded-futures={mffStatus}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
            {' / '}
            Обзор My Funded Futures
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Проверено {ruDate(CHECKED)} по официальным страницам
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            My Funded Futures (MFF / MFFU) — фьючерсный проп с оценками Rapid, Rapid EOD, Pro и Builder, сплитом до
            90% и выплатами через Riseworks. Для трейдеров из России главное другое: Россия стоит в списке ограничений
            фирмы. Ниже — цены и правила по данным на {ruDate(CHECKED)}, и чем фирму заменить, если вы торгуете из РФ.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-mff-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat">
              <strong>{PROGRAMS.length}</strong>
              <span>планов в продаже</span>
            </div>
            <div className="ru-stat">
              <strong>{usd(105)}</strong>
              <span>минимальная лист-цена (Builder $25K)</span>
            </div>
            <div className="ru-stat">
              <strong>80–90%</strong>
              <span>доля трейдера</span>
            </div>
            <div className="ru-stat">
              <strong>8</strong>
              <span>платформ</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ru-section ru-p1-verdict-section">
        <div className="ru-shell">
          <div
            className="ru-p1-verdict"
            data-ru-verdict={PATH}
            data-russian-mff-verdict-box="info-only"
            aria-labelledby="ru-verdict-title"
          >
            <div className="ru-p1-verdict__head">
              <div>
                <p id="ru-verdict-title" className="ru-p1-verdict__name">
                  My Funded Futures
                </p>
              </div>
            </div>
            <p className="ru-p1-verdict__line">
              MFF — фьючерсный проп под CME-контракты: разовый взнос с {ruDate(ONE_TIME_FROM)}, активация $0, EOD- или
              intraday-просадка по плану, consistency 30–50% на оценке и выплаты через Riseworks. Но Россия, Беларусь,
              Украина, Казахстан и Крым названы в справке «Restricted Countries Policy» прямо. Для резидента РФ это
              справочный обзор, а не рекомендация к покупке. Если вы торгуете из России, смотрите альтернативы ниже:
              BrightFunded и Crypto Fund Trader — с оговоркой, что это CFD/крипта, а не биржевые фьючерсы.
            </p>
            <div className="ru-p1-cta ru-p1-cta--compact" data-russian-mff-cta="verdict-box">
              <RuGoLink
                firm="my-funded-futures"
                href="/go/my-funded-futures?from=ru-mff-review-verdict-box"
                prefetch={false}
                rel={goLinkRel('my-funded-futures')}
                target="_blank"
                className="btn-outline"
                data-ru-verdict-cta="my-funded-futures"
              >
                Официальный сайт My Funded Futures <ExternalLink size={13} aria-hidden="true" />
              </RuGoLink>
              <span className="ru-p1-cta__note">
                Официальный сайт · без партнёрского соглашения · для резидентов других стран
              </span>
            </div>
            <div className="ru-p1-verdict__fit">
              <div>
                <p className="ru-p1-verdict__h">Подойдёт, если…</p>
                <ul>
                  <li>вы живёте не в стране из списка ограничений и проходите KYC;</li>
                  <li>нужны CME-фьючерсы, а не CFD, и понятный EOD/intraday лимит;</li>
                  <li>важна выплата через Riseworks с обработкой за 6–12 рабочих часов.</li>
                </ul>
              </div>
              <div>
                <p className="ru-p1-verdict__h">Не подойдёт, если…</p>
                <ul>
                  <li>вы резидент России, Беларуси, Украины, Казахстана или Крыма;</li>
                  <li>нужно держать позиции overnight или на выходные;</li>
                  <li>вы копируете сделки между чужими счетами или ищете HFT.</li>
                </ul>
              </div>
            </div>
            <p className="ru-p1-verdict__checked">
              <a href="#sources">✓ Данные проверены {ruDate(CHECKED)}</a> · У сайта нет партнёрского договора с My Funded
              Futures.
            </p>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-mff-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора My Funded Futures">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li>
                  <a href="#verdict">Коротко: доступ из России</a>
                </li>
                <li>
                  <a href="#company">Компания</a>
                </li>
                <li>
                  <a href="#programs">Программы и цены</a>
                </li>
                <li>
                  <a href="#example">Пример: Rapid $50K</a>
                </li>
                <li>
                  <a href="#rules">Правила торговли</a>
                </li>
                <li>
                  <a href="#payouts">Выплаты и сплит</a>
                </li>
                <li>
                  <a href="#platforms">Платформы и оплата</a>
                </li>
                <li>
                  <a href="#reviews">Отзывы</a>
                </li>
                <li>
                  <a href="#compare">Альтернативы</a>
                </li>
                <li>
                  <a href="#sources">Источники</a>
                </li>
                <li>
                  <a href="#faq">Частые вопросы</a>
                </li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-mff-verdict="summary">
            <h2>Коротко: доступна ли My Funded Futures из России</h2>
            <div className="ru-notice" data-russian-mff-access={mffStatus}>
              <RuAccessBadgeView firm="my-funded-futures" status={mffStatus} hint={false} />{' '}
              Справка «Restricted Countries Policy» (страница от {ruDate(COUNTRIES_PAGE_MODIFIED)},{' '}
              {asOf(ACCESS_CHECKED)}) пишет, что фирма не принимает трейдеров из перечисленных стран из‑за регуляторных и
              compliance-ограничений. В списке — Россия, Беларусь, Украина, Казахстан и Крым (всего 90 позиций). Та же
              статья уточняет: торговать, находясь в стране из списка, формально можно, но купить новый счёт или сделать
              reset — нельзя. Статья о KYC/AML (от {ruDate(KYC_UPDATED)}) повторяет список и добавляет критерий
              гражданства или резидентства.
            </div>
            <p>
              Советов по обходу ограничений мы не даём. Русский язык ≠ доступ: даже если интерфейс или чаты понятны,
              решают список стран, KYC и условия. Чем в целом отличаются проп-фирмы для русскоязычных — в нашем{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">гиде для русскоязычных трейдеров</Link>.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="my-funded-futures-review">
              <strong>Раскрытие.</strong> У сайта нет партнёрского договора с My Funded Futures. Кнопка «официальный
              сайт» ведёт через /go/my-funded-futures на myfundedfutures.com без партнёрской атрибуции (info-only, не
              призыв к регистрации для резидентов РФ) и несёт бейдж доступа. Ссылка на BrightFunded в блоке альтернатив —
              партнёрская; ссылка на Crypto Fund Trader — обычная.
            </div>
            <div className="ru-actions" data-russian-mff-cta="verdict">
              <Link href="#compare" className="btn-primary">
                Альтернативы для трейдеров из РФ <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <RuGoLink
                firm="my-funded-futures"
                href="/go/my-funded-futures?from=ru-mff-review-verdict"
                rel={goLinkRel('my-funded-futures')}
                className="btn-outline"
              >
                Официальный сайт · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </div>
            <p className="ru-source-line">
              Ссылка на My Funded Futures не партнёрская: Traders Fund Hub не получает комиссию за этот переход.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.restricted, 'Restricted Countries Policy')}, {src(SOURCES.kyc, 'KYC/AML Policies')}{' '}
              — {asOf(ACCESS_CHECKED)}.
            </p>
          </div>
        </section>

        <RuTelegramBlock placement="obzor-my-funded-futures" />

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-mff-entity={CORPORATE_CHECKED}>
            <h2>Компания: кто стоит за My Funded Futures</h2>
            <p>
              Оператор — <strong>MyFunded Futures, LLC</strong>; применимое право — штат Техас (Collin County). Год
              основания в наших данных — 2023. Юридический адрес офиса на сайте не указано ({asOf(CORPORATE_CHECKED)}): в
              Terms, privacy policy и связанных страницах адреса HQ нет.
            </p>
            <p>
              Отдельно от фьючерсного продукта существует MyFunded Perpetuals (Funding Perpetuals Holdings, Inc.) — это
              другая компания и другой продукт; в этот обзор она не входит. Что такое проп-модель на практике — в
              материале <Link href="/ru/prop-trejding">что такое проп трейдинг</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.termsMarketing, 'Terms')} ({asOf(CORPORATE_CHECKED)}), {src(SOURCES.home, 'сайт фирмы')} —{' '}
              {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted" data-russian-mff-prices={PRICES_CHECKED}>
              Лист-цены в долларах США {asOf(PRICES_CHECKED)} — со страниц планов (Product JSON-LD и встроенные данные).
              С {ruDate(ONE_TIME_FROM)} все новые оценки — разовый взнос; активация $0 на всех планах. На странице только
              лист-цены; итоговую сумму смотрите при оформлении заказа.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Лист-цены My Funded Futures">
              <table className="ru-table" data-russian-mff-price-table={PRICES_CHECKED}>
                <caption className="sr-only">Лист-цены My Funded Futures по размеру счёта</caption>
                <thead>
                  <tr>
                    <th>Счёт</th>
                    <th>Rapid</th>
                    <th>Rapid EOD</th>
                    <th>Pro</th>
                    <th>Builder</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_ROWS.map(row => (
                    <tr key={row.size}>
                      <th scope="row">{row.size}</th>
                      <td>{cell(row.rapid)}</td>
                      <td>{cell(row.rapidEod)}</td>
                      <td>{cell(row.pro)}</td>
                      <td>{cell(row.builder)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы My Funded Futures">
              <table className="ru-table" data-russian-mff-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы My Funded Futures: цели, просадка, consistency, дни, выплаты</caption>
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Цели (по размерам)</th>
                    <th>Просадка</th>
                    <th>Consistency</th>
                    <th>Мин. дней</th>
                    <th>Выплата / сплит</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-mff-product={program.key}>
                      <td>
                        <strong>{src(program.href, program.name)}</strong>
                      </td>
                      <td>{program.targets}</td>
                      <td>{program.dd}</td>
                      <td>{program.consistency}</td>
                      <td>{program.days}</td>
                      <td>{program.payout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ru-shell ru-content">
            <p data-russian-mff-legacy="flex">
              <strong>Flex.</strong> В навигации и sitemap планов Flex нет; в справке статья называется «Flex Plan — The
              Path Forward (Legacy)». В продаже не отображается ({asOf(CHECKED)}) — цены Flex как текущего предложения мы
              не приводим.
            </p>
            <p data-russian-mff-codes={COUPONS_LISTED}>
              Коды CLUB (40%, без даты окончания в данных страницы) и FIFTYOFF (50% для новых клиентов, до начала
              02.01.2027 по данным страницы) указаны на официальной странице купонов на {ruDate(COUPONS_LISTED)}. Мы не
              проверяли их в корзине и не считаем скидочные цены; в CTA их нет. Для резидента РФ это всё равно не путь к
              покупке — фирма в списке ограничений.
            </p>
            <p data-russian-mff-conflicts={CHECKED}>
              <strong>Где страницы фирмы расходятся.</strong> База consistency описана и как доля от прибыли оценки, и как
              доля от цели прибыли — условия расходятся, уточните у поддержки. У Rapid EOD $25K на странице плана рядом
              стоят min payout $500 и порог «net profit since last payout $250» — условия расходятся, уточните у
              поддержки. Обзор выплат в справке всё ещё описывает Builder в урезанном виде против актуальной страницы
              плана. Условия расходятся, уточните у поддержки. Цены add-on (Pro One Day,
              Builder 50K) и reset на сайте не указано.
            </p>
            <p>
              Как устроены цели, просадка и дни оценки в целом — в гиде{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работают челленджи проп-фирм</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.rapid, 'Rapid')}, {src(SOURCES.rapidEod, 'Rapid EOD')}, {src(SOURCES.pro, 'Pro')},{' '}
              {src(SOURCES.builder, 'Builder')}, {src(SOURCES.oneTime, 'one-time payment')}, {src(SOURCES.activation, 'activation fee')},{' '}
              {src(SOURCES.coupons, 'coupons')} — {asOf(COUPONS_LISTED)}; лист-цены — {asOf(PRICES_CHECKED)}; правила перечитаны {asOf(RULES_RECHECKED)} без
              изменений цифр.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-mff-example="rapid-50k">
            <h2>Пример пути: Rapid $50K</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цена {asOf(PRICES_CHECKED)} и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li>
                <strong>Взнос:</strong> {usd(209)} разово, активация $0. Лист-цена; итоговую сумму смотрите при оформлении
                заказа.
              </li>
              <li>
                <strong>Оценка:</strong> цель {usd(3_000)}; max loss (EOD) {usd(2_000)}; дневного лимита нет; consistency
                50% (только оценка); минимум 2 торговых дня; T1-новости на оценке разрешены.
              </li>
              <li>
                <strong>Consistency:</strong> ни один день не должен дать больше 50% прибыли оценки — при базе от цели это
                не больше {usd(1_500)} в день из {usd(3_000)}. Превышение само по себе счёт не ломает: нужно доторговать
                дополнительные дни. База расчёта на страницах фирмы описана по-разному — условия расходятся, уточните у
                поддержки.
              </li>
              <li>
                <strong>Sim-funded:</strong> intraday trailing {usd(2_000)}, MLL locks at +$100; до 5 mini / 50 micro;
                T1-новости запрещены; буфер до первой и следующих выплат — {usd(2_100)}.
              </li>
              <li>
                <strong>Первая выплата:</strong> через 24 часа после первой сделки на sim-funded (если выполнены буфер и
                минимум); далее — ежедневно, min {usd(500)}, сплит 90/10.
              </li>
              <li>
                <strong>Live (Rapid Live):</strong> переход при {usd(10_000)} чистой прибыли за один день или по решению
                Risk-команды; старт с $0, EOD MLL, сплит 90/10.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.rapid, 'Rapid plan')}, {src(SOURCES.rapidFirstPayout, 'Rapid first payout')},{' '}
              {src(SOURCES.consistency, 'consistency rule')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-mff-rules={RULES_RECHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li>
                <strong>Новости (T1):</strong> FOMC, minutes, Employment Report, CPI; EIA для энергии; сельхозрелизы. Нельзя
                держать позиции и ордера (включая лимитные) за 2 минуты до и после релиза. На оценке и на Builder — можно;
                на Rapid / Rapid EOD / Pro sim-funded — нельзя (справка от {ruDate(NEWS_HELP_UPDATED)}).
              </li>
              <li>
                <strong>Overnight / выходные:</strong> сессия с 18:00 EST (открытие Globex) до закрытия NY в 16:10 EST;
                открытые позиции закрываются автоматически в 16:10 EST в обычный день. Overnight и weekend holding нет
                (справка от {ruDate(SESSION_HELP_UPDATED)}).
              </li>
              <li>
                <strong>Автоматизация / EA:</strong> HFT запрещён. Свои автоматизированные стратегии с индивидуальными
                настройками допустимы, если они не эксплуатируют fills симулятора. С 30.10.2026 Fair Play отдельно
                запрещает прибыль на изолированных/устаревших fills в неликвидных контрактах и в часы низкой ликвидности
                (статья обновлена {ruDate(FAIR_PLAY_UPDATED)}).
              </li>
              <li>
                <strong>Копирование:</strong> копировать сделки друг друга (вход, выход, отмена) нельзя; совместные
                одинаковые или зеркальные стратегии на несвязанных счетах запрещены. Про копирование между своими счетами
                на сайте не указано.
              </li>
              <li>
                <strong>Хеджирование:</strong> запрещено в любом виде (в том числе NQ/MNQ на одном underlying).
              </li>
              <li>
                <strong>Неактивность:</strong> 7 календарных дней без сделки — счёт могут закрыть (в том числе sim-funded
                на разовом взносе).
              </li>
              <li>
                <strong>Возврат:</strong> полный refund, если после покупки не было сделок и запрос подан в течение 14
                дней; покупки за криптовалюту невозвратны.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.news, 'news trading')}, {src(SOURCES.session, 'trading hours')},{' '}
              {src(SOURCES.fairPlay, 'Fair Play')}, {src(SOURCES.consistency, 'consistency')}, {src(SOURCES.refunds, 'refunds')} —{' '}
              {asOf(CHECKED)}; перечитано {ruDate(RULES_RECHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-mff-payouts={CHECKED}>
            <h2>Выплаты и сплит</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат My Funded Futures">
              <table className="ru-table">
                <caption className="sr-only">Сплит, циклы и способы выплат My Funded Futures</caption>
                <tbody>
                  <tr>
                    <th scope="row">Сплит</th>
                    <td>Rapid / Rapid EOD — 90/10; Pro / Builder — 80/20 (заголовок фирмы — до 90%)</td>
                  </tr>
                  <tr>
                    <th scope="row">Rapid</th>
                    <td>
                      ежедневно; min {usd(500)}; буфер {usd(1_100)}–{usd(4_600)}; первая выплата через 24 часа после первой
                      сделки на sim-funded
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Rapid EOD</th>
                    <td>
                      ежедневно; min {usd(500)} на странице плана; порог net profit since last payout {usd(250)} /{' '}
                      {usd(500)} (25K / 50K) — условия расходятся, уточните у поддержки
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Pro</th>
                    <td>
                      14 календарных дней с дня первой сделки; буфер должен быть закрыт; min {usd(1_000)}; max{' '}
                      {usd(100_000)} на пользователя; в справке — вывод до 60% прибыли до полного закрытия буфера
                      (только в payout overview)
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Builder</th>
                    <td>каждые 48 часов; consistency 50% на sim-funded; лимиты max payout за цикл; до 5 sim-выплат</td>
                  </tr>
                  <tr>
                    <th scope="row">Способы</th>
                    <td>
                      Riseworks → банк или криптовалюта; ACH/Plaid — для трейдеров из США ({asOf('2026-10-26')})
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Срок</th>
                    <td>обработка 6–12 рабочих часов без праздников; многие заявки одобряют сразу</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              KYC обязателен до первой выплаты. Сравнить способы и сроки с другими фирмами можно в обзоре{' '}
              <Link href="/ru/vyplaty-prop-firm">как платят проп-компании</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.firstPayout, 'Guide to Your First Payout')}, {src(SOURCES.payoutOverview, 'Payout overview')},
              страницы планов — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content" data-russian-mff-platforms={CHECKED}>
            <h2>Платформы и способы оплаты</h2>
            <p>
              Платформы (справка от {ruDate(PLATFORMS_UPDATED)}): NinjaTrader, Hyperprop, Tradovate, TradingView,
              Quantower, Volumetrica, DeepChart/DeepDom, ATAS. Это фьючерсный стек под CME, а не MT5/cTrader.
            </p>
            <p>
              Оплата оценки (справка от {ruDate(PAYMENT_METHODS_UPDATED)}): банковская карта (Visa, Mastercard; Google Pay
              / Apple Pay — в отдельных штатах) и криптовалюта — ETH (ERC20/ARB), Litecoin, USDT (ERC20/TRC20/ARB/POL),
              USDC (ERC20/ARB/POL), SOL, POL, TRON. Карта должна быть на ваше имя. Криптовалюта не принимается из ряда
              стран (на странице — отдельный список; России в нём нет, но это не отменяет список ограничений на
              регистрацию). Покупки за криптовалюту невозвратны. Какие карты из РФ принимает корзина, на сайте не указано.
            </p>
            <p>
              Что меняется после прохождения оценки — в разделе о{' '}
              <Link href="/ru/funded-account">проп-счёте (funded account)</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.platforms, 'platforms')}, {src(SOURCES.payments, 'accepted payment methods')} —{' '}
              {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-mff-reviews="trustpilot-dated">
            <h2>Отзывы о My Funded Futures</h2>
            <p>
              На {src(SOURCES.trustpilot, 'Trustpilot')} последняя сохранённая оценка — 4,9 / 22 577 отзывов (
              {asOf(TRUSTPILOT_CHECKED)}). Повторно открыть страницу {ruDate(CHECKED)} через обычный запрос не удалось
              (ответ 403 / WAF). На своей странице /club фирма пишет «4.9 rating on Trustpilot» без числа отзывов — это
              заявление фирмы, не свежий захват Trustpilot. Непроверенные истории из чатов мы не пересказываем. Как
              отличать полезные отзывы от шума — в разборе <Link href="/ru/otzyvy-prop-firm">отзывов о проп-фирмах</Link>.
            </p>
            <p data-russian-mff-precheck="closed-firms">
              До оплаты любой фирмы проверьте, нет ли её в списке{' '}
              {closedHref ? <Link href={closedHref}>закрытых проп-фирм</Link> : 'закрытых проп-фирм'} — My Funded Futures в
              нём нет.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из России</h2>
            <p data-russian-mff-alt-basis="not-in-restricted-list">
              У BrightFunded в CFD-челлендже России нет в списке ограничений (на {ruNotListedDate('bright-funded')}), у
              Crypto Fund Trader — тоже нет (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия
              доступа. Статус BrightFunded относится к челленджу: фьючерсный продукт BrightFunded
              {brightFuturesDate ? ` (справка обновлена ${ruDate(brightFuturesDate)})` : ''} ограничивает Россию,
              Беларусь и Украину
              {brightFuturesUrl ? <> — {src(brightFuturesUrl, 'список стран BrightFunded Futures')}</> : null}. Прямой
              CME-замены MFF для резидента РФ в наших данных нет. Сводная таблица — в{' '}
              <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-mff-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-mff-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит {brightSplit != null ? `${brightSplit}%` : 'по программе'}; CFD-челлендж,
                  не CME-фьючерсы.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">
                    Обзор
                  </Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-mff-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-mff-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">
                    Обзор
                  </Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-mff-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p data-russian-mff-peer="topstep">
              Для контекста по фьючерсному пропу (тоже с ограничением для РФ, не как альтернатива для резидента РФ) —{' '}
              <Link href="/ru/obzor-topstep">обзор Topstep</Link>. Если важна криптовалюта —{' '}
              <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link>; если нужен счёт без оценки —{' '}
              <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирмы без челленджа</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li>
                    <strong>CME-фьючерсы</strong> и восемь платформ под этот рынок.
                  </li>
                  <li>
                    <strong>Разовый взнос и активация $0</strong> на всех текущих планах.
                  </li>
                  <li>
                    <strong>Сплит до 90%</strong> на Rapid / Rapid EOD и ежедневные выплаты на Rapid.
                  </li>
                  <li>
                    <strong>Выплата через Riseworks</strong> с обработкой 6–12 рабочих часов.
                  </li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li>
                    <strong>Россия в списке ограничений</strong> — вместе с BY, UA, KZ и Крымом.
                  </li>
                  <li>
                    <strong>Нет overnight / weekend</strong> — позиции закрывают в 16:10 EST.
                  </li>
                  <li>
                    <strong>Consistency и конфликты формулировок</strong> между help и страницами планов.
                  </li>
                  <li>
                    <strong>ACH только для США</strong>; остальным — Riseworks → банк или крипта.
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>
              Основной захват — {ruDate(CHECKED)} по официальным страницам My Funded Futures; правила планов перечитаны{' '}
              {ruDate(RULES_RECHECKED)} без изменения цифр.
            </p>
            <ul>
              <li>
                {src(SOURCES.restricted, 'Restricted Countries Policy')} (страница от {ruDate(COUNTRIES_PAGE_MODIFIED)}),{' '}
                {src(SOURCES.kyc, 'KYC/AML Policies')} (от {ruDate(KYC_UPDATED)}) — {asOf(ACCESS_CHECKED)}.
              </li>
              <li>
                {src(SOURCES.rapid, 'Rapid')}, {src(SOURCES.rapidEod, 'Rapid EOD')}, {src(SOURCES.pro, 'Pro')},{' '}
                {src(SOURCES.builder, 'Builder')}, {src(SOURCES.coupons, 'Coupons')} — {asOf(COUPONS_LISTED)}; лист-цены {asOf(PRICES_CHECKED)}.
              </li>
              <li>
                {src(SOURCES.consistency, 'Consistency rule')} (от {ruDate(CONSISTENCY_HELP_UPDATED)}),{' '}
                {src(SOURCES.news, 'News trading')} (от {ruDate(NEWS_HELP_UPDATED)}), {src(SOURCES.session, 'Trading hours')}{' '}
                (от {ruDate(SESSION_HELP_UPDATED)}), {src(SOURCES.fairPlay, 'Fair Play')} (обновлена{' '}
                {ruDate(FAIR_PLAY_UPDATED)}) — {asOf(CHECKED)} / {ruDate(RULES_RECHECKED)}.
              </li>
              <li>
                {src(SOURCES.firstPayout, 'First payout')}, {src(SOURCES.payoutOverview, 'Payout overview')},{' '}
                {src(SOURCES.payments, 'Payment methods')} (от {ruDate(PAYMENT_METHODS_UPDATED)}),{' '}
                {src(SOURCES.platforms, 'Platforms')} (от {ruDate(PLATFORMS_UPDATED)}) — {asOf(CHECKED)}.
              </li>
              <li>
                {src(SOURCES.termsMarketing, 'Terms')} — {asOf(CORPORATE_CHECKED)}; {src(SOURCES.trustpilot, 'Trustpilot')} —{' '}
                {asOf(TRUSTPILOT_CHECKED)} (повтор {ruDate(CHECKED)} — 403).
              </li>
            </ul>
            <p data-russian-mff-gaps={CHECKED}>
              На сайте не указано ({asOf(CHECKED)}): адрес HQ; цены add-on и reset; явное «discontinued» для Flex;
              копирование между своими счетами. Мы не регистрировались, не оплачивали оценку и не получали выплату от My
              Funded Futures.
            </p>
            <div className="ru-notice" data-russian-risk-disclaimer="my-funded-futures-review">
              <strong>Риск.</strong> Торговля фьючерсами с плечом связана с высоким риском. Большинство участников не
              проходит оценку, взнос после покупки обычно не возвращается. Счета на оценке и sim-funded — симулированные;
              вознаграждение выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <p className="ru-actions" data-russian-mff-cta="final" data-russian-mff-official="non-affiliate">
              <RuGoLink
                firm="bright-funded"
                href="/go/bright-funded?from=ru-mff-review-sources-bright-funded"
                rel={goLinkRel('bright-funded')}
                className="btn-primary"
              >
                Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
              </RuGoLink>
              <RuGoLink
                firm="my-funded-futures"
                href="/go/my-funded-futures?from=ru-mff-review-sources"
                rel={goLinkRel('my-funded-futures')}
                className="btn-outline"
              >
                Официальный сайт MFF, не партнёрская ссылка · для резидентов других стран{' '}
                <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </p>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о My Funded Futures</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
