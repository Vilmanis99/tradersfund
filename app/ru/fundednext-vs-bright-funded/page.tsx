import type { Metadata } from 'next'
import { fundedNextOneStepPayoutLabel, isFundedNextPayoutSourceFresh } from '@/lib/fundedNextPayout'
import RussianFundedNextPayoutNotice from '@/components/RussianFundedNextPayoutNotice'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import brightEvidence from '@/content/data/russian-bright-funded-evidence.json'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
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
  minimumCostToFundedUsd,
  type Challenge,
  type ChallengeAccountSize,
} from '@/lib/firms'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/fundednext-vs-bright-funded'
const TITLE = 'FundedNext или Bright Funded: сравнение 2026'
const DESCRIPTION = 'FundedNext или Bright Funded: сравнение программ, взносов в USD и EUR, просадки, условий запроса выплат, платформ и проверки личности.'
const SOCIAL_DESCRIPTION = 'Сравнение FundedNext и Bright Funded по 7 продуктам и 40 ценам: USD или EUR, этапы, просадка, true cost, выплаты, KYC и выбор для трейдера.'

export const revalidate = 3600

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
  openGraph: { title: TITLE, description: SOCIAL_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: SOCIAL_DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что лучше: FundedNext или Bright Funded?',
    a: 'Единого победителя нет. Сначала выберите программу с оценкой или без неё, допустимую просадку и валюту взноса. Затем сравните условия запроса вознаграждения и доступность платформы для своего профиля. Ни партнёрская ссылка, ни число программ сами по себе не делают фирму подходящей.',
  },
  {
    q: 'У кого дешевле челлендж?',
    a: 'Взносы FundedNext указаны в USD, Bright Funded — в EUR. Численно меньшая цена в другой валюте не доказывает экономию. Выберите одинаковый размер счёта, проверьте этапы и сравните итоговые суммы со всеми дополнениями и конвертацией при оплате.',
  },
  {
    q: 'Чем отличаются 1-Step программы?',
    a: 'В датированных правилах Stellar 1-Step использует статическую общую границу убытка, а Bright Funded 1-Step — подвижную границу вслед за максимальной стоимостью счёта. Поэтому совпадающий процент просадки не означает одинаковый запас риска после прибыльной сделки. Цели, торговые дни и сроки запроса сравниваются отдельно в строках программ.',
  },
  {
    q: 'Есть ли у Bright Funded финансирование без оценки?',
    a: 'В разобранной линейке Bright Funded программы проходят оценку. Stellar Instant у FundedNext рассматривается отдельно как программа без оценочного этапа. Это не освобождает трейдера от лимита убытка, проверки личности и условий запроса вознаграждения; текущий состав предложения нужно сверять в таблице и у фирмы.',
  },
  {
    q: 'Где быстрее первая выплата?',
    a: 'Сравнивайте начало отсчёта и единицы времени: Stellar 1-Step использует рабочие дни, а Instant — отдельные условия запроса. У Bright Funded есть противоречие между описанием стандартного следующего цикла и платного дополнения. Срок подачи заявки не включает все проверки и время зачисления получателю.',
  },
  {
    q: 'Какие способы выплаты доступны?',
    a: 'У FundedNext нужно различать токен, сеть и платёжного посредника, а не считать каждый значок отдельным способом. Bright Funded публикует USDC в сети ERC-20 и банковский перевод в EUR. Для обеих фирм важны страна, проверка личности, поддержка банком или кошельком и итоговые комиссии.',
  },
  {
    q: 'Какая фирма удобнее русскоязычному трейдеру за рубежом?',
    a: 'Язык не определяет доступ. Резидент ЕС с EUR-счётом может предпочесть Bright Funded, а пользователь разрешённой юрисдикции с подходящим кошельком — один из криптомаршрутов FundedNext. Проверяются фактические гражданство, резидентство, адрес, платёж и KYC.',
  },
  {
    q: 'Можно ли зарегистрироваться резиденту России?',
    a: 'Нельзя делать общий вывод по этой странице. Проверка разных официальных разделов FundedNext выявила противоречивые сведения о России; доступ резиденту РФ здесь не подтверждён. До оплаты нужен ответ фирмы по конкретной программе и профилю. Для Bright Funded также требуется отдельная проверка страны и документов. Не используйте чужой адрес или неверные сведения.',
  },
]

const frequencyLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые 14 дней',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу',
}

function money(value: number | null | undefined, currency: 'USD' | 'EUR') {
  if (value == null || !Number.isFinite(value)) return 'не подтверждено'
  return `${currency === 'USD' ? '$' : '€'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function pricedTiers(product: Challenge) {
  const currency = challengeCurrency(product)
  return product.accountSizes.filter(tier => {
    const price = currency === 'USD' ? tier.priceUsd : tier.priceEur
    return price != null && Number.isFinite(price) && price > 0
  })
}

function priceRange(product: Challenge | undefined) {
  if (!product) return 'требуется повторная проверка'
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

function targetLabel(product: Challenge | undefined) {
  if (!product) return 'требуется повторная проверка'
  if (product.phases === 0) return 'без оценочного этапа'
  return Array.from({ length: product.phases }, (_, index) => percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? 'не подтверждено' : `${value}%`
}

function freshCapture(sourceCapturedAt: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceCapturedAt)) return false
  const date = new Date(`${sourceCapturedAt}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === sourceCapturedAt && isChallengeFresh({ sourceCapturedAt })
}

function drawdownLabel(product: Challenge) {
  const type = ({ static: 'статическая', trailing: 'подвижная', 'eod-trailing': 'подвижная по итогам дня', 'balance-based': 'по балансу' } as Record<string, string>)[product.drawdownType ?? ''] ?? 'тип не подтверждён'
  return `дневной лимит: ${percent(product.dailyLossPct)} · общий: ${percent(product.maxLossPct)} · ${type}`
}

function payoutLabel(product: Challenge) {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  if (product.payoutFirstDays === 0) return 'по запросу после выполнения условий'
  if (product.payoutFirstDays == null || !Number.isInteger(product.payoutFirstDays) || product.payoutFirstDays < 0) return 'срок не подтверждён'
  if (product.firmSlug === 'bright-funded') return `${product.payoutFirstDays} дн.; базовый следующий цикл требует уточнения из-за противоречия в описании дополнений`
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
  if (product.profitSplitPct == null || !Number.isFinite(product.profitSplitPct) || product.profitSplitPct <= 0 || product.profitSplitPct > 100) return null
  const tier = cheapestTier(product)
  if (!tier) return null
  return challengeTierEconomics(product, tier)
}

export default function FundedNextVsBrightFundedRussianPage() {
  const firms = getAllFirms()
  const allChallenges = getAllChallenges()
  const fundedNext = firms.find(firm => outboundSlug(firm.name) === 'fundednext')
  const brightFunded = firms.find(firm => outboundSlug(firm.name) === 'bright-funded')
  const relevantProducts = allChallenges.filter(product => ['fundednext', 'bright-funded'].includes(product.firmSlug))
  const products = allChallenges.filter(product =>
    ['fundednext', 'bright-funded'].includes(product.firmSlug) && freshCapture(product.sourceCapturedAt),
  )
  const fundedNextProducts = products.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = products.filter(product => product.firmSlug === 'bright-funded')
  const priceCount = products.reduce((sum, product) => sum + pricedTiers(product).length, 0)
  const sourceCount = new Set(products.map(product => product.sourceUrl)).size
  const latestCapture = relevantProducts.map(product => product.sourceCapturedAt).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(0) ?? marketEvidence.capturedAt
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
  const ruleSources = [brightEvidence.sources.rules, brightEvidence.sources.reward, brightEvidence.sources.platforms]
  const evidenceDates = [
    { label: 'цены: самая ранняя проверка', capturedAt: latestCapture },
    { label: 'страна и способы выплаты', capturedAt: marketEvidence.capturedAt },
    ...ruleSources.map(source => ({ label: source.labelRu, capturedAt: source.sourceCapturedAt })),
    ...[...payoutEvidence.values(), ...kycEvidence.values()].filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)).map(source => ({ label: `${source.firmName}: процесс выплаты или проверка личности`, capturedAt: source.sourceCapturedAt })),
  ]
  const completeEvidence = relevantProducts.length > 0 && products.length === relevantProducts.length
    && [oneStepFn, oneStepBright, twoStepFn, liteFn, instantFn, twoStepBright, classicBright].every(Boolean)
    && ['fundednext', 'bright-funded'].every(slug => payoutEvidence.has(slug) && kycEvidence.has(slug))
    && products.every(product => pricedTiers(product).length > 0)
    && evidenceDates.every(source => freshCapture(source.capturedAt)) && isFundedNextPayoutSourceFresh()
  const sourceUrls = [...new Set([...relevantProducts.map(product => product.sourceUrl), ...ruleSources.map(source => source.sourceUrl), ...[...payoutEvidence.values(), ...kycEvidence.values()].filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)).flatMap(source => source.sourceUrls), ...(accessEvidence?.sourceUrls ?? [])])]
  const sourceLabels = new Map<string, string>([
    ...relevantProducts.map(product => [product.sourceUrl, `${product.productName}: условия программы`] as const),
    ...ruleSources.map(source => [source.sourceUrl, `Bright Funded: ${source.labelRu}`] as const),
    ...[...payoutEvidence.values(), ...kycEvidence.values()].filter(source => ['fundednext', 'bright-funded'].includes(source.firmSlug)).flatMap(source => source.sourceUrls.map(url => [url, `${source.firmName}: ${'methods' in source ? 'способы выплаты' : 'проверка личности'}`] as const)),
  ])

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
    dateModified: russianRouteDateModified(PATH, latestCapture),
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {completeEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-primary-comparison="fundednext-bright-funded"
          data-russian-primary-comparison-products={products.length}
          data-russian-primary-comparison-prices={priceCount}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FundedNext или Bright Funded</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext', 'bright-funded']} />
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Два главных партнёра · победитель зависит от продукта</div>
          <h1>FundedNext или Bright Funded: что выбрать в 2026 году</h1>
          <p className="ru-lead">
            Сравниваем конкретные программы, а не рекламные максимумы двух фирм. В таблице — {products.length} программ
            и {priceCount} цен с актуальной проверкой источников. Разбираем валюту взноса, механику просадки,
            условия запроса вознаграждения и проверку личности перед участием.
          </p>
          <div className="ru-stats" aria-label="Охват сравнения FundedNext и Bright Funded">
            <div className="ru-stat"><strong>{fundedNextProducts.length}</strong><span>продукта FundedNext</span></div>
            <div className="ru-stat"><strong>{brightProducts.length}</strong><span>продукта Bright Funded</span></div>
            <div className="ru-stat"><strong>{priceCount}</strong><span>цен в исходных валютах</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>самая ранняя проверка программ</span></div>
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

      <article className="ru-review-article" data-russian-primary-comparison-article="product-before-brand">
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
              покупки по партнёрской ссылке. Комиссия не меняет правила сравнения и не добавляет фирме баллы.
              Для обеих фирм доступны подробный обзор и ссылка на проверку условий.
            </div>

            <nav className="toc ru-review-toc" aria-label="Содержание сравнения FundedNext и Bright Funded"><div className="toc-title">Содержание</div><ol>
              <li><a href="#comparison-products">Программы и цены</a></li><li><a href="#comparison-one-step">Одноэтапные модели</a></li>
              <li><a href="#comparison-two-step">Двухэтапные модели</a></li><li><a href="#comparison-instant">Без оценочного этапа</a></li>
              <li><a href="#comparison-cost">Расходы и их возмещение</a></li><li><a href="#comparison-payout">Запрос выплаты</a></li>
              <li><a href="#comparison-profile">Документы и платформы</a></li><li><a href="#sources">Источники</a></li>
            </ol></nav>
            <h2>Короткий вердикт: выбор зависит от пяти ограничений</h2>
            <p>
              <strong>Начните с формата участия и допустимого риска.</strong> Stellar Instant рассматривается как отдельная
              программа без оценки; наличие этого варианта не делает остальные модели FundedNext подходящими автоматически.
              У Bright Funded сравнивайте одноэтапную модель с подвижной границей убытка и двухэтапные модели со статической.
              Следующий фильтр — взнос в USD или EUR и способ получения вознаграждения, доступный именно вашему профилю.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Пять ограничений при выборе фирмы" data-russian-primary-comparison-matrix="five-constraints">
              <table className="ru-table">
                <thead><tr><th>Ограничение</th><th>FundedNext</th><th>Bright Funded</th><th>Решение</th></tr></thead>
                <tbody>
                  <tr><td>Валюта оплаты</td><td>{fundedNextProducts.reduce((sum, product) => sum + pricedTiers(product).length, 0)} цен в USD</td><td>{brightProducts.reduce((sum, product) => sum + pricedTiers(product).length, 0)} цен в EUR</td><td>Сравнивайте итоговую сумму в валюте своего платёжного метода, включая конвертацию.</td></tr>
                  <tr><td>Без оценочного этапа</td><td>{instantFn ? 'Stellar Instant' : 'Требуется проверка предложения'}</td><td>{brightProducts.length ? (brightProducts.some(product => product.phases === 0) ? 'Проверьте строки программ ниже' : 'В проверенных программах есть оценка') : 'Требуется проверка предложения'}</td><td>Отсутствие оценки не отменяет условий запроса выплаты.</td></tr>
                  <tr><td>Первый запрос после оценки</td><td>{oneStepFn ? payoutLabel(oneStepFn) : 'Требует проверки'}</td><td>{oneStepBright ? payoutLabel(oneStepBright) : 'Требует проверки'}</td><td>Не приравнивайте рабочие дни к календарным и запрос к зачислению денег.</td></tr>
                  <tr><td>Платформа</td><td><Link href="/ru/fundednext-mt5">Проверка MT5 и ограничений FundedNext</Link></td><td>По отдельной проверке: MT5, DXTrade, cTrader</td><td>Официальный список фирмы не подтверждает доступность для любой страны и программы.</td></tr>
                  <tr><td>Банк в EUR</td><td>Банковский перевод зависит от страны и посредника</td><td>Банковский перевод публикуется в EUR</td><td>Проверьте валюту зачисления и комиссию принимающего банка.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison-products" data-russian-primary-comparison-products="seven-current-products">
          <div className="ru-shell ru-content">
            <h2>Программы: этапы, цены, просадка и запрос выплаты</h2>
            <p>
              Сравнивайте одинаковый размер счёта и число оценочных этапов. Строка Stellar 1-Step не описывает правила
              Stellar Instant, а условия Bright Funded 2-Step Bright нельзя переносить на Classic.
              Неподтверждённая цель или дневной лимит остаются неизвестными, а не означают отсутствие ограничения.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы, цены и правила двух фирм">
              <table className="ru-table">
                <thead><tr><th>Фирма и программа</th><th>Этапы · цели</th><th>Диапазон цен</th><th>Просадка</th><th>Запрос вознаграждения</th></tr></thead>
                <tbody>
                  {products.map(product => (
                    <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-primary-comparison-product={`${product.firmSlug}:${product.productSlug}`}>
                      <td><strong>{product.firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'}</strong><br />{product.productName}</td>
                      <td>{product.phases} · {targetLabel(product)}</td>
                      <td>{priceRange(product)}<br />{pricedTiers(product).length} размеров</td>
                      <td>{drawdownLabel(product)}</td>
                      <td data-russian-payout-product={`${product.firmSlug}:${product.productSlug}`}>{payoutLabel(product)}<br /><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">Источник · {product.sourceCapturedAt}</a></td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={5}>Актуальных строк нет: источники программ требуют повторной проверки. Объяснения и официальные ссылки ниже сохранены.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison-one-step" data-russian-primary-comparison-one-step="same-caps-different-engine">
          <div className="ru-shell ru-content">
            <RussianFundedNextPayoutNotice />
            <h2>1-Step против 1-Step: важен способ пересчёта убытка</h2>
            <p>
              У Stellar 1-Step цель — {targetLabel(oneStepFn)}, дневной лимит — {percent(oneStepFn?.dailyLossPct)},
              общий — {percent(oneStepFn?.maxLossPct)}. У Bright Funded 1-Step соответственно {targetLabel(oneStepBright)},
              {percent(oneStepBright?.dailyLossPct)} и {percent(oneStepBright?.maxLossPct)}. Каждое значение взято из своей программы:
              совпадение отдельных процентов не доказывает одинаковые условия.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>FundedNext Stellar 1-Step</h3><p className="ru-muted">Минимум торговых дней: {minimumTradingDaysLabel(oneStepFn?.minTradingDays ?? null, 'ru')}. Взнос: {priceRange(oneStepFn)}. Запрос вознаграждения: {oneStepFn ? payoutLabel(oneStepFn) : 'требует проверки'}. Статическая общая граница не поднимается вслед за прибылью; дневной лимит проверяется отдельно.</p></article>
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Bright Funded 1-Step</h3><p className="ru-muted">Минимум торговых дней: {minimumTradingDaysLabel(oneStepBright?.minTradingDays ?? null, 'ru')}. Взнос: {priceRange(oneStepBright)}. Запрос вознаграждения: {oneStepBright ? payoutLabel(oneStepBright) : 'требует проверки'}. По датированным правилам подвижная граница следует за максимальной стоимостью счёта с учётом открытых позиций.</p></article>
            </div>
            <p>
              Открытая прибыль может поднять подвижную границу ещё до закрытия позиции. Если затем цена развернётся,
              запас до нарушения способен сократиться. В <a href={brightEvidence.sources.rules.sourceUrl} target="_blank" rel="nofollow noopener">правилах Bright Funded</a>
              {' '}описана фиксация границы на стартовом балансе после заданного роста. Меньший минимум торговых дней сам по себе
              не делает прохождение проще: сначала проверьте, выдерживает ли стратегия эту механику.
            </p>
          </div>
        </section>

        <section className="ru-section" id="comparison-two-step" data-russian-primary-comparison-two-step="matched-risk-buckets">
          <div className="ru-shell ru-content">
            <h2>2-Step: сопоставьте лимиты риска и цели каждого этапа</h2>
            <p>
              Начните с пары Stellar 2-Step и Bright Funded 2-Step Classic, затем рассмотрите Stellar Lite и 2-Step Bright.
              У каждой программы отдельно сопоставьте дневной и общий лимиты, обе цели и минимум торговых дней.
              Если условия одной программы изменятся, прежнее сходство пары перестанет быть основанием для выбора.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия двухэтапных программ">
              <table className="ru-table">
                <thead><tr><th>Что сравниваем</th><th>FundedNext</th><th>Bright Funded</th><th>Как читать</th></tr></thead>
                <tbody>
                  <tr><td>Основная двухэтапная пара</td><td>Stellar 2-Step · цели {targetLabel(twoStepFn)}; день {percent(twoStepFn?.dailyLossPct)}, общий {percent(twoStepFn?.maxLossPct)}</td><td>2-Step Classic · цели {targetLabel(classicBright)}; день {percent(classicBright?.dailyLossPct)}, общий {percent(classicBright?.maxLossPct)}</td><td>Сопоставьте обе цели; не вычитайте проценты, если один показатель не подтверждён.</td></tr>
                  <tr><td>Lite и Bright</td><td>Stellar Lite · цели {targetLabel(liteFn)}; день {percent(liteFn?.dailyLossPct)}, общий {percent(liteFn?.maxLossPct)}</td><td>2-Step Bright · цели {targetLabel(twoStepBright)}; день {percent(twoStepBright?.dailyLossPct)}, общий {percent(twoStepBright?.maxLossPct)}</td><td>Проверьте запас риска вместе со стоимостью, а не только более низкий взнос.</td></tr>
                  <tr><td>Минимум дней: 2-Step и Classic</td><td>{minimumTradingDaysLabel(twoStepFn?.minTradingDays ?? null, 'ru')}</td><td>{minimumTradingDaysLabel(classicBright?.minTradingDays ?? null, 'ru')}</td><td>Торговые дни оценки не являются сроком запроса выплаты.</td></tr>
                  <tr><td>Первый запрос: 2-Step и Classic</td><td>{twoStepFn ? payoutLabel(twoStepFn) : 'Требует проверки'}</td><td>{classicBright ? payoutLabel(classicBright) : 'Требует проверки'}</td><td>Нужно пройти оценку, начать следующий этап и выполнить условия запроса.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison-instant" data-russian-primary-comparison-instant="fundednext-only">
          <div className="ru-shell ru-content">
            <h2>Stellar Instant: участие без оценки, но с ограничениями</h2>
            <p>
              Для Stellar Instant диапазон проверенных взносов — {priceRange(instantFn)}, базовая доля трейдера —
              {percent(instantFn?.profitSplitPct)}, общий лимит — {percent(instantFn?.maxLossPct)}. Это отдельная программа:
              не переносите на неё сроки запроса и возврата взноса от Stellar 1-Step или 2-Step.
              <Link href="/ru/fundednext-stellar-instant"> Подробный разбор Instant</Link> объясняет условия запроса, проверку по итогам дня и запас до нарушения после вывода.
            </p>
            <div className="ru-notice">
              <Zap size={16} aria-hidden="true" />{' '}
              <strong>Отсутствие оценки не означает отсутствие ограничений.</strong> Движущаяся граница убытка, проверка личности,
              доступность по стране и проверка торговых действий сохраняются. Не включайте оценочную программу Bright Funded
              в сравнение счетов без оценки только потому, что у неё похожая стоимость.
            </div>
            <div className="ru-actions">
              <Link href="/ru/prop-firmy-bez-chelendzha" className="btn-outline">Сравнение программ без оценки</Link>
              <Link href="/go/fundednext?from=ru-fn-vs-bright-instant" rel="sponsored nofollow noopener" className="btn-primary">Проверить Stellar Instant <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison-cost" data-russian-primary-comparison-cost="compute-true-cost">
          <div className="ru-shell ru-content">
            <h2>Стоимость участия: взнос и прибыль для его возмещения</h2>
            <p>
              Для ориентира: диапазон взносов Stellar Lite — {priceRange(liteFn)}, 2-Step Bright — {priceRange(twoStepBright)}.
              Диапазон относится к разным размерам счёта, а не к одному сопоставимому предложению. Размер счёта не равен
              сумме покупки или деньгам, которые можно вывести. Взносы сохраняют исходные USD и EUR без постоянного обменного коэффициента.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Расходы и прибыль для их возмещения">
              <table className="ru-table">
                <thead><tr><th>Программа · размер счёта</th><th>Минимальный известный расход</th><th>Базовая доля</th><th>Валовая прибыль для возмещения расхода</th><th>Что не включено</th></tr></thead>
                <tbody>
                  {products.map(product => {
                    const economics = minimumEconomics(product)
                    const currency = challengeCurrency(product)
                    const tier = cheapestTier(product)
                    const knownCost = tier ? (currency === 'USD' ? minimumCostToFundedUsd(product, tier) : tier.priceEur) : null
                    return (
                      <tr key={`economics-${product.firmSlug}-${product.productSlug}`} data-russian-comparison-cost={`${product.firmSlug}:${product.productSlug}`}>
                        <td>{product.productName} · {tier ? money(tier.sizeUsd, 'USD') : 'размер не подтверждён'}</td>
                        <td>{money(knownCost, currency)}</td>
                        <td>{percent(product.profitSplitPct)}</td>
                        <td>{economics ? money(economics.breakEvenProfit, currency) : 'не рассчитано'}</td>
                        <td>скидки, дополнительные опции, комиссии посредника, сети, банка и конвертация</td>
                      </tr>
                    )
                  })}
                  {products.length === 0 && <tr><td colSpan={5}>Расчёты возобновятся после повторной проверки исходных цен.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">
              Расчёт делит минимальный известный расход на базовую долю трейдера и предполагает прохождение с первой попытки.
              Это не прогноз доходности и не обещание возврата взноса фирмой. Если доля неизвестна, взнос остаётся видимым,
              но необходимая валовая прибыль не рассчитывается. Условия возврата взноса рассматривайте отдельно от этой арифметики.
            </p>
          </div>
        </section>

        <section className="ru-section" id="comparison-payout" data-russian-primary-comparison-payout="methods-cycle-fees">
          <div className="ru-shell ru-content">
            <h2>Выплаты: валюта, сеть, посредник и срок запроса</h2>
            <p>
              В датированном разборе FundedNext различаются криптопереводы, банковский перевод, платёжные посредники и пополнение FNmarkets.
              Токен USDT, сеть ERC-20 или TRC-20 и посредник Confirmo — не взаимозаменяемые категории. Уточните маршрут,
              комиссию и доступность в своей стране. Заявленный фирмой срок обработки начинается после корректной заявки,
              а не в день покупки программы, и не подтверждает срок поступления на ваш счёт.
            </p>
            <p>
              <a href={brightEvidence.sources.reward.sourceUrl} target="_blank" rel="nofollow noopener">Bright Funded публикует</a>
              {' '}USDC в сети ERC-20 и банковский перевод в EUR. На той же странице следующий цикл описан как двухнедельный,
              но выплаты раз в 14 дней также перечислены среди платных дополнений. Это противоречие остаётся неразрешённым:
              не включайте сокращённый цикл в базовую цену без письменного подтверждения фирмы. Комиссии банка, сети и конвертации
              проверяются отдельно; универсальную сумму расходов обещать нельзя.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Что проверить у FundedNext</h3><p className="ru-muted">Поддерживает ли выбранный маршрут вашу страну, документы и кошелёк? Какая сумма останется после доли фирмы и внешних комиссий? Доступность криптоперевода не устраняет ограничение на участие в программе.</p></article>
              <article className="ru-card"><BadgeDollarSign size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Что проверить у Bright Funded</h3><p className="ru-muted">Подходит ли USDC ERC-20 или банковский перевод в EUR? Какой цикл включён именно в ваш заказ и оплачено ли дополнение? До ответа не рассчитывайте на более раннее получение денег.</p></article>
            </div>
            <div className="ru-actions"><Link href="/ru/vyplaty-prop-firm" className="btn-outline">Разобрать 4 стадии выплаты</Link></div>
          </div>
        </section>

        <section className="ru-section" id="comparison-profile" data-russian-primary-comparison-kyc="two-required-processes">
          <div className="ru-shell ru-content">
            <h2>KYC, платформы и проверка страны</h2>
            <p>
              Проверка личности не заменяется русскоязычным интерфейсом или успешной оплатой. По разбору оценочных программ
              от {kycEvidence.get('fundednext')?.sourceCapturedAt ?? 'неподтверждённой даты'} FundedNext проверяет документы после прохождения оценки и перед активацией следующего счёта.
              В перечне указаны паспорт, государственное удостоверение личности или вид на жительство; подтверждение адреса могут запросить дополнительно.
              Для Stellar Instant, где оценки нет, порядок активации нужно проверять отдельно.
            </p>
            <p>
              Проверка Bright Funded от {kycEvidence.get('bright-funded')?.sourceCapturedAt ?? 'неподтверждённой даты'} описывает
              {' '}{kycEvidence.get('bright-funded')?.provider ?? 'неподтверждённого провайдера'} для личности и адреса, затем проверку торгового счёта командой риска.
              Одобрение документов, подписание договора и активация — отдельные шаги. Опубликованный ориентир не гарантирует срок для профиля,
              по которому запрошены дополнительные сведения.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Платформы и проверка личности">
              <table className="ru-table">
                <thead><tr><th>Проверка</th><th>FundedNext</th><th>Bright Funded</th></tr></thead>
                <tbody>
                  <tr><td>Платформы</td><td><Link href="/ru/fundednext-mt5">MT5 и ограничения FundedNext</Link>: выбор зависит от модели, размера счёта и профиля.</td><td><Link href="/ru/prop-firmy-s-ctrader">cTrader и ограничения Bright Funded</Link>: список платформ фирмы не подтверждает доступность для каждого счёта.</td></tr>
                  <tr><td>Кто проверяет</td><td>Центр проверки FundedNext</td><td>SumSub и команда риска Bright Funded</td></tr>
                  <tr><td>Этап активации</td><td>Для оценочной модели — после прохождения оценки; Instant проверяется отдельно</td><td>Документы, проверка счёта, договор и активация</td></tr>
                  <tr><td>Проверка адреса</td><td>Дополнительный документ может потребоваться</td><td>Перечень документов зависит от страны</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-diaspora="language-not-residency">
          <div className="ru-shell ru-content">
            <h2>Русскоязычный трейдер за рубежом: четыре сценария</h2>
            <p>
              Место проживания, гражданство и платёжный метод — разные проверки. Банковский счёт в EUR не подтверждает допуск к программе,
              а поддержка криптокошелька не отменяет ограничения платформы. Сначала сопоставьте документы и фактический профиль
              с правилами фирмы и посредника; не подбирайте адрес или страну ради прохождения проверки.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>EUR-счёт в поддерживаемой стране</h3><p className="ru-muted">Взнос Bright Funded и его банковская выплата указаны в EUR. Проверьте итоговую сумму заказа, комиссию банка и совпадение владельца счёта с документами.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Поддерживаемый криптокошелёк</h3><p className="ru-muted">Проверьте токен и сеть, имя владельца, требования посредника и возможность последующего обмена. ERC-20 и TRC-20 нельзя считать одним адресным форматом.</p></article>
              <article className="ru-card"><MonitorSmartphone size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Нужна конкретная платформа</h3><p className="ru-muted">Статья Bright Funded перечисляет MT5, DXTrade и cTrader. Значит, cTrader не является исключительным преимуществом FundedNext в этой паре. Страна и выбранная программа проверяются отдельно.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент России</h3><p className="ru-muted">У FundedNext статус остаётся «конфликт»: {accessEvidence?.sourceUrls.length ?? 0} официальных страницы не дают безопасного общего ответа. Bright тоже проверяется отдельно.</p></article>
            </div>
            <div className="ru-actions"><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary">Проверить профиль и страну <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link><Link href="/ru/prop-firmy-s-ctrader" className="btn-outline">Сравнить правила cTrader</Link></div>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-trust="suppressed-is-not-null">
          <div className="ru-shell ru-content">
            <h2>Отзывы: оценка платформы и подтверждение выплаты — разные вещи</h2>
            <p>
              На снимке Trustpilot от {fundedNext?.trustpilotCapturedAt ?? 'неуказанной даты'} FundedNext имел
              {fundedNext?.trustpilotScore ?? '—'}/5 при {fundedNext?.trustpilotCount?.toLocaleString('en-US') ?? '—'} отзывах.
              Это сводка пользовательских отзывов, а не проверка каждой выплаты.
              {' '}{brightFunded?.trustpilotRatingSuppressed ? `У Bright Funded в записи от ${brightFunded.trustpilotCapturedAt ?? 'неподтверждённой даты'} отмечено снятие общей оценки за нарушение правил платформы; это не нулевая оценка.` : 'Статус общей оценки Bright Funded нужно уточнить в его обзоре.'}
            </p>
            {(!freshCapture(fundedNext?.trustpilotCapturedAt ?? '') || !freshCapture(brightFunded?.trustpilotCapturedAt ?? '')) && <p className="ru-notice">Наблюдения Trustpilot требуют повторной проверки. Здесь сохранены датированные сведения, а не текущая оценка фирм.</p>}
            <div className="ru-notice">
              <ShieldCheck size={16} aria-hidden="true" />{' '}
              <strong>Как использовать отзывы:</strong> ищите название нарушенного правила, даты, способ выплаты и ответ поддержки,
              затем сопоставляйте их с договором и официальной страницей. Снимок чужой выплаты не доказывает,
              что другой профиль пройдёт проверку, а один негативный отзыв не устанавливает нарушение со стороны фирмы.
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
              Если ни одна фирма письменно не подтверждает вашу страну, документы или способ выплаты, не оплачивайте участие до выяснения условий.
              <Link href="/ru/rossiyskie-prop-kompanii"> Локальные модели</Link> и <Link href="/ru/luchshie-prop-firmy">полный рейтинг</Link> используют другие наборы продуктов.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-primary-comparison-decision="constraint-before-commission">
          <div className="ru-shell ru-content">
            <h2>Финальный чек-лист выбора</h2>
            <ol>
              <li><strong>Страна и документы.</strong> Подтвердите свой профиль до оплаты; язык страницы не даёт разрешения участвовать.</li>
              <li><strong>Программа.</strong> Выберите оценочную модель или Instant, затем одинаковый размер счёта для сравнения.</li>
              <li><strong>Валюта.</strong> Сравните итоговые расходы в USD и EUR с фактической конвертацией при оплате.</li>
              <li><strong>Просадка.</strong> Установите, фиксирована граница убытка или поднимается вслед за прибылью.</li>
              <li><strong>Запрос вознаграждения.</strong> Разделите условия подачи заявки, рабочие дни, проверку фирмы и время зачисления.</li>
              <li><strong>Чистая сумма.</strong> Учтите долю фирмы и комиссии посредника, сети, банка и конвертации.</li>
              <li><strong>Платформа.</strong> Сверьте конкретный терминал и ограничения профиля; cTrader встречается у обеих фирм.</li>
              <li><strong>Источник.</strong> Сохраните условия своего заказа и повторно откройте официальные правила перед оплатой.</li>
            </ol>
            <div className="ru-grid">
              <article className="ru-card" data-russian-primary-comparison-cta="fundednext">
                <div className="ru-card-head"><h3>Выбрать FundedNext</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">Начните с нужной модели Stellar: оценка или Instant, взнос в USD, отдельные правила просадки и запроса вознаграждения. Подтвердите программу и профиль до покупки.</p>
                <div className="ru-actions"><Link href="/ru/obzor-fundednext" className="btn-outline">Русский обзор</Link><Link href="/go/fundednext?from=ru-fn-vs-bright-verdict-fundednext" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
              <article className="ru-card" data-russian-primary-comparison-cta="bright-funded">
                <div className="ru-card-head"><h3>Выбрать Bright Funded</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">Сопоставьте взнос в EUR, выбранную одно- или двухэтапную модель, доступную платформу и способ выплаты. Уточните базовый цикл и платные дополнения.</p>
                <div className="ru-actions"><Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор</Link><Link href="/go/bright-funded?from=ru-fn-vs-bright-verdict-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
            </div>
            <p className="ru-source-line"><Database size={14} aria-hidden="true" /> {products.length} программ · {priceCount} цен · {sourceCount} официальных страниц программ. Самая ранняя проверка — {latestCapture}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="sources">Источники и границы сравнения</h2>
            <p>Цены, правила, способы выплаты и проверка личности имеют отдельные даты. Новая дата текста не обновляет цену и не подтверждает доступ по стране. Официальные ссылки сохраняются и после истечения срока проверки; для конкретного заказа приоритет имеют его условия и ответ фирмы.</p>
            <ul>{sourceUrls.map((url, index) => <li key={url}><a href={url} target="_blank" rel="nofollow noopener">{sourceLabels.get(url) ?? `FundedNext: проверка доступа по стране, источник ${index + 1}`}</a></li>)}</ul>
            <h2>Частые вопросы</h2>
            {!completeEvidence && <p className="ru-notice" data-russian-primary-comparison-evidence="recapture-required">Не все данные подтверждены в текущем окне проверки. Ответы ниже сохраняют объяснение подхода, а не подтверждают действующее предложение.</p>}
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
