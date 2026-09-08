import type { Metadata } from 'next'
import Image from 'next/image'
import Link from '@/components/SafeLink'
import { ArrowRight, BookOpenCheck, Globe2, Scale, Zap } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianFinderEntry from '@/components/RussianFinderEntry'
import { getRussianFinderRows } from '@/lib/challengeComparisonData'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru'
export const revalidate = 3600
const TITLE = 'Проп-фирмы для русскоязычных трейдеров: цены и правила'
const DESCRIPTION = 'Сравнение глобальных проп-фирм для русскоязычных трейдеров в разных странах: цены, просадки, выплаты, KYC и правила из первичных источников.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое онлайн-проп-фирма?',
    a: 'Это компания с программой оценки: трейдер оплачивает доступ к симулированному счёту, выполняет цель по прибыли и соблюдает лимиты риска. После успешной оценки фирма может предложить следующий симулированный или реальный этап и долю вознаграждения по договору.',
  },
  {
    q: 'Означает ли русская версия, что фирма работает с резидентами России?',
    a: 'Нет. Язык страницы не подтверждает доступность страны. Перед оплатой нужно проверить ограничения по гражданству и резидентству, требования к документам, способ оплаты и способ выплаты на официальном сайте конкретной фирмы.',
  },
  {
    q: 'Почему цены указаны в долларах или евро, а не в рублях?',
    a: 'Мы сохраняем валюту, в которой фирма публикует цену. Пересчёт в рубли быстро устаревает из-за курса и может скрыть комиссию банка или платёжного провайдера.',
  },
]

const featuredPartnerRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext', heroHref: '/go/fundednext?from=ru-home-hero-fundednext' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded', heroHref: '/go/bright-funded?from=ru-home-hero-bright-funded' },
] as const

export default function RussianHomePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const featuredPartnerCards = featuredPartnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = challenges.filter(product => product.firmSlug === route.slug)
    const fresh = products.length > 0 && products.every(product => isChallengeFresh(product))
    // Use the oldest capture so the date does not overstate freshness across products.
    const captureDate = fresh ? products.map(product => product.sourceCapturedAt).sort()[0] : null
    return { ...route, firm, fresh, captureDate }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([{ name: 'Traders Fund Hub', url: '/' }, { name: 'Русская версия' }])
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    isPartOf: { '@type': 'WebSite', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <div className="ru-home" data-russian-home-layout="focused">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero ru-home-hero">
        <div className="ru-shell">
          <div className="ru-eyebrow"><Globe2 size={14} aria-hidden="true" /> Для русскоязычных трейдеров по всему миру</div>
          <h1>Выберите проп-фирму по условиям, а не обещаниям</h1>
          <p className="ru-lead">Сравните стоимость участия, лимиты убытка и правила выплат. Объясняем условия глобальных проп-фирм на русском — с источниками и ограничениями.</p>
          <RussianFinderEntry sizes={[...new Set(getRussianFinderRows().flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))].sort((a, b) => a - b)} />

          <div className="ru-home-partner-hero" data-russian-home-hero-partners="fundednext-bright-funded">
            {featuredPartnerCards.map(item => (
              <article
                className={`ru-home-partner-hero-card${item.slug === 'fundednext' ? ' ru-home-partner-hero-card--fundednext' : ' ru-home-partner-hero-card--bright'}`}
                key={item.slug}
                data-russian-home-hero-partner={item.slug}
              >
                <div className="ru-home-partner-hero-brand">
                  {item.firm?.logo ? <span className="ru-home-partner-hero-logo" aria-hidden="true"><Image src={item.firm.logo} alt="" width={56} height={56} /></span> : null}
                  <div><span className="ru-home-partner-hero-label">Партнёр сайта</span><h2>{item.name}</h2></div>
                </div>
                <p>{item.fresh
                  ? item.slug === 'fundednext'
                    ? 'Программы с оплатой в USD: с оценочными этапами или без челленджа — Stellar Instant. В обзоре разбираем различия в просадке и выплатах.'
                    : 'Программы с оплатой в EUR и одним или двумя оценочными этапами. В обзоре разбираем лимиты убытка и ожидание первой выплаты.'
                  : 'Условия программ требуют повторной проверки. В обзоре объясняем модель работы и вопросы, которые стоит задать фирме перед оплатой.'}</p>
                <div className="ru-home-partner-hero-actions">
                  <Link href={item.reviewHref} className="btn-outline">Читать обзор {item.name}</Link>
                  <Link href={item.heroHref} rel="sponsored nofollow noopener" className="ru-home-partner-hero-review">Проверить условия {item.name} ↗</Link>
                </div>
                <p className="ru-source-line ru-home-checked">{item.captureDate ? `Источники проверены: ${item.captureDate}` : 'Обновление источников ожидается'}</p>
              </article>
            ))}
          </div>
          <p className="ru-source-line ru-home-partner-hero-disclosure" data-russian-affiliate-disclosure="home-primary-partners">FundedNext и Bright Funded — наши партнёры: переход на сайт фирмы может принести нам комиссию. Это не добавляет баллы в рейтинге и не означает, что программа подходит каждому.</p>
          <Link href="/ru/fundednext-vs-bright-funded" className="ru-home-comparison-link">FundedNext или Bright Funded: сравнить отличия <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="ru-section" data-russian-home-next-step="reader-decision">
        <div className="ru-shell" data-russian-home-navigation="task-first">
          <h2>С чего начать</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Scale size={22} aria-hidden="true" />
              <h3>Сравнить фирмы</h3>
              <p className="ru-muted">Цены, правила и редакционные оценки — чтобы составить свой короткий список.</p>
              <Link className="ru-card-link" href="/ru/luchshie-prop-firmy">Открыть рейтинг →</Link>
            </article>
            <article className="ru-card">
              <Zap size={22} aria-hidden="true" />
              <h3>Начать без челленджа</h3>
              <p className="ru-muted">Разберитесь, чем отсутствие оценки отличается от отсутствия ограничений.</p>
              <Link className="ru-card-link" href="/ru/prop-firmy-bez-chelendzha">Сравнить счета без челленджа →</Link>
            </article>
            <article className="ru-card" data-russian-home-definition-entry="prop-kompanii-eto">
              <BookOpenCheck size={22} aria-hidden="true" />
              <h3>Понять, как это работает</h3>
              <p className="ru-muted">За что платит трейдер, как проходит оценка и при каких условиях можно получить прибыль.</p>
              <Link className="ru-card-link" href="/ru/chto-takoe-prop-firma">Начать с основ →</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section ru-home-trust">
        <div className="ru-shell ru-home-trust-grid">
          <div>
            <h2>Что стоит за сравнением</h2>
            <p className="ru-muted">Сверяем цены и правила с сайтами самих фирм, указываем даты проверки и отмечаем противоречия. Не выдаём рекламный максимум за условия каждой программы.</p>
            <Link href="/methodology" hrefLang="en" className="ru-card-link">Методика оценки — на английском →</Link>
          </div>
          <div data-russian-country-boundary="language-not-access">
            <h3>Сначала проверьте свою страну</h3>
            <p className="ru-muted">Русский язык не означает доступность в России. До оплаты уточните требования к гражданству, проживанию и документам, а также способы оплаты и выплаты.</p>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="ru-card-link" data-russian-home-diaspora-entry="trust">Проверить страну и KYC →</Link>
            <p className="ru-source-line">Нужна местная биржевая торговля? <Link href="/ru/rossiyskie-prop-kompanii">Российские проп-компании разобраны отдельно.</Link></p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-home-guides="selected-three">
          <h2>Перед покупкой программы</h2>
          <div className="ru-home-guide-list">
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm"><span><strong>Как пройти оценку, не нарушив правила</strong><span>Цель по прибыли, просадка и этапы челленджа.</span></span><ArrowRight size={20} aria-hidden="true" /></Link>
            <Link href="/ru/vyplaty-prop-firm"><span><strong>Когда и как можно получить выплату</strong><span>Сроки, способы перевода и проверка документов.</span></span><ArrowRight size={20} aria-hidden="true" /></Link>
            <Link href="/ru/promokody-prop-firm"><span><strong>Как проверить скидку перед оплатой</strong><span>Условия предложений и итоговая цена участия.</span></span><ArrowRight size={20} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content"><h2>Частые вопросы</h2><RussianFaq items={faqs} /></div>
      </section>
    </div>
  )
}
