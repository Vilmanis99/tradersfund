import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCheck2,
  Globe2,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/prop-firmy-bez-kyc'
const TITLE = 'KYC в проп-фирмах 2026: FundedNext и Bright Funded'
const DESCRIPTION = 'KYC в проп-фирмах: когда FundedNext, Bright Funded и FundingPips проверяют документы, адрес и личность до funded-счёта или выплаты.'
const BRIGHT_REWARD_URL = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'KYC в проп-фирмах',
    'проп фирмы без KYC',
    'проп фирмы без верификации',
    'FundedNext KYC',
    'Bright Funded KYC',
    'FundingPips KYC',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Существуют ли глобальные проп-фирмы полностью без KYC?',
    a: 'Ни одна из 3 проверенных партнёрских политик не подтверждает полностью бездокументный путь. FundedNext, Bright Funded и FundingPips требуют KYC перед доступом к соответствующему профинансированному или мастер-этапу; отдельный платёжный провайдер также может провести свою проверку.',
  },
  {
    q: 'Когда FundedNext запрашивает KYC?',
    a: 'После успешного прохождения челленджа и до активации счёта FundedNext. Официальная инструкция называет 3 основных вида документа личности, допускает дополнительное подтверждение адреса в отдельных случаях и указывает типичный срок проверки около 48 часов.',
  },
  {
    q: 'Когда Bright Funded запрашивает KYC?',
    a: 'После финального этапа оценки и до договора профинансированного аккаунта. Проверку проводит SumSub; после одобрения KYC команда рисков выполняет проверку безопасности за 1–2 рабочих дня, а в пиковые периоды — до 4 рабочих дней.',
  },
  {
    q: 'Когда FundingPips запрашивает KYC?',
    a: 'До полного доступа к мастер-счёту. Официальная активация состоит из 4 шагов: KYC, проверка, клиентское соглашение и подключение. Сам KYC обычно занимает несколько минут, а проверка и подключение могут занимать до 2 рабочих дней каждый.',
  },
  {
    q: 'Можно ли обойти KYC выплатой в криптовалюте?',
    a: 'Нет. Криптовалюта или USDC описывают маршрут выплаты, но не отменяют идентификацию фирмы или провайдера. FundingPips отдельно описывает подключение Rise с совпадающим email, государственным удостоверением личности и селфи; Bright Funded использует SumSub до договора профинансированного аккаунта.',
  },
  {
    q: 'Подходит ли эта страница гражданину России, живущему за рубежом?',
    a: 'Да, как чек-лист, но не как разрешение. Фирма может проверять одновременно гражданство, страну резидентства, фактический адрес, документ, платёжный метод и маршрут выплаты. Русский язык страницы не заменяет письменное подтверждение по конкретному профилю.',
  },
  {
    q: 'Можно ли зарегистрироваться из России через VPN?',
    a: 'Нет. VPN не меняет гражданство, резидентство, адрес документа или санкционную проверку. У FundedNext 4 официальные страницы дают несовпадающие сигналы для резидентов России, поэтому мы не описываем доступ как подтверждённый до проверки оформления покупки и поддержки.',
  },
  {
    q: 'Какой документ лучше подготовить до покупки?',
    a: 'Подготовьте действующий документ с фотографией и подтверждение текущего адреса на своё имя. FundedNext может запросить utility bill или bank statement не старше 3 месяцев; Bright Funded указывает proof of identity и proof of address, причём набор зависит от страны.',
  },
]

const partnerRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext', featured: true },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded', featured: true },
  { slug: 'fundingpips', name: 'FundingPips', reviewHref: '/ru/obzor-fundingpips', featured: false },
] as const

const kycCopy: Record<string, {
  trigger: string
  documents: string
  timing: string
  consequence: string
}> = {
  fundednext: {
    trigger: 'После прохождения челленджа, до активации счёта FundedNext.',
    documents: 'Удостоверение личности с указанием гражданства, паспорт или вид на жительство; адрес могут запросить отдельно.',
    timing: 'Около 48 часов по опубликованной инструкции.',
    consequence: 'Без успешного KYC заявка на счёт FundedNext отклоняется.',
  },
  'bright-funded': {
    trigger: 'После финальной оценки, до договора профинансированного аккаунта.',
    documents: 'Подтверждение личности и адреса через SumSub; список зависит от страны.',
    timing: 'После KYC: проверка безопасности 1–2 рабочих дня, до 4 в пик.',
    consequence: 'Контракт отправляется после одобрения, аккаунт активируется после подписи.',
  },
  fundingpips: {
    trigger: 'До полного доступа к мастер-счёту.',
    documents: 'Государственное удостоверение личности, селфи и подтверждение адреса; для Rise действует отдельное подключение.',
    timing: 'KYC — обычно несколько минут; 2 внутренних этапа — до 2 рабочих дней каждый.',
    consequence: 'Нужно завершить KYC, проверку, клиентское соглашение и подключение.',
  },
}

function publishedPriceCount(products: Challenge[]) {
  return products.reduce((sum, product) => sum + product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0),
  ).length, 0)
}

export default function RussianNoKycPage() {
  const firms = getAllFirms()
  const allChallenges = getAllChallenges()
  const freshChallenges = allChallenges.filter(product => isChallengeFresh(product))
  const evidenceBySlug = new Map(marketEvidence.kycEvidence.map(item => [item.firmSlug, item]))
  const partnerCards = partnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    const evidence = evidenceBySlug.get(route.slug)
    return {
      ...route,
      firm,
      products,
      evidence,
      priceCount: publishedPriceCount(products),
    }
  }).filter(item => item.firm?.affiliateUrl && item.evidence)
  const featuredCards = partnerCards.filter(item => item.featured)
  const secondaryCard = partnerCards.find(item => !item.featured)
  const sourceCount = new Set(marketEvidence.kycEvidence.flatMap(item => item.sourceUrls)).size
  const productCount = partnerCards.reduce((sum, item) => sum + item.products.length, 0)
  const priceCount = partnerCards.reduce((sum, item) => sum + item.priceCount, 0)
  const fundedNextAccess = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const localSignals = new Map(marketEvidence.localFirmSignals.map(item => [item.operator, item]))
  const propLive = localSignals.get('PropLive')
  const kasCapital = localSignals.get('KasCapital')
  const teamTraders = localSignals.get('TeamTraders')

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'KYC в проп-фирмах' },
  ])
  const faq = faqPageSchema(faqs)
  const list = itemListSchema(
    featuredCards.flatMap(card => card.firm ? [card.firm] : []),
    'Основные глобальные партнёры: проверка KYC',
  )
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: marketEvidence.capturedAt,
    author: {
      '@type': 'Person',
      name: 'Edris Derakhshi',
      url: 'https://tradersfundhub.com/authors/edris-derakhshi',
    },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-kyc-guide="long-form-source-gated"
          data-russian-kyc-partner-count={partnerCards.length}
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / KYC в проп-фирмах</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext', 'bright-funded']} />
          <div className="ru-eyebrow"><ShieldAlert size={14} aria-hidden="true" /> «Без KYC» не означает «без проверки»</div>
          <h1>KYC в проп-фирмах: FundedNext, Bright Funded и проверка документов</h1>
          <p className="ru-lead">
            Проверили 3 партнёрские KYC-процедуры по 5 официальным страницам: когда фирма запрашивает документ,
            кто сверяет адрес, сколько длится проверка и почему криптовыплата не отменяет проверку личности.
            Основные глобальные маршруты — FundedNext и Bright Funded; FundingPips показан как дополнительный вариант.
          </p>
          <div className="ru-stats" aria-label="Охват KYC-проверки">
            <div className="ru-stat"><strong>{partnerCards.length}</strong><span>KYC-процесса без опубликованных исключений</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>официальных страниц KYC и выплаты</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>свежих глобальных продуктов</span></div>
            <div className="ru-stat"><strong>{priceCount}</strong><span>опубликованных цен</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#main-partners" className="btn-primary btn-glow">FundedNext и Bright Funded <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#kyc-matrix" className="btn-outline">Сравнить KYC</Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверить страну</Link>
          </div>
          <p className="ru-source-line">Первичные источники проверены {marketEvidence.capturedAt}. Условия нужно перепроверить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="kyc-not-access">
            <strong>KYC и доступность страны — 2 разные проверки.</strong>{' '}
            Русский язык, открытая страница оплаты, криптоплатёж или документ на русском не подтверждают право на покупку.
            Фирма может отдельно проверить гражданство, резидентство, фактический адрес, санкционные списки,
            источник платежа и платёжного провайдера. VPN не превращает запрещённый профиль в разрешённый.
          </div>
        </div>
      </section>

      <article data-russian-kyc-article="diaspora-decision-guide">
        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="kyc-guide">
              <strong>Партнёрское раскрытие и порядок.</strong>{' '}
              FundedNext и Bright Funded выделены как 2 главных коммерческих маршрута, потому что переход может принести нам комиссию.
              FundingPips показан ниже как дополнительный партнёр. Это не рейтинг «без KYC»: все 3 опубликованные процедуры требуют проверку.
            </div>
            <nav className="ru-review-toc" aria-label="Содержание KYC-руководства">
              <strong>Содержание</strong>
              <ol>
                <li><a href="#four-gates">4 точки проверки</a></li>
                <li><a href="#kyc-matrix">Сравнение 3 фирм</a></li>
                <li><a href="#main-partners">FundedNext и Bright Funded</a></li>
                <li><a href="#documents">Документы</a></li>
                <li><a href="#payout-provider">Фирма и платёжный провайдер</a></li>
                <li><a href="#diaspora">Русскоязычные за рубежом</a></li>
                <li><a href="#support-questions">Вопросы поддержке</a></li>
                <li><a href="#local-firms">Локальные модели</a></li>
                <li><a href="#decision">Решение до оплаты</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="four-gates">
          <div className="ru-shell" data-russian-kyc-gates="checkout-account-contract-payout">
            <h2>«Без KYC» может закончиться в одной из 4 точек</h2>
            <p className="ru-muted">
              Отсутствие формы документа при покупке описывает только 1 экран. Полный путь включает оплату,
              выдачу профинансированного счёта, договор и выплату; проверка в любой следующей точке способна остановить профиль.
            </p>
            <div className="ru-grid">
              <article className="ru-card">
                <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>1. Оплата и страна</h3>
                <p className="ru-muted">Форма может принять email, но отклонить страну, карту или платёжный адрес. Это проверка доступа, даже если паспорт ещё не загружен.</p>
              </article>
              <article className="ru-card">
                <FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>2. Выдача счёта</h3>
                <p className="ru-muted">FundedNext запрашивает KYC после челленджа, а FundingPips — до полного мастер-счёта. Пройденная торговая цель не заменяет проверку личности.</p>
              </article>
              <article className="ru-card">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>3. Договор и проверка безопасности</h3>
                <p className="ru-muted">Bright Funded сначала использует SumSub, затем команда рисков проводит проверку безопасности. Договор появляется только после этих шагов.</p>
              </article>
              <article className="ru-card">
                <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>4. Выплата и провайдер</h3>
                <p className="ru-muted">Криптовалюта, Rise или банковский перевод могут добавить проверку получателя. Метод вывода — платёжный маршрут, а не обещание анонимности.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="kyc-matrix">
          <div className="ru-shell" data-russian-kyc-matrix={partnerCards.length}>
            <h2>KYC FundedNext, Bright Funded и FundingPips: одна таблица</h2>
            <p className="ru-muted">
              Таблица сравнивает именно момент проверки, документы и опубликованный срок. Она не объединяет разные продукты
              под обещанием «верификации нет»: поле required равно true во всех 3 текущих записях.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead>
                  <tr><th>Фирма</th><th>Когда</th><th>Документы</th><th>Срок</th><th>Первичный источник</th></tr>
                </thead>
                <tbody>
                  {partnerCards.map(card => {
                    const copy = kycCopy[card.slug]
                    return (
                      <tr key={card.slug} data-russian-kyc-evidence={card.slug}>
                        <td><strong>{card.name}</strong><br />KYC обязателен</td>
                        <td>{copy.trigger}</td>
                        <td>{copy.documents}</td>
                        <td>{copy.timing}</td>
                        <td>
                          {card.evidence?.sourceUrls.map((sourceUrl, index) => (
                            <span key={sourceUrl}>
                              {index > 0 ? ' · ' : ''}<a href={sourceUrl} target="_blank" rel="noopener noreferrer">Источник {index + 1}</a>
                            </span>
                          ))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">Снимок: {marketEvidence.capturedAt}. Число продуктов и цен берётся только из записей не старше 30 дней.</p>
          </div>
        </section>

        <section className="ru-section" id="main-partners">
          <div className="ru-shell" data-russian-kyc-featured-partners="fundednext-bright-funded">
            <h2>Два основных маршрута: FundedNext и Bright Funded</h2>
            <p className="ru-muted">
              Выбор между ними начинается не с логотипа, а с 3 вопросов: какой документ доступен,
              совпадает ли страна профиля с политикой фирмы и сколько времени остаётся между оценкой и первым действием на профинансированном счёте.
            </p>
            <div className="ru-grid">
              {featuredCards.map(card => {
                const copy = kycCopy[card.slug]
                const isFundedNext = card.slug === 'fundednext'
                return (
                  <article className="ru-card" key={card.slug} data-russian-kyc-featured-partner={card.slug}>
                    <div className="ru-card-head">
                      <h3>{card.name}</h3>
                      <span className="ru-score">Главный партнёр</span>
                    </div>
                    <p>
                      {isFundedNext
                        ? `У FundedNext ${card.products.length} свежие модели и ${card.priceCount} опубликованные цены. KYC начинается после успешного челленджа; инструкция перечисляет 3 основных документа и типичный срок около 48 часов.`
                        : `У Bright Funded ${card.products.length} свежие программы и ${card.priceCount} EUR-цен. SumSub проверяет личность и адрес, затем команда рисков выполняет проверку безопасности за 1–2 рабочих дня.`}
                    </p>
                    <ul className="ru-facts">
                      <li><CheckCircle2 size={14} aria-hidden="true" /> {copy.trigger}</li>
                      <li><FileCheck2 size={14} aria-hidden="true" /> {copy.documents}</li>
                      <li><ShieldAlert size={14} aria-hidden="true" /> {copy.consequence}</li>
                    </ul>
                    {isFundedNext ? (
                      <p className="ru-source-line">
                        Для резидентов России {fundedNextAccess?.sourceUrls.length ?? 0} официальные страницы дают конфликтующие сигналы.
                        Поэтому кнопка означает «проверить», а не «доступ подтверждён».
                      </p>
                    ) : (
                      <p className="ru-source-line">
                        <a href={BRIGHT_REWARD_URL} target="_blank" rel="noopener noreferrer">Bright Funded описывает USDC ERC-20</a> как способ выплаты;
                        это не отменяет SumSub до договора профинансированного аккаунта.
                      </p>
                    )}
                    <div className="ru-actions">
                      <Link href={card.reviewHref} className="btn-outline">Русский обзор</Link>
                      <Link href={`/go/${card.slug}?from=ru-kyc-${card.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                        Проверить {card.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="ru-section" id="documents">
          <div className="ru-shell ru-content" data-russian-kyc-documents="identity-address-selfie">
            <h2>Какие документы подготовить: личность, адрес и селфи</h2>
            <p>
              <strong>Документ личности.</strong> FundedNext перечисляет государственное удостоверение личности с указанием гражданства,
              паспорт и вид на жительство; водительские права принимаются только для опубликованного списка стран.
              Bright Funded называет государственное удостоверение личности, а FundingPips — удостоверение, водительские права, постоянный вид на жительство или паспорт.
            </p>
            <p>
              <strong>Подтверждение адреса.</strong> FundedNext может запросить счёт за коммунальные услуги или банковскую выписку, выпущенные в предыдущие 3 месяца.
              Bright Funded указывает подтверждение адреса через SumSub и предупреждает, что набор документов зависит от страны резидентства.
              FundingPips включает подтверждение адреса в настройку мастер-счёта; адрес должен описывать реальный профиль, а не удобную страну оплаты.
            </p>
            <p>
              <strong>Селфи и совпадение данных.</strong> FundingPips требует чёткое селфи и допускает только 1 подтверждённую личность и аккаунт.
              Для Rise email должен совпадать с FundingPips, а провайдер снова запрашивает государственное удостоверение личности и селфи.
              Такое повторение не является ошибкой: фирма и платёжный сервис отвечают за разные проверки.
            </p>
            <div className="ru-notice">
              <strong>Практическое правило:</strong> имя, дата рождения, гражданство, адрес, email и владелец платёжного метода должны описывать 1 человека.
              Чужая карта, старый адрес или транслитерация, не совпадающая с документом, создают отдельный риск даже при действующем паспорте.
            </div>
          </div>
        </section>

        <section className="ru-section" id="payout-provider">
          <div className="ru-shell ru-content" data-russian-kyc-payout-boundary="firm-vs-provider">
            <h2>KYC фирмы и проверка платёжного провайдера — не одно и то же</h2>
            <p>
              Профинансированный аккаунт подтверждает завершение процесса фирмы, но не гарантирует автоматическую выплату через любой канал.
              Банк, криптопроцессор или Rise может проверить имя получателя, документ, кошелёк, страну и санкционные списки по собственной процедуре.
              Поэтому вопрос «можно ли вывести в криптовалюте?» не равен вопросу «можно ли пройти KYC?».
            </p>
            <p>
              У Bright Funded USDC ERC-20 и перевод EUR на банк являются опубликованными способами выплаты, а KYC проводит SumSub до договора.
              У FundingPips Rise добавляет подключение с тем же email, удостоверением личности и селфи. У FundedNext отдельная официальная страница ограничивает банковские выплаты
              для ряда стран, включая Россию; это ещё одна причина проверять конкретный маршрут выплаты до покупки.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Метод</h3><p className="ru-muted">Токен, сеть, банк или провайдер определяют технический маршрут выплаты.</p></article>
              <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Личность</h3><p className="ru-muted">Документ, селфи и адрес доказывают, кто получает доступ и вознаграждение.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Страна</h3><p className="ru-muted">Гражданство, резидентство и доступность выплаты могут дать 3 разных результата.</p></article>
            </div>
            <p><Link href="/ru/vyplaty-prop-firm">Сравнить опубликованные методы и сроки выплат →</Link></p>
          </div>
        </section>

        <section className="ru-section" id="diaspora">
          <div className="ru-shell" data-russian-kyc-diaspora="language-not-residency">
            <h2>4 профиля русскоязычного трейдера: язык одинаковый, KYC разный</h2>
            <p className="ru-muted">
              Русскоязычная аудитория живёт в десятках стран. Нельзя заменять 4 поля словом «русский»:
              язык интерфейса, гражданство, резидентство и фактический адрес отвечают на разные вопросы.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Профиль</th><th>Что проверять</th><th>Нельзя предполагать</th><th>Следующий шаг</th></tr></thead>
                <tbody>
                  <tr><td>Резидент ЕС с русским языком</td><td>Вид на жительство, оплата в EUR, подтверждение адреса, налоговый профиль</td><td>Российский язык не делает аккаунт российским</td><td>Сверить документ и способ выплаты в стране ЕС</td></tr>
                  <tr><td>Резидент Казахстана, Грузии или Израиля</td><td>Гражданство и резидентство проверяются отдельно; важны локальный банк и адрес</td><td>Доступ одной страны не переносится на соседнюю</td><td>Получить письменное подтверждение по 2 полям</td></tr>
                  <tr><td>Резидент России</td><td>Ограничения стран, санкции, оплата и маршрут выплаты</td><td>VPN или криптовалюта не создают разрешение</td><td>Не платить при конфликте официальных источников</td></tr>
                  <tr><td>Двойное гражданство или переезд</td><td>Какой документ, адрес и налоговое резидентство действуют сейчас</td><td>Старый профиль нельзя смешивать с новым</td><td>Сначала обновить данные, затем пройти KYC</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Для первого фильтра используйте <Link href="/ru/dlya-russkoyazychnykh-treyderov">отдельный маршрут для русскоязычных трейдеров за рубежом</Link>.
              Он разделяет гражданство, резидентство, оплату и выплату до перехода к бренду.
            </p>
          </div>
        </section>

        <section className="ru-section" id="support-questions">
          <div className="ru-shell ru-content" data-russian-kyc-support="four-written-answers">
            <h2>Что спросить поддержку, если порядок KYC неясен</h2>
            <p>
              Запросите 4 письменных ответа до оплаты: на каком этапе начинается проверка, какие документы личности и адреса принимаются,
              нужен ли отдельный аккаунт платёжного провайдера и какие поля гражданства/резидентства определяют доступ.
            </p>
            <p>
              Сохраните номер обращения и точное название продукта. Ответ «верификация потом» не означает «верификации нет»;
              он лишь переносит риск отказа ближе к профинансированному этапу или первой выплате.
            </p>
          </div>
        </section>

        <section className="ru-section" id="local-firms">
          <div className="ru-shell" data-russian-kyc-local-models="separate-contracts">
            <h2>Локальные русскоязычные компании не являются «обходом KYC»</h2>
            <p className="ru-muted">
              PropLive, TeamTraders и KasCapital полезны как 3 примера локального рынка, но их договоры, площадки и выплаты нельзя смешивать
              с глобальной онлайн-оценкой. Мы не называем их фирмами «без KYC» без опубликованной процедуры, которую можно проверить.
            </p>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>PropLive</h3>
                <p className="ru-muted">Оператор заявляет {propLive?.claims.traders?.toLocaleString('ru-RU') ?? '—'} трейдеров и описывает Московскую биржу через Финам. Это маршрут с реальным рынком и собственным договором, а не доказательство отсутствия документов.</p>
                <Link href="/ru/obzor-proplive" className="ru-card-link">Проверить модель PropLive →</Link>
              </article>
              <article className="ru-card">
                <h3>TeamTraders</h3>
                <p className="ru-muted">Опубликованы 15 торговых сессий, дневной лимит убытка 2% и доля прибыли {teamTraders?.claims.profitSharePct ?? '—'}% для фьючерсов Московской биржи. KYC-статус нельзя выводить из этих торговых правил.</p>
                <Link href="/ru/rossiyskie-prop-kompanii" className="ru-card-link">Смотреть первичный снимок →</Link>
              </article>
              <article className="ru-card">
                <h3>KasCapital</h3>
                <p className="ru-muted">Оператор публикует заявку на выплату от {kasCapital?.claims.minimumPayoutRub?.toLocaleString('ru-RU') ?? '—'} до {kasCapital?.claims.maximumPayoutRub?.toLocaleString('ru-RU') ?? '—'} RUB по понедельникам. Это заявление оператора, не независимый аудит и не обещание работы без KYC.</p>
                <Link href="/ru/obzor-kascapital" className="ru-card-link">Проверить KasCapital →</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="decision">
          <div className="ru-shell" data-russian-kyc-decision="documents-before-checkout">
            <h2>Решение до оплаты: 7 проверок вместо поиска «без KYC»</h2>
            <ol className="ru-content">
              <li><strong>Назовите продукт.</strong> Instant, 1-Step и 2-Step могут иметь разные точки выдачи счёта.</li>
              <li><strong>Откройте правила страны.</strong> Проверьте гражданство и резидентство, а не только IP.</li>
              <li><strong>Сверьте документ.</strong> Имя, дата рождения и гражданство должны совпадать с профилем.</li>
              <li><strong>Подготовьте адрес.</strong> Счёт или банковская выписка должны соответствовать текущей стране и сроку фирмы.</li>
              <li><strong>Разделите 2 KYC.</strong> Проверка фирмы не отменяет подключение банка, Rise или криптопровайдера.</li>
              <li><strong>Сохраните ответ.</strong> При конфликте правил получите письменное подтверждение до оплаты.</li>
              <li><strong>Не обходите запрет.</strong> VPN, чужая карта, чужой документ или ложный адрес создают риск закрытия и отказа в вознаграждении.</li>
            </ol>
            {secondaryCard ? (
              <article className="ru-card" data-russian-kyc-secondary-partner="fundingpips">
                <div className="ru-card-head"><h3>Дополнительный маршрут: FundingPips</h3><span className="ru-score">Партнёр</span></div>
                <p>
                  {secondaryCard.products.length} свежих продуктов и {secondaryCard.priceCount} опубликованных цен дают 1-Step, 2-Step и маршруты без оценки,
                  но настройка мастер-счёта всё равно содержит 4 шага. KYC обычно занимает несколько минут; проверка и подключение могут занять до 2 рабочих дней каждый.
                </p>
                <p className="ru-source-line">
                  {secondaryCard.evidence?.sourceUrls.map((sourceUrl, index) => (
                    <span key={sourceUrl}>{index > 0 ? ' · ' : ''}<a href={sourceUrl} target="_blank" rel="noopener noreferrer">Официальный источник {index + 1} <ExternalLink size={12} aria-hidden="true" /></a></span>
                  ))}
                </p>
                <div className="ru-actions">
                  <Link href={secondaryCard.reviewHref} className="btn-outline">Русский обзор</Link>
                  <Link href="/go/fundingpips?from=ru-kyc-fundingpips" rel="sponsored nofollow noopener" className="btn-primary">
                    Проверить FundingPips <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ) : null}
            <div className="ru-notice">
              <AlertTriangle size={18} aria-hidden="true" />{' '}
              Если фирма не отвечает, какой документ и страна будут приняты, отсутствие ответа — это стоп-сигнал до покупки,
              а не повод тестировать оплату минимальной суммой.
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-author-box">
              <Database size={22} color="var(--accent-light)" aria-hidden="true" />
              <div>
                <strong>Проверка источников: Edris Derakhshi</strong>
                <p>
                  Сопоставлены 3 KYC-процесса, 5 официальных страниц, 12 свежих продуктов и 67 опубликованных цен.
                  Проверка фиксирует условия на {marketEvidence.capturedAt}; она не гарантирует решение compliance team по индивидуальному профилю.
                </p>
                <Link href="/authors/edris-derakhshi">Редакционный профиль и методология →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о KYC в проп-фирмах</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
