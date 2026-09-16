import type { Metadata } from 'next'
import { fundedNextOneStepPayoutLabel } from '@/lib/fundedNextPayout'
import { getRussianReviewFinderHref } from '@/lib/challengeComparisonData'
import Image from 'next/image'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import RussianFundedNextEaNotice from '@/components/RussianFundedNextEaNotice'
import { getDealsByFirm } from '@/lib/deals'
import { challengeTierEconomics, minimumCostToFundedUsd, getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import reviewEvidence from '@/content/data/russian-fundednext-review-evidence.json'
import instantEvidence from '@/content/data/russian-fundednext-instant-evidence.json'
import mt5Evidence from '@/content/data/russian-fundednext-mt5-evidence.json'

const PATH = '/ru/obzor-fundednext'
const TITLE = 'FundedNext: отзывы и обзор 2026, цены и правила'
const DESCRIPTION = 'Обзор FundedNext на русском: цены программ Stellar, просадка, условия выплат, копирование сделок, отзывы и проверка доступа из своей страны.'
// Preserve existing sharing copy until its separate update is approved.
const SOCIAL_DESCRIPTION = 'Отзывы о FundedNext и обзор на русском: 4 модели Stellar, 22 цены, просадка, выплаты, Free Trial и проверка ограничений по стране.'
export const revalidate = 3600

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

const payoutLabels: Record<string, string> = {
  weekly: 'еженедельно',
  'bi-weekly': 'каждые две недели',
  monthly: 'ежемесячно',
  'on-demand': 'по запросу при выполнении условий',
}

const payoutMethodLabels: Record<string, string> = {
  'bank wire': 'банковский перевод',
  'bank transfer': 'банковский перевод',
  crypto: 'криптовалюта',
  card: 'карта',
  rise: 'Rise',
}

function priceRange(values: number[]) {
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (!sorted.length) return 'не подтверждена'
  const format = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return sorted[0] === sorted.at(-1) ? format(sorted[0]) : `${format(sorted[0])}–${format(sorted.at(-1)!)}`
}

function targetLabel(product: Challenge) {
  if (product.phases === 0) return 'Без оценки'
  if (!product.profitTargets) return 'Цели не подтверждены'
  return [product.profitTargets.phase1, product.profitTargets.phase2, product.profitTargets.phase3]
    .slice(0, product.phases).map(target => target != null && Number.isFinite(target) ? `${target}%` : 'не подтверждена').join(' → ')
}

function freshSource(source: { sourceCapturedAt: string }) {
  const date = source.sourceCapturedAt
  const parsed = new Date(`${date}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date && isChallengeFresh(source)
}

function pct(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? `${value}%` : 'не подтверждено'
}

function splitRange(products: Challenge[]) {
  const values = products.flatMap(product => product.profitSplitPct != null && Number.isFinite(product.profitSplitPct) ? [product.profitSplitPct] : [])
  if (!values.length) return 'не подтверждена'
  const low = Math.min(...values)
  const high = Math.max(...values)
  return `${low === high ? pct(low) : `${low}–${high}%`}${values.length < products.length ? '; часть условий не подтверждена' : ''}`
}

function dailyLossLabel(product: Challenge) {
  if (product.dailyLossPct != null) return pct(product.dailyLossPct)
  const evidence = reviewEvidence.sources.instantLoss
  return product.firmSlug === reviewEvidence.firmSlug && evidence.productSlugs.includes(product.productSlug)
    && evidence.dailyLossLimitApplies === false && freshSource(evidence) ? 'Нет дневного лимита' : 'Дневной лимит не подтверждён'
}

function lossLabel(product: Challenge) {
  const daily = dailyLossLabel(product)
  const maximum = product.maxLossPct == null ? 'максимум не подтверждён' : `${pct(product.maxLossPct)} максимум`
  return `${daily}; ${maximum}`
}

function payoutLabel(product: Challenge) {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  if (product.payoutFirstDays === 0) return 'по запросу после условий'
  if (product.payoutFirstDays == null || !Number.isFinite(product.payoutFirstDays)) return 'срок не подтверждён'
  const days = 'дн.'
  return `${product.payoutFirstDays} ${days}; ${payoutLabels[product.payoutFrequency ?? ''] ?? product.payoutFrequency ?? 'цикл не подтверждён'}`
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Доступен ли FundedNext резидентам России?',
    a: 'Мы не можем подтвердить доступность. Официальная статья по CFD не включает Россию в список ограничений, но корпоративная страница FundedNext говорит, что компания не обслуживает резидентов России. Futures-продукты прямо запрещают покупку из России. До письменного подтверждения поддержки и успешной проверки профиля считать доступ доказанным нельзя.',
  },
  {
    q: 'Какая программа FundedNext самая дешёвая?',
    a: 'Минимальная цена зависит от модели, размера счёта, промоакции и возможной отдельной платы за платформу. Проверяйте текущую страницу оплаты: в таблице остаются только цены из источников, проверенных не более 30 дней назад.',
  },
  {
    q: 'Получает ли новый трейдер долю 95%?',
    a: 'Нет универсального процента для всех моделей. Доля трейдера, платные дополнения и условия увеличения счёта могут различаться по продукту. Проверяйте базовую долю отдельно от максимального процента по программе роста.',
  },
  {
    q: 'Можно ли обойти ограничение страны через VPN?',
    a: 'Нет. FundedNext прямо запрещает скрывать резидентство или использовать VPN, прокси, чужую личность либо неверные данные для обхода ограничений; это может привести к закрытию аккаунта.',
  },
  {
    q: 'Что учитывать кроме цены участия?',
    a: 'Сопоставьте размер счёта, число этапов, допустимый убыток, начальную долю трейдера и условия возврата взноса. Дополнения и возможная плата за платформу проверяются отдельно. Счёт с меньшей ценой не обязательно требует меньше усилий или допускает большую серию убытков.',
  },
  {
    q: 'Когда возвращают регистрационный взнос?',
    a: 'В датированных условиях Stellar 2-Step возврат привязан к первому одобренному вознаграждению. Для новых 1-Step и Lite — к третьему. Stellar Instant не предусматривает возврат взноса за прохождение. Сверьте условия своей покупки: эти правила не означают немедленного возврата после оценки.',
  },
  {
    q: 'Что происходит с прибылью во время важных новостей?',
    a: 'Общая датированная статья относится к счетам после оценки Stellar 1-Step, 2-Step и Lite: в окне 5 минут до и 5 минут после затрагивающей инструмент важной новости засчитывается 40% прибыли, убыток остаётся полностью. Оценочные этапы этим правилом не охвачены. Для Instant опубликованы отдельные условия, которые нужно читать отдельно.',
  },
  {
    q: 'Можно ли торговать с советником или копировать сделки?',
    a: 'Допуск к советникам зависит от платформы, размера и программы. Платное дополнение не отменяет ограничения. Общая статья разрешает копирование между собственными оценочными счетами в пределах условий и запрещает его с участием счёта после оценки. Отдельная статья Instant разрешает копировать между собственными счетами Instant, но не между Instant и 1-Step, 2-Step или Lite.',
  },
]

export default function RussianFundedNextReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'FundedNext')
  const products = getChallengesByFirm('fundednext')
  const freshProducts = products.filter(product => freshSource(product))
  const fundedNextDeal = getDealsByFirm('fundednext')
    .find(deal => deal.mechanism === 'earned-coupon' && deal.pct != null)
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && Number.isFinite(tier.priceUsd) && tier.priceUsd > 0 ? [{ product, tier, price: tier.priceUsd }] : []))
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const sourceUrls = [...new Set(products.map(product => product.sourceUrl))]
  const latestProductCapture = products.map(product => product.sourceCapturedAt).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()[0]
  const ruleSources = Object.values(reviewEvidence.sources)
  const evidenceDates = [
    ...ruleSources.map(source => ({ label: source.labelRu, capturedAt: source.sourceCapturedAt })),
    { label: 'страна и способы выплаты', capturedAt: marketEvidence.capturedAt },
    { label: 'остальные условия Stellar Instant', capturedAt: instantEvidence.capturedAt },
    { label: 'новости Stellar Instant', capturedAt: instantEvidence.news.sourceCapturedAt },
    { label: 'общие правила советников', capturedAt: mt5Evidence.ea.sourceCapturedAt },
    { label: 'советники Stellar Instant', capturedAt: mt5Evidence.instantEaScope.sourceCapturedAt },
  ]
  const hasFreshEvidence = products.length > 0 && products.length === freshProducts.length
    && evidenceDates.every(source => freshSource({ sourceCapturedAt: source.capturedAt }))
    && freshProducts.every(product => product.accountSizes.some(tier => tier.priceUsd != null && Number.isFinite(tier.priceUsd) && tier.priceUsd > 0))
  const hasFreshTrustpilot = freshSource({ sourceCapturedAt: firm?.trustpilotCapturedAt ?? '' })
  const lastModified = russianRouteDateModified(
    PATH,
    latestProductCapture ?? marketEvidence.capturedAt,
  )
  const hasFreshProducts = freshProducts.length > 0
  const twoStep = freshProducts.find(product => product.productSlug === 'stellar-2-step')
  const oneStep = freshProducts.find(product => product.productSlug === 'stellar-1-step')
  const lite = freshProducts.find(product => product.productSlug === 'stellar-lite')
  const instant = freshProducts.find(product => product.productSlug === 'stellar-instant')
  const tierFor = (product: typeof twoStep, sizeUsd: number) =>
    product?.accountSizes.find(tier => tier.sizeUsd === sizeUsd)
  const twoStep100k = tierFor(twoStep, 100000)
  const oneStep100k = tierFor(oneStep, 100000)
  const lite100k = tierFor(lite, 100000)
  const instant10k = tierFor(instant, 10000)
  const twoStepCost = twoStep && twoStep100k ? challengeTierEconomics(twoStep, twoStep100k) : null
  const instantCost = instant && instant10k ? challengeTierEconomics(instant, instant10k) : null
  const money = (value: number | null | undefined) => value == null || !Number.isFinite(value)
    ? 'не подтверждено'
    : `$${value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`
  const pageFaqs: RussianFaqItem[] = [
    ...faqs,
    ...(firm?.trustpilotScore != null && firm.trustpilotCount != null ? [{
      q: 'Что показывают отзывы о FundedNext на Trustpilot?',
      a: `При проверке от ${firm.trustpilotCapturedAt ?? 'неуказанной даты'} профиль показывал ${firm.trustpilotScore.toFixed(1)}/5 по ${firm.trustpilotCount.toLocaleString('ru-RU')} отзывам. Средняя оценка описывает публичную обратную связь на ту дату, но не подтверждает выплату, прохождение KYC, доступность страны или правило конкретной модели Stellar.`,
    }] : []),
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор FundedNext' },
  ])
  const faq = faqPageSchema(hasFreshTrustpilot ? pageFaqs : pageFaqs.filter(item => item.q !== 'Что показывают отзывы о FundedNext на Trustpilot?'))
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2024-09-02',
    dateModified: lastModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FundedNext</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext']} />
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Самая ранняя проверка программ: {latestProductCapture ?? 'не подтверждена'}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Модели Stellar различаются числом этапов, просадкой, долей трейдера и условиями первой выплаты.
            Выбирать нужно по ограничивающему правилу, а не по максимальному рекламному проценту.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>моделей со свежими данными</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>опубликованных цен</span></div>
            <div className="ru-stat"><strong>{priceRange(pricedTiers.map(item => item.price))}</strong><span>диапазон входа</span></div>
            <div className="ru-stat"><strong>{firm?.score.toFixed(1) ?? '—'}/10</strong><span>редакционный балл</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-fundednext-article="long-form">
      <section className="ru-section ru-review-opening" data-russian-fundednext-editorial-shell="review-parity">
        <div className="ru-shell">
          <div className="ru-notice ru-disclosure ru-review-top-disclosure">
            <strong>Партнёрские ссылки.</strong> Мы можем получить комиссию, если читатель
            зарегистрируется через ссылку на этой странице. Партнёрство даёт <strong>0 баллов</strong> к оценке и
            не меняет исходные данные, расчёты или ограничения по стране.
          </div>

          {firm ? (
            <aside className="ru-review-firm-card" aria-label="Краткая карточка FundedNext">
              <div className="ru-review-firm-brand">
                {firm.logo ? (
                  <Image
                    src={firm.logo}
                    alt="Логотип FundedNext"
                    width={64}
                    height={64}
                    className="ru-review-firm-logo"
                  />
                ) : null}
                <div>
                  <div className="ru-review-firm-title-row">
                    <strong>FundedNext</strong>
                    <span className="ru-pill">TFH {firm.score.toFixed(1)}/10</span>
                  </div>
                  <p>
                    Моделей CFD со свежими данными: {freshProducts.length} · цен: {pricedTiers.length} · самая ранняя проверка: {latestProductCapture ?? 'без даты'}
                  </p>
                  {firm.trustpilotScore != null && firm.trustpilotCount != null ? (
                    <p className="ru-review-trustpilot">
                      Trustpilot: {firm.trustpilotScore.toFixed(1)}/5 по {firm.trustpilotCount.toLocaleString('ru-RU')} отзывам,
                      проверено {firm.trustpilotCapturedAt ?? 'дата не указана'}; рейтинг не доказывает выплату по конкретному счёту.
                      {firm.trustpilotUrl ? <> <a href={firm.trustpilotUrl} target="_blank" rel="noopener noreferrer">Проверить профиль</a>.</> : null}
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className="ru-review-firm-facts">
                <div><dt>Начальная доля</dt><dd>{splitRange(freshProducts)}</dd></div>
                <div><dt>Просадка</dt><dd>Тип и лимиты указаны по каждой модели ниже</dd></div>
                <div><dt>Первая выплата</dt><dd>Срок и условия зависят от программы</dd></div>
                <div><dt>Макс. распределение</dt><dd>{firm.maxAllocation}</dd></div>
              </dl>

              <div className="ru-review-firm-action">
                <p>До покупки подтвердите доступность для своей страны, документы для KYC, платформу и итоговую сумму оплаты.</p>
                <Link
                  href="/go/fundednext?from=ru-fundednext-review-summary"
                  rel="sponsored nofollow noopener"
                  className="btn-primary btn-glow"
                >
                  Открыть текущие планы <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          ) : null}

          {fundedNextDeal && (
            <aside
              id="current-offer"
              className="ru-notice ru-anchor-target"
              data-russian-fundednext-current-offer="earned-coupon"
            >
              <strong>Текущее предложение: персональный купон {fundedNextDeal.pct}%, а не публичный промокод.</strong>{' '}
              Новый пользователь сначала проходит Free Trial: цель 5% требует минимум 3 торговых дня
              в 14-дневном окне. После выполнения FundedNext отправляет персональный код на электронную почту и в раздел My Offers;
              он действует 14 дней, распространяется на CFD-программы и не применяется к перезапускам счёта.
              <p className="ru-source-line">
                Проверено {fundedNextDeal.verifiedOn} ·{' '}
                <a href={fundedNextDeal.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {fundedNextDeal.sourceLabel}
                </a>
              </p>
              <div className="ru-actions">
                <Link href="/ru/promokody-prop-firm#fundednext-promokod" className="btn-outline">
                  Проверить все 4 шага
                </Link>
                <Link
                  href="/go/fundednext?from=ru-fundednext-review-free-trial"
                  rel="sponsored nofollow noopener"
                  className="btn-primary"
                >
                  Начать Free Trial FundedNext <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="ru-section ru-review-toc-section">
        <div className="ru-shell">
          <nav className="toc ru-review-toc" aria-label="Содержание обзора FundedNext">
            <div className="toc-title">Содержание обзора</div>
            <ol>
              <li><a href="#verdict">Краткий вывод</a></li>
              <li><a href="#access">Доступ для России и русскоязычных за рубежом</a></li>
              {firm?.trustpilotScore != null && firm.trustpilotCount != null ? <li><a href="#reviews">Отзывы и Trustpilot</a></li> : null}
              <li><a href="#method">Методика проверки</a></li>
              <li><a href="#facts">FundedNext в цифрах</a></li>
              <li><a href="#products">Модели Stellar</a></li>
              <li><a href="#true-cost">Реальная стоимость и возврат комиссии</a></li>
              <li><a href="#rules">Выплаты и торговые правила</a></li>
              <li><a href="#pros">Плюсы и ограничения</a></li>
              <li><a href="#fit">Кому подходит или не подходит FundedNext</a></li>
              <li><a href="#prices">Все цены и ограничения</a></li>
              <li><a href="#final-check">Проверка перед регистрацией</a></li>
              <li><a href="#alternatives">С чем сравнить FundedNext</a></li>
              <li><a href="#sources">Источники и даты</a></li>
              <li><a href="#faq">Частые вопросы</a></li>
            </ol>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="verdict">Краткий вывод</h2>
          <p><strong>FundedNext нельзя оценивать по одной цифре «до 95%».</strong> Начальная доля в свежих записях различается по модели: Stellar 2-Step — {pct(twoStep?.profitSplitPct)}, Stellar Instant — {pct(instant?.profitSplitPct)}. Сначала сопоставьте правила просадки и условия выплат, затем выбирайте размер счёта. Отсутствующее значение не означает нулевую долю или разрешение торговать без ограничений.</p>
          <p>Для фиксированного запаса риска сравните оценочные программы со статической просадкой. Stellar Lite может отличаться ценой и целями, но не считается автоматически более лёгкой программой. Instant не имеет оценочных этапов; взамен нужно учитывать движущуюся границу убытка и условия получения вознаграждения. Подробные значения приведены рядом с датами проверки.</p>
          <p>Для русскоязычного трейдера за пределами России важны фактическая страна проживания, проверка документов и доступный способ оплаты. Для резидента России официальные страницы противоречат друг другу: наличие партнёрской ссылки в обзоре не подтверждает возможность покупки.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div id="access" className="ru-notice ru-anchor-target" data-fundednext-russia-access="conflicting">
            <strong><AlertTriangle size={16} aria-hidden="true" /> Для резидентов России данные противоречат друг другу.</strong>{' '}
            Статья FundedNext по ограничениям CFD от 8 апреля 2026 года не называет
            Россию, но корпоративная страница говорит, что FundedNext Ltd не обслуживает
            резидентов России. Futures-направление прямо запрещает покупку из России,
            а банковский перевод для выплат в Россию недоступен. Мы не считаем доступ
            подтверждённым, пока поддержка и страница оплаты не подтвердят конкретный продукт и профиль.
          </div>
          <p className="ru-source-line">Наблюдение официальных источников по стране: {marketEvidence.capturedAt}. Повторная проверка торгового правила не обновляет эту дату и не подтверждает индивидуальный доступ.</p>
          <div className="ru-actions" aria-label="Источники ограничений FundedNext">
            {accessEvidence?.sourceUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="btn-outline">
                Официальный источник {index + 1}
              </a>
            ))}
          </div>
        </div>
      </section>

      {firm?.trustpilotScore != null && firm.trustpilotCount != null ? (
        <section className="ru-section">
          <div
            className="ru-shell ru-content"
            data-russian-fundednext-reviews="aggregate-not-payout-proof"
          >
            <h2 id="reviews">Отзывы о FundedNext: что означают {firm.trustpilotScore.toFixed(1)}/5 и {firm.trustpilotCount.toLocaleString('ru-RU')} оценок</h2>
            {!hasFreshTrustpilot && <p className="ru-notice">Статус Trustpilot требует повторной проверки. Ниже сохранено наблюдение на указанную дату, а не текущая оценка профиля.</p>}
            <p>
              При проверке профиля Trustpilot от {firm.trustpilotCapturedAt ?? 'неуказанной даты'} средняя оценка FundedNext составляла
              {' '}{firm.trustpilotScore.toFixed(1)}/5 по {firm.trustpilotCount.toLocaleString('ru-RU')} отзывам. Это сторонний снимок показанного
              агрегата, а не проверка {freshProducts.length} текущих моделей, отдельной выплаты или соблюдения правила конкретным аккаунтом.
            </p>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>Что показывает число отзывов</h3>
                <p>{firm.trustpilotCount.toLocaleString('ru-RU')} записей показывают объём публичной обратной связи на дату проверки, но не долю трейдеров, которые купили челлендж, прошли оценку или получили выплату.</p>
              </article>
              <article className="ru-card">
                <h3>Какой продукт нужно назвать</h3>
                <p>Уточните, к какой из {freshProducts.length} моделей относится отзыв: Stellar 2-Step, 1-Step, Lite или Instant. У них 0–2 этапа оценки и разные правила просадки, возврата взноса и допуска к выплате.</p>
              </article>
              <article className="ru-card">
                <h3>Почему русский текст не решает вопрос страны</h3>
                <p>Русскоязычный отзыв не подтверждает место проживания автора, результат KYC или доступность покупки для другого человека. Для резидента России сохраняется конфликт официальных страниц, а для трейдеров в других странах важны их собственные данные.</p>
              </article>
            </div>
            <p className="ru-source-line">
              Профиль проверен {firm.trustpilotCapturedAt ?? 'без даты'} ·{' '}
              {firm.trustpilotUrl ? <a href={firm.trustpilotUrl} target="_blank" rel="noopener noreferrer">Открыть профиль Trustpilot</a> : 'ссылка на профиль не сохранена'}.
              {' '}Проверяйте каждый кейс по 7 полям до переноса на свой продукт.
            </p>
            <div className="ru-actions">
              <Link href="/ru/otzyvy-prop-firm#review-checklist" className="btn-outline">Чек-лист проверки отзывов</Link>
              <Link href="#products" className="btn-primary">Сопоставить модели</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2 id="method">Что именно проверяет этот обзор</h2>
            <p>Правила в таблицах взяты с официальных страниц FundedNext; рядом указаны даты проверки. Неопубликованные значения отмечены отдельно. Базовая цена не включает промокод, возможную плату за платформу и дополнительные опции.</p>
            <p>Для русскоязычного трейдера важны не только проценты. Нужно проверить страну проживания, документ для проверки личности, способ оплаты, платформу, валюту списания и условия вознаграждения. Русский язык интерфейса или наличие знакомого платёжного метода сами по себе не означают, что профиль будет принят.</p>
            <p>Самая ранняя проверка программ: <strong>{latestProductCapture ?? 'не указана'}</strong>. После истечения 30 дней соответствующие цены исключаются из обновляемых таблиц. Перед покупкой откройте официальную страницу оплаты и сохраните условия выбранной программы.</p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2 id="facts">FundedNext в цифрах</h2>
            <p>В этом блоке собраны опубликованные условия, а не редакционная оценка. Промокод, платформа и дополнительные опции могут изменить итоговую цену. Если страница оплаты и правила фирмы противоречат друг другу, запросите письменное разъяснение до покупки.</p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Основные условия FundedNext — таблицу можно прокрутить">
              <table className="ru-table" data-fundednext-russian-facts="true">
                <tbody>
                  <tr><th>Год основания</th><td>{firm?.founded ?? 'не указан'}</td></tr>
                  <tr><th>Проверенные программы</th><td>{freshProducts.length} модели Stellar / {pricedTiers.length} ценовых уровня</td></tr>
                  <tr><th>Диапазон листинговой цены</th><td>{priceRange(pricedTiers.map(item => item.price))} до дополнений и скидок</td></tr>
                  <tr><th>Начальная доля трейдера</th><td>{splitRange(freshProducts)}</td></tr>
                  <tr><th>Совокупный лимит</th><td>{firm?.maxAllocation ?? 'не указан'}</td></tr>
                  <tr><th>Платформы</th><td>{firm?.platforms.join(', ') ?? 'не опубликованы'}</td></tr>
                  <tr><th>Последняя проверка</th><td>{latestProductCapture ?? 'не указана'}</td></tr>
                </tbody>
              </table>
            </div>
            <p>Рекламная доля до 95% не является универсальным стартовым условием. В расчёт расходов подставляется начальная доля выбранной модели; увеличение счёта и платные дополнения проверяются отдельно.</p>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="products">Разбор моделей Stellar</h2>
          <p className="ru-muted">В актуальных карточках ниже показаны только программы со свежими данными. Если карточки нет, это означает необходимость повторной проверки, а не закрытие продукта фирмой.</p>
          <div className="ru-prose-stack">
            {twoStep && twoStep100k ? (
              <section>
                <h3>Stellar 2-Step — классическая проверка</h3>
                <p>На уровне $100K базовая цена: {money(twoStep100k.priceUsd)}. Цели по этапам: {targetLabel(twoStep)}. Лимиты: {lossLabel(twoStep)}. Тип просадки: {twoStep.drawdownType ? (drawdownLabels[twoStep.drawdownType] ?? twoStep.drawdownType) : 'не подтверждён'}.</p>
                <p>Минимум торговых дней на этап: {minimumTradingDaysLabel(twoStep.minTradingDays, 'ru')}. Срок запроса: {payoutLabel(twoStep)}. В датированных условиях возврат взноса связан с первым одобренным вознаграждением, а не только с завершением оценки.</p>
              </section>
            ) : null}
            {oneStep && oneStep100k ? (
              <section>
                <h3>Stellar 1-Step — один оценочный этап</h3>
                <p>На $100K цена: {money(oneStep100k.priceUsd)}. Цель: {targetLabel(oneStep)}. Лимиты: {lossLabel(oneStep)}. Один этап сокращает число проверок, но не отменяет ограничения риска.</p>
                <p>Минимум торговых дней: {minimumTradingDaysLabel(oneStep.minTradingDays, 'ru')}. Срок запроса: {payoutLabel(oneStep)}. Датированный источник для новых покупок связывает возврат взноса с третьим одобренным вознаграждением.</p>
              </section>
            ) : null}
            {lite && lite100k ? (
              <section>
                <h3>Stellar Lite — другая комбинация цены и целей</h3>
                <p>На $100K базовая цена: {money(lite100k.priceUsd)}. Цели: {targetLabel(lite)}; лимиты: {lossLabel(lite)}. Сравните эти условия с 2-Step при одинаковом размере счёта.</p>
                <p>Не оценивайте программу по цене отдельно от допустимого убытка. Для новых счетов датированные условия связывают возврат взноса с третьим одобренным вознаграждением.</p>
              </section>
            ) : null}
            {instant && instant10k ? (
              <section>
                <h3>Stellar Instant — без оценки</h3>
                <p>На $10K цена: {money(instant10k.priceUsd)}; оценочных этапов нет. Лимиты: {lossLabel(instant)}. Пустое поле само по себе не подтверждает отсутствие дневного лимита: для этого нужна отдельная актуальная справка Instant. Общая граница убытка остаётся обязательной.</p>
                <p>Начальная доля: {pct(instant.profitSplitPct)}. Датированная продуктовая справка различает запрос после роста 5% с проверкой в конце дня и 14-дневный цикл при росте от 1% до 5%. Отсутствие оценки не отменяет этих условий.</p>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="true-cost">Сколько нужно заработать до возврата комиссии</h2>
          <p>Компенсация взноса — математический порог, не прогноз дохода. Расчёт показывает валовую прибыль, доля от которой могла бы покрыть первоначальные расходы при выполнении условий выплаты. Повторные попытки, комиссии платёжного провайдера, налоги и проскальзывание в него не входят.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <h3>Stellar 2-Step $100K</h3>
              <p>Взнос: {money(twoStep100k?.priceUsd)}; начальная доля: {pct(twoStep?.profitSplitPct)}; расчётный порог: {money(twoStepCost?.breakEvenProfit)} валовой прибыли. Дата допуска к выплате остаётся отдельным ограничением. Если один из исходных параметров неизвестен, результат не считается нулевым.</p>
            </article>
            <article className="ru-card">
              <h3>Stellar Instant $10K</h3>
              <p>Взнос: {money(instant10k?.priceUsd)}; начальная доля: {pct(instant?.profitSplitPct)}; расчётный порог: {money(instantCost?.breakEvenProfit)}. Это не возврат взноса со стороны фирмы. Движущаяся граница убытка и порядок запроса вознаграждения проверяются отдельно.</p>
            </article>
          </div>
          <p className="ru-muted">Не сравнивайте эти суммы напрямую с рекламным «95%»: для новых счетов это не универсальная стартовая доля. Выберите модель, размер счёта и платформу, затем проверьте окончательную сумму на странице оплаты.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-content">
            <h2>Расчёт расходов по каждому размеру счёта</h2>
            <p>Минимальные расходы делятся на начальную долю трейдера; полученный порог сравнивается с допустимым убытком. Значение «дни» — условная модель роста на 1% в торговый день, а не обещание пройти проверку или получить выплату. Отсутствующие исходные данные не заменяются нулём.</p>
          </div>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Расчёт расходов FundedNext — таблицу можно прокрутить">
            <table className="ru-table" data-fundednext-russian-truecost="true">
              <thead><tr><th>Модель / счёт</th><th>Стоимость</th><th>Валовая прибыль для возврата</th><th>R-множитель к макс. убытку</th><th>Дни при 1%/день</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier }) => {
                  const economics = challengeTierEconomics(product, tier)
                  return (
                    <tr key={`true-cost-${product.productSlug}-${tier.sizeUsd}`}>
                      <td>{product.productName} ${tier.sizeUsd.toLocaleString('en-US')}</td>
                      <td>{money(minimumCostToFundedUsd(product, tier))}</td>
                      <td>{money(economics?.breakEvenProfit)} ({pct(product.profitSplitPct)})</td>
                      <td>{economics?.rMultiple == null ? '—' : economics.rMultiple.toFixed(2)}</td>
                      <td>{economics?.dayCount == null ? '—' : economics.dayCount}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={5}>Нет свежих цен для расчёта.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="rules">Выплаты, новости и ограничения стратегии</h2>
          <p>Срок запроса выплаты проверяется отдельно от цели и просадки. Таблица ниже использует датированные записи каждой программы. Для 1-Step исходный регламент уточняет рабочие дни; не считайте их календарными. У Instant дата запроса дополнительно зависит от роста счёта и проверки в конце дня. Ни один срок не гарантирует фактическое получение денег.</p>
          <div className="ru-prose-stack">
            <section>
              <h3>Новости: учитывайте программу и этап</h3>
              <p>Общая статья, проверенная {reviewEvidence.sources.newsGeneral.sourceCapturedAt}, относится к счетам после оценки Stellar 1-Step, 2-Step и Lite. В окне 5 минут до и 5 минут после затрагивающей инструмент важной новости засчитывается 40% прибыли, а убыток остаётся полностью. При частичном закрытии корректируется весь ордер; оценочные счета этим правилом не охвачены.</p>
              <p>У <Link href="/ru/fundednext-stellar-instant">Stellar Instant отдельное новостное правило</Link> и последствия для общей границы убытка. Его нельзя автоматически считать исключением или полностью приравнивать к общей статье.</p>
            </section>
            <section>
              <h3>Ночные и выходные позиции</h3>
              <p>В датированных записях CFD-программ разрешён перенос на ночь и выходные. Учитывайте свопы и закрытие рынка: разрешение удерживать позицию не отменяет лимиты убытка. До торговли повторно проверьте условия своей платформы и программы.</p>
            </section>
            <section>
              <h3>Советники и копирование — разные проверки</h3>
              <p>Для советников важны размер счёта, платформа и программа; cTrader и Match-Trader нельзя считать эквивалентом MT4/MT5. Платное дополнение не отменяет ограничения по размеру счёта или сценарию использования.</p>
              <div data-russian-fundednext-copy-scope="challenge-versus-instant">
                <p>Общая <a href={reviewEvidence.sources.copyGeneral.sourceUrl} target="_blank" rel="nofollow noopener">статья о копировании</a> от проверки {reviewEvidence.sources.copyGeneral.sourceCapturedAt} допускает собственные оценочные счета в пределах её условий, но запрещает копирование с участием счёта после оценки.</p>
                <p>Отдельная <a href={reviewEvidence.sources.copyInstant.sourceUrl} target="_blank" rel="nofollow noopener">статья Stellar Instant</a> от проверки {reviewEvidence.sources.copyInstant.sourceCapturedAt} разрешает копирование между счетами Instant одного владельца. Между Instant и 1-Step, 2-Step или Lite, а также между разными владельцами оно запрещено. Не переносите разрешение одной программы на другую.</p>
              </div>
              <RussianFundedNextEaNotice instant />
            </section>
            <section>
              <h3>Куда может прийти вознаграждение</h3>
              <p>В профиле FundedNext заявлены методы: {firm?.payoutMethods?.map(method => payoutMethodLabels[method.toLowerCase()] ?? method).join(', ') ?? 'методы не опубликованы'}. Доступный метод и комиссия зависят от страны, валюты и проверки KYC; не считайте наличие метода на сайте гарантией для российского или зарубежного профиля.</p>
            </section>
          </div>
          <div className="ru-notice">
            <strong>Проверка перед выплатой.</strong> Для резидента России остаётся конфликт официальных страниц. Для русскоязычного трейдера в Казахстане, ОАЭ, Европе, Израиле или Северной Америке важны фактическая страна проживания, адрес и платёжный профиль — гражданство и язык общения их не заменяют.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="pros">Что сравнить в первую очередь</h2>
          <ul>
            <li>Статическую или движущуюся границу убытка и число оценочных этапов.</li>
            <li>Дневной и общий лимиты конкретной модели: эти ограничения работают одновременно.</li>
            <li>Условия ночного переноса, выходных и новостных сделок на выбранном этапе.</li>
            <li>Цену рядом с начальной долей трейдера и условиями запроса выплаты, а не отдельно от правил.</li>
          </ul>

          <h2 className="ru-review-secondary-heading">Ограничения и причины отказаться</h2>
          <ul>
            <li>Начальная доля по свежим записям: {splitRange(freshProducts)}. Более высокий рекламный процент требует отдельных условий.</li>
            <li>Новостная прибыль после оценки может засчитываться не полностью; убыток при этом остаётся.</li>
            <li>Instant не отменяет общую границу убытка и не предусматривает возврат взноса за прохождение.</li>
            <li>Доступ для России не подтверждён из-за противоречия официальных страниц; партнёрская ссылка не является обходом KYC.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="fit">Кому какая модель подходит</h2>
          <div className="ru-prose-stack">
            <section><h3>Нужна фиксированная граница просадки</h3><p>Сопоставьте оценочные модели со статическим лимитом. Два этапа и ожидание первого запроса выплаты требуют времени; проверьте и дневной лимит, не только общую границу.</p></section>
            <section><h3>Нужна одна фаза</h3><p>У Stellar 1-Step меньше оценочных этапов, но дневной и общий лимиты не исчезают. Сравните их с собственной серией убытков до покупки.</p></section>
            <section><h3>Нужен старт без оценки</h3><p>Для Instant важны движущаяся граница просадки и условия выплаты. Отсутствие оценочной цели не означает отсутствия минимального роста для запроса вознаграждения.</p></section>
          </div>
          <h2 className="ru-review-secondary-heading">Кому FundedNext не подходит</h2>
          <p>Если стратегия зависит от исполнения во время новостей, сначала проверьте правило для своей программы и этапа. Неполный зачёт прибыльных сделок при сохранении убытков может изменить её результат.</p>
          <p>Алгоритмическому трейдеру на cTrader или Match-Trader нельзя переносить правила MT4/MT5 на выбранную платформу. Резиденту России не следует оплачивать челлендж до письменного подтверждения конкретного профиля: датированные официальные источники дают противоречивые сигналы.</p>
          <p>Перед регистрацией сохраните страницу выбранного продукта, проверьте юридическое лицо, итоговую валюту, KYC и доступный платёжный метод. Затем можно открыть <Link href="/go/fundednext?from=ru-fundednext-review-guide" rel="sponsored nofollow noopener">актуальные планы FundedNext</Link> через контролируемый переход; партнёрская ссылка не меняет цифры или вывод обзора.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2 id="prices">Сводная таблица моделей</h2>
          <p className="ru-muted">{hasFreshProducts ? 'Цены и правила ниже взяты из проверенных источников; временные скидки и возможная отдельная плата за платформу не включены.' : `Числовые условия временно не показываем: последняя проверка источников (${latestProductCapture ?? 'дата не указана'}) была более 30 дней назад. Сверьте текущие правила FundedNext перед оплатой.`}</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Сравнение программ FundedNext — таблицу можно прокрутить">
            <table className="ru-table" data-fundednext-russian-products={freshProducts.length}>
              <thead>
                <tr><th>Модель</th><th>Этапы</th><th>Цена</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Просадка</th><th>Стартовый сплит</th><th>Первая выплата</th></tr>
              </thead>
              <tbody>
                {hasFreshProducts ? freshProducts.map(product => {
                  const prices = product.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [tier.priceUsd])
                  return (
                    <tr key={product.productSlug} data-russian-fundednext-product={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{product.phases === 0 ? 'без оценки' : product.phases}</td>
                      <td>{priceRange(prices)}</td>
                      <td>{dailyLossLabel(product)}</td>
                      <td>{pct(product.maxLossPct)}</td>
                      <td>{product.drawdownType
                        ? (drawdownLabels[product.drawdownType] ?? product.drawdownType)
                        : 'не подтверждена'}</td>
                      <td>{pct(product.profitSplitPct)}</td>
                      <td data-russian-payout-product={`${product.firmSlug}:${product.productSlug}`}>{payoutLabel(product)}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={8}>Для этих программ нужна повторная проверка источников; цены и правила временно не показаны.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <h2>{hasFreshProducts ? `Все ${pricedTiers.length} ценовых уровня и их ограничения` : 'Цены временно не показываются'}</h2>
          <p className="ru-muted">Одна и та же цена имеет разный смысл при статической и трейлинг-просадке. Поэтому ниже рядом с каждым уровнем показаны этапы, цели, лимиты и стартовая доля, а не только размер счёта.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Цены и ограничения FundedNext — таблицу можно прокрутить">
            <table className="ru-table">
              <thead><tr><th>Модель</th><th>Счёт</th><th>Этапы / цели</th><th>Цена</th><th>Лимиты</th><th>Просадка</th><th>Сплит</th><th>Возврат</th><th>Проверено</th></tr></thead>
              <tbody>
                {pricedTiers.length > 0 ? pricedTiers.map(({ product, tier, price }) => (
                  <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                    <td>{product.productName}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{product.phases === 0 ? 'без оценки' : `${product.phases}; ${targetLabel(product)}`}</td>
                    <td>${price.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 })}</td>
                    <td>{lossLabel(product)}</td>
                    <td>{product.drawdownType ? (drawdownLabels[product.drawdownType] ?? product.drawdownType) : 'не подтверждена'}</td>
                    <td>{pct(product.profitSplitPct)}</td>
                    <td>{tier.refundable === true ? 'по условиям возврата' : tier.refundable === false ? 'невозвратный' : 'возврат не подтверждён'}</td>
                    <td>{product.sourceCapturedAt}; {payoutLabel(product)}</td>
                  </tr>
                )) : <tr><td colSpan={9}>Нет свежих цен для безопасного отображения; откройте официальную страницу оплаты.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Страниц продукта в датированном разборе: {sourceUrls.length}. Подробные источники и
            примечания доступны в <Link href="/blog/fundednext-review" hrefLang="en">английском обзоре FundedNext</Link>.
          </p>
          <p className="ru-source-line">
            Официальные страницы, использованные для цен и правил:{' '}
            {sourceUrls.map((url, index) => (
              <span key={url}>{index > 0 ? '; ' : ''}<a href={url} target="_blank" rel="noopener noreferrer">источник {index + 1}</a></span>
            ))}
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="final-check">Проверка перед регистрацией: сначала правило, потом цена</h2>
          <div className="ru-grid">
            {hasFreshProducts ? freshProducts.map(product => {
              const stage = product.phases === 0 ? 'без оценочного этапа' : `${product.phases} этапа оценки`
              const drawdown = product.drawdownType ? (drawdownLabels[product.drawdownType] ?? product.drawdownType) : 'тип просадки не опубликован'
              const payout = `запрос вознаграждения: ${payoutLabel(product)}`
              return (
                <article className="ru-card" key={product.productSlug}>
                  <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                  <h3>{product.productName}</h3>
                  <p className="ru-muted">{stage}; {drawdown}; {payout}. Перед оплатой подтвердите страну, KYC и актуальный регламент.</p>
                </article>
              )
            }) : (
              <div className="ru-notice"><strong>Вывод по модели требует проверки.</strong> Источники проверяли более 30 дней назад, поэтому здесь временно нет числового сравнения. Сверьте действующие правила и итоговую сумму на официальной странице оплаты.</div>
            )}
          </div>

          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="fundednext">
            <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если
            подходящий читатель зарегистрируется по ссылке ниже. Цена для читателя от
            этого не увеличивается, а редакционные числа и вердикт не меняются.
            Резидентам России нельзя использовать ссылку до разрешения противоречия
            между официальными страницами и подтверждения конкретного профиля.
          </div>
          {firm?.affiliateUrl ? (
            <div className="ru-actions">
              <Link
                href="/go/fundednext?from=ru-fundednext-review-verdict"
                rel="sponsored nofollow noopener"
                className="btn-primary btn-glow"
              >
                Проверить страну и условия на FundedNext <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href={getRussianReviewFinderHref('fundednext')} className="btn-outline" data-russian-review-finder="fundednext">
                Сравнить двухэтапные программы
              </Link>
            </div>
          ) : (
            <p>Партнёрская ссылка сейчас не настроена; используйте рейтинг для сравнения.</p>
          )}
          <p className="ru-source-line"><BadgeDollarSign size={14} aria-hidden="true" /> Если вы купите программу по нашей партнёрской ссылке, Traders Fund Hub может получить комиссию.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="alternatives">С чем сравнить FundedNext</h2>
          <p>Выбирайте сравнение по условию, которое вам не подходит. Например, 6% подвижной просадки Instant стоит сопоставлять с риском другой программы без оценки. Если вопрос в доступе по стране, начните с документов и оплаты, а не с редакционного балла.</p>
          <ul className="ru-review-related-links">
            <li><Link href="/ru/fundednext-stellar-instant">FundedNext Stellar Instant</Link> — пример движущейся границы убытка, условия выплат, новости и расхождение в цене перезапуска.</li>
            <li><Link href="/ru/fundednext-mt5">FundedNext MT5 и советники</Link> — установка, вход, серверы оплаченных и пробных счетов, ограничения автоматической торговли.</li>
            <li><Link href="/ru/fundednext-vs-bright-funded">FundedNext или Bright Funded</Link> — цены в USD и EUR, просадка, компенсация взноса, выплаты и проверка личности.</li>
            <li><Link href="/ru/fundednext-vs-fundingpips">FundedNext или FundingPips</Link> — различия программ по цене, просадке и условиям запроса выплаты.</li>
            <li><Link href="/ru/obzor-fundingpips">Обзор FundingPips</Link> — отдельный разбор правил другого глобального партнёра.</li>
            <li><Link href="/ru/obzor-bright-funded">Обзор Bright Funded</Link> — программы с оплатой в EUR, если важна валюта покупки.</li>
            <li><Link href="/ru/luchshie-prop-firmy">Рейтинг проп-фирм</Link> — полный список, если условия Stellar не совпадают с вашим риск-планом.</li>
          </ul>

          <div className="ru-review-author" aria-label="Автор обзора FundedNext">
            <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
            <div>
              <strong>Автор: Edris Derakhshi</strong>
              <p>Обзор разбирает модели Stellar по официальным источникам: цены, просадку и выплаты. Даты проверки указаны рядом с данными, а партнёрская связь раскрыта отдельно.</p>
              <Link href="/authors/edris-derakhshi">Профиль автора</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-fundednext-evidence-status={hasFreshEvidence ? 'dated' : 'recapture-required'}>
          <h2 id="sources">Источники и границы проверки</h2>
          <p>Проверка отдельного торгового правила не обновляет цену, список стран или статус Trustpilot. Ниже указаны независимые даты. Источники по ценам сохранены выше и после истечения срока проверки; доступ конкретного трейдера или фактическая выплата здесь не подтверждаются.</p>
          <ul>{ruleSources.map(source => <li key={source.sourceUrl}><a href={source.sourceUrl} target="_blank" rel="nofollow noopener">{source.labelRu}</a> — {source.sourceCapturedAt || 'дата не подтверждена'}.</li>)}</ul>
          <p>Программы: {[...new Set(products.map(product => product.sourceCapturedAt || 'дата не подтверждена'))].sort().join(', ') || 'записи отсутствуют'}. Проверка источников по стране: {marketEvidence.capturedAt}.</p>
          <p>Остальные условия Instant: {instantEvidence.capturedAt}; отдельная проверка новостей: {instantEvidence.news.sourceCapturedAt}. Подробные источники доступны в <Link href="/ru/fundednext-stellar-instant">разборе Instant</Link>. Условия советников и даты их проверки приведены в блоке правил выше.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2 id="faq">Частые вопросы</h2>
          {!hasFreshEvidence && <p className="ru-notice">Часть источников требует повторной проверки. Ответы сохраняют датированный разбор и не подтверждают действующее предложение.</p>}
          <RussianFaq items={pageFaqs} />
        </div>
      </section>
      </article>
    </>
  )
}
