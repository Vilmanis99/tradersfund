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

const PATH = '/ru/obzor-e8-markets'
const TITLE = 'E8 Markets: обзор 2026 — программы, цены и доступ из РФ'
const H1 = 'E8 Markets: обзор и отзывы 2026'
const DESCRIPTION = 'E8 Markets: обзор на русском. Программы E8 One/Pro/Signature, цены, сплит 80%, правила consistency и выплаты. Россия в списке ограничений — есть альтернативы.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['e8 markets', 'e8 markets отзывы', 'e8 markets обзор', 'e8 funding', 'e8 markets россия', 'e8 one', 'e8 pro'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker capture /workspace/tradersfundhub/evidence/e8-ru-review-2026-11-02/SUMMARY.md
 * (02.11.2026 11:26–11:35 Riga) and RU SEO Lead brief 2026-11-09-obzor-e8-markets.md (GATE PASSED 02.11).
 * E8 Markets is in firms.json with russiaStatus 'restricted' and no affiliateUrl: /go/e8-markets still exists
 * and 302s to officialUrl (official_site_click). CR rule: every firm keeps a CTA + Russia-access badge,
 * including the reviewed firm — so the verdict box and sources use RuGoLink /go/e8-markets with btn-outline
 * (info-only, not a sign-up CTA). Deliberately NOT using RuReviewVerdictBox: it would render btn-primary
 * above the alternatives, which the brief forbids. Badge from RuGoLink/RuAccessBadgeView ← firms.json
 * russiaStatus 'restricted' → «В списке ограничений». List prices only «по данным на 02.11.2026»;
 * promo codes omitted for RU readers (firm is RF-restricted → info-only).
 */
const CHECKED = '2026-11-02'
const DATE_PUBLISHED = '2026-11-09'
const ACCESS_CHECKED = '2026-11-02'
const PRICES_CHECKED = '2026-11-02'
const COUNTRIES_PAGE = '2026-10-01'
const ONE_HELP = '2026-10-26'
const PRO_HELP = '2026-09-23'
const SIG_HELP = '2026-10-15'
const PAYOUTS_HELP = '2026-09-23'
const PLATFORMS_HELP = '2026-10-28'
const TRUSTPILOT_CHECKED = '2026-10-15'
const FOUNDED_HELP = '2021'

const HELP = 'https://help.e8markets.com/en/articles/'
const SOURCES = {
  home: 'https://e8markets.com/',
  one: 'https://e8markets.com/e8-one',
  pro: 'https://e8markets.com/e8-pro',
  signature: 'https://e8markets.com/e8-signature',
  compare: 'https://e8markets.com/compare-simfi-funded-accounts',
  terms: 'https://e8markets.com/e8-markets-terms-and-conditions',
  trustpilot: 'https://www.trustpilot.com/review/e8markets.com',
  countries: `${HELP}5514278-accepted-countries`,
  oneHelp: `${HELP}11775980-e8-one`,
  proHelp: `${HELP}15274219-e8-pro`,
  sigHelp: `${HELP}11755943-e8-signature-forex`,
  overview: `${HELP}13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature`,
  custom: `${HELP}8880316-what-is-the-custom-account`,
  leverage: `${HELP}5514982-how-much-leverage-do-you-offer`,
  news: `${HELP}9185497-can-i-trade-news`,
  overnight: `${HELP}5514966-can-i-hold-positions-overnight-and-trade-over-the-weekend`,
  payouts: `${HELP}15272556-how-do-i-get-paid`,
  payment: `${HELP}5515027-what-payment-methods-do-you-accept`,
  refund: `${HELP}8811411-refund-policy`,
  platforms: `${HELP}9799834-what-trading-platforms-do-you-offer`,
  allocation: `${HELP}5515039-how-many-accounts-can-i-have`,
  about: `${HELP}14124293-who-is-e8`,
  payoutMin: `${HELP}9448349-what-is-the-minimum-payout`,
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
const usd = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, ' ')}`

type PriceRow = { size: string; one: number | null; pro: number | null }

/** List prices, USD, one-time, no activation fee — product pages + compare + help custom-account, 02.11.2026. */
const PRICE_ROWS: PriceRow[] = [
  { size: '$5K', one: 48, pro: 32 },
  { size: '$10K', one: 88, pro: 68 },
  { size: '$25K', one: 188, pro: 148 },
  { size: '$50K', one: 288, pro: 228 },
  { size: '$100K', one: 488, pro: 488 },
  { size: '$200K', one: 798, pro: 998 },
  { size: '$400K', one: 1_598, pro: 2_098 },
  { size: '$500K', one: 1_998, pro: 2_598 },
]
const cell = (value: number | null) => (value == null ? '—' : usd(value))

type ProgramRow = { key: string; name: string; href: string; steps: string; targets: string; limits: string; consistency: string; payout: string }

const PROGRAMS: ProgramRow[] = [
  { key: 'e8-one', name: 'E8 One (Classic / Perps)', href: SOURCES.oneHelp, steps: '1 этап', targets: 'пресет 9% (при DD 6%; диапазон 6–21%)', limits: 'дневной 4% пресет, общий 6% dynamic', consistency: 'челлендж нет; Performance 40%', payout: 'по запросу; 80/90/100%' },
  { key: 'e8-pro', name: 'E8 Pro (Classic / Perps)', href: SOURCES.proHelp, steps: '1 этап', targets: '8%', limits: 'дневной 2,5% static, общий 8% static', consistency: 'нет (есть дневной profit cap 2%)', payout: 'ежедневно; 80/100%' },
  { key: 'e8-signature', name: 'E8 Signature Forex', href: SOURCES.sigHelp, steps: '1 этап', targets: '6%', limits: 'EOD dynamic 3–4%; daily pause 2%', consistency: 'Performance 35%', payout: 'по запросу; 80%' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли пройти E8 Markets из России?',
    a: `Нет. Справка «Accepted Countries» (страница от ${ruDate(COUNTRIES_PAGE)}, ${asOf(ACCESS_CHECKED)}) прямо называет Россию, Беларусь и Украину в списке Restricted country list (Classic markets + Perpetuals); то же — в списке Futures. Страна определяется по документу KYC, а не по текущему местоположению. Обходить ограничение через VPN мы не советуем.`,
  },
  {
    q: 'Сколько стоит челлендж E8 Markets?',
    a: `Лист-цены ${asOf(PRICES_CHECKED)}: E8 One — от ${usd(48)} ($5K) до ${usd(1_998)} ($500K); E8 Pro — от ${usd(32)} до ${usd(2_598)}. На $100K у One и Pro лист-цена ${usd(488)}. Цены одноразовые, без activation fee. Промокоды для читателей из РФ не печатаем: фирма в списке ограничений. E8 Signature Forex: на сайте не указано / продукт не отображается на ${ruDate(PRICES_CHECKED)}.`,
  },
  {
    q: 'Какие правила consistency у E8 One и Signature?',
    a: `У E8 One на Performance лучший день — не больше 40% прибыли; на челлендже consistency нет. У E8 Signature Forex на Performance — 35%. У E8 Pro consistency нет (вместо него дневной profit cap 2% считается в цель и выплату). Цифры — ${asOf(CHECKED)}.`,
  },
  {
    q: 'Какой сплит и как выводить?',
    a: `Базовый сплит 80%. На E8 One при покупке можно выбрать 80/90/100%; на E8 Pro страница даёт 80/100% (справка custom-account ещё пишет 80/90/100% — Условия расходятся, уточните у поддержки). Выплаты: WorkMarket (банк), Rise (cash или crypto), Aeropay только для США. Прямого crypto-вывода по свежей справке нет; старые T&C называют USDC/USDT/BTC/ETH — условия расходятся, уточните у поддержки.`,
  },
  {
    q: 'На каких платформах можно торговать?',
    a: 'TradeLocker, Match-Trader, cTrader и MT5; для Perpetuals также E8 Terminal. Для клиентов из США — только TradeLocker и Match-Trader (справка о платформах, обновлена 28.10.2026).',
  },
  {
    q: 'Чем заменить E8 Markets трейдеру из РФ?',
    a: `У BrightFunded России нет в списке ограничений (на ${ruNotListedDate('bright-funded')}), у Crypto Fund Trader — тоже (на ${ruNotListedDate('crypto-fund-trader')}). Это не гарантия доступа: страну, KYC и способ выплаты сверяйте до оплаты.`,
  },
]

export default function RussianE8MarketsReviewPage() {
  const e8Status = russiaStatusFor('e8-markets')
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
    { name: 'Обзор E8 Markets' },
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
        <div className="ru-shell" data-russian-review="e8-markets" data-russia-status-e8-markets={e8Status}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
            {' / '}
            Обзор E8 Markets
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Проверено {ruDate(CHECKED)} по официальным страницам
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            E8 Markets — проп-фирма с однофазными программами E8 One и E8 Pro (Classic и Perpetuals) и линейкой
            Signature. Условия подробно описаны в справке, но для трейдеров из России главное другое: Россия стоит в
            списке Restricted country list. Ниже — что это значит, сколько стоят программы и чем фирму заменить.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-e8-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>3</strong><span>линейки в обзоре</span></div>
            <div className="ru-stat"><strong>{usd(32)}</strong><span>минимальная лист-цена (Pro $5K)</span></div>
            <div className="ru-stat"><strong>80%</strong><span>базовый сплит</span></div>
            <div className="ru-stat"><strong>4</strong><span>платформы (+ E8 Terminal)</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section ru-p1-verdict-section">
        <div className="ru-shell">
          <div className="ru-p1-verdict" data-ru-verdict={PATH} data-russian-e8-verdict-box="info-only" aria-labelledby="ru-verdict-title">
            <div className="ru-p1-verdict__head">
              <div>
                <p id="ru-verdict-title" className="ru-p1-verdict__name">E8 Markets</p>
              </div>
            </div>
            <p className="ru-p1-verdict__line">
              E8 Markets удобна тем, кому она доступна: однофазные One и Pro, настраиваемый сплит до 100%, четыре
              платформы и выплаты по запросу (у Pro — ежедневно). Но Россия, Беларусь и Украина прямо названы в справке
              «Accepted Countries», а страна определяется по документу KYC, не по IP. Поэтому для резидента РФ это
              справочный обзор, а не рекомендация к покупке. Если вы торгуете из России, смотрите альтернативы ниже:
              BrightFunded и Crypto Fund Trader.
            </p>
            <div className="ru-p1-cta ru-p1-cta--compact" data-russian-e8-cta="verdict-box">
              <RuGoLink
                firm="e8-markets"
                href="/go/e8-markets?from=ru-e8-markets-review-verdict-box"
                prefetch={false}
                rel={goLinkRel('e8-markets')}
                target="_blank"
                className="btn-outline"
                data-ru-verdict-cta="e8-markets"
              >
                Официальный сайт E8 Markets <ExternalLink size={13} aria-hidden="true" />
              </RuGoLink>
              <span className="ru-p1-cta__note">Официальный сайт · без партнёрского соглашения · для резидентов других стран</span>
            </div>
            <div className="ru-p1-verdict__fit">
              <div>
                <p className="ru-p1-verdict__h">Подойдёт, если…</p>
                <ul>
                  <li>вы живёте не в стране из Restricted country list и проходите KYC по её документу;</li>
                  <li>нужна однофазная оценка и настраиваемый сплит 80/90/100%;</li>
                  <li>важны выплаты по запросу (One) или ежедневные (Pro) через WorkMarket / Rise.</li>
                </ul>
              </div>
              <div>
                <p className="ru-p1-verdict__h">Не подойдёт, если…</p>
                <ul>
                  <li>вы резидент России, Беларуси или Украины;</li>
                  <li>нужен опубликованный план масштабирования — на сайте не указано;</li>
                  <li>вы рассчитываете на прямой crypto-вывод без партнёра: условия расходятся.</li>
                </ul>
              </div>
            </div>
            <p className="ru-p1-verdict__checked">
              <a href="#sources">✓ Данные проверены {ruDate(CHECKED)}</a> · У сайта нет партнёрского договора с E8 Markets.
            </p>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-e8-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора E8 Markets">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: доступ из России</a></li>
                <li><a href="#company">Компания</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#example">Пример: E8 One $100K</a></li>
                <li><a href="#rules">Правила торговли</a></li>
                <li><a href="#payouts">Выплаты и сплит</a></li>
                <li><a href="#platforms">Платформы</a></li>
                <li><a href="#reviews">Отзывы</a></li>
                <li><a href="#compare">Альтернативы</a></li>
                <li><a href="#sources">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-e8-verdict="summary">
            <h2>Коротко: доступна ли E8 Markets из России</h2>
            <div className="ru-notice" data-russian-e8-access={e8Status}>
              <RuAccessBadgeView firm="e8-markets" status={e8Status} hint={false} />{' '}
              Справка «Accepted Countries» (страница от {ruDate(COUNTRIES_PAGE)}, {asOf(ACCESS_CHECKED)}) пишет: фирма
              «unable to accommodate traders from certain countries» и приводит Restricted country list (Classic markets
              + Perpetuals) с Беларусью, Россией и Украиной; отдельный Futures-список называет те же страны и Крым. Страна
              определяется по документу, который вы даёте на верификации, а не по текущему местоположению. Подвал сайта
              (Jurisdictional Restrictions) повторяет: E8 Funding LLC не обслуживает резидентов России, Украины и Беларуси.
            </div>
            <p>
              Казахстан в обоих списках не назван: на сайте не указано, открыт ли доступ — положительных доказательств
              тоже нет, поэтому мы не пишем, что Казахстан «открыт». Советов по обходу ограничений через VPN мы не даём.
            </p>
            <p>
              Русский язык ≠ доступ: даже если интерфейс или поддержка понятны, решают список стран, KYC и условия. Чем в
              целом отличаются проп-фирмы для русскоязычных — в нашем{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">гиде для русскоязычных трейдеров</Link>.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="e8-markets-review">
              <strong>Раскрытие.</strong> У сайта нет партнёрского договора с E8 Markets. Кнопка «официальный сайт» ведёт
              через /go/e8-markets на e8markets.com без партнёрской атрибуции (info-only, не призыв к регистрации для
              резидентов РФ) и несёт бейдж доступа. Ссылка на BrightFunded в блоке альтернатив — партнёрская; ссылка на
              Crypto Fund Trader — обычная.
            </div>
            <div className="ru-actions" data-russian-e8-cta="verdict">
              <Link href="#compare" className="btn-primary">
                Альтернативы для трейдеров из РФ <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <RuGoLink
                firm="e8-markets"
                href="/go/e8-markets?from=ru-e8-markets-review-verdict"
                rel={goLinkRel('e8-markets')}
                className="btn-outline"
              >
                Официальный сайт · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </div>
            <p className="ru-source-line">
              Ссылка на E8 Markets не партнёрская: Traders Fund Hub не получает комиссию за этот переход.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.countries, 'Accepted Countries')}, {src(SOURCES.home, 'подвал e8markets.com')},{' '}
              {src(SOURCES.terms, 'Terms and Conditions')} — {asOf(ACCESS_CHECKED)}.
            </p>
          </div>
        </section>

        <RuTelegramBlock placement="obzor-e8-markets" />

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-e8-entity={CHECKED}>
            <h2>Компания: кто стоит за E8 Markets</h2>
            <p>
              В подвале сайта: <strong>E8 Funding LLC</strong> — technology and education company по законам США, адрес
              4101 McEwen Rd #205, Dallas, TX 75244. Там же названы <strong>E8 Markets Ltd</strong> (Saint Lucia, рег.
              2025-00347; оператор платформы MT5) и <strong>Digital Renaissance LLC</strong> (Puerto Rico; внутренние
              правила сайта). Год основания — 2021 (справка «Who is E8»).
            </p>
            <p>
              Лицензии финансового регулятора фирма не заявляет: «We do not act as a broker or fund.» Оценка и
              Performance-счета работают на симулированных счетах. Что это значит на практике — в материале{' '}
              <Link href="/ru/prop-trejding">что такое проп трейдинг</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.home, 'подвал сайта')}, {src(SOURCES.terms, 'Terms')}, {src(SOURCES.about, 'Who is E8')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted" data-russian-e8-prices={PRICES_CHECKED}>
              Лист-цены в долларах США {asOf(PRICES_CHECKED)} — со страниц E8 One / E8 Pro, compare и справки «What is
              the custom account». Цены одноразовые, activation fee нет. Classic и Perpetuals у One и Pro в таблице
              совпадают. Промокоды и sale-цены не печатаем: для читателей из РФ фирма в списке ограничений, а источники по
              коду E8 расходятся — условия расходятся, уточните у поддержки.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Лист-цены E8 Markets">
              <table className="ru-table" data-russian-e8-price-table={PRICES_CHECKED}>
                <caption className="sr-only">Лист-цены E8 One и E8 Pro по размеру счёта</caption>
                <thead>
                  <tr>
                    <th>Счёт</th>
                    <th>E8 One</th>
                    <th>E8 Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_ROWS.map(row => (
                    <tr key={row.size}>
                      <th scope="row">{row.size}</th>
                      <td>{cell(row.one)}</td>
                      <td>{cell(row.pro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы E8 Markets">
              <table className="ru-table" data-russian-e8-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы E8 Markets: этапы, цели, лимиты, consistency, выплаты</caption>
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Этапы</th>
                    <th>Цели</th>
                    <th>Лимиты убытка</th>
                    <th>Consistency</th>
                    <th>Выплата / сплит</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-e8-product={program.key}>
                      <td><strong>{src(program.href, program.name)}</strong></td>
                      <td>{program.steps}</td>
                      <td>{program.targets}</td>
                      <td>{program.limits}</td>
                      <td>{program.consistency}</td>
                      <td>{program.payout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ru-shell ru-content">
            <p data-russian-e8-signature-gap={PRICES_CHECKED}>
              <strong>E8 Signature Forex.</strong> На {ruDate(PRICES_CHECKED)} страница продукта рендерит пустые значения,
              а Classic Signature в данных сайта не найден. На сайте не указано / продукт не отображается на{' '}
              {ruDate(PRICES_CHECKED)}. Цены из старой help-таблицы мы не печатаем.
            </p>
            <p>
              У E8 One конфигурator даёт dynamic DD 4/6/8/10/14% → цели 6/9/12/15/21% и дневные 3/4/5,3/6,6/9,2%; сплит
              80/90/100%. Цены нестандартных конфигураций текстом на страницах не видны. Как в целом устроены цели и
              лимиты — в <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде о челленджах</Link>.
            </p>
            <p>
              Максимум на Performance: {usd(500_000)} на продукт на рынок; суммарно до {usd(3_900_000)} на household
              (справка о лимитах счетов). План масштабирования: на сайте не указано.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.one, 'E8 One')}, {src(SOURCES.pro, 'E8 Pro')}, {src(SOURCES.signature, 'E8 Signature')},{' '}
              {src(SOURCES.compare, 'compare')}, {src(SOURCES.custom, 'custom account')}, {src(SOURCES.allocation, 'лимит счетов')} — {asOf(PRICES_CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-e8-example="one-100k-6dd">
            <h2>Пример пути: E8 One $100K (пресет 6% DD)</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цена {asOf(PRICES_CHECKED)} и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li><strong>Взнос:</strong> {usd(488)} (лист, one-time, без activation fee) — {src(SOURCES.one, 'e8markets.com/e8-one')}, {asOf(PRICES_CHECKED)}.</li>
              <li><strong>Цель:</strong> 9% = {usd(9_000)} на $100K при пресете 6% DD. Минимума торговых дней нет («Pass in one day»); неактивность — 60 дней.</li>
              <li><strong>Дневной лимит:</strong> 4% = {usd(4_000)} от баланса на начало дня; hard breach по equity или balance.</li>
              <li><strong>Общий лимит:</strong> 6% dynamic от высшего закрытого баланса, затем фиксируется на initial balance.</li>
              <li><strong>Performance consistency 40%:</strong> лучший день — не больше 40% суммарной прибыли.</li>
              <li><strong>Первая выплата:</strong> по запросу, не раньше чем через 3 дня (через математику лучшего дня); минимум net payout &gt; 50% дневного DD (для $100K/4% справка даёт порядка {usd(2_001)}).</li>
              <li><strong>Расчёт при сплите 80%:</strong> прибыль {usd(5_000)} × 80% = {usd(4_000)} на руки; лучший день при 40% — не больше {usd(2_000)} из {usd(5_000)}.</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.one, 'E8 One')}, {src(SOURCES.oneHelp, 'справка E8 One')} (обновлена {ruDate(ONE_HELP)}),{' '}
              {src(SOURCES.payoutMin, 'минимум выплаты')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-e8-rules={CHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li><strong>E8 One:</strong> цель пресет 9% (6% DD); дневной 4%; общий 6% dynamic; consistency только на Performance (40%); новостная торговля на челлендже разрешена, на Performance — запрет ±5 мин вокруг high-impact; overnight/weekend разрешены; EA разрешены, если нет одинаковых сделок у разных пользователей; копирование — только свои счета.</li>
              <li><strong>E8 Pro:</strong> цель 8%; дневной 2,5% от initial; общий 8% static; consistency нет (есть 2% daily profit cap); новости разрешены; overnight/weekend разрешены; EA и копирование — как у One.</li>
              <li><strong>E8 Signature Forex:</strong> цель 6%; EOD dynamic max loss; daily pause 2% (soft); Performance consistency 35%; overnight/weekend нельзя (позиции закрывают в 23:00 server time); 5 прибыльных дней (≥0,3%) между выплатами после первой.</li>
              <li><strong>Плечо Classic:</strong> FX 1:30, индексы/металлы/энергия 1:15, crypto 1:1. <strong>Perps:</strong> BTC/ETH 1:15, другой crypto 1:2, stocks 1:5, FX 1:25.</li>
              <li><strong>Прочее:</strong> HFT — нельзя держать больше 50% сделок меньше минуты; cross-account hedging запрещён; неактивность 60 дней закрывает счёт (Classic/Perps).</li>
            </ul>
            <p className="ru-source-line">
              Источники: {src(SOURCES.oneHelp, 'E8 One')} ({ruDate(ONE_HELP)}), {src(SOURCES.proHelp, 'E8 Pro')} ({ruDate(PRO_HELP)}),{' '}
              {src(SOURCES.sigHelp, 'Signature')} ({ruDate(SIG_HELP)}), {src(SOURCES.news, 'новости')}, {src(SOURCES.overnight, 'overnight/weekend')},{' '}
              {src(SOURCES.leverage, 'плечо')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-e8-payouts={PAYOUTS_HELP}>
            <h2>Выплаты и сплит 80%</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат E8 Markets">
              <table className="ru-table">
                <caption className="sr-only">Сплит, циклы и способы выплат E8 Markets</caption>
                <tbody>
                  <tr><th scope="row">Сплит</th><td>80% базовый; One — 80/90/100% при покупке; Pro — 80/100% на странице (help custom-account ещё пишет 80/90/100% — условия расходятся, уточните у поддержки); Signature — 80%</td></tr>
                  <tr><th scope="row">E8 One</th><td>по запросу; первая не раньше 3 дней; минимум net &gt; 50% дневного DD</td></tr>
                  <tr><th scope="row">E8 Pro</th><td>ежедневно при ≥1% прибыли; 50% прибыли можно запросить, 50% остаётся буфером</td></tr>
                  <tr><th scope="row">Способы</th><td>WorkMarket (банк), Rise (cash или crypto), Aeropay (только США). Свежая справка: «no direct crypto payment solutions»</td></tr>
                  <tr><th scope="row">Срок</th><td>медиана ~11 ч до одобрения и ~24 ч до средств (янв–май 2026); до 5 рабочих дней</td></tr>
                  <tr><th scope="row">KYC выплаты</th><td>нужен KYC WorkMarket или Rise; без него выплату не дают</td></tr>
                </tbody>
              </table>
            </div>
            <p data-russian-e8-crypto-conflict={CHECKED}>
              <strong>Crypto и возвраты.</strong> Справка о выплатах (23.09.2026) пишет, что прямого crypto нет; T&C 5.2
              по-прежнему называют USDC/USDT/BTC/ETH. Возвраты: help допускает refund в первые 30 дней без торговли (не
              для crypto-оплаты), T&C говорят «non-refundable under any circumstance». Условия расходятся, уточните у поддержки. Сравнить способы с другими фирмами — в обзоре{' '}
              <Link href="/ru/vyplaty-prop-firm">как платят проп-компании</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.payouts, 'выплаты')} ({ruDate(PAYOUTS_HELP)}), {src(SOURCES.payment, 'оплата')},{' '}
              {src(SOURCES.refund, 'refund')}, {src(SOURCES.terms, 'T&C')}, {src(SOURCES.custom, 'custom account')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content" data-russian-e8-platforms={PLATFORMS_HELP}>
            <h2>Платформы</h2>
            <p>
              TradeLocker, Match-Trader, cTrader и MT5; для Perpetuals также E8 Terminal. Клиенты из США — только
              TradeLocker и Match-Trader (справка обновлена {ruDate(PLATFORMS_HELP)}). Если ищете фирму именно под
              cTrader, посмотрите подборку <Link href="/ru/prop-firmy-s-ctrader">проп-фирм с cTrader</Link>. Для
              крипто-угла (Perpetuals) рядом — рейтинг{' '}
              <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компаний</Link>.
            </p>
            <p>
              Оплата челленджа: карты, Apple Pay, Google Pay, crypto через Confirmo (справка о платежах). Что меняется
              после прохождения оценки — в разделе о <Link href="/ru/funded-account">проп-счёте (funded account)</Link>.
            </p>
            <p className="ru-source-line">
              Источники: {src(SOURCES.platforms, 'платформы')}, {src(SOURCES.payment, 'способы оплаты')}, {src(SOURCES.home, 'главная')} — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-e8-reviews="trustpilot-suppressed">
            <h2>Отзывы о E8 Markets</h2>
            <p>
              На {src(SOURCES.trustpilot, 'Trustpilot')} рейтинг не опубликован / не перепроверен (данные на{' '}
              {ruDate(TRUSTPILOT_CHECKED)}): площадка скрывала оценку из-за нарушения своих правил; повторно открыть
              страницу {ruDate(CHECKED)} не удалось (HTTP 403). Звёзд мы не показываем. Непроверенные истории из блогов и
              чатов не пересказываем. Как читать отзывы — в разборе{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывов о проп-фирмах</Link>.
            </p>
            <p data-russian-e8-precheck="closed-firms">
              До оплаты любой фирмы проверьте, нет ли её в списке{' '}
              {closedHref ? <Link href={closedHref}>закрытых проп-фирм</Link> : 'закрытых проп-фирм'} — E8 Markets в нём
              нет.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из России</h2>
            <p data-russian-e8-alt-basis="not-in-restricted-list">
              У BrightFunded в CFD-челлендже России нет в списке ограничений (на {ruNotListedDate('bright-funded')}), у
              Crypto Fund Trader — тоже нет (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия
              доступа. Статус BrightFunded относится только к челленджу: фьючерсный продукт BrightFunded
              {brightFuturesDate ? ` (справка обновлена ${ruDate(brightFuturesDate)})` : ''} ограничивает Россию,
              Беларусь и Украину{brightFuturesUrl ? <> — {src(brightFuturesUrl, 'список стран BrightFunded Futures')}</> : null}.
              Сводная таблица фирм — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-e8-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-e8-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит {brightSplit != null ? `${brightSplit}%` : 'по программе'}; CFD-челлендж.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-e8-markets-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-e8-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-e8-markets-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p>
              Если важна криптовалюта — <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link>; для
              валютных пар — <Link href="/ru/forex-prop-firmy">форекс проп-фирмы</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Однофазные One и Pro</strong> с понятными пресетами.</li>
                  <li><strong>Сплит до 100%</strong> при покупке (One / Pro).</li>
                  <li><strong>Четыре платформы</strong> + E8 Terminal для Perps.</li>
                  <li><strong>Выплаты по запросу / ежедневно</strong> через WorkMarket и Rise.</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Россия в списке ограничений</strong> — Classic, Perps и Futures.</li>
                  <li><strong>Signature Forex</strong> на 02.11.2026 не отображается на сайте.</li>
                  <li><strong>План масштабирования</strong> — на сайте не указано.</li>
                  <li><strong>Crypto-выплаты и refunds</strong> — условия расходятся между help и T&C.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>Проверено {ruDate(CHECKED)} по официальным страницам E8 Markets (capture 11:26–11:35 Europe/Riga).</p>
            <ul>
              <li>{src(SOURCES.countries, 'Accepted Countries')} (страница от {ruDate(COUNTRIES_PAGE)}), {src(SOURCES.home, 'подвал / Jurisdictional Restrictions')}, {src(SOURCES.terms, 'T&C')} — {asOf(ACCESS_CHECKED)}.</li>
              <li>{src(SOURCES.one, 'E8 One')}, {src(SOURCES.pro, 'E8 Pro')}, {src(SOURCES.signature, 'E8 Signature')}, {src(SOURCES.compare, 'compare')}, {src(SOURCES.custom, 'custom account')} — лист-цены {asOf(PRICES_CHECKED)}.</li>
              <li>{src(SOURCES.oneHelp, 'справка E8 One')} ({ruDate(ONE_HELP)}), {src(SOURCES.proHelp, 'E8 Pro')} ({ruDate(PRO_HELP)}), {src(SOURCES.sigHelp, 'Signature')} ({ruDate(SIG_HELP)}), {src(SOURCES.overview, 'product overviews')}, {src(SOURCES.leverage, 'плечо')}, {src(SOURCES.news, 'новости')}, {src(SOURCES.overnight, 'overnight/weekend')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.payouts, 'выплаты')} ({ruDate(PAYOUTS_HELP)}), {src(SOURCES.payment, 'оплата')}, {src(SOURCES.refund, 'refund')}, {src(SOURCES.platforms, 'платформы')} ({ruDate(PLATFORMS_HELP)}), {src(SOURCES.allocation, 'лимит счетов')}, {src(SOURCES.about, 'Who is E8')} — {asOf(CHECKED)}.</li>
              <li>{src(SOURCES.trustpilot, 'Trustpilot')} — рейтинг не опубликован / не перепроверен (данные на {ruDate(TRUSTPILOT_CHECKED)}).</li>
            </ul>
            <p data-russian-e8-gaps={CHECKED}>
              На сайте не указано ({asOf(CHECKED)}): цены и статус продажи E8 Signature Forex; план масштабирования;
              доступ для Казахстана; checkout-цены нестандартных конфигураций. Условия расходятся: код E8 (%),
              crypto-выплаты (help vs T&C), refunds (help vs T&C), сплит-опции Pro (страница vs custom-account). Мы не
              регистрировались, не оплачивали челлендж и не получали выплату от E8 Markets.
            </p>
            <div className="ru-notice" data-russian-risk-disclaimer="e8-markets-review">
              <strong>Риск.</strong> Торговля с плечом связана с высоким риском. Большинство участников не проходит оценку,
              взнос после покупки обычно не возвращается. Счета на этапах оценки и Performance — симулированные;
              вознаграждение выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <p className="ru-actions" data-russian-e8-cta="final" data-russian-e8-official="non-affiliate">
              <RuGoLink
                firm="e8-markets"
                href="/go/e8-markets?from=ru-e8-markets-review-sources"
                rel={goLinkRel('e8-markets')}
                className="btn-outline"
              >
                Официальный сайт, не партнёрская ссылка · для резидентов других стран <ExternalLink size={14} aria-hidden="true" />
              </RuGoLink>
            </p>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы об E8 Markets</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
