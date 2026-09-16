import type { Metadata } from 'next'
import { fundedNextOneStepPayoutLabel } from '@/lib/fundedNextPayout'
import RussianFundedNextPayoutNotice from '@/components/RussianFundedNextPayoutNotice'
import Link from '@/components/SafeLink'
import {
  AlertTriangle,
  ArrowRight,
  Bitcoin,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Globe2,
  Landmark,
  ListChecks,
  SearchCheck,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/vyplaty-prop-firm'
const TITLE = 'Выплаты проп-фирм 2026: FundedNext и Bright Funded'
const DESCRIPTION = 'Как вывести прибыль из FundedNext, Bright Funded и FundingPips: первая заявка, USDT/USDC, банк, сроки обработки, комиссии, KYC и ограничения страны.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'выплаты проп фирм',
    'FundedNext payout',
    'Bright Funded payout',
    'FundingPips payout',
    'проп фирмы USDT',
    'вывод прибыли проп фирма',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие способы выплаты предлагает FundedNext?',
    a: 'Справка FundedNext от 27 августа 2026 года называет 6 маршрутов: USDT ERC20/TRC20, USDC ERC20, Confirmo, RiseWorks, банковский перевод и прямой депозит в FNmarkets. Конкретный маршрут всё равно зависит от страны и доступности провайдера в кабинете.',
  },
  {
    q: 'Когда можно запросить первую выплату FundedNext?',
    a: 'Срок зависит от продукта: Stellar 1-Step использует окно в 5 рабочих дней, Stellar 2-Step и Stellar Lite — первую дату через 21 день и затем цикл 14 дней. Stellar Instant использует отдельное условие выплаты по запросу после роста 5% и проверки EOD.',
  },
  {
    q: 'Как Bright Funded выплачивает вознаграждение?',
    a: 'Bright Funded публикует 2 метода: USDC в сети ERC-20 и банковский перевод в EUR. Стандартная первая дата наступает через 30 дней после первой сделки на профинансированном счёте, затем применяется 14-дневный цикл; финансовая команда указывает до 1 дня на обработку заявки.',
  },
  {
    q: 'Берёт ли Bright Funded комиссию за выплату?',
    a: 'Официальная справка говорит, что Bright Funded не удерживает собственную дополнительную комиссию за выплату. Однако сеть, банк, платёжный провайдер и конвертация могут взять отдельную комиссию; в справке приведён ориентир от $5 до $50 для некоторых случаев.',
  },
  {
    q: 'Можно ли вывести reward в криптовалюте без KYC?',
    a: 'Нет. Криптомаршрут не отменяет KYC фирмы, проверку страны и правила провайдера. Bright Funded использует SumSub и последующую проверку службы безопасности, FundedNext требует подтверждение личности, а FundingPips отделяет KYC мастер-счёта от дополнительного подключения в Rise.',
  },
  {
    q: 'Подходит ли криптовыплата резиденту России?',
    a: 'Само наличие USDT или USDC не доказывает доступ. FundedNext прямо исключает банковский перевод для списка стран, включая Россию, и одновременно публикует противоречивые формулировки о доступе российских резидентов. Проверять нужно гражданство, резидентство, адрес, KYC и провайдера выплаты — без VPN и неверных данных.',
  },
  {
    q: 'Чем FundingPips отличается по выплатам?',
    a: 'FundingPips называет 4 метода: карта, криптовалюта, Rise и банковский перевод. В опубликованном процессе нужно закрыть сделки и ордера, подождать минимум 15 минут и использовать реквизиты на имя проверенного трейдера; внутренняя обработка занимает 1–3 рабочих дня, а получение может добавить 1–2 дня.',
  },
  {
    q: 'Как сравнивать payout prop-фирм правильно?',
    a: 'Сравнивайте 4 разные стадии: допуск к первой заявке, отправку запроса, внутреннюю обработку фирмы и фактическое получение банком или кошельком. Затем вычитайте комиссию провайдера, комиссию сети и валютную конвертацию из вознаграждения после сплита — рекламный процент сам по себе не показывает чистую сумму.',
  },
]

const partnerRoutes = [
  {
    slug: 'fundednext',
    name: 'FundedNext',
    reviewHref: '/ru/obzor-fundednext',
    featured: true,
    fit: 'Нужен выбор между challenge и instant-моделью, а также USDT/USDC или RiseWorks.',
  },
  {
    slug: 'bright-funded',
    name: 'Bright Funded',
    reviewHref: '/ru/obzor-bright-funded',
    featured: true,
    fit: 'Нужен простой выбор между USDC ERC-20 и банковским переводом в EUR.',
  },
  {
    slug: 'fundingpips',
    name: 'FundingPips',
    reviewHref: '/ru/obzor-fundingpips',
    featured: false,
    fit: 'Нужны карта, криптовалюта, Rise или банковский перевод, и подходит более длинное окно обработки.',
  },
] as const

const frequencyLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые 2 недели',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу',
}

function payoutWindow(product: Challenge) {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  if (product.payoutFirstDays === 0) return 'по запросу после отдельного условия'
  if (product.payoutFirstDays == null) return 'первая дата не опубликована'
  const frequency = product.payoutFrequency
    ? frequencyLabels[product.payoutFrequency] ?? product.payoutFrequency
    : 'следующий цикл не опубликован'
  return `${product.payoutFirstDays} дн.; ${frequency}`
}

function pricedTierCount(products: Challenge[]) {
  return products.reduce((sum, product) => sum + product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0),
  ).length, 0)
}

function methodSummary(slug: string) {
  if (slug === 'fundednext') return 'USDT ERC20/TRC20 · USDC ERC20 · Confirmo · RiseWorks · банк · FNmarkets'
  if (slug === 'bright-funded') return 'USDC ERC-20 · банковский перевод EUR'
  return 'карта · криптовалюта · Rise · банковский перевод'
}

function processingSummary(slug: string) {
  if (slug === 'fundednext') return 'до 24 часов после корректной заявки'
  if (slug === 'bright-funded') return 'до 1 дня у финансовой команды'
  return '1–3 рабочих дня + 1–2 дня у получателя'
}

function feeSummary(slug: string) {
  if (slug === 'fundednext') return 'комиссию платёжного шлюза оплачивает трейдер'
  if (slug === 'bright-funded') return 'нет комиссии фирмы; возможны внешние $5–$50+'
  return 'зависит от карты, сети, Rise или банка'
}

function russianReviewHref(slug: string, firm?: Firm) {
  const route = partnerRoutes.find(item => item.slug === slug)
  return route?.reviewHref ?? firm?.reviewUrl ?? '/ru/luchshie-prop-firmy'
}

export default function RussianPayoutsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const firmBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const evidenceBySlug = new Map(marketEvidence.payoutEvidence.map(item => [item.firmSlug, item]))
  const cards = partnerRoutes.map(route => {
    const firm = firmBySlug.get(route.slug)
    const products = challenges.filter(product => product.firmSlug === route.slug && isChallengeFresh(product))
    const evidence = evidenceBySlug.get(route.slug)
    return { ...route, firm, products, evidence }
  }).filter(card => card.firm?.affiliateUrl && card.evidence)
  const featuredCards = cards.filter(card => card.featured)
  const productCount = cards.reduce((sum, card) => sum + card.products.length, 0)
  const priceCount = cards.reduce((sum, card) => sum + pricedTierCount(card.products), 0)
  const sourceCount = new Set(cards.flatMap(card => card.evidence?.sourceUrls ?? [])).size
  const latestCapture = [
    ...cards.flatMap(card => card.products.map(product => product.sourceCapturedAt)),
    ...cards.flatMap(card => card.evidence ? [card.evidence.sourceCapturedAt] : []),
  ].sort().at(-1) ?? marketEvidence.capturedAt

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Выплаты проп-фирм' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Главные payout-маршруты для русскоязычных трейдеров',
    numberOfItems: featuredCards.length,
    itemListElement: featuredCards.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        name: card.name,
        url: `https://tradersfundhub.com${russianReviewHref(card.slug, card.firm)}`,
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
    dateModified: russianRouteDateModified(PATH, latestCapture),
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
          data-russian-payout-guide="long-form-source-gated"
          data-russian-payout-partner-count={cards.length}
          data-russian-payout-featured-partners="fundednext-bright-funded"
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Выплаты проп-фирм</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext', 'bright-funded']} />
          <div className="ru-eyebrow"><WalletCards size={14} aria-hidden="true" /> 4 этапа от прибыли до зачисления</div>
          <h1>Выплаты проп-фирм: FundedNext, Bright Funded и вывод прибыли</h1>
          <p className="ru-lead">
            Сравнили {cards.length} процесса выплаты по {sourceCount} первичным страницам и {productCount} свежим продуктам.
            FundedNext и Bright Funded — два главных маршрута; FundingPips оставлен как вторичная альтернатива.
            Срок первой заявки, обработка фирмой и зачисление на кошелёк или банковский счёт показаны отдельно.
          </p>
          <div className="ru-stats" aria-label="Охват payout-исследования">
            <div className="ru-stat"><strong>{featuredCards.length}</strong><span>главных партнёра</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>первичных страниц о выплатах и KYC</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>свежих продуктов партнёров</span></div>
            <div className="ru-stat"><strong>{priceCount}</strong><span>опубликованных цен</span></div>
          </div>
          <div className="ru-actions">
            <Link href="/go/fundednext?from=ru-payouts-fundednext" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
              Проверить FundedNext <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/go/bright-funded?from=ru-payouts-bright-funded" rel="sponsored nofollow noopener" className="btn-outline">
              Проверить Bright Funded <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="#sravnenie" className="btn-outline">Сначала сравнить выплаты</Link>
          </div>
          <p className="ru-source-line">Снимок источников и продуктовых данных: {latestCapture}. Условия проверяются повторно перед оплатой и запросом выплаты.</p>
        </div>
      </section>

      <article data-russian-payout-article="diaspora-withdrawal-decision">
        <section className="ru-section" id="sravnenie">
          <div className="ru-shell ru-content">
            <div className="ru-notice" data-russian-country-boundary="payout-not-access">
              <strong>Русский язык не равен резидентству России.</strong>{' '}
              Этот гайд рассчитан на русскоязычных трейдеров по всему миру. Гражданство, резидентство, адрес, KYC,
              санкционные ограничения, банк и кошелёк проверяются по фактическому профилю. Нельзя использовать VPN,
              чужие реквизиты или неверные данные для обхода правила страны.
            </div>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="payout-ranking">
              <strong>Партнёрское раскрытие.</strong>{' '}
              Мы можем получить комиссию после перехода через /go/ и регистрации. FundedNext и Bright Funded выделены
              коммерчески, но цифры взяты из первичных источников, а FundingPips сохранён как реальная третья альтернатива.
              Комиссия не меняет цену пользователя и не превращает метод выплаты в гарантию доступности.
            </div>

            <h2>Короткий ответ: какой способ выплаты выбрать</h2>
            <p>
              Для выбора недостаточно сравнить «80% против 85%». Сначала проверьте, когда продукт допускает первую заявку,
              затем — точный токен, сеть или валюту банка, после этого — внутренний срок обработки и внешние комиссии.
              В текущем снимке FundedNext предлагает самый широкий список из 6 методов, Bright Funded — самый простой
              список из 2 методов, а FundingPips — 4 метода с более длинной опубликованной обработкой.
            </p>
            <div className="ru-table-wrap" data-russian-payout-matrix={cards.length}>
              <table className="ru-table">
                <thead>
                  <tr><th>Фирма</th><th>Опубликованные методы</th><th>Обработка после заявки</th><th>Внешние расходы</th><th>Для кого логичнее</th></tr>
                </thead>
                <tbody>
                  {cards.map(card => (
                    <tr key={card.slug} data-russian-payout-evidence={card.slug}>
                      <td><strong>{card.name}</strong>{card.featured ? <><br /><span className="ru-score">Главный партнёр</span></> : <><br />Вторичная альтернатива</>}</td>
                      <td>{methodSummary(card.slug)}</td>
                      <td>{processingSummary(card.slug)}</td>
                      <td>{feeSummary(card.slug)}</td>
                      <td>{card.fit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">
              Таблица описывает способы вывода, а не рейтинг качества. Каждая строка опирается на {cards.map(card => card.evidence?.sourceUrls.length ?? 0).join(', ')} официальных страниц соответственно.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-featured-partners="fundednext-bright-funded">
          <div className="ru-shell">
            <h2>FundedNext и Bright Funded — два главных варианта</h2>
            <p className="ru-muted">
              Эти карточки ведут к глобальным фирмам, где Traders Fund Hub может получить партнёрскую комиссию.
              Выделение объяснено, а не скрыто: сначала русский обзор и ограничения, затем официальная страница оплаты.
            </p>
            <div className="ru-grid">
              {featuredCards.map(card => {
                const isFundedNext = card.slug === 'fundednext'
                return (
                  <article className="ru-card" key={card.slug} data-russian-payout-featured-partner={card.slug}>
                    <div className="ru-card-head"><h3>{card.name}</h3><span className="ru-score">Главный партнёр</span></div>
                    <p className="ru-muted">
                      {isFundedNext
                        ? 'Выбор для трейдера, которому важны USDT ERC20/TRC20, USDC ERC20, RiseWorks или другой из 6 опубликованных маршрутов. Четыре продукта имеют разные условия первой выплаты.'
                        : 'Выбор для трейдера, которому достаточно USDC ERC-20 или банковского перевода в EUR. Три продукта с оценочным этапом используют стандартную первую дату 30 дней.'}
                    </p>
                    <ul className="ru-facts">
                      <li><WalletCards size={14} aria-hidden="true" /> Методов: {card.evidence?.methods.length}</li>
                      <li><ListChecks size={14} aria-hidden="true" /> Свежих продуктов: {card.products.length}</li>
                      <li><CircleDollarSign size={14} aria-hidden="true" /> Опубликованных цен: {pricedTierCount(card.products)}</li>
                      <li><SearchCheck size={14} aria-hidden="true" /> Источников процесса: {card.evidence?.sourceUrls.length}</li>
                    </ul>
                    <p className="ru-source-line">
                      {isFundedNext
                        ? 'Банковский перевод недоступен для списка стран, включающего Россию; криптометод не устраняет отдельное противоречие по стране.'
                        : 'USDC ERC-20 не отменяет SumSub KYC, проверку службы безопасности и поддержку кошелька в стране трейдера.'}
                    </p>
                    <div className="ru-actions">
                      <Link href={card.reviewHref} className="btn-outline">Русский обзор</Link>
                      <Link href={`/go/${card.slug}?from=ru-payouts-card-${card.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                        Проверить {card.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-gates="eligibility-request-processing-receipt">
          <div className="ru-shell ru-content">
            <h2>Четыре этапа выплаты, которые нельзя смешивать</h2>
            <p>
              Фраза «выплата за 24 часа» обычно описывает только часть маршрута. До неё может быть 5, 21 или 30 дней
              ожидания права на заявку, а после неё банк или блокчейн могут добавить своё время. Сравнение становится честным,
              когда один рекламный срок разбит на 4 проверяемых этапа.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Допуск</h3><p className="ru-muted">Продукт должен открыть дату выплаты: например, 5 рабочих дней у FundedNext 1-Step или 30 дней у стандартной схемы Bright Funded.</p></article>
              <article className="ru-card"><ListChecks size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Заявка</h3><p className="ru-muted">Нужно закрыть обязательные позиции, выполнить правила прибыльности и стабильности, пройти KYC и отправить заявку из кабинета.</p></article>
              <article className="ru-card"><Clock3 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Обработка фирмой</h3><p className="ru-muted">FundedNext публикует до 24 часов, Bright Funded — до 1 дня финансовой команды, FundingPips — 1–3 рабочих дня.</p></article>
              <article className="ru-card"><Landmark size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. Получение</h3><p className="ru-muted">Кошелёк, сеть, Rise или банк могут добавить подтверждения, проверку соответствия, выходные и 1–2 рабочих дня получения.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-product-table={productCount}>
          <div className="ru-shell ru-content">
            <h2>Первая выплата по 12 текущим продуктам</h2>
            <p>
              Срок относится к конкретному продукту, а не к логотипу фирмы. Поэтому Stellar Instant нельзя усреднять со
              Stellar 2-Step, а FundingPips Zero — с 2 Step Pro. Значение «не опубликовано» сохранено как неизвестное,
              а не заменено удобной цифрой другого продукта.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Продукт</th><th>Первая заявка и цикл</th><th>Базовая доля</th><th>Источник</th></tr></thead>
                <tbody>
                  {cards.flatMap(card => card.products.map(product => (
                    <tr key={`${card.slug}-${product.productSlug}`}>
                      <td>{card.name}</td>
                      <td>{product.productName}</td>
                      <td data-russian-payout-product={`${product.firmSlug}:${product.productSlug}`}>{payoutWindow(product)}</td>
                      <td>{product.profitSplitPct == null ? 'зависит от структуры' : `${product.profitSplitPct}%`}</td>
                      <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">Правила · {product.sourceCapturedAt}</a></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-methods="rail-token-currency">
          <div className="ru-shell ru-content">
            <RussianFundedNextPayoutNotice />
            <h2>Крипто, банк, Rise и карта: точный метод важнее значка</h2>
            <p>
              Слово «криптовалюта» ничего не говорит о токене и сети. USDT ERC20, USDT TRC20 и USDC ERC20 — три разных маршрута:
              ошибочная сеть может сделать перевод невосстановимым. Банковский перевод тоже недостаточно точен без валюты,
              страны банка, имени получателя и возможного correspondent bank.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Маршрут</th><th>Что подтвердить</th><th>Типичный скрытый слой</th><th>Практический вопрос</th></tr></thead>
                <tbody>
                  <tr><td>USDT/USDC</td><td>Токен, ERC20/TRC20, адрес и минимум</td><td>Комиссия сети и поддержка кошелька</td><td>Совпадает ли сеть в кабинете и кошельке?</td></tr>
                  <tr><td>Банк</td><td>EUR/USD, IBAN/SWIFT, страна и имя</td><td>Комиссия банка-корреспондента и валютный спред</td><td>Принимает ли банк платёж от этого провайдера?</td></tr>
                  <tr><td>RiseWorks/Rise</td><td>Отдельный аккаунт, email и KYC</td><td>Подключение и доступность страны</td><td>Совпадает ли email с аккаунтом фирмы?</td></tr>
                  <tr><td>Карта</td><td>Карта на имя проверенного трейдера</td><td>Правило банка-эмитента и возврат на исходный метод</td><td>Поддерживается ли вознаграждение, а не только возврат?</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ru-notice">
              <strong>Перед подтверждением адреса.</strong>{' '}
              Скопируйте токен и сеть с экрана выплаты, сделайте снимок экрана условий, проверьте первые и последние символы
              адреса и не переносите старый адрес из другой сети. Для банка сохраните валюту и тарифы получателя.
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-fees="firm-provider-network-fx">
          <div className="ru-shell ru-content">
            <h2>Считайте чистую выплату, а не только долю прибыли</h2>
            <p>
              Валовое вознаграждение сначала уменьшается на долю фирмы, затем на комиссию фирмы за выплату, комиссию провайдера, комиссию сети
              и валютную конвертацию. Bright Funded заявляет 0 собственной дополнительной комиссии, но приводит диапазон
              внешних расходов $5–$50 в некоторых случаях. FundedNext возлагает комиссию платёжного шлюза на трейдера.
            </p>
            <div className="ru-notice">
              <strong>Рабочая формула:</strong>{' '}
              чистое получение = торговая прибыль × базовая доля − комиссия фирмы − комиссия провайдера − комиссия сети/банка − валютная конвертация.
              Например, отсутствие комиссии фирмы не означает нулевую общую стоимость, если EUR перевод конвертируется банком
              или USDC отправляется по дорогой сети.
            </div>
            <p>
              Минимальная выплата тоже проверяется отдельно. Bright Funded пишет об отсутствии минимального вознаграждения и приводит
              пример $0.01, но столь маленькая заявка может быть экономически бессмысленной после внешних расходов.
              Цель — не максимальное число запросов, а предсказуемая чистая сумма после всех 4 стадий.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-diaspora="language-not-bank-country">
          <div className="ru-shell ru-content">
            <h2>Сценарии для русскоязычных трейдеров по всему миру</h2>
            <p>
              Аудитория этой страницы — не только жители России. Русскоязычный трейдер может жить в Латвии, Германии,
              Казахстане, ОАЭ, Израиле, США или другой стране. Решение принимает не язык интерфейса, а фактическая связка
              документов, адреса, налогового резидентства и метода выплаты.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент ЕС с EUR-счётом</h3><p className="ru-muted">Банковский перевод Bright Funded в EUR может уменьшить лишнюю валютную конвертацию, если KYC и банк поддерживают отправителя. Сравните банковскую комиссию с USDC ERC-20.</p></article>
              <article className="ru-card"><Bitcoin size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент страны с разрешённым криптомаршрутом</h3><p className="ru-muted">FundedNext даёт USDT в 2 сетях и USDC ERC20, но кошелёк, правило передачи данных и местная отчётность остаются обязанностью получателя.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Резидент России</h3><p className="ru-muted">Криптовалюта не отменяет ограничение по стране. У FundedNext есть официальный конфликт формулировок, а банковский перевод прямо недоступен для списка, включающего Россию.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Переезд или второе гражданство</h3><p className="ru-muted">Показывайте текущие документы и адрес, сообщайте фирме об изменении профиля и не выбирайте страну только ради оформления покупки. Решение KYC индивидуально.</p></article>
            </div>
            <div className="ru-actions">
              <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary">Проверить страну и профиль <ArrowRight size={15} aria-hidden="true" /></Link>
              <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-secondary="fundingpips">
          <div className="ru-shell ru-content">
            <h2>FundingPips: вторичная альтернатива с четырьмя методами</h2>
            <p>
              FundingPips не заменяет два главных коммерческих маршрута, но полезен как контрольный вариант. Официальная
              Страница методов вознаграждения называет карту, криптовалюту, Rise и банковский перевод. Перед запросом нужно закрыть все сделки и
              незакрытые ордера, подождать минимум 15 минут и использовать карту, кошелёк или счёт на имя проверенного трейдера.
            </p>
            <p>
              Опубликованное окно обработки — 1–3 рабочих дня внутри FundingPips и ещё 1–2 рабочих дня у кошелька или банка.
              Rise требует отдельного подключения с тем же email, удостоверением личности и selfie. Поэтому 4 метода не означают
              меньше проверок: настройка мастер-счёта, KYC, соглашение с клиентом и подключение выплат остаются разными шагами.
            </p>
            <div className="ru-actions">
              <Link href="/ru/obzor-fundingpips" className="btn-outline">Русский обзор FundingPips</Link>
              <Link href="/go/fundingpips?from=ru-payouts-fundingpips" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить FundingPips <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-local-models="separate-rub-contracts">
          <div className="ru-shell ru-content">
            <h2>Локальные российские компании — отдельная модель, не payout shortcut</h2>
            <p>
              KasCapital публикует собственную RUB-модель и заявляет диапазон счёта от 10 000 до 2 000 000 ₽ с выплатами
              по понедельникам. PropLive и TeamTraders связаны с локальными рынками и инфраструктурой, отличной от глобальных
              CFD-продуктами с оценочным этапом. Эти примеры полезны для сравнения договора и инструмента, но их нельзя смешивать с USDT/USDC
              платёжными каналами глобальных фирм.
            </p>
            <p>
              Мы пишем о локальных фирмах как об информационном мосте для читателя, который ищет «проп-компанию» на русском.
              Если публичной партнёрской программы нет, карточка не получает искусственный призыв к действию. Коммерческий маршрут остаётся
              прозрачным: подходящий международный пользователь сравнивает FundedNext и Bright Funded, а локальную модель
              выбирает только после проверки российского договора, рынка и юридического лица.
            </p>
            <div className="ru-actions">
              <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">Сравнить локальные модели</Link>
              <Link href="/ru/obzor-kascapital" className="btn-outline">Разбор KasCapital</Link>
            </div>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-delay-record="five-fields">
          <div className="ru-shell ru-content">
            <h2>Что сохранить, если выплата задерживается</h2>
            <p>
              Для разбора нужны 5 полей: точное время заявки, название продукта, статус в кабинете, дата завершения KYC
              и идентификатор транзакции либо тикета. Один статус «в ожидании» без этих данных не показывает, на каком из 4 этапов возникла задержка.
            </p>
            <p>
              Сначала сравните прошедшее время с опубликованным окном обработки фирмы, затем отдельно проверьте банк, сеть или провайдера выплаты.
              Не публикуйте документы, seed-фразу кошелька, полный адрес или идентификационный номер в открытом отзыве.
            </p>
          </div>
        </section>

        <section className="ru-section" data-russian-payout-decision="net-receipt-before-registration">
          <div className="ru-shell ru-content">
            <h2>Чек-лист перед регистрацией и первой заявкой</h2>
            <ol>
              <li><strong>Проверьте правило страны.</strong> Язык, паспорт, резидентство и адрес — 4 разные характеристики профиля.</li>
              <li><strong>Выберите конкретный продукт.</strong> У {productCount} текущих продуктов разные сроки первой выплаты, циклы и доля прибыли.</li>
              <li><strong>Зафиксируйте точный платёжный канал.</strong> Запишите токен, сеть, валюту банка или требования Rise/карты до оплаты продукта.</li>
              <li><strong>Пройдите KYC честно.</strong> Имя аккаунта, кошелька, карты и банка должно совпадать с проверенным трейдером.</li>
              <li><strong>Разделите 4 срока.</strong> Допуск, заявка, обработка фирмой и получение нельзя складывать в одно рекламное обещание.</li>
              <li><strong>Посчитайте чистое вознаграждение.</strong> Вычтите комиссии фирмы, провайдера, сети, банка и конвертации из суммы после базового сплита.</li>
              <li><strong>Сохраните доказательства.</strong> Сделайте снимок экрана страницы выплаты, правил и адреса до подтверждения OTP.</li>
            </ol>
            <div className="ru-notice">
              <CheckCircle2 size={16} aria-hidden="true" />{' '}
              <strong>Если профиль подходит:</strong> откройте русский обзор FundedNext или Bright Funded, сравните конкретный
              продукт, затем переходите на официальную страницу оплаты через отмеченную партнёрскую ссылку.
            </div>
            <div className="ru-actions">
              <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary">Сравнить FundedNext и Bright Funded</Link>
              <Link href="/ru/obzor-fundednext" className="btn-outline">Обзор FundedNext</Link>
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор Bright Funded</Link>
              <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Полный русский рейтинг</Link>
            </div>
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
