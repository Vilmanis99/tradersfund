import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSearch,
  Globe2,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import {
  challengeCurrency,
  getAllChallenges,
  getAllFirms,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/otzyvy-prop-firm'
const TITLE = 'Отзывы о проп-фирмах 2026: как проверить выплаты'
const DESCRIPTION = 'Отзывы о проп-фирмах на русском: проверяем выплаты, блокировки, KYC и правила, затем сравниваем FundedNext и Bright Funded по свежим данным.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'проп фирмы отзывы',
    'отзывы о проп фирмах',
    'FundedNext отзывы',
    'Bright Funded отзывы',
    'проп фирма выплаты',
    'проп фирма скам',
  ],
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли выбрать проп-фирму только по отзывам?',
    a: 'Нет. Отзыв описывает один аккаунт и одну дату, а выбор требует как минимум 7 совпадений: продукт, размер счёта, этап, правило просадки, KYC, страна и способ выплаты. После отзыва откройте свежий первичный источник каждого правила.',
  },
  {
    q: 'Что считать доказательством выплаты проп-фирмы?',
    a: 'Полезный кейс называет продукт, размер счёта, дату запроса, сумму, способ выплаты, KYC и число дней ожидания. Скриншот без этих 7 полей подтверждает только изображение, но не действующее правило или доступность для другого резидентства.',
  },
  {
    q: 'Что проверять в отзывах о FundedNext?',
    a: 'Сначала определите 1 из 4 продуктов: Stellar 2-Step, Stellar 1-Step, Stellar Lite или Stellar Instant. У них различаются 0–2 этапа, просадка, возврат взноса и первая стандартная заявка; официальный конфликт по российским резидентам нужно разрешить письменно до оплаты.',
  },
  {
    q: 'Что проверять в отзывах о Bright Funded?',
    a: 'Сначала определите 1 из 3 программ и конкретный EUR-тариф. Базовые 80%, первая стандартная заявка и метод просадки зависят от продуктового контекста; USDC ERC-20 является способом выплаты, но не доказательством торговли BTC или ETH.',
  },
  {
    q: 'Означает ли негативный отзыв, что проп-фирма — скам?',
    a: 'Нет. Негативный отзыв — сигнал проверить названное событие. Для вывода нужны точное правило, версия договора, время сделки, этап аккаунта, ответ поддержки и подтверждение платежа; без этих 6 элементов нельзя отличить спор о правиле от системной проблемы.',
  },
  {
    q: 'Можно ли доверять отзывам о проп-фирмах без KYC?',
    a: 'Фраза «без KYC» часто относится только к регистрации или оплате. Проверка личности может появиться перед funded-этапом или первой выплатой, поэтому пройдите отдельный KYC-чек-лист до покупки и не используйте VPN либо неверные данные.',
  },
  {
    q: 'Чем российские проп-компании отличаются от глобальных челленджей?',
    a: 'PropLive описывает торговлю на Московской бирже через Финам, тогда как FundedNext и Bright Funded публикуют глобальные CFD-программы оценки. Рынок, договор, валюта, модель капитала и выплата различаются, поэтому один рейтинг для этих 2 моделей вводил бы в заблуждение.',
  },
  {
    q: 'Получает ли Traders Fund Hub партнёрскую комиссию?',
    a: 'Да. CTA FundedNext, Bright Funded и отдельно обозначенный FundingPips могут приносить комиссию. Партнёрство не добавляет баллы, не подтверждает страну и не гарантирует выплату; на странице оно отделено от таблицы первичных продуктовых данных.',
  },
]

const featuredRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

const secondaryRoute = {
  slug: 'fundingpips',
  name: 'FundingPips',
  reviewHref: '/ru/obzor-fundingpips',
} as const

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

const payoutFrequencyLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые 14 дней',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу',
}

function publishedTierCount(products: Challenge[]) {
  return products.reduce((total, product) => total + product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0),
  ).length, 0)
}

function priceRange(product: Challenge) {
  const currency = challengeCurrency(product)
  const values = product.accountSizes.flatMap(tier => {
    const value = currency === 'USD' ? tier.priceUsd : tier.priceEur
    return value != null && value > 0 ? [value] : []
  })
  if (values.length === 0) return 'не опубликована'
  const format = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  return minimum === maximum
    ? format.format(minimum)
    : `${format.format(minimum)}–${format.format(maximum)}`
}

function profitTargetLabel(product: Challenge) {
  const targets = product.profitTargets ? Object.values(product.profitTargets) : []
  return targets.length > 0 ? targets.map(value => `${value}%`).join(' / ') : 'нет цели оценки'
}

function phaseLabel(product: Challenge) {
  if (product.phases === 0) return 'Instant, 0 этапов'
  if (product.phases === 1) return '1 этап'
  return `${product.phases} этапа`
}

function lossLabel(product: Challenge) {
  const daily = product.dailyLossPct == null ? 'день —' : `день ${product.dailyLossPct}%`
  const maximum = product.maxLossPct == null ? 'максимум —' : `максимум ${product.maxLossPct}%`
  const method = product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : 'метод не указан'
  return `${daily}; ${maximum}; ${method}`
}

function payoutLabel(product: Challenge) {
  const first = product.payoutFirstDays == null ? 'первая дата не подтверждена' : `первая заявка: ${product.payoutFirstDays} дн.`
  const frequency = product.payoutFrequency
    ? payoutFrequencyLabels[product.payoutFrequency] ?? product.payoutFrequency
    : 'частота не подтверждена'
  return `${first}; затем ${frequency}`
}

function localClaim(operator: string, key: string) {
  const entry = marketEvidence.localFirmSignals.find(item => item.operator === operator)
  return (entry?.claims as Record<string, string | number | undefined> | undefined)?.[key]
}

export default function RussianPropFirmReviewsPage() {
  const firms = getAllFirms()
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const featuredCards = featuredRoutes.flatMap(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return firm?.affiliateUrl && products.length > 0
      ? [{ ...route, firm, products, priceCount: publishedTierCount(products) }]
      : []
  })
  const secondaryFirm = firms.find(candidate => outboundSlug(candidate.name) === secondaryRoute.slug)
  const secondaryProducts = freshChallenges.filter(product => product.firmSlug === secondaryRoute.slug)
  const featuredProducts = featuredCards.flatMap(card => card.products)
  const featuredPriceCount = publishedTierCount(featuredProducts)
  const latestCapture = featuredProducts.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? marketEvidence.capturedAt
  const lastModified = russianRouteDateModified(PATH, latestCapture)
  const fundedNextAccess = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Отзывы о проп-фирмах' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    dateModified: lastModified,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema(featuredCards.map(card => card.firm), TITLE)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-reviews-guide="long-form-source-gated">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Отзывы о проп-фирмах</div>
          <div className="ru-eyebrow"><FileSearch size={14} aria-hidden="true" /> Проверка кейса до регистрации</div>
          <h1>Отзывы о проп-фирмах: проверка выплат, правил и KYC</h1>
          <p className="ru-lead">
            Положительный или отрицательный отзыв без даты, продукта и названного правила нельзя переносить на будущую выплату.
            Здесь каждый кейс проходит 7 полей проверки, а FundedNext и Bright Funded сравниваются по {featuredProducts.length} актуальным продуктам и {featuredPriceCount} опубликованным ценам.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные руководства по отзывам">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
            <span>15 минут чтения</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>7</strong><span>полей проверки одного отзыва</span></div>
            <div className="ru-stat"><strong>{featuredCards.length}</strong><span>главных партнёра, выделенных отдельно</span></div>
            <div className="ru-stat"><strong>{featuredProducts.length}</strong><span>актуальных продуктов FundedNext и Bright</span></div>
            <div className="ru-stat"><strong>{featuredPriceCount}</strong><span>опубликованных USD/EUR цен</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#featured-partners" className="btn-primary btn-glow">FundedNext и Bright Funded <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#review-checklist" className="btn-outline">Проверить отзыв</Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить страну</Link>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-reviews-article="decision-first">
        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <div className="ru-notice ru-disclosure ru-review-top-disclosure" data-russian-affiliate-disclosure="reviews-guide">
              <strong>Партнёрское раскрытие.</strong>{' '}
              FundedNext и Bright Funded — два главных коммерческих маршрута этой страницы; FundingPips показан ниже как дополнительная альтернатива.
              Переход может принести нам комиссию, но партнёрство даёт <strong>0 баллов</strong> к доказательству выплаты, доступности страны или качеству отзыва.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание руководства по отзывам о проп-фирмах">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#country-check">Страна и KYC</a></li>
                <li><a href="#review-checklist">7 полей проверки отзыва</a></li>
                <li><a href="#featured-partners">FundedNext и Bright Funded</a></li>
                <li><a href="#product-evidence">7 продуктов и 40 цен</a></li>
                <li><a href="#payout-review">Как читать отзыв о выплате</a></li>
                <li><a href="#negative-review">Как читать жалобу на блокировку</a></li>
                <li><a href="#transferability">Переносимость отзыва</a></li>
                <li><a href="#local-models">Локальные российские модели</a></li>
                <li><a href="#decision">Решение после отзывов</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="country-check">
          <div className="ru-shell">
            <div className="ru-notice" data-russian-country-boundary="reviews-not-access">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Русский отзыв не доказывает доступность страны.</strong>{' '}
              Русскоязычный трейдер в Казахстане, Германии, Израиле, Грузии или России проходит разные проверки резидентства, гражданства, KYC и платежа.
              У FundedNext есть {fundedNextAccess?.sourceUrls.length ?? 4} конфликтующих первичных маршрута по российским резидентам, поэтому до оплаты нужен письменный ответ поддержки; VPN и неверные данные использовать нельзя.
            </div>
          </div>
        </section>

        <section className="ru-section" id="review-checklist">
          <div className="ru-shell" data-russian-reviews-checklist="seven-fields">
            <div className="ru-content">
              <h2>7 полей, без которых отзыв нельзя переносить на свой аккаунт</h2>
              <p>Один комментарий становится проверяемым кейсом только после привязки к продукту и правилу. Если хотя бы 1 поле отсутствует, вывод нужно формулировать как вопрос к первичному источнику, а не как рейтинг фирмы.</p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Database size={21} color="var(--accent-light)" aria-hidden="true" /><h3>1. Фирма и точный продукт</h3><p>Название бренда недостаточно: Stellar Instant с 0 этапов нельзя смешивать со Stellar 2-Step, а Bright 1-Step — с Bright 2-Step.</p></article>
              <article className="ru-card"><BadgeDollarSign size={21} color="var(--accent-light)" aria-hidden="true" /><h3>2. Размер счёта и цена</h3><p>Запишите номинал, валюту и фактический взнос. USD, EUR, временная скидка и платный add-on создают разные денежные маршруты.</p></article>
              <article className="ru-card"><ShieldAlert size={21} color="var(--accent-light)" aria-hidden="true" /><h3>3. Этап и названное правило</h3><p>Укажите evaluation или funded stage, дневную/общую просадку, consistency, новости, выходные либо copy trading — без общего слова «нарушение».</p></article>
              <article className="ru-card"><WalletCards size={21} color="var(--accent-light)" aria-hidden="true" /><h3>4. Дата и сумма выплаты</h3><p>Нужны дата запроса, дата получения, валюта, сумма и удержанная комиссия; скриншот баланса не является подтверждением расчёта.</p></article>
              <article className="ru-card"><CheckCircle2 size={21} color="var(--accent-light)" aria-hidden="true" /><h3>5. Profitable days и payout gate</h3><p>Первая заявка может зависеть от 5 прибыльных дней, 21 календарного дня, роста счёта или иной именованной проверки продукта.</p></article>
              <article className="ru-card"><Globe2 size={21} color="var(--accent-light)" aria-hidden="true" /><h3>6. Страна, KYC и платёж</h3><p>Резидентство автора, документ, способ оплаты и payout rail должны совпадать с вашим маршрутом; язык комментария ничего из этого не доказывает.</p></article>
              <article className="ru-card"><BookOpenCheck size={21} color="var(--accent-light)" aria-hidden="true" /><h3>7. Версия источника</h3><p>Сохраните URL и дату действующего правила. Наш 30-дневный gate не превращает старый отзыв в ложный, но не позволяет использовать его число как текущее.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="featured-partners">
          <div className="ru-shell" data-russian-reviews-featured-partners="fundednext-bright-funded">
            <div className="ru-content">
              <h2>Главные партнёрские маршруты после проверки отзывов</h2>
              <p>FundedNext и Bright Funded стоят рядом как коммерческие варианты, а не как одинаковые продукты. Первый публикует 4 USD-модели, второй — 3 EUR-модели; решение должно начинаться с подходящего правила просадки, этапов и payout gate.</p>
            </div>
            <div className="ru-grid">
              {featuredCards.map(card => (
                <article className="ru-card" key={card.slug} data-russian-reviews-featured-partner={card.slug}>
                  <div className="ru-card-head"><h3>{card.name}</h3><span className="ru-score">Главный партнёр</span></div>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> Актуальные продукты: {card.products.length}</li>
                    <li><BadgeDollarSign size={14} aria-hidden="true" /> Опубликованные цены: {card.priceCount}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Источники до: {card.products.map(product => product.sourceCapturedAt).sort().at(-1)}</li>
                  </ul>
                  <p>{card.slug === 'fundednext'
                    ? 'Сначала выберите между 0, 1 и 2 этапами; затем проверьте возврат взноса, тип просадки и первую заявку. Для российского резидентства не делайте вывод из чужого отзыва: первичные страницы конфликтуют.'
                    : 'Сначала выберите 1 или 2 этапа; затем проверьте trailing/static drawdown и первую заявку. USDC ERC-20 описывает выплату, а не торговый рынок или автоматическую доступность страны.'}</p>
                  <div className="ru-actions">
                    <Link href={card.reviewHref} className="btn-outline">Полный русский обзор</Link>
                    <Link href={`/go/${card.slug}?from=ru-reviews-guide-${card.slug}`} rel="sponsored nofollow noopener" className="btn-primary">Проверить {card.name} <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ru-section" id="product-evidence">
          <div className="ru-shell" data-russian-reviews-product-evidence={featuredProducts.length}>
            <div className="ru-content">
              <h2>Продуктовая проверка: 7 программ вместо одной оценки бренда</h2>
              <p>Таблица не повторяет отзывы и не присваивает победителя. Она показывает, какие числа должны совпасть с историей трейдера перед тем, как вы примените её к собственному выбору.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма и продукт</th><th>Цена</th><th>Этапы / цели</th><th>Просадка</th><th>Сплит / выплата</th><th>Источник</th></tr></thead>
                <tbody>
                  {featuredCards.flatMap(card => card.products.map(product => (
                    <tr key={`${card.slug}:${product.productSlug}`}>
                      <td><strong>{card.name}</strong><br />{product.productName}</td>
                      <td>{priceRange(product)}</td>
                      <td>{phaseLabel(product)}; {profitTargetLabel(product)}</td>
                      <td>{lossLabel(product)}</td>
                      <td>{product.profitSplitPct == null ? 'сплит —' : `${product.profitSplitPct}% базовый`}; {payoutLabel(product)}</td>
                      <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt} <ExternalLink size={12} aria-hidden="true" /></a></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">Все {featuredProducts.length} строк проходят 30-дневный gate; {featuredPriceCount} цен показаны в исходной валюте фирмы без пересчёта в рубли.</p>
          </div>
        </section>

        <section className="ru-section" id="payout-review">
          <div className="ru-shell ru-content" data-russian-reviews-payout-case="seven-facts">
            <h2>Как читать отзыв «проп-фирма выплатила»</h2>
            <p>Фраза «получил выплату» подтверждает только личное утверждение автора. Проверяемый кейс связывает 7 фактов: продукт, номинал, funded-stage, дату запроса, дату получения, сумму/валюту и способ вывода. Отдельно нужны KYC и действовавший payout gate.</p>
            <div className="ru-grid">
              <article className="ru-card"><h3>Сильный кейс</h3><p>Автор называет Stellar 2-Step $100K, дату первой заявки, 21-дневное ожидание, сумму, крипто/банк, KYC и источник правила, действовавший в тот день.</p></article>
              <article className="ru-card"><h3>Слабый кейс</h3><p>Автор показывает dashboard и пишет «выплатили быстро», но не называет продукт, дату, payout method, сумму, документы или правило profitable days.</p></article>
              <article className="ru-card"><h3>Что переносить нельзя</h3><p>Один успешный payout не гарантирует следующую заявку, другую страну, иной размер счёта или продукт с другой просадкой и consistency gate.</p></article>
            </div>
            <div className="ru-actions"><Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить правила выплат</Link><Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Проверить KYC</Link></div>
          </div>
        </section>

        <section className="ru-section" id="negative-review">
          <div className="ru-shell ru-content" data-russian-reviews-negative-case="rule-first">
            <h2>Как читать жалобу «аккаунт заблокировали» или «проп-фирма — скам»</h2>
            <p>Негативный отзыв нельзя удалять из анализа, но и нельзя превращать в юридический вывод без фактов. Сначала определите 6 элементов: названное правило, этап, время сделки, версию договора, ответ поддержки и движение платежа.</p>
            <ol className="ru-steps">
              <li><span>1</span><div><strong>Привяжите жалобу к правилу.</strong><p>«Нарушение» должно стать daily loss, maximum loss, news window, copy trading, IP/device, inactivity, consistency или KYC.</p></div></li>
              <li><span>2</span><div><strong>Сверьте формулу и временную зону.</strong><p>Equity, balance, static, trailing и EOD дают разные breach-моменты; время сервера может не совпадать со временем автора.</p></div></li>
              <li><span>3</span><div><strong>Отделите спор от повторяемого сигнала.</strong><p>Один анонимный пост — lead. Несколько кейсов с одним правилом и датой — причина искать официальное изменение или публичный watch.</p></div></li>
              <li><span>4</span><div><strong>Не платите, пока конфликт не разрешён.</strong><p>Если договор и FAQ расходятся, сохраните письменный ответ поддержки. Устный ответ и VPN не исправляют контрактный или страновой запрет.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="ru-section" id="transferability">
          <div className="ru-shell ru-content" data-russian-reviews-transferability="event-not-verdict">
            <h2>Правдивый отзыв всё равно может не подходить вашему аккаунту</h2>
            <p>
              Отзыв подтверждает событие конкретного автора: продукт, дату, страну, правило и сумму. Он не превращает это событие
              в гарантию для другого размера счёта, payout cycle, документа KYC или версии договора.
            </p>
            <p>
              Переносите из кейса только проверяемые поля и заново сверяйте их с текущим источником фирмы. Итоговые ярлыки
              «платит», «не платит» или «скам» без названного правила не заменяют продуктовую проверку.
            </p>
          </div>
        </section>

        <section className="ru-section" id="local-models">
          <div className="ru-shell" data-russian-reviews-local-models="bridge-not-ranking">
            <div className="ru-content">
              <h2>Российские отзывы полезны, но локальные и глобальные модели нельзя смешивать</h2>
              <p>Локальные компании помогают понять русскоязычный договор, Московскую биржу и рублёвую выплату. Они являются bridge content: после изучения модели читатель отдельно решает, подходит ли ему глобальный CFD-челлендж FundedNext или Bright Funded.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Локальный пример</th><th>Опубликованный факт</th><th>Почему нельзя переносить на глобальную фирму</th><th>Источник</th></tr></thead>
                <tbody>
                  <tr><td><strong>PropLive</strong></td><td>{Number(localClaim('PropLive', 'traders')).toLocaleString('ru-RU')} трейдеров заявлены оператором; рынок — {localClaim('PropLive', 'market')}</td><td>MOEX/Финам и глобальный simulated CFD challenge используют разные договоры, инфраструктуру и payout path.</td><td><a href="https://www.proplive.ru/" target="_blank" rel="nofollow noopener">Оператор</a></td></tr>
                  <tr><td><strong><Link href="/ru/obzor-teamtraders">TeamTraders</Link></strong></td><td>{localClaim('TeamTraders', 'stageProfitPct')}% цель, минимум {localClaim('TeamTraders', 'minimumTradingSessions')} дней, {localClaim('TeamTraders', 'dailyLossLimitPct')}% дневной лимит и до {localClaim('TeamTraders', 'profitSharePct')}% на real</td><td>Текущий FAQ добавляет funded demo с 70%; локальные цифры нельзя подставлять в правила Stellar или Bright.</td><td><a href="https://teamtraders.ru/faq" target="_blank" rel="nofollow noopener">Текущий FAQ</a></td></tr>
                  <tr><td><strong>KasCapital</strong></td><td>Заявленный диапазон выплаты: {Number(localClaim('KasCapital', 'minimumPayoutRub')).toLocaleString('ru-RU')}–{Number(localClaim('KasCapital', 'maximumPayoutRub')).toLocaleString('ru-RU')} ₽; обработка в понедельник</td><td>Рублёвый payout range не сравнивается напрямую с USD/EUR fee, USDC или банковским маршрутом глобальной фирмы.</td><td><a href="https://kascapital.io/" target="_blank" rel="nofollow noopener">Оператор</a></td></tr>
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">Все 3 числа являются заявлениями операторов, а не независимым аудитом выплат. <Link href="/ru/rossiyskie-prop-kompanii">Проверить 6 локальных моделей</Link>.</p>
          </div>
        </section>

        <section className="ru-section" id="decision">
          <div className="ru-shell ru-content" data-russian-reviews-decision="reviews-to-product">
            <h2>Решение после отзывов: от кейса к точному продукту</h2>
            <div className="ru-grid">
              <article className="ru-card"><h3>Если нужен выбор 0/1/2 этапа</h3><p>Начните с 4 моделей FundedNext, затем исключите продукт по просадке, возврату взноса, первой заявке и стране.</p><Link href="/ru/obzor-fundednext" className="ru-card-link">Обзор FundedNext →</Link></article>
              <article className="ru-card"><h3>Если важны EUR-цены и USDC payout</h3><p>Начните с 3 моделей Bright Funded, затем разделите 1-Step и 2-Step по типу drawdown и payout wording.</p><Link href="/ru/obzor-bright-funded" className="ru-card-link">Обзор Bright Funded →</Link></article>
              <article className="ru-card"><h3>Если обе модели не подходят</h3><p>FundingPips остаётся дополнительным глобальным партнёром с {secondaryProducts.length} актуальными продуктами; он не входит в две главные карточки этой страницы.</p><Link href={secondaryRoute.reviewHref} className="ru-card-link">Обзор FundingPips →</Link></article>
            </div>
            {secondaryFirm?.affiliateUrl && secondaryProducts.length > 0 ? (
              <div className="ru-notice ru-disclosure" data-russian-reviews-secondary-partner="fundingpips">
                <strong>Дополнительный партнёрский маршрут.</strong>{' '}
                После русского обзора можно <Link href="/go/fundingpips?from=ru-reviews-guide-fundingpips" rel="sponsored nofollow noopener">проверить текущие условия FundingPips</Link>. Комиссия не делает его заменой FundedNext или Bright Funded и не подтверждает доступность страны.
              </div>
            ) : null}
            <div className="ru-review-author" aria-label="Автор руководства по отзывам о проп-фирмах">
              <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
              <div><strong>Автор: Edris Derakhshi</strong><p>Основатель Traders Fund Hub, funded-трейдер с 2020 года и рыночный аналитик. Метод страницы отделяет пользовательское утверждение, первичный продуктовый источник и коммерческий CTA.</p><Link href="/authors/edris-derakhshi">Профиль автора</Link></div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content"><h2>Частые вопросы</h2><RussianFaq items={faqs} /></div>
        </section>
      </article>
    </>
  )
}
