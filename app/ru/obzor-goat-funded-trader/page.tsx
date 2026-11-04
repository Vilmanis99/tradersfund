import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { RuReviewVerdictBox } from '@/components/RuVerdict'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { ruNotListedDate } from '@/lib/ruBasisWording'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-goat-funded-trader'
const TITLE = 'Goat Funded Trader: обзор 2026 — правила и доступ из России'
const H1 = 'Goat Funded Trader: обзор и отзывы 2026'
const DESCRIPTION = 'Goat Funded Trader на русском: программы, цены и правила, платформы MT5, cTrader, Match-Trader, TradeLocker и Volumetrica. Россия в списке ограничений.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['goat funded trader', 'goat funded trader отзывы', 'goat funded trader обзор', 'гоат фандед трейдер', 'goat funded trader россия'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker final capture /workspace/ru-data/2026-10-27-goat-funded-trader-final.md
 * (+ interim 2026-10-26) and content/data/challenges/_captures/goat-funded-trader-2026-10-27.json;
 * list prices re-checked 02.11.2026 (evidence goat-2026-11-02/premium-price-diff-2026-11-02.md);
 * restricted-countries list re-checked 30.10.2026 (evidence goat-2026-10-30/VERDICT.md).
 * Goat is only in firms-pending.json (russiaStatus 'restricted'): info-only page, no /go route, no affiliate,
 * official link nofollow and below the alternatives. List prices only; the discount depends on the current code.
 */
const CHECKED = '2026-10-27'
const RESTRICTED_LIST_UPDATED = '2026-10-01'
const DATE_PUBLISHED = '2026-11-02'
/** Tracker price re-check 02.11.2026 (evidence goat-2026-11-02/premium-price-diff-2026-11-02.md): Instant Premium list prices up; Blitz not in selector. Access still 30.10.2026. */
const PRICES_CHECKED = '2026-11-02'
const ACCESS_CHECKED = '2026-10-30'

const HELP = 'https://help.goatfundedtrader.com/en/articles/'
const SOURCES = {
  home: 'https://www.goatfundedtrader.com/',
  model: 'https://www.goatfundedtrader.com/model',
  terms: 'https://www.goatfundedtrader.com/legal/terms-and-conditions',
  restricted: `${HELP}10742187-which-countries-are-restricted-at-goat-funded-trader`,
  ip: `${HELP}10742103-ip-address-and-account-access-policy`,
  launch: `${HELP}10742292-one-of-the-most-established-and-trusted-firms-in-the-industry`,
  hq: `${HELP}10743315-based-in-one-of-the-world-s-leading-financial-hubs`,
  maxCapital: `${HELP}10742191-what-is-the-maximum-simulated-capital-you-can-have-with-goatfundedtrader`,
  oneStep: `${HELP}10630134-1-step-model`,
  twoStepStandard: `${HELP}13575169-2-step-standard`,
  twoStepGoat: `${HELP}13575348-2-step-goat-model`,
  twoStepPro: `${HELP}13778401-2-step-pro-model`,
  promo100k: `${HELP}17593946-2-step-promo-100k`,
  threeStep: `${HELP}10630343-3-step-model`,
  instantGoat: `${HELP}13574117-instant-funding-goat-model`,
  instantPro: `${HELP}13574328-instant-funding-pro-model`,
  instantPremium: `${HELP}16013484-instant-premium-model`,
  instantHero: `${HELP}16097387-instant-hero-model`,
  instantDaily: `${HELP}17677256-instant-daily-model`,
  stride: `${HELP}17333437-goat-stride-model`,
  blitz: `${HELP}11111955-goat-blitz-model`,
  oneDollar: `${HELP}11769239-goat-1-model`,
  payLater: `${HELP}12822025-pay-later-model`,
  profitableDays: `${HELP}13860595-what-are-the-minimum-profitable-days`,
  payouts: `${HELP}10742264-how-payouts-work-eligibility-request-processing-and-arrival`,
  refund: `${HELP}11036447-is-the-evaluation-fee-refundable`,
  kyc: `${HELP}15949678-identity-verification-kyc-what-to-expect`,
  prohibited: `${HELP}10742118-what-are-prohibited-trading-practices`,
  goatGuard: `${HELP}10742107-what-is-goat-guard`,
  riskLimit: `${HELP}10742114-risk-limitation-policy`,
  holding: `${HELP}12849041-what-is-the-minimum-holding-time-for-trades`,
  copier: `${HELP}17594664-goat-trade-copier-how-it-works-and-what-it-costs`,
  news: `${HELP}10742084-is-news-trading-allowed`,
  weekend: `${HELP}10742082-can-i-hold-trades-over-the-weekend`,
  weekendGap: `${HELP}14123389-do-you-allow-trading-the-weekend-gap`,
  eas: `${HELP}10749630-can-i-use-expert-advisors-eas`,
  inactivity: `${HELP}10742197-is-there-any-inactivity-limit`,
  swapFree: `${HELP}15073594-do-you-offer-islamic-or-swap-free-accounts`,
  leverage: `${HELP}10741910-what-is-the-account-leverage`,
  platforms: `${HELP}10741900-which-platforms-can-i-trade-on`,
  paymentMethods: `${HELP}7208485-what-payment-methods-do-you-accept`,
  resets: `${HELP}15948316-how-do-resets-work`,
  scaling: `${HELP}10831213-how-does-the-scaling-plan-work`,
  tradingPilot: 'https://tradingpilot.com/firms/goat-funded-trader',
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
/** RU thousand separator: plain space ($1 198). */
const usd = (value: number) => `$${value.toLocaleString('en-US').replace(/,/g, ' ')}`
const prices = (rows: Array<[string, number]>) => rows.map(([size, price]) => `${size} — ${usd(price)}`).join(' · ')

type ProgramRow = { key: string; name: string; href: string; rules: string; payout: string; price: string }

/** On sale per /model and the help articles (27.10.2026). List prices from the /model page code. */
const PROGRAMS: ProgramRow[] = [
  {
    key: '1-step',
    name: '1-Step',
    href: SOURCES.oneStep,
    rules: 'цель 10%; дневной 4% (3% для покупок с 01.08.2026); макс. 6% статический; на funded 3 прибыльных дня (4 для покупок с 27.07.2026), не больше $3 000 прибыли в день',
    payout: '80% / 14 дней',
    price: prices([['$5K', 74], ['$10K', 114], ['$25K', 214], ['$50K', 314], ['$100K', 530], ['$200K', 914]]),
  },
  {
    key: '2-step-standard',
    name: '2-Step Standard',
    href: SOURCES.twoStepStandard,
    rules: 'цели 10% → 5%; дневной 5% от большего из баланса и эквити на 17:00 EST; макс. 10% статический; 3 прибыльных дня на этап; на funded 4 дня (покупки с 25.07.2026) и Goat Guard',
    payout: '80% / 14 дней',
    price: prices([['$5K', 52], ['$10K', 90], ['$25K', 234], ['$50K', 358], ['$100K', 628], ['$200K', 1_198]]),
  },
  {
    key: '2-step-goat',
    name: '2-Step GOAT',
    href: SOURCES.twoStepGoat,
    rules: 'цели 8% → 6%; дневной 4%; макс. 10% статический',
    payout: '80% / 14 дней',
    price: prices([['$5K', 36], ['$10K', 65], ['$25K', 158], ['$50K', 308], ['$100K', 478], ['$150K', 758]]),
  },
  {
    key: '2-step-promo-100k',
    name: '2 Step Promo 100k',
    href: SOURCES.promo100k,
    rules: 'цели 10% → 5%; дневной 3%; макс. 8% статический; на funded плавающий убыток 1%, consistency 40%, потолок $2 000 за выплату',
    payout: '80%',
    price: `$100K — ${usd(99)} (цена из справки; коды скидок не действуют)`,
  },
  {
    key: 'instant-goat',
    name: 'Instant GOAT',
    href: SOURCES.instantGoat,
    rules: 'без этапов; дневной 3%; 6% trailing (фиксируется на начальном балансе); плавающий убыток 2%; consistency 15%; 5 прибыльных дней',
    payout: '80% (100% — платная опция) / 14 дней',
    price: prices([['$5K', 108], ['$10K', 158], ['$25K', 318], ['$50K', 488], ['$100K', 815], ['$200K', 1_663], ['$300K', 2_398], ['$400K', 2_998]]),
  },
  {
    key: 'instant-hero',
    name: 'Instant HERO',
    href: SOURCES.instantHero,
    rules: 'без этапов; дневной 3%; 5% trailing; плавающий убыток 1%; consistency 15%; 6 прибыльных дней',
    payout: '90% (100% — платная опция) / 14 дней',
    price: prices([['$5K', 58], ['$10K', 107], ['$15K', 157], ['$25K', 240], ['$50K', 357], ['$100K', 657], ['$200K', 1_157], ['$300K', 1_663], ['$400K', 2_330]]),
  },
  {
    key: 'instant-premium',
    name: 'Instant Premium',
    href: SOURCES.instantPremium,
    rules: 'без этапов; дневной 3%; 6% внутридневной trailing; плавающий убыток 1% (для покупок с 02.09.2026, раньше 1,5%); без consistency; 5 прибыльных дней',
    payout: '80% / 14 дней (для покупок с 21.09.2026, раньше 10)',
    price: prices([['$5K', 196], ['$10K', 396], ['$15K', 516], ['$25K', 716], ['$50K', 1_036], ['$100K', 1_656], ['$150K', 2_696]]),
  },
  {
    key: 'instant-daily',
    name: 'Instant Daily',
    href: SOURCES.instantDaily,
    rules: 'без цели и без дневного лимита; 3% trailing (фиксируется на начальном балансе, в том числе после первой выплаты); плавающий убыток 1%; без consistency; счёт живёт 30 дней',
    payout: 'заявка каждый день на 1–3% от начального баланса; сплит 60% (1–2-я) → 70% (3–4-я) → 80% (с 5-й)',
    price: prices([['$1K', 30], ['$2,5K', 78], ['$5K', 138], ['$10K', 258], ['$25K', 598], ['$50K', 998]]),
  },
  {
    key: 'goat-blitz',
    name: 'GOAT Blitz',
    href: SOURCES.blitz,
    rules: 'цель 3%; дневной 3%; 5% trailing; плавающий убыток 2% — жёсткое нарушение; 5 прибыльных дней; на funded consistency 15%; продаётся только в два «случайных» уикенда в месяц',
    payout: '80%',
    price: 'сезонная, цены на 30.10.2026 — на 02.11.2026 в селекторе не отображается',
  },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Работает ли Goat Funded Trader в России?',
    a: `Нет. В справке фирмы (статья обновлена ${ruDate(RESTRICTED_LIST_UPDATED)}, ${asOf(ACCESS_CHECKED)}) Россия, Беларусь и Украина входят в список из 32 стран, где «нельзя создать аккаунт или пользоваться платформой». Казахстана в этом списке нет. Русский язык интерфейса или поддержки не означает доступ.`,
  },
  {
    q: 'Можно ли гражданину РФ, который живёт в другой стране?',
    a: 'Список сформулирован через нахождение в стране («if you’re in any of the above list of restricted countries»), а отдельного правила для гражданства в проверенных статьях нет — на сайте не указано. При этом политика IP требует, чтобы регион покупки и регион торговли совпадали, а поездки — заранее согласовывать с поддержкой. До оплаты задайте вопрос поддержке письменно и сохраните ответ.',
  },
  {
    q: 'Сколько стоит челлендж Goat Funded Trader?',
    a: `Лист-цены ${asOf(PRICES_CHECKED)}: 2-Step GOAT от ${usd(36)} ($5K), 2-Step Standard от ${usd(52)}, 1-Step от ${usd(74)}, Instant Daily от ${usd(30)} ($1K), самый дорогой — Instant GOAT $400K за ${usd(2_998)}. Скидка зависит от действующего промокода; итоговую цену видно только при оформлении заказа.`,
  },
  {
    q: 'Как выводить прибыль и сколько удерживают?',
    a: `Способы — Rise (без лимита), Skrill (до ${usd(5_000)} за выплату), криптовалюта (до ${usd(3_000)}) и банковский перевод (до ${usd(10_000)}, только для восьми африканских стран). Минимум — ${usd(100)} (у Instant Daily — 1–3% от начального баланса). С каждой выплаты после сплита удерживается сбор 3%. Первые две выплаты ограничены меньшим из 6% начального баланса и ${usd(10_000)}.`,
  },
  {
    q: 'Возвращают ли взнос?',
    a: 'Справка обещает вернуть взнос вместе с 4-й выплатой, а п. 7.4 условий говорит, что возвратов за купленные услуги нет. Условия расходятся, уточните у поддержки.',
  },
  {
    q: 'Какие есть альтернативы для трейдеров из России?',
    a: `У BrightFunded России нет в списке ограничений (на ${ruNotListedDate('bright-funded')}), у Crypto Fund Trader — тоже (на ${ruNotListedDate('crypto-fund-trader')}). Это не гарантия доступа: страну, KYC и способ выплаты всё равно сверяйте до оплаты.`,
  },
]

export default function RussianGoatFundedTraderReviewPage() {
  const goatStatus = russiaStatusFor('goat-funded-trader')
  const fresh = isChallengeFresh({ sourceCapturedAt: CHECKED })
  const dateModified = russianRouteDateModified(PATH)
  const bright = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const brightSplit = bright.map(product => product.profitSplitPct).find(value => value != null)
  const brightFrequency = bright.map(product => product.payoutFrequency).find(Boolean)
  const frequencyRu: Record<string, string> = { 'bi-weekly': 'раз в 2 недели', weekly: 'еженедельно', monthly: 'ежемесячно', 'on-demand': 'по запросу' }
  const closedHref = ruClosedFirmsHref()

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Goat Funded Trader' },
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
        <div className="ru-shell" data-russian-review="goat-funded-trader" data-russia-status-goat-funded-trader={goatStatus}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
            {' / '}
            Обзор Goat Funded Trader
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Проверено {ruDate(CHECKED)} по официальным страницам
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Goat Funded Trader (GFT) — проп-фирма с юрлицом в Гонконге и одной из самых широких линеек на рынке:
            1-Step, 2-Step, Instant-счета с ежедневными выплатами, сезонная GOAT Blitz и счёт за $1. Пять платформ,
            сплит 80–90%. Для трейдеров из России это обзор для справки: Россия входит в список стран, где фирма
            не разрешает регистрацию. Ниже — что записано на сайте и где его страницы расходятся.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-goat-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{PROGRAMS.length}</strong><span>моделей в продаже с ценой</span></div>
            <div className="ru-stat"><strong>{usd(30)}</strong><span>минимальная лист-цена (Instant Daily $1K)</span></div>
            <div className="ru-stat"><strong>80–90%</strong><span>доля трейдера</span></div>
            <div className="ru-stat"><strong>5</strong><span>платформ</span></div>
          </div>
        </div>
      </section>

      <RuReviewVerdictBox route={PATH} campaign="goat-funded-trader-review" sourcesHref="#sources" />

      <article className="ru-review-article" data-russian-goat-article="long-form">
        <RuTelegramBlock placement="obzor-goat-funded-trader" />
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Goat Funded Trader">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: доступ из России</a></li>
                <li><a href="#company">Компания</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#example">Пример: 2-Step Standard $100K</a></li>
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
          <div className="ru-shell ru-content" data-russian-goat-verdict="summary">
            <h2>Коротко: доступна ли Goat Funded Trader из России</h2>
            <div className="ru-notice" data-russian-goat-access={goatStatus}>
              <strong>Доступ из России:</strong> <RuAccessBadgeView firm="goat-funded-trader" status={goatStatus} />{' '}
              Россия в списке ограничений: справочная статья фирмы (обновлена {ruDate(RESTRICTED_LIST_UPDATED)},{' '}
              {asOf(ACCESS_CHECKED)}) называет 32 страны, в том числе Россию, Беларусь и Украину, где «нельзя создать аккаунт
              или пользоваться платформой». Казахстана в списке нет. Русский язык ≠ доступ: даже если интерфейс
              переведён, решает список стран.
            </div>
            <p>
              Если вы живёте не в стране из списка, GFT интересна выбором: пять платформ, классические 2-Step от{' '}
              {usd(36)} по лист-цене и редкая модель Instant Daily с ежедневной заявкой на выплату. Платить за это
              приходится жёсткими правилами: потолок первых двух выплат, сбор 3% с каждой выплаты, запрет VPN и VPS
              с 06.10.2026, правило «лучшая сделка не больше худшей» на новых funded-счетах. Трейдеру из России мы
              советуем смотреть сразу на альтернативы ниже — BrightFunded и Crypto Fund Trader.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="goat-funded-trader-review">
              <strong>Раскрытие.</strong> У сайта нет партнёрского договора с Goat Funded Trader, и на этой странице
              нет кнопки регистрации в GFT: ссылки на её сайт обычные, с nofollow. Ссылка на BrightFunded в блоке
              альтернатив — партнёрская; ссылка на Crypto Fund Trader — обычная.
            </div>
          </div>
        </section>

        <section className="ru-section" id="access">
          <div className="ru-shell ru-content" data-russian-goat-access-explainer={CHECKED}>
            <h2>Что значит ограничение для разных ситуаций</h2>
            <ul className="wp-block-list">
              <li>
                <strong>Резидент РФ, торгует из России.</strong> Регистрация и торговля по правилам фирмы недоступны.
              </li>
              <li>
                <strong>Гражданин РФ, живёт в Казахстане, Грузии, Армении, Сербии или ЕС.</strong> Формулировка списка
                привязана к нахождению в стране («if you’re in»), отдельного правила о гражданстве в проверенных
                статьях нет — на сайте не указано. Проверка личности (KYC через Veriff или Rise) проходит перед первой
                выплатой, поэтому вопрос лучше задать поддержке до оплаты и сохранить письменный ответ.
              </li>
              <li>
                <strong>Поездка в Россию с открытым счётом.</strong> Политика IP (обновлена 12.10.2026) требует, чтобы
                регион покупки и регион торговли совпадали, а о поездке — предупреждать поддержку заранее; фирма может
                запросить билеты, отметки в паспорте или видеоверификацию. Торговля из страны списка — отдельный риск
                для выплаты.
              </li>
              <li>
                <strong>VPN, VPS и прокси.</strong> С 06.10.2026 их использование во время торговли — прямое нарушение,
                а выплаты по такой торговле не положены. Исключения — VPN только для первого входа и копировщик GOAT
                Trade Copier. Советов по обходу ограничений мы не даём.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.restricted, 'список стран')}, {src(SOURCES.ip, 'политика IP')},{' '}
              {src(SOURCES.kyc, 'KYC')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-goat-entity={CHECKED}>
            <h2>Компания: юрлицо, страна, год запуска</h2>
            <p>
              По п. 1.1 условий оператор — <strong>Wishes Tower International Limited</strong>, Гонконг, регистрационный
              номер 76428795, адрес Room 2007, 20/F, Futura Plaza, 111-113 How Ming Street, Kwun Tong. В подвале сайта
              дополнительно указана <strong>Goat Funded LTD</strong> (Сент-Люсия, номер 2025-00240). Справка называет
              штаб-квартирой Гонконг и датой запуска — май 2023 года. Максимальный совокупный капитал на одного
              трейдера — {usd(400_000)}. Любопытная деталь: сам Гонконг тоже входит в список стран, откуда регистрация закрыта.
            </p>
            <p>
              Споры по п. 15.1 условий передаются в арбитраж с формулировкой «high Court of Justice of Canary Islands» —
              цитируем как есть: связь гонконгского юрлица с Канарскими островами на сайте не объяснена. Пункт 7.5
              позволяет фирме ограничивать продажи по регионам. Счета на всех этапах — симулированные.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.terms, 'Terms §1.1, §7.5, §15.1')}, {src(SOURCES.home, 'подвал сайта')},{' '}
              {src(SOURCES.hq, 'справка о штаб-квартире')}, {src(SOURCES.launch, 'справка о запуске')},{' '}
              {src(SOURCES.maxCapital, 'максимальный капитал')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted" data-russian-goat-prices={PRICES_CHECKED}>
              Лист-цены в долларах США {asOf(PRICES_CHECKED)} — со страницы моделей. Скидка зависит от действующего
              промокода; итоговую цену видно только при оформлении заказа, и мы её не печатаем.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы Goat Funded Trader">
              <table className="ru-table" data-russian-goat-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы Goat Funded Trader: правила, выплаты, лист-цены</caption>
                <thead>
                  <tr>
                    <th>Модель</th>
                    <th>Главные правила</th>
                    <th>Сплит / цикл</th>
                    <th>Лист-цены</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-goat-product={program.key}>
                      <td><strong>{src(program.href, program.name)}</strong></td>
                      <td>{program.rules}</td>
                      <td>{program.payout}</td>
                      <td>{program.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ru-shell ru-content">
            <h3>Instant Daily: новая модель с ежедневными выплатами</h3>
            <p data-russian-goat-instant-daily={CHECKED}>
              Статья об Instant Daily обновлена {ruDate(CHECKED)}. Цели и дневного лимита нет, общий лимит — 3% trailing,
              который фиксируется на начальном балансе. Первая заявка открывается через 24 часа после покупки, дальше —
              раз в день на 1–3% от начального баланса, сплит растёт с 60% до 80%. Счёт действует 30 дней, плечо ниже
              обычного (FX 1:50, индексы и сырьё 1:10, крипта 1:2), акция BOGO к нему не применяется. В самой статье
              напечатаны более низкие цены (от {usd(15)}), чем лист-цены на странице моделей: цена в корзине зависит от
              текущей акции.
            </p>
            <h3>Что снято с продажи или под вопросом</h3>
            <ul className="wp-block-list" data-russian-goat-retired={CHECKED}>
              <li><strong>3-Step</strong> — снята с продажи: в коде страницы моделей стоит пометка «retired» от 12.08.2026, цены нет ({src(SOURCES.threeStep, 'старая статья')} ещё открыта).</li>
              <li><strong>2-Step PRO</strong> — не продаётся с 13.06.2026 ({src(SOURCES.twoStepPro, 'справка')}).</li>
              <li><strong>Instant PRO</strong> (без дневного лимита, 4% trailing) и <strong>Goat Stride</strong> ($2 500, правила HERO, 90%) описаны в справке, но цены на странице моделей нет — продаются ли они сейчас, на сайте не указано.</li>
              <li><strong>Goat $1</strong> — счёт $1K за $1, один на человека, живёт 28 дней, выплатить можно не больше {usd(100)} за всё время ({src(SOURCES.oneDollar, 'справка')}).</li>
              <li><strong>Pay Later</strong> — вход {usd(5)}, активация после прохождения от {usd(78)} ($5K) до {usd(998)} ($200K); цель 4% (3% для покупок с 05.09.2026) ({src(SOURCES.payLater, 'справка')}).</li>
            </ul>
            <p>
              Как в целом устроены этапы оценки и почему статический лимит удобнее trailing — в{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде по челленджам</Link>. Если вы только знакомитесь
              с темой, начните с раздела <Link href="/ru/prop-trejding">что такое проп-трейдинг</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.model, 'страница моделей')}, справка по моделям ({src(SOURCES.instantDaily, 'Instant Daily')},{' '}
              {src(SOURCES.instantPro, 'Instant PRO')}, {src(SOURCES.stride, 'Stride')}, {src(SOURCES.promo100k, 'Promo 100k')}) — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-goat-example="2-step-standard-100k">
            <h2>Пример пути: 2-Step Standard $100K</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цена {asOf(PRICES_CHECKED)} и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li><strong>Взнос:</strong> {usd(628)} по лист-цене; с промокодом меньше, точную сумму показывает корзина.</li>
              <li><strong>Этап 1:</strong> цель 10% = {usd(10_000)}, минимум 3 прибыльных дня (прибыльный день — не меньше 0,5% начального баланса, то есть {usd(500)}).</li>
              <li><strong>Этап 2:</strong> цель 5% = {usd(5_000)}, снова минимум 3 прибыльных дня.</li>
              <li><strong>Дневной лимит:</strong> 5% от большего из баланса и эквити на 17:00 EST. Если на этот момент эквити {usd(102_000)}, пол на день — {usd(96_900)}.</li>
              <li><strong>Общий лимит:</strong> 10% статический — счёт нельзя опускать ниже {usd(90_000)}.</li>
              <li><strong>Funded:</strong> 4 прибыльных дня по {usd(500)}+ (для покупок с 25.07.2026); в зачёт идёт не больше {usd(3_000)} прибыли за день.</li>
              <li>
                <strong>Первая выплата:</strong> прибыль {usd(6_000)} укладывается в потолок первых двух выплат (меньшее из 6% =
                {' '}{usd(6_000)} и {usd(10_000)}). Сплит 80% → {usd(4_800)}, минус сбор 3% ({usd(144)}) → {usd(4_656)}.
                Через криптовалюту (до {usd(3_000)} за выплату) такую сумму не вывести — нужен Rise или Skrill.
              </li>
              <li><strong>Срок:</strong> до 2 рабочих дней после заявки; на первой выплате отсчёт начинается после KYC.</li>
              <li>
                <strong>Возврат взноса:</strong> справка обещает вернуть {usd(628)} (или уплаченную сумму) с 4-й выплатой,
                но п. 7.4 условий исключает любые возвраты. Условия расходятся, уточните у поддержки.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.twoStepStandard, '2-Step Standard')}, {src(SOURCES.profitableDays, 'прибыльные дни')},{' '}
              {src(SOURCES.payouts, 'выплаты')}, {src(SOURCES.refund, 'возврат взноса')}, {src(SOURCES.terms, 'Terms §7.4')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-goat-rules={CHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li><strong>Запрещено:</strong> хеджирование внутри счёта, между своими счетами и с другими людьми; сторонние советники; смена стратегии между оценкой и funded; копирование чужих сделок; мартингейл и сетка; ставка «всё или ничего»; эксплуатация задержек. Последствие — закрытие счёта без возврата и потеря прибыли.</li>
              <li><strong>Goat Guard:</strong> если совокупный плавающий убыток достигает 2%, при первом срабатывании сплит падает до 50%, при втором — нарушение. Не действует на Instant, Blitz и Pay Later.</li>
              <li><strong>Минимальное удержание:</strong> 60 секунд (для покупок с 06.10.2026, раньше 120); прибыль по более коротким сделкам снимают, но это не нарушение.</li>
              <li><strong>Новости:</strong> в окне ±5 минут вокруг «красных» новостей прибыль одной сделки ограничена 1% начального баланса.</li>
              <li><strong>Выходные:</strong> перенос позиций разрешён; на funded прибыль по сделкам, открытым в последние 3 часа пятницы и закрытым в первые 3 часа понедельника, снимают.</li>
              <li><strong>Советники и копирование:</strong> только собственные EA; копирование — только через GOAT Trade Copier за {usd(2)} в месяц за счёт (минимум {usd(4)}, оплата картой).</li>
              <li><strong>Неактивность:</strong> 30 дней без сделок — нарушение. Счетов без свопа нет.</li>
              <li><strong>Лучшая сделка не больше худшей:</strong> для funded-счетов, купленных с 08.10.2026, прибыль лучшей сделки не может превышать убыток худшей.</li>
              <li><strong>Плечо:</strong> на оценке FX 1:100, индексы и сырьё 1:20, крипта 1:2, акции 1:5; на funded FX 1:50, индексы и сырьё 1:10.</li>
              <li><strong>Сброс счёта:</strong> для покупок с 15.06.2026 можно купить reset и продолжить с этапа, где случилось нарушение. Цена — процент от исходной покупки (для 2-Step: −7% на этапе 1, +65% на этапе 2, +200% на funded); недоступно для Pay Later, Stride и funded-счетов после выплаты.</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.prohibited, 'запрещённые практики')}, {src(SOURCES.goatGuard, 'Goat Guard')},{' '}
              {src(SOURCES.riskLimit, 'ограничение риска')}, {src(SOURCES.holding, 'удержание')}, {src(SOURCES.news, 'новости')},{' '}
              {src(SOURCES.weekend, 'выходные')}, {src(SOURCES.weekendGap, 'гэп выходных')}, {src(SOURCES.eas, 'EA')},{' '}
              {src(SOURCES.copier, 'копировщик')}, {src(SOURCES.inactivity, 'неактивность')}, {src(SOURCES.swapFree, 'swap-free')},{' '}
              {src(SOURCES.leverage, 'плечо')}, {src(SOURCES.resets, 'сброс')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-goat-payouts={CHECKED}>
            <h2>Выплаты и сплит</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат Goat Funded Trader">
              <table className="ru-table">
                <caption className="sr-only">Способы, лимиты и сроки выплат Goat Funded Trader</caption>
                <tbody>
                  <tr><th scope="row">Сплит</th><td>80% (HERO и Stride — 90%; Instant Daily — 60–80%); до 95% по плану масштабирования</td></tr>
                  <tr><th scope="row">Минимум</th><td>{usd(100)}; у Instant Daily — 1–3% от начального баланса</td></tr>
                  <tr><th scope="row">Потолок первых двух выплат</th><td>меньшее из 6% начального баланса и {usd(10_000)}; 4% для $5K Two-Step (покупки с 25.07.2026) и $5K HERO (с 06.10.2026); остаток списывают</td></tr>
                  <tr><th scope="row">Сбор</th><td>3% с суммы после сплита — с каждой выплаты</td></tr>
                  <tr><th scope="row">Способы</th><td>Rise — без лимита; Skrill — до {usd(5_000)}; криптовалюта — до {usd(3_000)}; банк — до {usd(10_000)}, только Кения, ЮАР, Египет, Нигерия, Кот-д’Ивуар, Танзания, Камерун, Гана</td></tr>
                  <tr><th scope="row">Срок</th><td>до 2 рабочих дней; при опоздании фирма обещает бонус {usd(1_000)} (кроме задержек из-за KYC)</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Выводится вся прибыль сразу (кроме Instant Daily), и одновременно может висеть только одна заявка.
              Перед первой выплатой — KYC через Veriff или Rise и электронная подпись Trader Agreement. Реквизиты должны
              принадлежать владельцу счёта; адрес, уже использованный на другом счёте GFT, считается нарушением.
              Сравнить сроки и способы вывода с другими фирмами — в разделе{' '}
              <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
            </p>
            <div className="ru-notice" data-russian-goat-payout-risks="stage-checks">
              <strong>Что может пойти не так на выплате.</strong> Заявку проверяют на запрещённые практики, правило
              «лучшая сделка не больше худшей», совпадение региона покупки и торговли, VPN/VPS, совпадение имени в
              реквизитах. Прибыль сверх потолка первых двух выплат и прибыль по сделкам короче 60 секунд снимают.
              Если KYC не пройден ни через Veriff, ни через Rise, выплату не проведут.
            </div>
            <p className="ru-source-line">
              Источники: {src(SOURCES.payouts, 'выплаты')}, {src(SOURCES.kyc, 'KYC')}, {src(SOURCES.holding, 'удержание')},{' '}
              {src(SOURCES.instantDaily, 'Instant Daily')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content" data-russian-goat-platforms={CHECKED}>
            <h2>Платформы и способы оплаты</h2>
            <p>
              Платформы: cTrader, MT5, Match-Trader, TradeLocker и Volumetrica (статья обновлена 13.08.2026). MT5 и
              cTrader недоступны трейдерам из США. Платформу можно сменить один раз до первой сделки. Какие платформы
              доступны на каждой модели, на сайте не указано. Подборка фирм с cTrader — в разделе{' '}
              <Link href="/ru/prop-firmy-s-ctrader">проп-фирмы с cTrader</Link>.
            </p>
            <p>
              Оплата челленджа: карты Visa, Mastercard, Amex, Apple Pay и Google Pay, криптовалюта (BTC, ETH, USDT,
              USDC), PayPal, Skrill, Kora и AstroPay. Цены только в долларах США.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.platforms, 'платформы')}, {src(SOURCES.paymentMethods, 'способы оплаты')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="scaling">
          <div className="ru-shell ru-content" data-russian-goat-scaling={CHECKED}>
            <h2>Масштабирование</h2>
            <ul className="wp-block-list">
              <li><strong>Уровень 1:</strong> 2 месяца и 4 выплаты → +15% капитала, сплит 90%, +1% к просадке.</li>
              <li><strong>Уровень 2:</strong> 4 месяца и 6 выплат → +30%, +2% к просадке, еженедельные выплаты.</li>
              <li><strong>Уровень 3:</strong> 5 месяцев и 10 выплат → +40%, сплит 92%, +3%, «зарплата» {usd(300)} (счета $5K–$50K) или {usd(500)} ($100K–$200K).</li>
              <li><strong>Уровень 4:</strong> 6 месяцев и 15 выплат → +50%, сплит 95%, +4%.</li>
            </ul>
            <p className="ru-source-line">Источник: {src(SOURCES.scaling, 'план масштабирования')} — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-goat-reviews="tradingpilot">
            <h2>Отзывы о Goat Funded Trader</h2>
            <p>
              На главной и на странице моделей фирма размещает несколько рейтинговых виджетов с разными цифрами,
              в том числе значок {src(SOURCES.tradingPilot, 'TradingPilot')} ({asOf(CHECKED)}). Эти оценки публикует
              сама фирма, источник части виджетов не подписан, и мы их не проверяли, поэтому цифры не переносим.
              Отдельные жалобы в блогах старше 30 дней и не проверены — их мы тоже не пересказываем. Как отличать
              полезные отзывы от шума — в разделе <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из России</h2>
            <p data-russian-goat-alt-basis="not-in-restricted-list">
              У BrightFunded России нет в списке ограничений (на {ruNotListedDate('bright-funded')}), у Crypto Fund
              Trader — тоже нет (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия доступа.
              Сводный взгляд на варианты — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-goat-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-goat-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит{' '}
                  {brightSplit != null ? `${brightSplit}%` : 'по программе'}; цикл{' '}
                  {brightFrequency ? frequencyRu[brightFrequency] ?? brightFrequency : 'по программе'}.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-goat-funded-trader-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-goat-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-goat-funded-trader-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p>
              Крипто-варианты в одной таблице — в <Link href="/ru/luchshie-kripto-prop-firmy">рейтинге крипто проп компаний</Link>.
              Для русскоязычных трейдеров в разных странах — гид{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>. Чем funded-счёт
              отличается от демо — в разделе <Link href="/ru/funded-account">funded account</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Пять платформ</strong>, включая cTrader и Volumetrica.</li>
                  <li><strong>2-Step от {usd(36)}</strong> по лист-цене ($5K, 2-Step GOAT).</li>
                  <li><strong>Instant Daily</strong> с ежедневной заявкой на выплату.</li>
                  <li><strong>Выплата за 2 рабочих дня</strong> с обещанным бонусом {usd(1_000)} за опоздание.</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Россия, Беларусь и Украина</strong> в списке ограничений.</li>
                  <li><strong>Сбор 3%</strong> с каждой выплаты и потолок первых двух выплат.</li>
                  <li><strong>Возврат взноса:</strong> справка и п. 7.4 условий расходятся.</li>
                  <li><strong>Много поздних изменений правил</strong> — даты покупки определяют, какие правила действуют.</li>
                </ul>
              </article>
            </div>
            <p data-russian-goat-precheck="closed-firms">
              Что проверить до оплаты любой фирмы: список стран, способ выплаты на ваше имя и дату, с которой действуют
              правила. Проверьте, нет ли фирмы в списке{' '}
              {closedHref ? <Link href={closedHref}>закрытых проп-фирм</Link> : 'закрытых проп-фирм'} — Goat Funded
              Trader в нём нет.
            </p>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>Проверено {ruDate(CHECKED)} по официальным страницам Goat Funded Trader; лист-цены повторно сверены {ruDate(PRICES_CHECKED)}; список стран — {ruDate(ACCESS_CHECKED)}.</p>
            <ul>
              <li>{src(SOURCES.terms, 'Terms and Conditions')}: §1.1, §2.2, §7.4, §7.5, §15.1 — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.model, 'Страница моделей')} и {src(SOURCES.home, 'главная')}: лист-цены — {asOf(PRICES_CHECKED)}; пометка «retired» у 3-Step, виджеты рейтингов, подвал — {asOf(CHECKED)}.</li>
              <li>Справка о доступе: {src(SOURCES.restricted, 'список стран')} (обновлена {ruDate(RESTRICTED_LIST_UPDATED)}) — {asOf(ACCESS_CHECKED)}, {src(SOURCES.ip, 'политика IP')} — {asOf(CHECKED)}.</li>
              <li>
                Справка по моделям: {src(SOURCES.oneStep, '1-Step')}, {src(SOURCES.twoStepStandard, '2-Step Standard')},{' '}
                {src(SOURCES.twoStepGoat, '2-Step GOAT')}, {src(SOURCES.twoStepPro, '2-Step PRO')}, {src(SOURCES.promo100k, 'Promo 100k')},{' '}
                {src(SOURCES.threeStep, '3-Step')}, {src(SOURCES.instantGoat, 'Instant GOAT')}, {src(SOURCES.instantPro, 'Instant PRO')},{' '}
                {src(SOURCES.instantPremium, 'Instant Premium')}, {src(SOURCES.instantHero, 'Instant HERO')},{' '}
                {src(SOURCES.instantDaily, 'Instant Daily')}, {src(SOURCES.stride, 'Stride')}, {src(SOURCES.blitz, 'Blitz')},{' '}
                {src(SOURCES.oneDollar, 'Goat $1')}, {src(SOURCES.payLater, 'Pay Later')} — {asOf(CHECKED)}.
              </li>
              <li>Выплаты: {src(SOURCES.payouts, 'выплаты')}, {src(SOURCES.refund, 'возврат взноса')}, {src(SOURCES.kyc, 'KYC')} — {asOf(CHECKED)}.</li>
            </ul>
            <p data-russian-goat-gaps={CHECKED}>
              На сайте не указано ({asOf(CHECKED)}): итоговые цены в корзине и срок действия промокода; цены платных
              опций (сплит 100%, доплата за платформу); продаются ли сейчас Instant PRO и Goat Stride; какие платформы
              доступны на каждой модели; связь с брендом Goat Funded Futures; отдельное правило о переносе позиций на
              ночь.
            </p>
            <p>Мы не регистрировались, не оплачивали челлендж и не получали выплату от Goat Funded Trader.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="goat-funded-trader-review">
              <strong>Риск.</strong> Торговля с плечом связана с высоким риском. Большинство участников не проходит оценку,
              взнос после покупки обычно не возвращается. Счета на этапах оценки и funded — симулированные;
              вознаграждение выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <p className="ru-actions" data-russian-goat-cta="final">
              <a href={SOURCES.home} target="_blank" rel="nofollow noopener" className="btn-outline" data-russian-goat-official="non-affiliate">
                Официальный сайт, не партнёрская ссылка · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </a>{' '}
              <RuAccessBadgeView firm="goat-funded-trader" status={goatStatus} />
            </p>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о Goat Funded Trader</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
