import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgePercent, BookOpenCheck, Building2, ChartCandlestick, Database, Globe2, Scale, SearchCheck, ShieldAlert, WalletCards, Zap } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru'
const TITLE = 'Проп-фирмы: обзоры, цены и правила на русском'
const DESCRIPTION = 'Русская версия Traders Fund Hub: сравнение проп-фирм, цены челленджей, просадки, выплаты и правила по данным из первичных источников.'
const BRIGHT_REWARD_URL = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое онлайн-проп-фирма?',
    a: 'Это компания с программой оценки: трейдер оплачивает доступ к симулированному счёту, выполняет цель по прибыли и соблюдает лимиты риска. После успешной оценки фирма может предложить следующий симулированный или реальный этап и долю вознаграждения по договору.',
  },
  {
    q: 'Означает ли русская версия, что фирма работает с резидентами России?',
    a: 'Нет. Язык страницы не подтверждает доступность страны. Перед оплатой нужно проверить ограничения по гражданству и резидентству, KYC, способ оплаты, платформу и способ выплаты на официальном сайте конкретной фирмы.',
  },
  {
    q: 'Почему цены указаны в долларах или евро, а не в рублях?',
    a: 'Мы сохраняем валюту, в которой фирма публикует цену. Пересчёт в рубли быстро устаревает из-за курса и может скрыть комиссию банка или платёжного провайдера.',
  },
]

const featuredPartnerRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext', heroHref: '/go/fundednext?from=ru-home-hero-fundednext' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded', heroHref: '/go/bright-funded?from=ru-home-hero-bright-funded' },
] as const

const relatedSearchRoutes: Record<string, { href: string; label: string }> = {
  'рейтинг проп трейдинговых компаний': {
    href: '/ru/luchshie-prop-firmy',
    label: 'Открыть русский рейтинг',
  },
  'ftmo проп компания сайт официальный': {
    href: '/ru/obzor-ftmo',
    label: 'Открыть русский обзор FTMO и официальный домен',
  },
  'forex prop': {
    href: '/ru/forex-prop-firmy',
    label: 'Сравнить forex-продукты, плечо и платформы',
  },
  'проп форекс': {
    href: '/ru/forex-prop-firmy',
    label: 'Сравнить forex-продукты, плечо и платформы',
  },
  'пипсы проп компания': {
    href: '/ru/obzor-fundingpips',
    label: 'Читать обзор FundingPips',
  },
}

export default function RussianHomePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const freshFirmSlugs = new Set(freshChallenges.map(challenge => challenge.firmSlug))
  const fullyFreshFirmCount = [...freshFirmSlugs].filter(slug => {
    const products = challenges.filter(challenge => challenge.firmSlug === slug)
    return products.length > 0 && products.every(product => isChallengeFresh(product))
  }).length
  const pricedProductCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length
  const firstPartySourceCount = new Set(freshChallenges.map(challenge => challenge.sourceUrl)).size
  const latestCapture = freshChallenges.map(challenge => challenge.sourceCapturedAt).sort().at(-1)
  const featuredPartnerCards = featuredPartnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    const priceCount = products.reduce((total, product) => total + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0),
    ).length, 0)
    const captureDate = products.map(product => product.sourceCapturedAt).sort().at(-1)
    return { ...route, firm, products, priceCount, captureDate }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия' },
  ])
  const faq = faqPageSchema(faqs)
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-eyebrow"><SearchCheck size={14} aria-hidden="true" /> Русская версия</div>
          <h1>Проп-фирмы: цены, правила и выплаты без рекламного тумана</h1>
          <p className="ru-lead">
            Сравниваем не обещания брендов, а конкретные продукты: стоимость входа,
            тип просадки, этапы оценки, базовую долю прибыли и условия выплаты.
            Каждая цифра привязана к первичному источнику и дате проверки.
          </p>
          <div className="ru-home-partner-hero" data-russian-home-hero-partners="fundednext-bright-funded">
            {featuredPartnerCards.map(item => {
              const isFundedNext = item.slug === 'fundednext'
              return (
                <article
                  className={`ru-home-partner-hero-card${isFundedNext ? ' ru-home-partner-hero-card--fundednext' : ' ru-home-partner-hero-card--bright'}`}
                  key={item.slug}
                  data-russian-home-hero-partner={item.slug}
                >
                  <div className="ru-home-partner-hero-brand">
                    {item.firm?.logo ? (
                      <span className="ru-home-partner-hero-logo" aria-hidden="true">
                        <Image src={item.firm.logo} alt="" width={72} height={72} />
                      </span>
                    ) : null}
                    <div>
                      <span className="ru-home-partner-hero-label">Основной глобальный партнёр</span>
                      <h2>{item.name}</h2>
                    </div>
                  </div>
                  <p>
                    {isFundedNext
                      ? '4 актуальные модели в USD, включая Stellar Instant без evaluation; для Stellar 1-Step первое payout-окно открывается через 5 рабочих дней.'
                      : '3 evaluation-модели в EUR; официальный payout-маршрут включает USDC ERC-20 или банковский reward в EUR, а стандартное первое окно открывается через 30 дней.'}
                  </p>
                  <div className="ru-home-partner-hero-facts" aria-label={`Охват данных ${item.name}`}>
                    <span><strong>{item.products.length}</strong> продукта</span>
                    <span><strong>{item.priceCount}</strong> опубликованных цен</span>
                    <span><strong>{item.captureDate ?? '—'}</strong> дата проверки</span>
                  </div>
                  <div className="ru-home-partner-hero-actions">
                    <Link
                      href={item.heroHref}
                      rel="sponsored nofollow noopener"
                      className="btn-primary btn-glow"
                    >
                      Проверить условия {item.name} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link href={item.reviewHref} className="ru-home-partner-hero-review">
                      Сначала прочитать обзор
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="ru-actions ru-home-secondary-actions">
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">
              Сравнить двух партнёров
            </Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">
              Открыть полный рейтинг
            </Link>
          </div>
          <p className="ru-source-line ru-home-partner-hero-disclosure">
            FundedNext и Bright Funded коммерчески выделены как наши главные партнёры. Ссылки «Проверить условия» партнёрские:
            {' '}мы можем получить комиссию после регистрации. Язык страницы не подтверждает доступ — перед оплатой проверьте
            {' '}страну, KYC, платёжный маршрут и правила конкретного продукта.
          </p>
          <div className="ru-stats" aria-label="Текущий охват данных">
            <div className="ru-stat"><strong>{fullyFreshFirmCount}/{firms.length}</strong><span>фирм с полностью свежими продуктами</span></div>
            <div className="ru-stat"><strong>{freshChallenges.length}</strong><span>продуктов, проверенных не более 30 дней назад</span></div>
            <div className="ru-stat"><strong>{pricedProductCount}</strong><span>продуктов с опубликованной ценой</span></div>
            <div className="ru-stat"><strong>{firstPartySourceCount}</strong><span>уникальных первичных страниц</span></div>
          </div>
          <p className="ru-source-line">Последняя дата среди текущих захватов: {latestCapture ?? 'нет данных'}.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="language-not-access">
            <strong>Русский язык не означает доступность в России.</strong>{' '}
            Страница предназначена для русскоязычных трейдеров в разных странах.
            Доступ зависит от резидентства, гражданства, санкционных списков, KYC,
            платёжного маршрута и правил конкретного продукта. VPN не превращает
            запрещённую страну в разрешённую.
          </div>
        </div>
      </section>

      <section className="ru-section" id="glavnye-partnery">
        <div className="ru-shell" data-russian-home-featured-partners="fundednext-bright-funded">
          <div className="ru-notice ru-disclosure">
            <strong>Два главных партнёра Traders Fund Hub.</strong>{' '}
            Переходы на FundedNext и Bright Funded могут принести нам комиссию. Это коммерческое выделение,
            а не два первых места рейтинга: доступ, KYC, правила продукта и выплата проверяются до оплаты.
          </div>
          <h2>FundedNext и Bright Funded: два основных глобальных маршрута</h2>
          <p className="ru-muted">
            FundedNext даёт выбор между четырьмя текущими моделями в USD, а Bright Funded — между тремя программами
            с ценами в EUR. Карточки используют свежие продуктовые записи; русский обзор объясняет различия до перехода на официальный checkout.
          </p>
          <div className="ru-grid">
            {featuredPartnerCards.map(item => {
              const isFundedNext = item.slug === 'fundednext'
              return (
                <article className="ru-card" key={item.slug} data-russian-home-featured-partner={item.slug}>
                  <div className="ru-card-head">
                    <h3>{item.name}</h3>
                    <span className="ru-score">Главный партнёр</span>
                  </div>
                  <p className="ru-muted">
                    {isFundedNext
                      ? 'Stellar 2-Step, Stellar 1-Step, Stellar Lite и Stellar Instant нельзя оценивать как один продукт: этапы, возврат fee, просадка и первая выплата различаются.'
                      : '1-Step, 2-Step и 2-Step Bright публикуются в EUR; официальный источник отдельно называет USDC ERC-20 и банковский перевод в EUR как способы reward.'}
                  </p>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> Актуальные продукты: {item.products.length}</li>
                    <li><BadgePercent size={14} aria-hidden="true" /> Опубликованные цены: {item.priceCount}</li>
                    <li><SearchCheck size={14} aria-hidden="true" /> Последний продуктовый захват: {item.captureDate ?? 'нужно обновить'}</li>
                  </ul>
                  {!isFundedNext ? (
                    <p className="ru-source-line">
                      <a href={BRIGHT_REWARD_URL} target="_blank" rel="nofollow noopener">Источник Bright Funded о выплатах</a>: USDC-выплата не доказывает доступ к торговле криптовалютой.
                    </p>
                  ) : (
                    <p className="ru-source-line">Для резидентов России официальные формулировки FundedNext противоречат друг другу; обзор сохраняет этот конфликт вместо обещания доступа.</p>
                  )}
                  <div className="ru-actions">
                    <Link href={item.reviewHref} className="btn-outline">Русский обзор</Link>
                    <Link href={`/go/${item.slug}?from=ru-home-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                      Проверить {item.name} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="ru-actions">
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary">
              Сравнить FundedNext и Bright Funded <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить способы выплаты</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Начните с задачи, а не с бренда</h2>
          <p className="ru-muted">
            Русская версия объединяет 22 самостоятельные страницы под разные поисковые задачи,
            включая отдельную проверку компаний российского рынка. Мы не переводим сотни URL автоматически: сначала проверяем,
            отвечает ли локальная страница на самостоятельный поисковый запрос.
          </p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-home-definition-entry="prop-kompanii-eto">
              <BookOpenCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Что такое проп-фирма</h3>
              <p className="ru-muted">Три разные модели слова «проп», 5 этапов глобального retail-продукта и 8 полей проверки до checkout.</p>
              <Link className="ru-card-link" href="/ru/chto-takoe-prop-firma">Понять модель и риски →</Link>
            </article>
            <article className="ru-card">
              <Database size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Лучшие проп-фирмы 2026</h3>
              <p className="ru-muted">Редакционный порядок отдельно от партнёрских отношений, плюс количество продуктов, цены и дата источников.</p>
              <Link className="ru-card-link" href="/ru/luchshie-prop-firmy">Сравнить фирмы →</Link>
            </article>
            <article className="ru-card">
              <BookOpenCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Обзор FundedNext</h3>
              <p className="ru-muted">22 опубликованные цены, четыре модели и отдельная проверка противоречивых ограничений для резидентов России.</p>
              <Link className="ru-card-link" href="/ru/obzor-fundednext">Проверить FundedNext →</Link>
            </article>
            <article className="ru-card" data-russian-home-ftmo-entry="non-affiliate-to-partners">
              <BookOpenCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Обзор FTMO</h3>
              <p className="ru-muted">2 программы, 10 цен в EUR и прямое ограничение для Российской Федерации; русскоязычные жители других стран получают отдельную проверку профиля и маршруты к FundedNext и Bright Funded.</p>
              <Link className="ru-card-link" href="/ru/obzor-ftmo">Проверить FTMO и альтернативы →</Link>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Пять этапов челленджа</h3>
              <p className="ru-muted">От оплаты до выплаты: где действует цель по прибыли, как считается просадка и когда появляется правило консистенции.</p>
              <Link className="ru-card-link" href="/ru/kak-rabotayut-chellendzhi-prop-firm">Разобрать этапы →</Link>
            </article>
            <article className="ru-card">
              <Building2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Российские проп-компании</h3>
                <p className="ru-muted">Era Trade, PropLive, KasCapital, А-Лаб, TeamTraders и Trade System: проверяемые цифры, различия моделей и публичный статус партнёрских программ без выдачи списка за рекомендацию.</p>
                <Link className="ru-card-link" href="/ru/rossiyskie-prop-kompanii">Посмотреть 6 примеров →</Link>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Крипто-проп-фирмы</h3>
              <p className="ru-muted">Отделяем источник с разрешёнными криптоинструментами от оплаты или выплаты в криптовалюте и проверяем продуктовые правила.</p>
              <Link className="ru-card-link" href="/ru/luchshie-kripto-prop-firmy">Сравнить криптомаршруты →</Link>
            </article>
            <article className="ru-card" data-russian-home-forex-entry="prop-forex">
              <ChartCandlestick size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Forex-проп-фирмы</h3>
              <p className="ru-muted">7 продуктов, 43 опубликованные пары FundedNext, плечо 1:30 или 1:100 и отдельная проверка платформы по стране.</p>
              <Link className="ru-card-link" href="/ru/forex-prop-firmy">Сравнить forex-продукты →</Link>
            </article>
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Русскоязычные трейдеры за рубежом</h3>
              <p className="ru-muted">Разделяем язык, гражданство, резидентство и KYC, чтобы вести подходящих читателей к глобальным продуктам без обещаний доступа.</p>
              <Link className="ru-card-link" href="/ru/dlya-russkoyazychnykh-treyderov">Пройти проверку доступа →</Link>
            </article>
            <article className="ru-card">
              <Scale size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext или Bright Funded</h3>
              <p className="ru-muted">Главное сравнение русской версии: 7 продуктов, 40 цен, USD против EUR, static против trailing, выплаты, KYC и отдельные CTA обеих фирм.</p>
              <Link className="ru-card-link" href="/ru/fundednext-vs-bright-funded">Сравнить главных партнёров →</Link>
            </article>
            <article className="ru-card">
              <Scale size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext или FundingPips</h3>
              <p className="ru-muted">Продуктовое сравнение двух глобальных партнёров: цена, просадка, сплит, первая выплата и отдельные CTA без единого навязанного победителя.</p>
              <Link className="ru-card-link" href="/ru/fundednext-vs-fundingpips">Сравнить партнёров →</Link>
            </article>
            <article className="ru-card" data-russian-home-deals-partners="fundednext-bright-funded">
              <BadgePercent size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Промокоды FundedNext и Bright Funded</h3>
              <p className="ru-muted">5 свежих предложений: персональные 5% FundedNext после Free Trial, 3 публичных кода Bright Funded и HELLO от FundingPips.</p>
              <Link className="ru-card-link" href="/ru/promokody-prop-firm">Сравнить коды и итоговые цены →</Link>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Выплаты проп-фирм</h3>
              <p className="ru-muted">Первая выплата, Crypto, банковский перевод и KYC — только по свежим условиям на странице самой фирмы.</p>
              <Link className="ru-card-link" href="/ru/vyplaty-prop-firm">Сравнить выплаты →</Link>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Проп-фирмы без KYC</h3>
              <p className="ru-muted">Разбираем запрос «без верификации» и проверяем, что произойдёт перед первой выплатой.</p>
              <Link className="ru-card-link" href="/ru/prop-firmy-bez-kyc">Проверить KYC →</Link>
            </article>
            <article className="ru-card">
              <Zap size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Проп-фирмы без челленджа</h3>
              <p className="ru-muted">FundedNext Stellar Instant и FundingPips Zero — 2 подтверждённых партнёрских phase-0 маршрута; Bright Funded отделён как challenge-based альтернатива.</p>
              <Link className="ru-card-link" href="/ru/prop-firmy-bez-chelendzha">Сравнить instant funding →</Link>
            </article>
          </div>
          <p className="ru-source-line">
            Глобальные партнёрские разборы на русском:{' '}
            <Link href="/ru/obzor-ftmo">FTMO</Link>,{' '}
            <Link href="/ru/obzor-fundingpips">FundingPips</Link> и{' '}
            <Link href="/ru/obzor-bright-funded">Bright Funded</Link>. Сначала подтвердите страну и правила продукта.
            {' '}Локальные разборы: <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-eratrade">Era Trade</Link> и <Link href="/ru/obzor-kascapital">KasCapital</Link>. <Link href="/ru/otzyvy-prop-firm">Отзывы о проп-фирмах</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Почему русская версия появилась сейчас</h2>
          <p>
            Независимый снимок Yandex Moscow за январь 2026 года оценивал частотность
            запроса «проп компании» в {marketEvidence.searchDemand.queries[0].monthlyFrequency},
            а «проп компании для трейдеров в россии» — в{' '}
            {marketEvidence.searchDemand.queries[1].monthlyFrequency} показов в месяц.
            Анализируемый молодой сайт получил примерно {marketEvidence.searchDemand.estimatedClicks}{' '}
            переходов из Яндекса за месяц и находился в топ-50 по{' '}
            {marketEvidence.searchDemand.top50Queries} запросам.
          </p>
          <p className="ru-muted">
            Это сторонняя оценка, а не данные Яндекс Вебмастера, и пересекающиеся
            частотности нельзя складывать. Мы используем её как сигнал для небольшого
            теста, а не как обещание трафика или дохода.{' '}
            <a href={marketEvidence.searchDemand.sourceUrl} target="_blank" rel="noopener noreferrer">
              Проверить источник оценки
            </a>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-search-intent="related-queries">
          <h2>Смежные русские запросы и полезные маршруты</h2>
          <p>
            Тот же снимок поискового спроса содержит более узкие формулировки. Мы показываем их как
            редакционные входы в соответствующий материал, а не как обещание объёма или доступности фирмы.
            Частотности относятся к Яндексу в Москве за январь 2026 года и могут пересекаться.
          </p>
          <ul className="ru-facts">
            {marketEvidence.searchDemand.queries.slice(5).map(item => {
              const route = relatedSearchRoutes[item.query]
              return (
                <li key={item.query}>
                  <SearchCheck size={14} aria-hidden="true" />
                  <span>
                    <strong>{item.query}</strong> — {item.monthlyFrequency} показов в месяц.{' '}
                    {route ? <Link href={route.href}>{route.label}</Link> : 'Материал готовится после проверки источников.'}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="ru-source-line">
            Источник и методика оценки указаны выше; значения нельзя складывать в общий размер аудитории.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Короткий словарь правил</h2>
          <div className="ru-grid">
            <article className="ru-card"><h3>Статическая просадка</h3><p className="ru-muted">Линия максимального убытка остаётся на фиксированном уровне, если правила продукта не говорят иначе.</p></article>
            <article className="ru-card"><h3>Трейлинг-просадка</h3><p className="ru-muted">Линия риска движется за максимумом баланса или эквити; момент фиксации зависит от продукта.</p></article>
            <article className="ru-card"><h3>Правило консистенции</h3><p className="ru-muted">Ограничивает долю самого прибыльного дня или сделки в общей прибыли. Формула и этап применения должны быть указаны фирмой.</p></article>
            <article className="ru-card"><h3>Доля прибыли</h3><p className="ru-muted">Доля вознаграждения трейдера (profit split). Базовый процент нельзя подменять максимумом после платного дополнения или масштабирования.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
