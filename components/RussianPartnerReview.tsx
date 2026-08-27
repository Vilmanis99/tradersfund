import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BadgeDollarSign, Database, ExternalLink } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import {
  getChallengesByFirm,
  getAllFirms,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

type RussianPartnerReviewProps = {
  path: string
  title: string
  description: string
  firmName: string
  firmSlug: string
  affiliateSlug: string
  affiliateFrom: string
  englishReviewHref: string
  lead: ReactNode
  countryNote: ReactNode
  verdict: Array<{ title: string; body: ReactNode }>
  editorialNotes: string[]
  faqs: RussianFaqItem[]
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

const payoutLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые две недели',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу при выполнении условий',
}

function formatCurrency(value: number, currency: 'USD' | 'EUR') {
  return `${currency === 'USD' ? '$' : '€'}${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`
}

function productPriceRange(product: Challenge) {
  const prices = [
    ...product.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [{ value: tier.priceUsd, currency: 'USD' as const }]),
    ...product.accountSizes.flatMap(tier => tier.priceEur == null ? [] : [{ value: tier.priceEur, currency: 'EUR' as const }]),
  ]
  if (!prices.length) return 'не опубликована'
  const currencies = new Set(prices.map(price => price.currency))
  if (currencies.size > 1) return 'несколько валют'
  const values = prices.map(price => price.value).sort((a, b) => a - b)
  const currency = prices[0].currency
  return values[0] === values.at(-1)
    ? formatCurrency(values[0], currency)
    : `${formatCurrency(values[0], currency)}–${formatCurrency(values.at(-1)!, currency)}`
}

function tierPrice(tier: Challenge['accountSizes'][number]) {
  if (tier.priceUsd != null) return formatCurrency(tier.priceUsd, 'USD')
  if (tier.priceEur != null) return formatCurrency(tier.priceEur, 'EUR')
  return 'не опубликована'
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
  return `${product.payoutFirstDays} дн.; ${payoutLabels[product.payoutFrequency ?? ''] ?? product.payoutFrequency ?? 'цикл не указан'}`
}

export default function RussianPartnerReview({
  path,
  title,
  description,
  firmName,
  firmSlug,
  affiliateSlug,
  affiliateFrom,
  englishReviewHref,
  lead,
  countryNote,
  verdict,
  editorialNotes,
  faqs,
}: RussianPartnerReviewProps) {
  const firm = getAllFirms().find(candidate => candidate.name === firmName)
  const products = getChallengesByFirm(firmSlug)
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0) || (tier.priceEur != null && tier.priceEur > 0),
  ).map(tier => ({ product, tier })))
  const latestCapture = freshProducts.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'дата не указана'
  const latestAnyCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'дата не указана'
  const sourceUrls = [...new Set(freshProducts.map(product => product.sourceUrl))]
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: `Обзор ${firmName}` },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `https://tradersfundhub.com${path}`,
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
        <div className="ru-shell" data-russian-partner-review={firmSlug}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / {firmName}</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Источник до {latestCapture}</div>
          <h1>{title}</h1>
          <p className="ru-lead">{lead}</p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>свежих продуктов</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>ценовых уровней</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>дата захвата источника</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-partner-country-access="unconfirmed">
            <strong><AlertTriangle size={16} aria-hidden="true" /> Язык страницы не подтверждает доступ.</strong>{' '}
            {countryNote}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Продукты и правила в текущем захвате</h2>
          <p className="ru-muted">Цены остаются в валюте фирмы. Пустое поле означает, что число не подтверждено на странице оператора, а не бесплатный продукт.</p>
          {products.length > 0 && freshProducts.length === 0 && (
            <div className="ru-notice" data-russian-partner-review-freshness="stale">
              <strong>Свежих данных сейчас нет.</strong>{' '}
              Последний доступный захват датирован {latestAnyCapture} и старше 30-дневного окна. Таблица и рекламные выводы требуют нового захвата перед оплатой.
            </div>
          )}
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-product-count={freshProducts.length}>
              <thead><tr><th>Продукт</th><th>Этапы</th><th>Цель</th><th>Цена</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Просадка</th><th>Сплит</th><th>Первая выплата</th></tr></thead>
              <tbody>
                {freshProducts.map(product => (
                  <tr key={product.productSlug}>
                    <td><strong>{product.productName}</strong></td>
                    <td>{product.phases === 0 ? 'без оценки' : product.phases}</td>
                    <td>{targetLabel(product)}</td>
                    <td>{productPriceRange(product)}</td>
                    <td>{product.dailyLossPct == null ? 'не опубликован' : `${product.dailyLossPct}%`}</td>
                    <td>{product.maxLossPct == null ? 'не опубликован' : `${product.maxLossPct}%`}</td>
                    <td>{product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : 'не опубликована'}</td>
                    <td>{product.profitSplitPct == null ? 'зависит от цикла' : `${product.profitSplitPct}%`}</td>
                    <td>{payoutLabel(product)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Каждая опубликованная цена</h2>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Продукт</th><th>Размер счёта</th><th>Цена</th><th>Возврат</th><th>Источник</th></tr></thead>
              <tbody>
                {pricedTiers.map(({ product, tier }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{tierPrice(tier)}</td>
                    <td>{tier.refundable == null ? 'не подтверждено' : tier.refundable ? 'да' : 'нет'}</td>
                    <td>{product.sourceCapturedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">{sourceUrls.length} уникальных первичных страниц. Подробные заметки и доказательства доступны в <Link href={englishReviewHref} hrefLang="en">английском обзоре {firmName}</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Что важно проверить до оплаты</h2>
          <div className="ru-grid">
            {verdict.map(item => (
              <article className="ru-card" key={item.title}>
                <BadgeDollarSign size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p className="ru-muted">{item.body}</p>
              </article>
            ))}
          </div>
          <ul className="ru-source-list">
            {editorialNotes.map(note => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-partner-review-method="product-first">
          <h2>Как читать сравнение без рекламных ловушек</h2>
          <div className="ru-grid">
            <article className="ru-card"><BadgeDollarSign size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Цена и валюта</h3><p className="ru-muted">Цена относится к конкретному размеру счёта и сохраняется в USD или EUR. Курс банка, комиссия провайдера и временный купон не превращаются в постоянную стоимость.</p></article>
            <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Просадка и лимит</h3><p className="ru-muted">Статическая, трейлинг- или EOD-просадка меняет момент, в который срабатывает риск-правило. Сверяйте тип просадки с дневным лимитом выбранного продукта.</p></article>
            <article className="ru-card"><Database size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Выплата</h3><p className="ru-muted">Первая выплата и частота цикла не означают автоматическую выплату: могут потребоваться прибыльные дни, закрытые сделки, KYC и отдельная проверка правил.</p></article>
            <article className="ru-card"><ExternalLink size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Страна и KYC</h3><p className="ru-muted">Русский интерфейс не подтверждает доступ. Перед оплатой проверьте гражданство, резидентство, платёжный профиль и метод вывода у самой фирмы.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure={firmSlug}>
            <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если подходящий читатель зарегистрируется по ссылке ниже. Это не меняет цены, цифры или редакционный порядок. Резидентам России нельзя обходить ограничения VPN, прокси или неверными данными.
          </div>
          <div className="ru-actions">
            <Link href={`/go/${affiliateSlug}?from=${affiliateFrom}`} rel="sponsored nofollow noopener" className="btn-primary btn-glow">
              Проверить страну и условия на {firmName} <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить глобальные фирмы</Link>
          </div>
          <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Переход отмечен как sponsored и nofollow; перед оплатой откройте правила конкретного продукта.</p>
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
