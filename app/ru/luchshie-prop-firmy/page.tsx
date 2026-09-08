import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, BadgeCheck, Database, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianChallengeFinder from '@/components/RussianChallengeFinder'
import { getRussianFinderRows } from '@/lib/challengeComparisonData'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/luchshie-prop-firmy'
// Re-evaluate source age at runtime; regeneration does not re-verify firm terms.
export const revalidate = 3600
const TITLE = 'Лучшие проп-компании 2026: сравнение цен и правил'
const DESCRIPTION = 'Рейтинг проп-компаний для русскоязычных трейдеров: цены, просадка и выплаты. Сравните глобальные фирмы, счета без челленджа и российские компании.'

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
    a: 'Перед выбором фирмы проверьте, принимает ли она ваше гражданство, страну проживания и документы для подтверждения личности (KYC). Затем уточните способы оплаты и получения прибыли. Русскоязычным трейдерам в разных странах доступны наши обзоры FundedNext, FundingPips и Bright Funded с отдельным разбором этих условий.',
  },
  {
    q: 'Какая проп-фирма работает с резидентами России?',
    a: 'Этот рейтинг не подтверждает доступ у глобальных фирм для резидентов России. Официальные страницы FundedNext противоречат друг другу; FundingPips применяет ограничения по резидентству и санкционным спискам; отсутствие страны в списке Bright Funded само по себе не означает, что фирма примет документы и оплату. До покупки получите письменное подтверждение для своего профиля. Компании, работающие с местной биржевой инфраструктурой, разобраны в отдельном списке российских проп-компаний.',
  },
  {
    q: 'Есть ли проп-фирмы без челленджа?',
    a: 'Да. Например, FundedNext Stellar Instant и FundingPips Zero не требуют прохождения оценочных этапов. Такие программы называют мгновенным финансированием (instant funding). Перед покупкой сравните взнос, подвижный лимит просадки, условия запроса выплаты и ограничения на распределение прибыли по торговым дням. Эти правила разобраны в отдельном сравнении счетов без челленджа.',
  },
  {
    q: 'Какие проп-фирмы выплачивают в криптовалюте?',
    a: 'В данных FundedNext, FundingPips и Bright Funded указаны выплаты в криптовалюте. Конкретная монета, сеть, минимум, комиссия и доступность зависят от фирмы и страны, поэтому сначала откройте разбор выплат, а затем подтвердите метод в своём профиле.',
  },
  {
    q: 'Как проверять отзывы о проп-фирмах?',
    a: 'Используйте отзывы, чтобы найти возможные проблемы. Сопоставляйте дату, продукт, названное правило, размер счёта и ответ фирмы. Оценка Trustpilot сама по себе не подтверждает проверку документов или выплату конкретному трейдеру.',
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
    country: 'По России официальные страницы противоречат друг другу. Для других стран также проверьте требования к документам и оплате.',
    payout: 'В профиле указаны банковский перевод, Rise и криптовалюта; пороги и доступность различаются.',
    watch: 'На счёте после оценки действует 10-минутное новостное окно с 40% зачёта прибыли; Instant использует подвижный лимит просадки.',
  },
  fundingpips: {
    start: 'Нужен выбор между программами с одним, двумя оценочными этапами и счётом без челленджа.',
    country: 'ОАЭ и Вьетнам прямо ограничены по резидентству; также применяются санкционные списки.',
    payout: 'В профиле перечислены карта, банковский перевод, Rise и криптовалюта; сроки выплаты зависят от программы.',
    watch: 'По программам различаются доля трейдера, ограничения на прибыль за один день и удержание позиций на выходных.',
  },
  'bright-funded': {
    start: 'Нужна программа с ценой в EUR и одним или двумя оценочными этапами.',
    country: 'Опубликованный список ограничивает 6 стран; отсутствие страны в нём не гарантирует приём оплаты, документов или банковского перевода.',
    payout: 'Банковский перевод в EUR и USDC ERC-20 описаны в официальном справочнике.',
    watch: 'Обычная первая выплата указана через 30 дней; справочник противоречиво описывает двухнедельный цикл как платную опцию.',
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
  const finderRows = getRussianFinderRows()
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
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Для русскоязычных трейдеров в разных странах</div>
          <h1>Лучшие проп-компании 2026: рейтинг, цены и правила</h1>
          <p className="ru-lead">
            Сравните проп-фирмы по стоимости участия, допустимому убытку и условиям выплаты прибыли.
            Начните с нужного формата: глобальная программа с проверкой навыков, счёт без челленджа
            или местная компания для биржевой торговли. Затем проверьте требования к вашей стране проживания.
          </p>
          <div className="ru-actions">
            <Link href="#podbor" className="btn-primary">Подобрать программу <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#polnyy-reyting" className="btn-outline">Редакционный рейтинг</Link>
          </div>
          <p className="ru-source-line">Другой формат: <Link href="/ru/prop-firmy-bez-chelendzha">счета без челленджа</Link> · <Link href="/ru/rossiyskie-prop-kompanii">российские проп-компании</Link>.</p>
        </div>
      </section>

      <RussianChallengeFinder initialRows={finderRows} />

      <article data-russian-ranking-article="decision-first">
      <section className="ru-section ru-review-toc-section">
        <div className="ru-shell">
          <nav className="toc ru-review-toc" aria-label="Содержание рейтинга проп-фирм">
            <div className="toc-title">Содержание рейтинга</div>
            <ol>
              <li><a href="#bystryy-otvet">Краткий ответ</a></li>
              <li><a href="#glavnye-partnery">FundedNext и Bright Funded</a></li>
              <li><a href="#podbor">Подбор по задаче</a></li>
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
          <p><strong>Выбирайте программу по правилам, которые сможете соблюдать.</strong> Для начала определите рынок и бюджет. Затем сравните допустимый убыток, ограничения вашей стратегии и срок первой выплаты. Подтвердите гражданство, страну проживания и документы для проверки личности (KYC) до оплаты.</p>
          <p>Для сравнения глобальных программ начните с <Link href="/ru/fundednext-vs-bright-funded">FundedNext и Bright Funded</Link>: у них различаются валюты взноса, этапы оценки и условия просадки. Если нужен счёт без оценочного этапа, изучите <Link href="/ru/fundednext-stellar-instant">Stellar Instant</Link> и его ограничения. Для торговли через местную биржевую инфраструктуру откройте отдельный список российских компаний выше.</p>
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
            <strong>Партнёрские ссылки.</strong>{' '}
            Мы сотрудничаем с FundedNext и Bright Funded и можем получить комиссию после регистрации по нашей ссылке.
            Партнёрство не добавляет баллы в рейтинге. Перед оплатой подтвердите доступность программы для своей страны и документов.
          </div>
          <h2>FundedNext или Bright Funded: с чего начать сравнение</h2>
          <p className="ru-muted">
            Сопоставьте валюту взноса, число этапов, торговую платформу, механизм просадки и способ получения прибыли.
            Подробный обзор объясняет ограничения каждой программы.
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
                      : `${item.pricedTiers} опубликованных цен в EUR для ${item.products.length} программ оценки; доступность платформы уточняйте для выбранной программы и страны.`}
                  </p>
                  <ul className="ru-facts">
                    <li><BadgeCheck size={14} aria-hidden="true" /> Диапазон входа: {item.range}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Фазы: {phaseCounts.join(', ')}; просадка: {item.drawdowns.join(' / ')}</li>
                    <li>{isFundedNext
                      ? 'В профиле указаны банковский перевод, Rise и криптовалюта; доступность зависит от страны.'
                      : 'Официальный справочник описывает банковский перевод в EUR и USDC ERC-20.'}</li>
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
            Для дополнительного сравнения ниже приведены условия FundingPips. Все три фирмы также представлены в общем рейтинге по редакционной оценке.
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
              <p>У FundedNext официальные страницы противоречат друг другу; FundingPips применяет ограничения по резидентству и санкционным спискам. Отсутствие России в списке Bright Funded не подтверждает возможность покупки. Уточните условия для своих документов до оплаты.</p>
              <p><Link href="/ru/rossiyskie-prop-kompanii">Сначала открыть проверку России и местных компаний →</Link></p>
            </article>
            <article className="ru-card">
              <h3>ЕС или Великобритания</h3>
              <p>Сверяйте точное резидентство, валюту карты и банк. Bright Funded публикует цены в EUR; FundedNext и FundingPips — в USD. Мы не пересчитываем их в одну «дешёвую» цену по временному FX-курсу.</p>
              <p><Link href="/ru/dlya-russkoyazychnykh-treyderov">Открыть глобальный гид для русскоязычных →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Казахстан, Израиль или другая страна</h3>
              <p>Проверьте требования к гражданству, адресу и документам. Уточните, как оплатить участие и получить прибыль в своей стране: через банк, Rise или криптовалюту. Валюта взноса может отличаться от валюты выплаты.</p>
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
            <strong>Партнёрские ссылки.</strong>{' '}
            Переходы на сайты этих фирм могут принести нам комиссию. Она не влияет на редакционные оценки.
            Перед оплатой проверьте страну, гражданство, документы и способы получения прибыли.
          </div>
          <h2>Сравнение FundedNext, Bright Funded и FundingPips</h2>
          <p className="ru-muted">В этой таблице собраны наши партнёры. Используйте её для сравнения стоимости, просадки, выплат и ограничений. Порядок строк здесь не обозначает место в общем рейтинге.</p>
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
                  <td><strong>{item.firm.name}</strong><br />TFH {item.firm.score.toFixed(1)}/10<br />{item.products.length} программ / {item.pricedTiers} цен<br />проверено {item.products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'обновление ожидается'}</td>
                  <td>{item.range}<br />базовые сплиты {item.splits.length > 0 ? `${item.splits.join('–')}%` : 'не подтверждены'}<br />{item.drawdowns.join(' / ') || 'просадка не подтверждена'}</td>
                  <td>{item.guidance.start}</td>
                  <td><strong>Страна:</strong> {item.guidance.country}<br /><strong>Выплаты:</strong> {item.guidance.payout}<br /><strong>Проверить:</strong> {item.guidance.watch}</td>
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
          <p className="ru-source-line">Цены указаны в исходной валюте до скидок и банковской конвертации. Условия, проверенные более 30 дней назад, не показываем до обновления источников.</p>
        </div>
      </section>

      <section className="ru-section" id="po-zadache">
        <div className="ru-shell" data-russian-ranking-intent-paths="payout-drawdown-budget">
          <h2>Какую проп-фирму выбрать по задаче</h2>
          <p className="ru-muted">Цена, отсутствие челленджа или выплата в криптовалюте описывают только 1 фильтр. В каждой карточке ниже есть второй фильтр, который способен отменить решение.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Минимальный бюджет в USD</h3>
              <p>Среди проверенных программ минимальный взнос FundingPips — {fundingPipsProfile?.entry ?? 'не подтверждён'}, а FundedNext — {fundedNextProfile?.entry ?? 'не подтверждён'}. При сравнении учитывайте размер счёта, этапы, просадку, ограничения на прибыль за день и возврат взноса.</p>
              <p><Link href="/ru/fundednext-vs-fundingpips">Сравнить FundedNext и FundingPips по продуктам →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Цена в EUR</h3>
              <p>Bright Funded публикует цены в евро: минимальный взнос среди проверенных программ — {brightFundedProfile?.entry ?? 'не подтверждён'}. Если ваша карта в другой валюте, добавьте комиссию и курс конвертации своего банка.</p>
              <p><Link href="/ru/obzor-bright-funded">Проверить 3 программы Bright Funded →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Мгновенное финансирование без челленджа</h3>
              <p>У FundedNext Stellar Instant и FundingPips Zero нет оценочных этапов. В обоих случаях граница допустимого убытка поднимается вслед за результатом счёта. Сравните её расчёт, взнос и условия запроса выплаты перед выбором.</p>
              <p><Link href="/ru/prop-firmy-bez-chelendzha">Сравнить проп-фирмы без челленджа →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Статическая просадка</h3>
              <p>Статический максимум встречается у FundedNext 2-Step, 1-Step и Lite, у нескольких FundingPips 1-Step/2-Step и у Bright 2-Step Bright/Classic. Сравнивайте точные 6%, 8%, 10% или 12%, а не фирму целиком.</p>
              <p><Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">Разобрать виды просадки и момент расчёта →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Выплата в криптовалюте</h3>
              <p>У всех трёх фирм указаны выплаты в криптовалюте, но сеть, минимум, комиссия и доступность по стране различаются. Bright Funded описывает USDC ERC-20; для FundedNext и FundingPips уточните монету и сеть в своём профиле.</p>
              <p><Link href="/ru/vyplaty-prop-firm">Сравнить сроки и способы выплат →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Отзывы и риск отказа</h3>
              <p>Ищите в отзывах повторяющиеся проблемы. Сверяйте программу, дату, названное правило и ответ фирмы. Отзыв о скорости поддержки не подтверждает выплату: для этого нужны сведения о запросе и получении денег.</p>
              <p><Link href="/ru/otzyvy-prop-firm">Открыть методику проверки отзывов →</Link></p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="polnyy-reyting">
        <div className="ru-shell">
          <h2>Список проп-компаний по редакционной оценке</h2>
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
          <h2>Как составлен рейтинг и что проверить перед покупкой</h2>
          <p>Фирмы расположены по убыванию редакционной оценки TFH. В таблицу включаем только компании, у которых условия всех программ проверены не более 30 дней назад. Партнёрская ссылка и скидка не добавляют баллы. <Link href="/methodology" hrefLang="en">Подробная методика оценки — на английском</Link>.</p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{ranked.length}</strong><span>фирм в рейтинге</span></div>
            <div className="ru-stat"><strong>{ranked.reduce((sum, item) => sum + item.products.length, 0)}</strong><span>проверенных программ</span></div>
            <div className="ru-stat"><strong>{pricedProductCount}</strong><span>программ с опубликованной ценой</span></div>
            <div className="ru-stat"><strong>{latestCapture ?? '—'}</strong><span>последняя проверка источников</span></div>
          </div>
          <ol>
            <li><strong>Страна и документы.</strong> Подтвердите гражданство, резидентство, требования KYC, способы оплаты и получения прибыли.</li>
            <li><strong>Рынок.</strong> Определите, нужны ли вам CFD, фьючерсы, биржевая торговля или криптоинструменты.</li>
            <li><strong>Полная стоимость.</strong> Сравните одинаковый размер счёта, плату за платформу, дополнительные опции, повторную попытку и условия возврата взноса.</li>
            <li><strong>Лимиты убытка.</strong> Найдите дневной и общий лимиты. Уточните, учитывается ли открытый убыток и когда пересчитывается граница просадки: постоянно или в конце дня.</li>
            <li><strong>Выплаты.</strong> Проверьте долю трейдера, первую дату запроса, минимальное число прибыльных дней и ограничения на долю прибыли за один день.</li>
            <li><strong>Условия покупки.</strong> Сохраните правила программы и итоговую страницу оплаты с датой.</li>
          </ol>
          <p>
            Если хотите начать без оценочных этапов, откройте <Link href="/ru/prop-firmy-bez-chelendzha">рейтинг проп-фирм без челленджа</Link>.
            Для валютных пар используйте <Link href="/ru/forex-prop-firmy">сравнение форекс-программ</Link>,
            для криптоинструментов — <Link href="/ru/luchshie-kripto-prop-firmy">обзор крипто-проп-фирм</Link>,
            а для продуктового уровня — <Link href="/prop-firm-challenges" hrefLang="en">полный фильтр челленджей на английском</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="rossiyskie-firmy">
        <div className="ru-shell ru-content">
          <h2>Где искать российские проп-трейдинговые компании</h2>
          <p>Местная компания может быть полезна, если вам нужны Московская биржа, обучение или отбор в торговую команду. Сравните её договор, инструменты, комиссии и распределение прибыли отдельно от глобальных CFD-программ: условия одной модели нельзя переносить на другую.</p>
          <p>В отдельных обзорах <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-teamtraders">TeamTraders</Link>, <Link href="/ru/obzor-eratrade">Era Trade</Link> и <Link href="/ru/obzor-kascapital">KasCapital</Link> разобраны юридическое лицо, рынок, отбор трейдеров и опубликованные условия расчётов. Начните с компании, которая предлагает нужные вам инструменты и формат работы, затем изучите договор и расходы.</p>
          <div className="ru-notice">
            <strong>Сравните условия работы.</strong> В <Link href="/ru/rossiyskie-prop-kompanii">списке российских проп-компаний</Link> показаны различия местных моделей. Если интересует глобальная CFD-программа, используйте сравнение выше и отдельно подтвердите доступность в своей стране.
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
