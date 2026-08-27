import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllFirms, getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-fundednext'
const TITLE = 'FundedNext: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор FundedNext на русском: модели Stellar, цены, просадка, выплаты и проверка ограничений по стране с датой захвата условий.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
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

function priceRange(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return 'не опубликована'
  const format = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return sorted[0] === sorted.at(-1) ? format(sorted[0]) : `${format(sorted[0])}–${format(sorted.at(-1)!)}`
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Доступен ли FundedNext резидентам России?',
    a: 'Мы не можем подтвердить доступность. Официальная статья по CFD не включает Россию в список ограничений, но корпоративная страница FundedNext говорит, что компания не обслуживает резидентов России. Futures-продукты прямо запрещают покупку из России. До письменного подтверждения поддержки и успешной проверки профиля считать доступ доказанным нельзя.',
  },
  {
    q: 'Какая программа FundedNext самая дешёвая?',
    a: 'Минимальная цена зависит от модели, размера счёта, промоакции и возможной отдельной платы платформы. Проверяйте именно текущую страницу оплаты: наша таблица показывает цены только после свежего захвата условий.',
  },
  {
    q: 'Получает ли новый трейдер сплит 95%?',
    a: 'Нет универсального процента для всех моделей. Сплит, платные дополнения и условия роста могут различаться по продукту, поэтому сравнивайте их по свежему захвату и действующим правилам.',
  },
  {
    q: 'Можно ли обойти ограничение страны через VPN?',
    a: 'Нет. FundedNext прямо запрещает скрывать резидентство или использовать VPN, прокси, чужую личность либо неверные данные для обхода ограничений; это может привести к закрытию аккаунта.',
  },
]

export default function RussianFundedNextReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'FundedNext')
  const products = getChallengesByFirm('fundednext')
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && tier.priceUsd > 0 ? [{ product, tier, price: tier.priceUsd }] : []))
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const sourceUrls = [...new Set(freshProducts.map(product => product.sourceUrl))]
  const latestProductCapture = products.map(product => product.sourceCapturedAt).sort().at(-1)
  const hasFreshProducts = freshProducts.length > 0

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор FundedNext' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2024-09-02',
    dateModified: marketEvidence.capturedAt,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FundedNext</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> {hasFreshProducts ? `Свежие данные продуктов: ${latestProductCapture}` : `Захват условий от ${latestProductCapture ?? 'неуказанной даты'} требует обновления`}</div>
          <h1>FundedNext: обзор 2026 — модели, цены и правила</h1>
          <p className="ru-lead">
            Модели Stellar различаются числом этапов, просадкой, сплитом и сроком первой выплаты.
            Выбирать нужно по ограничивающему правилу, а не по максимальному рекламному проценту.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>текущих моделей</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>опубликованных цен</span></div>
            <div className="ru-stat"><strong>{priceRange(pricedTiers.map(item => item.price))}</strong><span>диапазон входа</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-fundednext-russia-access="conflicting">
            <strong><AlertTriangle size={16} aria-hidden="true" /> Для резидентов России данные противоречат друг другу.</strong>{' '}
            Статья FundedNext по ограничениям CFD от 8 апреля 2026 года не называет
            Россию, но корпоративная страница говорит, что FundedNext Ltd не обслуживает
            резидентов России. Futures-направление прямо запрещает покупку из России,
            а банковский перевод для выплат в Россию недоступен. Мы не считаем доступ
            подтверждённым, пока поддержка и страница оплаты не подтвердят конкретный продукт и профиль.
          </div>
          <div className="ru-actions" aria-label="Источники ограничений FundedNext">
            {accessEvidence?.sourceUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="btn-outline">
                Официальный источник {index + 1}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>Как различаются модели</h2>
          <p className="ru-muted">{hasFreshProducts ? 'Все числа ниже выводятся из свежего продуктового файла; цена — до промоакций и без отдельной платформенной платы, если она применяется.' : `Числовые условия временно не показываем: последний захват продуктов (${latestProductCapture ?? 'дата не указана'}) старше 30 дней. Проверьте текущие правила FundedNext перед оплатой.`}</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-fundednext-russian-products={freshProducts.length}>
              <thead>
                <tr><th>Модель</th><th>Этапы</th><th>Цена</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Просадка</th><th>Стартовый сплит</th><th>Первая выплата</th></tr>
              </thead>
              <tbody>
                {hasFreshProducts ? freshProducts.map(product => {
                  const prices = product.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [tier.priceUsd])
                  return (
                    <tr key={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{product.phases === 0 ? 'без оценки' : product.phases}</td>
                      <td>{priceRange(prices)}</td>
                      <td>{product.dailyLossPct == null ? 'не опубликован' : `${product.dailyLossPct}%`}</td>
                      <td>{product.maxLossPct == null ? 'не опубликован' : `${product.maxLossPct}%`}</td>
                      <td>{product.drawdownType
                        ? (drawdownLabels[product.drawdownType] ?? product.drawdownType)
                        : 'не опубликована'}</td>
                      <td>{product.profitSplitPct == null ? 'не опубликован' : `${product.profitSplitPct}%`}</td>
                      <td>{product.payoutFirstDays === 0 ? 'по запросу после условий' : `${product.payoutFirstDays} дн.; ${payoutLabels[product.payoutFrequency ?? ''] ?? product.payoutFrequency}`}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={8}>Свежий продуктовый захват временно отсутствует; цены и правила не подставляются.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>{hasFreshProducts ? 'Цены по свежему захвату без пересчёта валюты' : 'Цены временно не показываются'}</h2>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Модель</th><th>Размер счёта</th><th>Цена</th><th>Возврат взноса</th><th>Источник</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier, price }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>${price.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 })}</td>
                    <td>{tier.refundable ? 'условно возвратный' : 'невозвратный'}</td>
                    <td>{product.sourceCapturedAt}</td>
                  </tr>
                )) : <tr><td colSpan={5}>Нет свежих цен для безопасного отображения; откройте официальную страницу оплаты.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Уникальных свежих страниц продукта: {sourceUrls.length}. Полные доказательства и
            примечания доступны в <Link href="/blog/fundednext-review" hrefLang="en">английском обзоре FundedNext</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Вердикт: сначала правило, потом цена</h2>
          <div className="ru-grid">
            {hasFreshProducts ? freshProducts.map(product => {
              const stage = product.phases === 0 ? 'без оценочного этапа' : `${product.phases} этапа оценки`
              const drawdown = product.drawdownType ? (drawdownLabels[product.drawdownType] ?? product.drawdownType) : 'тип просадки не опубликован'
              const payout = product.payoutFirstDays === 0
                ? 'выплата по запросу после выполнения условий'
                : product.payoutFirstDays != null
                  ? `первая выплата от ${product.payoutFirstDays} дней`
                  : 'срок первой выплаты не опубликован'
              return (
                <article className="ru-card" key={product.productSlug}>
                  <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                  <h3>{product.productName}</h3>
                  <p className="ru-muted">{stage}; {drawdown}; {payout}. Перед оплатой подтвердите страну, KYC и актуальный регламент.</p>
                </article>
              )
            }) : (
              <div className="ru-notice"><strong>Вердикт по модели отложен.</strong> Последний захват условий старше 30 дней, поэтому редакция не повторяет устаревшие проценты, цены или сроки. Откройте официальный checkout и сравните свежие правила.</div>
            )}
          </div>

          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="fundednext">
            <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если
            подходящий читатель зарегистрируется по ссылке ниже. Цена для читателя от
            этого не увеличивается, а редакционные числа и вердикт не меняются.
            Резидентам России нельзя использовать ссылку до разрешения противоречия
            между официальными страницами и подтверждения конкретного профиля.
          </div>
          {firm?.affiliateUrl ? (
            <div className="ru-actions">
              <Link
                href="/go/fundednext?from=ru-fundednext-review-verdict"
                rel="sponsored nofollow noopener"
                className="btn-primary btn-glow"
              >
                Проверить страну и условия на FundedNext <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/ru/luchshie-prop-firmy" className="btn-outline">
                Сравнить с другими фирмами
              </Link>
            </div>
          ) : (
            <p>Партнёрская ссылка сейчас не настроена; используйте рейтинг для сравнения.</p>
          )}
          <p className="ru-source-line"><BadgeDollarSign size={14} aria-hidden="true" /> Переход ведёт через контролируемый редирект Traders Fund Hub; отношения ссылки помечены как sponsored и nofollow.</p>
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
