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
import { getAllFirms, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { ruNotListedDate } from '@/lib/ruBasisWording'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-blue-guardian'
const TITLE = 'Blue Guardian: обзор 2026 — правила, цены и доступ из РФ'
const H1 = 'Blue Guardian: обзор и отзывы 2026'
const DESCRIPTION = 'Blue Guardian на русском: CFD-программы, цены, правила, Guardian Shield и выплаты. CFD — статус для РФ неясен, Futures — Россия в списке ограничений.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['blue guardian', 'blue guardian отзывы', 'blue guardian обзор', 'блю гардиан', 'blue guardian россия'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker final capture /workspace/ru-data/2026-10-28-blue-guardian-final.md
 * (evidence blue-guardian-2026-10-28, branch data/blue-guardian-final-2026-10-28 @ 7c04fce) and
 * content/data/challenges/_captures/blue-guardian-2026-10-28.json. The CFD restricted list, KYC and refund
 * text were re-read 01.11.2026 (evidence daily-check-2026-11-01/r-bg.txt, same article date 23.10.2026).
 * Blue Guardian is only in firms-pending.json (russiaStatus 'unclear', CFD): info-only page, no /go route,
 * no affiliate, official link nofollow and below the alternatives. Blue Guardian Futures restricts RU/BY/UA
 * and Crimea: text only, no second badge. List prices only (no sale prices, no codes): the discount depends
 * on the current code. Conflicting official pages are printed as «условия расходятся».
 */
const CHECKED = '2026-10-28'
const DATE_PUBLISHED = '2026-11-03'
/** Intercom «updated» dates of the official help articles (UTC). */
const GENERAL_UPDATED = '2026-10-23'
const FUTURES_UPDATED = '2026-10-23'
const MODELS_UPDATED = '2026-10-23'
const PLATFORMS_UPDATED = '2026-10-26'
const PAYOUTS_UPDATED = '2026-10-28'
/** CFD restricted list, KYC and refund text re-read by Tracker (daily check 01.11.2026). */
const ACCESS_CHECKED = '2026-11-01'
const PRICES_CHECKED = '2026-10-28'
/** Sumsub supported-documents page read by Tracker. */
const SUMSUB_CHECKED = '2026-10-21'

const HELP = 'https://help.blueguardian.com/en/articles/'
const SOURCES = {
  home: 'https://blueguardian.com/',
  pricing: 'https://blueguardian.com/forex',
  fastTrack: 'https://blueguardian.com/fast-track',
  terms: 'https://blueguardian.com/terms-and-conditions',
  refundPolicy: 'https://blueguardian.com/refund-policy',
  about: 'https://blueguardian.com/about-us',
  general: `${HELP}15618204-general-information-rules`,
  futures: 'https://helpfutures.blueguardian.com/en/articles/15805753-introduction-to-blue-guardian-futures',
  sumsub: 'https://sumsub.com/supported-documents/',
  oneStepStandard: `${HELP}14062186-1-step-standard-rules`,
  twoStepStandard: `${HELP}14062291-2-step-standard-rules`,
  oneStepNano: `${HELP}16444654-1-step-nano-rules`,
  twoStepNano: `${HELP}16445450-2-step-nano-rules`,
  instant: `${HELP}14061082-instant-standard-account-rules`,
  instantStarter: `${HELP}14061939-instant-starter`,
  bnpl: `${HELP}15859899-buy-now-pay-later-bnpl-rules`,
  oneStepPro: `${HELP}14062228-1-step-pro-rules-legacy-model`,
  twoStepPro: `${HELP}14062433-2-step-pro-rules-legacy-model`,
  threeStep: `${HELP}14062468-3-step-rules-legacy-model`,
  payouts: `${HELP}9660857-how-do-payouts-work`,
  guarantee: `${HELP}14187958-24-hours-payout-guarantee`,
  prohibited: `${HELP}9661512-prohibited-trading-practices-account-policies`,
  platforms: `${HELP}9661525-platform-rules`,
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
/** RU thousand separator: plain space ($2 200); decimal comma ($26,66). */
const usd = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, ' ').replace('.', ',')}`
const prices = (rows: Array<[string, number]>) => rows.map(([size, price]) => `${size} — ${usd(price)}`).join(' · ')

type ProgramRow = { key: string; name: string; href: string; rules: string; payout: string; price: string }

/** On sale per the pricing widget and General Information (28.10.2026). List prices only. */
const PROGRAMS: ProgramRow[] = [
  {
    key: '1-step-standard',
    name: '1 Step Standard',
    href: SOURCES.oneStepStandard,
    rules: 'цель 9%; дневной 4% от начального баланса; общий 6% trailing (фиксируется на стартовом балансе после +6%); 3 прибыльных дня; Guardian Shield 2%',
    payout: '85% (90% с опцией) / 14 дней',
    price: prices([['$5K', 40], ['$10K', 66], ['$25K', 134], ['$50K', 200], ['$100K', 398], ['$200K', 736]]),
  },
  {
    key: '2-step-standard',
    name: '2 Step Standard',
    href: SOURCES.twoStepStandard,
    rules: 'цели 8% → 4%; дневной 4% от начального; общий 8% статический; 3 прибыльных дня (для покупок до 20.08.2026 — 5); правила консистентности нет; Guardian Shield 2% на funded',
    payout: '85% (90% с опцией) / 14 дней',
    price: prices([['$5K', 32], ['$10K', 75], ['$25K', 154], ['$50K', 232], ['$100K', 463], ['$200K', 930]]),
  },
  {
    key: '1-step-nano',
    name: '1 Step Nano',
    href: SOURCES.oneStepNano,
    rules: 'цель 10%; дневной 4%; общий 6% trailing; на оценке минимума дней нет, на funded 5; консистентность 50% на обоих этапах; без Guardian Shield',
    payout: '85% (100% с опцией) / 7 дней',
    price: prices([['$5K', 26.66], ['$10K', 38.66], ['$25K', 78.66], ['$50K', 160], ['$100K', 320], ['$200K', 585]]),
  },
  {
    key: '2-step-nano',
    name: '2 Step Nano',
    href: SOURCES.twoStepNano,
    rules: 'цели 8% → 5%; дневной 3%; общий 10% статический; консистентность 50% на funded; одна выплата — не больше 2% начального баланса',
    payout: 'сплит: условия расходятся / 14 дней',
    price: prices([['$25K', 66.66], ['$50K', 127], ['$100K', 239], ['$200K', 460]]),
  },
  {
    key: 'instant',
    name: 'Instant',
    href: SOURCES.instant,
    rules: 'без цели; дневной 3%; общий 6% trailing; 5 прибыльных дней; консистентность 20% (15% на $300K и $400K); Guardian Shield 1%',
    payout: '80% (90% с опцией) / по запросу',
    price: prices([['$5K', 72], ['$10K', 100], ['$25K', 208], ['$50K', 324], ['$100K', 623], ['$200K', 954], ['$400K', 2_200]]),
  },
  {
    key: 'instant-starter',
    name: 'Instant Starter',
    href: SOURCES.instantStarter,
    rules: 'только $5K; дневной 3%; общий 5% trailing; 5 прибыльных дней; консистентность 15%; одна выплата до $250, только в криптовалюте',
    payout: '90% фиксированно',
    price: prices([['$5K', 27]]),
  },
  {
    key: 'bnpl',
    name: 'Buy Now Pay Later',
    href: SOURCES.bnpl,
    rules: 'одна фаза, цель 4%; дневной 4%; общий 8% trailing; на funded 5 дней и консистентность 20%; Guardian Shield 1%',
    payout: '80% / по запросу',
    price: `${prices([['$5K', 69], ['$100K', 915], ['$200K', 1_377]])}; как цена делится на вход и активацию, на сайте не указано`,
  },
  {
    key: 'fast-track',
    name: 'Fast-Track',
    href: SOURCES.fastTrack,
    rules: 'без челленджа, сразу funded; дневной 4%; общий 10%; только MT5',
    payout: 'сплит: условия расходятся / 14 дней',
    price: prices([['$5K', 135], ['$10K', 235], ['$25K', 415], ['$50K', 575], ['$100K', 845], ['$200K', 1_365]]),
  },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Работает ли Blue Guardian в России?',
    a: `Для CFD-программ статус неясен: России нет среди 13 стран в справке (${asOf(ACCESS_CHECKED)}), но какие документы для KYC принимает фирма, на сайте не указано. Blue Guardian Futures Россию, Беларусь, Украину и Крым прямо ограничивает (${asOf(CHECKED)}).`,
  },
  {
    q: 'Пройдёт ли KYC с паспортом РФ?',
    a: `Неизвестно. Справка ссылается на общий список Sumsub с оговоркой «if your document is allowed». У Sumsub российский паспорт в целом поддерживается (${asOf(SUMSUB_CHECKED)}), но какие документы принимает сама фирма, на сайте не указано. KYC нужен только перед первой выплатой, уже после оплаты — спросите поддержку письменно до покупки.`,
  },
  {
    q: 'Сколько стоит челлендж Blue Guardian?',
    a: `Лист-цены ${asOf(PRICES_CHECKED)}: от ${usd(27)} (Instant Starter $5K) до ${usd(2_200)} (Instant $400K); 2 Step Standard $100K — ${usd(463)}. Скидка зависит от действующего промокода; итоговую сумму видно только при оформлении заказа.`,
  },
  {
    q: 'Какая просадка у Blue Guardian?',
    a: 'У 2 Step Standard дневной лимит 4% и общий 8% статический, у 2 Step Nano — 3% и 10%. У 1 Step и Instant общий лимит 6% trailing. Сверху действует Guardian Shield: плавающий убыток 2% (1% на Instant) закрывает сделки.',
  },
  {
    q: 'Как выводить прибыль и сколько удерживают?',
    a: `Криптовалюта (от ${usd(100)} до ${usd(1_000)} за заявку) и Rise (от ${usd(500)}, без лимита). Сплит обычно 85% (Instant — 80%). Со всех выплат удерживают 3%; с какой суммы — на сайте не указано. Первая выплата — не раньше 14 дней с первой сделки.`,
  },
  {
    q: 'Какие платформы доступны?',
    a: 'MT5, Match-Trader и TradeLocker; Fast-Track — только MT5. Сменить платформу можно лишь до первой сделки.',
  },
  {
    q: 'Какие есть альтернативы для трейдеров из России?',
    a: `У BrightFunded в CFD-челлендже России нет в списке ограничений (на ${ruNotListedDate('bright-funded')}), у Crypto Fund Trader — тоже (на ${ruNotListedDate('crypto-fund-trader')}). Это не гарантия доступа: страну, KYC и способ выплаты сверяйте до оплаты.`,
  },
]

export default function RussianBlueGuardianReviewPage() {
  const bgStatus = russiaStatusFor('blue-guardian')
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
    { name: 'Обзор Blue Guardian' },
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
        <div className="ru-shell" data-russian-review="blue-guardian" data-russia-status-blue-guardian={bgStatus}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
            {' / '}
            Обзор Blue Guardian
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Проверено {ruDate(CHECKED)} по официальным страницам
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Blue Guardian — проп-фирма с оператором в Дубае и CFD-линейкой из шести моделей: 1 Step и 2 Step в версиях
            Standard и Nano, Instant и Instant Starter, плюс Buy Now Pay Later и Fast-Track. Для трейдеров из России главный вопрос — доступ, и ответ здесь
            разный для двух продуктов фирмы.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-bg-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{PROGRAMS.length}</strong><span>программ в продаже с ценой</span></div>
            <div className="ru-stat"><strong>{usd(27)}</strong><span>минимальная лист-цена (Instant Starter $5K)</span></div>
            <div className="ru-stat"><strong>80–90%</strong><span>доля трейдера по умолчанию</span></div>
            <div className="ru-stat"><strong>3</strong><span>платформы</span></div>
          </div>
        </div>
      </section>

      <RuReviewVerdictBox route={PATH} campaign="blue-guardian-review" sourcesHref="#sources" />

      <article className="ru-review-article" data-russian-bg-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Blue Guardian">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: доступ из России</a></li>
                <li><a href="#company">Компания</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#example">Пример: 2 Step Standard $100K</a></li>
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
          <div className="ru-shell ru-content" data-russian-bg-verdict="summary">
            <h2>Коротко: доступна ли Blue Guardian из России</h2>
            <div className="ru-notice" data-russian-bg-access={bgStatus}>
              <strong>CFD-программы:</strong> <RuAccessBadgeView firm="blue-guardian" status={bgStatus} />{' '}
              Справка фирмы (обновлена {ruDate(GENERAL_UPDATED)}, {asOf(ACCESS_CHECKED)}) перечисляет 13 стран, которым
              сервис недоступен, — от Афганистана до Вьетнама. России в этом списке нет, но доступ это не гарантирует:
              проверку личности проводит Sumsub, а какие документы принимает фирма, на сайте не указано.
            </div>
            <div className="ru-notice" data-russian-bg-futures-access="restricted">
              <strong>Blue Guardian Futures:</strong> Недоступно для РФ. Справка фьючерсного продукта (обновлена{' '}
              {ruDate(FUTURES_UPDATED)}, {asOf(CHECKED)}) называет 58 стран, включая Россию, Беларусь, Украину и Крым,
              и среди причин — международные санкции. Казахстана в этом списке нет.
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ продуктов Blue Guardian из России">
              <table className="ru-table" data-russian-bg-access-table={CHECKED}>
                <caption className="sr-only">Продукты Blue Guardian: лист-цены, статус для России, источник и дата</caption>
                <thead>
                  <tr>
                    <th>Продукт</th>
                    <th>Лист-цена</th>
                    <th>Россия</th>
                    <th>Источник</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CFD-челленджи и Instant (blueguardian.com)</td>
                    <td>от {usd(27)} до {usd(2_200)}</td>
                    <td>статус неясен: в списке из 13 стран не названа</td>
                    <td>{src(SOURCES.general, 'General Information')}</td>
                    <td>{ruDate(ACCESS_CHECKED)}</td>
                  </tr>
                  <tr>
                    <td>Blue Guardian Futures</td>
                    <td>не приводим</td>
                    <td>в списке ограничений вместе с Беларусью, Украиной и Крымом</td>
                    <td>{src(SOURCES.futures, 'Introduction to Blue Guardian Futures')}</td>
                    <td>{ruDate(CHECKED)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Сильные стороны — статический лимит у 2 Step Standard, свобода держать позиции на ночь и выходные и
              24-часовая гарантия выплаты. Минусы — сбор 3% со всех выплат, Guardian Shield и противоречия между
              официальными страницами. Русский язык ≠ доступ: решают список стран, KYC и условия.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="blue-guardian-review">
              <strong>Раскрытие.</strong> У сайта нет партнёрского договора с Blue Guardian, и на этой странице нет кнопки
              регистрации в Blue Guardian: ссылки на её сайт обычные, с nofollow. Ссылка на BrightFunded в блоке
              альтернатив — партнёрская; ссылка на Crypto Fund Trader — обычная.
            </div>
          </div>
        </section>

        <RuTelegramBlock placement="obzor-blue-guardian" />

        <section className="ru-section" id="access">
          <div className="ru-shell ru-content" data-russian-bg-access-explainer={CHECKED}>
            <h2>Что это значит для разных ситуаций</h2>
            <ul className="wp-block-list">
              <li>
                <strong>Резидент РФ, торгует из России.</strong> По CFD-списку запрета нет, но условия ссылаются на закон страны
                проживания и экспортный контроль США; как это применяется к России, на сайте не указано. Фьючерсный продукт недоступен.
              </li>
              <li>
                <strong>Гражданин РФ, живёт в Казахстане, Грузии, Армении, Сербии или ЕС.</strong> CFD-список не уточняет,
                касается ли он резидентства или гражданства, — на сайте не указано. Для фьючерсов ключевое слово —
                нахождение: «Users located in restricted jurisdictions may not be eligible to open or maintain accounts».
                Вопрос о документах задайте поддержке до оплаты и сохраните письменный ответ.
              </li>
              <li>
                <strong>Поездка в Россию с открытым счётом.</strong> Для CFD отдельного правила о поездках в проверенных
                статьях нет — на сайте не указано. Для фьючерсов торговля из страны списка подпадает под формулировку о
                нахождении.
              </li>
              <li>
                <strong>Ложные данные.</strong> Чужая или неверная личность — грубое нарушение и чёрный список.
                Советов по обходу ограничений мы не даём.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.general, 'General Information')} ({asOf(ACCESS_CHECKED)}), {src(SOURCES.futures, 'справка Futures')},{' '}
              {src(SOURCES.terms, 'Terms and Conditions')}, {src(SOURCES.prohibited, 'запрещённые практики')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-bg-entity={CHECKED}>
            <h2>Компания: юрлица и право</h2>
            <p>
              По условиям сервис оказывает <strong>Iconic Exchange FZCO</strong> под брендом Blue Guardian (Дубай, ОАЭ). В подвале сайта названы ещё два юрлица: <strong>Blue Guardian Limited</strong>{' '}
              (Сент-Люсия) отвечает за симулированные торговые платформы, а Blue Guardian Marketing LLC (Дубай)
              помечена как недействующая. Основатель и CEO, по странице «О нас», — Sean Bainton. Год основания на
              официальных страницах не указан. Лицензии регулятора фирма не заявляет: все счета — демо, симулированные.
            </p>
            <p>
              Условия подчиняются праву ОАЭ, споры рассматривают суды Дубая; арбитраж — в Дубае, на английском, один
              арбитр. У страницы условий нет даты редакции.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.terms, 'Terms and Conditions')}, {src(SOURCES.home, 'подвал сайта')},{' '}
              {src(SOURCES.about, 'страница «О нас»')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted" data-russian-bg-prices={PRICES_CHECKED}>
              Лист-цены в долларах США {asOf(PRICES_CHECKED)} — с виджета цен на официальном сайте. Скидка зависит от
              действующего промокода; итоговую цену видно только при оформлении заказа, и мы её не печатаем. Других
              валют и региональных цен на сайте нет.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы Blue Guardian">
              <table className="ru-table" data-russian-bg-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы Blue Guardian: правила, выплаты, лист-цены</caption>
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
                    <tr key={program.key} data-russian-bg-product={program.key}>
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
            <p>
              Размеры счетов — от $5K до $400K, суммарно на одного трейдера можно держать не больше {usd(400_000)}{' '}
              funded-капитала. Дневной лимит везде считается от уровня на 17:00 по Нью-Йорку (EST) — большего из баланса
              и эквити. Прибыльным считается день с прибылью от 0,5%. Платные опции на виджете: сплит 90% и первая
              выплата через 7 дней вместо 14.
            </p>
            <h3 data-russian-bg-conflicts={CHECKED}>Где страницы фирмы расходятся</h3>
            <ul className="wp-block-list">
              <li><strong>Сплит 2 Step Nano:</strong> статья модели — 80%, общая статья о выплатах — 85% по умолчанию.</li>
              <li><strong>Сплит Fast-Track:</strong> виджет — 85%, текст лендинга — «100% прибыли».</li>
              <li><strong>Плечо 1 Step Standard:</strong> виджет — 1:100, правила платформ — 1:50 на FX.</li>
              <li><strong>Новости на Instant:</strong> виджет — «нельзя», справка — ограничение только в окне ±5 минут.</li>
              <li><strong>Вход в Buy Now Pay Later:</strong> справка — {usd(10)}, лендинг — {usd(5)} и {usd(10)}.</li>
            </ul>
            <p>По каждому из этих пунктов условия расходятся, уточните у поддержки до оплаты.</p>
            <h3>Что снято с продажи</h3>
            <p data-russian-bg-legacy={CHECKED}>
              Модели {src(SOURCES.oneStepPro, '1 Step Pro')}, {src(SOURCES.twoStepPro, '2 Step Pro')} и{' '}
              {src(SOURCES.threeStep, '3 Step')} помечены в справке как «Legacy Model» и отсутствуют в виджете цен — они
              больше не продаются. Как в целом
              устроены этапы оценки и почему статический лимит удобнее trailing — в{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде по челленджам</Link>. Если тема новая, начните с
              раздела <Link href="/ru/prop-trejding">что такое проп-трейдинг</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.pricing, 'виджет цен')} ({asOf(PRICES_CHECKED)}), {src(SOURCES.general, 'General Information')},
              справка по моделям (ссылки в таблице, обновлены {ruDate(MODELS_UPDATED)}), {src(SOURCES.payouts, 'выплаты')},{' '}
              {src(SOURCES.platforms, 'правила платформ')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-bg-example="2-step-standard-100k">
            <h2>Пример пути: 2 Step Standard $100K</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цена {asOf(PRICES_CHECKED)} и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li><strong>Взнос:</strong> {usd(463)} по лист-цене {asOf(PRICES_CHECKED)}. Скидка зависит от действующего промокода — точную сумму показывает корзина.</li>
              <li><strong>Этап 1:</strong> цель 8% = {usd(8_000)}. <strong>Этап 2:</strong> цель 4% = {usd(4_000)}.</li>
              <li><strong>Прибыльные дни:</strong> минимум 3 дня с прибылью от 0,5% ({usd(500)}). На каждом ли этапе — на сайте не указано.</li>
              <li><strong>Дневной лимит:</strong> 4% от начального баланса = {usd(4_000)} ниже уровня на 17:00 EST. При эквити {usd(101_000)} пол на день — {usd(97_000)}.</li>
              <li><strong>Общий лимит:</strong> 8% статический — эквити с учётом открытых позиций не должно опуститься до {usd(92_000)}.</li>
              <li><strong>Funded и Guardian Shield:</strong> при плавающем убытке 2% ({usd(2_000)}) сделки закроются автоматически; первое срабатывание навсегда снижает сплит до 50%, второе — нарушение.</li>
              <li><strong>Первая выплата:</strong> не раньше 14 календарных дней с первой сделки на funded.</li>
              <li>
                <strong>Расчёт выплаты:</strong> прибыль {usd(3_000)} × 85% = {usd(2_550)}. Сбор 3% — но с какой суммы, на
                сайте не указано: если с вашей доли, вы получите {usd(2_473.5)}; если с прибыли до сплита ({usd(90)}) —
                {' '}{usd(2_460)}. С опцией 90% доля — {usd(2_700)}, а после первого срабатывания Guardian Shield — лишь{' '}
                {usd(1_500)}. Криптой больше {usd(1_000)} за заявку не вывести, поэтому такая сумма пойдёт через Rise.
              </li>
              <li>
                <strong>Возврат взноса:</strong> справка обещает вернуть взнос {usd(463)} после 4-й выплаты
                для счетов, купленных с 21.01.2026, а страница Refund Policy пишет, что возвратов нет. Условия расходятся,
                уточните у поддержки.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.pricing, 'виджет цен')}, {src(SOURCES.twoStepStandard, '2 Step Standard')},{' '}
              {src(SOURCES.payouts, 'выплаты')}, {src(SOURCES.prohibited, 'Guardian Shield')}, {src(SOURCES.general, 'возврат взноса')},{' '}
              {src(SOURCES.refundPolicy, 'Refund Policy')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-bg-rules={CHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li><strong>Новости:</strong> на оценке разрешены. На funded нельзя открывать и закрывать сделки за 5 минут до и после «красных» новостей и FOMC — прибыль по таким сделкам снимают, но счёт не нарушен.</li>
              <li><strong>Ночь и выходные:</strong> ограничений нет на всех типах счетов.</li>
              <li><strong>Советники:</strong> разрешены собственные EA под свою стратегию; HFT, арбитражные боты и тиковый скальпинг запрещены. Минимальное время удержания сделки — 2 минуты.</li>
              <li><strong>Копирование:</strong> только между своими счетами; копировать чужие сделки и отдавать счёт в управление нельзя. Хеджирование между счетами запрещено.</li>
              <li><strong>Guardian Shield:</strong> сделки закрываются при плавающем убытке 2% (1% на Instant, Instant Starter и BNPL). Первое срабатывание — сплит 50% навсегда, второе — нарушение.</li>
                            <li><strong>Неактивность:</strong> минимум одна сделка за 30 дней. Стоп-лосс не обязателен.</li>
              <li><strong>Аккаунт:</strong> менять пароль нельзя; чарджбэк по оплате ведёт в чёрный список.</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.prohibited, 'запрещённые практики')} (обновлены {ruDate(MODELS_UPDATED)}),{' '}
              {src(SOURCES.twoStepStandard, '2 Step Standard')}, {src(SOURCES.general, 'General Information')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-bg-payouts={PAYOUTS_UPDATED}>
            <h2>Выплаты и сплит</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат Blue Guardian">
              <table className="ru-table">
                <caption className="sr-only">Способы, лимиты и сроки выплат Blue Guardian</caption>
                <tbody>
                  <tr><th scope="row">Сплит</th><td>funded — 85% (90% с опцией); Instant — 80% (90% с опцией); Instant Starter — 90%; Nano с опцией — 100%</td></tr>
                  <tr><th scope="row">Первая выплата</th><td>после минимума прибыльных дней и не раньше 14 календарных дней с первой сделки</td></tr>
                  <tr><th scope="row">Цикл</th><td>каждые 14 дней от предыдущей заявки (7 с опцией и на 1 Step Nano); Instant — по запросу</td></tr>
                  <tr><th scope="row">Способы и лимиты</th><td>криптовалюта — от {usd(100)} до {usd(1_000)} за заявку; Rise — от {usd(500)}, без верхнего лимита</td></tr>
                  <tr><th scope="row">Сбор</th><td>3% со всех выплат; база расчёта на сайте не указана</td></tr>
                  <tr><th scope="row">Потолки</th><td>Instant Starter — одна выплата до {usd(250)}; Instant $200K–$400K — первые две выплаты до {usd(10_000)}; 2 Step Nano — 2% начального баланса за выплату</td></tr>
                  <tr><th scope="row">Срок</th><td>в течение 24 рабочих часов; при опоздании фирма обещает +10% к доле прибыли (кроме выходных, праздников, проверок комплаенса, подключения Rise и ожидания документов)</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              На момент заявки счёт должен быть без открытых позиций, в прибыли и без нарушений; пока заявка
              рассматривается, счёт работает только на чтение. KYC через Sumsub проходит перед первой выплатой с
              funded- или Instant-счёта. Сравнить сроки и способы вывода с другими фирмами — в разделе{' '}
              <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
            </p>
            <div className="ru-notice" data-russian-bg-payout-risks="stage-checks">
              <strong>Что может пойти не так на выплате.</strong> KYC: если документ не принят, выплату не проведут; при
              неполных или противоречивых данных фирма может запросить дополнительную живую проверку KYC/AML. Заявку
              вручную проверяют на запрещённые практики: совпадение устройств с другими трейдерами, сделки короче 2 минут,
              торговлю в окне новостей, гэмблинг с маржой выше 80%. Срабатывание Guardian Shield уже до заявки
              снижает вашу долю до 50%.
            </div>
            <p className="ru-source-line">
              Источники: {src(SOURCES.payouts, 'выплаты')} (обновлены {ruDate(PAYOUTS_UPDATED)}), {src(SOURCES.guarantee, 'гарантия 24 часа')},{' '}
              {src(SOURCES.general, 'KYC')}, {src(SOURCES.prohibited, 'проверки при выплате')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content" data-russian-bg-platforms={PLATFORMS_UPDATED}>
            <h2>Платформы и способы оплаты</h2>
            <p>
              Платформы: MT5, Match-Trader и TradeLocker; Fast-Track — только MT5. Платформу можно сменить только до первой сделки. Плечо: FX 1:50 на оценке,
              1:30 на Instant-счетах, криптовалюта 1:2. Комиссия — {usd(5)} за лот на FX и сырье, на индексах и крипте
              комиссии нет.
            </p>
            <p>
              Оплата челленджа: банковские карты и криптовалюта, цены только в долларах США. Какие именно карты проходят,
              на сайте не указано; оформление заказа мы не проверяли.
              Чем funded-счёт отличается от демо — в разделе <Link href="/ru/funded-account">funded account</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.platforms, 'правила платформ')} (обновлены {ruDate(PLATFORMS_UPDATED)}),{' '}
              {src(SOURCES.general, 'General Information')}, {src(SOURCES.fastTrack, 'Fast-Track')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="scaling">
          <div className="ru-shell ru-content" data-russian-bg-scaling={CHECKED}>
            <h2>Масштабирование</h2>
            <p>
              Если за 3 месяца счёт заработал 12%, начальный баланс увеличивают на 30%. Шаги повторяются вплоть до{' '}
              {usd(4_000_000)}. Пример: счёт $100K после трёх месяцев с прибылью 12% вырастает до {usd(130_000)}.
            </p>
            <p className="ru-source-line">Источник: {src(SOURCES.general, 'General Information')} — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-bg-reviews="firm-widgets">
            <h2>Отзывы о Blue Guardian</h2>
            <p>
              На сайте фирма показывает оценки сторонних площадок, в том числе Prop Firm Match и Google. Эти цифры
              публикует сама фирма, мы их не проверяли и не переносим; непроверенные жалобы из блогов тоже не пересказываем. Как отличать полезные отзывы от шума — в разделе{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из России</h2>
            <p data-russian-bg-alt-basis="not-in-restricted-list">
              У BrightFunded в CFD-челлендже России нет в списке ограничений (на {ruNotListedDate('bright-funded')}), у
              Crypto Fund Trader — тоже нет (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия
              доступа. Статус BrightFunded относится только к челленджу: фьючерсный продукт BrightFunded
              {brightFuturesDate ? ` (справка обновлена ${ruDate(brightFuturesDate)})` : ''} ограничивает Россию,
              Беларусь и Украину{brightFuturesUrl ? <> — {src(brightFuturesUrl, 'список стран BrightFunded Futures')}</> : null}.
              Сводный взгляд на варианты — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-bg-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-bg-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит {brightSplit != null ? `${brightSplit}%` : 'по программе'}; CFD-челлендж.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-blue-guardian-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-bg-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-blue-guardian-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p>
              Ещё варианты — в <Link href="/ru/luchshie-kripto-prop-firmy">рейтинге крипто проп компаний</Link> и в гиде{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Статический лимит 8%</strong> и нет правила консистентности у 2 Step Standard.</li>
                  <li><strong>Ночь и выходные</strong> без ограничений, собственные EA разрешены.</li>
                  <li><strong>Выплата за 24 рабочих часа</strong> с обещанной компенсацией за опоздание.</li>
                  <li><strong>Масштабирование</strong> до {usd(4_000_000)}.</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Статус CFD для РФ неясен</strong>, фьючерсный продукт Россию ограничивает.</li>
                  <li><strong>Сбор 3%</strong> со всех выплат, база расчёта не указана.</li>
                  <li><strong>Guardian Shield</strong> навсегда снижает сплит до 50% после первого срабатывания.</li>
                  <li><strong>Противоречия</strong> между страницами: возврат взноса, сплит Nano и Fast-Track, плечо.</li>
                </ul>
              </article>
            </div>
            <p data-russian-bg-precheck="closed-firms">
              До оплаты любой фирмы проверьте, нет ли её в списке{' '}
              {closedHref ? <Link href={closedHref}>закрытых проп-фирм</Link> : 'закрытых проп-фирм'} — Blue Guardian в
              нём нет.
            </p>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>Проверено {ruDate(CHECKED)} по официальным страницам Blue Guardian; CFD-список стран, текст о KYC и возврате взноса повторно сверены {ruDate(ACCESS_CHECKED)}.</p>
            <ul>
              <li>{src(SOURCES.general, 'General Information')} (обновлена {ruDate(GENERAL_UPDATED)}): страны, KYC, оплата, масштабирование, возврат взноса — {asOf(ACCESS_CHECKED)}.</li>
              <li>{src(SOURCES.futures, 'Introduction to Blue Guardian Futures')} (обновлена {ruDate(FUTURES_UPDATED)}) — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.terms, 'Terms and Conditions')} (без даты), {src(SOURCES.refundPolicy, 'Refund Policy')}, {src(SOURCES.about, 'О нас')}, {src(SOURCES.home, 'подвал сайта')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.pricing, 'Виджет цен')} и {src(SOURCES.fastTrack, 'Fast-Track')}: лист-цены — {asOf(PRICES_CHECKED)}.</li>
              <li>
                Справка по моделям (обновлена {ruDate(MODELS_UPDATED)}; ссылки — в таблице программ и в разделе о снятых
                моделях) — {asOf(CHECKED)}.
              </li>
              <li>{src(SOURCES.payouts, 'Выплаты')} (обновлена {ruDate(PAYOUTS_UPDATED)}), {src(SOURCES.guarantee, 'гарантия 24 часа')}, {src(SOURCES.prohibited, 'запрещённые практики')}, {src(SOURCES.platforms, 'правила платформ')} (обновлены {ruDate(PLATFORMS_UPDATED)}) — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.sumsub, 'Sumsub')} — {asOf(SUMSUB_CHECKED)}.</li>
            </ul>
            <p data-russian-bg-gaps={CHECKED}>
              На сайте не указано ({asOf(CHECKED)}): какие документы для KYC принимает Blue Guardian; с какой суммы
              считается сбор 3%; итоговые цены в корзине и срок действия промокодов; как цена BNPL делится на вход и
              активацию; год основания; дата редакции условий; правило для граждан РФ за рубежом и для поездок.
            </p>
            <p>Мы не регистрировались, не оплачивали челлендж и не получали выплату от Blue Guardian.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="blue-guardian-review">
              <strong>Риск.</strong> Торговля с плечом связана с высоким риском. Большинство участников не проходит оценку,
              взнос после покупки обычно не возвращается. Счета на этапах оценки и funded — симулированные;
              вознаграждение выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <p className="ru-actions" data-russian-bg-cta="final">
              <a href={SOURCES.home} target="_blank" rel="nofollow noopener" className="btn-outline" data-russian-bg-official="non-affiliate">
                Официальный сайт, не партнёрская ссылка · доступ для резидентов РФ не проверен <ExternalLink size={14} aria-hidden="true" />
              </a>{' '}
              <span className="ru-muted">CFD:</span> <RuAccessBadgeView firm="blue-guardian" status={bgStatus} />
            </p>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о Blue Guardian</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
