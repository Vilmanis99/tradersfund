import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Gauge, ShieldCheck, Zap } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/prop-firmy-bez-chelendzha'
const TITLE = 'Проп-фирмы без челленджа: instant funding 2026'
const DESCRIPTION = 'Сравнение проп-фирм без этапа оценки на русском: свежие phase-0 продукты, цены, просадка, сплиты, выплаты и глобальные партнёрские переходы.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что значит «проп-фирма без челленджа»?',
    a: 'В этой таблице phase-0 означает, что в структурированной записи нет обычной цели оценочного этапа. Это не доказывает реальный капитал, автоматическую выплату или отсутствие дополнительных прибыльных дней, буфера и правил риска.',
  },
  {
    q: 'Какая instant-проп фирма лучшая?',
    a: 'Универсального победителя нет. Сравните цену конкретного размера, тип просадки, сплит, минимальные условия выплаты, платформу и ограничения продукта. Партнёрский статус не добавляет баллы.',
  },
  {
    q: 'Можно ли купить instant-продукт русскоязычному трейдеру?',
    a: 'Язык страницы не подтверждает доступность. Перед оплатой проверьте гражданство, резидентство, KYC, ограничения страны, способ оплаты и метод выплаты у выбранной фирмы.',
  },
  {
    q: 'Почему instant funding может всё равно задержать выплату?',
    a: 'Отсутствие оценки не отменяет прибыльные дни, consistency-правило, минимальный буфер, период ожидания, проверку сделки или отдельные правила funded-этапа. Читайте договор конкретного продукта.',
  },
]

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

function drawdownLabel(product: Challenge) {
  return ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
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

export default function RussianInstantPropFirmsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const firmBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const products = challenges
    .filter(product => product.phases === 0 && isChallengeFresh(product))
    .sort((a, b) => (firmBySlug.get(a.firmSlug)?.score ?? 0) - (firmBySlug.get(b.firmSlug)?.score ?? 0))
    .reverse()
  const partnerProducts = products.filter(product => Boolean(firmBySlug.get(product.firmSlug)?.affiliateUrl))
  const partnerFirms = ['fundednext', 'fundingpips', 'bright-funded']
    .filter(slug => Boolean(firmBySlug.get(slug)?.affiliateUrl))
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1) ?? 'нет данных'
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Проп-фирмы без челленджа' },
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
        <div className="ru-shell" data-russian-instant-ranking="source-gated" data-russian-instant-product-count={products.length}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Без челленджа</div>
          <div className="ru-eyebrow"><Zap size={14} aria-hidden="true" /> Без оценочной цели — не без правил</div>
          <h1>Проп-фирмы без челленджа: instant funding для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Здесь собраны только свежие продукты с phase-0 в структурированных данных. Отсутствие
            оценочной цели не доказывает реальный капитал или быструю выплату: просадка, прибыльные дни,
            KYC и правила funded-этапа остаются отдельными условиями.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{products.length}</strong><span>свежих phase-0 продуктов</span></div>
            <div className="ru-stat"><strong>{partnerFirms.length}</strong><span>глобальных партнёрских фирм</span></div>
            <div className="ru-stat"><strong>{partnerProducts.length}</strong><span>партнёрских instant-продукта</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>последний захват</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#partner-paths" className="btn-primary btn-glow">Проверить партнёрские пути <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">Понять правила выплаты</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="instant-not-access">
            <strong>Это не рейтинг доступности страны.</strong>{' '}
            Русскоязычные трейдеры живут в разных юрисдикциях. Перед покупкой проверяйте гражданство,
            резидентство, KYC, санкционные ограничения, оплату и выплату у конкретной фирмы и продукта.
          </div>
          <div className="ru-grid">
            <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Что пропускается</h3><p className="ru-muted">Phase-0 означает отсутствие обычной цели оценки в текущей записи. Это не означает отсутствие торговых лимитов или условий выплаты.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Что остаётся</h3><p className="ru-muted">Тип просадки, прибыльные дни, буфер, consistency-правило, KYC и договор действуют независимо от названия instant.</p></article>
            <article className="ru-card"><Zap size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Как выбирать</h3><p className="ru-muted">Сравнивайте продукт, размер счёта, полную стоимость до выплаты и метод вывода, а не только отсутствие челленджа.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="partner-paths">
        <div className="ru-shell" data-russian-affiliate-disclosure="instant-ranking">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Партнёрская ссылка есть только у части фирм. Для phase-0 сначала подтвердите текущий режим просадки и выплаты в checkout; просроченные цифры здесь не повторяются. Она не меняет редакционный порядок и не подтверждает
            доступность страны; комиссия возможна после регистрации по ссылке.
          </div>
          <h2>Глобальные instant-продукты с партнёрским переходом</h2>
          <p className="ru-muted">Откройте русский обзор, затем подтвердите свою юрисдикцию на официальной странице оплаты.</p>
          <div className="ru-grid">
            {partnerFirms.map(firmSlug => {
              const firm = firmBySlug.get(firmSlug)
              if (!firm) return null
              const firmProducts = partnerProducts.filter(product => product.firmSlug === firmSlug)
              const reviewHref = firmSlug === 'fundednext'
                ? '/ru/obzor-fundednext'
                : firmSlug === 'fundingpips'
                  ? '/ru/obzor-fundingpips'
                  : firm.reviewUrl
              return (
                <article className="ru-card" key={firmSlug} data-russian-instant-firm={firmSlug}>
                  <div className="ru-card-head"><h3>{firm.name}</h3><span className="ru-score">{firm.score.toFixed(1)}/10</span></div>
                  <p className="ru-muted">{firmProducts.length > 0 ? `${firmProducts.length} свежих phase-0 продуктов` : 'Свежий phase-0 захват временно отсутствует'}; цены, просадка и выплатный цикл различаются по модели.</p>
                  <div className="ru-actions">
                    <Link href={reviewHref} className="btn-outline">Открыть русский обзор</Link>
                    <Link href={`/go/${firmSlug}?from=ru-instant-ranking`} rel="sponsored nofollow noopener" className="btn-primary">Проверить условия <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Все свежие phase-0 продукты</h2>
          <p className="ru-muted">Фирмы без партнёрской ссылки остаются в таблице для сравнения; их переход ведёт на официальный обзор, а не маскируется под affiliate.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Фирма</th><th>Продукт</th><th>Цена</th><th>Сплит</th><th>Просадка</th><th>Первая выплата</th><th>Проверено</th></tr></thead>
              <tbody>
                {products.map(product => {
                  const firm = firmBySlug.get(product.firmSlug)
                  if (!firm) return null
                  return (
                    <tr key={`${product.firmSlug}-${product.productSlug}`}>
                      <td>{firm.name}</td>
                      <td>{product.productName}</td>
                      <td>{priceRange(product)}</td>
                      <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                      <td>{drawdownLabel(product)}</td>
                      <td>{payoutLabel(product)}</td>
                      <td>{product.sourceCapturedAt}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">Пустая цена или выплата означает отсутствие подтверждённого числа, а не бесплатный продукт или гарантированную выплату.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Перед покупкой instant-продукта</h2>
          <ol>
            <li>Подтвердите, что нужный инструмент и платформа доступны в конкретной модели.</li>
            <li>Сравните trailing, static, EOD или balance-based просадку и момент её фиксации.</li>
            <li>Проверьте прибыльные дни, буфер, consistency и минимальную сумму вывода.</li>
            <li>Сверьте цену, возврат, активацию и способ выплаты на странице оплаты.</li>
            <li>Только после этого подтвердите гражданство, резидентство и KYC.</li>
          </ol>
          <p>Для полного рынка откройте <Link href="/ru/luchshie-prop-firmy">русский рейтинг</Link> или <Link href="/ru/dlya-russkoyazychnykh-treyderov">глобальный маршрут для русскоязычных трейдеров</Link>.</p>
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
