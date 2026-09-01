import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Database,
  Gauge,
  Globe2,
  MonitorSmartphone,
  Scale,
  ShieldCheck,
  WalletCards,
  Zap,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import {
  challengeCurrency,
  challengeTierEconomics,
  getAllChallenges,
  getAllFirms,
  isChallengeFresh,
  type Challenge,
  type ChallengeAccountSize,
} from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/fundednext-vs-bright-funded'
const TITLE = 'FundedNext или Bright Funded: сравнение 2026'
const DESCRIPTION = 'Сравнение FundedNext и Bright Funded по 7 продуктам и 40 ценам: USD или EUR, этапы, просадка, true cost, выплаты, KYC и выбор для трейдера.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'FundedNext или Bright Funded',
    'FundedNext vs Bright Funded',
    'Bright Funded сравнение',
    'FundedNext сравнение',
    'проп фирмы USD EUR',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что лучше: FundedNext или Bright Funded?',
    a: 'Единого победителя нет. FundedNext подходит, если нужен Instant, USD-цены, 4 платформы или первая выплата Stellar 1-Step через 5 рабочих дней. Bright Funded логичнее, если нужны EUR-цены, TradeLocker, USDC ERC-20 или банковская выплата в EUR и устраивает первая стандартная дата через 30 дней.',
  },
  {
    q: 'У кого дешевле челлендж?',
    a: 'Цены нельзя честно свести в одну таблицу без текущего FX-курса: FundedNext публикует USD, Bright Funded — EUR. Минимальные листинговые входы в снимке от 27 августа 2026 года — $32.99 для Stellar Lite и €47 для Bright Funded 2-Step Bright; размер счёта и правила у этих продуктов различаются.',
  },
  {
    q: 'Чем отличаются 1-Step программы?',
    a: 'Обе 1-Step модели публикуют цель 10%, дневной лимит 3% и максимум 6%. FundedNext использует статическую границу, минимум 2 торговых дня и первое окно 5 рабочих дней; Bright Funded использует real-time trailing drawdown, минимум 5 дней и первую стандартную дату 30 дней.',
  },
  {
    q: 'Есть ли у Bright Funded instant funding?',
    a: 'Нет в текущем 30-дневном снимке. Все 3 продукта Bright Funded требуют 1 или 2 evaluation stages. FundedNext Stellar Instant имеет 0 этапов, стартовый split 70%, trailing maximum loss 6% и отдельный on-demand gate после роста 5% и EOD-проверки.',
  },
  {
    q: 'Где быстрее первая выплата?',
    a: 'У FundedNext срок зависит от продукта: 1-Step — 5 рабочих дней, 2-Step и Lite — 21 день, Instant — отдельный on-demand gate. Bright Funded публикует 30 дней до первой стандартной заявки и затем 14-дневный цикл. Это eligibility, а не гарантия фактического зачисления.',
  },
  {
    q: 'Какие способы выплаты доступны?',
    a: 'FundedNext называет 6 маршрутов: USDT ERC20/TRC20, USDC ERC20, Confirmo, RiseWorks, Bank Transfer и FNmarkets. Bright Funded называет 2: USDC ERC-20 и Bank Transfer в EUR. Доступность зависит от страны, KYC, банка и провайдера.',
  },
  {
    q: 'Какая фирма удобнее русскоязычному трейдеру за рубежом?',
    a: 'Язык не определяет доступ. Резидент ЕС с EUR-счётом может предпочесть Bright Funded, а пользователь разрешённой юрисдикции с подходящим кошельком — один из криптомаршрутов FundedNext. Проверяются фактические гражданство, резидентство, адрес, платёж и KYC.',
  },
  {
    q: 'Можно ли зарегистрироваться резиденту России?',
    a: 'Нельзя делать общий вывод по этой странице. У FundedNext официальные CFD, company, Futures и payout pages дают конфликтующие сигналы о России; до ответа поддержки и проверки checkout доступ не подтверждён. VPN, чужой адрес или неверные данные использовать нельзя. Bright Funded также требует отдельной country и SumSub KYC проверки.',
  },
]

const frequencyLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые 14 дней',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу',
}

function money(value: number | null | undefined, currency: 'USD' | 'EUR') {
  if (value == null) return 'не опубликовано'
  return `${currency === 'USD' ? '$' : '€'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function pricedTiers(product: Challenge) {
  const currency = challengeCurrency(product)
  return product.accountSizes.filter(tier => currency === 'USD' ? tier.priceUsd != null : tier.priceEur != null)
}

function priceRange(product: Challenge) {
  const currency = challengeCurrency(product)
  const values = pricedTiers(product)
    .map(tier => currency === 'USD' ? tier.priceUsd : tier.priceEur)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b)
  if (!values.length) return 'не опубликована'
  const first = money(values[0], currency)
  const last = money(values.at(-1), currency)
  return first === last ? first : `${first}–${last}`
}

function targetLabel(product: Challenge) {
  if (!product.profitTargets) return 'нет evaluation target'
  return Object.values(product.profitTargets).filter((value): value is number => value != null).map(value => `${value}%`).join(' / ')
}

function drawdownLabel(product: Challenge) {
  const type = ({ static: 'статическая', trailing: 'trailing', 'eod-trailing': 'EOD trailing', 'balance-based': 'по балансу' } as Record<string, string>)[product.drawdownType ?? ''] ?? 'тип не опубликован'
  return `${product.dailyLossPct == null ? 'день —' : `день ${product.dailyLossPct}%`} · ${product.maxLossPct == null ? 'максимум —' : `максимум ${product.maxLossPct}%`} · ${type}`
}

function payoutLabel(product: Challenge) {
  if (product.payoutFirstDays === 0) return 'по запросу после отдельного gate'
  if (product.payoutFirstDays == null) return 'не опубликована'
  return `${product.payoutFirstDays} дн. · ${frequencyLabels[product.payoutFrequency ?? ''] ?? 'цикл не опубликован'}`
}

function cheapestTier(product: Challenge): ChallengeAccountSize | undefined {
  const currency = challengeCurrency(product)
  return [...pricedTiers(product)].sort((a, b) => {
    const left = currency === 'USD' ? a.priceUsd : a.priceEur
    const right = currency === 'USD' ? b.priceUsd : b.priceEur
    return (left ?? Number.POSITIVE_INFINITY) - (right ?? Number.POSITIVE_INFINITY)
  })[0]
}

function minimumEconomics(product: Challenge) {
  const tier = cheapestTier(product)
  if (!tier) return null
  return challengeTierEconomics(product, tier)
}

export default function FundedNextVsBrightFundedRussianPage() {
  const firms = getAllFirms()
  const allChallenges = getAllChallenges()
  const fundedNext = firms.find(firm => outboundSlug(firm.name) === 'fundednext')
  const brightFunded = firms.find(firm => outboundSlug(firm.name) === 'bright-funded')
  const products = allChallenges.filter(product =>
    ['fundednext', 'bright-funded'].includes(product.firmSlug) && isChallengeFresh(product),
  )
  const fundedNextProducts = products.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = products.filter(product => product.firmSlug === 'bright-funded')
  const priceCount = products.reduce((sum, product) => sum + pricedTiers(product).length, 0)
  const sourceCount = new Set(products.map(product => product.sourceUrl)).size
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? marketEvidence.capturedAt
  const oneStepFn = fundedNextProducts.find(product => product.productSlug === 'stellar-1-step')
  const oneStepBright = brightProducts.find(product => product.productSlug === 'bright-funded-1-step')
  const twoStepFn = fundedNextProducts.find(product => product.productSlug === 'stellar-2-step')
  const liteFn = fundedNextProducts.find(product => product.productSlug === 'stellar-lite')
  const instantFn = fundedNextProducts.find(product => product.productSlug === 'stellar-instant')
  const twoStepBright = brightProducts.find(product => product.productSlug === 'bright-funded-2-step-bright')
  const classicBright = brightProducts.find(product => product.productSlug === 'bright-funded-2-step-classic')
  const payoutEvidence = new Map(marketEvidence.payoutEvidence.map(item => [item.firmSlug, item]))
  const kycEvidence = new Map(marketEvidence.kycEvidence.map(item => [item.firmSlug, item]))
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'FundedNext или Bright Funded' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    numberOfItems: 2,
    itemListElement: [
      { '@type': 'ListItem', position: 1, item: { '@type': 'Organization', name: 'FundedNext', url: 'https://tradersfundhub.com/ru/obzor-fundednext' } },
      { '@type': 'ListItem', position: 2, item: { '@type': 'Organization', name: 'Bright Funded', url: 'https://tradersfundhub.com/ru/obzor-bright-funded' } },
    ],
  }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: latestCapture,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-primary-comparison="fundednext-bright-funded"
          data-russian-primary-comparison-products={products.length}
          data-russian-primary-comparison-prices={priceCount}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FundedNext или Bright Funded</div>
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Два главных партнёра · победитель зависит от продукта</div>
          <h1>FundedNext или Bright Funded: что выбрать в 2026 году</h1>
          <p className="ru-lead">
            Сравнили {products.length} свежих продуктов, {priceCount} листинговых цен и {sourceCount} первичных продуктовых страниц.
            FundedNext предлагает 4 модели в USD, включая Instant; Bright Funded — 3 evaluation-модели в EUR.
            Выбор ниже строится по валюте, просадке, сроку первой выплаты, KYC и реальной задаче трейдера.
          </p>
          <div className="ru-stats" aria-label="Охват сравнения FundedNext и Bright Funded">
            <div className="ru-stat"><strong>{fundedNextProducts.length}</strong><span>продукта FundedNext</span></div>
            <div className="ru-stat"><strong>{brightProducts.length}</strong><span>продукта Bright Funded</span></div>
            <div className="ru-stat"><strong>{priceCount}</strong><span>цен в USD и EUR без FX-пересчёта</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>дата продуктового снимка</span></div>
          </div>
          <div className="ru-actions">
            <Link href="/go/fundednext?from=ru-fn-vs-bright-fundednext" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
              Проверить FundedNext <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/go/bright-funded?from=ru-fn-vs-bright-bright-funded" rel="sponsored nofollow noopener" className="btn-outline">
              Проверить Bright Funded <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="#verdict" className="btn-outline">Сначала увидеть различия</Link>
          </div>
        </div>
      </section>

      <article data-russian-primary-comparison-article="product-before-brand">
        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content">
            <div className="ru-notice" data-russian-country-boundary="comparison-not-access">
              <strong>Русский язык не подтверждает доступность страны.</strong>{' '}
              Страница рассчитана на русскоязычных трейдеров по всему миру. Перед оплатой проверяются гражданство,
              резидентство, адрес, KYC, карта, банк, кошелёк и конкретный продукт. VPN и неверные данные не являются решением.
            </div>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="fundednext-bright-comparison">
              <strong>Партнёрское раскрытие.</strong>{' '}
              FundedNext и Bright Funded — два главных коммерческих партнёра русской версии. Мы можем получить комиссию после
              регистрации через /go/, но не назначаем общего победителя: цифры читаются из датированных продуктовых записей,
              а CTA обеих фирм показаны симметрично.
            </div>

            <h2>Короткий вердикт: выбор зависит от пяти ограничений</h2>
            <p>
              <strong>FundedNext выбирают не потому, что его итоговый балл выше.</strong> Его практические преимущества —
              4 продукта вместо 3, USD checkout, отдельный Stellar Instant, 4 платформы и более короткие первые окна у
              Stellar 1-Step, 2-Step и Lite. <strong>Bright Funded выбирают не из-за слова «до 100%».</strong> Его отличия —
              EUR checkout, TradeLocker, USDC ERC-20, EUR bank transfer и два 2-Step варианта с разными risk caps.
            </p>
            <div className="ru-table-wrap" data-russian-primary-comparison-matrix="five-constraints">
              <table className="ru-table">
                <thead><tr><th>Ограничение</th><th>FundedNext</th><th>Bright Funded</th><th>Решение</th></tr></thead>
                <tbody>
                  <tr><td>Валюта оплаты</td><td>22 цены в USD</td><td>18 цен в EUR</td><td>Выбирайте валюту реального платёжного метода; мы не фиксируем временный FX.</td></tr>
                  <tr><td>Без evaluation</td><td>Stellar Instant, 0 этапов</td><td>Нет phase-0 продукта</td><td>Для instant-маршрута в этой паре подходит только FundedNext.</td></tr>
                  <tr><td>Самая ранняя стандартная дата</td><td>5 рабочих дней у 1-Step</td><td>30 дней у всех 3 продуктов</td><td>Для раннего cash flow преимущество у FundedNext 1-Step.</td></tr>
                  <tr><td>Платформа</td><td>MT4, MT5, cTrader, Match-Trader</td><td>MT5, TradeLocker</td><td>Сначала подтвердите платформу выбранного продукта, затем фирму.</td></tr>
                  <tr><td>Банк в EUR</td><td>Bank Transfer зависит от страны</td><td>Bank Transfer публикуется в EUR</td><td>Для подходящего EUR-счёта Bright может уменьшить лишнюю конвертацию.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-products="seven-current-products">
          <div className="ru-shell ru-content">
            <h2>Все 7 продуктов: этапы, цены, просадка и выплаты</h2>
            <p>
              Сравнивать логотипы без продуктовой строки опасно. У FundedNext максимальный убыток меняется от 6% до 10%,
              а первая выплата — от отдельного on-demand gate до 21 дня. У Bright Funded 1-Step использует trailing,
              тогда как оба 2-Step продукта используют статическую границу. Ни одна агрегированная цифра не описывает все 7 вариантов.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма и продукт</th><th>Этапы · цели</th><th>Диапазон цен</th><th>Просадка</th><th>Первая выплата</th></tr></thead>
                <tbody>
                  {products.map(product => (
                    <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-primary-comparison-product={`${product.firmSlug}:${product.productSlug}`}>
                      <td><strong>{product.firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'}</strong><br />{product.productName}</td>
                      <td>{product.phases} · {targetLabel(product)}</td>
                      <td>{priceRange(product)}<br />{pricedTiers(product).length} размеров</td>
                      <td>{drawdownLabel(product)}</td>
                      <td>{payoutLabel(product)}<br /><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">Источник · {product.sourceCapturedAt}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-one-step="same-caps-different-engine">
          <div className="ru-shell ru-content">
            <h2>1-Step против 1-Step: одинаковые проценты, разная механика</h2>
            <p>
              На поверхности модели совпадают: цель {oneStepFn?.profitTargets?.phase1 ?? '—'}%, дневной лимит {oneStepFn?.dailyLossPct ?? '—'}%,
              максимум {oneStepFn?.maxLossPct ?? '—'}% и базовая доля {oneStepFn?.profitSplitPct ?? '—'}% у обеих.
              Но FundedNext Stellar 1-Step сохраняет статическую максимальную границу, а Bright Funded 1-Step использует
              real-time trailing от highest equity и фиксирует её на initial balance только после роста 6%.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>FundedNext Stellar 1-Step</h3><p className="ru-muted">{oneStepFn?.minTradingDays ?? '—'} минимальных торговых дня, статический максимум {oneStepFn?.maxLossPct ?? '—'}%, USD {priceRange(oneStepFn!)}, первая дата {oneStepFn?.payoutFirstDays ?? '—'} рабочих дней. Подходит стратегии, которой важна неподвижная общая граница.</p></article>
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Bright Funded 1-Step</h3><p className="ru-muted">{oneStepBright?.minTradingDays ?? '—'} минимальных торговых дней, trailing максимум {oneStepBright?.maxLossPct ?? '—'}%, EUR {priceRange(oneStepBright!)}, первая дата {oneStepBright?.payoutFirstDays ?? '—'} дней. Floating profit может подтянуть risk line вверх.</p></article>
            </div>
            <p>
              Разница в 2 против 5 минимальных дней не означает автоматического прохождения: прибыльная цель остаётся 10%.
              Для трейдера, который часто отдаёт внутридневную floating profit, статическая модель может быть предсказуемее.
              Для трейдера с EUR payment method и строгой фиксацией прибыли Bright остаётся осмысленной альтернативой.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-two-step="matched-risk-buckets">
          <div className="ru-shell ru-content">
            <h2>2-Step: сравнивайте одинаковые risk buckets</h2>
            <p>
              Ближайшая пара по 5% daily и 10% maximum — FundedNext Stellar 2-Step и Bright Funded 2-Step Classic.
              Но цели различаются: {targetLabel(twoStepFn!)} у FundedNext против {targetLabel(classicBright!)} у Classic.
              Для 4% daily и 8% maximum ближе FundedNext Stellar Lite и Bright Funded 2-Step Bright; первая фаза у обоих 8%,
              а вторая — {liteFn?.profitTargets?.phase2 ?? '—'}% против {twoStepBright?.profitTargets?.phase2 ?? '—'}%.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Risk bucket</th><th>FundedNext</th><th>Bright Funded</th><th>Главное отличие</th></tr></thead>
                <tbody>
                  <tr><td>5% день · 10% максимум</td><td>Stellar 2-Step · цели {targetLabel(twoStepFn!)}</td><td>2-Step Classic · цели {targetLabel(classicBright!)}</td><td>FundedNext снижает первую цель на 2 п.п.; валюты и цены разные.</td></tr>
                  <tr><td>4% день · 8% максимум</td><td>Stellar Lite · цели {targetLabel(liteFn!)}</td><td>2-Step Bright · цели {targetLabel(twoStepBright!)}</td><td>Lite снижает вторую цель на 1 п.п.; Bright публикует EUR checkout.</td></tr>
                  <tr><td>Минимум дней</td><td>{twoStepFn?.minTradingDays ?? '—'} в фазе</td><td>{classicBright?.minTradingDays ?? '—'} в фазе</td><td>Одинаковый минимум не делает payout timing одинаковым.</td></tr>
                  <tr><td>Первая стандартная выплата</td><td>{twoStepFn?.payoutFirstDays ?? '—'} день</td><td>{classicBright?.payoutFirstDays ?? '—'} дней</td><td>Разница 9 дней до eligibility при выполнении остальных правил.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-instant="fundednext-only">
          <div className="ru-shell ru-content">
            <h2>Instant funding: только FundedNext, но не без правил</h2>
            <p>
              Stellar Instant — единственный phase-0 продукт в этой паре. Он начинается с {priceRange(instantFn!)} для счетов
              от $2K до $20K, публикует стартовую долю {instantFn?.profitSplitPct ?? '—'}% и {instantFn?.maxLossPct ?? '—'}%
              trailing maximum loss. Fee не возвращается. On-demand eligibility требует роста 5% и EOD-проверки;
              рост от 1% до менее 5% использует 14-дневный цикл.
            </p>
            <div className="ru-notice">
              <Zap size={16} aria-hidden="true" />{' '}
              <strong>0 evaluation phases не означает 0 ограничений.</strong> Instant убирает profit target до funded stage,
              но не убирает trailing line, payout gate, KYC, country rule и проверку поведения. Bright Funded не включается
              в instant shortlist, потому что все {brightProducts.length} его текущих продукта имеют evaluation.
            </div>
            <div className="ru-actions">
              <Link href="/ru/prop-firmy-bez-chelendzha" className="btn-outline">Полное сравнение instant funding</Link>
              <Link href="/go/fundednext?from=ru-fn-vs-bright-instant" rel="sponsored nofollow noopener" className="btn-primary">Проверить Stellar Instant <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-cost="compute-true-cost">
          <div className="ru-shell ru-content">
            <h2>Цена и true cost: USD нельзя складывать с EUR</h2>
            <p>
              Минимальная листинговая цена FundedNext — {priceRange(liteFn!)} у Stellar Lite; у Bright Funded —
              {priceRange(twoStepBright!)} у 2-Step Bright. Эти диапазоны не доказывают, какая фирма дешевле: счёт остаётся
              номинирован в USD, fee Bright — в EUR, а временный обменный курс быстро устаревает. Мы сохраняем исходную валюту.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Продукт</th><th>Минимальный fee</th><th>Базовая доля</th><th>Валовая прибыль для возврата fee</th><th>Что не включено</th></tr></thead>
                <tbody>
                  {products.map(product => {
                    const economics = minimumEconomics(product)
                    const currency = challengeCurrency(product)
                    return (
                      <tr key={`economics-${product.firmSlug}-${product.productSlug}`}>
                        <td>{product.productName}</td>
                        <td>{economics ? money(economics.minimumCost, currency) : 'не рассчитано'}</td>
                        <td>{product.profitSplitPct == null ? 'не опубликована' : `${product.profitSplitPct}%`}</td>
                        <td>{economics ? money(economics.breakEvenProfit, currency) : 'не рассчитано'}</td>
                        <td>акция, add-on, gateway, сеть, банк и FX</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">
              Значения считаются общей функцией challengeTierEconomics(): minimum fee ÷ базовая доля. Они не обещают refund
              и не конвертируют EUR в USD. У Bright отдельно рекламируется challenge-fee refund add-on; у FundedNext возврат
              зависит от продукта и номера одобренного reward.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-payout="methods-cycle-fees">
          <div className="ru-shell ru-content">
            <h2>Выплаты: 6 маршрутов FundedNext против 2 у Bright Funded</h2>
            <p>
              FundedNext публикует {payoutEvidence.get('fundednext')?.methods.length ?? 0} маршрутов: USDT ERC20/TRC20,
              USDC ERC20, Confirmo, RiseWorks, Bank Transfer и direct deposit в FNmarkets. После корректной заявки фирма
              указывает issuance в течение 24 часов, а gateway charges оплачивает трейдер. OTP отправляется на зарегистрированный email.
            </p>
            <p>
              Bright Funded публикует {payoutEvidence.get('bright-funded')?.methods.length ?? 0} маршрута: USDC ERC-20 и
              банковский перевод в EUR. Первая стандартная дата — 30 дней после первой funded-сделки, затем 14 дней;
              финансовая команда указывает максимум 1 день обработки. Фирма не заявляет собственную дополнительную fee,
              но network, bank, provider и conversion costs могут составлять $5–$50 и иногда больше.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Выбирайте FundedNext, если</h3><p className="ru-muted">Нужен выбор USDT в 2 сетях, USDC, RiseWorks или FNmarkets, а продуктовый payout window важнее простоты списка.</p></article>
              <article className="ru-card"><BadgeDollarSign size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Выбирайте Bright Funded, если</h3><p className="ru-muted">USDC ERC-20 или EUR bank полностью закрывает задачу и 30-дневная первая стандартная дата не нарушает cash-flow plan.</p></article>
            </div>
            <div className="ru-actions"><Link href="/ru/vyplaty-prop-firm" className="btn-outline">Разобрать 4 стадии выплаты</Link></div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-kyc="two-required-processes">
          <div className="ru-shell ru-content">
            <h2>KYC, платформы и проверка страны</h2>
            <p>
              Обе фирмы требуют KYC после evaluation и до активации funded account. FundedNext называет passport,
              government-issued identity card или residence permit и публикует типичный срок около
              {kycEvidence.get('fundednext')?.timing[0]?.match(/48 hours/)?.[0] ?? '48 часов'}; utility bill или bank statement
              за последние 3 месяца могут потребоваться дополнительно.
            </p>
            <p>
              Bright Funded использует {kycEvidence.get('bright-funded')?.provider ?? 'SumSub'} для identity и address,
              затем Risk Team проводит Security Check. Нормальный срок — 1–2 рабочих дня с понедельника по пятницу,
              опубликованный максимум в peak period — 4 дня. После одобрения отправляется договор, затем активируется аккаунт.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Проверка</th><th>FundedNext</th><th>Bright Funded</th></tr></thead>
                <tbody>
                  <tr><td>Платформы</td><td>{fundedNext?.platforms.join(' · ')}</td><td>{brightFunded?.platforms.join(' · ')}</td></tr>
                  <tr><td>KYC provider/process</td><td>FundedNext Verification Center</td><td>SumSub + Risk Team Security Check</td></tr>
                  <tr><td>Опубликованный срок</td><td>около 48 часов</td><td>1–2 рабочих дня, до 4 в peak period</td></tr>
                  <tr><td>Проверка адреса</td><td>может потребоваться документ до 3 месяцев</td><td>proof of address; список зависит от страны</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-diaspora="language-not-residency">
          <div className="ru-shell ru-content">
            <h2>Русскоязычный трейдер за рубежом: четыре сценария</h2>
            <p>
              Русскоязычная аудитория не является одной страной. Пользователь в Латвии с EUR bank account, резидент ОАЭ
              с разрешённым crypto wallet, гражданин Казахстана с местной картой и резидент России имеют разные payment,
              tax, sanctions и KYC profiles. Сайт переводит правила на русский, но не заменяет решение фирмы и провайдера.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>EUR-счёт в поддерживаемой стране</h3><p className="ru-muted">Bright Funded может быть естественнее: fee и bank reward остаются в EUR. Сравните полный checkout и внешнюю bank fee.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Поддерживаемый криптокошелёк</h3><p className="ru-muted">FundedNext даёт больше токенов и сетей. Проверьте travel rule, имя владельца, off-ramp и совпадение ERC20/TRC20.</p></article>
              <article className="ru-card"><MonitorSmartphone size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Нужен TradeLocker</h3><p className="ru-muted">Bright Funded — вариант в этой паре. Для cTrader, Match-Trader или MT4 выбор смещается к FundedNext.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент России</h3><p className="ru-muted">У FundedNext статус остаётся «конфликт»: {accessEvidence?.sourceUrls.length ?? 0} официальных страницы не дают безопасного общего ответа. Bright тоже проверяется отдельно.</p></article>
            </div>
            <div className="ru-actions"><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary">Проверить профиль и страну <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link><Link href="/ru/prop-firmy-s-ctrader" className="btn-outline">Сравнить правила cTrader</Link></div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-trust="suppressed-is-not-null">
          <div className="ru-shell ru-content">
            <h2>Отзывы и trust signal: почему данные несимметричны</h2>
            <p>
              На снимке Trustpilot от {fundedNext?.trustpilotCapturedAt ?? 'неуказанной даты'} FundedNext имел
              {fundedNext?.trustpilotScore ?? '—'}/5 при {fundedNext?.trustpilotCount?.toLocaleString('en-US') ?? '—'} отзывах.
              Это агрегат пользовательской платформы, а не проверка каждой выплаты. У Bright Funded score не просто отсутствует:
              aggregate был suppressed за нарушение guidelines, поэтому подставлять 0, старую оценку или нейтральное «нет данных» нельзя.
            </p>
            <div className="ru-notice">
              <ShieldCheck size={16} aria-hidden="true" />{' '}
              <strong>Как использовать отзывы:</strong> ищите повторяющиеся named rules, даты, payout method и ответ поддержки,
              но принимайте решение по текущему договору и первичной странице. Один screenshot выплаты не доказывает,
              что другой профиль пройдёт KYC, а один негативный отзыв не заменяет проверку конкретного breach rule.
            </div>
            <div className="ru-actions"><Link href="/ru/otzyvy-prop-firm" className="btn-outline">Как проверять отзывы</Link></div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-boundary="when-neither-fits">
          <div className="ru-shell ru-content">
            <h2>Когда не подходит ни FundedNext, ни Bright Funded</h2>
            <p>
              Эта пара не закрывает любую задачу. Для торговли фьючерсами MOEX откройте отдельное исследование локальных компаний;
              для других глобальных моделей используйте полный русский рейтинг, не подменяя его выводом из двух партнёрских карточек.
            </p>
            <p>
              Если ни одна фирма письменно не подтверждает вашу страну, KYC или payout rail, правильный результат сравнения — не оплачивать checkout.
              <Link href="/ru/rossiyskie-prop-kompanii"> Локальные модели</Link> и <Link href="/ru/luchshie-prop-firmy">полный рейтинг</Link> используют другие наборы продуктов.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-decision="constraint-before-commission">
          <div className="ru-shell ru-content">
            <h2>Финальный чек-лист выбора</h2>
            <ol>
              <li><strong>Страна и KYC.</strong> Подтвердите профиль до checkout; русский язык не является country permission.</li>
              <li><strong>Продукт.</strong> Выберите 1-Step, 2-Step или Instant; не сравнивайте 7 продуктов одним score.</li>
              <li><strong>Валюта.</strong> Сравните USD total FundedNext и EUR total Bright без постоянного FX-коэффициента.</li>
              <li><strong>Просадка.</strong> Определите, выдерживает ли стратегия static, real-time trailing или trailing Instant.</li>
              <li><strong>Первая выплата.</strong> Включите 5, 21 или 30 дней eligibility, processing фирмы и время получателя.</li>
              <li><strong>Чистая сумма.</strong> Вычтите provider, gateway, network, bank и FX fees после базовой доли 70–80%.</li>
              <li><strong>Платформа.</strong> MT4/cTrader/Match-Trader ведут к FundedNext; TradeLocker — к Bright в этой паре.</li>
              <li><strong>Источник.</strong> Откройте dated product page ещё раз непосредственно перед оплатой.</li>
            </ol>
            <div className="ru-grid">
              <article className="ru-card" data-russian-primary-comparison-cta="fundednext">
                <div className="ru-card-head"><h3>Выбрать FundedNext</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">Подходит, если ключевое ограничение — Instant, USD, раннее payout window или MT4/cTrader/Match-Trader.</p>
                <div className="ru-actions"><Link href="/ru/obzor-fundednext" className="btn-outline">Русский обзор</Link><Link href="/go/fundednext?from=ru-fn-vs-bright-verdict-fundednext" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
              <article className="ru-card" data-russian-primary-comparison-cta="bright-funded">
                <div className="ru-card-head"><h3>Выбрать Bright Funded</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">Подходит, если ключевое ограничение — EUR checkout/bank, TradeLocker или конкретный 2-Step risk bucket.</p>
                <div className="ru-actions"><Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор</Link><Link href="/go/bright-funded?from=ru-fn-vs-bright-verdict-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
            </div>
            <p className="ru-source-line"><Database size={14} aria-hidden="true" /> {products.length} продуктов · {priceCount} цен · {sourceCount} первичных product pages · источники захвачены {latestCapture}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
