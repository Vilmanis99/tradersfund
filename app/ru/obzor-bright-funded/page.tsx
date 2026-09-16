import type { Metadata } from 'next'
import { getRussianReviewFinderHref } from '@/lib/challengeComparisonData'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import brightEvidence from '@/content/data/russian-bright-funded-evidence.json'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database, ExternalLink } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianAffiliateSupportCode from '@/components/RussianAffiliateSupportCode'
import {
  challengeTierEconomics,
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { getDealsByFirm } from '@/lib/deals'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-bright-funded'
const TITLE = 'Bright Funded: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Обзор Bright Funded на русском: цены программ в EUR, статическая и трейлинг-просадка, условия выплат, отзывы Trustpilot и проверка доступа по стране.'
// Sharing copy stays unchanged pending the separately requested approval.
const SOCIAL_DESCRIPTION = 'Отзывы о Bright Funded и обзор на русском: 3 программы, 18 цен в EUR, просадка, выплаты, Trustpilot и проверка ограничений по стране.'
export const revalidate = 3600

const RULES_URL = 'https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process'
const REWARD_URL = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account'
const NEWS_URL = 'https://help.brightfunded.com/en/articles/9241694-can-i-trade-news'
const REFUND_URL = 'https://help.brightfunded.com/en/articles/9460023-can-i-get-a-refund-for-my-brightfunded-challenge'
const COUNTRIES_URL = 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: SOCIAL_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: SOCIAL_DESCRIPTION },
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function eur(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? 'не подтверждено'
    : `€${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
}

function targets(product: Challenge) {
  if (product.phases === 0) return 'Без оценки'
  if (!product.profitTargets) return 'Цели не подтверждены'
  return [product.profitTargets.phase1, product.profitTargets.phase2, product.profitTargets.phase3]
    .slice(0, product.phases).map(value => value != null && Number.isFinite(value) ? `${value}%` : 'не подтверждена').join(' → ')
}

function pct(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? `${value}%` : 'не подтверждено'
}

function freshSource(source: { sourceCapturedAt: string }) {
  const date = source.sourceCapturedAt
  const parsed = new Date(`${date}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date && isChallengeFresh(source)
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая программа Bright Funded самая дешёвая?',
    a: 'Минимальная цена определяется по свежим записям программ; она не включает платные дополнения.',
  },
  {
    q: 'Bright Funded доступен русскоязычным трейдерам?',
    a: 'Язык сам по себе не определяет доступ. В датированном списке запрещена новая регистрация для резидентов или граждан Кубы, Ирана, Северной Кореи, Сирии, Вьетнама и Пакистана. Для уже активных счетов трейдеров из Пакистана отдельно разрешено продолжение торговли. Отсутствие другой страны в списке не заменяет индивидуальную проверку до оплаты.',
  },
  {
    q: 'Можно ли зарегистрироваться, проживая в России?',
    a: 'Россия отсутствует в опубликованном списке шести стран от 20 апреля 2026 года, но это не индивидуальное разрешение. До оплаты запросите письменное подтверждение поддержки для своего гражданства, резидентства, способа оплаты и будущего метода выплаты; VPN и неверные данные использовать нельзя.',
  },
  {
    q: 'У Bright Funded начальная доля трейдера 90%?',
    a: 'В датированной справке базовая доля составляет 80%. Доля 90% подключается как платное дополнение, а 100% относится к программе увеличения счёта и не является стартовым условием нового счёта после оценки.',
  },
  {
    q: 'Как Bright Funded выплачивает вознаграждение?',
    a: 'Датированная справка указывает банковский перевод в EUR и USDC в сети ERC-20. Минимальная сумма вознаграждения не установлена: указан даже запрос при $0.01. Это не отменяет остальных условий запроса, а комиссия банка, сети или обмена может сделать микровыплату невыгодной.',
  },
  {
    q: 'Когда выплачивается бонус в размере 15% прибыли оценки?',
    a: 'Это не автоматический возврат денег после челленджа. Сначала на счетах после оценки нужно достичь минимум 10% совокупного роста и получить выплату. Затем 15% прибыли оценочных этапов добавляется к балансу нового счёта; запросить этот бонус можно в следующем цикле после одной активирующей сделки.',
  },
  {
    q: 'Можно ли торговать новости?',
    a: 'В датированной справке этапы оценки не ограничивают новостную торговлю. После оценки запрещено исполнение за 5 минут до и 5 минут после важной новости, затрагивающей инструмент: прибыль сделки вычитается, убыток остаётся, но это нарушение само по себе не закрывает счёт. Для тейк-профита сделки длительностью не менее 48 часов указано исключение.',
  },
  {
    q: 'Возвращается ли взнос после прохождения челленджа?',
    a: 'В проверенной конфигурации возврат взноса за прохождение — отдельное дополнение, не часть базовой цены. Это отличается от отмены неиспользованного счёта: опубликованная политика допускает её в течение 30 дней после покупки, если не было ни одной сделки.',
  },
]

export default function RussianBrightFundedReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'Bright Funded')
  const publicDealPcts = getDealsByFirm('bright-funded')
    .map(deal => deal.pct)
    .filter((pct): pct is number => pct != null)
  const bestPublicDealPct = publicDealPcts.length ? Math.max(...publicDealPcts) : null
  const products = getChallengesByFirm('bright-funded')
  const freshProducts = products.filter(product => freshSource(product))
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceEur != null && Number.isFinite(tier.priceEur) && tier.priceEur > 0 ? [{ product, tier, price: tier.priceEur }] : []))
  const latestCapture = products.map(product => product.sourceCapturedAt).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()[0]
    ?? 'дата не указана'
  const lastModified = russianRouteDateModified(PATH, latestCapture)
  const sourceUrls = [...new Set(products.map(product => product.sourceUrl))]
  const evidenceSources = Object.values(brightEvidence.sources)
  const hasFreshEvidence = products.length > 0 && freshProducts.length === products.length
    && evidenceSources.every(freshSource)
    && freshProducts.every(product => product.accountSizes.some(tier => tier.priceEur != null && Number.isFinite(tier.priceEur) && tier.priceEur > 0))
  const hasFreshTrustpilot = freshSource({ sourceCapturedAt: firm?.trustpilotCapturedAt ?? '' })
  const fundedNextProducts = getChallengesByFirm('fundednext').filter(product => isChallengeFresh(product))
  const fundedNextPricedTierCount = fundedNextProducts.reduce((count, product) =>
    count + product.accountSizes.filter(tier => tier.priceUsd != null && tier.priceUsd > 0).length, 0)
  const comparisonProductCount = freshProducts.length + fundedNextProducts.length
  const comparisonPriceCount = pricedTiers.length + fundedNextPricedTierCount
  const oneStep = freshProducts.find(product => product.productSlug === 'bright-funded-1-step')
  const bright = freshProducts.find(product => product.productSlug === 'bright-funded-2-step-bright')
  const classic = freshProducts.find(product => product.productSlug === 'bright-funded-2-step-classic')
  const product100k = (product: Challenge | undefined) => product?.accountSizes.find(tier => tier.sizeUsd === 100000)
  const oneStep100k = product100k(oneStep)
  const bright100k = product100k(bright)
  const classic100k = product100k(classic)
  const minPrice = pricedTiers.length ? Math.min(...pricedTiers.map(item => item.price)) : null
  const maxPrice = pricedTiers.length ? Math.max(...pricedTiers.map(item => item.price)) : null
  const lowestTier = [...pricedTiers].sort((a, b) => a.price - b.price)[0]
  const pageFaqs: RussianFaqItem[] = [
    ...faqs.map((faq, index) => index === 0 ? {
      q: faq.q,
      a: lowestTier ? `В текущей выборке минимальная базовая цена — ${eur(lowestTier.price)}: ${lowestTier.product.productName}, счёт $${lowestTier.tier.sizeUsd.toLocaleString('en-US')}. Дата проверки — ${lowestTier.product.sourceCapturedAt}. Это стоимость участия до платных дополнений; более низкая цена не означает меньший риск нарушения правил.`
        : 'В текущей выборке нет свежих подтверждённых цен, поэтому самая дешёвая программа не названа. Проверьте стоимость и условия на странице фирмы; датированный разбор ниже не заменяет текущую цену.',
    } : faq),
    ...(firm?.trustpilotRatingSuppressed ? [{
      q: 'Почему у Bright Funded нет средней оценки Trustpilot?',
      a: `При проверке от ${firm.trustpilotCapturedAt ?? 'неуказанной даты'} средняя оценка была скрыта после отметки Trustpilot о нарушении правил платформы. Скрытая оценка не равна 0/5 и не означает, что профиль не проверяли. Этот статус сам по себе не подтверждает выплату, прохождение KYC или условия конкретного счёта.`,
    }] : []),
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Bright Funded' },
  ])
  const faq = faqPageSchema(hasFreshTrustpilot ? pageFaqs : pageFaqs.filter(item => item.q !== 'Почему у Bright Funded нет средней оценки Trustpilot?'))
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2025-05-19',
    dateModified: lastModified,
    author: {
      '@type': 'Person',
      name: 'Edris Derakhshi',
      url: 'https://tradersfundhub.com/authors/edris-derakhshi',
    },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell"><RussianDataFreshnessNotice firmSlugs={['bright-funded']} /><RussianEvidenceFreshnessNotice evidence={evidenceSources.map(source => ({ label: source.labelRu, capturedAt: source.sourceCapturedAt }))} /></div>
        <div className="ru-shell" data-russian-partner-review="bright-funded">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Bright Funded</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Самая ранняя проверка программ: {latestCapture}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">Bright Funded указывает стоимость участия в евро, а размер симулированного счёта — в долларах. Разбираем различия программ оценки: когда граница убытка остаётся фиксированной, когда движется за прибылью и какие условия нужно выполнить до запроса выплаты.</p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>программы со свежими данными</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>ценовых уровней</span></div>
            <div className="ru-stat"><strong>{minPrice == null ? 'Нет свежих цен' : `${eur(minPrice)}–${eur(maxPrice)}`}</strong><span>базовая стоимость участия</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-bright-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Bright Funded">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Краткий вывод</a></li>
                {firm?.trustpilotRatingSuppressed ? <li><a href="#reviews">Отзывы и Trustpilot</a></li> : null}
                <li><a href="#access">Доступ для русскоязычных трейдеров</a></li>
                <li><a href="#plans">Сравнение программ</a></li>
                <li><a href="#prices">Цены в евро</a></li>
                <li><a href="#true-cost">Расходы и возврат взноса</a></li>
                <li><a href="#payouts">Выплаты и условный бонус</a></li>
                <li><a href="#rules">Новости, удержание и возвраты</a></li>
                <li><a href="#diaspora">Евро-цена для русскоязычных за рубежом</a></li>
                <li><a href="#fit">Кому подходит Bright Funded</a></li>
                <li><a href="#register">Проверка перед регистрацией</a></li>
                <li><a href="#alternatives">С чем сравнить Bright Funded</a></li>
                <li><a href="#sources">Источники и даты проверки</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="verdict">Краткий вывод</h2>
            <p><strong>Начните сравнение с риска, а затем переходите к цене.</strong> В датированных условиях 2-Step Bright использует статическую границу убытка, а 1-Step — движущуюся. Дешёвый вход сам по себе не делает два этапа легче одного. В актуальной таблице ниже отдельно указаны цели, минимальные дни и стоимость каждой программы; отсутствующие условия не заменяются нулём.</p>
            <p><strong>Для счёта $100K сравнивайте одинаковый размер.</strong> Проверенная цена 1-Step: {eur(oneStep100k?.priceEur)}; 2-Step Bright: {eur(bright100k?.priceEur)}; Classic: {eur(classic100k?.priceEur)}. Если одна из цен не подтверждена, нельзя вычислять «экономию», считая её равной нулю. Размер $100K обозначает номинал симулированного счёта, а не сумму, которую вам переводят.</p>
            <p>Для русскоязычного читателя Bright Funded — глобальная фирма с оплатой в EUR. Решение для гражданина или резидента любой страны начинается с ограничений, проверки личности и доступного способа выплаты. Русская версия обзора не означает, что фирма обслуживает всех русскоязычных пользователей.</p>
            <div className="ru-notice" data-russian-bright-summary-cta="qualified-country-first">
              <strong>Что проверить до оплаты.</strong> Сопоставьте 4 условия: гражданство, страну проживания, способ оплаты и способ получения выплаты. Отсутствие страны в опубликованном запрете не заменяет проверку документов конкретного трейдера.
            </div>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="bright-funded-summary">
              <strong>Партнёрские ссылки.</strong> Если вы перейдёте к Bright Funded и зарегистрируетесь, мы можем получить комиссию. Партнёрство не меняет расчёты, порядок сравнения или необходимость проверить доступ из своей страны до оплаты.
            </div>
            {firm?.affiliateUrl ? (
              <div className="ru-actions">
                <Link href="/go/bright-funded?from=ru-bright-funded-review-summary" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                  Проверить страну и планы Bright Funded <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сначала сравнить с FundedNext</Link>
              </div>
            ) : null}
          </div>
        </section>

        {firm?.trustpilotRatingSuppressed ? (
          <section className="ru-section">
            <div
              className="ru-shell ru-content"
              data-russian-bright-reviews="suppressed-not-zero"
            >
              <h2 id="reviews">Отзывы о Bright Funded: почему мы не показываем среднюю оценку</h2>
              {!hasFreshTrustpilot && <p className="ru-notice">Наблюдение Trustpilot требует повторной проверки. Ниже сохранён статус на указанную дату, не подтверждение текущего состояния профиля.</p>}
              <p>
                При проверке профиля Trustpilot от {firm.trustpilotCapturedAt ?? 'неуказанной даты'} средняя оценка Bright Funded была скрыта после отметки
                о нарушении правил платформы. Это <strong>не 0/5</strong>, а скрытая средняя оценка без отображения среднего балла
                и количества: ноль, отсутствие данных и снятый агрегат означают три разные вещи.
              </p>
              <div className="ru-grid">
                <article className="ru-card">
                  <h3>Что подтверждено</h3>
                  <p>На дату {firm.trustpilotCapturedAt ?? 'без даты'} публичный агрегат нельзя было использовать как числовой сигнал. Мы не восстанавливаем прежний балл из кеша и не заменяем его редакционными {firm.score.toFixed(1)}/10.</p>
                </article>
                <article className="ru-card">
                  <h3>Чего скрытая оценка не доказывает</h3>
                  <p>Статус Trustpilot сам по себе не подтверждает и не опровергает выплату, KYC-решение или нарушение торгового правила на 1 конкретном счёте; эти события требуют собственного документа и даты.</p>
                </article>
                <article className="ru-card">
                  <h3>Что должен назвать полезный отзыв</h3>
                  <p>Нужны название программы, взнос в EUR, этап, тип просадки, дата, страна и способ выплаты. Без этих 7 сведений отзыв нельзя переносить между 1-Step, 2-Step Bright и Classic.</p>
                </article>
              </div>
              <p className="ru-source-line">
                Статус проверен {firm.trustpilotCapturedAt ?? 'без даты'} ·{' '}
                {firm.trustpilotUrl ? <a href={firm.trustpilotUrl} target="_blank" rel="noopener noreferrer">Открыть профиль Trustpilot</a> : 'ссылка на профиль не сохранена'}.
                {' '}Для продуктовой проверки используйте чек-лист из 7 полей, а не старый агрегат.
              </p>
              <div className="ru-actions">
                <Link href="/ru/otzyvy-prop-firm#review-checklist" className="btn-outline">Чек-лист проверки отзывов</Link>
                <Link href="#plans" className="btn-primary">Сопоставить программы</Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="access">Доступ для России и русскоязычных трейдеров за рубежом</h2>
            <div className="ru-notice" data-russian-bright-country-access="published-list">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Россия не названа в опубликованном списке, но это не персональная гарантия.</strong>{' '}
              В справке, проверенной {brightEvidence.sources.countries.sourceCapturedAt}, запрет новой покупки и регистрации относится к гражданам или резидентам Кубы, Ирана, Северной Кореи, Сирии, Вьетнама и Пакистана. Для уже активных счетов трейдеров из Пакистана указано исключение: торговлю можно продолжать. Это не разрешение новой регистрации.
            </div>
            <p>Для русскоязычного трейдера в ЕС, Великобритании, Казахстане, ОАЭ, Израиле, Северной Америке или другой стране важен фактический профиль, а не язык. Перед оплатой уточните ограничения по гражданству и месту проживания, используйте собственные данные и подтвердите способ получения выплаты. Отсутствие страны в списке не гарантирует, что банк, санкционная проверка или KYC одобрит конкретного трейдера.</p>
            <p><a href={COUNTRIES_URL} target="_blank" rel="noopener noreferrer">Открыть официальный список ограниченных стран</a>. Не используйте VPN, прокси, чужую карту или неверный адрес для обхода ограничений. Подтверждение должно относиться к вашим настоящим документам и обстоятельствам.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell">
            <div className="ru-content">
              <h2 id="plans">Сравнение программ Bright Funded</h2>
              <p>В таблице цена относится к счёту $100K: так можно сравнить правила на одинаковом размере. Статическая просадка считается от первоначального баланса; трейлинг следует за достигнутым максимумом. Это различие важнее одного лишь числа этапов.</p>
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Сравнение программ Bright Funded — таблицу можно прокрутить">
              <table className="ru-table" data-russian-bright-plan-matrix="three-products">
                <thead><tr><th>Программа</th><th>Цена $100K</th><th>Фазы / цели</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Тип</th><th>Мин. дни</th><th>Базовый сплит</th></tr></thead>
                <tbody>
                  {freshProducts.map(product => (
                    <tr key={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{eur(product100k(product)?.priceEur)}</td>
                      <td>{product.phases}; {targets(product)}</td>
                      <td>{pct(product.dailyLossPct)}</td>
                      <td>{pct(product.maxLossPct)}</td>
                      <td>{product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : 'не подтверждена'}</td>
                      <td>{minimumTradingDaysLabel(product.minTradingDays, 'ru')}{product.minTradingDays != null ? ' на этап' : ''}</td>
                      <td>{pct(product.profitSplitPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-content ru-prose-stack">
              <section><h3>1-Step: одна оценка с движущейся границей</h3><p>В датированной справке 1-Step отслеживает максимальную стоимость счёта с учётом открытых позиций. Просадка растёт вслед за этим максимумом и после установленного роста фиксируется на начальном балансе. Поэтому возврат открытой прибыли может привести к нарушению раньше, чем при статической границе.</p></section>
              <section><h3>2-Step Bright: два этапа со статической просадкой</h3><p>В проверенной конфигурации Bright снижает первую цель относительно Classic, но оставляет меньший общий запас убытка. Сравните последовательность целей и дневной лимит в таблице; низкая цена не компенсирует правило, которое не подходит вашей стратегии.</p></section>
              <section><h3>2-Step Classic: другой запас риска</h3><p>Classic в датированной справке также использует статическую просадку, но с другим лимитом и первой целью. Выбор между двумя двухэтапными планами требует проверки обоих условий, а не только стоимости входа.</p></section>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell">
            <div className="ru-content">
              <h2 id="prices">Базовые цены в евро</h2>
              <p>Счёт номинирован в USD, а участие оплачивается в EUR. Таблица сохраняет валюту фирмы и не конвертирует её по курсу, который устареет после публикации. Число цен со свежими данными: {pricedTiers.length}.</p>
              <div className="ru-notice"><strong>Акционная цена не равна базовой.</strong> В таблице сохранены цены без временных скидок. Сверьте окончательную сумму, платформу и выбранные дополнения на странице оплаты; старый промокод не считается действующим предложением.</div>
              {!pricedTiers.length && <p className="ru-notice" data-russian-bright-empty="recapture-required">Свежих подтверждённых цен сейчас нет. Датированный разбор правил ниже сохранён, но не подтверждает текущую стоимость. <Link href="/ru/luchshie-prop-firmy#podbor">Открыть подбор с датами источников →</Link></p>}
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Цены программ Bright Funded — таблицу можно прокрутить">
              <table className="ru-table" data-russian-bright-price-count={pricedTiers.length}>
                <thead><tr><th>Программа</th><th>Размер</th><th>Цена EUR</th><th>Цели</th><th>Лимиты</th><th>Дата</th></tr></thead>
                <tbody>
                  {pricedTiers.map(({ product, tier, price }) => (
                    <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                      <td>{product.productName}</td>
                      <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                      <td>{eur(price)}</td>
                      <td>{targets(product)}</td>
                      <td>{pct(product.dailyLossPct)} / {pct(product.maxLossPct)}; {product.drawdownType ? drawdownLabels[product.drawdownType] : 'тип не подтверждён'}</td>
                      <td>{product.sourceCapturedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell">
            <div className="ru-content">
              <h2 id="true-cost">Сколько прибыли нужно для компенсации взноса</h2>
              <p>По <Link href="/true-cost-of-prop-firm-challenges">единой методике расчёта расходов</Link> взнос делится на начальную долю трейдера, указанную в каждой строке. Получается порог валовой прибыли в EUR для компенсации одного взноса. Это расчёт при выполнении условий выплаты, а не прогноз дохода или обещание вернуть деньги.</p>
              <p>Отношение расходов к допустимому убытку здесь не рассчитывается: взнос выражен в EUR, а лимит — в USD. Без текущего курса их нельзя делить друг на друга. Повторная попытка, платные дополнения, конвертация банка и налоги в этот расчёт не входят.</p>
            </div>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Расчёт расходов Bright Funded — таблицу можно прокрутить">
              <table className="ru-table" data-russian-bright-truecost={pricedTiers.length}>
                <thead><tr><th>Программа / счёт</th><th>Базовый взнос</th><th>Начальная доля трейдера</th><th>Прибыль для компенсации взноса</th></tr></thead>
                <tbody>
                  {pricedTiers.map(({ product, tier }) => {
                    const economics = challengeTierEconomics(product, tier)
                    return (
                      <tr key={`true-cost-${product.productSlug}-${tier.sizeUsd}`}>
                        <td>{product.productName} ${tier.sizeUsd.toLocaleString('en-US')}</td>
                        <td>{eur(tier.priceEur)}</td>
                        <td>{pct(product.profitSplitPct)}</td>
                        <td>{eur(economics?.breakEvenProfit)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="ru-content">
              <p>Не считайте отсутствие результата нулевой стоимостью: если цена или начальная доля не подтверждена, порог не вычисляется. Сравнивайте строки в одной валюте и учитывайте дополнительные расходы отдельно.</p>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-bright-payouts="eur-usdc">
            <h2 id="payouts">Выплаты: сроки, способы и условный бонус</h2>
            <p className="ru-source-line">Справка проверена {brightEvidence.sources.reward.sourceCapturedAt}. Это дата проверки правил, а не цен программ.</p>
            <div className="ru-prose-stack">
              <section><h3>Неясность вокруг последующих выплат</h3><p>Проверенная справка указывает первый запрос через 30 дней после первой сделки на счёте после оценки, затем каждые 14 дней. Но на той же странице 14-дневный режим перечислен среди платных дополнений. До покупки получите письменное подтверждение базового цикла выбранной конфигурации: мы не выбираем более выгодную формулировку за фирму.</p></section>
              <section><h3>Банковский перевод или USDC</h3><p>По датированной справке банковский перевод обрабатывается в EUR, криптовыплата — в USDC по сети ERC-20. Минимальная сумма не установлена; указан даже запрос при $0.01. Это не отменяет сроки и остальные условия, а комиссии банка, сети и обмена могут уменьшить полученную сумму.</p></section>
              <section><h3>15% прибыли оценки — условный бонус</h3><p>После минимум 10% совокупного роста на счетах после оценки и полученной выплаты к стартовому балансу нового счёта добавляется 15% прибыли оценочных этапов. Запросить бонус можно в следующем цикле после одной активирующей сделки. Это не немедленный возврат взноса за челлендж.</p></section>
              <section><h3>Начальная доля и платные дополнения</h3><p>Справка различает базовые 80%, платное дополнение до 90% и долю до 100% по программе увеличения счёта. В таблице расходов используется начальная доля конкретной программы, не максимальный рекламируемый процент.</p></section>
            </div>
            <p><a href={REWARD_URL} target="_blank" rel="noopener noreferrer">Проверить официальные условия вознаграждения</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="rules">Новости, удержание, автоматизация и возвраты</h2>
            <div className="ru-prose-stack">
              <section><h3>Новостное окно после оценки</h3><p>По справке от {brightEvidence.sources.news.sourceCapturedAt} на этапах оценки новостная торговля не ограничена. После оценки исполнение за 5 минут до и 5 минут после важной новости, затрагивающей инструмент, приводит к вычету прибыли; убыток остаётся. Само это нарушение не закрывает счёт. Исключение относится к тейк-профиту сделки длительностью не менее 48 часов, а не ко всем старым позициям.</p></section>
              <section><h3>Перенос позиции не отменяет риск</h3><p>В датированных записях программ разрешён перенос ночью и через выходные. Это не отменяет своп, ценовой разрыв при открытии рынка и лимиты убытка. До торговли проверьте актуальные условия выбранного счёта; статическая граница и граница вслед за открытой прибылью работают по-разному.</p></section>
              <section><h3>Советники и копирование требуют отдельной проверки</h3><p>В записях программ автоматизация и копирование отмечены как ограниченные. Уточните платформу, владельца копируемых счетов и разрешённый сценарий. Наличие поддержки советников не является разрешением копировать сделки чужого трейдера или сигнального сервиса.</p></section>
              <section><h3>Отмена покупки и возврат за прохождение — разные условия</h3><p>Политика, проверенная {brightEvidence.sources.refund.sourceCapturedAt}, разрешает отмену в течение 30 дней после покупки, если не совершено ни одной сделки. Обработка заявлена за 48 часов, зачисление — за 3–10 рабочих дней. Это не обещание вернуть взнос за успешное прохождение; условия такого дополнения нужно проверить отдельно при покупке.</p></section>
            </div>
            <p><a href={RULES_URL} target="_blank" rel="noopener noreferrer">Правила оценки</a>{' · '}<a href={NEWS_URL} target="_blank" rel="noopener noreferrer">Правило новостей</a>{' · '}<a href={REFUND_URL} target="_blank" rel="noopener noreferrer">Политика возврата</a></p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-bright-diaspora="currency-first">
            <h2 id="diaspora">Что означает EUR-цена для русскоязычных за рубежом</h2>
            <p>Не путайте EUR-цену участия с номиналом счёта в USD. Для карты со счётом в евро валютная конвертация может не понадобиться; окончательный порядок списания и комиссии определяют банк и платёжный провайдер. Для карты в другой валюте сравнивайте итоговую сумму списания, а не только цену на сайте фирмы.</p>
            <p>Способ выплаты тоже влияет на чистый результат. Для перевода в EUR нужен подходящий банковский счёт; для USDC ERC-20 — совместимый кошелёк и доступный вам законный способ обмена. Ни один вариант не универсален для всех русскоязычных: страна проживания, банк и налоговые обстоятельства различаются.</p>
            <p>До покупки выполните 5 проверок: уточните ограничения по гражданству и месту проживания, посмотрите итоговую цену в EUR, выберите способ оплаты на своё имя, подтвердите получение выплаты банковским переводом в EUR или в USDC и сохраните условия платных дополнений. Эти проверки помогают заметить несовместимые условия заранее, но не гарантируют прохождение KYC или выплату.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="fit">Кому подходит и кому не подходит Bright Funded</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Если нужна фиксированная граница</h3><p>Рассмотрите 2-Step Bright и Classic по датированным правилам статической просадки. Сопоставьте дневной лимит, общую границу и обе цели с собственной допустимой серией убытков.</p></article>
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Если позиции остаются открытыми</h3><p>Проверьте перенос на ночь и выходные, своп и исключение для тейк-профита после 48 часов. Отсутствие подтверждённого процента стабильности прибыли в наших данных не означает отсутствия такого правила.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Если открытая прибыль часто уменьшается</h3><p>У 1-Step движущаяся граница может приблизиться к текущему счёту после роста открытой прибыли. Смоделируйте этот сценарий отдельно: он не равнозначен убытку от первоначального баланса.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Если нужна ранняя выплата</h3><p>Не рассчитывайте на выплату сразу после оценки. Датированная справка задаёт ожидание первого запроса и содержит неясность о следующем 14-дневном цикле; запросите условия до покупки.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="register">Проверка перед регистрацией</h2>
            <ol>
              <li>Выберите 1-Step, 2-Step Bright или Classic по просадке и целям, а не по слову «до 90%».</li>
              <li>Сверьте базовую цену в EUR и окончательную сумму после выбранных дополнений и действующей скидки.</li>
              <li>Подтвердите гражданство, резидентство, KYC и совпадение имени владельца платежа.</li>
              <li>Подтвердите базовый цикл выплат: в справке остаётся противоречие вокруг 14-дневного режима.</li>
              <li>Выберите банковский перевод в EUR или USDC ERC-20 и оцените комиссию до первой маленькой выплаты.</li>
            </ol>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="bright-funded">
              <strong>Партнёрские ссылки.</strong> Мы можем получить комиссию, если подходящий читатель зарегистрируется через ссылку ниже. Партнёрство не меняет исходные данные, расчёт расходов или вывод по стране. Нельзя обходить ограничения с помощью VPN, прокси или неверных данных.
            </div>
            <RussianAffiliateSupportCode
              firm={firm}
              publicOfferPct={bestPublicDealPct}
              placement="bright-funded-review-verdict"
            />
            {firm?.affiliateUrl ? (
              <div className="ru-actions">
                <Link href="/go/bright-funded?from=ru-bright-funded-review-verdict" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                  Проверить страну и планы Bright Funded <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сравнить с FundedNext</Link>
                <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Все глобальные фирмы</Link>
              </div>
            ) : <p>Партнёрская ссылка не настроена; используйте рейтинг для сравнения.</p>}
            <p className="ru-source-line"><BadgeDollarSign size={14} aria-hidden="true" /> Окончательная цена и право на участие определяются фирмой; переход по партнёрской ссылке не гарантирует одобрение.</p>
            <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Продуктовые источники: {sourceUrls.map((url, index) => <span key={url}>{index ? ' · ' : ''}<a href={url} target="_blank" rel="noopener noreferrer">страница {index + 1}</a></span>)}</p>
            <p className="ru-source-line">Подробная англоязычная проверка: <Link href="/blog/bright-funded-prop-firm" hrefLang="en">Bright Funded review</Link>.</p>
          </div>
        </section>

        <section className="ru-section" data-russian-bright-alternatives="failure-point-routing">
          <div
            className="ru-shell ru-content"
            data-russian-bright-comparison-products={comparisonProductCount}
            data-russian-bright-comparison-prices={comparisonPriceCount}
          >
            <h2 id="alternatives">С чем сравнить Bright Funded</h2>
            <p>Сравнивайте альтернативы по тому условию, которое вам не подходит: просадке, сроку выплаты, проверке документов или валюте оплаты. Следующие 5 материалов помогают разобрать эти различия до регистрации.</p>
            <ul className="ru-review-related-links">
              <li><Link href="/ru/fundednext-vs-bright-funded">Bright Funded или FundedNext</Link> — сравнение {comparisonProductCount} программ и {comparisonPriceCount} цен в USD/EUR: просадка, окупаемость взноса, выплаты и ограничения по стране.</li>
              <li><Link href="/ru/obzor-fundednext">Обзор FundedNext</Link> — другая конфигурация цены, просадки и условий запроса выплаты. Число программ со свежими данными: {fundedNextProducts.length}; цен в USD: {fundedNextPricedTierCount}.</li>
              <li><Link href="/ru/vyplaty-prop-firm">Сравнение выплат проп-фирм</Link> — способы получения денег, календарь запросов и комиссии банка или сети.</li>
              <li><Link href="/ru/prop-firmy-bez-kyc">Проверка KYC и страны</Link> — гражданство, резидентство, документы и имя владельца платежа; отсутствие страны в запрете не равно персональному одобрению.</li>
              <li><Link href={getRussianReviewFinderHref('bright-funded')} data-russian-review-finder="bright-funded">Подбор и сравнение программ</Link> — начните с двухэтапных вариантов, затем измените размер счёта, бюджет и число этапов под свой торговый план.</li>
            </ul>

            <div className="ru-review-author" aria-label="Автор обзора Bright Funded">
              <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
              <div>
                <strong>Автор: Edris Derakhshi</strong>
                <p>Обзор разбирает программы Bright Funded по официальным источникам: цены в EUR, просадку и выплаты. Даты проверки указаны рядом с данными; партнёрская связь раскрыта отдельно.</p>
                <Link href="/authors/edris-derakhshi">Профиль автора</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-bright-evidence-status={hasFreshEvidence ? 'dated' : 'recapture-required'}>
            <h2 id="sources">Источники и даты проверки</h2>
            <p>Проверка справки о выплатах или стране не обновляет цены программ. Ниже эти даты разделены. Описания остаются датированным разбором; доступ конкретного трейдера и получение выплаты не проверялись.</p>
            <ul>{evidenceSources.map(source => <li key={source.sourceUrl}><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{source.labelRu}</a> — {source.sourceCapturedAt || 'дата не подтверждена'}.</li>)}</ul>
            <p>Проверки цен и правил программ: {[...new Set(products.map(product => product.sourceCapturedAt || 'дата не подтверждена'))].sort().join(', ') || 'записи отсутствуют'}. Ссылки на страницы программ сохранены выше даже после истечения срока проверки.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="faq">Частые вопросы</h2>
            {!hasFreshEvidence && <p className="ru-notice">Часть источников требует повторной проверки. Ответы ниже сохраняют датированный разбор, а не подтверждают действующие условия.</p>}
            <RussianFaq items={pageFaqs} />
          </div>
        </section>
      </article>
    </>
  )
}
