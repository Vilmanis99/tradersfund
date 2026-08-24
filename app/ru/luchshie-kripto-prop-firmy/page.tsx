import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Database, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import cryptoMarketEvidence from '@/content/data/crypto-market-evidence.json'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/luchshie-kripto-prop-firmy'
const TITLE = 'Крипто-проп-фирмы 2026: проверенные варианты'
const DESCRIPTION = 'Русский обзор крипто-проп-фирм: продукты с источником, который называет торговлю криптовалютой; сравниваем модели, правила, просадку и проверку страны.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Крипто-проп-фирма даёт реальный капитал?',
    a: 'Нет автоматической гарантии. Страница показывает продукт, для которого источник фирмы прямо называет торговлю криптовалютой; этап, симуляция, KYC и право на выплату проверяются по договору и правилам конкретного продукта.',
  },
  {
    q: 'Оплата или выплата в криптовалюте доказывает доступ к рынку?',
    a: 'Нет. Криптовалютный платёж или метод выплаты не доказывает, что BTC, ETH или другой инструмент разрешён для торговли. Нужен отдельный источник с инструментами, контрактом, комиссией, плечом или криптосчётом.',
  },
  {
    q: 'Можно ли зарегистрироваться русскоязычному трейдеру из России?',
    a: 'Русский язык страницы не подтверждает доступность страны. До оплаты проверьте гражданство и резидентство, санкционные ограничения, KYC, страницу оплаты, платформу и доступный способ выплаты у выбранной фирмы.',
  },
  {
    q: 'Почему часть фирм не попала в список?',
    a: 'Фирма исключается, если текущий источник называет крипторынок, но все перечисленные продукты ещё не имеют свежих структурированных цен и правил. Мы не переносим строку Forex на криптопродукт и показываем такие случаи как пробел доказательств.',
  },
]

const snapshots = cryptoMarketEvidence.ranked.flatMap(evidence => {
  const firm = getAllFirms().find(candidate => candidate.name === evidence.firmName)
  const products = getChallengesByFirm(evidence.firmSlug).filter(product =>
    evidence.productSlugs.includes(product.productSlug) && isChallengeFresh(product),
  )
  return firm && products.length === evidence.productSlugs.length
    ? [{ evidence, products, firm }]
    : []
})

function drawdownLabel(product: Challenge) {
  if (!product.drawdownType) return 'просадка не опубликована'
  return ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType] ?? product.drawdownType
}

function splitLabel(products: Challenge[]) {
  const splits = [...new Set(products
    .map(product => product.profitSplitPct)
    .filter((value): value is number => value != null))]
    .sort((a, b) => a - b)
  return splits.length === 0
    ? 'сплит не опубликован'
    : `${splits[0]}${splits.length > 1 ? `–${splits.at(-1)}` : ''}%`
}

export default function RussianCryptoPropFirmsPage() {
  const productCount = snapshots.reduce((total, snapshot) => total + snapshot.products.length, 0)
  const sourceCount = new Set(snapshots.map(snapshot => snapshot.evidence.sourceUrl)).size
  const latestCapture = snapshots.map(snapshot => snapshot.evidence.sourceCapturedAt).sort().at(-1) ?? 'дата не указана'
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Крипто-проп-фирмы' },
  ])
  const list = itemListSchema(snapshots.map(snapshot => snapshot.firm), TITLE)
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Крипто</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Источники до {latestCapture}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Для запроса «проп трейдинг криптовалют» мы считаем подходящими только те карточки,
            где первичный источник прямо называет торговлю криптовалютой, а все связанные продукты
            имеют свежие структурированные записи. Оплата или выплата в криптовалюте сама по себе не добавляет фирму в список.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{snapshots.length}</strong><span>фирм с полной привязкой криптопродуктов</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>продуктов с текущими записями</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>первичных рыночных источников</span></div>
            <div className="ru-stat"><strong>{latestCapture}</strong><span>последняя дата источника</span></div>
          </div>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary btn-glow">Сравнить весь рынок <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/obzor-fundednext" className="btn-outline">Разбор FundedNext</Link>
            <Link href="/ru/obzor-fundingpips" className="btn-outline">Разбор FundingPips</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="crypto-not-access">
            <strong>Русский язык не означает доступность страны.</strong>{' '}
            Проверяйте гражданство, резидентство, KYC, санкционные ограничения, криптоинструменты,
            страницу оплаты и выплату отдельно. VPN или неверные данные не превращают запрещённый маршрут в разрешённый.
          </div>
          <div className="ru-grid" data-russian-crypto-ranking="source-gated" data-russian-crypto-product-count={productCount}>
            {snapshots.map(snapshot => {
              const { evidence, products, firm } = snapshot
              const affiliate = Boolean(firm.affiliateUrl)
              const shownProducts = products.slice(0, 3).map(product => product.productName)
              return (
                <article className="ru-card" key={evidence.firmSlug} data-russian-crypto-firm={evidence.firmSlug}>
                  <div className="ru-card-head">
                    <h2>{firm.name}</h2>
                    <span className="ru-score">{evidence.marketModel === 'crypto-native' ? 'Крипто-нативная' : 'Мультиактивная CFD'}</span>
                  </div>
                  <ul className="ru-facts">
                    <li><ShieldCheck size={14} aria-hidden="true" /> {products.length} продуктов: {shownProducts.join(', ')}{products.length > 3 ? ` и ещё ${products.length - 3}` : ''}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> Сплит: {splitLabel(products)}; просадка: {[...new Set(products.map(drawdownLabel))].join(', ')}</li>
                    <li><Database size={14} aria-hidden="true" /> Источник {evidence.sourceCapturedAt}: {evidence.evidenceRu ?? evidence.evidence}</li>
                  </ul>
                  <p className="ru-muted">{evidence.scopeNoteRu ?? evidence.scopeNote}</p>
                  <div className="ru-actions">
                    <Link href={firm.reviewUrl} className="btn-outline">Английский разбор</Link>
                    <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Открыть источник</a>
                    {affiliate && (
                      <Link href={`/go/${evidence.firmSlug}?from=ru-crypto-ranking`} rel="sponsored nofollow noopener" className="btn-primary">
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
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="crypto-ranking">
            <strong>Партнёрское раскрытие.</strong> Часть глобальных фирм на этой странице может иметь партнёрскую ссылку.
            Это не меняет источник, порядок карточек, число продуктов или правила отбора. Перед оплатой откройте условия выбранного продукта.
          </div>
          <h2>Как читать подтверждение крипторынка</h2>
          <p>Платёжная сеть, токен выплаты и торговый рынок — три разные вещи. В карточке выше ссылка источника должна прямо называть криптоинструменты или криптосчёт; банковский или криптовалютный способ выплаты без такого текста не считается доказательством.</p>
          <p>Крипто-нативная и мультиактивная CFD-модель тоже не взаимозаменяемы: символы, часы, комиссия, плечо, режим выходных и линия просадки проверяются на выбранном продукте. Сначала сопоставьте правило со своей стратегией, затем проверьте страну и KYC на странице оплаты.</p>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary">Вернуться к рейтингу <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">Разобрать этапы и выплаты</Link>
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
