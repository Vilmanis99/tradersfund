import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getChallengesByFirm, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/fundednext-vs-fundingpips'
const TITLE = 'FundedNext или FundingPips: сравнение 2026'
const DESCRIPTION = 'Сравнение FundedNext и FundingPips на русском: продукты, цены, просадка, сплиты, выплаты и проверка доступности страны перед регистрацией.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что выбрать: FundedNext или FundingPips?',
    a: 'Единого победителя нет. Сравнивайте конкретный продукт, размер счёта, тип просадки, сплит, первую выплату и возврат взноса. Партнёрская комиссия не меняет порядок и не добавляет баллы.',
  },
  {
    q: 'У какой фирмы выше сплит?',
    a: 'Зависит от модели. У разных продуктов FundedNext и FundingPips действуют разные базовые или выбираемые структуры. Максимальный процент нельзя переносить на каждый продукт или считать гарантированным без проверки условий.',
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
    a: 'Bright Funded — третий глобальный партнёрский маршрут на русском сайте. Его продукты и правила вынесены в отдельный обзор, чтобы не смешивать три разных набора условий в одной таблице FundedNext и FundingPips.',
  },
]

type ProductRow = {
  firm: string
  product: Challenge
  price: string
}

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

function targetLabel(product: Challenge) {
  if (!product.profitTargets) return 'без цели оценки'
  const targets = [product.profitTargets.phase1, product.profitTargets.phase2, product.profitTargets.phase3]
    .filter((value): value is number => value != null)
  return targets.length ? `${targets.join(' / ')}%` : 'не опубликована'
}

function payoutLabel(product: Challenge) {
  if (product.payoutFirstDays === 0) return 'по запросу'
  if (product.payoutFirstDays == null) return 'не опубликована'
  const frequency = ({
    weekly: 'еженедельно',
    'bi-weekly': 'каждые две недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'цикл не указан'
  return `${product.payoutFirstDays} дн.; ${frequency}`
}

function splitLabel(product: Challenge) {
  return product.profitSplitPct == null ? 'зависит от структуры' : `${product.profitSplitPct}%`
}

function drawdownLabel(product: Challenge) {
  return ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

export default function RussianFundedNextVsFundingPipsPage() {
  const firms = getAllFirms()
  const fundedNext = firms.find(firm => firm.name === 'FundedNext')
  const fundingPips = firms.find(firm => firm.name === 'FundingPips')
  const brightFunded = firms.find(firm => firm.name === 'Bright Funded')
  const brightFundedProducts = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const productRows: ProductRow[] = [
    ...getChallengesByFirm('fundednext')
      .filter(product => isChallengeFresh(product))
      .map(product => ({ firm: 'FundedNext', product, price: priceRange(product) })),
    ...getChallengesByFirm('fundingpips')
      .filter(product => isChallengeFresh(product))
      .map(product => ({ firm: 'FundingPips', product, price: priceRange(product) })),
  ]
  const sourceDates = productRows.map(row => row.product.sourceCapturedAt).sort()
  const latestCapture = sourceDates.at(-1) ?? 'дата не указана'
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
    dateModified: latestCapture,
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-partner-comparison="fundednext-fundingpips">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Сравнение</div>
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Продукт против продукта</div>
          <h1>FundedNext или FundingPips: сравнение для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Сопоставляем {productRows.length} свежих продуктов по цене, этапам, просадке,
            сплиту и первой выплате. Условия остаются привязанными к модели и дате источника,
            поэтому одна фирма не получает универсального преимущества по рекламному максимуму.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{productRows.length}</strong><span>свежих продуктов</span></div>
            <div className="ru-stat"><strong>{productRows.filter(row => row.firm === 'FundedNext').length}</strong><span>у FundedNext</span></div>
            <div className="ru-stat"><strong>{productRows.filter(row => row.firm === 'FundingPips').length}</strong><span>у FundingPips</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>последний захват</span></div>
          </div>
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
          <div className="ru-grid">
            <article className="ru-card">
              <BarChart3 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext</h3>
              <p className="ru-muted">{fundedNext?.score.toFixed(1) ?? '—'}/10. В текущем захвате — {productRows.filter(row => row.firm === 'FundedNext').length} продукта; смотрите правила конкретной модели.</p>
              <Link href="/ru/obzor-fundednext" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
            <article className="ru-card">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundingPips</h3>
              <p className="ru-muted">{fundingPips?.score.toFixed(1) ?? '—'}/10. В текущем захвате — {productRows.filter(row => row.firm === 'FundingPips').length} продуктов; структура сплита зависит от модели.</p>
              <Link href="/ru/obzor-fundingpips" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
            <article className="ru-card" data-russian-comparison-partner="bright-funded">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Bright Funded</h3>
              <p className="ru-muted">{brightFunded?.score.toFixed(1) ?? '—'}/10. Отдельный глобальный маршрут; в свежем захвате — {brightFundedProducts.length} продукта. Не смешиваем его правила с таблицей двух сравненных фирм.</p>
              <Link href="/ru/obzor-bright-funded" className="ru-card-link">Открыть русский обзор →</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="produkty">
        <div className="ru-shell">
          <h2>Все свежие продукты в сравнении</h2>
          <p className="ru-muted">Пустое значение означает, что число не опубликовано или зависит от выбранной структуры. Цены остаются в валюте фирмы.</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-comparison-product-count={productRows.length}>
              <thead><tr><th>Фирма</th><th>Продукт</th><th>Этапы</th><th>Цель</th><th>Цена</th><th>Просадка</th><th>Сплит</th><th>Первая выплата</th><th>Источник</th></tr></thead>
              <tbody>
                {productRows.map(row => (
                  <tr key={`${row.firm}-${row.product.productSlug}`}>
                    <td><strong>{row.firm}</strong></td>
                    <td>{row.product.productName}</td>
                    <td>{row.product.phases === 0 ? 'без оценки' : row.product.phases}</td>
                    <td>{targetLabel(row.product)}</td>
                    <td>{row.price}</td>
                    <td>{drawdownLabel(row.product)}</td>
                    <td>{splitLabel(row.product)}</td>
                    <td>{payoutLabel(row.product)}</td>
                    <td>{row.product.sourceCapturedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">Дата сравнения: {latestCapture}. Полные доказательства и ссылки на первичные страницы — в <Link href="/ru/obzor-fundednext">обзоре FundedNext</Link> и <Link href="/ru/obzor-fundingpips">обзоре FundingPips</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как выбрать без подмены условий</h2>
          <ol>
            <li>Определите рынок и нужный размер счёта, а не только название фирмы.</li>
            <li>Сравните одинаковые этапы и тип просадки; instant и оценочные модели не равны.</li>
            <li>Посчитайте полную стоимость до funded-этапа и проверьте возврат взноса.</li>
            <li>Сверьте первую выплату, прибыльные дни, правило консистентности и разрешённые инструменты.</li>
            <li>После этого подтвердите свою страну, гражданство, KYC, оплату и способ вывода.</li>
          </ol>
          <p>Если один пункт не подтверждён, отложите регистрацию и запросите письменный ответ фирмы.</p>
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
