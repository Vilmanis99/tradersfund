import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Database, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/luchshie-prop-firmy'
const TITLE = 'Лучшие проп-фирмы 2026: рейтинг и сравнение'
const DESCRIPTION = 'Рейтинг проп-фирм для русскоязычных трейдеров: свежие цены, продукты, просадки и базовые сплиты без подмены доступности страны.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая проп-фирма лучшая?',
    a: 'Единой лучшей фирмы нет. Редакционный балл помогает сократить список, но итог зависит от конкретного продукта: цены, числа этапов, типа просадки, торговых ограничений и условий выплаты.',
  },
  {
    q: 'Учитывается ли партнёрская комиссия в рейтинге?',
    a: 'Нет. Партнёрский статус не добавляет баллы и не меняет порядок. Он раскрывается отдельно рядом с переходом на сайт фирмы.',
  },
  {
    q: 'Можно ли пользоваться этим рейтингом из любой страны?',
    a: 'Рейтинг можно читать в любой стране, но покупка продукта зависит от гражданства, резидентства, KYC, платёжного способа и правил фирмы. Перед оплатой нужно подтвердить доступность на официальном сайте.',
  },
]

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function formatMoney(value: number, currency: 'USD' | 'EUR') {
  const amount = value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currency === 'USD' ? `$${amount}` : `€${amount}`
}

function drawdownLabel(value: string | null) {
  if (!value) return 'не подтверждена'
  return ({
    static: 'статическая',
    trailing: 'трейлинг',
    'eod-trailing': 'EOD-трейлинг',
    'balance-based': 'по балансу',
  } as Record<string, string>)[value] ?? value
}

export default function RussianBestPropFirmsPage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const ranked = firms
    .map(firm => {
      const slug = slugify(firm.name)
      const products = challenges.filter(challenge => challenge.firmSlug === slug)
      return { firm, slug, products }
    })
    .filter(item => item.products.length > 0 && item.products.every(product => isChallengeFresh(product)))
    .sort((a, b) => b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name))

  const topFive = ranked.slice(0, 5)
  const latestCapture = ranked
    .flatMap(item => item.products.map(product => product.sourceCapturedAt))
    .sort()
    .at(-1)
  const pricedProductCount = ranked.reduce((total, item) => total + item.products.filter(product =>
    product.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length, 0)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы 2026' },
  ])
  const faq = faqPageSchema(faqs)
  const list = itemListSchema(ranked.map(item => item.firm), TITLE)
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Рейтинг</div>
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Порядок не продаётся</div>
          <h1>Лучшие проп-фирмы 2026: рейтинг для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            В рейтинг попадают только фирмы, у которых все текущие продукты прошли
            30-дневный контроль свежести. Редакционный балл задаёт порядок; партнёрская
            ссылка, купон и размер комиссии не добавляют ни одного балла.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{ranked.length}</strong><span>фирм прошли текущий фильтр</span></div>
            <div className="ru-stat"><strong>{ranked.reduce((sum, item) => sum + item.products.length, 0)}</strong><span>проверенных продуктов</span></div>
            <div className="ru-stat"><strong>{pricedProductCount}</strong><span>продуктов с ценой</span></div>
            <div className="ru-stat"><strong>{latestCapture ?? '—'}</strong><span>последний захват источника</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#polnyy-reyting" className="btn-primary btn-glow">Смотреть весь рейтинг <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">Сначала понять правила</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="ranking-not-access">
            <strong>Это не рейтинг доступности в России.</strong>{' '}
            Он написан по-русски для мировой русскоязычной аудитории. Страна,
            гражданство, IP, KYC, карта и способ выплаты проверяются отдельно у каждой фирмы.
          </div>
          <h2>Первые пять по текущему редакционному баллу</h2>
          <p className="ru-muted">Карточки ниже выводятся из тех же фирменных и продуктовых данных, что и английская версия.</p>
          <div className="ru-grid" data-russian-ranking="top-five">
            {topFive.map((item, index) => {
              const usdPrices = item.products.flatMap(product => product.accountSizes.flatMap(tier =>
                tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : []))
              const eurPrices = item.products.flatMap(product => product.accountSizes.flatMap(tier =>
                tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : []))
              const entryPrices = [
                ...(usdPrices.length ? [`от ${formatMoney(Math.min(...usdPrices), 'USD')}`] : []),
                ...(eurPrices.length ? [`от ${formatMoney(Math.min(...eurPrices), 'EUR')}`] : []),
              ].join(' / ') || 'цена не подтверждена'
              const splits = [...new Set(item.products.flatMap(product =>
                product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
              const drawdowns = [...new Set(item.products.map(product => drawdownLabel(product.drawdownType)))]
              const reviewHref = item.slug === 'fundednext'
                ? '/ru/obzor-fundednext'
                : item.firm.reviewUrl

              return (
                <article className="ru-card ru-ranking-card" key={item.slug} data-ranked-firm={item.slug}>
                  <div className="ru-card-head">
                    <span className="ru-rank">Место {index + 1}</span>
                    <span className="ru-score">{item.firm.score.toFixed(1)}/10</span>
                  </div>
                  <h3>{item.firm.name}</h3>
                  <ul className="ru-facts">
                    <li><Database size={14} aria-hidden="true" /> {item.products.length} текущих продуктов</li>
                    <li><BadgeCheck size={14} aria-hidden="true" /> вход {entryPrices}</li>
                    <li><ShieldCheck size={14} aria-hidden="true" /> сплит {splits.length > 0 ? `${splits.join('–')}%` : 'не подтверждён'}; просадка: {drawdowns.join(' / ')}</li>
                    <li>Источники проверены до {item.products.map(product => product.sourceCapturedAt).sort().at(-1)}</li>
                  </ul>
                  <Link
                    className="ru-card-link"
                    href={reviewHref}
                    hrefLang={item.slug === 'fundednext' ? 'ru' : 'en'}
                  >
                    {item.slug === 'fundednext' ? 'Читать обзор на русском →' : 'Открыть полный обзор на английском →'}
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ru-section" id="polnyy-reyting">
        <div className="ru-shell">
          <h2>Полный текущий рейтинг</h2>
          <p className="ru-muted">Если у фирмы устареет хотя бы один продукт, она исчезнет из этой таблицы до следующей проверки источников.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead>
                <tr><th>Место</th><th>Фирма</th><th>Балл</th><th>Продукты</th><th>Сплиты</th><th>Проверено</th><th>Связь</th></tr>
              </thead>
              <tbody>
                {ranked.map((item, index) => {
                  const splits = [...new Set(item.products.flatMap(product =>
                    product.profitSplitPct == null ? [] : [product.profitSplitPct]))].sort((a, b) => a - b)
                  const latest = item.products.map(product => product.sourceCapturedAt).sort().at(-1)
                  return (
                    <tr key={item.slug}>
                      <td>{index + 1}</td>
                      <td><Link href={item.slug === 'fundednext' ? '/ru/obzor-fundednext' : item.firm.reviewUrl}>{item.firm.name}</Link></td>
                      <td>{item.firm.score.toFixed(1)}/10</td>
                      <td>{item.products.length}</td>
                      <td>{splits.length > 0 ? `${splits.join('–')}%` : '—'}</td>
                      <td>{latest}</td>
                      <td>{item.firm.affiliateUrl ? 'партнёрская' : 'официальная'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ranking">
            Некоторые фирмы используют партнёрские ссылки: мы можем получить комиссию,
            если читатель зарегистрируется после перехода. Это не меняет редакционный
            балл, место, набор фактов или правила контроля свежести.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как превратить рейтинг в решение</h2>
          <ol>
            <li>Выберите рынок: CFD, фьючерсы или крипто-продукты нельзя считать взаимозаменяемыми.</li>
            <li>Сравните конкретный размер счёта и полную сумму до финансируемого этапа.</li>
            <li>Найдите тип просадки и момент её расчёта: real-time, EOD, баланс или эквити.</li>
            <li>Проверьте базовый сплит, первую дату выплаты, consistency rule и возврат взноса.</li>
            <li>Только после этого подтвердите страну, KYC, оплату и способ выплаты.</li>
          </ol>
          <p>
            Для продуктового выбора откройте <Link href="/prop-firm-challenges" hrefLang="en">полный фильтр челленджей на английском</Link>{' '}
            или <Link href="/ru/obzor-fundednext">русский разбор FundedNext</Link>.
          </p>
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
