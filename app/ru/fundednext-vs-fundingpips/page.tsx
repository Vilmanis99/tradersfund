import type { Metadata } from 'next'
import { fundedNextOneStepPayoutLabel, isFundedNextPayoutSourceFresh } from '@/lib/fundedNextPayout'
import { minimumTradingDaysLabel, consistencyRuleLabel } from '@/lib/challengeRuleLabels'
import RussianFundedNextPayoutNotice from '@/components/RussianFundedNextPayoutNotice'
import Link from '@/components/SafeLink'
import { ArrowRight, BarChart3, CheckCircle2, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import { challengeCurrency, challengeTierEconomics, minimumCostToFundedUsd, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/fundednext-vs-fundingpips'
const TITLE = 'FundedNext или FundingPips: сравнение 2026'
const DESCRIPTION = 'Сравнение FundedNext и FundingPips на русском: продукты, цены, просадка, сплиты, выплаты и проверка доступности страны перед регистрацией.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что выбрать: FundedNext или FundingPips?',
    a: 'Сначала выберите программу с оценкой или без неё и сопоставьте одинаковые размеры счёта. Затем проверьте цели, допустимые убытки, торговые дни, долю вознаграждения и условия его запроса. Партнёрская ссылка не делает программу подходящей для вашей стратегии.',
  },
  {
    q: 'У какой фирмы выше доля вознаграждения?',
    a: 'Процент зависит от программы и выбранного цикла выплат. У FundingPips часть моделей не имеет единого базового процента для всех вариантов. Сравнивайте долю вместе с периодом ожидания, прибыльными днями и ограничением на вклад лучшего дня, а не переносите рекламный максимум на всю фирму.',
  },
  {
    q: 'Можно ли зарегистрироваться русскоязычному трейдеру?',
    a: 'Русский язык страницы не подтверждает доступность. До оплаты проверьте гражданство, резидентство, KYC, ограничения конкретного продукта, способ оплаты и метод выплаты на официальной странице фирмы.',
  },
  {
    q: 'Почему в таблице несколько продуктов одной фирмы?',
    a: 'Одна фирма может менять цену, просадку, цель и выплату между моделями. Мы не сворачиваем эти различия в одну строку, чтобы рекламный максимум одной модели не выглядел как правило для всей фирмы.',
  },
  {
    q: 'Почему Bright Funded показан рядом, но не в таблице?',
    a: 'Bright Funded — ещё один партнёр сайта, но не участник этого попарного сравнения. Его программы с взносами в EUR разобраны в отдельном обзоре и сравнении с FundedNext. Другая валюта взноса сама по себе не доказывает, что программа дешевле или доступна в вашей стране.',
  },
]

type ProductRow = {
  firm: string
  product: Challenge
  price: string
}

function findProduct(rows: ProductRow[], firm: string, productSlug: string, phases: number) {
  return rows.find(candidate => candidate.firm === firm && candidate.product.productSlug === productSlug && candidate.product.phases === phases)?.product
}

function formatPrice(value: number, currency: 'USD' | 'EUR') {
  return `${currency === 'EUR' ? '€' : '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function priceRange(product: Challenge) {
  const prices = [
    ...product.accountSizes.flatMap(tier => !validPrice(tier.priceUsd) ? [] : [{ value: tier.priceUsd, currency: 'USD' as const }]),
    ...product.accountSizes.flatMap(tier => !validPrice(tier.priceEur) ? [] : [{ value: tier.priceEur, currency: 'EUR' as const }]),
  ]
  if (!prices.length) return 'не опубликована'
  const currencies = new Set(prices.map(price => price.currency))
  if (currencies.size > 1) return 'несколько валют'
  const values = prices.map(price => price.value).sort((a, b) => a - b)
  return values[0] === values.at(-1)
    ? formatPrice(values[0], prices[0].currency)
    : `${formatPrice(values[0], prices[0].currency)}–${formatPrice(values.at(-1)!, prices[0].currency)}`
}

function targetLabel(product: Challenge) {
  if (product.phases === 0) return 'без оценочного этапа'
  return Array.from({ length: product.phases }, (_, index) => percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value < 0 || value > 100 ? 'не подтверждено' : `${value}%`
}

function validPrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

function validCaptureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function freshProduct(product: Challenge) {
  return validCaptureDate(product.sourceCapturedAt) && isChallengeFresh(product)
}

function tierCost(product: Challenge, size: number) {
  const tier = product.accountSizes.find(tier => tier.sizeUsd === size)
  const currency = challengeCurrency(product)
  const fee = currency === 'USD' ? tier?.priceUsd : tier?.priceEur
  if (!tier || !validPrice(fee)) return { cost: 'не подтверждено', recovery: 'не подтверждено', refund: 'не подтверждён' }
  const cost = currency === 'USD' ? minimumCostToFundedUsd(product, tier) : fee
  const economics = validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? challengeTierEconomics(product, tier) : null
  return {
    cost: validPrice(cost) ? formatPrice(cost, currency) : 'не подтверждено',
    recovery: economics && validPrice(economics.breakEvenProfit) ? formatPrice(economics.breakEvenProfit, currency) : 'не подтверждено',
    refund: tier.refundable === true ? 'предусмотрен по условиям программы' : tier.refundable === false ? 'не предусмотрен как награда за прохождение' : 'не подтверждён',
  }
}

function payoutLabel(product: Challenge) {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  if (product.payoutFirstDays === 0) return 'по запросу после выполнения условий; не немедленное зачисление'
  if (product.payoutFirstDays == null || !Number.isInteger(product.payoutFirstDays) || product.payoutFirstDays < 0) return 'срок не подтверждён'
  const frequency = ({
    weekly: 'еженедельно',
    'bi-weekly': 'каждые две недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'цикл не указан'
  return `${product.payoutFirstDays} дн. ${product.phases === 0 ? 'по правилам программы без оценки' : 'на счёте после оценки'}; ${frequency}`
}

function splitLabel(product: Challenge) {
  return validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? percent(product.profitSplitPct) : 'единый процент не подтверждён'
}

function drawdownLabel(product: Challenge) {
  return ({
    static: 'статическая',
    trailing: 'подвижная',
    'eod-trailing': 'подвижная по итогам дня',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

export default function RussianFundedNextVsFundingPipsPage() {
  const relevantProducts = [...getChallengesByFirm('fundednext'), ...getChallengesByFirm('fundingpips')]
  const brightFundedProducts = getChallengesByFirm('bright-funded').filter(freshProduct)
  const productRows: ProductRow[] = [
    ...getChallengesByFirm('fundednext')
      .filter(freshProduct)
      .map(product => ({ firm: 'FundedNext', product, price: priceRange(product) })),
    ...getChallengesByFirm('fundingpips')
      .filter(freshProduct)
      .map(product => ({ firm: 'FundingPips', product, price: priceRange(product) })),
  ]
  const sourceDates = relevantProducts.map(product => product.sourceCapturedAt).filter(validCaptureDate).sort()
  const latestCapture = sourceDates.at(0) ?? 'дата не указана'
  const articleDateModified = russianRouteDateModified(PATH, latestCapture)
  const fundedNextInstant = findProduct(productRows, 'FundedNext', 'stellar-instant', 0)
  const fundingPipsZero = findProduct(productRows, 'FundingPips', 'zero', 0)
  const fundedNextOneStep = findProduct(productRows, 'FundedNext', 'stellar-1-step', 1)
  const fundingPipsOneStep = findProduct(productRows, 'FundingPips', '1-step-flex', 1)
  const fundedNextTwoStep = findProduct(productRows, 'FundedNext', 'stellar-2-step', 2)
  const fundingPipsTwoStep = findProduct(productRows, 'FundingPips', '2-step-pro', 2)
  const completeEvidence = relevantProducts.length > 0 && productRows.length === relevantProducts.length
    && productRows.every(row => row.product.accountSizes.some(tier => validPrice(tier.priceUsd) || validPrice(tier.priceEur)))
    && [fundedNextInstant, fundingPipsZero, fundedNextOneStep, fundingPipsOneStep, fundedNextTwoStep, fundingPipsTwoStep].every(Boolean)
    && isFundedNextPayoutSourceFresh()
  const costExamples = [
    { product: fundedNextInstant, size: 10000 }, { product: fundingPipsZero, size: 10000 },
    { product: fundedNextOneStep, size: 50000 }, { product: fundingPipsOneStep, size: 50000 },
    { product: fundedNextTwoStep, size: 50000 }, { product: fundingPipsTwoStep, size: 50000 },
  ]
  const missingPair = <p className="ru-muted">Условия одного или обоих продуктов требуют повторной проверки. Числовое сравнение этой пары временно скрыто.</p>
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'FundedNext или FundingPips' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: articleDateModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {completeEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-partner-comparison="fundednext-fundingpips"
          data-russian-comparison-editorial-date={articleDateModified}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Сравнение</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext', 'fundingpips']} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Продукт против продукта</div>
          <h1>FundedNext или FundingPips: сравнение для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Выбор зависит не от логотипа, а от того, какие условия выдерживает ваша стратегия.
            Разбираем программы без оценки, с одним и двумя этапами: сколько стоит вход,
            как ограничен убыток и когда появляется право запросить вознаграждение.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Редакционная проверка: {articleDateModified}. Даты источников указаны отдельно.</p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{productRows.length}</strong><span>свежих продуктов</span></div>
            <div className="ru-stat"><strong>{productRows.filter(row => row.firm === 'FundedNext').length}</strong><span>у FundedNext</span></div>
            <div className="ru-stat"><strong>{productRows.filter(row => row.firm === 'FundingPips').length}</strong><span>у FundingPips</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>самая ранняя проверка данных</span></div>
          </div>
          <nav className="ru-review-toc" aria-label="Содержание сравнения">
            <Link href="#produkty">Программы</Link> · <Link href="#comparison-instant">Без оценки</Link> · <Link href="#comparison-one-step">Один этап</Link> · <Link href="#comparison-two-step">Два этапа</Link> · <Link href="#comparison-cost">Стоимость</Link> · <Link href="#comparison-decision">Выбор</Link> · <Link href="#sources">Источники</Link>
          </nav>
          <div className="ru-actions">
            <Link href="#produkty" className="btn-primary btn-glow">Смотреть продукты <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить доступ по стране</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="comparison-not-access">
            <strong>Это не рейтинг доступности в России или любой другой стране.</strong>{' '}
            Русскоязычным трейдерам в разных юрисдикциях нужно отдельно подтвердить гражданство,
            резидентство, KYC, оплату и выплату. Не используйте VPN или неверные данные для обхода ограничений.
          </div>
          <p className="ru-source-line">На странице есть партнёрские ссылки: после регистрации мы можем получить комиссию. Это не подтверждение доступности фирмы для вашего профиля и не основание выбирать её вместо другой.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <BarChart3 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext</h3>
              <p className="ru-muted">Программ с актуальной проверкой: {productRows.filter(row => row.firm === 'FundedNext').length}. Stellar Instant рассматривается отдельно от оценочной линейки.</p>
              <Link href="/ru/obzor-fundednext" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
            <article className="ru-card">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundingPips</h3>
              <p className="ru-muted">Программ с актуальной проверкой: {productRows.filter(row => row.firm === 'FundingPips').length}. Доля вознаграждения может зависеть от выбранного цикла, а не только от названия модели.</p>
              <Link href="/ru/obzor-fundingpips" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
            <article className="ru-card" data-russian-comparison-partner="bright-funded">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Bright Funded</h3>
              <p className="ru-muted">Отдельный партнёр сайта; программ с актуальной проверкой: {brightFundedProducts.length}. Взносы в EUR требуют отдельного сравнения с USD, а не прямого сопоставления чисел.</p>
              <Link href="/ru/obzor-bright-funded" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="produkty">
        <div className="ru-shell">
          <h2>Все свежие продукты в сравнении</h2>
          <p className="ru-muted">«Не подтверждено» не означает отсутствие ограничения. Диапазон цены объединяет разные размеры счёта: он не показывает, какая фирма дешевле при одинаковых условиях. Доля вознаграждения относится к указанному варианту программы.</p>
          {!completeEvidence && <p className="ru-notice" data-russian-comparison-evidence-status="recapture-required">Часть данных требует повторной проверки. Актуальные строки показаны отдельно; статья и ссылки на источники сохранены, но полное числовое сравнение сейчас не подтверждено.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Сравнение программ FundedNext и FundingPips">
            <table
              className="ru-table"
              data-russian-comparison-product-count={productRows.length}
              data-russian-comparison-source-links={productRows.length}
            >
              <thead><tr><th>Фирма</th><th>Программа</th><th>Этапы</th><th>Цель</th><th>Взнос</th><th>Лимиты убытка</th><th>Доля вознаграждения</th><th>Условия первого запроса</th><th>Источник</th></tr></thead>
              <tbody>
                {productRows.map(row => (
                  <tr key={`${row.firm}-${row.product.productSlug}`} data-russian-comparison-product={`${row.product.firmSlug}:${row.product.productSlug}`}>
                    <td><strong>{row.firm}</strong></td>
                    <td>{row.product.productName}</td>
                    <td>{row.product.phases === 0 ? 'без оценки' : row.product.phases}</td>
                    <td>{targetLabel(row.product)}</td>
                    <td>{row.price}</td>
                    <td>Дневной: {percent(row.product.dailyLossPct)}; общий: {percent(row.product.maxLossPct)}; {drawdownLabel(row.product)}</td>
                    <td>{splitLabel(row.product)}</td>
                    <td data-russian-payout-product={`${row.product.firmSlug}:${row.product.productSlug}`}>{payoutLabel(row.product)}</td>
                    <td>
                      <a href={row.product.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {row.product.sourceCapturedAt}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!productRows.length && <p className="ru-notice">Нет программ с актуальной проверкой. Цены и числовые рекомендации временно скрыты; используйте список источников ниже для проверки действующих условий.</p>}
          <p className="ru-source-line">Самая ранняя проверка данных: {latestCapture}. Разбор каждой фирмы — в <Link href="/ru/obzor-fundednext">обзоре FundedNext</Link> и <Link href="/ru/obzor-fundingpips">обзоре FundingPips</Link>. Дата редактирования статьи не обновляет эти источники автоматически.</p>
          <RussianFundedNextPayoutNotice />
        </div>
      </section>

      <section className="ru-section">
        <div
          className="ru-shell ru-content ru-review-article"
          data-russian-comparison-scenarios="three-like-for-like-pairs"
        >
          <h2>Три пары продуктов, которые можно сравнивать без подмены модели</h2>
          <p>
            В таблице выше {productRows.length} программ с актуальной проверкой. Для выбора разделите их на программы
            без оценки, с одним и двумя этапами. Одинаковое число этапов — только первый фильтр:
            затем нужны одинаковый размер счёта, понятная граница убытка и подходящие условия запроса вознаграждения.
            Ниже приведены три примера такого разбора, а не рейтинг всех возможных сочетаний.
          </p>

          <div>
            {fundedNextInstant && fundingPipsZero ? <article id="comparison-instant" data-russian-comparison-pair="instant">
              <h3>Без оценки: Stellar Instant или FundingPips Zero</h3>
              <p>
                Обе программы обходятся без предварительного оценочного этапа, но это не покупка свободно выводимого капитала.
                У Stellar Instant общий лимит убытка — {percent(fundedNextInstant.maxLossPct)}, граница — {drawdownLabel(fundedNextInstant)},
                начальная доля вознаграждения — {splitLabel(fundedNextInstant)}. У FundingPips Zero соответствующие значения:
                {' '}{percent(fundingPipsZero.maxLossPct)}, {drawdownLabel(fundingPipsZero)} и {splitLabel(fundingPipsZero)}.
                Процент нельзя оценивать отдельно от того, как поднимается допустимая граница убытка после прибыли.
              </p>
              <p className="ru-muted">
                Для Zero в записи указано ограничение на вклад лучшего дня: {consistencyRuleLabel(fundingPipsZero, 'ru')}.
                У Stellar Instant условия первого запроса: {payoutLabel(fundedNextInstant)}. У Zero: {payoutLabel(fundingPipsZero)}.
                Поэтому больший процент вознаграждения не доказывает более раннее получение денег.
                Право подать заявку, её проверка и зачисление на ваш счёт — разные события.
              </p>
              <p>Если стратегия получает основную прибыль за один сильный день, начните с правила распределения прибыли, а не с цены программы без оценки. Если удерживаете прибыльные позиции, изучите учёт открытой прибыли в подвижном лимите. Отсутствие оценочной цели не отменяет ни один из этих фильтров.</p>
              <p className="ru-source-line">
                Источники:{' '}
                <a href={fundedNextInstant.sourceUrl} target="_blank" rel="noopener noreferrer">Stellar Instant</a>;{' '}
                <a href={fundingPipsZero.sourceUrl} target="_blank" rel="noopener noreferrer">FundingPips Zero</a>.
              </p>
            </article> : <article id="comparison-instant"><h3>Без оценки: Stellar Instant или FundingPips Zero</h3>{missingPair}</article>}

            {fundedNextOneStep && fundingPipsOneStep ? <article id="comparison-one-step" data-russian-comparison-pair="one-step">
              <h3>Один этап: Stellar 1-Step или 1 Step Flex</h3>
              <p>
                У Stellar 1-Step цель — {targetLabel(fundedNextOneStep)}, дневной лимит — {percent(fundedNextOneStep.dailyLossPct)},
                общий — {percent(fundedNextOneStep.maxLossPct)}; граница — {drawdownLabel(fundedNextOneStep)}.
                Для 1 Step Flex: цель {targetLabel(fundingPipsOneStep)}, дневной лимит {percent(fundingPipsOneStep.dailyLossPct)},
                общий {percent(fundingPipsOneStep.maxLossPct)}; граница — {drawdownLabel(fundingPipsOneStep)}.
                Сопоставляйте весь набор: больший общий лимит может сопровождаться другой целью, а дневной лимит ограничивает отдельную торговую сессию.
              </p>
              <p className="ru-muted">
                Минимум торговых дней на оценочном этапе: Stellar 1-Step — {minimumTradingDaysLabel(fundedNextOneStep.minTradingDays ?? null, 'ru')},
                1 Step Flex — {minimumTradingDaysLabel(fundingPipsOneStep.minTradingDays ?? null, 'ru')}.
                Подтверждённый ноль здесь означает отсутствие отдельного минимума на оценке, а не отсутствие проверок после неё.
                Не смешивайте это число с прибыльными днями, которые могут требоваться для запроса вознаграждения.
              </p>
              <p>Срок запроса Stellar 1-Step: {payoutLabel(fundedNextOneStep)}. Для сохранённого варианта 1 Step Flex: {payoutLabel(fundingPipsOneStep)}. Рабочие дни и календарные интервалы нельзя ранжировать как одинаковые единицы. Кроме того, более короткий интервал не обещает, что вы раньше выполните торговые условия или получите одобрение заявки.</p>
              <p>У 1 Step Flex отдельно проверяйте правило концентрации прибыли и систему предупреждений за риск одной торговой идеи. Их применение может добавить требования к прибыльным дням или изменить вознаграждение. Общий лимит убытка не является разрешением потерять столько в одной позиции; подробности привязаны к этапу и выбранному циклу в официальной странице программы.</p>
              <p className="ru-source-line">
                Источники:{' '}
                <a href={fundedNextOneStep.sourceUrl} target="_blank" rel="noopener noreferrer">Stellar 1-Step</a>;{' '}
                <a href={fundingPipsOneStep.sourceUrl} target="_blank" rel="noopener noreferrer">1 Step Flex</a>.
              </p>
            </article> : <article id="comparison-one-step"><h3>Один этап: Stellar 1-Step или 1 Step Flex</h3>{missingPair}</article>}

            {fundedNextTwoStep && fundingPipsTwoStep ? <article id="comparison-two-step" data-russian-comparison-pair="two-step">
              <h3>Два этапа: Stellar 2-Step или 2 Step Pro</h3>
              <p>
                Stellar 2-Step: цели по порядку {targetLabel(fundedNextTwoStep)}, дневной лимит {percent(fundedNextTwoStep.dailyLossPct)},
                общий лимит {percent(fundedNextTwoStep.maxLossPct)}; граница — {drawdownLabel(fundedNextTwoStep)}.
                Для 2 Step Pro: цели {targetLabel(fundingPipsTwoStep)}, дневной лимит {percent(fundingPipsTwoStep.dailyLossPct)},
                общий лимит {percent(fundingPipsTwoStep.maxLossPct)}; граница — {drawdownLabel(fundingPipsTwoStep)}.
                Цель второго этапа важна не меньше первой: прохождение первой оценки ещё не завершает программу.
              </p>
              <p className="ru-muted">
                Сохранённые условия первого запроса: Stellar 2-Step — {payoutLabel(fundedNextTwoStep)};
                2 Step Pro — {payoutLabel(fundingPipsTwoStep)}. Это параметры после оценки, не срок от оплаты челленджа.
                Между прохождением и торговлей на следующем счёте также возможны проверка личности и оформление соглашения.
              </p>
              <p>Для 2 Step Pro выбор более длинного цикла с другой долей вознаграждения требует отдельной проверки: могут меняться ограничения на лучший день, число прибыльных дней и правила предупреждений. Таблица показывает сохранённый вариант, а не максимум, доступный при выполнении всех дополнительных условий. Поменяв цикл, пересмотрите весь расчёт стоимости и ожидания.</p>
              <p>Эта пара не заменяет сравнение всей двухэтапной линейки. Stellar Lite, 2 Step Flex и 2 Step Standard остаются в общей таблице выше. Если у программы не подтверждён единый процент вознаграждения, сначала выберите его структуру у фирмы; нельзя считать, что пропущенное число равно нулю или рекламному максимуму.</p>
              <p className="ru-source-line">
                Источники:{' '}
                <a href={fundedNextTwoStep.sourceUrl} target="_blank" rel="noopener noreferrer">Stellar 2-Step</a>;{' '}
                <a href={fundingPipsTwoStep.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Pro</a>.
              </p>
            </article> : <article id="comparison-two-step"><h3>Два этапа: Stellar 2-Step или 2 Step Pro</h3>{missingPair}</article>}
          </div>
        </div>
      </section>

      <section className="ru-section" id="comparison-cost">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Стоимость на одинаковом размере счёта</h2>
          <p>Минимальная цена бренда часто относится к меньшему счёту и другой модели. Для приведённых пар сравниваем программы без оценки на $10,000, а оценочные — на $50,000. Если такого размера нет в актуальных данных, не подставляем соседний. Указанная прибыль для возврата затрат рассчитана общим методом сайта из стоимости и доли вознаграждения; это не обещание заработка или право вывести всю сумму.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Стоимость одинаковых размеров счёта">
            <table className="ru-table" data-russian-comparison-cost="shared-true-cost">
              <thead><tr><th>Программа</th><th>Размер счёта</th><th>Стоимость до следующего этапа</th><th>Доля вознаграждения</th><th>Прибыль для возврата затрат</th><th>Возврат взноса</th></tr></thead>
              <tbody>{costExamples.map(({ product, size }) => {
                if (!product) return null
                const cost = tierCost(product, size)
                return <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-comparison-cost-product={`${product.firmSlug}:${product.productSlug}`}>
                  <td>{product.productName}</td><td>{formatPrice(size, 'USD')}</td><td>{cost.cost}</td><td>{splitLabel(product)}</td><td>{cost.recovery}</td><td>{cost.refund}</td>
                </tr>
              })}</tbody>
            </table>
          </div>
          {!costExamples.some(example => example.product) && <p className="ru-notice">Для этих примеров нет актуальных данных. Расчёт временно недоступен, а не равен нулю.</p>}
          <p>Расчёт не уменьшает исходный взнос на обещанный возврат: сначала вы несёте затраты, а возврат зависит от договора и одобрения вознаграждения. Повторная попытка, дополнения, комиссия платёжного посредника или конвертация могут увеличить итог. Если доля не подтверждена, известная стоимость остаётся видимой, но прибыль для возврата затрат не рассчитывается. Подробнее — в <Link href="/true-cost-of-prop-firm-challenges" hrefLang="en">методике расчёта стоимости</Link> на английском.</p>
          <h3>Когда лучше не регистрироваться ни в одной фирме</h3>
          <p>Отложите покупку, если не можете письменно подтвердить доступ по гражданству и месту проживания, разрешение на нужную платформу или совместимость стратегии с лимитом убытка. При торговле через советника, копировщик либо во время новостей отдельно нужны правила выбранного этапа: общее название программы их не заменяет. Не используйте чужие документы, адрес или VPN для обхода ограничений.</p>
          <p>Русскоязычному трейдеру за рубежом нужен не общий ответ «работает в моей стране», а проверка своего профиля: документы, фактический адрес, источник оплаты и способ получения вознаграждения. Даже разрешённая покупка не доказывает доступность каждого способа выплаты. Начните с <Link href="/ru/dlya-russkoyazychnykh-treyderov">проверки условий для русскоязычных трейдеров</Link> и сохраните ответ поддержки по конкретной программе.</p>
        </div>
      </section>

      <section className="ru-section" id="comparison-decision">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-decision="constraint-before-brand">
          <h2>Как принять решение за четыре проверки</h2>
          <ol>
            <li>Выберите программу без оценки, с одним или двумя этапами и одинаковый размер счёта.</li>
            <li>Исключите модели, несовместимые с дневным и общим убытком вашей стратегии, распределением прибыли, торговлей на новостях или удержанием на выходных.</li>
            <li>Сверьте условия первого запроса, последующего цикла и возврата взноса. Высокая доля вознаграждения не сокращает ожидание автоматически.</li>
            <li>Подтвердите гражданство, фактическое проживание, проверку личности, оплату и получение денег до регистрации.</li>
          </ol>
          <div className="ru-notice">
            <strong>Когда начать с FundedNext:</strong>{' '}
            если вас интересует Stellar 1-Step, изучите его цель, статический лимит и рабочие дни запроса вместе.
            {fundedNextOneStep && <> Сохранённое условие: {payoutLabel(fundedNextOneStep)}.</>}
            Это повод проверить конкретную программу, а не вывод, что FundedNext всегда платит быстрее.
            У FundingPips сначала определите модель и цикл вознаграждения, затем сопоставьте их требования с той же стратегией.
          </div>
          <div className="ru-actions" data-russian-comparison-decision-cta="primary-first">
            <Link href="/go/fundednext?from=ru-comparison-fit-fundednext" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
              Проверить продукты FundedNext <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/go/fundingpips?from=ru-comparison-fit-fundingpips" rel="sponsored nofollow noopener" className="btn-outline">
              Проверить продукты FundingPips <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <p className="ru-source-line">
            Партнёрские ссылки не заменяют проверку профиля. Если рассматриваете взнос в EUR, откройте{' '}
            <Link href="/ru/obzor-bright-funded">обзор Bright Funded</Link> и{' '}
            <Link href="/ru/fundednext-vs-bright-funded">его сравнение с FundedNext</Link>. Валюта оплаты — отдельный критерий, не доказательство доступности.
          </p>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и границы сравнения</h2>
          <p>Цены и основные параметры берутся из датированных записей по программам, а не из максимальных значений бренда. Проверка рабочего цикла Stellar 1-Step имеет отдельную дату в пояснении к таблице. Если запись стареет или отсутствует, числовая пара скрывается, но ссылка на первоисточник остаётся. Наличие ссылки само по себе не означает, что условия подтверждены сегодня.</p>
          <ul>{relevantProducts.map(product => <li key={`${product.firmSlug}:${product.productSlug}`}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.productName}: официальные условия</a> — {validCaptureDate(product.sourceCapturedAt) ? product.sourceCapturedAt : 'дата не подтверждена'}.</li>)}</ul>
          <p>Редакционный вывод ограничен указанными моделями и вариантами вознаграждения. Мы не проверяли личное получение выплаты по каждому сценарию и не выдаём универсального разрешения для граждан или резидентов какой-либо страны. Если фирма меняет цикл, правила или состав программы, сравнение нужно повторить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="comparison">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            У трёх глобальных фирм на этой странице есть партнёрские маршруты. Мы можем получить комиссию после регистрации,
            но она не меняет таблицу, редакционный порядок или проверку доступности.
          </div>
          <div className="ru-actions">
            <Link href="/go/fundednext?from=ru-comparison-fundednext-fundingpips" rel="sponsored nofollow noopener" className="btn-primary btn-glow">Проверить FundedNext <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/go/fundingpips?from=ru-comparison-fundednext-fundingpips" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundingPips <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/go/bright-funded?from=ru-comparison-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="ru-source-line"><ShieldCheck size={14} aria-hidden="true" /> Перед оплатой откройте правила выбранного продукта. Нужна англоязычная версия? <Link href="/compare/fundednext-vs-fundingpips" hrefLang="en">Открыть полное сравнение на английском</Link>.</p>
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
