import type { Metadata } from 'next'
import { consistencyRuleLabel } from '@/lib/challengeRuleLabels'
import Link from '@/components/SafeLink'
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
import instantEvidence from '@/content/data/russian-fundednext-instant-evidence.json'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { getLanguageAlternates, RUSSIAN_ROUTE_EDITORIAL_DATES } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/prop-firmy-bez-chelendzha'
const TITLE = 'Проп-фирмы без челленджа 2026: FundedNext Instant'
const DESCRIPTION = 'Сравнение программ без челленджа: FundedNext Stellar Instant, FundingPips Zero и другие модели с датами источников — цены, просадка, выплаты и KYC.'
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
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что значит «проп-фирма без челленджа»?',
    a: 'На этой странице «фаза 0» (phase-0) означает 0 оценочных этапов и отсутствие обычной цели по прибыли до профинансированного этапа. Это не подтверждает реальный капитал: каждая свежая запись остаётся симулированной или требует отдельной проверки модели, просадки, выплаты и договора.',
  },
  {
    q: 'Сколько стоит FundedNext Stellar Instant?',
    a: 'На снимке от 27 августа 2026 года опубликованы 4 цены: $59.99 за $2K, $149.99 за $5K, $299.99 за $10K и $599.99 за $20K. Взнос не возвращается; опция без свопов оплачивается отдельно и не включена в таблицу.',
  },
  {
    q: 'Как работает выплата FundedNext Instant?',
    a: 'Стартовая доля вознаграждения (Reward Share) — 70%. Право на заявку по запросу появляется при росте 5% и проверке по закрытию дня (EOD); рост от 1% до менее 5% использует 14-дневный цикл. Выплата по запросу не означает зачисление сразу после первой прибыльной сделки.',
  },
  {
    q: 'Какие главные правила FundingPips Zero?',
    a: 'Zero публикует плавающий лимит убытка 5%, правило распределения прибыли 15%, защитный буфер 3%, минимум 7 прибыльных дней по 0,25% в каждом скользящем 30-дневном периоде и 14-дневное окно выплаты. Нарушения правил выходных и новостного окна считаются жёстким нарушением.',
  },
  {
    q: 'Какая проп-фирма без челленджа самая дешёвая?',
    a: 'Минимальная опубликованная цена в текущей таблице — $15 у Maven Instant, но цена не сравнивает размер счёта, плавающий лимит убытка 3%, правило 20% и условия выплаты. Среди 2 партнёрских маршрутов FundedNext начинается с $59.99, а FundingPips Zero — с $60.',
  },
  {
    q: 'Есть ли финансирование без оценки у Bright Funded?',
    a: 'В таблицу без оценки попадают только программы с подтверждённой фазой 0 и свежей проверкой. Линейку Bright Funded нужно сверять перед покупкой.',
  },
  {
    q: 'Можно ли купить финансирование без оценки русскоязычному трейдеру за рубежом?',
    a: 'Возможность зависит не от языка, а от гражданства, резидентства, адреса, KYC, способа оплаты и способа получения денег. Русскоязычный резидент ЕС, Казахстана, ОАЭ или другой страны должен проверить свой фактический профиль до оплаты.',
  },
  {
    q: 'Финансирование без оценки означает отсутствие KYC?',
    a: 'Нет. Фаза 0 убирает оценочный этап, но не подтверждение личности, клиентское соглашение или регистрацию у платёжного провайдера. FundedNext и FundingPips требуют KYC до соответствующего этапа счёта; отдельный русский KYC-гайд содержит 5 первичных источников.',
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
  if (product.payoutFirstDays === 0) return 'по запросу при выполнении условий'
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
  const fundedNextCard = partnerCards.find(card => card.slug === 'fundednext')
  const fundingPipsCard = partnerCards.find(card => card.slug === 'fundingpips')
  const partnerPairCurrent = Boolean(fundedNextCard && fundingPipsCard)
  const fundedNextRulesFresh = [instantEvidence.capturedAt, instantEvidence.news.sourceCapturedAt]
    .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
  const instantCatalog = challenges.filter(product => product.phases === 0)
  const instantCatalogFresh = instantCatalog.length > 0 && instantCatalog.every(product => isChallengeFresh(product))
  const riskExampleSlugs = ['maven', 'fundednext', 'fundingpips', 'fxify', 'tradeify', 'lucid-trading', 'alpha-capital']
  const riskExamplesCurrent = riskExampleSlugs.every(firmSlug => products.some(product => product.firmSlug === firmSlug))
    && instantCatalog.filter(product => riskExampleSlugs.includes(product.firmSlug)).every(product => isChallengeFresh(product))
  const nonPartnerProducts = products.filter(product => !partnerSlugSet.has(product.firmSlug))
  const brightFirm = firmBySlug.get('bright-funded')
  const allBrightProducts = challenges.filter(product => product.firmSlug === 'bright-funded')
  const brightCatalogFresh = allBrightProducts.length > 0 && allBrightProducts.every(product => isChallengeFresh(product))
  const brightProducts = brightCatalogFresh ? allBrightProducts : []
  const brightPhaseZero = brightProducts.filter(product => product.phases === 0)
  const brightEvaluationOnly = brightCatalogFresh && brightProducts.every(product => product.phases != null && product.phases > 0)
  const brightPriceCount = pricedTierCount(brightProducts)
  const brightOldestCapture = allBrightProducts.map(product => product.sourceCapturedAt).sort()[0]
  const brightFaqAnswer = brightEvaluationOnly
    ? `Нет в продуктовом снимке от ${brightOldestCapture}: все проверенные программы Bright Funded требуют оценки. Мы показываем их отдельно от рейтинга программ без оценки.`
    : brightCatalogFresh && brightPhaseZero.length > 0
      ? `Да. В продуктовом снимке от ${brightOldestCapture} у Bright Funded есть программы без оценочного этапа; их свежие записи включены в таблицу фазы 0.`
      : `Актуальную линейку Bright Funded подтвердить нельзя: последний продуктовый снимок датирован ${brightOldestCapture ?? 'неизвестно'}. Проверьте программы и этапы на сайте фирмы перед покупкой.`
  const pageFaqs = faqs.filter(item => {
    if (item.q === 'Сколько стоит FundedNext Stellar Instant?' || item.q === 'Как работает выплата FundedNext Instant?') return Boolean(fundedNextCard) && fundedNextRulesFresh
    if (item.q === 'Какие главные правила FundingPips Zero?') return Boolean(fundingPipsCard)
    if (item.q === 'Какая проп-фирма без челленджа самая дешёвая?') return instantCatalogFresh
    return true
  })
    .map(item => item.q === 'Есть ли финансирование без оценки у Bright Funded?'
      ? { ...item, a: brightFaqAnswer }
      : item)
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'нет данных'

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Проп-фирмы без челленджа' },
  ])
  const faq = brightCatalogFresh && instantCatalogFresh && fundedNextRulesFresh
    ? faqPageSchema(pageFaqs)
    : null
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
    dateModified: RUSSIAN_ROUTE_EDITORIAL_DATES[PATH],
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
      {faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} /> : null}

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-instant-ranking="long-form-phase-zero"
          data-russian-instant-product-count={products.length}
          data-russian-instant-firm-count={instantFirmCount}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Без челленджа</div>
          <div className="ru-eyebrow"><Zap size={14} aria-hidden="true" /> 0 оценочных этапов — правила остаются</div>
          <h1>Проп-фирмы без челленджа: FundedNext Instant и FundingPips Zero</h1>
          <p className="ru-lead">
            Сравнили {products.length} свежих продуктов без оценки у {instantFirmCount} глобальных фирм.
            {partnerPairCurrent
              ? ' В текущих продуктовых записях оба выделенных маршрута — FundedNext Stellar Instant и FundingPips Zero — не требуют оценки.'
              : ' Продуктовые записи партнёров с истёкшей проверкой не включены в текущее сравнение.'}
            {brightEvaluationOnly
              ? ' Bright Funded не включён в этот рейтинг: все проверенные программы требуют оценки.'
              : brightPhaseZero.length > 0
                ? ' В таблицу также включены свежие программы Bright Funded без оценки.'
                : ' Линейка Bright Funded требует повторной проверки; её прежние оценочные программы не считаются текущими.'}
          </p>
          <div className="ru-stats" aria-label="Текущий охват финансирования без оценки">
            <div className="ru-stat"><strong>{products.length}</strong><span>свежих продуктов без оценки</span></div>
            <div className="ru-stat"><strong>{instantFirmCount}</strong><span>фирм с подтверждённой фазой 0</span></div>
            <div className="ru-stat"><strong>{partnerCards.length}</strong><span>партнёрских маршрутов без оценки</span></div>
            <div className="ru-stat"><strong>{instantPriceCount}</strong><span>опубликованных цен фазы 0</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#partner-instant" className="btn-primary btn-glow">Проверить партнёрские программы <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#all-products" className="btn-outline">Актуальные программы</Link>
            <Link href="#bright-alternative" className="btn-outline">Когда выбрать Bright Funded</Link>
          </div>
          <p className="ru-source-line">Последний продуктовый срез: {latestCapture}. Цену и правила нужно повторно проверить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="instant-not-access">
            <strong>Фаза 0 не является разрешением для страны.</strong>{' '}
            Русскоязычные трейдеры живут в разных юрисдикциях. До оплаты проверяйте гражданство,
            резидентство, фактический адрес, KYC, санкционные ограничения, способ оплаты и способ получения выплаты.
            VPN, оплата криптовалютой или русский документ не отменяют проверку профиля.
          </div>
        </div>
      </section>

      <article data-russian-instant-article="global-partner-decision-guide">
        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="instant-ranking">
              <strong>Партнёрское раскрытие и граница.</strong>{' '}
              FundedNext и FundingPips выделены как партнёры; переход может принести нам комиссию.
              В текущей таблице у них {partnerCards.length} проверенных продуктов без оценки. Истёкшая запись не считается текущей.
              Bright Funded показан отдельно; партнёрская ссылка сама по себе не доказывает фазу 0.
            </div>
            <nav className="ru-review-toc" aria-label="Содержание руководства о финансировании без оценки">
              <strong>Содержание</strong>
              <ol>
                <li><a href="#phase-zero">Что означает фаза 0</a></li>
                <li><a href="#partner-instant">Партнёрские программы без оценки</a></li>
                <li><a href="#fundednext-instant">FundedNext Stellar Instant</a></li>
                <li><a href="#fundingpips-zero">FundingPips Zero</a></li>
                <li><a href="#all-products">Все актуальные продукты</a></li>
                <li><a href="#risk">Просадка и условия выплат</a></li>
                <li><a href="#diaspora">Русскоязычные за рубежом</a></li>
                <li><a href="#instant-definition">Программа без оценки или ускоренный челлендж</a></li>
                <li><a href="#bright-alternative">Bright Funded как альтернатива</a></li>
                <li><a href="#decision">Решение до покупки</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="phase-zero">
          <div className="ru-shell" data-russian-instant-definition="zero-evaluation-not-zero-rules">
            <h2>Фаза 0 убирает оценку, но не 5 следующих проверок</h2>
            <p className="ru-muted">
              Структурное поле phases равно 0, когда перед профинансированным или мастер-этапом нет отдельной цели по прибыли.
              После покупки остаются риск, условия выплаты, KYC, договор и правила страны; слово «мгновенный» не обнуляет ни одно из этих условий.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Просадка</h3><p className="ru-muted">Плавающий лимит убытка или EOD-трейлинг может двигаться вместе с equity и закрыть счёт до первой заявки.</p></article>
              <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Распределение прибыли</h3><p className="ru-muted">Правило распределения прибыли проверяется для выбранного продукта: оно может ограничивать долю одного прибыльного дня.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Условие выплаты</h3><p className="ru-muted">Заявка по запросу может требовать роста счёта, проверки закрытия дня, защитного буфера или цели по прибыли.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. KYC и договор</h3><p className="ru-muted">Отсутствие оценки не означает отсутствия подтверждения личности или клиентского соглашения.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>5. Страна</h3><p className="ru-muted">Гражданство, резидентство, оплата и доступность выплаты проверяются по фактическому профилю.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="partner-instant">
          <div className="ru-shell" data-russian-instant-featured-partners="fundednext-fundingpips">
            <h2>FundedNext Instant или FundingPips Zero: прямое сравнение</h2>
            <p className="ru-muted">Таблица показывает только программы фазы 0 с действующей проверкой продукта. Сравните размер счёта, базовый взнос и тип просадки; правила заявки на выплату сверяйте отдельно.</p>
            {!partnerPairCurrent || !fundedNextRulesFresh ? (
              <div className="ru-notice" data-russian-instant-partner-source-status="recapture-required">
                {!partnerPairCurrent ? 'Не обе партнёрские программы имеют свежую продуктовую запись. ' : ''}
                {!fundedNextRulesFresh ? `Отдельная проверка правил Stellar Instant от ${instantEvidence.capturedAt} вышла за 30-дневное окно. ` : ''}
                Не используйте прежние суммы и условия заявки как текущие без повторной проверки.
              </div>
            ) : null}
            {partnerCards.length > 0 ? <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Продукт</th><th>Размеры</th><th>Цена</th><th>Макс. убыток</th><th>Стартовый сплит</th><th>Условие выплаты</th></tr></thead>
                <tbody>
                  {partnerCards.map(card => {
                    const product = card.product!
                    const isFundedNext = card.slug === 'fundednext'
                    return (
                      <tr key={card.slug} data-russian-instant-evidence={card.slug}>
                        <td><strong>{card.name}</strong><br />{product.productName}</td>
                        <td>{accountRange(product)} · {product.accountSizes.length} уровней</td>
                        <td>{priceRange(product)}</td>
                        <td>{drawdownLabel(product)}</td>
                        <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                        <td>{isFundedNext
                          ? fundedNextRulesFresh ? 'рост 5% + EOD для заявки по запросу; 1–<5% — 14 дней' : 'требует повторной проверки'
                          : '14 дней + правило 15% + буфер 3% + 7 прибыльных дней'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div> : <p className="ru-muted">Сейчас нет свежих партнёрских записей для сравнения. Проверьте официальные страницы программ и вернитесь к таблице после обновления данных.</p>}
            <p className="ru-source-line">Текущие продуктовые записи: {partnerCards.length ? partnerCards.map(card => `${card.name} — ${card.product!.sourceCapturedAt}`).join('; ') : 'нет'}. Акции и дополнительные опции не смешиваются с базовой ценой.</p>
          </div>
        </section>

        <section className="ru-section" id="fundednext-instant">
          <div className="ru-shell" data-russian-instant-partner="fundednext">
            <div className="ru-card-head"><h2>FundedNext Stellar Instant: цена и правила</h2><span className="ru-score">Партнёрская программа</span></div>
            {fundedNextCard && fundedNextRulesFresh ? <>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>Цена и размер</h3>
                <p className="ru-muted">Проверенные базовые цены: {fundedNextCard.product!.accountSizes.map(tier => `${tier.sizeUsd == null ? 'размер не указан' : formatPrice(tier.sizeUsd, 'USD')} — ${tier.priceUsd == null ? 'не опубликована' : formatPrice(tier.priceUsd, 'USD')}`).join('; ')}. Взнос не возвращается; опция без свопов добавляет 10% и не включена в базовые суммы.</p>
              </article>
              <article className="ru-card">
                <h3>Просадка и сплит</h3>
                <p className="ru-muted">Максимальный убыток — 6% с плавающей границей. Стартовая доля вознаграждения равна 70% на уровнях 1–2 и повышается до 80% с уровня 3 по плану масштабирования.</p>
              </article>
              <article className="ru-card">
                <h3>Когда доступна заявка по запросу</h3>
                <p className="ru-muted">Право на заявку требует роста счёта на 5% и проверки по закрытию дня. При росте от 1% до менее 5% применяется 14-дневный цикл; «по запросу» не означает «без условий».</p>
              </article>
            </div>
            <p>
              Торговля на новостях разрешена, но внутри окна 5 минут до и 5 минут после указанной важной новости засчитывается только 40% прибыли;
              перенос позиций через ночь и выходные разрешён со свопом, а копирование допускается только между собственными счетами Stellar Instant.
              До оплаты нужно отдельно подтвердить KYC и страну; для резидентов России официальные страницы FundedNext дают конфликтующие сигналы.
            </p>
            <p className="ru-source-line">
              <a href={fundedNextCard.product!.sourceUrl} target="_blank" rel="noopener noreferrer">Официальная цена</a>{' · '}
              <a href={FUNDEDNEXT_REWARD_URL} target="_blank" rel="noopener noreferrer">Условия вознаграждения</a>{' · '}
              <a href={FUNDEDNEXT_SCALE_URL} target="_blank" rel="noopener noreferrer">План масштабирования</a>{' · '}
              <a href={FUNDEDNEXT_NEWS_URL} target="_blank" rel="noopener noreferrer">Правило новостной прибыли</a>
            </p>
            </> : <div className="ru-notice" data-russian-instant-fundednext-status="recapture-required">
              {fundedNextCard
                ? <>Ценовая запись Stellar Instant проверена {fundedNextCard.product!.sourceCapturedAt}; базовый диапазон — {priceRange(fundedNextCard.product!)}. Но отдельный снимок правил от {instantEvidence.capturedAt} устарел. Сверьте <a href={FUNDEDNEXT_REWARD_URL} target="_blank" rel="noopener noreferrer">условия выплаты</a>, <a href={FUNDEDNEXT_NEWS_URL} target="_blank" rel="noopener noreferrer">правило новостей</a> и доплаты до оплаты.</>
                : <>Продуктовая запись Stellar Instant вышла за 30-дневное окно. Старые цены и условия нельзя считать текущими; откройте <Link href="/ru/fundednext-stellar-instant">датированный разбор</Link> и <a href={FUNDEDNEXT_NEWS_URL} target="_blank" rel="noopener noreferrer">официальное правило новостей</a>.</>}
            </div>}
            <div className="ru-actions">
              <Link href="/ru/fundednext-stellar-instant" className="btn-outline">Датированный разбор Stellar Instant</Link>
              <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор FundedNext</Link>
              <Link href="/go/fundednext?from=ru-instant-fundednext" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить программы FundedNext <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="fundingpips-zero">
          <div className="ru-shell" data-russian-instant-partner="fundingpips">
            <div className="ru-card-head"><h2>FundingPips Zero: цена и правила</h2><span className="ru-score">Партнёрская программа</span></div>
            {fundingPipsCard ? <>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>Цена и размер</h3>
                <p className="ru-muted">Проверенные базовые цены: {fundingPipsCard.product!.accountSizes.map(tier => `${tier.sizeUsd == null ? 'размер не указан' : formatPrice(tier.sizeUsd, 'USD')} — ${tier.priceUsd == null ? 'не опубликована' : formatPrice(tier.priceUsd, 'USD')}`).join('; ')}. Взнос не возвращается.</p>
              </article>
              <article className="ru-card">
                <h3>Плавающий убыток и открытый риск</h3>
                <p className="ru-muted">Лимит убытка 5% следует за пиковым значением equity и фиксируется на стартовом балансе после первого достижения прибыли 5%. Совокупный плавающий открытый риск ограничен 1%.</p>
              </article>
              <article className="ru-card">
                <h3>Условие выплаты</h3>
                <p className="ru-muted">Нужны правило 15%, защитный буфер 3%, наибольший убыток не больше наибольшей прибыли и минимум 7 прибыльных дней по 0,25% в скользящем 30-дневном периоде.</p>
              </article>
            </div>
            <p>
              Первая заявка возможна через 14 дней, а доля 95% не отменяет эти условия. Нарушение новостного окна и удержание позиций на выходных считаются жёстким нарушением.
              Сброс со скидкой 20% доступен только в течение 7 календарных дней после нарушения; его стоимость и право нужно проверить в кабинете до решения.
            </p>
            <p className="ru-source-line">
              <a href={FUNDINGPIPS_ZERO_URL} target="_blank" rel="noopener noreferrer">Официальные правила Zero</a>{' · '}
              <a href={FUNDINGPIPS_COMPARE_URL} target="_blank" rel="noopener noreferrer">Сравнение моделей и цен</a>
            </p>
            </> : <div className="ru-notice" data-russian-instant-fundingpips-status="recapture-required">
              Продуктовая запись FundingPips Zero вышла за 30-дневное окно. Прежние суммы, просадку и условия выплаты нужно повторно проверить по <a href={FUNDINGPIPS_ZERO_URL} target="_blank" rel="noopener noreferrer">официальным правилам</a> до оплаты.
            </div>}
            <div className="ru-actions">
              <Link href="/ru/obzor-fundingpips" className="btn-outline">Полный обзор FundingPips</Link>
              <Link href="/go/fundingpips?from=ru-instant-fundingpips" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить программы FundingPips <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="all-products">
          <div className="ru-shell" data-russian-instant-all-products={products.length}>
            <h2>Все {products.length} свежих продуктов без оценки</h2>
            <p className="ru-muted">
              Непартнёрских строк — {nonPartnerProducts.length}. Пустая цена или день выплаты означает,
              что число не подтверждено по официальному источнику, а не что продукт бесплатный или платит мгновенно.
            </p>
            {products.length > 0 ? <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Продукт</th><th>Цена</th><th>Сплит</th><th>Просадка</th><th>Правило прибыли</th><th>Первая заявка</th><th>Источник</th></tr></thead>
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
                        <td>{consistencyRuleLabel(product, 'ru')}</td>
                        <td>{payoutLabel(product)}</td>
                        <td><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.sourceCapturedAt}</a></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div> : <div className="ru-notice" data-russian-instant-empty="recapture-required">Все продуктовые записи фазы 0 вышли за 30-дневное окно. Таблица вернётся после повторной проверки цен и правил на сайтах фирм.</div>}
            <p className="ru-source-line">Актуальные партнёрские строки ({partnerCards.length}) идут первыми, но не получают дополнительных баллов.</p>
          </div>
        </section>

        <section className="ru-section" id="risk">
          <div className="ru-shell ru-content" data-russian-instant-risk="drawdown-before-price">
            <h2>Почему самая низкая цена может дать самый узкий запас до нарушения</h2>
            {riskExamplesCurrent ? <>
            <p>
              Минимум $15 у Maven Instant выглядит дешевле $59.99 у FundedNext и $60 у FundingPips Zero,
              но Maven записан с плавающим лимитом убытка 3% и правилом 20%. Дешёвый взнос не расширяет просадку;
              сравнивать нужно допустимое движение equity, условия выплаты и размер счёта одновременно.
            </p>
            <p>
              FXIFY публикует 2 модели без оценки: Lite начинается с $19 при плавающем лимите убытка 4% и правиле 20%,
              Standard — с $69 при плавающем лимите убытка 8%. У LucidDirect и Alpha Direct стабильный публичный взнос не подтверждён,
              поэтому таблица сохраняет «не опубликована» вместо подстановки цены из другого продукта или партнёрской страницы.
            </p>
            <p>
              Futures-модели Tradeify Lightning Funded и LucidDirect используют EOD-trailing в денежных величинах по размеру счёта;
              процент в сводной записи не подставляется. Это другая механика риска, поэтому нельзя ранжировать все строки только по одному полю максимального убытка.
            </p>
            </> : <div className="ru-notice" data-russian-instant-risk-status="recapture-required">
              Часть ценовых или риск-правил из прежнего сравнения вышла за 30-дневное окно. Не ранжируйте программы по архивной минимальной цене; сверяйте свежие строки выше и условия самой фирмы.
            </div>}
            <div className="ru-notice">
              <strong>Порядок сравнения:</strong> сначала тип просадки и момент фиксации границы, затем правило распределения прибыли и цель выплаты,
              потом размер счёта и взнос. Если начать с цены, риск-план появляется слишком поздно.
            </div>
          </div>
        </section>

        <section className="ru-section" id="diaspora">
          <div className="ru-shell" data-russian-instant-diaspora="country-before-checkout">
            <h2>Финансирование без оценки для русскоязычных за рубежом</h2>
            <p className="ru-muted">
              Страница написана по-русски для людей в разных странах, а не только для резидентов России.
              За одним русским языком могут стоять 4 разных профиля проверки.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент ЕС</h3><p className="ru-muted">Проверяет вид на жительство, платёжный адрес, конвертацию EUR/USD, KYC и доступный способ выплаты в своей стране.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Казахстан, Грузия, Израиль, ОАЭ</h3><p className="ru-muted">Сверяет гражданство и резидентство отдельно; доступ одной страны не переносится на соседнюю или прежний адрес.</p></article>
              <article className="ru-card"><ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент России</h3><p className="ru-muted">Не использует VPN или чужую карту. При конфликте официальных страниц не платит до письменного ответа по продукту и выплате.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Переезд или 2 гражданства</h3><p className="ru-muted">Обновляет документ, фактический адрес и налоговое резидентство до оплаты, не смешивая данные старого и нового профиля.</p></article>
            </div>
            <p>
              Перед кнопкой регистрации пройдите <Link href="/ru/dlya-russkoyazychnykh-treyderov">глобальную проверку страны для русскоязычных</Link>{' '}
              и <Link href="/ru/prop-firmy-bez-kyc">KYC-чеклист по 5 официальным страницам</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="instant-definition">
          <div className="ru-shell ru-content" data-russian-instant-definition="phase-zero-not-label">
            <h2>Как отличить финансирование без оценки от ускоренного челленджа</h2>
            <p>
              Название Instant, Zero или Fast само по себе ничего не доказывает. В этой таблице продукт считается
              продуктом фазы 0 только тогда, когда структурированное поле phases равно 0 и до профинансированного этапа нет отдельной цели оценки.
            </p>
            <p>
              До покупки всё равно зафиксируйте 5 полей: первоначальную цену, тип и размер просадки, правило распределения прибыли,
              условие первой заявки и возврат взноса. Если хотя бы одно поле относится к другому продукту, сравнение недействительно.
            </p>
          </div>
        </section>

        <section className="ru-section" id="bright-alternative">
          <div className="ru-shell" data-russian-instant-bright={brightEvaluationOnly ? 'challenge-alternative-only' : brightPhaseZero.length > 0 ? 'phase-zero-listed' : 'recapture-required'}>
            <h2>BrightFunded: проверка оценочного этапа</h2>
            <div className="ru-notice">
              {brightEvaluationOnly ? (
                <><strong>Не включаем Bright Funded в таблицу фазы 0.</strong>{' '}
                  Снимок от {brightOldestCapture}: оценочных программ — {brightProducts.length}; опубликованных EUR-цен — {brightPriceCount}. Ни у одной нет подтверждённой фазы 0.</>
              ) : brightPhaseZero.length > 0 ? (
                <><strong>Программы без оценки включены в таблицу выше.</strong>{' '}
                  По снимку от {brightOldestCapture} число таких программ — {brightPhaseZero.length}; остальные модели проверяйте отдельно.</>
              ) : (
                <><strong>Нужна повторная проверка Bright Funded.</strong>{' '}
                  Последний продуктовый снимок от {brightOldestCapture ?? 'неизвестной даты'} не подтверждает текущую линейку, число программ или цены. Сверьте этапы на сайте фирмы до оплаты.</>
              )}
            </div>
            {brightEvaluationOnly ? (
              <p>
                Проверенные программы требуют оценки. Сравните допустимую просадку, дату первой заявки на вознаграждение и KYC
                в <Link href="/ru/obzor-bright-funded">обзоре BrightFunded</Link>, затем подтвердите условия выбранного заказа.
              </p>
            ) : null}
            <p>
              Переход к Bright Funded может принести нам комиссию. Партнёрский статус не подтверждает отсутствие оценки,
              доступность продукта или право на покупку в вашей стране. Если отсутствие оценки обязательно, сверяйте только свежие строки таблицы выше.
            </p>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор BrightFunded</Link>
              {brightFirm?.affiliateUrl ? (
                <Link href="/go/bright-funded?from=ru-instant-bright-alternative" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить программы BrightFunded <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-instant-local-boundary="different-market-models">
            <h2>Почему локальные русскоязычные компании не добавлены в таблицу фазы 0</h2>
            <p>
              PropLive и TeamTraders описывают Московскую биржу через Финам, а KasCapital публикует собственный процесс выплат в RUB.
              Их договоры и отбор нельзя автоматически привести к глобальному полю phases. Отсутствие привычного онлайн-челленджа
              не превращает локальную модель в FundedNext Instant или FundingPips Zero.
            </p>
            <p>
              Для исследования местного рынка используйте <Link href="/ru/rossiyskie-prop-kompanii">6 проверяемых локальных примеров</Link>.
              Они работают как информационный мост; коммерческий маршрут этой страницы остаётся глобальным и продуктовым.
            </p>
          </div>
        </section>

        <section className="ru-section" id="decision">
          <div className="ru-shell" data-russian-instant-decision="risk-before-fee">
            <h2>Решение до покупки: 8 шагов</h2>
            <ol className="ru-content">
              <li><strong>Зафиксируйте фазу 0.</strong> Убедитесь, что выбран точный продукт, а не одноимённая модель с оценкой.</li>
              <li><strong>Найдите точку нарушения.</strong> Запишите trailing, EOD-trailing или static и момент фиксации границы.</li>
              <li><strong>Рассчитайте риск позиции.</strong> Уложите худший сценарий сделки в дневной лимит, открытый риск и общий лимит убытка.</li>
              <li><strong>Проверьте правило прибыли.</strong> Ограничение на долю одного прибыльного дня может потребовать распределять прибыль между днями.</li>
              <li><strong>Разберите выплату.</strong> Заявка по запросу, 14 дней и прибыльные дни — разные условия, а не скорость бренда.</li>
              <li><strong>Сверьте взнос.</strong> Базовая цена, опция, сброс, возврат и конвертация валюты считаются отдельно.</li>
              <li><strong>Подтвердите профиль.</strong> Гражданство, резидентство, KYC, платёжный адрес и способ выплаты должны совпадать.</li>
              <li><strong>Сохраните источник.</strong> Сделайте снимок правил и страницы оплаты до покупки; при конфликте запросите письменный ответ.</li>
            </ol>
            <div className="ru-notice">
              <AlertTriangle size={18} aria-hidden="true" />{' '}
              Если вы не можете объяснить, при каком значении equity счёт нарушит максимальный убыток и при каких цифрах появится заявка на выплату,
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
                  Сопоставлены {products.length} продуктов фазы 0, {instantFirmCount} фирм, {instantPriceCount} опубликованных цен
                  и первичные страницы каждого продукта. Партнёрский статус отделён от доступности: Bright Funded {brightPhaseZero.length > 0 ? 'получил строку фазы 0 только по свежей продуктовой записи.' : 'не получает метку «без оценки» без свежей записи фазы 0.'}
                </p>
                <Link href="/authors/edris-derakhshi">Редакционный профиль и методология →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о проп-фирмах без челленджа</h2>
            <RussianFaq items={pageFaqs} />
          </div>
        </section>
      </article>
    </>
  )
}
