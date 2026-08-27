import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Banknote, Bitcoin, CalendarClock, ShieldCheck, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/vyplaty-prop-firm'
const TITLE = 'Проп-фирмы с выплатами: USDT, крипто и банк (2026)'
const DESCRIPTION = 'Сравнение выплат проп-фирм для русскоязычных трейдеров: крипто и банк, первая выплата, цикл, KYC и источники условий глобальных фирм.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие проп-фирмы выплачивают в криптовалюте?',
    a: 'В карточке показан только опубликованный фирмой метод Crypto. Это не означает автоматически USDT, USDC, конкретную сеть или доступность для вашей страны: сеть, провайдер, KYC и итоговый способ вывода нужно подтвердить в кабинете и правилах выбранного продукта.',
  },
  {
    q: 'Что означает первая выплата через 7, 14 или 30 дней?',
    a: 'Это минимальное окно до первой заявки в текущей записи продукта, а не обещание одобрения. Прибыльные дни, safety buffer, consistency, KYC, минимальная сумма и проверка сделки могут добавить отдельные условия.',
  },
  {
    q: 'Можно ли получить выплату из России только из-за метода Crypto?',
    a: 'Нет. Русский язык и криптометод не отменяют ограничения по резидентству, гражданству, санкциям, платёжному провайдеру или договору. Нельзя использовать VPN или неверные данные для обхода проверки.',
  },
  {
    q: 'Почему у одной фирмы несколько сроков первой выплаты?',
    a: 'Срок зависит от продукта и модели. Мы не заменяем несколько подтверждённых значений одним средним: перед покупкой откройте источник конкретного продукта и проверьте именно его условия.',
  },
]

const methodLabels: Record<string, string> = {
  'Bank wire': 'банковский перевод',
  Card: 'карта',
  Crypto: 'криптовалюта',
  Rise: 'Rise',
  Skrill: 'Skrill',
  Wise: 'Wise',
  'PayPal': 'PayPal',
}

const frequencyLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'раз в 2 недели',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу',
}

function formatMethods(methods: string[]) {
  return methods.map(method => methodLabels[method] ?? method).join(' · ')
}

function formatDays(products: Challenge[]) {
  const days = [...new Set(products
    .map(product => product.payoutFirstDays)
    .filter((value): value is number => value != null))]
    .sort((a, b) => a - b)
  return days.length ? days.map(value => `${value} дн.`).join(' / ') : 'не подтверждено'
}

function formatFrequencies(products: Challenge[]) {
  const frequencies = [...new Set(products
    .map(product => product.payoutFrequency)
    .filter((value): value is NonNullable<Challenge['payoutFrequency']> => value != null))]
  return frequencies.length
    ? frequencies.map(value => frequencyLabels[value] ?? value).join(' / ')
    : 'не подтверждено'
}

function russianReviewHref(slug: string, firm: Firm) {
  if (slug === 'fundednext') return '/ru/obzor-fundednext'
  if (slug === 'fundingpips') return '/ru/obzor-fundingpips'
  if (slug === 'bright-funded') return '/ru/obzor-bright-funded'
  return firm.reviewUrl
}

export default function RussianPayoutsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const rows = firms
    .map(firm => {
      const slug = outboundSlug(firm.name)
      const products = challenges.filter(challenge =>
        challenge.firmSlug === slug && isChallengeFresh(challenge),
      )
      const methods = firm.payoutMethods ?? []
      return { firm, slug, products, methods, isPartner: Boolean(firm.affiliateUrl) }
    })
    .filter(row => row.methods.length > 0 && (row.products.length > 0 || row.isPartner))
    .sort((a, b) => {
      const partner = Number(b.isPartner) - Number(a.isPartner)
      return partner || b.firm.score - a.firm.score
    })

  const partnerRows = rows.filter(row => row.isPartner)
  const otherRows = rows.filter(row => !row.isPartner).slice(0, 8)
  const shownRows = [...partnerRows, ...otherRows]
  const cryptoCount = shownRows.filter(row => row.methods.includes('Crypto')).length
  const productCount = shownRows.reduce((sum, row) => sum + row.products.length, 0)
  const latestCapture = shownRows
    .flatMap(row => row.products.map(product => product.sourceCapturedAt))
    .sort()
    .at(-1) ?? 'дата не указана'

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Выплаты проп-фирм' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    numberOfItems: shownRows.length,
    itemListElement: shownRows.map((row, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        name: row.firm.name,
        url: `https://tradersfundhub.com${russianReviewHref(row.slug, row.firm)}`,
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
    dateModified: latestCapture,
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-payout-ranking="source-gated" data-russian-payout-firm-count={shownRows.length}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Выплаты проп-фирм</div>
          <div className="ru-eyebrow"><WalletCards size={14} aria-hidden="true" /> Первая выплата важнее рекламного сплита</div>
          <h1>Проп-фирмы с выплатами: крипто, банк и первая заявка</h1>
          <p className="ru-lead">
            Сравниваем методы вывода, окно первой выплаты и цикл вознаграждений по свежим продуктовым записям.
            «Crypto» в профиле фирмы не превращаем автоматически в USDT: сеть, провайдер, KYC и доступность
            зависят от конкретного продукта и страны трейдера.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{shownRows.length}</strong><span>фирм в текущей выборке</span></div>
            <div className="ru-stat"><strong>{cryptoCount}</strong><span>с опубликованным методом Crypto</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>свежих продуктов</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>последний захват условий</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#payouts" className="btn-primary btn-glow">Сравнить выплаты <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/promokody-prop-firm" className="btn-outline">Проверить промокоды</Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить страну и KYC</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" id="payouts">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="payout-not-access">
            <strong>Метод выплаты не доказывает доступность страны.</strong>{' '}
            Русскоязычным трейдерам нужно отдельно подтвердить гражданство, резидентство, KYC, платёжный провайдер,
            продукт и валюту вывода. Нельзя использовать VPN или неверные данные для обхода ограничений.
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="payout-ranking">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Партнёрские карточки отмечены переходом через /go/. Комиссия может быть начислена после регистрации,
            но не влияет на порядок, цифры выплаты или проверку источников. Если свежего продуктового захвата нет, старые сроки и правила не подставляются.
          </div>
          <h2>Проверенные карточки выплат</h2>
          <p className="ru-muted">Срок первой заявки относится к продукту, а список методов — к опубликованному профилю фирмы. Перед оплатой откройте источник именно выбранного продукта.</p>
          <div className="ru-grid">
            {shownRows.map(row => {
              const reviewHref = russianReviewHref(row.slug, row.firm)
              const isRussianReview = reviewHref.startsWith('/ru/')
              const source = row.products[0]?.sourceUrl
              return (
                <article className="ru-card" key={row.slug} data-russian-payout-firm={row.slug}>
                  <div className="ru-card-head"><h3>{row.firm.name}</h3>{row.isPartner && <span className="ru-score">Партнёр</span>}</div>
                  <ul className="ru-facts">
                    <li><WalletCards size={14} aria-hidden="true" /> Методы: {formatMethods(row.methods)}</li>
                    <li><CalendarClock size={14} aria-hidden="true" /> Первая заявка: {formatDays(row.products)}</li>
                    <li><Banknote size={14} aria-hidden="true" /> Цикл: {formatFrequencies(row.products)}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> {row.products.length > 0 ? `${row.products.length} свежих продуктов; проверено до ${row.products.map(product => product.sourceCapturedAt).sort().at(-1)}` : 'Свежий продуктовый захват временно отсутствует; проверьте актуальные правила'}</li>
                  </ul>
                  <p className="ru-muted">Криптометод не равен автоматически USDT/USDC; уточните токен, сеть, лимиты и комиссию у фирмы.</p>
                  {source ? (
                    <div className="ru-source-line"><Bitcoin size={14} aria-hidden="true" /> <a href={source} target="_blank" rel="nofollow noopener">Источник правил выбранного продукта</a></div>
                  ) : (
                    <div className="ru-source-line"><Bitcoin size={14} aria-hidden="true" /> Свежий источник продукта временно отсутствует; откройте официальный сайт перед оплатой.</div>
                  )}
                  <div className="ru-actions">
                    <Link href={reviewHref} hrefLang={isRussianReview ? 'ru' : 'en'} className="btn-outline">Открыть обзор</Link>
                    {row.isPartner && (
                      <Link href={`/go/${row.slug}?from=ru-payouts-${row.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                        Проверить условия <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как читать условия выплаты</h2>
          <div className="ru-grid">
            <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Первая заявка</h3><p className="ru-muted">Количество дней — только окно допуска к заявке. Прибыль, минимальная сумма, buffer, KYC и проверка правил остаются отдельными условиями.</p></article>
            <article className="ru-card"><Bitcoin size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Crypto не всегда USDT</h3><p className="ru-muted">Слово Crypto не называет токен, сеть или провайдера. Сохраняйте точную страницу фирмы и проверяйте комиссию до покупки.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Страна и KYC</h3><p className="ru-muted">Метод вывода не отменяет проверки адреса, гражданства, резидентства, санкций и соответствия имени получателя.</p></article>
          </div>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary">Вернуться к рейтингу <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/fundednext-vs-fundingpips" className="btn-outline">Сравнить партнёров</Link>
            <Link href="/ru/obzor-fundednext" className="btn-outline">Открыть обзор FundedNext</Link>
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
