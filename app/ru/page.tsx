import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Building2, Database, SearchCheck, ShieldAlert } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru'
const TITLE = 'Проп-фирмы: обзоры, цены и правила на русском'
const DESCRIPTION = 'Русская версия Traders Fund Hub: сравнение проп-фирм, цены челленджей, просадки, выплаты и правила по данным из первичных источников.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое онлайн-проп-фирма?',
    a: 'Это компания с программой оценки: трейдер оплачивает доступ к симулированному счёту, выполняет цель по прибыли и соблюдает лимиты риска. После успешной оценки фирма может предложить следующий симулированный или реальный этап и долю вознаграждения по договору.',
  },
  {
    q: 'Означает ли русская версия, что фирма работает с резидентами России?',
    a: 'Нет. Язык страницы не подтверждает доступность страны. Перед оплатой нужно проверить ограничения по гражданству и резидентству, KYC, способ оплаты, платформу и способ выплаты на официальном сайте конкретной фирмы.',
  },
  {
    q: 'Почему цены указаны в долларах или евро, а не в рублях?',
    a: 'Мы сохраняем валюту, в которой фирма публикует цену. Пересчёт в рубли быстро устаревает из-за курса и может скрыть комиссию банка или платёжного провайдера.',
  },
]

export default function RussianHomePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const freshFirmSlugs = new Set(freshChallenges.map(challenge => challenge.firmSlug))
  const fullyFreshFirmCount = [...freshFirmSlugs].filter(slug => {
    const products = challenges.filter(challenge => challenge.firmSlug === slug)
    return products.length > 0 && products.every(product => isChallengeFresh(product))
  }).length
  const pricedProductCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)),
  ).length
  const firstPartySourceCount = new Set(freshChallenges.map(challenge => challenge.sourceUrl)).size
  const latestCapture = freshChallenges.map(challenge => challenge.sourceCapturedAt).sort().at(-1)

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия' },
  ])
  const faq = faqPageSchema(faqs)
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-eyebrow"><SearchCheck size={14} aria-hidden="true" /> Русская версия</div>
          <h1>Проп-фирмы: цены, правила и выплаты без рекламного тумана</h1>
          <p className="ru-lead">
            Сравниваем не обещания брендов, а конкретные продукты: стоимость входа,
            тип просадки, этапы оценки, базовую долю прибыли и условия выплаты.
            Каждая цифра привязана к первичному источнику и дате проверки.
          </p>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary btn-glow">
              Открыть рейтинг <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/ru/obzor-fundednext" className="btn-outline">
              Обзор FundedNext
            </Link>
            <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">
              Компании из российского рынка
            </Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">
              Как работает челлендж
            </Link>
          </div>
          <div className="ru-stats" aria-label="Текущий охват данных">
            <div className="ru-stat"><strong>{fullyFreshFirmCount}/{firms.length}</strong><span>фирм с полностью свежими продуктами</span></div>
            <div className="ru-stat"><strong>{freshChallenges.length}</strong><span>продуктов, проверенных не более 30 дней назад</span></div>
            <div className="ru-stat"><strong>{pricedProductCount}</strong><span>продуктов с опубликованной ценой</span></div>
            <div className="ru-stat"><strong>{firstPartySourceCount}</strong><span>уникальных первичных страниц</span></div>
          </div>
          <p className="ru-source-line">Последняя дата среди текущих захватов: {latestCapture ?? 'нет данных'}.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="language-not-access">
            <strong>Русский язык не означает доступность в России.</strong>{' '}
            Страница предназначена для русскоязычных трейдеров в разных странах.
            Доступ зависит от резидентства, гражданства, санкционных списков, KYC,
            платёжного маршрута и правил конкретного продукта. VPN не превращает
            запрещённую страну в разрешённую.
          </div>

          <h2>Начните с задачи, а не с бренда</h2>
          <p className="ru-muted">
            Русская версия начинает с пяти страниц под самостоятельные поисковые задачи,
            включая отдельную проверку компаний российского рынка. Мы не переводим сотни URL автоматически: сначала проверяем,
            отвечает ли локальная страница на самостоятельный поисковый запрос.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <Database size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Лучшие проп-фирмы 2026</h3>
              <p className="ru-muted">Редакционный порядок отдельно от партнёрских отношений, плюс количество продуктов, цены и дата источников.</p>
              <Link className="ru-card-link" href="/ru/luchshie-prop-firmy">Сравнить фирмы →</Link>
            </article>
            <article className="ru-card">
              <BookOpenCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Обзор FundedNext</h3>
              <p className="ru-muted">22 опубликованные цены, четыре модели и отдельная проверка противоречивых ограничений для резидентов России.</p>
              <Link className="ru-card-link" href="/ru/obzor-fundednext">Проверить FundedNext →</Link>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Пять этапов челленджа</h3>
              <p className="ru-muted">От оплаты до выплаты: где действует цель по прибыли, как считается просадка и когда появляется правило консистенции.</p>
              <Link className="ru-card-link" href="/ru/kak-rabotayut-chellendzhi-prop-firm">Разобрать этапы →</Link>
            </article>
            <article className="ru-card">
              <Building2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Российские проп-компании</h3>
              <p className="ru-muted">Era Trade, PropLive и KasCapital: проверяемые цифры, различия моделей и публичный статус партнёрских программ без выдачи списка за рекомендацию.</p>
              <Link className="ru-card-link" href="/ru/rossiyskie-prop-kompanii">Посмотреть 3 примера →</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Почему русская версия появилась сейчас</h2>
          <p>
            Независимый снимок Yandex Moscow за январь 2026 года оценивал частотность
            запроса «проп компании» в {marketEvidence.searchDemand.queries[0].monthlyFrequency},
            а «проп компании для трейдеров в россии» — в{' '}
            {marketEvidence.searchDemand.queries[1].monthlyFrequency} показов в месяц.
            Анализируемый молодой сайт получил примерно {marketEvidence.searchDemand.estimatedClicks}{' '}
            переходов из Яндекса за месяц и находился в топ-50 по{' '}
            {marketEvidence.searchDemand.top50Queries} запросам.
          </p>
          <p className="ru-muted">
            Это сторонняя оценка, а не данные Яндекс Вебмастера, и пересекающиеся
            частотности нельзя складывать. Мы используем её как сигнал для небольшого
            теста, а не как обещание трафика или дохода.{' '}
            <a href={marketEvidence.searchDemand.sourceUrl} target="_blank" rel="noopener noreferrer">
              Проверить источник оценки
            </a>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Короткий словарь правил</h2>
          <div className="ru-grid">
            <article className="ru-card"><h3>Статическая просадка</h3><p className="ru-muted">Линия максимального убытка остаётся на фиксированном уровне, если правила продукта не говорят иначе.</p></article>
            <article className="ru-card"><h3>Трейлинг-просадка</h3><p className="ru-muted">Линия риска движется за максимумом баланса или эквити; момент фиксации зависит от продукта.</p></article>
            <article className="ru-card"><h3>Правило консистенции</h3><p className="ru-muted">Ограничивает долю самого прибыльного дня или сделки в общей прибыли. Формула и этап применения должны быть указаны фирмой.</p></article>
            <article className="ru-card"><h3>Profit split</h3><p className="ru-muted">Доля вознаграждения трейдера. Базовый процент нельзя подменять максимумом после платного дополнения или масштабирования.</p></article>
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
