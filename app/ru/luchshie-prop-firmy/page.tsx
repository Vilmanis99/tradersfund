import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, BadgeCheck, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianChallengeFinder from '@/components/RussianChallengeFinder'
import { getRussianFinderRows } from '@/lib/challengeComparisonData'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import brightEvidence from '@/content/data/russian-bright-funded-evidence.json'
import fundingPipsAccessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'

const PATH = '/ru/luchshie-prop-firmy'
// Re-evaluate source age at runtime; regeneration does not re-verify firm terms.
export const revalidate = 3600
const TITLE = 'Проп-компании в России и за рубежом: рейтинг 2026'
const DESCRIPTION = 'Сравните проп-компании для трейдеров в России и за рубежом: цены, просадка, KYC, выплаты и программы без челленджа по проверенным источникам.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs = (instantAnswer: string, fundingPipsAccessCurrent: boolean, brightCountryCurrent: boolean): RussianFaqItem[] => [
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
    a: 'Перед выбором фирмы проверьте, принимает ли она ваше гражданство, страну проживания и документы для подтверждения личности (KYC). Затем уточните способы оплаты и получения прибыли. Русскоязычным трейдерам в разных странах доступны наши обзоры FundedNext, FundingPips и BrightFunded с отдельным разбором этих условий.',
  },
  {
    q: 'Какая проп-фирма работает с резидентами России?',
    a: `Этот рейтинг не подтверждает доступ у глобальных фирм для резидентов России. Официальные страницы FundedNext противоречат друг другу; ${fundingPipsAccessCurrent ? `по справке FundingPips от ${fundingPipsAccessEvidence.sourceCapturedAt} действуют ограничения по резидентству и санкционным спискам` : `страновая справка FundingPips от ${fundingPipsAccessEvidence.sourceCapturedAt} требует повторной проверки`}; ${brightCountryCurrent ? 'справка и условия BrightFunded расходятся по Пакистану, а отсутствие России в проверенных списках не означает, что фирма примет документы и оплату' : 'страновые источники BrightFunded требуют повторной проверки; прежнее отсутствие России в списках не подтверждает доступ сегодня'}. До покупки получите письменное подтверждение для своего профиля. Компании, работающие с местной биржевой инфраструктурой, разобраны в отдельном списке российских проп-компаний.`,
  },
  {
    q: 'Есть ли проп-фирмы без челленджа?',
    a: instantAnswer,
  },
  {
    q: 'Какие проп-фирмы выплачивают в криптовалюте?',
    a: 'В данных FundedNext, FundingPips и BrightFunded указаны выплаты в криптовалюте. Конкретная монета, сеть, минимум, комиссия и доступность зависят от фирмы и страны, поэтому сначала откройте разбор выплат, а затем подтвердите метод в своём профиле.',
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
    country: 'Доступ зависит от резидентства и санкционных ограничений; сверяйте действующие правила до оплаты.',
    payout: 'В профиле перечислены карта, банковский перевод, Rise и криптовалюта; сроки выплаты зависят от программы.',
    watch: 'По программам различаются доля трейдера, ограничения на прибыль за один день и удержание позиций на выходных.',
  },
  'bright-funded': {
    start: 'Нужна программа с ценой в EUR и одним или двумя оценочными этапами.',
    country: 'Справка и условия BrightFunded расходятся по Пакистану; отсутствие России в проверенных списках не подтверждает возможность покупки или выплаты.',
    payout: 'Банковский перевод в EUR и USDC ERC-20 описаны в официальном справочнике.',
    watch: 'Обычная первая выплата указана через 30 дней; справочник противоречиво описывает двухнедельный цикл как платную опцию.',
  },
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const russianReviewRoutes: Record<string, string> = {
  'bright-funded': '/ru/obzor-bright-funded',
  'era-trade': '/ru/obzor-eratrade',
  ftmo: '/ru/obzor-ftmo',
  fundednext: '/ru/obzor-fundednext',
  fundingpips: '/ru/obzor-fundingpips',
  kascapital: '/ru/obzor-kascapital',
  proplive: '/ru/obzor-proplive',
  teamtraders: '/ru/obzor-teamtraders',
}

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
  const instantProducts = challenges.filter(product => product.phases === 0 && isChallengeFresh(product))
  const instantPartnerExamples = instantProducts.filter(product =>
    (product.firmSlug === 'fundednext' && product.productSlug === 'stellar-instant')
    || (product.firmSlug === 'fundingpips' && product.productSlug === 'zero'))
  const instantNames = instantPartnerExamples.map(product =>
    product.firmSlug === 'fundednext' ? `FundedNext ${product.productName}` : product.productName).join(' и ')
  const instantSummary = instantProducts.length > 0
    ? `В текущих данных сравнения есть программы без оценочных этапов${instantNames ? `, в том числе ${instantNames}` : ''}.`
    : 'Сейчас в данных сравнения нет программ без челленджа со свежей проверкой.'
  const instantFaqAnswer = `${instantProducts.length > 0 ? 'Да. ' : ''}${instantSummary} Перед покупкой сравните взнос, механизм просадки, условия выплаты и ограничения на распределение прибыли по торговым дням в отдельном сравнении счетов без челленджа.`
  const stellarInstantCurrent = instantPartnerExamples.some(product => product.firmSlug === 'fundednext')
  const freshnessHolds = firms
    .map(firm => {
      const slug = slugify(firm.name)
      const products = challenges.filter(challenge => challenge.firmSlug === slug)
      const staleProducts = products.filter(product => !isChallengeFresh(product))
      if (staleProducts.length === 0) return null
      return {
        firm,
        slug,
        staleProducts,
        oldest: staleProducts.map(product => product.sourceCapturedAt).sort()[0],
      }
    })
    .filter((item): item is {
      firm: (typeof firms)[number]
      slug: string
      staleProducts: Challenge[]
      oldest: string
    } => Boolean(item))
    .sort((a, b) => a.oldest.localeCompare(b.oldest) || a.firm.name.localeCompare(b.firm.name))
  const ranked = firms
    .map(firm => {
      const slug = slugify(firm.name)
      const products = challenges.filter(challenge => challenge.firmSlug === slug)
      return { firm, slug, products }
    })
    .filter(item => item.products.length > 0 && item.products.every(product => isChallengeFresh(product)))
    .sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))

  const fundingPipsAccessCurrent = isChallengeFresh({ sourceCapturedAt: fundingPipsAccessEvidence.sourceCapturedAt })
  const brightCountryCurrent = [brightEvidence.sources.countries, brightEvidence.sources.countryTerms]
    .every(source => isChallengeFresh({ sourceCapturedAt: source.sourceCapturedAt }))
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
      guidance: item.slug === 'fundingpips' ? {
        ...partnerGuidance[item.slug],
        country: fundingPipsAccessCurrent
          ? `По справке от ${fundingPipsAccessEvidence.sourceCapturedAt} резиденты ОАЭ и Вьетнама ограничены; также применяются санкционные списки.`
          : `Страновая справка от ${fundingPipsAccessEvidence.sourceCapturedAt} требует повторной проверки; старый список не подтверждает доступ сегодня.`,
      } : item.slug === 'bright-funded' ? {
        ...partnerGuidance[item.slug],
        country: brightCountryCurrent
          ? partnerGuidance[item.slug].country
          : 'Страновые источники BrightFunded требуют повторной проверки; старые списки не подтверждают доступ к покупке или выплате сегодня.',
      } : partnerGuidance[item.slug],
    }
  })
  const fundedNextProfile = partnerProfiles.find(item => item.slug === 'fundednext')
  const fundingPipsProfile = partnerProfiles.find(item => item.slug === 'fundingpips')
  const brightFundedProfile = partnerProfiles.find(item => item.slug === 'bright-funded')
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
  const faqPartnerSlugs = ['fundednext', 'bright-funded', 'fundingpips']
  const faqPartnerProducts = challenges.filter(product => faqPartnerSlugs.includes(product.firmSlug))
  const faqKycEvidence = marketEvidence.kycEvidence.filter(item => faqPartnerSlugs.includes(item.firmSlug))
  const faqPayoutEvidence = marketEvidence.payoutEvidence.filter(item => faqPartnerSlugs.includes(item.firmSlug))
  const brightCountrySources = {
    helpUrl: brightEvidence.sources.countries.sourceUrl,
    helpCapturedAt: brightEvidence.sources.countries.sourceCapturedAt,
    termsUrl: brightEvidence.sources.countryTerms.sourceUrl,
    termsCapturedAt: brightEvidence.sources.countryTerms.sourceCapturedAt,
    current: brightCountryCurrent,
  }
  const faqCurrent = faqPartnerSlugs.every(slug => faqPartnerProducts.some(product => product.firmSlug === slug)
    && faqKycEvidence.some(item => item.firmSlug === slug)
    && faqPayoutEvidence.some(item => item.firmSlug === slug))
    && faqPartnerProducts.every(product => isChallengeFresh(product))
    && [marketEvidence.capturedAt, brightEvidence.sources.countries.sourceCapturedAt, brightEvidence.sources.countryTerms.sourceCapturedAt, fundingPipsAccessEvidence.sourceCapturedAt,
      ...faqKycEvidence.map(item => item.sourceCapturedAt),
      ...faqPayoutEvidence.map(item => item.sourceCapturedAt)]
      .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы 2026' },
  ])
  const faqItems = faqs(instantFaqAnswer, fundingPipsAccessCurrent, brightCountryCurrent)
  const faq = faqPageSchema(faqItems)
  const list = itemListSchema(ranked.map(item => ({
    ...item.firm,
    name: item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name,
    reviewUrl: russianReviewRoutes[item.slug] ?? item.firm.reviewUrl,
  })), TITLE)
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      {faqCurrent && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Рейтинг</div>
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Для русскоязычных трейдеров в разных странах</div>
          <h1>Рейтинг проп-компаний 2026 для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Сравните проп-фирмы по стоимости участия, допустимому убытку и условиям выплаты прибыли.
            Начните с нужного формата: глобальная программа с проверкой навыков, счёт без челленджа
            или местная компания для биржевой торговли. Затем проверьте требования к вашей стране проживания.
          </p>
          <div className="ru-actions">
            <Link href="#podbor" className="btn-primary" data-russian-funnel-intent="ranking-finder">Подобрать программу <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#polnyy-reyting" className="btn-outline">Редакционный рейтинг</Link>
          </div>
          <p className="ru-lead ru-lead--intent">
            Если вы ищете проп-компании в России, сначала выберите сценарий: местная биржевая инфраструктура
            или глобальная программа для русскоязычного трейдера за рубежом. Русский язык страницы сам по себе
            не подтверждает доступность фирмы для резидента России.
          </p>
          <p className="ru-lead ru-lead--intent" data-russian-ranking-instant-status={instantProducts.length > 0 ? 'source-checked' : 'recapture-required'}>
            {instantProducts.length > 0
              ? 'В данных сравнения есть программы с оценочными этапами и программы без челленджа.'
              : 'Программы без челленджа в данных сравнения сейчас ожидают повторной проверки.'}
            Если источник старше 30 дней, фирма переносится в блок ожидания повторной проверки, а не показывается как актуальная.
          </p>
          <p className="ru-source-line">Автор рейтинга: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Данные ранжирования обновляются после проверки источников.</p>
          <p className="ru-source-line">Другой формат: <Link href="/ru/prop-firmy-bez-chelendzha">счета без челленджа</Link> · <Link href="/ru/rossiyskie-prop-kompanii">список проп-компаний в России</Link>.</p>
        </div>
      </section>

      <RussianChallengeFinder initialRows={finderRows} brightCountrySources={brightCountrySources} />

      <article data-russian-ranking-article="decision-first">
      <section className="ru-section ru-review-toc-section">
        <div className="ru-shell">
          <nav className="toc ru-review-toc" aria-label="Содержание рейтинга проп-фирм">
            <div className="toc-title">Содержание рейтинга</div>
            <ol>
              <li><a href="#bystryy-otvet">Краткий ответ</a></li>
              <li><a href="#glavnye-partnery">Партнёры: обзоры и ограничения</a></li>
              <li><a href="#strana">Выбор по стране</a></li>
              <li><a href="#po-zadache">Выбор по бюджету, просадке и выплатам</a></li>
              <li><a href="#polnyy-reyting">Расширенный список фирм</a></li>
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
          <p>Для сравнения глобальных программ начните с <Link href="/ru/fundednext-vs-bright-funded">FundedNext и BrightFunded</Link>: у них различаются валюты взноса, этапы оценки и условия просадки. {stellarInstantCurrent
            ? <>Если нужен счёт без оценочного этапа, изучите <Link href="/ru/fundednext-stellar-instant">Stellar Instant</Link> и его ограничения.</>
            : <>Если нужен счёт без оценочного этапа, проверьте <Link href="/ru/prop-firmy-bez-chelendzha">актуальные программы без челленджа</Link> и их ограничения.</>}{' '}Для торговли через местную биржевую инфраструктуру откройте отдельный список российских компаний выше.</p>
          <div className="ru-notice" data-russian-country-boundary="ranking-not-access">
            <strong>Это не рейтинг доступности в России.</strong>{' '}
            Он написан по-русски для мировой русскоязычной аудитории. Страна,
            гражданство, IP, KYC, карта и способ выплаты проверяются отдельно у каждой фирмы.
          </div>
        </div>
      </section>

      <section className="ru-section" id="glavnye-partnery">
        <span id="partner-matrix" aria-hidden="true" />
        <div className="ru-shell" data-russian-ranking-primary-partners="fundednext-bright-funded" data-russian-ranking-partners="single-section">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ranking-primary-partners">
            <strong>Партнёрские ссылки.</strong>{' '}
            FundedNext и BrightFunded — основные партнёры сайта; FundingPips — дополнительный партнёр. Мы можем получить комиссию при покупке по нашей ссылке.
            Партнёрство не добавляет баллы в рейтинге. Перед оплатой подтвердите доступность программы для своей страны и документов.
          </div>
          <h2>FundedNext или BrightFunded: с чего начать сравнение</h2>
          <p className="ru-muted">
            Сопоставьте валюту взноса, число этапов, торговую платформу, механизм просадки и способ получения прибыли.
            Подробный обзор объясняет ограничения каждой программы.
          </p>
          <div className="ru-grid ru-ranking-partner-grid">
            {partnerProfiles.map(item => {
              const isFundedNext = item.slug === 'fundednext'
              const secondary = item.slug === 'fundingpips'
              const partnerName = item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name
              const reviewHref = isFundedNext ? '/ru/obzor-fundednext' : secondary ? '/ru/obzor-fundingpips' : '/ru/obzor-bright-funded'
              const phaseCounts = [...new Set(item.products.map(product => product.phases))].sort((a, b) => a - b)
              return (
                <article className={`ru-card${secondary ? ' ru-ranking-secondary' : ''}`} key={item.slug} data-russian-ranking-primary-partner={secondary ? undefined : item.slug} data-russian-partner={item.slug}>
                  <div className="ru-card-head">
                    <h3>{partnerName}</h3>
                    <span className="ru-score">{secondary ? 'Дополнительный партнёр' : 'Основной партнёр'}</span>
                  </div>
                  <p>
                    {item.products.length > 0 ? item.guidance.start : 'Источники требуют повторной проверки. До обновления не используйте прежние цены и правила для выбора программы.'}
                  </p>
                  <ul className="ru-facts">
                    <li><BadgeCheck size={14} aria-hidden="true" /> Диапазон входа: {item.range}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Этапы: {phaseCounts.join(', ') || 'требуют проверки'}; просадка: {item.drawdowns.join(' / ') || 'требует проверки'}</li>
                    <li>Программ: {item.products.length}; опубликованных цен: {item.pricedTiers}. Разные размеры счёта нельзя сравнивать только по минимальному взносу.</li>
                  </ul>
                  {item.products.length > 0 && <details><summary>Страна, выплаты и важные ограничения</summary><p><strong>Страна:</strong> {item.guidance.country}</p><p><strong>Выплаты:</strong> {item.guidance.payout}</p><p><strong>Проверить:</strong> {item.guidance.watch}</p><p>Доступность платформы уточняйте для выбранной программы и страны.</p></details>}
                  {item.slug === 'bright-funded' && <p className="ru-source-line" data-russian-ranking-bright-country-conflict="help-six-terms-five" data-russian-ranking-bright-country-status={brightCountryCurrent ? 'dated' : 'recapture-required'}>
                    По проверке от {brightEvidence.sources.countries.sourceCapturedAt}{' '}
                    <a href={brightEvidence.sources.countries.sourceUrl} target="_blank" rel="nofollow noopener">справка BrightFunded</a> включала Пакистан;{' '}
                    <a href={brightEvidence.sources.countryTerms.sourceUrl} target="_blank" rel="nofollow noopener">условия</a> от {brightEvidence.sources.countryTerms.sourceCapturedAt} его не называли.{' '}
                    {brightCountryCurrent
                      ? 'Россия не названа в обоих списках, но это не подтверждает доступ вашего профиля. Уточните до оплаты.'
                      : 'Страновые условия требуют повторной проверки; отсутствие России в старых списках не подтверждает доступ сегодня.'}
                  </p>}
                  {item.slug === 'fundingpips' && <p className="ru-source-line" data-russian-ranking-fundingpips-country-status={fundingPipsAccessCurrent ? 'dated' : 'recapture-required'}>
                    <a href={fundingPipsAccessEvidence.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">Страновая справка FundingPips</a> от {fundingPipsAccessEvidence.sourceCapturedAt}.{' '}
                    {fundingPipsAccessCurrent
                      ? 'Ограничение касается резидентов ОАЭ и Вьетнама; индивидуальный доступ в других странах не подтверждён.'
                      : 'Условия требуют повторной проверки; прежний список не подтверждает доступ сегодня.'}
                  </p>}
                  <p className="ru-source-line">Самая ранняя проверка источников: {item.products.map(product => product.sourceCapturedAt).sort()[0] ?? 'обновление ожидается'}.</p>
                  <div className="ru-actions">
                    <Link href={reviewHref} className="btn-outline">{item.slug === 'bright-funded' ? 'Обзор BrightFunded' : 'Русский обзор'}</Link>
                    <Link
                      href={`/go/${item.slug}?from=ru-ranking-primary-${item.slug}`}
                      rel="sponsored nofollow noopener"
                      className="btn-primary"
                    >
                      {`Проверить ${partnerName} `}<ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="ru-source-line">
            Это партнёрская подборка, а не места в рейтинге. Для сравнения одинаковых размеров счёта используйте подбор программ выше; цены указаны до скидок и дополнительных опций.
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
              <p>У FundedNext официальные страницы противоречат друг другу; {fundingPipsAccessCurrent ? 'по проверенной справке FundingPips действуют ограничения по резидентству и санкционным спискам' : 'страновая справка FundingPips требует повторной проверки'}. {brightCountryCurrent ? 'Справка и условия BrightFunded расходятся по Пакистану; отсутствие России в проверенных списках не подтверждает возможность покупки.' : 'Страновые источники BrightFunded требуют повторной проверки; прежнее отсутствие России в списках не подтверждает доступ сегодня.'} Уточните условия для своих документов до оплаты.</p>
              <p><Link href="/ru/rossiyskie-prop-kompanii">Сначала открыть проверку России и местных компаний →</Link></p>
            </article>
            <article className="ru-card">
              <h3>ЕС или Великобритания</h3>
              <p>Сверяйте точное резидентство, валюту карты и банк. BrightFunded публикует цены в EUR; FundedNext и FundingPips — в USD. Мы не пересчитываем их в одну «дешёвую» цену по временному FX-курсу.</p>
              <p><Link href="/ru/dlya-russkoyazychnykh-treyderov">Открыть глобальный гид для русскоязычных →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Казахстан, Израиль или другая страна</h3>
              <p>Проверьте требования к гражданству, адресу и документам. Уточните, как оплатить участие и получить прибыль в своей стране: через банк, Rise или криптовалюту. Валюта взноса может отличаться от валюты выплаты.</p>
              <p><Link href="/ru/prop-firmy-bez-kyc">Почему «без KYC» не является безопасным фильтром →</Link></p>
            </article>
            <article className="ru-card">
              <h3>ОАЭ</h3>
              <p>{fundingPipsAccessCurrent ? 'По справке FundingPips резиденты ОАЭ ограничены, поэтому русскоязычному трейдеру с таким резидентством этот путь не подходит.' : `По справке от ${fundingPipsAccessEvidence.sourceCapturedAt} резиденты ОАЭ были ограничены; текущую политику нужно проверить заново.`} FundedNext и BrightFunded всё равно требуют отдельной проверки конкретного профиля и способа выплаты.</p>
              <p><a href={fundingPipsAccessEvidence.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">Справка FundingPips</a> от {fundingPipsAccessEvidence.sourceCapturedAt} · <Link href="/ru/obzor-fundingpips">русский обзор →</Link></p>
            </article>
          </div>
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
              <p>BrightFunded публикует цены в евро: минимальный взнос среди проверенных программ — {brightFundedProfile?.entry ?? 'не подтверждён'}. Если ваша карта в другой валюте, добавьте комиссию и курс конвертации своего банка.</p>
              <p><Link href="/ru/obzor-bright-funded">Проверить программы BrightFunded →</Link></p>
            </article>
            <article className="ru-card" data-russian-ranking-instant-card={instantProducts.length > 0 ? 'source-checked' : 'recapture-required'}>
              <h3>Мгновенное финансирование без челленджа</h3>
              <p>{instantSummary} {instantPartnerExamples.length === 2 && instantPartnerExamples.every(product => product.drawdownType === 'trailing')
                ? 'У обоих партнёрских примеров граница допустимого убытка поднимается вслед за результатом счёта.'
                : 'Механизм просадки нужно сверить по каждой программе.'} Сравните взнос и условия запроса выплаты перед выбором.</p>
              <p><Link href="/ru/prop-firmy-bez-chelendzha">Сравнить проп-фирмы без челленджа →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Статическая просадка</h3>
              <p>Статический максимум встречается у FundedNext 2-Step, 1-Step и Lite, у нескольких FundingPips 1-Step/2-Step и у Bright 2-Step Bright/Classic. Сравнивайте точные 6%, 8%, 10% или 12%, а не фирму целиком.</p>
              <p><Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">Разобрать виды просадки и момент расчёта →</Link></p>
            </article>
            <article className="ru-card">
              <h3>Выплата в криптовалюте</h3>
              <p>У всех трёх фирм указаны выплаты в криптовалюте, но сеть, минимум, комиссия и доступность по стране различаются. BrightFunded описывает USDC ERC-20; для FundedNext и FundingPips уточните монету и сеть в своём профиле.</p>
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
        <span id="top-5" aria-hidden="true" />
        <div className="ru-shell" data-russian-ranking="single-directory">
          <h2>Расширенный список проп-компаний по редакционной оценке</h2>
          <p className="ru-muted">В этом справочнике {ranked.length} фирм с актуальными по нашему сроку проверки источниками. Он шире подбора выше: включает разные рынки и фирмы, обзоры которых пока доступны только на английском. Это не единая таблица взаимозаменяемых программ.</p>
          <p className="ru-muted">Балл TFH — редакционная оценка, не рейтинг отзывов трейдеров и не вероятность выплаты. Минимальный взнос относится к самому дешёвому опубликованному размеру, а не обязательно к выбранному в подборе счёту. Если у фирмы устареет хотя бы один продукт, она исчезнет из этой таблицы до следующей проверки источников.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead>
                <tr><th>Место</th><th>Фирма и обзор</th><th>Балл TFH</th><th>Программы и вход</th><th>Доля трейдера / просадка</th><th>Самая ранняя проверка</th><th>Связь</th></tr>
              </thead>
              <tbody>
                {ranked.map((item, index) => {
                  const splits = [...new Set(item.products.flatMap(product =>
                    product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
                  const oldest = item.products.map(product => product.sourceCapturedAt).sort()[0]
                  const russianReview = russianReviewRoutes[item.slug]
                  const drawdowns = [...new Set(item.products.map(product => drawdownLabel(product.drawdownType)))]
                  return (
                    <tr key={item.slug} data-ranked-firm={item.slug}>
                      <td>{index + 1}</td>
                      <td><Link href={russianReview ?? item.firm.reviewUrl} hrefLang={russianReview ? 'ru' : 'en'}>{item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name}</Link><br /><small>{russianReview ? 'Обзор на русском' : 'Обзор на английском'}</small></td>
                      <td>{item.firm.score.toFixed(1)}/10</td>
                      <td>Программ: {item.products.length}<br />Минимальный взнос: {productPricing(item.products).entry}</td>
                      <td>{splits.length > 0 ? `${splits.join(' / ')}%` : 'не подтверждена'}<br />{drawdowns.join(' / ')}</td>
                      <td>{oldest}</td>
                      <td>{item.firm.affiliateUrl ? 'партнёрская' : 'официальная'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {freshnessHolds.length > 0 && (
            <aside className="review-freshness-notice ru-ranking-freshness-hold" data-russian-ranking-freshness-holds={freshnessHolds.length} aria-label="Проверка источников">
              <strong>Фирмы временно исключены из таблицы.</strong>{' '}
              У {freshnessHolds.length} фирм хотя бы один продукт старше 30 дней. Мы не показываем их цены и правила в рейтинге как текущие.
              <ul>
                {freshnessHolds.map(item => (
                  <li key={item.slug}>
                    <Link href={russianReviewRoutes[item.slug] ?? item.firm.reviewUrl}>{item.slug === 'bright-funded' ? 'BrightFunded' : item.firm.name}</Link> — {item.staleProducts.length} продукт(ов), самая ранняя проверка {item.oldest};{' '}
                    <a href={item.staleProducts[0].sourceUrl} target="_blank" rel="nofollow noopener">первичный источник</a>.
                  </li>
                ))}
              </ul>
            </aside>
          )}
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
            а для сравнения конкретных программ — <Link href="#podbor">подбор на русском в начале страницы</Link>.
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

      <section className="ru-section" id="faq" data-russian-ranking-faq-status={faqCurrent ? 'source-checked' : 'recheck-required'}>
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          {!faqCurrent && <p className="ru-muted">Часть источников по доступу, KYC или выплатам старше 30 дней. Перед покупкой перепроверьте условия выбранной фирмы для своего профиля.</p>}
          <RussianFaq items={faqItems} />
        </div>
      </section>
      </article>
    </>
  )
}
