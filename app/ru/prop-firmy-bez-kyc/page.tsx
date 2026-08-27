import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileCheck2, Globe2, ShieldAlert, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/prop-firmy-bez-kyc'
const TITLE = 'Проп-фирмы без KYC: что проверить до выплаты (2026)'
const DESCRIPTION = 'Проп-фирмы без KYC и документов: что означает рекламная формулировка, когда нужна проверка личности и как выбрать глобальный продукт русскоязычному трейдеру.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Существуют ли проп-фирмы полностью без KYC?',
    a: 'Нельзя считать это универсальным свойством фирмы. Формулировка no KYC может означать отсутствие проверки при покупке, но проверка личности часто появляется перед выплатой, при смене продукта или при подозрении на нарушение. Читайте правила выбранной модели до оплаты.',
  },
  {
    q: 'Можно ли получить выплату без паспорта или документа?',
    a: 'Не рассчитывайте на это без письменного подтверждения фирмы. Метод выплаты, криптовалюта и русский язык страницы не отменяют KYC, подтверждение адреса, санкционный screening или проверку имени получателя.',
  },
  {
    q: 'Почему no KYC не означает доступ из России?',
    a: 'KYC и страновые ограничения — разные проверки. Даже если документ не запрашивают на старте, фирма может ограничивать гражданство, резидентство, платёжный маршрут или выплату. Нельзя обходить это VPN, чужими документами или неверным адресом.',
  },
  {
    q: 'Что выбрать вместо обещания «без верификации»?',
    a: 'Выберите глобальный продукт с опубликованными правилами, сроком первой выплаты, способом вывода и процедурой KYC. Сначала сравните условия, затем подтвердите свою страну у фирмы и только после этого регистрируйтесь.',
  },
]

const partnerRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'fundingpips', name: 'FundingPips', reviewHref: '/ru/obzor-fundingpips' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

export default function RussianNoKycPage() {
  const allChallenges = getAllChallenges()
  const freshChallenges = allChallenges.filter(product => isChallengeFresh(product))
  const partnerCards = partnerRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Проп-фирмы без KYC' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-kyc-guide="source-gated" data-russian-kyc-partner-count={partnerCards.length}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Проп-фирмы без KYC</div>
          <div className="ru-eyebrow"><ShieldAlert size={14} aria-hidden="true" /> No KYC — не разрешение на выплату</div>
          <h1>Проп-фирмы без KYC: что проверить до выплаты</h1>
          <p className="ru-lead">
            Запрос «проп фирмы без верификации» выглядит простым, но у него есть скрытый второй этап:
            правила могут потребовать KYC перед первой выплатой. Разбираем формулировку без обещаний
            и ведём проверенного русскоязычного трейдера к глобальным продуктам с опубликованными условиями.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{partnerCards.length}</strong><span>глобальных партнёрских маршрута</span></div>
            <div className="ru-stat"><strong>{partnerCards.reduce((sum, item) => sum + item.products.length, 0)}</strong><span>свежих продуктов в CTA</span></div>
            <div className="ru-stat"><strong>3</strong><span>уровня проверки личности</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#check" className="btn-primary btn-glow">Пройти проверку <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить выплаты</Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить страну</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="kyc-not-access">
            <strong>Ни одна рекламная надпись не подтверждает вашу доступность.</strong>{' '}
            Русский язык, криптооплата, отсутствие KYC на старте и открытая регистрационная форма
            не доказывают право на покупку или выплату. Отдельно проверяйте гражданство, резидентство,
            адрес, санкции, платёжный метод и документ выбранного продукта.
          </div>
          <h2>Три уровня, где появляется KYC</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>До покупки</h3>
              <p className="ru-muted">Фирма может проверить страну, гражданство или платёжный маршрут уже на checkout. Отсутствие запроса документа на первом экране не является разрешением.</p>
            </article>
            <article className="ru-card">
              <FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>После прохождения</h3>
              <p className="ru-muted">Перед funded-этапом могут запросить удостоверение личности, адрес, подтверждение источника средств или совпадение имени в платёжном профиле.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Перед выплатой</h3>
              <p className="ru-muted">Календарь выплаты не заменяет проверку личности. Сначала выясните, какие документы и страны принимает именно выбранный метод вывода.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="check">
        <div className="ru-shell ru-content">
          <h2>Чек-лист перед регистрацией</h2>
          <ol>
            <li><strong>Источник:</strong> найдите в правилах выбранного продукта слова KYC, identity, verification и payout.</li>
            <li><strong>Личность:</strong> сопоставьте гражданство, резидентство, адрес и документ — не только IP и карту.</li>
            <li><strong>Выплата:</strong> проверьте токен, сеть, провайдера, минимальную сумму, комиссии и имя получателя.</li>
            <li><strong>Ограничения:</strong> подтвердите страну и продукт у поддержки до оплаты, если формулировка расплывчата.</li>
            <li><strong>Риск:</strong> не используйте VPN, чужие документы или ложные данные для обхода проверки.</li>
          </ol>
          <p>
            Если вам нужна именно проверка выплат, используйте отдельную страницу{' '}
            <Link href="/ru/vyplaty-prop-firm">сравнения методов и первой заявки</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="kyc-guide">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Ниже показаны только глобальные фирмы с активной партнёрской ссылкой. При отсутствии свежего захвата мы не показываем старые цены или правила.
            Комиссия не меняет этот KYC-чеклист, порядок карточек или страновое предупреждение.
          </div>
          <h2>Глобальные варианты после проверки</h2>
          <div className="ru-grid">
            {partnerCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-kyc-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.products.length > 0 ? `${item.products.length} свежих продуктов` : 'Свежий продуктовый захват временно отсутствует'}. Сначала откройте русский обзор и подтвердите KYC, страну и выплату у фирмы.</p>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Открыть обзор</Link>
                  <Link href={`/go/${item.slug}?from=ru-kyc-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                    Проверить условия <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
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
