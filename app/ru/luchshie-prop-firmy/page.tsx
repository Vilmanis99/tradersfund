import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Database, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/luchshie-prop-firmy'
const TITLE = 'Лучшие проп-фирмы 2026: рейтинг и сравнение'
const DESCRIPTION = 'Лучшие проп-фирмы для русскоязычных трейдеров по всему миру: сравнение страны, цен USD/EUR, просадки, выплат и продуктов без подмены KYC.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая проп-фирма лучшая?',
    a: 'Единой лучшей фирмы нет. Редакционный балл помогает сократить список, но итог зависит от конкретного продукта: цены, числа этапов, типа просадки, торговых ограничений и условий выплаты.',
  },
  {
    q: 'Учитывается ли партнёрская комиссия в рейтинге?',
    a: 'Нет. Партнёрский статус не добавляет баллы и не меняет порядок. Он раскрывается отдельно рядом с переходом на сайт фирмы.',
  },
  {
    q: 'Можно ли пользоваться этим рейтингом из любой страны?',
    a: 'Рейтинг можно читать в любой стране, но покупка продукта зависит от гражданства, резидентства, KYC, платёжного способа и правил фирмы. Перед оплатой нужно подтвердить доступность на официальном сайте.',
  },
  {
    q: 'Какие проп-фирмы подходят русскоязычным трейдерам за границей?',
    a: 'Язык не определяет доступ. Русскоязычный трейдер в ЕС, Великобритании, Казахстане, Израиле, Северной Америке или другой стране должен проверять своё фактическое резидентство, гражданство, KYC, checkout и payout-метод. В рейтинге есть отдельные русские обзоры FundedNext, FundingPips и Bright Funded с такими проверками.',
  },
  {
    q: 'Какая проп-фирма работает с резидентами России?',
    a: 'Этот рейтинг не обещает доступ ни у одной глобальной фирмы. У FundedNext официальные страницы дают противоречивые сигналы по России; FundingPips применяет ограничения по резидентству и санкционным спискам; Bright Funded не называет Россию в опубликованном списке из 6 стран, но это не гарантирует прохождение checkout или KYC. Нужна письменная проверка конкретного профиля до оплаты.',
  },
  {
    q: 'Есть ли проп-фирмы без челленджа?',
    a: 'Да, в текущих данных есть продукты с 0 оценочных фаз: FundedNext Stellar Instant и FundingPips Zero. Отсутствие challenge не отменяет trailing-просадку, payout-gates, невозвратный взнос или правила консистентности; сравнивайте их в отдельном рейтинге instant funding.',
  },
  {
    q: 'Какие проп-фирмы выплачивают в криптовалюте?',
    a: 'В фирменных данных FundedNext, FundingPips и Bright Funded перечисляют crypto среди payout-методов. Конкретная монета, сеть, минимум, комиссия и доступность зависят от фирмы и страны, поэтому сначала откройте разбор выплат, а затем подтвердите метод в своём профиле.',
  },
  {
    q: 'Как проверять отзывы о проп-фирмах?',
    a: 'Используйте отзывы как список возможных проблем, а не доказательство будущей выплаты. Сопоставляйте дату, продукт, правило нарушения, размер счёта и ответ фирмы; звёздный рейтинг Trustpilot не подтверждает KYC, compliance-review или reward конкретного трейдера.',
  },
]

const partnerGuidance: Record<string, {
  start: string
  country: string
  payout: string
  watch: string
}> = {
  fundednext: {
    start: 'Нужен выбор между 2-Step, 1-Step, Lite и Instant в USD.',
    country: 'По России есть конфликт официальных страниц; для любой другой страны нужен checkout точного профиля.',
    payout: 'Bank wire, Rise и crypto указаны в фирменном профиле; пороги и доступность различаются.',
    watch: 'У funded-счёта действует 10-минутное новостное окно с 40% зачёта прибыли; Instant использует trailing-просадку.',
  },
  fundingpips: {
    start: 'Нужны 5 продуктовых путей, включая 1-Step, 2-Step и продукт с 0 фаз.',
    country: 'ОАЭ и Вьетнам прямо ограничены по резидентству; также применяются санкционные списки.',
    payout: 'Card, bank wire, Rise и crypto перечислены в фирменном профиле; календарь reward зависит от продукта.',
    watch: 'Сплит, consistency и weekend-правила отличаются по модели; фирменный максимум нельзя переносить на все продукты.',
  },
  'bright-funded': {
    start: 'Нужна цена challenge в EUR и выбор между 1-Step и двумя 2-Step моделями.',
    country: 'Опубликованный список ограничивает 6 стран; отсутствие страны в нём не гарантирует checkout, KYC или банк.',
    payout: 'Bank transfer в EUR и USDC ERC-20 описаны в официальном справочнике.',
    watch: 'Обычная первая выплата указана через 30 дней; в справочнике есть конфликт о двухнедельном цикле как add-on.',
  },
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function formatMoney(value: number, currency: 'USD' | 'EUR') {
  const amount = value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currency === 'USD' ? `$${amount}` : `€${amount}`
}

function drawdownLabel(value: string | null) {
  if (!value) return 'не подтверждена'
  return ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[value] ?? value
}

function productPricing(products: Challenge[]) {
  const usd = products.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : []))
  const eur = products.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : []))
  const ranges = [
    ...(usd.length > 0 ? [`${formatMoney(Math.min(...usd), 'USD')}–${formatMoney(Math.max(...usd), 'USD')}`] : []),
    ...(eur.length > 0 ? [`${formatMoney(Math.min(...eur), 'EUR')}–${formatMoney(Math.max(...eur), 'EUR')}`] : []),
  ]
  const entries = [
    ...(usd.length > 0 ? [formatMoney(Math.min(...usd), 'USD')] : []),
    ...(eur.length > 0 ? [formatMoney(Math.min(...eur), 'EUR')] : []),
  ]
  return {
    pricedTiers: usd.length + eur.length,
    entry: entries.join(' / ') || 'не подтверждён',
    range: ranges.join(' / ') || 'цена не подтверждена',
  }
}

export default function RussianBestPropFirmsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const ranked = firms
    .map(firm => {
      const slug = slugify(firm.name)
      const products = challenges.filter(challenge => challenge.firmSlug === slug)
      return { firm, slug, products }
    })
    .filter(item => item.products.length > 0 && item.products.every(product => isChallengeFresh(product)))
    .sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))

  const topFive = ranked.slice(0, 5)
  const globalPartners = ['fundednext', 'bright-funded', 'fundingpips']
    .map(slug => {
      const rankedItem = ranked.find(item => item.slug === slug)
      const firm = rankedItem?.firm ?? firms.find(item => outboundSlug(item.name) === slug)
      return firm ? { slug, firm, products: rankedItem?.products ?? [] } : null
    })
    .filter((item): item is { slug: string; firm: (typeof firms)[number]; products: (typeof challenges) } => Boolean(item?.firm.affiliateUrl))
  const partnerProfiles = globalPartners.map(item => {
    const splits = [...new Set(item.products.flatMap(product =>
      product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
    const drawdowns = [...new Set(item.products.map(product => drawdownLabel(product.drawdownType)))]
    return {
      ...item,
      ...productPricing(item.products),
      splits,
      drawdowns,
      guidance: partnerGuidance[item.slug],
    }
  })
  const fundedNextProfile = partnerProfiles.find(item => item.slug === 'fundednext')
  const fundingPipsProfile = partnerProfiles.find(item => item.slug === 'fundingpips')
  const brightFundedProfile = partnerProfiles.find(item => item.slug === 'bright-funded')
  const primaryPartnerProfiles = partnerProfiles.filter(item =>
    item.slug === 'fundednext' || item.slug === 'bright-funded')
  const latestCapture = ranked
    .flatMap(item => item.products.map(product => product.sourceCapturedAt))
    .sort()
    .at(-1)
  const pricedProductCount = ranked.reduce((total, item) => total + item.products.filter(product =>
    product.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length, 0)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы 2026' },
  ])
  const faq = faqPageSchema(faqs)
  const list = itemListSchema(ranked.map(item => item.firm), TITLE)
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Рейтинг</div>
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Порядок не продаётся</div>
          <h1>Лучшие проп-фирмы 2026: рейтинг для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            В рейтинг попадают только фирмы, у которых все текущие продукты прошли
            30-дневный контроль свежести. Редакционный балл задаёт порядок; партнёрская
            ссылка, купон и размер комиссии не добавляют ни одного балла.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{ranked.length}</strong><span>фирм прошли текущий фильтр</span></div>
            <div className="ru-stat"><strong>{ranked.reduce((sum, item) => sum + item.products.length, 0)}</strong><span>проверенных продуктов</span></div>
            <div className="ru-stat"><strong>{pricedProductCount}</strong><span>продуктов с ценой</span></div>
            <div className="ru-stat"><strong>{latestCapture ?? '—'}</strong><span>последний захват источника</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#polnyy-reyting" className="btn-primary btn-glow">Смотреть весь рейтинг <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">Сначала понять правила</Link>
            <Link href="/ru/chto-takoe-prop-firma" className="btn-outline">Что означает проп-фирма</Link>
            <Link href="/ru/forex-prop-firmy" className="btn-outline">Отдельно сравнить forex</Link>
            <Link href="/ru/luchshie-kripto-prop-firmy" className="btn-outline">Отдельно сравнить крипто</Link>
          </div>
        </div>
      </section>

      <article data-russian-ranking-article="decision-first">
      <section className="ru-section ru-review-toc-section">
        <div className="ru-shell">
          <nav className="toc ru-review-toc" aria-label="Содержание рейтинга проп-фирм">
            <div className="toc-title">Содержание рейтинга</div>
            <ol>
              <li><a href="#bystryy-otvet">Краткий ответ</a></li>
              <li><a href="#glavnye-partnery">FundedNext и Bright Funded</a></li>
              <li><a href="#strana">Выбор по стране</a></li>
              <li><a href="#top-5">Первые пять</a></li>
              <li><a href="#partner-matrix">Три глобальных партнёра</a></li>
              <li><a href="#po-zadache">Выбор по бюджету, просадке и выплатам</a></li>
              <li><a href="#polnyy-reyting">Полный рейтинг</a></li>
              <li><a href="#kak-vybrat">Методика выбора</a></li>
              <li><a href="#rossiyskie-firmy">Российские проп-компании</a></li>
              <li><a href="#faq">Частые вопросы</a></li>
            </ol>
          </nav>
        </div>
      </section>

      <section className="ru-section" id="bystryy-otvet">
        <div className="ru-shell ru-content">
          <h2>Какая проп-фирма лучшая для русскоязычного трейдера</h2>
          <p><strong>Лучший выбор определяется не русским языком и не местом в таблице.</strong> Сначала проверьте фактическую страну, гражданство, KYC и checkout; затем сравните рынок, валюту цены, тип drawdown и календарь reward. Только после этих фильтров редакционный балл помогает выбрать между продуктами с одинаковым назначением.</p>
          <p>В текущем партнёрском шортлисте FundedNext даёт 4 пути и {productPricing(globalPartners.find(item => item.slug === 'fundednext')?.products ?? []).pricedTiers} цен в USD; FundingPips — 5 путей и {productPricing(globalPartners.find(item => item.slug === 'fundingpips')?.products ?? []).pricedTiers} ценовых уровней; Bright Funded — 3 программы и {productPricing(globalPartners.find(item => item.slug === 'bright-funded')?.products ?? []).pricedTiers} цен в EUR. Эти числа не делают одну фирму универсальным победителем: Stellar Instant, FundingPips Zero и Bright 2-Step Classic создают разные failure-points.</p>
          <div className="ru-notice" data-russian-country-boundary="ranking-not-access">
            <strong>Это не рейтинг доступности в России.</strong>{' '}
            Он написан по-русски для мировой русскоязычной аудитории. Страна,
            гражданство, IP, KYC, карта и способ выплаты проверяются отдельно у каждой фирмы.
          </div>
        </div>
      </section>

      <section className="ru-section" id="glavnye-partnery">
        <div className="ru-shell" data-russian-ranking-primary-partners="fundednext-bright-funded">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ranking-primary-partners">
            <strong>Два основных коммерческих маршрута.</strong>{' '}
            FundedNext и Bright Funded выделены здесь как главные партнёры Traders Fund Hub; переход может принести нам комиссию.
            Это не меняет редакционный рейтинг. Сначала подтвердите страну, KYC, оплату и выплату для своего профиля.
          </div>
          <h2>FundedNext или Bright Funded: быстрая развилка</h2>
          <p className="ru-muted">
            Сравнивайте не логотипы, а продуктовую задачу: USD или EUR, 0 или 1–2 этапа, доступную платформу,
            механизм просадки и маршрут будущей выплаты.
          </p>
          <div className="ru-grid">
            {primaryPartnerProfiles.map(item => {
              const isFundedNext = item.slug === 'fundednext'
              const reviewHref = isFundedNext ? '/ru/obzor-fundednext' : '/ru/obzor-bright-funded'
              const phaseCounts = [...new Set(item.products.map(product => product.phases))].sort((a, b) => a - b)
              return (
                <article className="ru-card" key={item.slug} data-russian-ranking-primary-partner={item.slug}>
                  <div className="ru-card-head">
                    <h3>{item.firm.name}</h3>
                    <span className="ru-score">Продуктов: {item.products.length}</span>
                  </div>
                  <p>
                    {isFundedNext
                      ? `${item.pricedTiers} опубликованных цен в USD; среди ${item.products.length} маршрутов есть Stellar Instant с 0 оценочных фаз.`
                      : `${item.pricedTiers} опубликованных цен в EUR; все ${item.products.length} evaluation-маршрута используют TradeLocker.`}
                  </p>
                  <ul className="ru-facts">
                    <li><BadgeCheck size={14} aria-hidden="true" /> Диапазон входа: {item.range}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Фазы: {phaseCounts.join(', ')}; просадка: {item.drawdowns.join(' / ')}</li>
                    <li>{isFundedNext
                      ? 'Фирменный профиль перечисляет bank wire, Rise и crypto; точный маршрут проверяется по стране.'
                      : 'Официальный справочник описывает EUR bank transfer и USDC ERC-20.'}</li>
                  </ul>
                  <div className="ru-actions">
                    <Link href={reviewHref} className="btn-outline">Русский обзор</Link>
                    <Link
                      href={`/go/${item.slug}?from=ru-ranking-primary-${item.slug}`}
                      rel="sponsored nofollow noopener"
                      className="btn-primary"
                    >
                      Проверить {item.firm.name} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="ru-source-line">
            FundingPips остаётся вторичным партнёрским вариантом и сравнивается ниже в полной матрице; он не подменяет два основных маршрута этой страницы.
          </p>
        </div>
      </section>

      <section className="ru-section" id="strana">
        <div className="ru-shell" data-russian-ranking-country-paths="diaspora-not-russia">
          <h2>Проп-фирмы для русскоязычных трейдеров: сначала страна</h2>
          <p className="ru-muted">Русскоязычный трейдер может жить в Москве, Алматы, Риге, Берлине, Тель-Авиве, Дубае или Нью-Йорке. Для KYC это 7 разных профилей, а не одна аудитория.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Резидент России</h3>
              <p>Не считайте отсутствие России в одном списке разрешением. У FundedNext есть конфликт официальных страниц; FundingPips применяет резидентские и санкционные ограничения; у Bright Funded отсутствие России в опубликованном списке из 6 стран не гарантирует checkout.</p>
              <p><Link href="/ru/rossiyskie-prop-kompanii">Сначала открыть проверку России и местных компаний →</Link></p>
            </article>
            <article className="ru-card">
              <h3>ЕС или Великобритания</h3>
              <p>Сверяйте точное резидентство, валюту карты и банк. Bright Funded публикует цены в EUR; FundedNext и FundingPips — в USD. Мы не пересчитываем их в одну «дешёвую» цену по временному FX-курсу.</p>
              <p><Link href="/ru/dlya-russkoyazychnykh-treyderov">Открыть глобальный гид для русскоязычных →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Казахстан, Израиль или другая страна</h3>
              <p>Русский язык не заменяет адрес и документы. Проверьте гражданство, резидентство, KYC, доступный checkout и payout-rail; затем выбирайте между USD, EUR, bank wire, Rise и crypto по точному профилю.</p>
              <p><Link href="/ru/prop-firmy-bez-kyc">Почему «без KYC» не является безопасным фильтром →</Link></p>
            </article>
            <article className="ru-card">
              <h3>ОАЭ</h3>
              <p>FundingPips прямо ограничивает резидентов ОАЭ, поэтому русскоязычному трейдеру в Дубае этот путь не подходит. FundedNext и Bright Funded всё равно требуют отдельной проверки конкретного профиля и способа выплаты.</p>
              <p><Link href="/ru/obzor-fundingpips">Посмотреть источник ограничения FundingPips →</Link></p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="top-5">
        <div className="ru-shell">
          <h2>Первые пять по текущему редакционному баллу</h2>
          <p className="ru-muted">Карточки ниже выводятся из тех же фирменных и продуктовых данных, что и английская версия.</p>
          <div className="ru-grid" data-russian-ranking="top-five">
            {topFive.map((item, index) => {
              const usdPrices = item.products.flatMap(product => product.accountSizes.flatMap(tier =>
                tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : []))
              const eurPrices = item.products.flatMap(product => product.accountSizes.flatMap(tier =>
                tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : []))
              const entryPrices = [
                ...(usdPrices.length ? [`от ${formatMoney(Math.min(...usdPrices), 'USD')}`] : []),
                ...(eurPrices.length ? [`от ${formatMoney(Math.min(...eurPrices), 'EUR')}`] : []),
              ].join(' / ') || 'цена не подтверждена'
              const splits = [...new Set(item.products.flatMap(product =>
                product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
              const drawdowns = [...new Set(item.products.map(product => drawdownLabel(product.drawdownType)))]
              const reviewHref = item.slug === 'ftmo'
                ? '/ru/obzor-ftmo'
                : item.slug === 'fundednext'
                  ? '/ru/obzor-fundednext'
                  : item.slug === 'fundingpips'
                  ? '/ru/obzor-fundingpips'
                  : item.slug === 'bright-funded'
                    ? '/ru/obzor-bright-funded'
                    : item.firm.reviewUrl

              return (
                <article className="ru-card ru-ranking-card" key={item.slug} data-ranked-firm={item.slug}>
                  <div className="ru-card-head">
                    <span className="ru-rank">Место {index + 1}</span>
                    <span className="ru-score">{item.firm.score.toFixed(1)}/10</span>
                  </div>
                  <h3>{item.firm.name}</h3>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> {item.products.length} текущих продуктов</li>
                    <li><BadgeCheck size={14} aria-hidden="true" /> вход {entryPrices}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> сплит {splits.length > 0 ? `${splits.join('–')}%` : 'не подтверждён'}; просадка: {drawdowns.join(' / ')}</li>
                    <li>Источники проверены до {item.products.map(product => product.sourceCapturedAt).sort().at(-1)}</li>
                  </ul>
                  <Link
                    className="ru-card-link"
                    href={reviewHref}
                    hrefLang={item.slug === 'ftmo' || item.slug === 'fundednext' || item.slug === 'fundingpips' || item.slug === 'bright-funded' ? 'ru' : 'en'}
                  >
                    {item.slug === 'ftmo' || item.slug === 'fundednext' || item.slug === 'fundingpips' || item.slug === 'bright-funded' ? 'Читать обзор на русском →' : 'Открыть полный обзор на английском →'}
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ru-section" id="partner-matrix">
        <div
          className="ru-shell"
          data-russian-partner-shortlist="global"
          data-russian-ranking-partner-matrix="three-global-partners"
        >
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="partner-shortlist">
            <strong>Глобальные партнёрские пути.</strong>{' '}
            Эта матрица показывает фирмы, с которыми у Traders Fund Hub настроены партнёрские ссылки.
            Партнёрство не меняет редакционный балл или порядок рейтинга. Перед оплатой отдельно подтвердите
            страну, гражданство, KYC, способ оплаты и правила выплат.
          </div>
          <h2>Полная партнёрская матрица: два основных пути и FundingPips</h2>
          <p className="ru-muted">FundedNext и Bright Funded показаны первыми как основные коммерческие маршруты; FundingPips остаётся вторичным сравнением. Это не отдельный рейтинг из 3 мест: каждая строка отвечает на 5 вопросов о продукте, валюте, просадке, стране и reward.</p>
          <div className="ru-table-wrap">
            <table className="ru-table ru-partner-decision-table">
              <thead>
                <tr><th>Фирма и данные</th><th>Цена, сплит, просадка</th><th>Когда начинать сравнение</th><th>Страна, выплаты и главный риск</th><th>Действие</th></tr>
              </thead>
              <tbody>
            {partnerProfiles.map(item => {
              const reviewHref = item.slug === 'fundednext'
                ? '/ru/obzor-fundednext'
                : item.slug === 'fundingpips'
                  ? '/ru/obzor-fundingpips'
                  : item.slug === 'bright-funded'
                  ? '/ru/obzor-bright-funded'
                  : item.firm.reviewUrl
              return (
                <tr key={item.slug} data-russian-partner={item.slug}>
                  <td><strong>{item.firm.name}</strong><br />TFH {item.firm.score.toFixed(1)}/10<br />{item.products.length} продуктов / {item.pricedTiers} цен<br />захват {item.products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'устарел'}</td>
                  <td>{item.range}<br />базовые сплиты {item.splits.length > 0 ? `${item.splits.join('–')}%` : 'не подтверждены'}<br />{item.drawdowns.join(' / ') || 'просадка не подтверждена'}</td>
                  <td>{item.guidance.start}</td>
                  <td><strong>Страна:</strong> {item.guidance.country}<br /><strong>Reward:</strong> {item.guidance.payout}<br /><strong>Проверить:</strong> {item.guidance.watch}</td>
                  <td>
                    <div className="ru-ranking-table-actions">
                    <Link href={reviewHref} className="btn-outline">Русский обзор</Link>
                    <Link
                      href={`/go/${item.slug}?from=ru-ranking-partner-shortlist`}
                      rel="sponsored nofollow noopener"
                      className="btn-primary"
                    >
                      Проверить условия <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">Цены показываются в исходной валюте без промоакций и без временного пересчёта USD/EUR. Если продуктовый захват выйдет за 30-дневное окно, его числа исчезнут из матрицы до повторной проверки.</p>
        </div>
      </section>

      <section className="ru-section" id="po-zadache">
        <div className="ru-shell" data-russian-ranking-intent-paths="payout-drawdown-budget">
          <h2>Какую проп-фирму выбрать по задаче</h2>
          <p className="ru-muted">Цена, отсутствие челленджа или выплата в криптовалюте описывают только 1 фильтр. В каждой карточке ниже есть второй фильтр, который способен отменить решение.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Минимальный бюджет в USD</h3>
              <p>В свежем партнёрском наборе минимальный опубликованный вход FundingPips — {fundingPipsProfile?.entry ?? 'не подтверждён'}, а FundedNext — {fundedNextProfile?.entry ?? 'не подтверждён'}. Разница в цене не сравнивает число фаз, drawdown, consistency или возврат взноса.</p>
              <p><Link href="/ru/fundednext-vs-fundingpips">Сравнить FundedNext и FundingPips по продуктам →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Цена в EUR</h3>
              <p>Bright Funded хранит собственную EUR-деноминацию: текущий вход начинается от {brightFundedProfile?.entry ?? 'не подтверждён'}. Мы не превращаем EUR в USD по курсу дня, потому что такой пересчёт быстро устаревает и скрывает банковскую конвертацию.</p>
              <p><Link href="/ru/obzor-bright-funded">Проверить 3 программы Bright Funded →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Без челленджа / instant funding</h3>
              <p>FundedNext Stellar Instant и FundingPips Zero имеют 0 оценочных фаз, но оба используют trailing-границу. Instant начинается с 70% reward share; Zero — с 95% в текущем продукте, но добавляет дневной лимит и consistency-rule.</p>
              <p><Link href="/ru/prop-firmy-bez-chelendzha">Открыть отдельное сравнение проп-фирм без challenge →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Статическая просадка</h3>
              <p>Статический максимум встречается у FundedNext 2-Step, 1-Step и Lite, у нескольких FundingPips 1-Step/2-Step и у Bright 2-Step Bright/Classic. Сравнивайте точные 6%, 8%, 10% или 12%, а не фирму целиком.</p>
              <p><Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">Разобрать static, trailing и EOD drawdown →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Выплата в crypto</h3>
              <p>Все 3 партнёрских профиля перечисляют crypto среди payout-методов, но сеть, минимум, комиссия и доступность по стране различаются. Bright описывает USDC ERC-20; FundedNext и FundingPips требуют отдельной проверки точного маршрута.</p>
              <p><Link href="/ru/vyplaty-prop-firm">Сравнить сроки и способы выплат →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Отзывы и риск отказа</h3>
              <p>Trustpilot помогает найти повторяющиеся темы, но не доказывает будущий reward. Сверяйте продукт, дату, названное правило, ответ фирмы и подтверждение payout; не смешивайте отзыв о support с доказательством платёжеспособности.</p>
              <p><Link href="/ru/otzyvy-prop-firm">Открыть методику проверки отзывов →</Link></p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="polnyy-reyting">
        <div className="ru-shell">
          <h2>Полный текущий рейтинг</h2>
          <p className="ru-muted">Если у фирмы устареет хотя бы один продукт, она исчезнет из этой таблицы до следующей проверки источников.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead>
                <tr><th>Место</th><th>Фирма</th><th>Балл</th><th>Продукты</th><th>Сплиты</th><th>Проверено</th><th>Связь</th></tr>
              </thead>
              <tbody>
                {ranked.map((item, index) => {
                  const splits = [...new Set(item.products.flatMap(product =>
                    product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
                  const latest = item.products.map(product => product.sourceCapturedAt).sort().at(-1)
                  return (
                    <tr key={item.slug}>
                      <td>{index + 1}</td>
                      <td><Link href={item.slug === 'ftmo' ? '/ru/obzor-ftmo' : item.slug === 'fundednext' ? '/ru/obzor-fundednext' : item.slug === 'fundingpips' ? '/ru/obzor-fundingpips' : item.slug === 'bright-funded' ? '/ru/obzor-bright-funded' : item.firm.reviewUrl}>{item.firm.name}</Link></td>
                      <td>{item.firm.score.toFixed(1)}/10</td>
                      <td>{item.products.length}</td>
                      <td>{splits.length > 0 ? `${splits.join('–')}%` : '—'}</td>
                      <td>{latest}</td>
                      <td>{item.firm.affiliateUrl ? 'партнёрская' : 'официальная'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ranking">
            Некоторые фирмы используют партнёрские ссылки: мы можем получить комиссию,
            если читатель зарегистрируется после перехода. Это не меняет редакционный
            балл, место, набор фактов или правила контроля свежести.
          </div>
        </div>
      </section>

      <section className="ru-section" id="kak-vybrat">
        <div className="ru-shell ru-content">
          <h2>Как выбрать проп-фирму, а не рекламный максимум</h2>
          <ol>
            <li><strong>Страна и профиль.</strong> Подтвердите резидентство, гражданство, KYC, IP, карту и payout-метод до сравнения цен.</li>
            <li><strong>Рынок.</strong> CFD, фьючерсы, биржевая торговля и crypto-only продукты нельзя считать взаимозаменяемыми.</li>
            <li><strong>Полная стоимость.</strong> Сравните конкретный размер счёта, платформенную плату, add-ons, reset и условие возврата взноса.</li>
            <li><strong>Failure-point.</strong> Найдите daily loss, maximum loss и момент расчёта drawdown: real-time, EOD, баланс или equity.</li>
            <li><strong>Reward.</strong> Проверьте базовый сплит, первую дату запроса, consistency, минимальные прибыльные дни и фактический payout-rail.</li>
            <li><strong>Доказательство.</strong> Сохраните страницу продукта и checkout с датой; рекламный баннер или отзыв не заменяет правило в договоре.</li>
          </ol>
          <p>
            Если ключевой фильтр — 0 фаз, откройте <Link href="/ru/prop-firmy-bez-chelendzha">рейтинг instant funding</Link>.
            Для crypto-рынка используйте <Link href="/ru/luchshie-kripto-prop-firmy">отдельное сравнение crypto-проп-фирм</Link>,
            а для продуктового уровня — <Link href="/prop-firm-challenges" hrefLang="en">полный фильтр челленджей на английском</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="rossiyskie-firmy">
        <div className="ru-shell ru-content">
          <h2>А что насчёт российских проп-компаний</h2>
          <p>Локальные фирмы полезны как отдельная продуктовая модель, особенно если трейдеру нужны Московская биржа, обучение, отбор в команду или расчёты внутри местной инфраструктуры. Но российская проп-компания и глобальный CFD challenge решают разные задачи; одинаковое слово «проп» не делает их взаимозаменяемыми.</p>
          <p>Мы уже отделяем <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-eratrade">EraTrade</Link> и <Link href="/ru/obzor-kascapital">KASCapital</Link> от глобального рейтинга. В местных обзорах проверяются юридическое лицо, рынок, модель отбора, платежи и публичные правила; если партнёрской программы нет, обзор всё равно может помочь читателю понять разницу и вернуться к глобальному shortlist осознанно.</p>
          <div className="ru-notice">
            <strong>Маршрут без смешивания моделей.</strong> Сначала откройте <Link href="/ru/rossiyskie-prop-kompanii">проверку российских проп-компаний</Link>. Если нужен именно глобальный funded account на CFD, вернитесь к матрице FundedNext, FundingPips и Bright Funded и заново проверьте страну.
          </div>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
      </article>
    </>
  )
}
