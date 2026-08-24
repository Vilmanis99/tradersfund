import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgePercent, CalendarCheck, ExternalLink, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllFirms } from '@/lib/firms'
import { getAllDeals, rankDeals, type Deal } from '@/lib/deals'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

export const revalidate = 86400

const PATH = '/ru/promokody-prop-firm'
const TITLE = 'Промокоды проп-фирм 2026: проверенные предложения'
const DESCRIPTION = 'Проверенные промокоды и предложения проп-фирм на русском: условия, дата проверки, персональный купон FundedNext и переход к глобальным продуктам.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Здесь есть публичные промокоды, которые можно просто скопировать?',
    a: 'Не всегда. Мы разделяем код для ввода, скидку по ссылке и купон, который фирма выдаёт после отдельного условия. Если публичной строки нет, мы не придумываем её и прямо показываем способ получения предложения.',
  },
  {
    q: 'Как работает предложение FundedNext?',
    a: 'Текущий источник описывает персональный купон для подходящего нового пользователя после выполнения условия Free Trial. Проверьте полный текст условия на официальной странице, дождитесь выдачи кода фирмой и подтвердите итоговую сумму на checkout.',
  },
  {
    q: 'Гарантирует ли affiliate-ссылка скидку или регистрацию?',
    a: 'Нет. Партнёрская ссылка позволяет измерить переход и может принести нам комиссию, но не гарантирует скидку, принятие KYC, доступность страны или выплату. Эти условия нужно подтвердить у фирмы.',
  },
  {
    q: 'Почему некоторые предложения исчезают?',
    a: 'Каждая карточка проходит 30-дневный контроль свежести. Просроченное или давно не проверенное предложение удаляется автоматически, даже если старый текст всё ещё виден на сторонних страницах.',
  },
]

function mechanismLabel(mechanism: Deal['mechanism']) {
  return ({
    'checkout-code': 'Код вводится на оплате',
    'link-applied': 'Скидка применяется по ссылке',
    'earned-coupon': 'Персональный купон после условия',
  } as Record<Deal['mechanism'], string>)[mechanism]
}

function offerAction(deal: Deal) {
  if (deal.mechanism === 'earned-coupon') return 'Начать Free Trial'
  if (deal.mechanism === 'link-applied') return 'Открыть предложение'
  return 'Проверить промокод'
}

export default function RussianPropFirmOffersPage() {
  const firms = getAllFirms()
  const deals = rankDeals(getAllDeals(), firms)
  const firmBySlug = new Map(firms.map(firm => [
    firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    firm,
  ]))
  const latestVerified = deals.map(deal => deal.verifiedOn).sort().at(-1) ?? 'нет данных'
  const codeCount = deals.filter(deal => deal.mechanism === 'checkout-code').length
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Промокоды проп-фирм' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    numberOfItems: deals.length,
    itemListElement: deals.map((deal, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        name: firmBySlug.get(deal.firmSlug)?.name ?? deal.firmSlug,
        url: `https://tradersfundhub.com/ru/promokody-prop-firm#${deal.firmSlug}`,
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
    dateModified: latestVerified,
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
        <div className="ru-shell" data-russian-deals="verified-offers" data-russian-deal-count={deals.length} data-russian-offer-freshness="30-days">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Промокоды</div>
          <div className="ru-eyebrow"><BadgePercent size={14} aria-hidden="true" /> Только проверенные условия</div>
          <h1>Промокоды проп-фирм 2026: проверенные предложения</h1>
          <p className="ru-lead">
            Показываем только предложения с первичным источником и датой проверки. Публичный код,
            скидка по ссылке и персональный купон — разные механизмы, поэтому мы не выдаём старый
            код за действующую скидку.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{deals.length}</strong><span>актуальных предложений</span></div>
            <div className="ru-stat"><strong>{codeCount}</strong><span>кодов для ввода</span></div>
            <div className="ru-stat"><strong>{latestVerified}</strong><span>последняя проверка</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#offers" className="btn-primary btn-glow">Смотреть предложения <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить глобальные фирмы</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" id="offers">
        <div className="ru-shell" data-russian-affiliate-disclosure="deals">
          <div className="ru-notice" data-russian-country-boundary="deals-not-access">
            <strong>Предложение не подтверждает доступность страны.</strong>{' '}
            Русскоязычным трейдерам нужно отдельно проверить гражданство, резидентство, KYC,
            оплату, продукт и выплату. VPN или неверные данные не являются способом получить доступ.
          </div>
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Часть переходов ниже может быть партнёрской. Мы можем получить комиссию после регистрации,
            но это не меняет проверку предложения, порядок фирм или финальную цену.
          </div>
          <h2>Текущие предложения</h2>
          <p className="ru-muted">Карточка остаётся здесь только пока дата проверки находится в 30-дневном окне и предложение не истекло.</p>
          <div className="ru-grid">
            {deals.map(deal => {
              const firm = firmBySlug.get(deal.firmSlug)
              if (!firm) return null
              const isAffiliate = Boolean(firm.affiliateUrl)
              return (
                <article className="ru-card" id={deal.firmSlug} key={`${deal.firmSlug}-${deal.mechanism}`} data-russian-deal-firm={deal.firmSlug}>
                  <div className="ru-card-head"><h3>{firm.name}</h3><span className="ru-score">{deal.amountLabel}</span></div>
                  <p className="ru-muted"><strong>{mechanismLabel(deal.mechanism)}</strong>{deal.scope ? ` · ${deal.scope}` : ''}</p>
                  <p>{deal.note ?? 'Условия указаны на первичной странице фирмы; проверьте итоговую сумму до оплаты.'}</p>
                  <div className="ru-source-line"><CalendarCheck size={14} aria-hidden="true" /> Проверено {deal.verifiedOn} · <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">{deal.sourceLabel}</a></div>
                  <div className="ru-actions">
                    <Link href={firm.reviewUrl.startsWith('/blog/') ? (firm.name === 'FundedNext' ? '/ru/obzor-fundednext' : firm.reviewUrl) : firm.reviewUrl} className="btn-outline">Открыть обзор</Link>
                    <Link
                      href={`/go/${deal.firmSlug}?from=ru-deals-${deal.mechanism}`}
                      rel={isAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
                      className="btn-primary"
                    >
                      {offerAction(deal)} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          {deals.length === 0 && (
            <div className="ru-notice"><strong>Сейчас нет свежих предложений.</strong> Проверьте рейтинг и продуктовые обзоры — мы не показываем устаревшие коды.</div>
          )}
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как читать карточку предложения</h2>
          <div className="ru-grid">
            <article className="ru-card"><BadgePercent size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Код для ввода</h3><p className="ru-muted">На странице оплаты есть строка, которую можно ввести вручную; мы публикуем её только после проверки.</p></article>
            <article className="ru-card"><ArrowRight size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Скидка по ссылке</h3><p className="ru-muted">Фирма сообщает, что цена применяется через ссылку; отдельный код не изобретается.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Персональный купон</h3><p className="ru-muted">Сначала нужно выполнить условие фирмы, после чего она сама создаёт купон для подходящего пользователя.</p></article>
          </div>
          <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Английская версия предложений: <Link href="/prop-firm-discount-codes">Prop Firm Discount Codes</Link>.</p>
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
