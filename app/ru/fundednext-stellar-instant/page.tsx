import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  Gauge,
  Globe2,
  Laptop,
  Newspaper,
  RefreshCcw,
  Scale,
  ShieldCheck,
  WalletCards,
  Zap,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import instantEvidence from '@/content/data/russian-fundednext-instant-evidence.json'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { getDealsByFirm } from '@/lib/deals'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/fundednext-stellar-instant'
const TITLE = 'FundedNext Stellar Instant: правила и выплаты (2026)'
const DESCRIPTION = 'FundedNext Instant Funding на русском: 4 цены, 6% trailing loss, нет daily loss и consistency, payout при 5% или через 14 дней, reset, KYC и страна.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'FundedNext Instant Funding',
    'FundedNext Stellar Instant',
    'FundedNext Instant правила',
    'FundedNext Instant payout',
    'Stellar Instant выплаты',
    'FundedNext без челленджа',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export const revalidate = 86400

function money(value: number) {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

const sourceLinks = [
  ['Цена и swap-free', instantEvidence.pricing.sourceUrl],
  ['6% trailing MLL', instantEvidence.lossLimits.sourceUrl],
  ['Нет consistency rule', instantEvidence.consistency.sourceUrl],
  ['Платформы', instantEvidence.platforms.sourceUrl],
  ['Плечо по активам', instantEvidence.leverage.sourceUrl],
  ['Overnight и weekend', instantEvidence.holding.sourceUrl],
  ['News Profit Rule', instantEvidence.news.sourceUrl],
  ['Copy trading', instantEvidence.copyTrading.sourceUrl],
  ['Общие правила', instantEvidence.generalRules.sourceUrl],
  ['Максимальная покупка и scaling', instantEvidence.purchaseAllocation.sourceUrl],
  ['Reward Share и tier', instantEvidence.rewardShare.sourceUrl],
  ['Условия reward', instantEvidence.rewardEligibility.sourceUrl],
  ['Процесс вывода', instantEvidence.withdrawal.sourceUrl],
  ['MLL после вывода', instantEvidence.postWithdrawalLossFloor.sourceUrl],
  ['Reset', instantEvidence.reset.sourceUrl],
  ['Невозвратная fee', instantEvidence.refund.sourceUrl],
] as const

export default function RussianFundedNextInstantPage() {
  const products = getAllChallenges().filter(product => product.firmSlug === 'fundednext')
  const instant = products.find(product => product.productSlug === instantEvidence.productSlug)
  const hasFreshProduct = Boolean(instant && isChallengeFresh(instant))
  const pricedTiers = hasFreshProduct
    ? instant!.accountSizes.filter(tier => tier.priceUsd != null && tier.priceUsd > 0)
    : []
  const minimumPrice = pricedTiers.length ? Math.min(...pricedTiers.map(tier => tier.priceUsd!)) : null
  const maximumPrice = pricedTiers.length ? Math.max(...pricedTiers.map(tier => tier.priceUsd!)) : null
  const firms = getAllFirms()
  const fundedNext = firms.find(firm => outboundSlug(firm.name) === 'fundednext')
  const brightFunded = firms.find(firm => outboundSlug(firm.name) === 'bright-funded')
  const currentDeal = getDealsByFirm('fundednext').find(deal => deal.mechanism === 'earned-coupon')
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')

  const faqs: RussianFaqItem[] = [
    {
      q: 'FundedNext Stellar Instant — это счёт без челленджа?',
      a: 'Да. В продуктовых данных phases равно 0: отдельной evaluation-фазы нет. Но это симулированная торговая среда с KYC, 6% trailing maximum loss, payout gates и правилами платформы; слово Instant не отменяет проверки.',
    },
    {
      q: 'Сколько стоит FundedNext Stellar Instant?',
      a: hasFreshProduct
        ? `На снимке ${instant!.sourceCapturedAt} доступны ${pricedTiers.length} размера: ${pricedTiers.map(tier => `${money(tier.sizeUsd)} за ${money(tier.priceUsd!)}`).join(', ')}. Swap-free стоит на 10% больше, а fee не возвращается.`
        : 'Текущие цены временно не показываются, потому что 30-дневная проверка продуктового файла истекла. Откройте официальный checkout и сохраните итоговую сумму до оплаты.',
    },
    {
      q: 'Есть ли daily loss и consistency rule?',
      a: 'Официальные статьи говорят, что daily loss limit и consistency rule отсутствуют. Вместо них действует 6% trailing maximum loss: floor движется вверх за новым максимумом прибыли, не опускается после убытка и останавливается на стартовом балансе.',
    },
    {
      q: 'Когда доступна выплата Stellar Instant?',
      a: 'Есть 2 маршрута: on-demand после 5% роста, подтверждённого на EOD, или через 14 дней при росте не менее 1%, но ниже 5%. Новая сделка отключает Transfer to Wallet до следующей EOD-проверки.',
    },
    {
      q: 'Можно ли вывести всю прибыль?',
      a: 'Официальное правило предупреждает, что maximum-loss floor после вывода не опускается. Если floor уже достиг стартового баланса, полный вывод может оставить equity на линии MLL и привести к breach; размер буфера нужно проверить до Transfer to Wallet.',
    },
    {
      q: 'Разрешена ли торговля на новостях?',
      a: 'Да, но действует News Profit Rule: внутри окна 5 минут до и 5 минут после указанной high-impact новости учитывается только 40% прибыли. Правило охватывает market execution, pending orders и partial closure; убыток остаётся полностью.',
    },
    {
      q: 'Разрешены ли EA и copy trading?',
      a: 'EA должен быть настроен под собственную стратегию и не использовать exploit-механику. Copy trading разрешён только между Stellar Instant-счетами одного владельца; копирование между Instant и 1-Step, 2-Step или Lite запрещено даже одному владельцу.',
    },
    {
      q: 'Подходит ли Stellar Instant русскоязычному трейдеру?',
      a: 'Язык не определяет доступ. Проверяются гражданство, резидентство, адрес, IP, KYC, оплата и payout provider. Для США доступен только Match-Trader; для резидентов России официальные страницы FundedNext дают конфликтующие сигналы, поэтому до оплаты нужен письменный ответ поддержки.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'FundedNext Stellar Instant' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-08-29',
    dateModified: instantEvidence.capturedAt,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-fundednext-instant="product-lifecycle"
          data-russian-product-intent="fundednext-stellar-instant-rules"
          data-russian-country-boundary="instant-profile-not-language"
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/obzor-fundednext">FundedNext</Link> / Stellar Instant</div>
          <div className="ru-eyebrow"><Zap size={14} aria-hidden="true" /> 16 первичных правил проверены {instantEvidence.capturedAt}</div>
          <h1>FundedNext Stellar Instant: правила, trailing loss и выплаты</h1>
          <p className="ru-lead">
            Stellar Instant убирает evaluation, но не риск-гейты: {hasFreshProduct ? `${pricedTiers.length} размера` : 'цены требуют обновления'}, {instantEvidence.lossLimits.maximumLossPct}% trailing MLL,
            {instantEvidence.rewardShare.tier1Pct}% стартовый Reward Share и 2 разных маршрута выплаты. Ниже весь путь — от checkout до вывода без потери счёта.
          </p>
          <div className="ru-stats" aria-label="Проверенные параметры Stellar Instant">
            <div className="ru-stat"><strong>{hasFreshProduct ? pricedTiers.length : '—'}</strong><span>свежих цен</span></div>
            <div className="ru-stat"><strong>{instantEvidence.lossLimits.maximumLossPct}%</strong><span>trailing maximum loss</span></div>
            <div className="ru-stat"><strong>0</strong><span>daily loss и consistency</span></div>
            <div className="ru-stat"><strong>{sourceLinks.length}</strong><span>официальных rule pages</span></div>
          </div>
          <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-instant-hero">
            {fundedNext?.affiliateUrl ? (
              <Link href="/go/fundednext?from=ru-fundednext-instant-hero" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                Проверить Stellar Instant <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : null}
            <Link href="#risk" className="btn-outline">Сначала проверить 6% MLL</Link>
            <Link href="/ru/prop-firmy-bez-chelendzha" className="btn-outline">Сравнить instant-продукты</Link>
          </div>
          <div className="ru-notice">
            <strong><Globe2 size={16} aria-hidden="true" /> Русская статья не подтверждает доступ по стране.</strong>{' '}
            Для профиля США опубликован только Match-Trader. Для резидентов России первичные страницы конфликтуют; для русскоязычных в других странах проверяются фактические citizenship, residence, KYC, payment и payout route.
          </div>
        </div>
      </section>

      <article data-russian-fundednext-instant-article="unique-source-backed-guide">
        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрское раскрытие.</strong>{' '}
              Переходы через /go/fundednext могут принести Traders Fund Hub комиссию. Все 16 rule pages открываются отдельно на домене FundedNext и не являются партнёрскими ссылками.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание руководства Stellar Instant">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#answer">Короткий ответ</a></li>
                <li><a href="#price">Цены и checkout</a></li>
                <li><a href="#risk">6% trailing MLL</a></li>
                <li><a href="#payout">5% EOD или 14 дней</a></li>
                <li><a href="#news">News Profit Rule</a></li>
                <li><a href="#platform">Платформа, EA и copy</a></li>
                <li><a href="#holding">Плечо и перенос позиций</a></li>
                <li><a href="#scale">Allocation и scale-up</a></li>
                <li><a href="#reset">Reset и невозвратная fee</a></li>
                <li><a href="#country">Страна и KYC</a></li>
                <li><a href="#verdict">Вердикт</a></li>
                <li><a href="#sources">Первичные источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="answer" data-russian-fundednext-instant-answer="phase-zero-with-gates">
            <h2>Короткий ответ: 0 этапов не означает 0 ограничений</h2>
            <p>
              В структурированном продукте phases равно {hasFreshProduct ? instant!.phases : 0}, minimum trading days равно 0, daily loss отсутствует и consistency rule отсутствует.
              Решение всё равно определяется {instantEvidence.lossLimits.maximumLossPct}% trailing floor, {instantEvidence.news.countedProfitPct}% зачётом news-profit, EOD-проверкой и KYC до вывода.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-facts="eight-gates">
                <thead><tr><th>Поле</th><th>Проверенное правило</th><th>Практический риск</th></tr></thead>
                <tbody>
                  <tr><td><strong>Evaluation</strong></td><td>0 фаз</td><td>Fee невозвратная</td></tr>
                  <tr><td><strong>Daily loss</strong></td><td>Нет</td><td>6% trailing MLL остаётся hard floor</td></tr>
                  <tr><td><strong>Consistency</strong></td><td>Нет</td><td>News и prohibited-strategy rules сохраняются</td></tr>
                  <tr><td><strong>Стартовый split</strong></td><td>{instantEvidence.rewardShare.tier1Pct}%</td><td>{instantEvidence.rewardShare.tier3AndLaterPct}% только с Tier 3</td></tr>
                  <tr><td><strong>On-demand</strong></td><td>{instantEvidence.rewardEligibility.onDemandGrowthPct}% growth + EOD</td><td>Новая сделка отключает transfer до следующего EOD</td></tr>
                  <tr><td><strong>Bi-weekly</strong></td><td>от {instantEvidence.rewardEligibility.biWeeklyMinimumGrowthPct}% через {instantEvidence.rewardEligibility.biWeeklyDays} дней</td><td>Это отдельный путь при росте ниже 5%</td></tr>
                  <tr><td><strong>Purchase allocation</strong></td><td>{money(instantEvidence.purchaseAllocation.maximumUsd)}</td><td>Счета нельзя объединять</td></tr>
                  <tr><td><strong>Россия / США</strong></td><td>конфликт / Match-Trader</td><td>Проверка профиля до оплаты</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="price" data-russian-fundednext-instant-pricing={hasFreshProduct ? pricedTiers.length : 'stale'}>
            <div className="ru-content">
              <h2>{hasFreshProduct ? `${pricedTiers.length} стандартные цены` : 'Стандартные цены требуют обновления'}: swap-free и reset считаются отдельно</h2>
              <p>
                {hasFreshProduct ? 'Свежий продуктовый файл показывает стандартные цены без promotion и optional add-ons.' : 'Числовая таблица скрыта, потому что 30-дневный gate продуктового файла не пройден.'}
                {' '}Официальная pricing page добавляет {instantEvidence.pricing.swapFreeSurchargePct}% к swap-free и говорит, что ежемесячной fee нет.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-price-table="source-gated">
                <thead><tr><th>Размер</th><th>Стандартная цена</th><th>Refundable</th><th>Что проверить</th></tr></thead>
                <tbody>
                  {pricedTiers.length ? pricedTiers.map(tier => (
                    <tr key={tier.sizeUsd} data-russian-fundednext-instant-tier={tier.sizeUsd}>
                      <td><strong>{money(tier.sizeUsd)}</strong></td>
                      <td>{money(tier.priceUsd!)}</td>
                      <td>{tier.refundable ? 'Да' : 'Нет'}</td>
                      <td>standard / swap-free / reset / platform</td>
                    </tr>
                  )) : <tr><td colSpan={4}>Цены скрыты: продуктовый захват старше 30 дней или отсутствует.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="ru-notice">
              <strong>Диапазон стандартной fee:</strong>{' '}
              {minimumPrice != null && maximumPrice != null ? `${money(minimumPrice)}–${money(maximumPrice)}` : 'проверяется в checkout'}.
              Купон, swap-free, reset и платёжная конвертация могут изменить final total.
            </div>
            <div className="ru-actions">
              {currentDeal ? (
                <Link href="/go/fundednext?from=ru-fundednext-instant-free-trial" rel="sponsored nofollow noopener" className="btn-primary">
                  Получить {currentDeal.pct}% после Free Trial <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : null}
              <Link href="/ru/promokody-prop-firm#fundednext-promokod" className="btn-outline">Условия текущего offer</Link>
              <a href={instantEvidence.pricing.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальная pricing page</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="risk" data-russian-fundednext-instant-risk="six-percent-trailing-floor">
            <div className="ru-content">
              <h2>Как работает 6% trailing MLL: официальный пример на $10,000</h2>
              <p>
                Стартовый floor равен {money(instantEvidence.lossLimits.workedExample[0].maximumLossFloorUsd)}. Он растёт только за новым profit high, не снижается после убытка и останавливается на стартовых {money(10000)}.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-mll-example="official-10k-sequence">
                <thead><tr><th>Шаг</th><th>Balance</th><th>Событие из источника</th><th>MLL floor</th><th>Запас по balance</th></tr></thead>
                <tbody>
                  {instantEvidence.lossLimits.workedExample.map((row, index) => (
                    <tr key={`${row.event}-${row.balanceUsd}`}>
                      <td>{index + 1}</td>
                      <td>{money(row.balanceUsd)}</td>
                      <td>{row.event}</td>
                      <td>{money(row.maximumLossFloorUsd)}</td>
                      <td>{money(row.balanceUsd - row.maximumLossFloorUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Нет daily loss</h3><p>Отсутствие дневного лимита не расширяет lifetime floor: equity ниже текущего MLL означает breach.</p></article>
              <article className="ru-card"><ChartNoAxesCombined size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Floor не откатывается</h3><p>После нового high последующий loss уменьшает balance, но уже поднятый MLL остаётся на месте.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Cap равен start</h3><p>После подъёма floor до initial balance весь дальнейший рабочий buffer создаётся только прибылью над стартом.</p></article>
            </div>
            <p className="ru-source-line"><a href={instantEvidence.lossLimits.sourceUrl} target="_blank" rel="nofollow noopener">Официальный MLL calculation</a> · проверено {instantEvidence.capturedAt}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="payout" data-russian-fundednext-instant-payout="two-paths-plus-buffer">
            <div className="ru-content">
              <h2>Выплата: 5% на EOD или минимум 1% через 14 дней</h2>
              <p>
                On-demand появляется не в момент сделки, а после EOD-проверки {instantEvidence.rewardEligibility.onDemandGrowthPct}% growth. При росте от {instantEvidence.rewardEligibility.biWeeklyMinimumGrowthPct}% до менее 5% используется отдельный {instantEvidence.rewardEligibility.biWeeklyDays}-дневный цикл.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Zap size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Маршрут 1: on-demand</h3><p>Достигните 5% и дождитесь EOD. Новая сделка до transfer сразу отключает кнопку до следующей проверки.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Маршрут 2: 14 дней</h3><p>Рост минимум 1%, но ниже 5%, допускает bi-weekly request через 14 дней от начала цикла.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Wallet и payout</h3><p>KYC обязателен; затем reward идёт в Wallet, а OTP подтверждает один из {instantEvidence.withdrawal.methods.length} опубликованных методов.</p></article>
            </div>
            <div className="ru-notice">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Withdrawal может сузить buffer до нуля.</strong>{' '}
              MLL после вывода не опускается. Официальный пример предупреждает: если floor уже capped на initial balance, вывод всей прибыли может оставить balance на MLL и дать breach.
            </div>
            <p>
              FundedNext публикует обработку корректной заявки до {instantEvidence.withdrawal.processingHours} часов; gateway fee платит трейдер.
              Методы включают {instantEvidence.withdrawal.methods.join(', ')}, но страна и provider availability проверяются в собственном Dashboard.
            </p>
            <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-instant-payout">
              <Link href="/go/fundednext?from=ru-fundednext-instant-payout" rel="sponsored nofollow noopener" className="btn-primary">Проверить Stellar Instant <ArrowRight size={14} aria-hidden="true" /></Link>
              <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить payout methods</Link>
              <a href={instantEvidence.postWithdrawalLossFloor.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">MLL после вывода</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="news" data-russian-fundednext-instant-news="forty-percent-profit-rule">
            <div className="ru-content">
              <h2>Новости разрешены, но внутри 10 минут засчитывается только 40% прибыли</h2>
              <p>
                News Profit Rule охватывает {instantEvidence.news.windowMinutesBefore} минут до и {instantEvidence.news.windowMinutesAfter} минут после listed high-impact event.
                Market execution, pending order и partial closure попадают в правило; loss не уменьшается до 40%.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Newspaper size={22} color="var(--accent-light)" aria-hidden="true" /><h3>10-minute window</h3><p>Открытие или закрытие внутри ±5 минут приводит к зачёту 40% соответствующей прибыли после завершения цикла.</p></article>
              <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Loss остаётся 100%</h3><p>News loss полностью влияет на account; правило уменьшает только qualifying profit и может изменить payout eligibility.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1% MLL buffer</h3><p>Отдельная Instant-статья описывает 1% equity adjustment для news-time MLL, но это не отменяет 6% trailing rule.</p></article>
            </div>
            <p className="ru-source-line"><a href={instantEvidence.news.sourceUrl} target="_blank" rel="nofollow noopener">Официальное правило Stellar Instant news</a> · дата статьи и расчёт проверены {instantEvidence.capturedAt}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="platform" data-russian-fundednext-instant-platform="profile-plus-automation">
            <div className="ru-content">
              <h2>Платформа, EA и copy trading зависят от профиля и типа счёта</h2>
              <p>
                Общий Stellar Instant setup предлагает {instantEvidence.platforms.general.join(' и ')}, а U.S.-profile получает только {instantEvidence.platforms.unitedStates[0]}.
                EA должен быть customized; copy route ограничен Instant-счетами одного владельца.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Сценарий</th><th>Разрешено</th><th>Запрещено / ограничено</th></tr></thead>
                <tbody>
                  <tr><td><strong>Платформа вне США</strong></td><td>MT4 или MT5</td><td>Проверить фактический checkout</td></tr>
                  <tr><td><strong>Профиль США</strong></td><td>Match-Trader</td><td>MT4 и MT5 недоступны</td></tr>
                  <tr><td><strong>EA / indicator</strong></td><td>Собственная customized strategy</td><td>Exploit mechanics и prohibited strategy</td></tr>
                  <tr><td><strong>Copy trading</strong></td><td>Instant ↔ Instant одного владельца</td><td>Другой владелец или Instant ↔ 1-Step/2-Step/Lite</td></tr>
                  <tr><td><strong>IP / VPS</strong></td><td>VPN/VPS допускаются</td><td>Рекомендуются consistent device и dedicated IP</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ru-actions">
              <Link href="/ru/fundednext-mt5" className="btn-outline">Отдельный MT5 и EA-гайд</Link>
              <a href={instantEvidence.copyTrading.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальное copy rule</a>
              <a href={instantEvidence.generalRules.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Все Instant rules</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="holding" data-russian-fundednext-instant-holding="leverage-and-swaps">
            <div className="ru-content">
              <h2>Плечо и перенос: 1:30 на forex, swaps входят в P/L</h2>
              <p>
                Плечо зависит от asset class: forex {instantEvidence.leverage.forex}, commodities {instantEvidence.leverage.commodities}, indices {instantEvidence.leverage.indices}, crypto {instantEvidence.leverage.crypto}.
                Overnight и weekend разрешены, но triple swap публикуется на Wednesday для forex/commodities и Friday для indices/crypto.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><CircleDollarSign size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Swap входит в loss</h3><p>Разрешение держать позицию не исключает swap из balance/equity и 6% MLL calculation.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Два triple-swap дня</h3><p>Forex/commodities — Wednesday; indices/crypto — Friday по официальной holding page.</p></article>
              <article className="ru-card"><Laptop size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Проверка symbol specification</h3><p>Точный swap выбранного инструмента смотрят в Specification до удержания через rollover.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="scale" data-russian-fundednext-instant-scale="purchase-versus-growth">
            <div className="ru-content">
              <h2>Purchase allocation $20,000 не равно опубликованному scale-up</h2>
              <p>
                Одновременно можно купить не более {money(instantEvidence.purchaseAllocation.maximumUsd)} active allocation, а merging запрещён.
                Отдельно официальный источник заявляет scaling до {instantEvidence.purchaseAllocation.scaleMultiple}x initial balance и published maximum {money(instantEvidence.purchaseAllocation.publishedScaledMaximumUsd)} через performance milestones.
              </p>
              <p>
                Reward Share равен {instantEvidence.rewardShare.tier1Pct}% в Tier 1–2 и {instantEvidence.rewardShare.tier3AndLaterPct}% с Tier 3, где он capped.
                Поэтому «до $2M» и «80%» нельзя переносить на новый {money(2000)}–{money(20000)} purchase в первый день.
              </p>
            </div>
            <div className="ru-notice"><strong>Проверка обещания:</strong> purchase cap, tier balance и maximum scaled balance — 3 разных числа. Страница не объединяет их в один стартовый allocation.</div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="reset" data-russian-fundednext-instant-reset="official-price-conflict">
            <div className="ru-content">
              <h2>Reset разрешён, но официальный $2K-row не совпадает с правилом «10% дешевле»</h2>
              <p>
                Reset article говорит о {instantEvidence.reset.publishedDiscountPct}% снижении от original price и невозвратной reset fee.
                Однако published row показывает {money(instantEvidence.reset.publishedTable[0].listPriceUsd)} → {money(instantEvidence.reset.publishedTable[0].resetPriceUsd)} для {money(instantEvidence.reset.publishedTable[0].sizeUsd)}, что не равно 10% снижению.
              </p>
            </div>
            <div className="ru-notice">
              <strong><RefreshCcw size={16} aria-hidden="true" /> Не исправляем источник за фирму.</strong>{' '}
              Из-за конфликта точная reset price проверяется в собственном checkout. Основная Stellar Instant fee и reset fee не refundable; прошлые trades и profit после reset не переносятся.
            </div>
            <div className="ru-actions">
              <a href={instantEvidence.reset.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Проверить reset table</a>
              <a href={instantEvidence.refund.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правило refundable fee</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="country" data-russian-fundednext-instant-diaspora="actual-profile-before-purchase">
            <div className="ru-content">
              <h2>Русскоязычные живут в разных странах: проверяются 8 полей профиля</h2>
              <p>
                Для Казахстана, ОАЭ, ЕС, Израиля, Великобритании, США, Канады и других стран важны citizenship, residency, address, IP, KYC, payment method, platform и payout provider.
                Русский язык не заменяет ни одно из этих 8 полей.
              </p>
            </div>
            <div className="ru-notice">
              <strong>Резидентам России нельзя обещать доступ.</strong>{' '}
              CFD restriction FAQ не называет Россию, но company disclosure говорит, что российские резиденты не обслуживаются; bank transfer payout также ограничен. До оплаты нужен письменный ответ поддержки по конкретному профилю.
            </div>
            <div className="ru-actions">
              {accessEvidence?.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="nofollow noopener" className="btn-outline">Источник доступа {index + 1}</a>)}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Гайд для диаспоры</Link>
              <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">KYC-чек-лист</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="verdict" data-russian-fundednext-instant-verdict="buffer-before-speed">
            <div className="ru-content">
              <h2>Вердикт: Stellar Instant подходит, если buffer важнее слова «instant»</h2>
              <p>
                Маршрут подходит трейдеру, который принимает невозвратную fee, умеет считать 6% trailing floor, оставляет post-withdrawal buffer и может соблюдать EOD/news/copy rules.
                Он не подходит, если стратегия требует MT5 в США, полного вывода без MLL-запаса или копирования между разными FundedNext products.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card" data-russian-fundednext-instant-primary-partner="fundednext">
                <h3>FundedNext: основной Instant route</h3>
                <p>{hasFreshProduct ? `${pricedTiers.length} свежие цены` : 'Цены требуют обновления'}, 0 evaluation phases, no daily loss, no consistency и 2 payout paths дают проверяемый lifecycle до checkout.</p>
                <div className="ru-actions">
                  <Link href="/go/fundednext?from=ru-fundednext-instant-verdict" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></Link>
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                </div>
              </article>
              {brightFunded?.affiliateUrl ? (
                <article className="ru-card" data-russian-fundednext-instant-alternative="bright-funded">
                  <h3>Bright Funded: challenge-based альтернатива</h3>
                  <p>Bright Funded использует evaluation вместо Stellar Instant phase-0 route. Её русский обзор показывает EUR prices и product rules только при свежем захвате; Instant MLL, reset и payout gates на Bright переносить нельзя.</p>
                  <div className="ru-actions">
                    <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright</Link>
                    <Link href="/go/bright-funded?from=ru-fundednext-instant-alternative-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded</Link>
                  </div>
                </article>
              ) : null}
            </div>
            <div className="ru-actions"><Link href="/ru/prop-firmy-bez-chelendzha" className="btn-outline">Сравнить FundedNext Instant с FundingPips Zero</Link></div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="sources" data-russian-fundednext-instant-sources={sourceLinks.length}>
            <h2>16 первичных страниц FundedNext</h2>
            <p>Каждое число связано с конкретной pricing, risk, payout или trading-rule page; продуктовые цены дополнительно fail-closed после 30 дней.</p>
            <ol className="ru-source-list">
              {sourceLinks.map(([label, url]) => (
                <li key={url}><a href={url} target="_blank" rel="nofollow noopener">{label}</a></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о FundedNext Stellar Instant</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
