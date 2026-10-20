import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, Bitcoin, CheckCircle2, Database, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, minimumCostToFundedUsd, type Challenge } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-crypto-fund-trader'
const TITLE = 'Crypto Fund Trader: обзор 2026, отзывы и доступ из России'
const H1 = 'Crypto Fund Trader (CFT): обзор и отзывы 2026'
const DESCRIPTION = 'Crypto Fund Trader: правила, цены, выплаты и доступ из России. Отзывы трейдеров, 2-Phase, 1-Phase, Instant и Break, платформы Match-Trader, MT5 и Bybit.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['crypto fund trader', 'cryptofundtrader', 'crypto fund trader отзывы', 'крипто фанд трейдер', 'cft проп', 'crypto fund trader правила', 'crypto fund trader промокод'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Dated facts: Prop Firm Tracker /workspace/ru-data/2026-10-14-cryptofundtrader.md (access, checkout, payouts),
 * firms.json rule evidence (FAQ read 2026-10-15), challenges/crypto-fund-trader.json (capture 2026-10-14),
 * /workspace/ru-data/2026-10-15-trustpilot.md. All CFT URLs below returned 200 on 2026-10-19.
 */
const ACCESS_CHECKED = '2026-10-14'
const RULES_CHECKED = '2026-10-15'
const TRUSTPILOT_CHECKED = '2026-10-19'
/** Prop Firm Tracker verdicts 2026-10-19 (/workspace/ru-data/2026-10-19-hashhedge-cft.md, capture crypto-fund-trader-2026-10-19.json). */
const TRACKER_CHECKED = '2026-10-19'
const CHEAPEST_BUYABLE = { name: 'Accelerated (1-Phase) $5K', priceUsd: 40 }
/** Open first-party conflicts: challenge-watch cft-ascend-break-price-disagreement-2026-10-06 and Tracker 2026-10-19 rows 6a/6b. */
const PRICE_CONFLICT_CHECKED = '2026-10-06'
const ASCEND_CONFLICT_NOTE = 'По данным на 19.10.2026 официальные страницы расходятся: в условиях (п. 5.6.5) Ascend стоит $39–$1 560, главная страница показывает $45 / $90 / $225 / $450 / $899 / $1 798, а в магазине все шесть позиций Ascend помечены как недоступные к покупке.'
const BREAK_CONFLICT_NOTE = 'По данным на 19.10.2026 позиции Break в магазине доступны к покупке по ценам условий, хотя на странице Break всё ещё стоит надпись «sold out»; 06.10.2026 главная страница показывала $199 за Break $100K.'
const PRICE_CONFLICT_NOTE = `${ASCEND_CONFLICT_NOTE} ${BREAK_CONFLICT_NOTE} Итоговую цену и доступность проверьте в корзине перед оплатой.`

const SOURCES = {
  faq: 'https://cryptofundtrader.com/faq/',
  getStarted: 'https://cryptofundtrader.com/get-started/',
  terms: 'https://cryptofundtrader.com/terms-and-conditions/',
  fundedAccount: 'https://cryptofundtrader.com/funded-account/',
  breakChallenge: 'https://cryptofundtrader.com/break-challenge/',
  refund: 'https://cryptofundtrader.com/refund-policy/',
  home: 'https://cryptofundtrader.com/',
  shop: 'https://cryptofundtrader.com/shop/',
  trustpilot: 'https://www.trustpilot.com/review/cryptofundtrader.com',
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
const usd = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) || value <= 0 ? 'не подтверждено' : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const percent = (value: number | null | undefined) => (value == null || !Number.isFinite(value) ? 'не подтверждено' : `${value}%`)

const faqs: RussianFaqItem[] = [
  {
    q: 'Работает ли Crypto Fund Trader с трейдерами из России?',
    a: `${asOf(ACCESS_CHECKED)} в FAQ Crypto Fund Trader для Match-Trader указано: «ограничений по странам сейчас нет». MetaTrader 5 закрыт только для резидентов США. Россия на официальных страницах не упоминается ни в одном списке. Для Bybit фирма своих ограничений не добавляет, но нужен личный аккаунт Bybit, и доступность зависит от правил самой Bybit — их мы не проверяли. Проверка личности (KYC) и подписание договора обязательны для всех.`,
  },
  {
    q: 'Сколько стоит челлендж CFT?',
    a: `${asOf(TRACKER_CHECKED)} самый дешёвый доступный к покупке вариант — Accelerated на $5,000 за $40. Ascend по условиям стоит от $39, но в магазине на 19.10.2026 не продаётся. Двухэтапная Evaluation стоит от $58 ($5K) до $1,250 ($200K), одноэтапная Accelerated — от $40 до $1,199, Instant без оценки — от $125 до $475, Break — от $70 до $200 плюс обязательный сбор за активацию после прохождения. ${PRICE_CONFLICT_NOTE} Цены указаны в долларах США; при оплате в другой валюте курс задаёт платёжный провайдер.`,
  },
  {
    q: 'Какой сплит прибыли у Crypto Fund Trader?',
    a: 'В Evaluation, Accelerated и Break базовая доля трейдера — 80%. В Instant стартовая доля 50%, следующие уровни масштабирования — 60%, 70%, 80% и 90%. Ascend работает иначе: после второго этапа фирма выплачивает фиксированную стипендию, а не процент от прибыли.',
  },
  {
    q: 'Как выводить прибыль из CFT?',
    a: `${asOf(ACCESS_CHECKED)}: банковским переводом в EUR или USD либо в криптовалюте — USDT (ERC20), USDT (TRC20), BTC или ETH. Перед первой выплатой нужны проверка личности и подписанный договор. В Evaluation и Accelerated запрос возможен после 15 торговых дней или раз в 30 календарных дней, с дополнением Weekly — каждые 7 торговых дней.`,
  },
  {
    q: 'Можно ли торговать на новостях и в выходные?',
    a: `${asOf(RULES_CHECKED)} FAQ CFT отвечает «да»: торговля на новостях разрешена, позиции можно держать через ночь и выходные. Исключение — Ascend: там нельзя открывать сделки и увеличивать риск за 2 минуты до и 2 минуты после важных новостей и открытия рынков.`,
  },
  {
    q: 'Crypto Fund Trader — развод?',
    a: 'Фактов о мошенничестве у нас нет, но и независимой проверки выплат тоже нет. Что известно: оператор — SWISS RLCRATES AG (Цуг, Швейцария), условия и цены опубликованы, торговля идёт на демо-счёте. Trustpilot скрыл рейтинг компании из-за нарушения правил площадки. Перед оплатой прочитайте условия и начните с небольшого счёта.',
  },
]

function drawdownText(product: Challenge | undefined) {
  if (!product) return 'требует повторной проверки'
  if (product.productSlug === 'break') return 'подвижная граница в долларах; дневного лимита нет'
  const type = ({ static: 'статическая', trailing: 'подвижная' } as Record<string, string>)[product.drawdownType ?? ''] ?? 'тип не установлен'
  return `${percent(product.dailyLossPct)} в день / ${percent(product.maxLossPct)} общий, ${type}`
}

function targetsText(product: Challenge | undefined) {
  if (!product) return 'требует повторной проверки'
  if (product.phases === 0) return 'без оценки'
  if (!product.profitTargets) return 'в долларах по размеру счёта'
  return Array.from({ length: product.phases }, (_, index) =>
    percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function priceRange(product: Challenge | undefined) {
  const prices = (product?.accountSizes ?? []).map(tier => tier.priceUsd).filter((value): value is number => value != null && value > 0).sort((a, b) => a - b)
  if (!prices.length) return 'не подтверждено'
  return prices[0] === prices.at(-1) ? usd(prices[0]) : `${usd(prices[0])}–${usd(prices.at(-1))}`
}

function sizesText(product: Challenge | undefined) {
  return (product?.accountSizes ?? []).map(tier => `$${(tier.sizeUsd / 1000).toLocaleString('en-US')}K`).join(', ') || 'не подтверждено'
}

export default function RussianCryptoFundTraderReviewPage() {
  const all = getChallengesByFirm('crypto-fund-trader')
  const fresh = all.filter(product => isChallengeFresh(product))
  const find = (slug: string) => fresh.find(product => product.productSlug === slug)
  const evaluation = find('evaluation')
  const ascend = find('ascend')
  const accelerated = find('accelerated')
  const instant = find('instant')
  const breakChallenge = find('break')
  const complete = Boolean(evaluation && ascend && accelerated && instant && breakChallenge) && isChallengeFresh({ sourceCapturedAt: ACCESS_CHECKED })
  const firm = getAllFirms().find(item => firmSlug(item.name) === 'crypto-fund-trader')
  const status = russiaStatusFor('crypto-fund-trader')
  const captureDates = all.map(product => product.sourceCapturedAt).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  const earliestCapture = captureDates[0] ?? ACCESS_CHECKED
  const dateModified = russianRouteDateModified(PATH)

  const tier = (product: Challenge | undefined, size: number) => product?.accountSizes.find(item => item.sizeUsd === size)
  const eval100 = tier(evaluation, 100000)
  const acc100 = tier(accelerated, 100000)
  const break25 = tier(breakChallenge, 25000)
  const evalDailyLine = evaluation?.dailyLossPct != null ? (100000 * evaluation.dailyLossPct) / 100 : null
  const evalFloor = evaluation?.maxLossPct != null ? 100000 - (100000 * evaluation.maxLossPct) / 100 : null
  const evalBreakEven = eval100?.priceUsd != null && evaluation?.profitSplitPct ? eval100.priceUsd / (evaluation.profitSplitPct / 100) : null
  const break25Total = breakChallenge && break25 ? minimumCostToFundedUsd(breakChallenge, break25) : null
  const accTrail = accelerated?.maxLossPct != null ? (100000 * accelerated.maxLossPct) / 100 : null

  const programs: Array<{ key: string; name: string; product: Challenge | undefined; note: string }> = [
    { key: 'evaluation', name: 'Evaluation (2-Phase)', product: evaluation, note: 'классическая двухэтапная оценка' },
    { key: 'ascend', name: 'Ascend', product: ascend, note: 'фиксированная стипендия после второго этапа' },
    { key: 'accelerated', name: 'Accelerated (1-Phase)', product: accelerated, note: 'один этап, подвижная граница' },
    { key: 'instant', name: 'Instant', product: instant, note: 'без оценки, старт с доли 50%' },
    { key: 'break', name: 'Break Challenge', product: breakChallenge, note: 'дешёвый вход + сбор за активацию' },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Crypto Fund Trader' },
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
  const cta = (from: string, label: string, primary = true) => (
    <RuGoLink firm="crypto-fund-trader" href={`/go/crypto-fund-trader?from=${from}`} rel={goLinkRel('crypto-fund-trader')} className={primary ? 'btn-primary btn-glow' : 'btn-primary'}>
      {label} <ArrowRight size={15} aria-hidden="true" />
    </RuGoLink>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {complete && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell"><RussianDataFreshnessNotice firmSlugs={['crypto-fund-trader']} /></div>
        <div className="ru-shell" data-russian-review="crypto-fund-trader" data-russia-status-crypto-fund-trader={status}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Обзор Crypto Fund Trader</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Программы проверены {ruDate(earliestCapture)} · доступ {ruDate(ACCESS_CHECKED)} · правила {ruDate(RULES_CHECKED)}</div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Пять программ, три платформы и ни одной страны в списке запретов для Match-Trader. Crypto Fund Trader (CFT) —
            одна из немногих проп-фирм, где у трейдера из России вопрос «пустят ли» решается на уровне платформы, а не
            гаданием. Но вход от {usd(CHEAPEST_BUYABLE.priceUsd)} и сбор за активацию у Break, доля 50% у Instant и скрытый рейтинг на
            Trustpilot — это то, что стоит знать до оплаты.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link></span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{fresh.length}</strong><span>программ со свежими данными</span></div>
            <div className="ru-stat" data-russian-cft-cheapest="accelerated-5k"><strong>{usd(CHEAPEST_BUYABLE.priceUsd)}</strong><span>самый дешёвый доступный вход ({CHEAPEST_BUYABLE.name}, {ruDate(TRACKER_CHECKED)})</span></div>
            <div className="ru-stat"><strong>3</strong><span>платформы: Match-Trader, MT5, Bybit</span></div>
            <div className="ru-stat"><strong>{firm?.score != null ? `${firm.score.toFixed(1)}/10` : '—'}</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-cft-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Crypto Fund Trader">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: кому подходит CFT</a></li>
                <li><a href="#access">Доступ из России и СНГ</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#rules">Правила</a></li>
                <li><a href="#payouts">Выплаты и сплит</a></li>
                <li><a href="#platforms">Платформы</a></li>
                <li><a href="#reviews">Отзывы</a></li>
                <li><a href="#promo">Промокод</a></li>
                <li><a href="#pros-cons">Плюсы и минусы</a></li>
                <li><a href="#alternatives">Альтернативы</a></li>
                <li><a href="#sources">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-cft-verdict="summary">
            <h2>Коротко: кому подходит Crypto Fund Trader</h2>
            <div className="ru-notice" data-russian-cft-access="match-trader-no-restrictions">
              <strong>Доступ из России:</strong> <RuAccessBadge firm="crypto-fund-trader" />{' '}
              {asOf(ACCESS_CHECKED)} для Match-Trader CFT пишет «ограничений по странам сейчас нет», MT5 закрыт только для резидентов
              США, Россия на официальных страницах не упоминается. Bybit — по правилам самой Bybit, мы их не проверяли.
            </div>
            <p>
              CFT стоит рассматривать, если вы торгуете криптовалютой и вам нужна фирма, которая не отсекает Россию и СНГ на входе.
              Двухэтапная Evaluation здесь честная классика: цели {targetsText(evaluation)}, лимиты {drawdownText(evaluation)},
              без минимума торговых дней. За $100K — {usd(eval100?.priceUsd)}.
            </p>
            <p>
              Ascend по условиям стоит от {usd(tier(ascend, 5000)?.priceUsd)}, заканчивается фиксированной стипендией и на
              {' '}{ruDate(TRACKER_CHECKED)} в магазине не продаётся. Break стоит {usd(break25?.priceUsd)} за $25K, но после прохождения нужно доплатить
              {' '}{usd(break25?.activationFeeUsd)} за активацию. Instant начинается с доли {percent(instant?.profitSplitPct)}, а не 80%.
              {' '}<span data-russian-cft-price-conflict="verdict">Цены Ascend и Break на официальных страницах расходятся — сверьте их в корзине.</span>
              {' '}Независимой проверки выплат нет.
            </p>
            <p>
              Если вы торгуете форекс и индексы, а крипта вторична, сначала сравните фирмы из блока
              альтернатив и их бейджи доступа для РФ. Если крипта основная, начните с Evaluation на небольшом счёте и прочитайте условия перед оплатой.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="crypto-fund-trader-review">
              <strong>Раскрытие.</strong> Ссылка на Crypto Fund Trader на этой странице обычная: партнёрской программы с CFT у сайта
              нет. Ссылки на BrightFunded и FundedNext в блоке альтернатив — партнёрские, по ним мы можем получить комиссию.
              Русский язык страницы не означает, что фирма доступна именно вашему профилю.
            </div>
            <div className="ru-actions" data-russian-cft-cta="summary">
              {cta('ru-review-crypto-fund-trader', 'Открыть Crypto Fund Trader')}
              <Link href="/ru/luchshie-kripto-prop-firmy" className="btn-outline">Сравнить крипто-проп фирмы</Link>
            </div>
            <p className="ru-source-line">Доступ через Match-Trader; Bybit — по правилам Bybit. Источник: <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ CFT</a>, {asOf(ACCESS_CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="access">
          <div className="ru-shell ru-content" data-russian-cft-access-table="platforms">
            <h2>Доступ из России, Беларуси, Казахстана и Украины</h2>
            <p>
              У CFT правила доступа зависят от платформы, а не только от страны. Это необычно и важно: один и тот же трейдер из
              Минска может торговать на Match-Trader и не иметь Bybit, если Bybit не обслуживает его страну. Ниже — то, что фирма
              пишет в <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ</a> и на странице{' '}
              <a href={SOURCES.getStarted} target="_blank" rel="nofollow noopener noreferrer">Get Started</a> ({asOf(ACCESS_CHECKED)}).
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ к платформам CFT по странам">
              <table className="ru-table">
                <caption className="sr-only">Ограничения Crypto Fund Trader по платформам</caption>
                <thead><tr><th>Платформа</th><th>Что пишет CFT</th><th>Россия, Беларусь, Казахстан, Украина</th></tr></thead>
                <tbody>
                  <tr><td><strong>Match-Trader</strong></td><td>«Ограничений по странам сейчас нет»</td><td>Не ограничены</td></tr>
                  <tr><td><strong>MetaTrader 5</strong></td><td>Недоступен резидентам США; другие страны не названы</td><td>Не названы в ограничениях</td></tr>
                  <tr><td><strong>Bybit</strong></td><td>Своих ограничений CFT не добавляет; нужен личный аккаунт Bybit и соблюдение её правил</td><td>Зависит от Bybit — не проверяли</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Чего мы не нашли ({asOf(TRACKER_CHECKED)}): отдельного пункта о санкционных списках — в условиях есть только общий
              запрет использовать сервис там, где это запрещено законом (п. 16.2), — и любого упоминания России, СНГ, карт «Мир» или карт
              российских банков. Отсутствие пункта — не разрешение. Проверка личности (KYC) и подписанный договор обязательны перед
              выплатой, и фирма вправе отказать на этом этапе. Не используйте чужие документы или VPN, чтобы обойти правила
              платформы.
            </p>
            <h3>Оплата челленджа из России</h3>
            <p>
              {asOf(TRACKER_CHECKED)} в FAQ перечислены: банковская карта, PayPal, Apple Pay, Google Pay и криптовалюта. На странице
              Get Started и в условиях (п. 5.5) по-прежнему названы только карта и криптовалюта; цены указаны в долларах США, а при оплате в другой валюте курс
              устанавливает платёжный провайдер (п. 5.3). Какие именно монеты принимает касса, какие сети карт и какие платёжные
              провайдеры работают — фирма не уточняет, поэтому мы этого не пишем.
            </p>
            <p>
              Для читателя из России практический вывод простой: криптовалюта — единственный официально указанный способ, который
              не зависит от карты. Работает ли он в вашем случае и пройдёт ли карта российского банка — не подтверждено. Сравнение
              способов вывода у разных фирм — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ</a>, <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a> — {asOf(ACCESS_CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены CFT</h2>
            <p className="ru-muted">Цены — из официального магазина и условий CFT {asOf(earliestCapture)}, в долларах США, без акций. Размер счёта — номинал демо-счёта, а не деньги, которые вам переводят.</p>
            {!complete && <p className="ru-notice" data-russian-cft-evidence-status="recapture-required">Часть программ требует повторной проверки: такие строки скрыты или помечены. Сверьте цену на сайте фирмы.</p>}
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы Crypto Fund Trader">
              <table className="ru-table" data-russian-cft-product-count={fresh.length}>
                <caption className="sr-only">Программы Crypto Fund Trader: цены, цели, лимиты и доля</caption>
                <thead><tr><th>Программа</th><th>Размеры</th><th>Взнос</th><th>Цели</th><th>Лимиты убытка</th><th>Доля</th><th>Источник</th></tr></thead>
                <tbody>
                  {programs.map(({ key, name, product, note }) => (
                    <tr key={key} data-russian-cft-product={key}>
                      <td><strong>{name}</strong><br /><span className="ru-muted">{note}</span></td>
                      <td>{sizesText(product)}</td>
                      <td>{priceRange(product)}</td>
                      <td>{targetsText(product)}</td>
                      <td>{drawdownText(product)}</td>
                      <td>{key === 'ascend' ? 'фиксированная стипендия' : percent(product?.profitSplitPct)}</td>
                      <td>{product ? <a href={product.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{asOf(product.sourceCapturedAt)}</a> : 'требует проверки'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ru-muted" data-russian-cft-price-conflict={PRICE_CONFLICT_CHECKED}>Цены Ascend и Break в таблице — {asOf(earliestCapture)} (условия и магазин). {PRICE_CONFLICT_NOTE}</p>
            <p className="ru-source-line" data-russian-cft-max-allocation="300000">Максимальный капитал: до $300 000 (по данным на 19.10.2026) — суммарный стартовый баланс всех активных финальных счетов одного трейдера; счета Ascend, Instant и Break в лимит не входят. Источник: <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ CFT</a>.</p>
            <div className="ru-actions" data-russian-cft-cta="programs">
              {cta('ru-review-crypto-fund-trader-programs', 'Выбрать программу на сайте CFT', false)}
            </div>
          </div>
          <div className="ru-shell ru-content">
            <h3>Двухэтапная оценка (Evaluation)</h3>
            <p>
              Цели {targetsText(evaluation)}, дневной лимит {percent(evaluation?.dailyLossPct)} и общий {percent(evaluation?.maxLossPct)} от
              начального баланса — граница статическая. На счёте $100K это {usd(evalDailyLine)} убытка за день и пол на уровне
              {' '}{usd(evalFloor)}, который не поднимается вслед за прибылью. Минимума торговых дней нет; срок оценки в наших данных не зафиксирован — проверьте его в условиях.
              Взнос {usd(eval100?.priceUsd)} окупается примерно с {usd(evalBreakEven)} прибыли при доле {percent(evaluation?.profitSplitPct)} —
              это расчёт без учёта возврата взноса: возврат после прохождения мы не нашли.
            </p>
            <h3>Ascend</h3>
            <p>
              Те же цели {targetsText(ascend)} и лимиты {drawdownText(ascend)}, но другой финал: по достижении цели второго этапа CFT
              выплачивает фиксированную стипендию, и следующего финансируемого счёта нет. По условиям — от
              {' '}{usd(tier(ascend, 5000)?.priceUsd)} за $5K до {usd(tier(ascend, 200000)?.priceUsd)} за $200K (п. 5.6.5), но это не самый дешёвый вариант для покупки.
              {' '}<span data-russian-cft-ascend-conflict={TRACKER_CHECKED}>{ASCEND_CONFLICT_NOTE}</span> Самый дешёвый доступный к покупке вход — {CHEAPEST_BUYABLE.name} за {usd(CHEAPEST_BUYABLE.priceUsd)}.
              Новости в Ascend ограничены, копирование сделок запрещено. Суммы стипендии мы в этой версии не приводим — сверьте их в
              условиях перед покупкой.
            </p>
            <h3>Accelerated (1-Phase)</h3>
            <p>
              Один этап с целью {targetsText(accelerated)}, дневной лимит {percent(accelerated?.dailyLossPct)}, а вместо фиксированного общего
              лимита — подвижная граница {percent(accelerated?.maxLossPct)}. Подвижная граница обычно идёт за ростом счёта: отдали часть
              заработанного — и запас {usd(accTrail)} на счёте $100K может оказаться меньше, чем на старте. Базу расчёта уточните в
              условиях до покупки. За $100K —
              {' '}{usd(acc100?.priceUsd)}, на {usd((eval100?.priceUsd ?? 0) - (acc100?.priceUsd ?? 0))} дешевле Evaluation, но и запас меньше.
            </p>
            <h3>Instant</h3>
            <p>
              Без оценки: счета $2,500, $5,000 и $10,000 за {priceRange(instant)}. Лимиты {percent(instant?.dailyLossPct)} в день и
              {' '}{percent(instant?.maxLossPct)} общий; как именно считается общая граница, в данных не установлено. Стартовая доля —
              {' '}{percent(instant?.profitSplitPct)}, дальше уровни 60%, 70%, 80% и 90% по мере масштабирования. Запрос без минимума дней
              возможен после 10% прибыли через Withdrawal &amp; Upgrade. Обзор моделей без оценки —
              на странице <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирмы без челленджа</Link>.
            </p>
            <h3>Break Challenge</h3>
            <p>
              Самая обманчивая цена в линейке. Взнос {priceRange(breakChallenge)} за $25K–$100K, но после прохождения и проверки
              нужно заплатить сбор за активацию: $138, $198 и $328 соответственно, срок оплаты в кабинете — 30 дней. Итого на
              $25K — {usd(break25Total)}, а не {usd(break25?.priceUsd)}. Цели в долларах: $1,250, $3,000 и $6,000. Дневного лимита нет,
              подвижная граница — {usd(break25?.maxLossUsd)}, $2,000 и $3,000. На финальной стадии действует правило: один день
              не больше {percent(breakChallenge?.consistencyRulePct)} всей прибыли; выплаты — по запросу. Минимум торговых дней — 0 по странице Break; на главной для первой фазы указан 1 день ({ruDate(TRACKER_CHECKED)}). {BREAK_CONFLICT_NOTE} Итоговую цену проверьте в корзине.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a> (п. 5.6.5, п. 8), <a href={SOURCES.breakChallenge} target="_blank" rel="nofollow noopener noreferrer">Break Challenge</a>, <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">главная страница</a> — {asOf(earliestCapture)}. Как устроены этапы оценки в целом — в <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде по челленджам</Link>.</p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-cft-rules={RULES_CHECKED}>
            <h2>Правила: просадка, новости, выходные, советники</h2>
            <ul className="wp-block-list">
              <li><strong>Новости разрешены</strong> во всех программах, кроме Ascend: там нельзя открывать сделки и наращивать риск за 2 минуты до и 2 минуты после важных новостей и открытия рынков.</li>
              <li><strong>Ночь и выходные</strong> — удержание позиций разрешено. Для крипты, которая торгуется круглосуточно, это не мелочь.</li>
              <li><strong>Минимум торговых дней</strong> — 0 в Evaluation, Ascend, Accelerated и Instant; у Break 0 по странице программы, но главная для первой фазы указывает 1 день ({ruDate(TRACKER_CHECKED)}). Срок оценки в наших данных не зафиксирован.</li>
              <li><strong>Правило лучшего дня</strong> — только у Break на финальной стадии: {percent(breakChallenge?.consistencyRulePct)}. В остальных программах его нет.</li>
              <li><strong>Советники (EA)</strong> — разрешены с ограничениями; конкретные запреты перечислены в условиях, построчно мы их не разбирали.</li>
              <li><strong>Копирование сделок</strong> — запрещено в Ascend и ограничено в Break.</li>
              <li><strong>Возврат взноса</strong> — по политике возврата деньги можно вернуть в течение 14 дней, если вы ещё не начали торговать. Возврата после прохождения мы не нашли.</li>
            </ul>
            <p className="ru-source-line">Источники: <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ</a> — {asOf(RULES_CHECKED)}; <a href={SOURCES.refund} target="_blank" rel="nofollow noopener noreferrer">Refund Policy</a> — {asOf(earliestCapture)}.</p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-cft-payouts={ACCESS_CHECKED}>
            <h2>Выплаты и сплит</h2>
            <p>
              Базовая доля трейдера — 80% в Evaluation, Accelerated и Break; в Instant — {percent(instant?.profitSplitPct)} на старте;
              в Ascend — фиксированная стипендия. Чем раньше вы считаете реальную долю по своей программе, тем меньше
              разочарования при первой выплате.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="График выплат CFT">
              <table className="ru-table">
                <caption className="sr-only">Когда можно запросить выплату в Crypto Fund Trader</caption>
                <thead><tr><th>Программа</th><th>Когда можно запросить</th></tr></thead>
                <tbody>
                  <tr><td>Evaluation, Accelerated</td><td>После 15 торговых дней или раз в 30 календарных дней; с дополнением Weekly — каждые 7 торговых дней</td></tr>
                  <tr><td>Break</td><td>По запросу — после прохождения оценки, оплаты активации и перехода на финальную стадию</td></tr>
                  <tr><td>Ascend</td><td>По достижении цели второго этапа (фиксированная стипендия)</td></tr>
                  <tr><td>Instant</td><td>После 10% прибыли через Withdrawal &amp; Upgrade; раньше — по общим правилам</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Способы получения: банковский перевод в EUR или USD либо криптовалюта — USDT (ERC20), USDT (TRC20), BTC или ETH
              ({asOf(ACCESS_CHECKED)}). Перед выплатой — проверка личности и подписанный договор. Независимо подтвердить, что
              выплаты приходят в срок, мы не можем: собственных выплат по CFT у нас нет.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.fundedAccount} target="_blank" rel="nofollow noopener noreferrer">Funded Account</a>, <a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ</a> — {asOf(RULES_CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="platforms">
          <div className="ru-shell ru-content">
            <h2>Платформы: Match-Trader, MT5, Bybit</h2>
            <p>
              {asOf(RULES_CHECKED)} CFT предлагает три платформы: Match-Trader, MetaTrader 5 и Bybit. Для трейдера из России и СНГ
              ключевая — Match-Trader: только по ней фирма прямо пишет, что ограничений по странам нет. MT5 закрыт для резидентов
              США. Bybit работает через ваш личный аккаунт Bybit — значит, вы отвечаете за соблюдение её правил и юрисдикции; что
              Bybit разрешает в вашей стране, мы не проверяли и не обещаем.
            </p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-cft-trustpilot="suppressed">
            <h2>Отзывы о Crypto Fund Trader</h2>
            <p>
              {asOf(TRUSTPILOT_CHECKED)} Trustpilot не показывает рейтинг Crypto Fund Trader: на странице компании написано, что рейтинг
              недоступен из-за нарушения правил площадки. Видно число отзывов — 1 102. Там же Trustpilot сообщает, что удалил часть
              отзывов о компании как поддельные; кто их оставил, площадка не указывает.
              Поэтому оценку мы не печатаем: средний балл без объяснения, что именно нарушено, ничего не говорит о выплатах.
            </p>
            <p>
              Как читать такие отзывы и где искать доказательства выплат — в разделе{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>. Короткое правило: ищите отзывы с датой, суммой и
              способом выплаты, а не общие оценки.
            </p>
            <p className="ru-source-line">Источник: <a href={SOURCES.trustpilot} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a>, {asOf(TRUSTPILOT_CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="promo">
          <div className="ru-shell ru-content">
            <h2>Промокод Crypto Fund Trader</h2>
            <p>
              Проверенного промокода Crypto Fund Trader у нас нет, и придумывать его мы не будем. Если код появится, он будет на
              странице <Link href="/ru/promokody-prop-firm">промокодов проп-фирм</Link> с датой проверки на кассе.
            </p>
          </div>
        </section>

        <section className="ru-section" id="pros-cons">
          <div className="ru-shell ru-content">
            <h2>Плюсы и минусы</h2>
            <div className="ru-grid">
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Match-Trader без ограничений по странам</strong> — Россия и СНГ не отсекаются на входе.</li>
                  <li><strong>0 минимальных торговых дней</strong> — в четырёх программах; у Break данные страниц расходятся (0 или 1).</li>
                  <li><strong>Новости, ночь и выходные</strong> разрешены (кроме новостей в Ascend).</li>
                  <li><strong>Вывод в USDT, BTC, ETH</strong> или банком в EUR/USD.</li>
                  <li><strong>Вход от {usd(CHEAPEST_BUYABLE.priceUsd)}</strong> — Accelerated $5K ({ruDate(TRACKER_CHECKED)}).</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Break: сбор за активацию</strong> от $138 после прохождения.</li>
                  <li><strong>Instant: доля 50%</strong> на старте.</li>
                  <li><strong>Ascend: стипендия вместо счёта</strong> — не путайте с обычной оценкой.</li>
                  <li><strong>Рейтинг Trustpilot скрыт</strong> площадкой.</li>
                  <li><strong>Список монет и сетей карт на кассе</strong> фирма не публикует.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="alternatives">
          <div className="ru-shell ru-content" data-russian-cft-alternatives="bright-funded-first">
            <h2>Альтернативы Crypto Fund Trader</h2>
            <p>Если вам важнее форекс и индексы, чем крипта, или нужна оплата в евро, сравните BrightFunded и FundedNext. Доступ для РФ у каждой фирмы показан бейджем рядом с кнопкой — он берётся из нашей последней проверки.</p>
            <div className="ru-grid">
              <article className="ru-card" data-russian-cft-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">Взносы в EUR, статическая граница убытка в 2-Step, подвижная — в 1-Step. Оплата криптой и картой, выплаты в USDC.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-cft-alternative-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-cft-alternative="fundednext">
                <Bitcoin size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>FundedNext (CFD)</h3>
                <p className="ru-muted">CFD-программы Stellar. Выплаты в USDT и USDC; доступ для РФ — по бейджу рядом с кнопкой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Обзор</Link>
                  <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-cft-alternative-fundednext" rel={goLinkRel('fundednext')} className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                </div>
              </article>
            </div>
            <p>Полное сравнение крипто-направления — в <Link href="/ru/luchshie-kripto-prop-firmy">рейтинге крипто-проп фирм</Link>.</p>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <ul>
              {all.map(product => (
                <li key={product.productSlug}><a href={product.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{product.productName}</a> — {isChallengeFresh(product) ? asOf(product.sourceCapturedAt) : `проверка ${product.sourceCapturedAt} устарела`}.</li>
              ))}
              <li><a href={SOURCES.faq} target="_blank" rel="nofollow noopener noreferrer">FAQ</a> и <a href={SOURCES.getStarted} target="_blank" rel="nofollow noopener noreferrer">Get Started</a>: страны, платформы, оплата — {asOf(ACCESS_CHECKED)}; правила и выплаты — {asOf(RULES_CHECKED)}.</li>
              <li><a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a>: цены Ascend и Break, сбор за активацию, оплата — {asOf(ACCESS_CHECKED)}.</li>
              <li><a href={SOURCES.fundedAccount} target="_blank" rel="nofollow noopener noreferrer">Funded Account</a>: оператор SWISS RLCRATES AG (Цуг), способы выплаты — {asOf(ACCESS_CHECKED)}.</li>
              <li><a href={SOURCES.trustpilot} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a> — {asOf(TRUSTPILOT_CHECKED)}.</li>
              <li><a href={SOURCES.shop} target="_blank" rel="nofollow noopener noreferrer">Магазин CFT</a>, <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">главная страница</a>, <a href={SOURCES.breakChallenge} target="_blank" rel="nofollow noopener noreferrer">Break Challenge</a>, FAQ и условия: доступность Ascend и Break к покупке, расхождения цен, способы оплаты, санкционный пункт — {asOf(TRACKER_CHECKED)}.</li>
            </ul>
            <p>Мы не открывали кассу, не регистрировали аккаунт и не получали выплату от CFT. Полный обзор на английском: <Link href="/blog/crypto-fund-trader-review" hrefLang="en">Crypto Fund Trader review</Link>.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="crypto-fund-trader-review">
              <strong>Риск.</strong> Торговля криптовалютой и CFD с плечом связана с высоким риском. Большинство участников не
              проходит оценку, а взнос после начала торговли не возвращается. Счета CFT — симулированные: вознаграждение
              выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            <div className="ru-actions" data-russian-cft-cta="final">
              {cta('ru-review-crypto-fund-trader-final', 'Перейти на сайт Crypto Fund Trader')}
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о Crypto Fund Trader</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
