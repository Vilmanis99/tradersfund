import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { ArrowRight, Scale, ShieldAlert, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { challengeTierEconomics, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/ftmo-vs-bright-funded'
const TITLE = 'FTMO или BrightFunded: альтернатива FTMO для россиян'
const H1 = 'FTMO или BrightFunded: альтернатива FTMO для россиян'
const DESCRIPTION = 'FTMO закрыта для РФ, Беларуси и Казахстана. Сравниваем с BrightFunded цену, просадку, сплит, выплаты, платформы и оплату криптой по данным на 19.10.2026.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['ftmo или brightfunded', 'ftmo vs brightfunded', 'альтернатива ftmo', 'альтернатива ftmo для россиян', 'brightfunded россия'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/** Dated facts from Prop Firm Tracker files (/workspace/ru-data/2026-10-14-*.md) and firms.json rule evidence. */
const TRACKER_CAPTURE = '2026-10-14'
/** BrightFunded country sources re-read 2026-10-19: help article (updated 15.09.2026) lists 6 incl. Pakistan; Terms §2 list 5 without Pakistan and reserve further restrictions. */
const BRIGHT_COUNTRIES_CHECKED = '2026-10-19'
/** Prices re-read on ftmo.com (2-step-challenge, 1-step-challenge) and brightfunded.com (1-step, 2-step-bright, 2-step-classic) in the 2026-10-19 Tracker daily recheck; identical to the 14.10 capture. */
const PRICE_CAPTURE = '2026-10-19'
const RULES_CAPTURE = '2026-10-15'
const TRUSTPILOT_CAPTURE = '2026-10-15'
/** /workspace/ru-data/2026-10-19-ftmo-brightfunded-payments.md (ftmo.com global pages, not FTMO US). */
const PAYMENTS_CAPTURE = '2026-10-19'

const SOURCES = {
  ftmoCountries: 'https://ftmo.com/en/faq/who-can-join-ftmo/',
  ftmoReward: 'https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/',
  ftmoObjectives: 'https://ftmo.com/en/trading-objectives/',
  ftmoPlatforms: 'https://ftmo.com/en/trading-platforms/',
  ftmoTwoStep: 'https://ftmo.com/en/2-step-challenge/',
  ftmoPayments: 'https://ftmo.com/en/faq/what-payment-methods-are-available/',
  ftmoCryptoWithdrawals: 'https://ftmo.com/en/crypto-withdrawals/',
  brightPayouts: 'https://help.brightfunded.com/en/articles/9241681-how-can-i-get-paid',
  brightCountries: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded',
  brightTerms: 'https://brightfunded.com/terms-and-conditions',
  brightCrypto: 'https://help.brightfunded.com/en/articles/9286623-can-i-pay-for-my-challenge-with-crypto',
  brightCards: 'https://help.brightfunded.com/en/articles/12000749-the-most-frequently-asked-general-questions',
  brightReward: 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account',
  brightPlatforms: 'https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer',
  brightConsistency: 'https://help.brightfunded.com/en/articles/12577176-does-brightfunded-have-a-consistency-rule',
  trustpilotFtmo: 'https://www.trustpilot.com/review/ftmo.com',
  trustpilotBright: 'https://www.trustpilot.com/review/brightfunded.com',
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли резиденту России торговать в FTMO?',
    a: `Нет. ${asOf(TRACKER_CAPTURE)} Russian Federation стоит в официальном списке стран FTMO, резидентам которых услуги не оказываются. В том же списке Беларусь, Казахстан, Кыргызстан, Узбекистан, Таджикистан и Туркменистан. Проверка личности перед профинансированным этапом делает обход через VPN дорогой потерей взноса.`,
  },
  {
    q: 'BrightFunded работает с Россией?',
    a: `${asOf(BRIGHT_COUNTRIES_CHECKED)} России нет ни в одном списке ограничений BrightFunded. Справка (обновлена 15.09.2026) называет шесть стран: Кубу, Иран, Северную Корею, Сирию, Вьетнам и Пакистан. Условия (п. 2) называют пять, без Пакистана, но оставляют за фирмой право ограничивать и другие страны, поэтому для новой регистрации действует более строгий список справки. Отсутствие страны в списке — не персональное одобрение: гражданство, адрес, KYC и способ выплаты всё равно проверяются по вашему профилю.`,
  },
  {
    q: 'Чем оплатить челлендж BrightFunded из России?',
    a: `${asOf(PAYMENTS_CAPTURE)} BrightFunded принимает криптовалюту: BTC (сети Bitcoin и Lightning), USDT (TRC20), USDC (ERC-20), ETH (ERC-20), LTC, TRX и SOL. Оплата банковской картой тоже подтверждена (платёжные системы фирма не называет), но о картах «Мир» и картах российских банков фирма официально ничего не пишет, поэтому на них не рассчитывайте заранее.`,
  },
  {
    q: 'У кого выше доля прибыли: FTMO или BrightFunded?',
    a: 'Базовые цифры близки. У FTMO на 2-Step по умолчанию 80% и 90% через план масштабирования; на 1-Step и Instant — 90%. У BrightFunded по умолчанию 80%, 90% — платное дополнение при покупке, до 100% — через масштабирование. Сравнивайте процент вместе со сроком первой выплаты: у FTMO запрос возможен с 14-го дня, у BrightFunded — через 30 дней после первой сделки.',
  },
  {
    q: 'Если я живу в ЕС или Израиле, что выбрать?',
    a: 'Если вашей страны нет в списке ограничений FTMO, выбор становится вопросом правил, а не доступа. FTMO даёт TradingView и более ранний первый запрос выплаты, BrightFunded — дешевле на $100K, без правила лучшего дня и с разрешённым удержанием позиций на выходных. Проверьте свой профиль на сайте каждой фирмы перед оплатой.',
  },
  {
    q: 'Зачем на странице кнопка FTMO, если Россия ограничена?',
    a: 'Кнопка FTMO нужна русскоязычным трейдерам в странах, которых нет в списке ограничений FTMO. Резидентам России, Беларуси, Казахстана и других стран из списка она не подходит. Ссылка ведёт на официальный сайт FTMO и не партнёрская: у сайта нет партнёрской программы FTMO.',
  },
]

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? 'не подтверждено' : `${value}%`
}

function eur(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value <= 0 ? 'не подтверждено' : `€${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function drawdownLabel(product: Challenge | undefined) {
  if (!product) return 'требует повторной проверки'
  return ({
    static: 'статическая',
    trailing: 'подвижная (от максимума эквити)',
    'eod-trailing': 'подвижная по итогам дня',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

function targets(product: Challenge | undefined) {
  if (!product) return 'требует повторной проверки'
  return Array.from({ length: product.phases }, (_, index) =>
    percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function fee(product: Challenge | undefined, size: number) {
  return eur(product?.accountSizes.find(tier => tier.sizeUsd === size)?.priceEur)
}

function breakEven(product: Challenge | undefined, size: number) {
  const tier = product?.accountSizes.find(item => item.sizeUsd === size)
  if (!product || !tier) return 'не подтверждено'
  return eur(challengeTierEconomics(product, tier)?.breakEvenProfit)
}

export default function RussianFtmoVsBrightFundedPage() {
  const fresh = (product: Challenge) => isChallengeFresh(product)
  const brightAll = getChallengesByFirm('bright-funded')
  const ftmoAll = getChallengesByFirm('ftmo')
  const bright = brightAll.filter(fresh)
  const ftmo = ftmoAll.filter(fresh)
  const find = (rows: Challenge[], slug: string) => rows.find(product => product.productSlug === slug)
  const bfOne = find(bright, 'bright-funded-1-step')
  const bfBright = find(bright, 'bright-funded-2-step-bright')
  const bfClassic = find(bright, 'bright-funded-2-step-classic')
  const ftmoTwo = find(ftmo, 'ftmo-challenge-2-step')
  const ftmoOne = find(ftmo, 'ftmo-challenge-1-step')
  const complete = Boolean(bfOne && bfBright && bfClassic && ftmoTwo && ftmoOne)
    && isChallengeFresh({ sourceCapturedAt: TRACKER_CAPTURE })
  const captureDates = [...brightAll, ...ftmoAll].map(product => product.sourceCapturedAt).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  const earliestCapture = captureDates[0] ?? TRACKER_CAPTURE
  const priceCapture = earliestCapture > PRICE_CAPTURE ? earliestCapture : PRICE_CAPTURE
  const dateModified = russianRouteDateModified(PATH)
  const ftmoStatus = russiaStatusFor('ftmo')
  const brightStatus = russiaStatusFor('bright-funded')
  const ftmoDailyLine = ftmoTwo?.dailyLossPct != null ? (100000 * ftmoTwo.dailyLossPct) / 100 : null
  const bfTrail = bfOne?.maxLossPct != null ? (100000 * bfOne.maxLossPct) / 100 : null
  const feeOf = (product: Challenge | undefined) => product?.accountSizes.find(tier => tier.sizeUsd === 100000)?.priceEur ?? null
  const ftmoFee = feeOf(ftmoTwo)
  const classicFee = feeOf(bfClassic)
  const feeGap = ftmoFee != null && classicFee != null ? ftmoFee - classicFee : null
  const bfBrightDailyLine = bfBright?.dailyLossPct != null ? (100000 * bfBright.dailyLossPct) / 100 : null
  const usd = (value: number | null) => value == null ? 'не подтверждено' : `$${value.toLocaleString('en-US')}`

  const rows: Array<{ id: string; field: string; bright: ReactNode; ftmo: ReactNode; date: string; source: string; source2?: string }> = [
    {
      id: 'russia', field: 'Доступ из России',
      bright: <>Россия не в списке ограничений. Справка: Куба, Иран, КНДР, Сирия, Вьетнам и Пакистан (6); условия: те же без Пакистана (5); {asOf(BRIGHT_COUNTRIES_CHECKED)} <RuAccessBadge firm="bright-funded" /></>,
      ftmo: <>Россия в списке ограниченных стран <RuAccessBadge firm="ftmo" /></>,
      date: TRACKER_CAPTURE, source: SOURCES.ftmoCountries,
    },
    {
      id: 'cis', field: 'Другие страны СНГ',
      bright: 'Беларусь, Казахстан, Узбекистан и др. не названы ни в справке, ни в условиях',
      ftmo: 'Ограничены Беларусь, Казахстан, Кыргызстан, Узбекистан, Таджикистан, Туркменистан и часть регионов Украины',
      date: BRIGHT_COUNTRIES_CHECKED, source: SOURCES.brightCountries, source2: SOURCES.brightTerms,
    },
    {
      id: 'price', field: 'Взнос за счёт $100K',
      bright: <>2-Step Classic {fee(bfClassic, 100000)} · 2-Step Bright {fee(bfBright, 100000)} · 1-Step {fee(bfOne, 100000)}</>,
      ftmo: <>2-Step {fee(ftmoTwo, 100000)} · 1-Step {fee(ftmoOne, 100000)}</>,
      date: priceCapture, source: bfClassic?.sourceUrl ?? SOURCES.ftmoTwoStep,
    },
    {
      id: 'targets', field: 'Цели прибыли',
      bright: <>Classic {targets(bfClassic)} · Bright {targets(bfBright)} · 1-Step {targets(bfOne)}</>,
      ftmo: <>2-Step {targets(ftmoTwo)} · 1-Step {targets(ftmoOne)}</>,
      date: earliestCapture, source: ftmoTwo?.sourceUrl ?? SOURCES.ftmoTwoStep,
    },
    {
      id: 'drawdown', field: 'Тип просадки и лимиты (дневной / общий)',
      bright: <>Classic: {drawdownLabel(bfClassic)}, {percent(bfClassic?.dailyLossPct)} / {percent(bfClassic?.maxLossPct)} · Bright: {drawdownLabel(bfBright)}, {percent(bfBright?.dailyLossPct)} / {percent(bfBright?.maxLossPct)} · 1-Step: {drawdownLabel(bfOne)}, {percent(bfOne?.dailyLossPct)} / {percent(bfOne?.maxLossPct)}</>,
      ftmo: <>2-Step: {drawdownLabel(ftmoTwo)}, {percent(ftmoTwo?.dailyLossPct)} / {percent(ftmoTwo?.maxLossPct)} · 1-Step: {drawdownLabel(ftmoOne)}, {percent(ftmoOne?.dailyLossPct)} / {percent(ftmoOne?.maxLossPct)}</>,
      date: RULES_CAPTURE, source: SOURCES.ftmoObjectives,
    },
    {
      id: 'split', field: 'Доля прибыли',
      bright: '80% по умолчанию; 90% — платное дополнение; до 100% — через план масштабирования',
      ftmo: '2-Step: 80% по умолчанию, 90% через масштабирование; 1-Step и Instant: 90%',
      date: TRACKER_CAPTURE, source: SOURCES.ftmoReward,
    },
    {
      id: 'payout', field: 'Первая выплата и частота',
      bright: 'Первая выплата — через 30 дней после первой сделки на счёте. Дальше, судя по справке и списку дополнений, раз в 14 дней по умолчанию, а еженедельно — платное дополнение. Справка противоречит себе: там же 14-дневный цикл назван дополнением',
      ftmo: 'Первую выплату можно запросить на 14-й день после первой сделки; график последующих выплат FTMO публично не уточняет',
      date: PAYMENTS_CAPTURE, source: SOURCES.brightReward, source2: SOURCES.ftmoReward,
    },
    {
      id: 'platforms', field: 'Платформы',
      bright: 'MT5, DXTrade, cTrader (MT5 ограничен для США и ОАЭ)',
      ftmo: 'MT5, MT4, cTrader, TradingView (через брокерский профиль OANDA)',
      date: RULES_CAPTURE, source: SOURCES.ftmoPlatforms,
    },
    {
      id: 'payments', field: 'Оплата челленджа',
      bright: 'Крипта: BTC (сети Bitcoin и Lightning), USDT TRC20, USDC ERC-20, ETH ERC-20, LTC, TRX, SOL; банковская карта (платёжные системы фирма не называет). Карты «Мир» и российских банков официально не упоминаются',
      ftmo: 'Без комиссии: карты Visa, Mastercard, Diners Club, Discover, Apple Pay, Google Pay, Revolut Pay. С комиссией 3%: PayPal, Skrill, крипта. Банковский перевод — только в EUR или CZK. «Мир» и карты российских банков не упоминаются',
      date: PAYMENTS_CAPTURE, source: SOURCES.brightCrypto, source2: SOURCES.ftmoPayments,
    },
    {
      id: 'withdrawals', field: 'Способы получения выплаты',
      bright: 'USDC (ERC-20) или банковский перевод в евро',
      ftmo: 'Банковский перевод, Visa Direct / Mastercard Send (до $20,000), Skrill (до $3,000), крипта (BTC, ETH, LTC, USDC ERC-20, USDT TRC20). PayPal и Rise в списке нет',
      date: PAYMENTS_CAPTURE, source: SOURCES.brightPayouts, source2: SOURCES.ftmoReward,
    },
    {
      id: 'days', field: 'Минимум торговых дней',
      bright: <>{bfClassic?.minTradingDays ?? 'не подтверждено'} в каждой фазе (все программы)</>,
      ftmo: <>2-Step: {ftmoTwo?.minTradingDays ?? 'не подтверждено'}; 1-Step: отдельный минимум не указан</>,
      date: earliestCapture, source: SOURCES.ftmoTwoStep,
    },
    {
      id: 'consistency', field: 'Правило лучшего дня',
      bright: 'Нет: фирма пишет, что сейчас не применяет правило последовательности',
      ftmo: <>1-Step: лучший день не больше {percent(ftmoOne?.consistencyRulePct)} всей прибыли (для заказов с 12.10.2026); 2-Step: не указано</>,
      date: RULES_CAPTURE, source: SOURCES.brightConsistency,
    },
    {
      id: 'weekend', field: 'Позиции на ночь и выходные',
      bright: 'Удержание на выходных разрешено',
      ftmo: 'Ограничено на счёте Standard; у Swing ограничений нет',
      date: RULES_CAPTURE, source: SOURCES.ftmoTwoStep,
    },
    {
      id: 'trustpilot', field: 'Trustpilot',
      bright: 'Рейтинг скрыт Trustpilot из-за нарушения правил площадки; отзывов: 573',
      ftmo: '4.8 из 5, отзывов: 54 501',
      date: TRUSTPILOT_CAPTURE, source: SOURCES.trustpilotBright,
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'FTMO или BrightFunded' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {complete && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-partner-comparison="ftmo-bright-funded"
          data-russian-comparison-editorial-date={dateModified}
          data-russia-status-ftmo={ftmoStatus}
          data-russia-status-bright-funded={brightStatus}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Сравнение</div>
          <RussianDataFreshnessNotice firmSlugs={['bright-funded', 'ftmo']} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Правила против правил</div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Семь стран СНГ, включая Россию, стоят в списке ограничений FTMO. У BrightFunded в таком списке пять или шесть
            стран — справка и условия расходятся по Пакистану, — и ни одной из СНГ. Для трейдера из России выбор решён ещё до сравнения цен. Для русскоязычного
            трейдера в Берлине, Тбилиси или Хайфе — нет: там всё решают просадка, сплит и срок первой выплаты.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Редакционная проверка: {ruDate(dateModified)}. У каждой строки таблицы — своя дата источника.</p>
          <nav className="ru-review-toc" aria-label="Содержание сравнения">
            <Link href="#tablica">Таблица</Link> · <Link href="#primery">Примеры в деньгах</Link> · <Link href="#zarubezhom">Вне России</Link> · <Link href="#verdikt">Вердикт</Link> · <Link href="#istochniki">Источники</Link> · <Link href="#faq">Вопросы</Link>
          </nav>
          <div className="ru-actions" data-russian-comparison-cta="bright-funded-first">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-ftmo-vs-bright-hero" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">
              Проверить планы BrightFunded <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <Link href="/ru/ftmo-dlya-rossiyan" className="btn-outline">Почему FTMO закрыта для РФ</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ftmo-vs-bright">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Ссылки на BrightFunded, FundedNext и FundingPips партнёрские: после регистрации мы можем получить комиссию.
            Ссылка на FTMO — обычная, без партнёрской программы. Комиссия не меняет цифры в таблице и не
            подтверждает, что фирма доступна именно вашему профилю.
          </div>
          <div className="ru-grid">
            <article className="ru-card" data-russian-comparison-firm="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded <RuAccessBadge firm="bright-funded" /></h3>
              <p className="ru-muted">Программ с актуальной проверкой: {bright.length}. Взносы в EUR, без правила лучшего дня, выходные разрешены. Платят позже: первый запрос через 30 дней.</p>
              <Link href="/ru/obzor-bright-funded" className="ru-card-link">Русский обзор BrightFunded →</Link>
            </article>
            <article className="ru-card" data-russian-comparison-firm="ftmo">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FTMO <RuAccessBadge firm="ftmo" /></h3>
              <p className="ru-muted">Программ с актуальной проверкой: {ftmo.length}. Trustpilot: 4.8, отзывов: 54 501; TradingView в списке платформ, первый запрос выплаты с 14-го дня. Резидентов России FTMO не принимает: кнопка — только для тех, чьей страны нет в списке ограничений.</p>
              <Link href="/ru/obzor-ftmo" className="ru-card-link">Русский обзор FTMO →</Link>
              <div className="ru-actions" data-russian-comparison-ftmo-cta="secondary-restricted">
                <RuGoLink firm="ftmo" href="/go/ftmo?from=ru-ftmo-vs-bright-ftmo-card" rel={goLinkRel('ftmo')} className="btn-outline">
                  Сайт FTMO (не для резидентов РФ) <ArrowRight size={14} aria-hidden="true" />
                </RuGoLink>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="tablica">
        <div className="ru-shell">
          <h2>FTMO и BrightFunded: {rows.length} различий в одной таблице</h2>
          <p className="ru-muted">BrightFunded стоит первым, потому что открыт для России; FTMO — ориентир для сравнения. «Не подтверждено» не значит «нет ограничения». Цены — базовые, без акций: итог на странице оплаты может отличаться.</p>
          {!complete && <p className="ru-notice" data-russian-comparison-evidence-status="recapture-required">Часть данных старше 30 дней или отсутствует. Такие ячейки помечены, а числовые выводы ниже нужно перепроверить на сайте фирмы.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Сравнение FTMO и BrightFunded">
            <table className="ru-table" data-russian-comparison-fields={rows.length}>
              <caption className="hidden-caption">FTMO и BrightFunded: доступ, цены, просадка, сплит, выплаты, платформы и оплата</caption>
              <thead><tr><th>Параметр</th><th>BrightFunded</th><th>FTMO</th><th>Дата и источник</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} data-russian-comparison-field={row.id}>
                    <td><strong>{row.field}</strong></td>
                    <td>{row.bright}</td>
                    <td>{row.ftmo}</td>
                    <td>
                      <a href={row.source} target="_blank" rel="noopener noreferrer">{asOf(row.date)}</a>
                      {row.source2 ? <>{' · '}<a href={row.source2} target="_blank" rel="noopener noreferrer">второй источник</a></> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">Цены программ — {asOf(priceCapture)}; параметры — из датированных записей по каждой программе (самая ранняя — {ruDate(earliestCapture)}). Доступ по странам и сплит FTMO — проверка {ruDate(TRACKER_CAPTURE)}; списки стран BrightFunded — {ruDate(BRIGHT_COUNTRIES_CHECKED)}; способы оплаты, вывода и график выплат обеих фирм — {ruDate(PAYMENTS_CAPTURE)}, по официальным страницам ftmo.com и справке BrightFunded.</p>
        </div>
      </section>

      <section className="ru-section" id="primery">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-examples="usd-100k">
          <h2>Что эти правила значат на счёте $100,000</h2>
          <p>
            Возьмём самый частый выбор — двухэтапную оценку на $100K. У FTMO 2-Step взнос {fee(ftmoTwo, 100000)}, у
            BrightFunded 2-Step Classic — {fee(bfClassic, 100000)} при тех же целях {targets(bfClassic)} и тех же
            лимитах {percent(bfClassic?.dailyLossPct)} / {percent(bfClassic?.maxLossPct)}. Разница — {eur(feeGap)} в пользу BrightFunded,
            а 2-Step Bright стоит ещё дешевле, {fee(bfBright, 100000)}, но платите вы за это более узким общим лимитом {percent(bfBright?.maxLossPct)}.
          </p>
          <p>
            Дневной лимит {percent(ftmoTwo?.dailyLossPct)} у FTMO 2-Step — это {usd(ftmoDailyLine)} убытка за день от начального
            капитала. Пять стопов подряд по 1% риска — и день закрыт. У BrightFunded 2-Step Bright
            граница ближе: {percent(bfBright?.dailyLossPct)}, то есть {usd(bfBrightDailyLine)}.
          </p>
          <h3>Ловушка 1-Step: подвижная просадка</h3>
          <p>
            У BrightFunded 1-Step общий лимит {percent(bfOne?.maxLossPct)} ({usd(bfTrail)}) подвижный и идёт за максимумом
            эквити в реальном времени. Поднялись до $104,000 — граница убытка уже $98,000, а не $94,000. По записи фирмы граница
            перестаёт двигаться на уровне начального баланса после роста на 6%. У FTMO 1-Step общий лимит {percent(ftmoOne?.maxLossPct)}
            тоже подвижный, но считается по итогам дня, а дневной — {percent(ftmoOne?.dailyLossPct)}. Плюс правило лучшего дня
            {' '}{percent(ftmoOne?.consistencyRulePct)}: если половина прибыли пришла за одну сессию, придётся торговать дальше.
          </p>
          <h3>Сколько нужно заработать, чтобы вернуть взнос</h3>
          <p>
            При базовом сплите 80% взнос {fee(bfClassic, 100000)} за BrightFunded Classic окупается примерно с {breakEven(bfClassic, 100000)} прибыли,
            а {fee(ftmoTwo, 100000)} за FTMO 2-Step — с {breakEven(ftmoTwo, 100000)}. Это расчёт сайта без учёта возврата взноса и
            без конвертации валют: счёт номинирован в долларах, а взнос — в евро.
          </p>
          <p>
            Срок важнее процента. У FTMO первую заявку можно подать на 14-й день после первой сделки на профинансированном
            счёте; как часто можно просить дальше, FTMO публично не уточняет. У BrightFunded первая выплата — через 30 дней,
            дальше, судя по справке и списку дополнений на сайте, раз в 14 дней по умолчанию, а еженедельно — за доплату.
            Но справка BrightFunded {asOf(PAYMENTS_CAPTURE)} противоречит себе: там же 14-дневный цикл назван платным дополнением.
            Уточните в поддержке до оплаты, если быстрый вывод для вас критичен.
          </p>
        </div>
      </section>

      <section className="ru-section" id="zarubezhom">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-diaspora="country-before-rules">
          <h2>Если вы говорите по-русски, но живёте не в России</h2>
          <p>
            Ограничения обеих фирм привязаны к гражданству, месту проживания или фактическому местонахождению, а не к языку.
            Трейдеру из Казахстана, Беларуси или Узбекистана FTMO закрыта так же, как россиянину. Грузия, Армения,
            Израиль и страны ЕС в списке FTMO {asOf(TRACKER_CAPTURE)} не названы — там сравнение идёт уже по правилам.
          </p>
          <ul className="wp-block-list">
            <li><strong>Нужен TradingView или MT4</strong> — они есть только у FTMO; у BrightFunded MT5, DXTrade и cTrader.</li>
            <li><strong>Держите сделки через выходные</strong> — у BrightFunded это разрешено, у FTMO на счёте Standard ограничено (выход — счёт Swing).</li>
            <li><strong>Прибыль приходит рывками</strong> — у BrightFunded нет правила лучшего дня, у FTMO 1-Step оно есть ({percent(ftmoOne?.consistencyRulePct)}).</li>
            <li><strong>Нужны деньги быстро</strong> — у FTMO первый запрос с 14-го дня, у BrightFunded через 30.</li>
          </ul>
          <p>
            Не используйте VPN, чужие документы или адрес, чтобы обойти список. FTMO проверяет личность до
            профинансированного этапа, и взнос в таком случае, скорее всего, пропадёт. Как проверить свой профиль, разобрано
            на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="verdikt">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-verdict="ftmo-bright-funded">
          <h2>Вердикт: кому BrightFunded, а кому FTMO</h2>
          <p>
            Если вы живёте в России, Беларуси или Казахстане, сравнивать нечего: FTMO вас не обслуживает, и никакой сплит
            этого не исправит. У BrightFunded есть программа с той же механикой, что у FTMO 2-Step: две фазы,
            цели {targets(bfClassic)}, дневной лимит {percent(bfClassic?.dailyLossPct)} и статический общий {percent(bfClassic?.maxLossPct)} на программе Classic. По сути это та же оценка, только
            дешевле — {fee(bfClassic, 100000)} против {fee(ftmoTwo, 100000)} за $100K. Платить можно криптовалютой, и это главный довод для читателя из России.
          </p>
          <p>
            Слабые места BrightFunded тоже стоит назвать. Первая выплата — не раньше чем через 30 дней. Рейтинг на Trustpilot
            скрыт площадкой из-за нарушения её правил. Торговля во время новостей ограничена. И если вы выберете 1-Step,
            подвижная просадка 6% накажет за отдачу прибыли сильнее, чем статическая граница.
          </p>
          <p>
            FTMO стоит выбрать, только если ваша страна не в списке ограничений, а вам нужны TradingView, MT4 или первая выплата
            на 14-й день. В остальных случаях берите BrightFunded 2-Step Classic. Перед покупкой прочитайте его правила
            построчно и подтвердите в поддержке цикл выплат.
          </p>
          <div className="ru-actions" data-russian-comparison-decision-cta="bright-funded-only">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-ftmo-vs-bright-verdict" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">
              Открыть BrightFunded 2-Step Classic <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <Link href="/ru/obzor-ftmo" className="btn-outline">Обзор FTMO</Link>
          </div>
          <p className="ru-source-line" data-russian-comparison-ftmo-cta="verdict-secondary">
            Живёте в стране, которой нет в списке ограничений FTMO?{' '}
            <RuGoLink firm="ftmo" href="/go/ftmo?from=ru-ftmo-vs-bright-ftmo-verdict" rel={goLinkRel('ftmo')}>
              Проверить FTMO на официальном сайте
            </RuGoLink>{' '}
            — резидентов России FTMO не принимает.
          </p>
          <p className="ru-source-line">
            Другие пары: <Link href="/ru/fundednext-vs-bright-funded">FundedNext или BrightFunded</Link> ·{' '}
            <Link href="/ru/fundednext-vs-fundingpips">FundedNext или FundingPips</Link> ·{' '}
            <Link href="/ru/luchshie-prop-firmy">рейтинг проп-фирм</Link> ·{' '}
            <Link href="/ru/promokody-prop-firm">промокоды</Link>.
          </p>
          <div className="ru-actions" data-russian-comparison-other-firms="fundednext-fundingpips">
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-ftmo-vs-bright-fundednext" rel={goLinkRel('fundednext')} className="btn-outline">
              Проверить FundedNext <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-ftmo-vs-bright-fundingpips" rel={goLinkRel('fundingpips')} className="btn-outline">
              Проверить FundingPips <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section" id="istochniki">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и границы сравнения</h2>
          <ul>
            {[...bright, ...ftmo].map(product => (
              <li key={product.productSlug}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.productName}: официальные условия</a> — {asOf(product.sourceCapturedAt)}.</li>
            ))}
            <li><a href={SOURCES.ftmoCountries} target="_blank" rel="noopener noreferrer">FTMO: кто может участвовать (список стран)</a> — {asOf(TRACKER_CAPTURE)}.</li>
            <li><a href={SOURCES.ftmoReward} target="_blank" rel="noopener noreferrer">FTMO: доля и запрос вознаграждения</a> — {asOf(TRACKER_CAPTURE)}.</li>
            <li><a href={SOURCES.ftmoObjectives} target="_blank" rel="noopener noreferrer">FTMO: торговые цели, просадка и правило лучшего дня</a> — {asOf(RULES_CAPTURE)}.</li>
            <li><a href={SOURCES.ftmoPlatforms} target="_blank" rel="noopener noreferrer">FTMO: платформы</a> — {asOf(RULES_CAPTURE)}.</li>
            <li data-russian-bright-country-conflict="help-six-terms-five"><a href={SOURCES.brightCountries} target="_blank" rel="noopener noreferrer">BrightFunded: ограниченные страны (справка, обновлена 15.09.2026; шесть стран с Пакистаном)</a> и <a href={SOURCES.brightTerms} target="_blank" rel="noopener noreferrer">условия, п. 2 (пять стран без Пакистана)</a> — {asOf(BRIGHT_COUNTRIES_CHECKED)}.</li>
            <li><a href={SOURCES.brightCrypto} target="_blank" rel="noopener noreferrer">BrightFunded: оплата криптовалютой</a> и <a href={SOURCES.brightCards} target="_blank" rel="noopener noreferrer">оплата картой</a> — {asOf(PAYMENTS_CAPTURE)}.</li>
            <li><a href={SOURCES.ftmoPayments} target="_blank" rel="noopener noreferrer">FTMO: способы оплаты челленджа</a>, <a href={SOURCES.ftmoReward} target="_blank" rel="noopener noreferrer">вывод вознаграждения</a> и <a href={SOURCES.ftmoCryptoWithdrawals} target="_blank" rel="noopener noreferrer">вывод в криптовалюте</a> — {asOf(PAYMENTS_CAPTURE)}.</li>
            <li><a href={SOURCES.brightReward} target="_blank" rel="noopener noreferrer">BrightFunded: сплит и график выплат</a> и <a href={SOURCES.brightPayouts} target="_blank" rel="noopener noreferrer">способы выплаты</a> — {asOf(PAYMENTS_CAPTURE)}.</li>
            <li><a href={SOURCES.brightPlatforms} target="_blank" rel="noopener noreferrer">BrightFunded: платформы</a> и <a href={SOURCES.brightConsistency} target="_blank" rel="noopener noreferrer">правило последовательности</a> — {asOf(RULES_CAPTURE)}.</li>
            <li><a href={SOURCES.trustpilotFtmo} target="_blank" rel="noopener noreferrer">Trustpilot FTMO</a> и <a href={SOURCES.trustpilotBright} target="_blank" rel="noopener noreferrer">Trustpilot BrightFunded</a> — {asOf(TRUSTPILOT_CAPTURE)}.</li>
          </ul>
          <p>Кассу обеих фирм мы не открывали (нужен вход в аккаунт): список способов оплаты на странице оплаты может зависеть от страны. Мы не проверяли личное получение выплаты по каждому сценарию и работу карт российских банков. Если фирма меняет правила, сравнение нужно повторить перед оплатой.</p>
          <div className="ru-notice" data-russian-risk-disclaimer="ftmo-vs-bright">
            <strong>Риск.</strong> Торговля с кредитным плечом связана с высоким риском. Большинство участников не проходит
            оценку, а взнос возвращается только по условиям конкретной программы. Счёт после оценки — симулированный:
            фирма выплачивает вознаграждение по своим правилам, это не инвестиция и не гарантированный доход.
          </div>
          <p className="ru-source-line">Англоязычная версия пары: <Link href="/compare/bright-funded-vs-ftmo" hrefLang="en">BrightFunded vs FTMO</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
