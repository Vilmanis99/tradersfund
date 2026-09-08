import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
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
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import instantEvidence from '@/content/data/russian-fundednext-instant-evidence.json'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { getDealsByFirm } from '@/lib/deals'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getLanguageAlternates, RUSSIAN_ROUTE_EDITORIAL_DATES } from '@/lib/localizedRoutes'
import { getRussianInstantFinderHref } from '@/lib/challengeComparisonData'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/ru/fundednext-stellar-instant'
const TITLE = 'FundedNext Stellar Instant: правила и выплаты (2026)'
const DESCRIPTION = 'Разбор FundedNext Stellar Instant на русском: стоимость участия, плавающая просадка, условия вывода прибыли, торговля на новостях и проверка страны.'
const EDITORIAL_DATE = RUSSIAN_ROUTE_EDITORIAL_DATES[PATH]

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

const lossExampleLabels: Record<string, string> = {
  start: 'Начало торговли',
  'profit 200': 'Прибыль $200',
  'loss 100': 'Убыток $100',
  'new profit high': 'Новый максимум прибыли',
  'floor reaches cap': 'Нижняя граница достигла стартового баланса',
}

const withdrawalMethodLabels: Record<string, string> = {
  'Bank Transfer': 'банковский перевод',
  'FNmarkets deposit': 'пополнение FNmarkets',
}

const sourceLinks = [
  ['Цена и доплата за счёт без свопов', instantEvidence.pricing.sourceUrl],
  ['Плавающий лимит общего убытка', instantEvidence.lossLimits.sourceUrl],
  ['Отсутствие правила равномерности прибыли', instantEvidence.consistency.sourceUrl],
  ['Платформы', instantEvidence.platforms.sourceUrl],
  ['Плечо по активам', instantEvidence.leverage.sourceUrl],
  ['Перенос позиций на ночь и выходные', instantEvidence.holding.sourceUrl],
  ['News Profit Rule', instantEvidence.news.sourceUrl],
  ['Копирование сделок', instantEvidence.copyTrading.sourceUrl],
  ['Общие правила', instantEvidence.generalRules.sourceUrl],
  ['Лимит покупки и увеличение счёта', instantEvidence.purchaseAllocation.sourceUrl],
  ['Доля трейдера на разных ступенях роста', instantEvidence.rewardShare.sourceUrl],
  ['Условия запроса вознаграждения', instantEvidence.rewardEligibility.sourceUrl],
  ['Процесс вывода', instantEvidence.withdrawal.sourceUrl],
  ['Лимит убытка после вывода', instantEvidence.postWithdrawalLossFloor.sourceUrl],
  ['Сброс счёта', instantEvidence.reset.sourceUrl],
  ['Невозвратный взнос', instantEvidence.refund.sourceUrl],
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
  const evidenceDates = [
    { label: 'основные правила', capturedAt: instantEvidence.capturedAt },
    { label: 'правило новостей', capturedAt: instantEvidence.news.sourceCapturedAt },
    { label: 'цены', capturedAt: instant?.sourceCapturedAt ?? '' },
    { label: 'доступность страны', capturedAt: marketEvidence.capturedAt },
  ]
  const hasFreshEvidence = evidenceDates.every(item => isChallengeFresh({ sourceCapturedAt: item.capturedAt }))
  const instantFinderHref = getRussianInstantFinderHref()

  const faqs: RussianFaqItem[] = [
    {
      q: 'FundedNext Stellar Instant — это счёт без челленджа?',
      a: 'Да: у Stellar Instant нет отдельного оценочного этапа. Трейдер оплачивает доступ к симулированному счёту, но сохраняются плавающий лимит убытка 6%, проверка личности и условия получения вознаграждения. Отсутствие челленджа не означает отсутствие ограничений.',
    },
    {
      q: 'Сколько стоит FundedNext Stellar Instant?',
      a: hasFreshProduct
        ? `По проверке от ${instant!.sourceCapturedAt} зафиксированы ${pricedTiers.length} размера: ${pricedTiers.map(tier => `${money(tier.sizeUsd)} за ${money(tier.priceUsd!)}`).join(', ')}. По отдельной статье о цене счёт без свопов стоит на 10% больше; взнос невозвратный. Итоговую сумму нужно проверить при оформлении.`
        : 'Последняя проверка цен старше 30 дней либо данные отсутствуют, поэтому числовая таблица временно скрыта. Проверьте итоговую стоимость на сайте фирмы до оплаты.',
    },
    {
      q: 'Есть ли дневной лимит убытка и правило равномерности прибыли?',
      a: 'В разобранных правилах нет отдельного дневного лимита и требования к равномерности прибыли. Общая просадка ограничена 6%: допустимая нижняя граница счёта поднимается за новым максимумом прибыли, не опускается после убытка и перестаёт расти на уровне стартового баланса.',
    },
    {
      q: 'Когда доступна выплата Stellar Instant?',
      a: 'Предусмотрены 2 варианта запроса: после роста счёта на 5%, подтверждённого в конце торгового дня, либо через 14 дней от начала цикла при росте от 1% до менее 5%. Новая сделка отключает перевод в кошелёк до следующей проверки в конце дня. Это условия подачи запроса, а не обещанный срок поступления денег.',
    },
    {
      q: 'Можно ли вывести всю прибыль?',
      a: 'Это может привести к нарушению лимита: нижняя граница допустимой стоимости счёта после вывода не снижается. Если она уже достигла стартового баланса, вывод всей прибыли может оставить счёт без запаса до нарушения. Сначала проверьте, какой запас останется после перевода в кошелёк.',
    },
    {
      q: 'Разрешена ли торговля на новостях?',
      a: 'Да, с ограничением News Profit Rule: для сделок, исполненных за 5 минут до или после указанной важной новости, засчитывается только 40% прибыли. Учитываются рыночные и отложенные ордера, а также частичное закрытие. Убытки этим правилом не уменьшаются.',
    },
    {
      q: 'Разрешены ли советники и копирование сделок?',
      a: 'Торговый советник должен быть настроен под собственную стратегию и не использовать уязвимости платформы. Копирование разрешено между Stellar Instant-счетами одного владельца, но не между Instant и Stellar 1-Step, 2-Step или Lite — даже если все счета принадлежат одному человеку.',
    },
    {
      q: 'Подходит ли Stellar Instant русскоязычному трейдеру?',
      a: 'Язык сам по себе не определяет доступность. Проверяются гражданство, проживание, документы, место подключения, способы оплаты и получения денег. Для пользователей из США опубликована отдельная конфигурация с Match-Trader. Проверка источников по России выявила противоречие, поэтому доступ резидентам РФ здесь не обещается: до оплаты нужен письменный ответ фирмы по конкретному профилю.',
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
    dateModified: EDITORIAL_DATE,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-fundednext-instant="product-lifecycle"
          data-russian-product-intent="fundednext-stellar-instant-rules"
          data-russian-country-boundary="instant-profile-not-language"
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/obzor-fundednext">FundedNext</Link> / Stellar Instant</div>
          <div className="ru-eyebrow"><Zap size={14} aria-hidden="true" /> Разбор программы без оценочного этапа</div>
          <h1>FundedNext Stellar Instant: просадка, стоимость и условия выплаты</h1>
          <p className="ru-lead">
            Не нужно проходить челлендж, но оплаченный счёт остаётся симулированным и подчиняется правилам риска.
            Разбираем, как растёт граница допустимого убытка, когда можно запросить вознаграждение и почему вывод всей прибыли способен нарушить условия счёта.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi" hrefLang="en">Edris Derakhshi</Link> · Обновлено: {EDITORIAL_DATE}</p>
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-stats" aria-label="Параметры Stellar Instant по указанным датам проверки">
            <div className="ru-stat"><strong>{hasFreshProduct ? pricedTiers.length : '—'}</strong><span>свежих цен</span></div>
            <div className="ru-stat"><strong>{instantEvidence.lossLimits.maximumLossPct}%</strong><span>плавающий общий лимит убытка</span></div>
            <div className="ru-stat"><strong>0</strong><span>оценочных этапов</span></div>
            <div className="ru-stat"><strong>{sourceLinks.length}</strong><span>официальных страниц с правилами</span></div>
          </div>
          <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-instant-hero">
            {fundedNext?.affiliateUrl ? (
              <Link href="/go/fundednext?from=ru-fundednext-instant-hero" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                Проверить Stellar Instant <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : null}
            <Link href="#risk" className="btn-outline">Как работает просадка</Link>
            <Link href={instantFinderHref} className="btn-outline">Сравнить программы без челленджа</Link>
          </div>
          <div className="ru-notice">
            <strong><Globe2 size={16} aria-hidden="true" /> Русская статья не подтверждает доступ по стране.</strong>{' '}
            Для пользователей из США опубликована конфигурация с Match-Trader. По резидентам России источники дают противоречивые сведения. Для русскоязычных в других странах также нужно проверить гражданство, проживание, документы и способы перевода денег.
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-fundednext-instant-article="unique-source-backed-guide">
        <section className="ru-section">
          <div className="ru-shell ru-content">
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрское раскрытие.</strong>{' '}
              Мы можем получить комиссию при покупке по ссылке на FundedNext. Это не меняет описанные ограничения и выводы. Все 16 страниц с правилами доступны отдельно на домене фирмы; ссылки на эти источники не являются партнёрскими.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание руководства Stellar Instant">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#answer">Короткий ответ</a></li>
                <li><a href="#price">Цены и дополнительные расходы</a></li>
                <li><a href="#risk">Плавающий лимит убытка 6%</a></li>
                <li><a href="#payout">Два варианта запроса выплаты</a></li>
                <li><a href="#news">Торговля на новостях</a></li>
                <li><a href="#platform">Платформа, советники и копирование</a></li>
                <li><a href="#holding">Плечо и перенос позиций</a></li>
                <li><a href="#scale">Лимит покупки и увеличение счёта</a></li>
                <li><a href="#reset">Сброс счёта и невозвратный взнос</a></li>
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
              Stellar Instant не требует оценочного этапа или минимального числа торговых дней. У программы нет отдельного дневного лимита убытка и правила равномерности прибыли.
              Однако общий убыток ограничен плавающей границей {instantEvidence.lossLimits.maximumLossPct}%, а выполнение условий выплаты проверяется отдельно. Оплата доступа сама по себе не даёт права сразу вывести деньги.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-facts="eight-gates">
                <thead><tr><th>Условие</th><th>Правило по дате проверки</th><th>Что это меняет</th></tr></thead>
                <tbody>
                  <tr><td><strong>Оценочный этап</strong></td><td>Не требуется</td><td>Взнос невозвратный</td></tr>
                  <tr><td><strong>Дневной лимит убытка</strong></td><td>Отсутствует</td><td>Плавающий общий лимит 6% сохраняется</td></tr>
                  <tr><td><strong>Равномерность прибыли</strong></td><td>Отдельного требования нет</td><td>Ограничения на новости и запрещённые стратегии сохраняются</td></tr>
                  <tr><td><strong>Начальная доля трейдера</strong></td><td>{instantEvidence.rewardShare.tier1Pct}%</td><td>{instantEvidence.rewardShare.tier3AndLaterPct}% только с третьей ступени роста</td></tr>
                  <tr><td><strong>Запрос при росте на 5%</strong></td><td>Проверка в конце дня</td><td>Новая сделка отключает перевод до следующей проверки</td></tr>
                  <tr><td><strong>Запрос через 14 дней</strong></td><td>Рост от {instantEvidence.rewardEligibility.biWeeklyMinimumGrowthPct}% до менее 5%</td><td>Срок считается от начала цикла</td></tr>
                  <tr><td><strong>Лимит новых покупок</strong></td><td>{money(instantEvidence.purchaseAllocation.maximumUsd)}</td><td>Счета нельзя объединять</td></tr>
                  <tr><td><strong>Россия / США</strong></td><td>конфликт / Match-Trader</td><td>Проверка профиля до оплаты</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="price" data-russian-fundednext-instant-pricing={hasFreshProduct ? pricedTiers.length : 'stale'}>
            <div className="ru-content">
              <h2>Стоимость участия: стандартный счёт и дополнительные расходы</h2>
              <p>
                {hasFreshProduct ? `Ниже указаны ${pricedTiers.length} стандартные цены по проверке от ${instant!.sourceCapturedAt}, без акций и дополнительных опций.` : 'Числовая таблица скрыта: последняя проверка цен старше 30 дней либо данные отсутствуют.'}
                {' '}В отдельной статье о стоимости FundedNext указывает доплату {instantEvidence.pricing.swapFreeSurchargePct}% за счёт без свопов и отсутствие ежемесячного взноса.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-price-table="source-gated">
                <thead><tr><th>Размер счёта</th><th>Стандартная цена</th><th>Возврат взноса</th><th>Что проверить</th></tr></thead>
                <tbody>
                  {pricedTiers.length ? pricedTiers.map(tier => (
                    <tr key={tier.sizeUsd} data-russian-fundednext-instant-tier={tier.sizeUsd}>
                      <td><strong>{money(tier.sizeUsd)}</strong></td>
                      <td>{money(tier.priceUsd!)}</td>
                      <td>{tier.refundable ? 'Да' : 'Нет'}</td>
                      <td>Тип счёта, платформу и итоговую сумму</td>
                    </tr>
                  )) : <tr><td colSpan={4}>Цены скрыты до повторной проверки официального источника.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="ru-notice">
              <strong>Диапазон стандартного взноса:</strong>{' '}
              {minimumPrice != null && maximumPrice != null ? `${money(minimumPrice)}–${money(maximumPrice)}` : 'требует повторной проверки'}.
              Доплата за отсутствие свопов и конвертация при оплате могут изменить итоговую сумму. Сброс счёта оплачивается отдельно и не входит в первоначальный взнос.
            </div>
            <div className="ru-actions">
              {currentDeal ? (
                <Link href="/go/fundednext?from=ru-fundednext-instant-free-trial" rel="sponsored nofollow noopener" className="btn-primary">
                  Условия скидки {currentDeal.pct}% после Free Trial <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : null}
              <Link href="/ru/promokody-prop-firm#fundednext-promokod" className="btn-outline">Ограничения акции</Link>
              <a href={instantEvidence.pricing.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальная страница цен</a>
            </div>
            {currentDeal && <p className="ru-source-line">Наличие акции FundedNext не подтверждает, что она применяется к выбранному Stellar Instant-счёту. Проверьте допустимую программу и итоговую цену до оплаты.</p>}
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="risk" data-russian-fundednext-instant-risk="six-percent-trailing-floor">
            <div className="ru-content">
              <h2>Как работает плавающий лимит убытка 6%: пример на $10,000</h2>
              <p>
                Максимальный лимит убытка (Maximum Loss Limit, MLL) задаёт нижнюю допустимую границу стоимости счёта.
                В официальном примере она начинается с {money(instantEvidence.lossLimits.workedExample[0].maximumLossFloorUsd)}, поднимается за новым максимумом прибыли и перестаёт расти на стартовых {money(10000)}.
                После убыточной сделки эта граница не опускается: именно поэтому плавающая просадка отличается от фиксированного ограничения.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-instant-mll-example="official-10k-sequence">
                <thead><tr><th>Шаг</th><th>Баланс</th><th>Событие из примера</th><th>Нижняя граница</th><th>Запас по балансу</th></tr></thead>
                <tbody>
                  {instantEvidence.lossLimits.workedExample.map((row, index) => (
                    <tr key={`${row.event}-${row.balanceUsd}`}>
                      <td>{index + 1}</td>
                      <td>{money(row.balanceUsd)}</td>
                      <td>{lossExampleLabels[row.event] ?? 'Следующий шаг официального примера'}</td>
                      <td>{money(row.maximumLossFloorUsd)}</td>
                      <td>{money(row.balanceUsd - row.maximumLossFloorUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Gauge size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Открытые позиции тоже важны</h3><p>Таблица показывает запас по балансу. При открытых сделках нужно следить и за средствами счёта с учётом текущей прибыли или убытка: падение ниже MLL нарушает условия.</p></article>
              <article className="ru-card"><ChartNoAxesCombined size={22} color="var(--accent-light)" aria-hidden="true" /><h3>После убытка запас сокращается</h3><p>Во втором и третьем шагах граница остаётся $9,600. Убыток $100 уменьшает запас с $600 до $500, хотя дневного ограничения нет.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Граница останавливается на старте</h3><p>Когда MLL достиг $10,000, запас для дальнейших убытков создаёт только прибыль сверх этой суммы. Вывод денег уменьшает этот запас.</p></article>
            </div>
            <p className="ru-source-line"><a href={instantEvidence.lossLimits.sourceUrl} target="_blank" rel="nofollow noopener">Официальный расчёт лимита убытка</a> · проверено {instantEvidence.capturedAt}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="payout" data-russian-fundednext-instant-payout="two-paths-plus-buffer">
            <div className="ru-content">
              <h2>Запрос выплаты: рост на 5% либо минимум 1% через 14 дней</h2>
              <p>
                Вариант выплаты по запросу открывается после проверки роста на {instantEvidence.rewardEligibility.onDemandGrowthPct}% в конце торгового дня, а не сразу после прибыльной сделки.
                При росте от {instantEvidence.rewardEligibility.biWeeklyMinimumGrowthPct}% до менее 5% действует другой срок: {instantEvidence.rewardEligibility.biWeeklyDays} дней от начала цикла. Оба условия определяют право подать запрос, а не дату поступления денег.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Zap size={22} color="var(--accent-light)" aria-hidden="true" /><h3>При росте на 5%</h3><p>Если после проверки открыть новую сделку, перевод в кошелёк отключается. Следующая проверка в конце дня должна снова подтвердить рост не менее 5%.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Через 14 дней</h3><p>Для этого варианта требуется рост минимум на 1%, но менее чем на 5%. Одного истечения 14 дней без нужного результата недостаточно.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Кошелёк и проверка личности</h3><p>После обязательной KYC-проверки вознаграждение переводится в кошелёк FundedNext. Заявка на вывод подтверждается одноразовым кодом; список содержит {instantEvidence.withdrawal.methods.length} способов перевода.</p></article>
            </div>
            <div className="ru-notice">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Вывод всей прибыли может оставить счёт без запаса.</strong>{' '}
              MLL после вывода не снижается. Официальный пример предупреждает: если нижняя граница уже достигла стартового баланса, вывод всей прибыли может оставить баланс на этой границе и привести к нарушению условий счёта.
            </div>
            <p>
              FundedNext заявляет обработку корректно оформленной заявки в течение {instantEvidence.withdrawal.processingHours} часов; это заявление фирмы, а не наш подтверждённый срок получения выплаты. Комиссию платёжного посредника оплачивает трейдер.
              Опубликованы {instantEvidence.withdrawal.methods.map(method => withdrawalMethodLabels[method] ?? method).join(', ')}. Доступность конкретного способа для своей страны нужно проверить в личном кабинете.
            </p>
            <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-instant-payout">
              <Link href="/go/fundednext?from=ru-fundednext-instant-payout" rel="sponsored nofollow noopener" className="btn-primary">Проверить Stellar Instant <ArrowRight size={14} aria-hidden="true" /></Link>
              <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить способы выплаты</Link>
              <a href={instantEvidence.postWithdrawalLossFloor.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Лимит убытка после вывода</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="news" data-russian-fundednext-instant-news="forty-percent-profit-rule">
            <div className="ru-content">
              <h2>Новости разрешены, но внутри 10 минут засчитывается только 40% прибыли</h2>
              <p>
                News Profit Rule действует за {instantEvidence.news.windowMinutesBefore} минут до и {instantEvidence.news.windowMinutesAfter} минут после указанной важной новости.
                Оно охватывает открытие и закрытие рыночных сделок, исполнение отложенных ордеров, в том числе по тейк-профиту и стоп-лоссу. При частичном закрытии в этом окне правило затрагивает всю сделку.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Newspaper size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Пересчёт после цикла</h3><p>В итог засчитывается {instantEvidence.news.countedProfitPct}% прибыли затронутых сделок. Поэтому результат до пересчёта ещё не подтверждает сумму доступного вознаграждения.</p></article>
              <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Убытки не сокращаются</h3><p>Ограничение 40% относится к прибыли, а не к убыткам. Убыточная сделка продолжает полностью влиять на счёт.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Корректировка лимита: максимум {instantEvidence.news.newsMllEquityBufferMaximumUses} раза</h3><p>При техническом нарушении из-за списания новостной прибыли фирма описывает дополнительный запас {instantEvidence.news.newsMllEquityBufferPct}% к MLL — не более {instantEvidence.news.newsMllEquityBufferMaximumUses} раз на одном счёте. Это специальная корректировка, а не постоянное увеличение допустимого торгового убытка.</p></article>
            </div>
            <p className="ru-source-line"><a href={instantEvidence.news.sourceUrl} target="_blank" rel="nofollow noopener">Официальное правило торговли на новостях</a> · повторно проверено {instantEvidence.news.sourceCapturedAt}, включая ограничение числа корректировок.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="platform" data-russian-fundednext-instant-platform="profile-plus-automation">
            <div className="ru-content">
              <h2>Платформа, советники и копирование: ограничения зависят от счёта</h2>
              <p>
                Общая статья о Stellar Instant называет {instantEvidence.platforms.general.join(' и ')}, но для пользователей из США указывает только {instantEvidence.platforms.unitedStates[0]}.
                Разрешение на торговых советников не отменяет требований к собственной стратегии, а копирование сделок ограничено Instant-счетами одного владельца.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Сценарий</th><th>Разрешено</th><th>Запрещено / ограничено</th></tr></thead>
                <tbody>
                  <tr><td><strong>Платформа вне США</strong></td><td>MT4 или MT5</td><td>Проверить доступный вариант при оформлении</td></tr>
                  <tr><td><strong>Профиль США</strong></td><td>Match-Trader</td><td>MT4 и MT5 недоступны</td></tr>
                  <tr><td><strong>Советник или индикатор</strong></td><td>Настроен под собственную стратегию</td><td>Нельзя использовать уязвимости платформы и запрещённые стратегии</td></tr>
                  <tr><td><strong>Копирование сделок</strong></td><td>Instant ↔ Instant одного владельца</td><td>Другой владелец или Instant ↔ 1-Step/2-Step/Lite</td></tr>
                  <tr><td><strong>Подключение и VPS</strong></td><td>VPN/VPS допускаются</td><td>Фирма рекомендует постоянное устройство и выделенный IP-адрес</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ru-actions">
              <Link href="/ru/fundednext-mt5" className="btn-outline">Руководство по MT5 и советникам</Link>
              <a href={instantEvidence.copyTrading.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правила копирования</a>
              <a href={instantEvidence.generalRules.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Все правила Instant</a>
            </div>
            <p className="ru-source-line">Разрешение использовать VPS не подтверждает доступность по стране и не разрешает скрывать местонахождение или обходить проверку личности.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="holding" data-russian-fundednext-instant-holding="leverage-and-swaps">
            <div className="ru-content">
              <h2>Плечо и перенос позиций: свопы входят в результат счёта</h2>
              <p>
                Плечо зависит от класса активов: валютные пары — {instantEvidence.leverage.forex}, сырьевые товары — {instantEvidence.leverage.commodities}, индексы — {instantEvidence.leverage.indices}, криптовалюты — {instantEvidence.leverage.crypto}.
                Перенос позиций на ночь и выходные разрешён. При этом своп — плата или начисление за перенос — остаётся частью прибыли и убытка счёта.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><CircleDollarSign size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Расходы уменьшают запас</h3><p>Разрешение держать позицию не исключает своп из расчёта средств счёта. Эти начисления нужно учитывать вместе с плавающим лимитом убытка 6%.</p></article>
              <article className="ru-card"><CalendarClock size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Дни тройного свопа</h3><p>Официальная статья указывает среду для валют и сырья, пятницу — для индексов и криптовалют. Эти дни имеют значение для стоимости переноса.</p></article>
              <article className="ru-card"><Laptop size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Спецификация инструмента</h3><p>Точное значение свопа проверяют в окне Specification торговой платформы до переноса позиции на следующий день.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="scale" data-russian-fundednext-instant-scale="purchase-versus-growth">
            <div className="ru-content">
              <h2>Лимит покупки $20,000 и увеличение счёта — разные условия</h2>
              <p>
                Суммарный размер активных счетов, полученных через новые покупки, ограничен {money(instantEvidence.purchaseAllocation.maximumUsd)}. Объединять счета нельзя.
                Та же статья отдельно заявляет увеличение до {instantEvidence.purchaseAllocation.scaleMultiple} стартовых балансов и максимальный размер {money(instantEvidence.purchaseAllocation.publishedScaledMaximumUsd)} при выполнении условий роста.
              </p>
              <p>
                Доля трейдера составляет {instantEvidence.rewardShare.tier1Pct}% на первой и второй ступенях, затем {instantEvidence.rewardShare.tier3AndLaterPct}% с третьей ступени без дальнейшего увеличения этой доли.
                Поэтому опубликованные «до $2 млн» и «80%» не описывают условия нового счёта в первый день.
              </p>
            </div>
            <div className="ru-notice"><strong>Верхняя рекламируемая сумма требует уточнения.</strong> Лимит покупки, размер на очередной ступени и опубликованный максимум — разные величины. Указанных 10-кратного роста и лимита покупки $20,000 недостаточно, чтобы объяснить путь к $2 млн. До выбора программы запросите у фирмы расчёт для конкретного стартового счёта; здесь достижение этой суммы не обещается.</div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="reset" data-russian-fundednext-instant-reset="official-price-conflict">
            <div className="ru-content">
              <h2>Сброс счёта: цена для $2,000 не совпадает с правилом «10% дешевле»</h2>
              <p>
                Статья о сбросе обещает цену на {instantEvidence.reset.publishedDiscountPct}% ниже первоначального взноса и указывает, что эта плата невозвратная.
                Но для счёта {money(instantEvidence.reset.publishedTable[0].sizeUsd)} в её таблице стоит {money(instantEvidence.reset.publishedTable[0].listPriceUsd)} → {money(instantEvidence.reset.publishedTable[0].resetPriceUsd)}. Это не соответствует заявленному снижению на 10%.
              </p>
            </div>
            <div className="ru-notice">
              <strong><RefreshCcw size={16} aria-hidden="true" /> Не исправляем источник за фирму.</strong>{' '}
              Из-за противоречия точную цену сброса нужно подтвердить перед оплатой. Первоначальный взнос Stellar Instant и плата за сброс не возвращаются; история сделок и прежняя прибыль после сброса не переносятся.
            </div>
            <div className="ru-actions">
              <a href={instantEvidence.reset.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Таблица стоимости сброса</a>
              <a href={instantEvidence.refund.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правило невозвратного взноса</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="country" data-russian-fundednext-instant-diaspora="actual-profile-before-purchase">
            <div className="ru-content">
              <h2>Русскоязычные живут в разных странах: проверяются 8 полей профиля</h2>
              <p>
                Для Казахстана, ОАЭ, стран ЕС, Израиля, Великобритании, США, Канады и других стран важны гражданство, проживание, адрес, место подключения, документы для KYC, способ оплаты, платформа и платёжный посредник для вывода.
                Русский язык не заменяет ни одно из этих 8 полей.
              </p>
            </div>
            <div className="ru-notice">
              <strong>Резидентам России нельзя обещать доступ.</strong>{' '}
              По проверке от {marketEvidence.capturedAt} справка об ограничениях CFD не называет Россию, но раскрытие информации компании говорит, что российские резиденты не обслуживаются; банковский вывод также ограничен. Это датированное противоречие, а не подтверждение доступа. До оплаты нужен письменный ответ поддержки по конкретному профилю.
            </div>
            <div className="ru-actions">
              {accessEvidence?.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="nofollow noopener" className="btn-outline">Источник доступа {index + 1}</a>)}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверка страны проживания</Link>
              <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">KYC-чек-лист</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="verdict" data-russian-fundednext-instant-verdict="buffer-before-speed">
            <div className="ru-content">
              <h2>Вывод: отсутствие челленджа не отменяет расчёт риска</h2>
              <p>
                Главное отличие Stellar Instant — отсутствие оценки перед началом участия, а не свободный доступ к выплатам. В сравнении нужно учитывать невозвратный взнос, плавающую просадку 6%, запас после вывода и пересчёт новостной прибыли.
                Если стратегия требует MT5 для профиля США, вывода всей прибыли без запаса до MLL или копирования между разными программами FundedNext, разобранные правила ей не соответствуют.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card" data-russian-fundednext-instant-primary-partner="fundednext">
                <h3>FundedNext Stellar Instant</h3>
                <p>{hasFreshProduct ? `Сравните ${pricedTiers.length} размера счёта по ценам от ${instant!.sourceCapturedAt}` : 'Цены требуют повторной проверки'}. До оплаты проверьте не только взнос, но и оба варианта запроса выплаты, платформу и доступность для своего профиля.</p>
                <div className="ru-actions">
                  <Link href="/go/fundednext?from=ru-fundednext-instant-verdict" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></Link>
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                </div>
              </article>
              {brightFunded?.affiliateUrl ? (
                <article className="ru-card" data-russian-fundednext-instant-alternative="bright-funded">
                  <h3>Bright Funded: альтернатива с челленджем</h3>
                  <p>У Bright Funded есть оценочный этап: это другой формат, а не аналог счёта Instant. В обзоре приведены цены в евро и отдельные условия программ. Правила просадки, сброса и выплат FundedNext к Bright Funded не относятся.</p>
                  <div className="ru-actions">
                    <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright</Link>
                    <Link href="/go/bright-funded?from=ru-fundednext-instant-alternative-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded</Link>
                  </div>
                </article>
              ) : null}
            </div>
            <p className="ru-source-line">FundedNext и Bright Funded — партнёры сайта: покупка по отмеченным ссылкам может принести нам комиссию. Это не делает их условия одинаковыми и не подтверждает доступность по стране.</p>
            <div className="ru-actions">
              <Link href={instantFinderHref} className="btn-outline">Сравнить программы без челленджа</Link>
              <Link href="/ru/prop-firmy-bez-chelendzha" className="btn-outline">Чем отличаются Instant и Zero</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="sources" data-russian-fundednext-instant-sources={sourceLinks.length}>
            <h2>16 первичных страниц FundedNext</h2>
            <p>Ниже собраны 16 официальных страниц о цене, просадке, выплатах и торговых ограничениях. Даты проверки правил, цен и страны указаны в начале статьи отдельно. После 30 дней без повторной проверки числовая таблица цен скрывается; датированные объяснения не становятся автоматически действующими условиями.</p>
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
