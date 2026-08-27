import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, FileCheck2, Globe2, Scale, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-eratrade'
const TITLE = 'Era Trade: обзор условий и выплат (2026)'
const DESCRIPTION = 'Era Trade на русском: официальные заявления о 6 000 трейдерах, 70 странах, сплите 80%, правилах челленджа и выплатах до 5 рабочих дней.'
const ERA_HOME = 'https://eratrade.net/'
const ERA_AFFILIATE = 'https://help.eratrade.club/ru/affiliate-program-overview/'
const ERA_RULES = 'https://help.eratrade.club/ru/general-trading-limitations/'
const ERA_PAYOUT = 'https://help.eratrade.club/ru/how-to-request-a-payout/'
const ERA_PAYOUT_SYSTEM = 'https://help.eratrade.club/ru/funded-account-payout-system-how-it-works/'
const ERA_PROFITABLE_DAYS = 'https://help.eratrade.club/ru/minimum-number-of-profitable-days/'
const ERA_SPLIT = 'https://help.eratrade.club/ru/profit-split-payment-methods/'
const ERA_TWO_STAGE = 'https://help.eratrade.club/ru/2-stage-challenge-how-it-works/'
const ERA_ONE_STAGE = 'https://help.eratrade.club/ru/1-stage-challenge-how-it-works/'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Era Trade — российская юридическая компания?',
    a: 'Нет такого вывода из опубликованных материалов. На главной странице оператор указывает NEVERA CORE GLOBAL - FZCO в Дубае. Русский язык и русскоязычная поддержка не означают российскую регистрацию или доступ для резидента России.',
  },
  {
    q: 'Какие правила Era Trade нужно проверить до покупки?',
    a: 'Для двухэтапного челленджа официальная справка указывает цель 8% на первом этапе, дневной лимит 5% и общий лимит 10%. Для одноэтапного указаны цель 11%, дневной лимит 4% и общий лимит 8%. Это разные продукты, поэтому их нельзя смешивать в одной таблице.',
  },
  {
    q: 'Как Era Trade описывает выплаты?',
    a: 'Страница запроса выплаты указывает минимум 3 прибыльных дня, минимум 1% от стартового баланса, максимум 10% за payout period и обработку в течение 5 рабочих дней. Там же перечислены USDT, BTC, ETH и LTC; способ, сеть и KYC нужно перепроверить перед запросом.',
  },
  {
    q: 'Есть ли у Era Trade партнёрская программа?',
    a: 'Да, официальный центр помощи описывает стандартную программу: 5% по умолчанию, уровни до 60% по числу покупок челленджей, минимальная выплата $50. Отдельная Ambassador-модель активируется индивидуально и не является автоматически выданной ссылкой.',
  },
  {
    q: 'Что происходит после достижения цели Era Trade?',
    a: 'После второго этапа оператор описывает ручную проверку риск-командой, затем KYC, создание funded-аккаунта и подключение к системе риск-менеджмента. Это не мгновенная гарантия аккаунта: сохраните актуальную версию правил и дождитесь подтверждения проверки.',
  },
  {
    q: 'Как часто можно запрашивать выплату Era Trade?',
    a: 'В справке указаны периоды 15 или 30 дней на выбор после первой завершённой сделки funded-аккаунта. Для заявки нужны 3 прибыльных дня, закрытые сделки и отсутствие активных ордеров; обработка заявлена до 5 рабочих дней.',
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

export default function RussianEraTradeReviewPage() {
  const localSignal = marketEvidence.localFirmSignals.find(item => item.operator === 'Era Trade')
  const affiliateSignal = marketEvidence.affiliatePrograms.find(item => item.operator === 'Era Trade')
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl && item.products.length > 0)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании', url: '/ru/rossiyskie-prop-kompanii' },
    { name: 'Обзор Era Trade' },
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
        <div className="ru-shell" data-russian-local-review="era-trade" data-russian-local-review-status="verification-only">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/rossiyskie-prop-kompanii">Российские компании</Link> / Era Trade</div>
          <div className="ru-eyebrow"><Building2 size={14} aria-hidden="true" /> Локальное исследование, не рекомендация</div>
          <h1>Era Trade: обзор 2026 — правила, сплит и выплаты</h1>
          <p className="ru-lead">Разбираем официальные заявления Era Trade для русскоязычного трейдера: 6 000+ трейдеров, 70 стран, базовый сплит 80%, правила одно- и двухэтапных челленджей, условия выплаты и публичная партнёрская программа. Это проверка источников, а не подтверждение платёжеспособности или доступа.</p>
          <div className="ru-actions">
            <Link href="#facts" className="btn-primary btn-glow">Проверить факты <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить глобальные фирмы</Link>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{Number(localSignal?.claims.traders).toLocaleString('ru-RU')}+</strong><span>трейдеров по заявлению оператора</span></div>
            <div className="ru-stat"><strong>{localSignal?.claims.countries}</strong><span>стран по заявлению оператора</span></div>
            <div className="ru-stat"><strong>{localSignal?.claims.baseProfitSplitPct}%</strong><span>базовый сплит трейдера</span></div>
            <div className="ru-stat"><strong>{marketEvidence.capturedAt}</strong><span>дата снимка источников</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="facts">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="local-review-not-access"><strong>Русский язык не равен доступу из России.</strong> Era Trade указывает международную модель и юридическое лицо в Дубае. Гражданство, резидентство, KYC, санкционные ограничения, способ оплаты и доступный продукт нужно подтвердить до покупки.</div>
          <h2>Что опубликовано на официальных страницах</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-local-review-facts="era-trade">
              <thead><tr><th>Пункт</th><th>Опубликованное условие</th><th>Редакционный статус</th><th>Источник</th></tr></thead>
              <tbody>
                <tr><td>Масштаб</td><td>{Number(localSignal?.claims.traders).toLocaleString('ru-RU')}+ трейдеров, {localSignal?.claims.countries} стран, более ${Number(localSignal?.claims.payoutsUsd).toLocaleString('en-US')} выплат</td><td>Заявление оператора, не независимый аудит</td><td><SourceLink href={ERA_HOME}>Era Trade</SourceLink></td></tr>
                <tr><td>Сплит</td><td>{localSignal?.claims.baseProfitSplitPct}% в пользу трейдера</td><td>Условие зависит от продукта и правил выплаты</td><td><SourceLink href={ERA_SPLIT}>Справка о сплите</SourceLink></td></tr>
                <tr><td>2 этапа</td><td>Цель 8%, дневной лимит 5%, общий лимит 10%</td><td>Отдельный продукт; не переносим на 1-этапный</td><td><SourceLink href={ERA_TWO_STAGE}>Правила 2 этапов</SourceLink></td></tr>
                <tr><td>1 этап</td><td>Цель 11%, дневной лимит 4%, общий лимит 8%</td><td>Отдельный продукт; проверяйте актуальную версию</td><td><SourceLink href={ERA_ONE_STAGE}>Правила 1 этапа</SourceLink></td></tr>
                <tr><td>Платформы</td><td>Bybit, MT5 и TradeLocker указаны в витрине; продукт и доступный терминал нужно выбирать отдельно</td><td>Платформа меняет технические и страновые ограничения</td><td><SourceLink href={ERA_HOME}>Витрина Era Trade</SourceLink></td></tr>
                <tr><td>Выплата</td><td>Каждые 15 или 30 дней; 3 прибыльных дня; минимум 1%; максимум 10% за период; до 5 рабочих дней</td><td>Заявленное правило; сделки и ордера должны быть закрыты</td><td><SourceLink href={ERA_PAYOUT_SYSTEM}>Система выплат</SourceLink></td></tr>
                <tr><td>Партнёрство</td><td>{affiliateSignal?.baseCommissionPct}% по умолчанию, уровни до {affiliateSignal?.maximumPublishedCommissionPct}%, минимум ${affiliateSignal?.minimumPayoutUsd}</td><td>Публичная программа; Ambassador активируется отдельно</td><td><SourceLink href={ERA_AFFILIATE}>Условия партнёров</SourceLink></td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><Globe2 size={14} aria-hidden="true" /> Снимок источников: {marketEvidence.capturedAt}. Все суммы, проценты и сроки выше — формулировки официальных страниц Era Trade, а не независимая проверка.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Риски, которые нельзя пропустить</h2>
          <div className="ru-grid">
            <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Лимит идеи</h3><p className="ru-muted">Общие торговые ограничения указывают максимум 2% совокупного убытка на одну торговую идею. Дробление ордеров для обхода лимита запрещено.</p><SourceLink href={ERA_RULES}>Правила торговли</SourceLink></article>
            <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Период выплаты</h3><p className="ru-muted">Для запроса нужны 3 прибыльных дня; минимальная сумма — 1% стартового баланса, а обработка заявлена до 5 рабочих дней. Проверьте сеть и кошелёк.</p><SourceLink href={ERA_PAYOUT}>Порядок выплаты</SourceLink></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Партнёрская модель</h3><p className="ru-muted">5% — стандартный уровень, а 60% — верхняя опубликованная ступень при объёме рефералов. Размер комиссии не доказывает качество продукта.</p><SourceLink href={ERA_AFFILIATE}>Партнёрская программа</SourceLink></article>
          </div>
          <div className="ru-notice" data-russian-local-affiliate="public-not-activated"><strong>Партнёрство Era Trade не активировано на этом сайте.</strong> Мы не создаём локальный /go/ маршрут без согласованной ссылки и завершённой проверки продукта, юридического лица, выплат и страновых ограничений.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-eratrade-due-diligence="product-split">
          <h2>Как не смешать два разных продукта</h2>
          <ol>
            <li><strong>Выберите модель:</strong> в двухэтапной схеме цели 8% и 5%, а в одноэтапной заявлена цель 11%; дневные и общие лимиты тоже различаются.</li>
            <li><strong>Проверьте платформу:</strong> Bybit, MT5 и TradeLocker требуют разных аккаунтов, сетей и ограничений; не переносите правило одного терминала на другой.</li>
            <li><strong>Пройдите проверку:</strong> после цели оператор описывает ручную проверку команды по рискам и KYC; до этого не считайте funded-аккаунт окончательно подтверждённым.</li>
            <li><strong>Подайте выплату корректно:</strong> выберите 15- или 30-дневный период, закройте позиции и ордера, подтвердите 3 прибыльных дня и сохраните дату заявки.</li>
          </ol>
          <div className="ru-notice"><strong>Редакционный вывод:</strong> публичные проценты Era Trade являются правилами конкретного продукта, а не универсальным обещанием для любого аккаунта. Определение прибыльного дня описано отдельно в <SourceLink href={ERA_PROFITABLE_DAYS}>правиле 3 прибыльных дней</SourceLink>.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-local-global-funnel="era-trade">
          <div className="ru-notice ru-disclosure"><strong>Переход к глобальным фирмам.</strong> Если нужен сопоставимый онлайн-продукт, ниже показаны глобальные партнёры с отдельными русскими обзорами. Партнёрская комиссия возможна после регистрации, но не меняет порядок проверки страны, KYC и правил.</div>
          <h2>Глобальные альтернативы для русскоязычных трейдеров</h2>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-local-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.products.length} свежих продуктов; проверьте страну, KYC, первую выплату и метод вывода до оплаты.</p>
                <div className="ru-actions"><Link href={item.reviewHref} className="btn-outline">Открыть обзор</Link><Link href={`/go/${item.slug}?from=ru-eratrade-global-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">Проверить условия <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </article>
            ))}
          </div>
          <p className="ru-source-line">Локальные примеры: <Link href="/ru/rossiyskie-prop-kompanii">исследование российских проп-компаний</Link>; отдельная локальная проверка: <Link href="/ru/obzor-proplive">PropLive</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content"><h2>Частые вопросы</h2><RussianFaq items={faqs} /></div>
      </section>
    </>
  )
}
