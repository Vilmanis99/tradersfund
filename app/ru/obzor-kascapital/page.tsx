import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, FileCheck2, Globe2, Scale, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-kascapital'
const TITLE = 'KasCapital: обзор условий и выплат (2026)'
const DESCRIPTION = 'KasCapital на русском: заявленные 95% прибыли трейдеру, покупательная способность, понедельничные выплаты и проверка публичных условий.'
const KAS_HOME = 'https://kascapital.io/'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'KasCapital — это обычный CFD-челлендж?',
    a: 'По опубликованному описанию KasCapital делает акцент на капитале компании, покупательной способности, комьюнити и наставниках, а не на стандартной двухэтапной CFD-оценке. Поэтому проценты и сроки нельзя напрямую сравнивать с глобальными challenge-продуктами.',
  },
  {
    q: 'Как KasCapital описывает выплаты?',
    a: 'На официальной странице указано, что заявки подаются через личный кабинет, выплаты проходят по понедельникам, а диапазон одной заявки составляет от 10 000 до 2 000 000 рублей. Перед регистрацией нужно открыть действующий регламент и проверить дату среза заявки.',
  },
  {
    q: 'Есть ли у KasCapital публичная affiliate-программа?',
    a: 'В проверке официального сайта от 24 августа 2026 года публичные affiliate- или referral-условия не найдены. Поэтому этот обзор не содержит локального /go/ перехода и не обещает комиссию.',
  },
  {
    q: 'Подходит ли KasCapital русскоязычному трейдеру за пределами России?',
    a: 'Русский интерфейс не отвечает на вопросы о гражданстве, резидентстве, KYC, договоре, оплате или выплате за пределами России. Эти пункты нужно подтвердить у оператора до передачи документов или денег.',
  },
  {
    q: 'Что означает пример 50 000 ₽ и плечо ×100?',
    a: 'KasCapital приводит пример покупательной способности до 5 000 000 ₽ при депозите 50 000 ₽ и плече ×100 на акциях. Это пример механики, а не обещание доступного лимита, доходности или отсутствия комиссий для каждого уровня.',
  },
  {
    q: 'Какие условия KasCapital нужно запросить до регистрации?',
    a: 'Попросите действующие оферту и регламент, список инструментов и брокера, критерии грейда, правила риска, расчёт доли до 95%, комиссии, KYC и порядок выплаты после пятничного среза. Одной маркетинговой страницы недостаточно для решения о деньгах.',
  },
]

const globalRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'fundingpips', name: 'FundingPips', reviewHref: '/ru/obzor-fundingpips' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

function SourceLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener" className="ru-card-link">{children}</a>
}

export default function RussianKasCapitalReviewPage() {
  const localSignal = marketEvidence.localFirmSignals.find(item => item.operator === 'KasCapital')
  const affiliateSignal = marketEvidence.affiliatePrograms.find(item => item.operator === 'KasCapital')
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl && item.products.length > 0)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании', url: '/ru/rossiyskie-prop-kompanii' },
    { name: 'Обзор KasCapital' },
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
        <div className="ru-shell" data-russian-local-review="kascapital" data-russian-local-review-status="verification-only">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/rossiyskie-prop-kompanii">Российские компании</Link> / KasCapital</div>
          <div className="ru-eyebrow"><Building2 size={14} aria-hidden="true" /> Локальное исследование, не рекомендация</div>
          <h1>KasCapital: обзор 2026 — капитал, выплаты и правила</h1>
          <p className="ru-lead">Проверяем опубликованные заявления KasCapital о капитале компании, сообществе, доле прибыли до 95% и выплатах по понедельникам. Это отдельная российская модель, которую нельзя автоматически приравнивать к глобальному CFD-челленджу или считать подтвержденно безопасной.</p>
          <div className="ru-actions"><Link href="#facts" className="btn-primary btn-glow">Проверить факты <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить глобальные фирмы</Link></div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{localSignal?.claims.maximumProfitSharePct}%</strong><span>максимальная доля трейдера по заявлению</span></div>
            <div className="ru-stat"><strong>Пн</strong><span>заявленный день обработки выплат</span></div>
            <div className="ru-stat"><strong>{Number(localSignal?.claims.minimumPayoutRub).toLocaleString('ru-RU')} ₽</strong><span>минимум одной заявки</span></div>
            <div className="ru-stat"><strong>{marketEvidence.capturedAt}</strong><span>дата снимка источников</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="facts">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="local-review-not-access"><strong>Русский интерфейс не равен доступу.</strong> Резидентство, гражданство, KYC, договор, способ оплаты и маршрут выплаты нужно подтвердить у KasCapital напрямую. Операторская цифра не заменяет юридическую и платёжную проверку.</div>
          <h2>Что опубликовано на официальной странице</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-local-review-facts="kascapital">
              <thead><tr><th>Пункт</th><th>Заявление оператора</th><th>Редакционный статус</th><th>Источник</th></tr></thead>
              <tbody>
                <tr><td>Модель</td><td>Капитал компании, покупательная способность до 5 000 000 ₽ при примере 50 000 ₽ и плечо до 100</td><td>Описание оператора; не сопоставляем с CFD challenge</td><td><SourceLink href={KAS_HOME}>KasCapital</SourceLink></td></tr>
                <tr><td>Доля прибыли</td><td>До {localSignal?.claims.maximumProfitSharePct}% трейдеру</td><td>Максимум из маркетингового описания; проверьте уровень и договор</td><td><SourceLink href={KAS_HOME}>Условия на главной</SourceLink></td></tr>
                <tr><td>Выплаты</td><td>Еженедельно по понедельникам; заявка от {Number(localSignal?.claims.minimumPayoutRub).toLocaleString('ru-RU')} до {Number(localSignal?.claims.maximumPayoutRub).toLocaleString('ru-RU')} ₽</td><td>Опубликованный диапазон, не независимая история выплат</td><td><SourceLink href={KAS_HOME}>FAQ оператора</SourceLink></td></tr>
                <tr><td>Регистрация</td><td>500 ₽ на счёт после регистрации по описанию оператора</td><td>Бонус и его условия требуют проверки до регистрации</td><td><SourceLink href={KAS_HOME}>Как начать</SourceLink></td></tr>
                <tr><td>Партнёрство</td><td>Публичных affiliate-условий в проверке не найдено</td><td>{affiliateSignal?.status === 'not-found' ? 'Локальный affiliate не активирован' : 'Нужна повторная проверка'}</td><td><SourceLink href={KAS_HOME}>Официальный сайт</SourceLink></td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><Globe2 size={14} aria-hidden="true" /> Снимок источников: {marketEvidence.capturedAt}. Числа выше являются заявлениями KasCapital и требуют повторной проверки после изменения регламента.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Что проверить до регистрации</h2>
          <div className="ru-grid">
            <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Рынок и плечо</h3><p className="ru-muted">Плечо до 100 и покупательная способность до 5 000 000 ₽ описаны как пример. Запросите перечень инструментов, комиссии, ограничения риска и момент принудительного закрытия.</p><SourceLink href={KAS_HOME}>Официальное описание</SourceLink></article>
            <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Выплаты по понедельникам</h3><p className="ru-muted">Дата выплаты зависит от времени подачи заявки: на странице указаны пятничный срез и следующий понедельник. Сохраните действующий регламент и подтверждение заявки.</p><SourceLink href={KAS_HOME}>FAQ о выплатах</SourceLink></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Нет локального affiliate</h3><p className="ru-muted">Публичная комиссия KasCapital в источнике не указана. Мы не превращаем локальный обзор в неподтверждённую реферальную рекламу.</p><SourceLink href={KAS_HOME}>Проверить условия</SourceLink></article>
          </div>
          <div className="ru-notice" data-russian-local-affiliate="not-found"><strong>KasCapital не активирован как локальный партнёр.</strong> Глобальные CTA ниже отделены от этого исследования и ведут к продуктам с собственными источниками условий.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-kascapital-due-diligence="terms-gap">
          <h2>Что пока нельзя вывести из публичной витрины</h2>
          <ol>
            <li><strong>Брокер и инструменты:</strong> пример относится к акциям и покупательной способности, но точный список рынков, комиссий и технических ограничений нужно получить в регламенте.</li>
            <li><strong>Критерии уровня:</strong> максимум 95% не объясняет, какой грейд, оборот, срок активности или риск-лимит нужен именно вам.</li>
            <li><strong>Выплата:</strong> пятничный срез и понедельник задают календарь обработки, но не заменяют подтверждение документов, налогового статуса и фактической комиссии.</li>
            <li><strong>Резидентство:</strong> русский сайт не подтверждает доступность для каждой страны; KYC и договор нужно согласовать до регистрации.</li>
          </ol>
          <div className="ru-notice"><strong>Редакционный вывод:</strong> 500 ₽ бонуса, плечо ×100 и доля до 95% — заявления оператора; они не являются независимой историей выплат или гарантией результата.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-local-global-funnel="kascapital">
          <div className="ru-notice ru-disclosure"><strong>Переход к глобальным фирмам.</strong> Если важны сопоставимые онлайн-продукты, сравните глобальные предложения отдельно. Комиссия возможна после регистрации, но страну, KYC и выплаты нужно проверять на сайте выбранной фирмы.</div>
          <h2>Глобальные альтернативы для русскоязычных трейдеров</h2>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-local-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.products.length} свежих продуктов; проверьте страну, KYC, первую выплату и метод вывода до оплаты.</p>
                <div className="ru-actions"><Link href={item.reviewHref} className="btn-outline">Открыть обзор</Link><Link href={`/go/${item.slug}?from=ru-kascapital-global-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">Проверить условия <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
            ))}
          </div>
          <p className="ru-source-line">Другие локальные исследования: <Link href="/ru/rossiyskie-prop-kompanii">шесть российских моделей</Link>; отдельный обзор <Link href="/ru/obzor-eratrade">Era Trade</Link>.</p>
        </div>
      </section>

      <section className="ru-section"><div className="ru-shell ru-content"><h2>Частые вопросы</h2><RussianFaq items={faqs} /></div></section>
    </>
  )
}
