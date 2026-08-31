import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Database,
  Gauge,
  Globe2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/prop-firmy-bez-chelendzha'
const TITLE = 'Проп-фирмы без челленджа 2026: FundedNext Instant'
const DESCRIPTION = 'Сравнение проп-фирм без челленджа: FundedNext Stellar Instant, FundingPips Zero и 7 других phase-0 продуктов — цены, просадка, выплаты и KYC.'
const FUNDEDNEXT_REWARD_URL = 'https://help.fundednext.com/en/articles/11641693-what-is-the-eligibility-criteria-for-my-performance-reward-in-the-stellar-instant-account'
const FUNDEDNEXT_SCALE_URL = 'https://help.fundednext.com/en/articles/11641516-is-there-a-scale-up-plan-for-stellar-instant-accounts'
const FUNDEDNEXT_NEWS_URL = 'https://help.fundednext.com/en/articles/11641410-is-news-trading-allowed-in-the-stellar-instant-accounts'
const FUNDINGPIPS_ZERO_URL = 'https://help.fundingpips.com/hc/en-us/articles/34502157694865-FundingPips-Zero'
const FUNDINGPIPS_COMPARE_URL = 'https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'проп фирмы без челленджа',
    'instant funding проп фирмы',
    'FundedNext Instant',
    'FundedNext Stellar Instant',
    'FundingPips Zero',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что значит «проп-фирма без челленджа»?',
    a: 'На этой странице phase-0 означает 0 оценочных этапов и отсутствие обычной profit target до funded-стадии. Это не подтверждает реальный капитал: 9 текущих продуктов остаются симулированными или требуют отдельной проверки модели, просадки, выплаты и договора.',
  },
  {
    q: 'Сколько стоит FundedNext Stellar Instant?',
    a: 'На снимке от 27 августа 2026 года опубликованы 4 цены: $59.99 за $2K, $149.99 за $5K, $299.99 за $10K и $599.99 за $20K. Fee не возвращается; swap-free add-on стоит отдельно и не включён в таблицу.',
  },
  {
    q: 'Как работает выплата FundedNext Instant?',
    a: 'Стартовый Reward Share — 70%. On-demand eligibility появляется при росте 5% и EOD-проверке; рост от 1% до менее 5% использует 14-дневный цикл. Слово on-demand не означает выплату сразу после первой прибыльной сделки.',
  },
  {
    q: 'Какие главные правила FundingPips Zero?',
    a: 'Zero публикует 5% trailing max loss, 15% consistency, 3% safety cushion, 7 прибыльных дней минимум по 0.25% в каждом rolling 30-day period и 14-дневное окно reward. Weekend и news-window violations описаны как hard breach.',
  },
  {
    q: 'Какая проп-фирма без челленджа самая дешёвая?',
    a: 'Минимальная опубликованная цена в текущей таблице — $15 у Maven Instant, но цена не сравнивает размер счёта, 3% trailing loss, 20% consistency и payout gate. Среди 2 партнёрских маршрутов FundedNext начинается с $59.99, а FundingPips Zero — с $60.',
  },
  {
    q: 'Есть ли instant funding у Bright Funded?',
    a: 'Нет в текущем 30-дневном снимке. У Bright Funded 3 свежие программы: 1-Step и 2 варианта 2-Step, то есть все требуют evaluation. Мы показываем Bright только как challenge-based alternative и не включаем в instant-рейтинг.',
  },
  {
    q: 'Можно ли купить instant funding русскоязычному трейдеру за рубежом?',
    a: 'Возможность зависит не от языка, а от гражданства, резидентства, адреса, KYC, способа оплаты и payout route. Русскоязычный резидент ЕС, Казахстана, ОАЭ или другой страны должен проверять свой фактический профиль до checkout.',
  },
  {
    q: 'Instant funding означает отсутствие KYC?',
    a: 'Нет. Phase-0 убирает evaluation, но не identity verification, Customer Agreement или payout-provider onboarding. FundedNext и FundingPips требуют KYC до соответствующего account stage; отдельный русский KYC-гайд содержит 5 первичных источников.',
  },
]

const instantPartnerRoutes = [
  { slug: 'fundednext', name: 'FundedNext', productSlug: 'stellar-instant', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'fundingpips', name: 'FundingPips', productSlug: 'zero', reviewHref: '/ru/obzor-fundingpips' },
] as const

function formatPrice(value: number, currency: 'USD' | 'EUR') {
  return `${currency === 'EUR' ? '€' : '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function priceRange(product: Challenge) {
  const prices = [
    ...product.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [{ value: tier.priceUsd, currency: 'USD' as const }]),
    ...product.accountSizes.flatMap(tier => tier.priceEur == null ? [] : [{ value: tier.priceEur, currency: 'EUR' as const }]),
  ]
  if (!prices.length) return 'не опубликована'
  const currencies = new Set(prices.map(price => price.currency))
  if (currencies.size > 1) return 'несколько валют'
  const values = prices.map(price => price.value).sort((a, b) => a - b)
  return values[0] === values.at(-1)
    ? formatPrice(values[0], prices[0].currency)
    : `${formatPrice(values[0], prices[0].currency)}–${formatPrice(values.at(-1)!, prices[0].currency)}`
}

function accountRange(product: Challenge) {
  const sizes = product.accountSizes.map(tier => tier.sizeUsd).filter((value): value is number => value != null).sort((a, b) => a - b)
  if (!sizes.length) return 'не опубликован'
  const label = (value: number) => `$${value.toLocaleString('en-US')}`
  return sizes[0] === sizes.at(-1) ? label(sizes[0]) : `${label(sizes[0])}–${label(sizes.at(-1)!)}`
}

function drawdownLabel(product: Challenge) {
  const type = ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'тип не опубликован'
  return product.maxLossPct == null ? type : `${product.maxLossPct}% · ${type}`
}

function payoutLabel(product: Challenge) {
  if (product.payoutFirstDays === 0) return 'по запросу при выполнении gate'
  if (product.payoutFirstDays == null) return 'срок не опубликован'
  const frequency = ({
    weekly: 'еженедельно',
    'bi-weekly': 'каждые 2 недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'цикл не указан'
  return `${product.payoutFirstDays} дн. · ${frequency}`
}

function pricedTierCount(products: Challenge[]) {
  return products.reduce((sum, product) => sum + product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0),
  ).length, 0)
}

function russianReviewHref(slug: string, firm: Firm) {
  if (slug === 'fundednext') return '/ru/obzor-fundednext'
  if (slug === 'fundingpips') return '/ru/obzor-fundingpips'
  if (slug === 'bright-funded') return '/ru/obzor-bright-funded'
  return firm.reviewUrl
}

export default function RussianInstantPropFirmsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const firmBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const partnerSlugSet = new Set<string>(instantPartnerRoutes.map(route => route.slug))
  const products = challenges
    .filter(product => product.phases === 0 && isChallengeFresh(product))
    .sort((a, b) => {
      const partnerOrder = Number(partnerSlugSet.has(b.firmSlug)) - Number(partnerSlugSet.has(a.firmSlug))
      return partnerOrder || (firmBySlug.get(b.firmSlug)?.score ?? 0) - (firmBySlug.get(a.firmSlug)?.score ?? 0)
    })
  const instantFirmCount = new Set(products.map(product => product.firmSlug)).size
  const instantPriceCount = pricedTierCount(products)
  const partnerCards = instantPartnerRoutes.map(route => {
    const firm = firmBySlug.get(route.slug)
    const product = products.find(candidate => candidate.firmSlug === route.slug && candidate.productSlug === route.productSlug)
    return { ...route, firm, product }
  }).filter(item => item.firm?.affiliateUrl && item.product)
  const nonPartnerProducts = products.filter(product => !partnerSlugSet.has(product.firmSlug))
  const brightFirm = firmBySlug.get('bright-funded')
  const brightProducts = challenges.filter(product => product.firmSlug === 'bright-funded' && isChallengeFresh(product))
  const brightPriceCount = pricedTierCount(brightProducts)
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'нет данных'

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Проп-фирмы без челленджа' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: `${firmBySlug.get(product.firmSlug)?.name ?? product.firmSlug} — ${product.productName}`,
        url: product.sourceUrl,
      },
    })),
  }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: latestCapture,
    author: {
      '@type': 'Person',
      name: 'Edris Derakhshi',
      url: 'https://tradersfundhub.com/authors/edris-derakhshi',
    },
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
          data-russian-instant-ranking="long-form-phase-zero"
          data-russian-instant-product-count={products.length}
          data-russian-instant-firm-count={instantFirmCount}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Без челленджа</div>
          <div className="ru-eyebrow"><Zap size={14} aria-hidden="true" /> 0 evaluation phases — правила остаются</div>
          <h1>Проп-фирмы без челленджа: FundedNext Instant и FundingPips Zero</h1>
          <p className="ru-lead">
            Сравнили {products.length} свежих phase-0 продуктов у {instantFirmCount} глобальных фирм.
            Два партнёрских маршрута действительно имеют instant-продукт: FundedNext Stellar Instant и FundingPips Zero.
            Bright Funded не включён в этот рейтинг, потому что его 3 текущие программы требуют evaluation.
          </p>
          <div className="ru-stats" aria-label="Текущий охват instant funding">
            <div className="ru-stat"><strong>{products.length}</strong><span>свежих phase-0 продуктов</span></div>
            <div className="ru-stat"><strong>{instantFirmCount}</strong><span>фирм с подтверждённым phase-0</span></div>
            <div className="ru-stat"><strong>{partnerCards.length}</strong><span>партнёрских instant-маршрута</span></div>
            <div className="ru-stat"><strong>{instantPriceCount}</strong><span>опубликованных phase-0 цен</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#partner-instant" className="btn-primary btn-glow">Сравнить FundedNext и FundingPips <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#all-products" className="btn-outline">Все {products.length} продуктов</Link>
            <Link href="#bright-alternative" className="btn-outline">Когда выбрать Bright Funded</Link>
          </div>
          <p className="ru-source-line">Последний продуктовый захват: {latestCapture}. Цена и правило проверяются повторно перед checkout.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="instant-not-access">
            <strong>Phase-0 не является разрешением для страны.</strong>{' '}
            Русскоязычные трейдеры живут в разных юрисдикциях. До оплаты проверяйте гражданство,
            резидентство, фактический адрес, KYC, санкционные ограничения, способ оплаты и payout route.
            VPN, crypto payment или русский документ не отменяют compliance policy.
          </div>
        </div>
      </section>

      <article data-russian-instant-article="global-partner-decision-guide">
        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="instant-ranking">
              <strong>Партнёрское раскрытие и граница.</strong>{' '}
              FundedNext и FundingPips выделены, потому что у каждой фирмы есть активная партнёрская ссылка и 1 свежий phase-0 продукт.
              Переход может принести нам комиссию. Bright Funded показан отдельно как challenge-based alternative, а не маскируется под instant funding.
            </div>
            <nav className="ru-review-toc" aria-label="Содержание instant-funding руководства">
              <strong>Содержание</strong>
              <ol>
                <li><a href="#phase-zero">Что означает phase-0</a></li>
                <li><a href="#partner-instant">2 партнёрских instant-продукта</a></li>
                <li><a href="#fundednext-instant">FundedNext Stellar Instant</a></li>
                <li><a href="#fundingpips-zero">FundingPips Zero</a></li>
                <li><a href="#all-products">Все 9 продуктов</a></li>
                <li><a href="#risk">Просадка и payout gates</a></li>
                <li><a href="#diaspora">Русскоязычные за рубежом</a></li>
                <li><a href="#instant-definition">Instant или fast-track</a></li>
                <li><a href="#bright-alternative">Bright Funded как альтернатива</a></li>
                <li><a href="#decision">Решение до покупки</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="phase-zero">
          <div className="ru-shell" data-russian-instant-definition="zero-evaluation-not-zero-rules">
            <h2>Phase-0 убирает evaluation, но не 5 следующих проверок</h2>
            <p className="ru-muted">
              Структурное поле phases равно 0, когда перед funded- или Master-этапом нет обычной profit target.
              После покупки остаются риск, payout gate, KYC, договор и country policy; слово instant не обнуляет ни одно из этих условий.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Просадка</h3><p className="ru-muted">Trailing или EOD-trailing floor может двигаться вместе с equity и закрыть счёт до первой заявки.</p></article>
              <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Consistency</h3><p className="ru-muted">FundingPips Zero публикует 15%; у других phase-0 моделей текущая граница достигает 20%.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Reward gate</h3><p className="ru-muted">On-demand может требовать growth, EOD check, safety cushion или profit goal до кнопки payout.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. KYC и договор</h3><p className="ru-muted">Нет evaluation — не значит нет identity verification или Customer Agreement.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>5. Страна</h3><p className="ru-muted">Citizenship, residence, payment и payout availability проверяются по фактическому профилю.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="partner-instant">
          <div className="ru-shell" data-russian-instant-featured-partners="fundednext-fundingpips">
            <h2>FundedNext Instant или FundingPips Zero: прямое сравнение</h2>
            <p className="ru-muted">
              У обеих моделей 0 evaluation phases и невозвратный fee, но failure point и payout eligibility различаются.
              FundedNext начинается на $0.01 дешевле; эта разница не важнее 6% против 5% trailing loss и разных reward gates.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Продукт</th><th>Размеры</th><th>Цена</th><th>Max loss</th><th>Стартовый сплит</th><th>Reward gate</th></tr></thead>
                <tbody>
                  {partnerCards.map(card => {
                    const product = card.product!
                    const isFundedNext = card.slug === 'fundednext'
                    return (
                      <tr key={card.slug} data-russian-instant-evidence={card.slug}>
                        <td><strong>{card.name}</strong><br />{product.productName}</td>
                        <td>{accountRange(product)} · {product.accountSizes.length} tiers</td>
                        <td>{priceRange(product)}</td>
                        <td>{drawdownLabel(product)}</td>
                        <td>{product.profitSplitPct ?? 'не опубликован'}%</td>
                        <td>{isFundedNext ? '5% growth + EOD для on-demand; 1–<5% — 14 дней' : '14 дней + 15% consistency + 3% cushion + 7 profitable days'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">Обе продуктовые записи захвачены {latestCapture}; promotions и optional add-ons в ценах не смешиваются.</p>
          </div>
        </section>

        <section className="ru-section" id="fundednext-instant">
          <div className="ru-shell" data-russian-instant-partner="fundednext">
            <div className="ru-card-head"><h2>FundedNext Stellar Instant: 4 цены и 6% trailing loss</h2><span className="ru-score">Главный instant-партнёр</span></div>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>Цена и размер</h3>
                <p className="ru-muted">$2K стоит $59.99, $5K — $149.99, $10K — $299.99, $20K — $599.99. Fee не возвращается; swap-free option добавляет 10% и не включён в базовые суммы.</p>
              </article>
              <article className="ru-card">
                <h3>Просадка и сплит</h3>
                <p className="ru-muted">Maximum loss — 6% trailing. Стартовый Reward Share равен 70% в tiers 1–2 и повышается до 80% с tier 3 по scale-up guidance.</p>
              </article>
              <article className="ru-card">
                <h3>Когда появляется on-demand</h3>
                <p className="ru-muted">Eligibility требует 5% account growth и EOD check. При росте от 1% до менее 5% применяется 14-дневный цикл; «по запросу» не означает «без gate».</p>
              </article>
            </div>
            <p>
              News trading разрешён, но внутри окна 5 минут до и 5 минут после указанной high-impact новости засчитывается только 40% прибыли;
              overnight и weekend holding разрешены со swap, а copying допускается только между собственными Stellar Instant accounts.
              До оплаты нужно отдельно подтвердить KYC и страну; для резидентов России официальные FundedNext pages дают конфликтующие сигналы.
            </p>
            <p className="ru-source-line">
              <a href={partnerCards.find(card => card.slug === 'fundednext')?.product?.sourceUrl} target="_blank" rel="noopener noreferrer">Официальная цена</a>{' · '}
              <a href={FUNDEDNEXT_REWARD_URL} target="_blank" rel="noopener noreferrer">Reward eligibility</a>{' · '}
              <a href={FUNDEDNEXT_SCALE_URL} target="_blank" rel="noopener noreferrer">Scale-up plan</a>{' · '}
              <a href={FUNDEDNEXT_NEWS_URL} target="_blank" rel="noopener noreferrer">News Profit Rule</a>
            </p>
            <div className="ru-actions">
              <Link href="/ru/fundednext-stellar-instant" className="btn-outline">Все правила Stellar Instant</Link>
              <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор FundedNext</Link>
              <Link href="/go/fundednext?from=ru-instant-fundednext" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить Stellar Instant <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="fundingpips-zero">
          <div className="ru-shell" data-russian-instant-partner="fundingpips">
            <div className="ru-card-head"><h2>FundingPips Zero: 6 цен и 15% consistency</h2><span className="ru-score">Instant-партнёр</span></div>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>Цена и размер</h3>
                <p className="ru-muted">$5K стоит $60, затем $10K — $88, $25K — $188, $50K — $244, $100K — $444 и $200K — $888. Fee не является refundable.</p>
              </article>
              <article className="ru-card">
                <h3>Trailing loss и open risk</h3>
                <p className="ru-muted">5% max loss trails peak equity и locks at starting balance после первого достижения 5% profit. Combined floating Max Open Risk ограничен 1%.</p>
              </article>
              <article className="ru-card">
                <h3>Reward gate</h3>
                <p className="ru-muted">Нужны 15% consistency, 3% safety cushion, largest loss не больше largest win и 7 profitable days минимум по 0.25% в rolling 30 days.</p>
              </article>
            </div>
            <p>
              Первая заявка записана через 14 дней, а 95% profit split не убирает gate. News-window и weekend positions являются hard breach.
              Reset со скидкой 20% доступен только в течение 7 calendar days после breach; его стоимость и право нужно проверить в кабинете до решения.
            </p>
            <p className="ru-source-line">
              <a href={FUNDINGPIPS_ZERO_URL} target="_blank" rel="noopener noreferrer">Официальные правила Zero</a>{' · '}
              <a href={FUNDINGPIPS_COMPARE_URL} target="_blank" rel="noopener noreferrer">Сравнение моделей и цен</a>
            </p>
            <div className="ru-actions">
              <Link href="/ru/obzor-fundingpips" className="btn-outline">Полный обзор FundingPips</Link>
              <Link href="/go/fundingpips?from=ru-instant-fundingpips" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить FundingPips Zero <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="all-products">
          <div className="ru-shell" data-russian-instant-all-products={products.length}>
            <h2>Все {products.length} свежих phase-0 продуктов</h2>
            <p className="ru-muted">
              Остальные {nonPartnerProducts.length} продуктов остаются в сравнении без партнёрского CTA. Пустая цена или payout day означает,
              что стабильное число не прошло first-party capture, а не что продукт бесплатный или платит мгновенно.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Продукт</th><th>Цена</th><th>Сплит</th><th>Просадка</th><th>Consistency</th><th>Первая заявка</th><th>Источник</th></tr></thead>
                <tbody>
                  {products.map(product => {
                    const firm = firmBySlug.get(product.firmSlug)
                    if (!firm) return null
                    return (
                      <tr key={`${product.firmSlug}-${product.productSlug}`} data-russian-instant-product={`${product.firmSlug}:${product.productSlug}`}>
                        <td><Link href={russianReviewHref(product.firmSlug, firm)}>{firm.name}</Link></td>
                        <td>{product.productName}</td>
                        <td>{priceRange(product)}</td>
                        <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                        <td>{drawdownLabel(product)}</td>
                        <td>{product.consistencyRulePct == null ? 'не опубликовано' : `${product.consistencyRulePct}%`}</td>
                        <td>{payoutLabel(product)}</td>
                        <td><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.sourceCapturedAt}</a></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">Таблица сортирует 2 партнёрских продукта первыми, но не присваивает им дополнительные баллы.</p>
          </div>
        </section>

        <section className="ru-section" id="risk">
          <div className="ru-shell ru-content" data-russian-instant-risk="drawdown-before-price">
            <h2>Почему самая низкая цена может дать самый узкий failure point</h2>
            <p>
              Минимум $15 у Maven Instant выглядит дешевле $59.99 у FundedNext и $60 у FundingPips Zero,
              но Maven записан с 3% trailing max loss и 20% consistency. Дешёвая fee не расширяет просадку;
              сравнивать нужно допустимое движение equity, payout gate и account size одновременно.
            </p>
            <p>
              FXIFY публикует 2 instant-модели: Lite начинается с $19 при 4% trailing loss и 20% consistency,
              Standard — с $69 при 8% trailing loss. У LucidDirect и Alpha Direct стабильная public fee не подтверждена,
              поэтому таблица сохраняет «не опубликована» вместо подстановки цены из другого продукта или affiliate page.
            </p>
            <p>
              Futures-модели Tradeify Lightning Funded и LucidDirect используют EOD-trailing в денежных величинах по размеру счёта;
              процент в сводной записи не подставляется. Это другой failure geometry, поэтому нельзя ранжировать 9 строк только по одному maxLossPct.
            </p>
            <div className="ru-notice">
              <strong>Порядок сравнения:</strong> сначала drawdown type и lock point, затем consistency и payout goal,
              потом account size и fee. Если начать с цены, риск-план появляется слишком поздно.
            </div>
          </div>
        </section>

        <section className="ru-section" id="diaspora">
          <div className="ru-shell" data-russian-instant-diaspora="country-before-checkout">
            <h2>Instant funding для русскоязычных за рубежом</h2>
            <p className="ru-muted">
              Страница написана по-русски для людей в разных странах, а не только для резидентов России.
              К одному русскому языку могут относиться 4 разных compliance profiles.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент ЕС</h3><p className="ru-muted">Проверяет residence permit, billing address, EUR/USD conversion, KYC и доступный payout rail в своей стране.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Казахстан, Грузия, Израиль, ОАЭ</h3><p className="ru-muted">Сверяет citizenship и residence отдельно; доступ одной страны не переносится на соседнюю или прежний адрес.</p></article>
              <article className="ru-card"><ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент России</h3><p className="ru-muted">Не использует VPN или чужую карту. При конфликте official pages не платит до письменного ответа по продукту и payout.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Переезд или 2 гражданства</h3><p className="ru-muted">Обновляет document, actual address и tax residence до checkout, не смешивая данные старого и нового профиля.</p></article>
            </div>
            <p>
              Перед кнопкой регистрации пройдите <Link href="/ru/dlya-russkoyazychnykh-treyderov">глобальный country-check для русскоязычных</Link>{' '}
              и <Link href="/ru/prop-firmy-bez-kyc">KYC-чеклист по 5 официальным страницам</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="instant-definition">
          <div className="ru-shell ru-content" data-russian-instant-definition="phase-zero-not-label">
            <h2>Как отличить instant funding от ускоренного челленджа</h2>
            <p>
              Название Instant, Zero или Fast само по себе ничего не доказывает. В этой таблице продукт считается
              phase-0 только тогда, когда структурированное поле phases равно 0 и до funded stage нет отдельной цели evaluation.
            </p>
            <p>
              До покупки всё равно зафиксируйте 5 полей: первоначальную цену, тип и размер просадки, consistency rule,
              условие первой заявки и возврат fee. Если хотя бы одно поле относится к другому продукту, сравнение недействительно.
            </p>
          </div>
        </section>

        <section className="ru-section" id="bright-alternative">
          <div className="ru-shell" data-russian-instant-bright="challenge-alternative-only">
            <h2>Bright Funded: глобальный партнёр, но не instant funding</h2>
            <div className="ru-notice">
              <strong>Не включаем Bright Funded в phase-0 таблицу.</strong>{' '}
              Текущий снимок содержит {brightProducts.length} программы и {brightPriceCount} опубликованных EUR-цен:
              1-Step, 2-Step Bright и 2-Step Classic. Поле phases равно 1, 2 и 2 — ни один продукт не равен 0.
            </div>
            <p>
              Bright Funded подходит читателю, который готов пройти evaluation ради выбора между 6%, 8% и 10% maximum loss
              в зависимости от программы. Первая reward-заявка записана через 30 дней; KYC проходит через SumSub,
              затем Risk Team выполняет Security Check за 1–2 рабочих дня, до 4 в peak periods.
            </p>
            <p>
              Эта карточка сохраняет нашу коммерческую цель без ложной категории: Bright остаётся одним из главных глобальных партнёров,
              но кнопка ведёт к challenge-based product. Если отсутствие evaluation является обязательным фильтром, выбирайте между 9 строками выше.
            </p>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright Funded</Link>
              {brightFirm?.affiliateUrl ? (
                <Link href="/go/bright-funded?from=ru-instant-bright-alternative" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить challenge-программы <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-instant-local-boundary="different-market-models">
            <h2>Почему локальные русскоязычные компании не добавлены в phase-0 таблицу</h2>
            <p>
              PropLive и TeamTraders описывают Московскую биржу через Финам, а KasCapital публикует собственный payout process в RUB.
              Их договоры и отбор нельзя автоматически привести к глобальному полю phases. Отсутствие привычного online challenge
              не превращает локальную модель в FundedNext Instant или FundingPips Zero.
            </p>
            <p>
              Для native-market исследования используйте <Link href="/ru/rossiyskie-prop-kompanii">6 проверяемых локальных примеров</Link>.
              Они работают как информационный мост; коммерческий маршрут этой страницы остаётся глобальным и продуктовым.
            </p>
          </div>
        </section>

        <section className="ru-section" id="decision">
          <div className="ru-shell" data-russian-instant-decision="risk-before-fee">
            <h2>Решение до покупки: 8 шагов</h2>
            <ol className="ru-content">
              <li><strong>Зафиксируйте phase-0.</strong> Убедитесь, что выбран exact product, а не одноимённая evaluation-модель.</li>
              <li><strong>Найдите failure point.</strong> Запишите trailing, EOD-trailing или static и момент lock.</li>
              <li><strong>Рассчитайте position risk.</strong> Уложите worst-case trade в daily/open-risk и maximum-loss gate.</li>
              <li><strong>Проверьте consistency.</strong> 15% или 20% может потребовать распределять прибыль между днями.</li>
              <li><strong>Разберите payout.</strong> On-demand, 14 days и profitable days — разные условия, а не скорость бренда.</li>
              <li><strong>Сверьте fee.</strong> Base price, add-on, reset, refund и payment conversion считаются отдельно.</li>
              <li><strong>Подтвердите профиль.</strong> Citizenship, residence, KYC, billing и payout method должны совпадать.</li>
              <li><strong>Сохраните источник.</strong> Сделайте снимок rules и checkout до оплаты; при конфликте запросите письменный ответ.</li>
            </ol>
            <div className="ru-notice">
              <AlertTriangle size={18} aria-hidden="true" />{' '}
              Если вы не можете объяснить, при какой equity счёт нарушит max loss и при каких цифрах появится reward request,
              продукт ещё не готов к покупке независимо от скидки.
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-author-box">
              <Database size={22} color="var(--accent-light)" aria-hidden="true" />
              <div>
                <strong>Проверка данных: Edris Derakhshi</strong>
                <p>
                  Сопоставлены {products.length} phase-0 продуктов, {instantFirmCount} фирм, {instantPriceCount} опубликованных цен
                  и первичные страницы каждого продукта. Партнёрский статус отделён от eligibility: Bright Funded не получил instant-label без phase-0 записи.
                </p>
                <Link href="/authors/edris-derakhshi">Редакционный профиль и методология →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о проп-фирмах без челленджа</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
