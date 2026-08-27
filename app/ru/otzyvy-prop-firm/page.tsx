import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileSearch, Globe2, ShieldAlert, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/otzyvy-prop-firm'
const TITLE = 'Отзывы о проп-фирмах: проверка условий (2026)'
const DESCRIPTION = 'Отзывы о проп-фирмах на русском: как проверить правила, выплаты, KYC и дату источника, а затем сравнить глобальные продукты без рекламного рейтинга.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Почему одной оценки в отзыве недостаточно?',
    a: 'Звёзды и комментарий описывают опыт конкретного трейдера, но не показывают текущую цену, версию правила, страновые ограничения или условия выплаты. Сначала сопоставьте отзыв с официальной страницей продукта и датой захвата.',
  },
  {
    q: 'Что проверить в отзыве о выплате?',
    a: 'Нужны название продукта, дата запроса, число прибыльных дней, способ выплаты, KYC и ссылка на действующий регламент. Слово «выплатили» без этих полей нельзя переносить на другой размер счёта или страну.',
  },
  {
    q: 'Можно ли доверять отзывам о проп-фирмах без KYC?',
    a: 'Фраза «без KYC» может относиться только к регистрации или покупке челленджа. Перед funded-этапом и выплатой фирма может запросить документы, поэтому проверяйте весь путь, а не только первый экран.',
  },
  {
    q: 'Есть ли у Traders Fund Hub affiliate-комиссия?',
    a: 'Да, отдельные глобальные CTA на этой странице могут приносить комиссию. Мы помечаем их как sponsored и не выдаём комиссию за доказательство доступа, качества или гарантии выплаты.',
  },
]

const globalRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'fundingpips', name: 'FundingPips', reviewHref: '/ru/obzor-fundingpips' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

export default function RussianPropFirmReviewsPage() {
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Отзывы о проп-фирмах' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    dateModified: marketEvidence.capturedAt,
    inLanguage: 'ru',
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-reviews-guide="source-gated">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Отзывы о проп-фирмах</div>
          <div className="ru-eyebrow"><FileSearch size={14} aria-hidden="true" /> Проверка отзывов, а не рекламный рейтинг</div>
          <h1>Отзывы о проп-фирмах: как проверить опыт трейдера</h1>
          <p className="ru-lead">Русскоязычные отзывы помогают найти реальные вопросы, но не заменяют правила конкретного продукта. Ниже — чек-лист для цены, просадки, выплат, KYC, страны и даты источника, после которого можно сравнивать глобальные фирмы.</p>
          <div className="ru-actions"><Link href="#checklist" className="btn-primary btn-glow">Открыть чек-лист <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить продукты</Link><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить страну</Link></div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshChallenges.length}</strong><span>свежих продуктов с датой источника</span></div>
            <div className="ru-stat"><strong>{globalCards.length}</strong><span>глобальных партнёра в CTA</span></div>
            <div className="ru-stat"><strong>4</strong><span>поля проверки отзыва</span></div>
            <div className="ru-stat"><strong>{marketEvidence.capturedAt}</strong><span>дата редакционного среза</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="checklist">
        <div className="ru-shell" data-russian-country-boundary="reviews-not-access">
          <div className="ru-notice"><strong>Отзыв не доказывает доступность.</strong> Русский язык, отзыв о выплате или скриншот не подтверждают, что конкретный продукт принимает ваше гражданство, резидентство, KYC-документы или платёжный маршрут.</div>
          <h2>Четыре поля, которые должны совпасть</h2>
          <div className="ru-grid">
            <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Продукт и дата</h3><p className="ru-muted">Запишите фирму, модель, размер счёта, цену и дату отзыва. Сравнивайте отзыв только с той же версией продукта и источником, захваченным не старше 30 дней.</p></article>
            <article className="ru-card"><ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Правило риска</h3><p className="ru-muted">Проверьте дневную и общую просадку, консистентность, новости, выходные и запреты на копирование. Один успешный скриншот не показывает, какое правило остановило аккаунт.</p></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Выплата и KYC</h3><p className="ru-muted">Ищите первую выплату, число прибыльных дней, комиссию, способ вывода и момент проверки личности. «Без KYC» на этапе покупки не равно «без документов» при выплате.</p></article>
            <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. Страна и договор</h3><p className="ru-muted">Отделяйте русскоязычную аудиторию от резидентства. Проверьте ограничения фирмы, договор, гражданство, адрес, санкционные списки и платёжный провайдер до оплаты.</p></article>
          </div>
          <p className="ru-source-line">Наши карточки используют первичные страницы фирм и дату захвата {marketEvidence.capturedAt}; комментарии сообщества — сигнал для проверки, а не самостоятельная оценка.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Русские локальные кейсы и глобальные обзоры</h2>
          <p>Локальные модели полезны для понимания рублёвых выплат и рынка, но сравнивать их с глобальными CFD-продуктами напрямую нельзя. Откройте <Link href="/ru/rossiyskie-prop-kompanii">исследование шести российских моделей: Era Trade, PropLive, KasCapital, А-Лаб, TeamTraders и Trade System</Link>, а затем сопоставьте его с русскими обзорами глобальных фирм.</p>
          <div className="ru-actions"><Link href="/ru/obzor-proplive" className="btn-outline">PropLive</Link><Link href="/ru/obzor-eratrade" className="btn-outline">Era Trade</Link><Link href="/ru/obzor-kascapital" className="btn-outline">KasCapital</Link></div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-reviews-global-funnel="global-partners">
          <div className="ru-notice ru-disclosure"><strong>Глобальные партнёрские CTA.</strong> Переходы ниже могут приносить комиссию Traders Fund Hub. Отзыв — это опыт отдельного трейдера; продуктовую дату и действующие правила нужно открыть заново перед регистрацией.</div>
          <h2>Сравнить глобальные проп-фирмы после проверки отзывов</h2>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-reviews-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.products.length > 0 ? `${item.products.length} свежих продуктов` : 'Свежий продуктовый захват временно отсутствует'}; сопоставьте отзыв с первичным источником, русским обзором и проверкой доступа.</p>
                <div className="ru-actions"><Link href={item.reviewHref} className="btn-outline">Русский обзор</Link><Link href={`/go/${item.slug}?from=ru-reviews-guide-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">Проверить условия <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ru-section"><div className="ru-shell ru-content"><h2>Частые вопросы</h2><RussianFaq items={faqs} /></div></section>
    </>
  )
}
