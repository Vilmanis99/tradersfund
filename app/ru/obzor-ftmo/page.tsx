import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Database,
  ExternalLink,
  Globe2,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import {
  challengeTierEconomics,
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-ftmo'
const TITLE = 'FTMO: обзор 2026, цены, правила и доступ для русскоязычных'
const DESCRIPTION = 'Обзор FTMO на русском: 1-Step и 2-Step, 10 цен в EUR, статическая и EOD-trailing просадка, возврат fee, выплаты и ограничение для Российской Федерации.'

const OFFICIAL_URL = 'https://ftmo.com/'
const COMPARISON_URL = 'https://ftmo.com/en/comparison-table/'
const ACCESS_URL = 'https://ftmo.com/en/faq/who-can-join-ftmo/'
const PAYOUT_URL = 'https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/'
const FEES_URL = 'https://ftmo.com/faq/are-the-fees-recurrent/'
const NEWS_URL = 'https://ftmo.com/en/faq/can-i-trade-news/'
const SCALING_URL = 'https://ftmo.com/en/reward-growth-and-scaling-plan/'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function eur(value: number | null | undefined) {
  return value == null
    ? '—'
    : `€${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
}

function usdAccount(value: number) {
  return `$${(value / 1000).toLocaleString('en-US')}K`
}

function targetLabel(product: Challenge) {
  const values = [
    product.profitTargets?.phase1,
    product.profitTargets?.phase2,
    product.profitTargets?.phase3,
  ].filter((value): value is number => value != null)
  return values.length ? `${values.join('% / ')}%` : 'не опубликована'
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какой официальный сайт FTMO?',
    a: 'Официальный глобальный домен — ftmo.com. Маршрут /go/ftmo на Traders Fund Hub ведёт на этот домен без партнёрской комиссии. Проверяйте домен перед вводом платёжных данных: похожее название в рекламе или Telegram не доказывает связь с FTMO.',
  },
  {
    q: 'Работает ли FTMO с резидентами России?',
    a: 'Нет по текущей публичной формулировке FTMO. Страница Who can join FTMO прямо включает Russian Federation в список территорий, где компания не предоставляет услуги. VPN, чужой адрес или неверные KYC-данные не превращают запрещённый профиль в разрешённый.',
  },
  {
    q: 'Может ли русскоязычный трейдер за рубежом использовать FTMO?',
    a: 'Русский язык сам по себе не является ограничением. Решение зависит от фактической страны, документов, KYC, способа оплаты и версии сайта, на которую направлен пользователь. Русскоязычному жителю другой страны нужно проверить свой профиль по актуальному списку FTMO до покупки; эта статья не заменяет индивидуальное подтверждение.',
  },
  {
    q: 'Сколько стоит FTMO Challenge?',
    a: 'В захвате от 28 августа 2026 года 2-Step стоит €89–€1,080, а 1-Step — €79–€999 для счетов от $10K до $200K. Размер счёта указан в USD, но fee публикуется в EUR; мы не пересчитываем его по временному курсу.',
  },
  {
    q: 'Чем FTMO 1-Step отличается от 2-Step?',
    a: '2-Step использует цели 10% и 5%, дневной лимит 5%, статический максимум 10%, минимум 4 торговых дня на фазу и базовый split 80%. 1-Step использует одну цель 10%, дневной лимит 3%, EOD-trailing максимум 10%, правило Best Day 50% и split 90%.',
  },
  {
    q: 'Возвращает ли FTMO стоимость challenge?',
    a: 'Для 2-Step — 100% вместе с первой одобренной reward-выплатой. Для 1-Step fee не возвращается даже после успешного прохождения. Поэтому €499 за 1-Step и €540 за 2-Step на $100K нельзя сравнивать как одинаковый расход.',
  },
  {
    q: 'Когда можно запросить первую выплату FTMO?',
    a: 'FTMO публикует возможность запроса на 14-й день или позже после первой сделки на конкретном FTMO Account. Все позиции и отложенные ордера должны быть закрыты; проверка заявлена в пределах 1–2 рабочих дней, отправка — обычно ещё 1–2 рабочих дня после одобрения invoice.',
  },
  {
    q: 'Traders Fund Hub получает комиссию от FTMO?',
    a: 'Нет. В этой статье ссылка FTMO ведёт на официальный сайт без партнёрского вознаграждения. FundedNext и Bright Funded показаны отдельно как коммерческие партнёры; регистрация через их помеченные ссылки может принести Traders Fund Hub комиссию.',
  },
]

export default function RussianFtmoReviewPage() {
  const firms = getAllFirms()
  const firm = firms.find(candidate => candidate.name === 'FTMO')
  const products = getChallengesByFirm('ftmo')
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const twoStep = freshProducts.find(product => product.productSlug === 'ftmo-challenge-2-step')
  const oneStep = freshProducts.find(product => product.productSlug === 'ftmo-challenge-1-step')
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceEur != null && tier.priceEur > 0 ? [{ product, tier, price: tier.priceEur }] : []))
  const latestCapture = freshProducts.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? products.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? 'дата не указана'
  const ftmoSearchQuery = marketEvidence.searchDemand.queries.find(item =>
    item.query.toLowerCase().includes('ftmo'))
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'ftmo')
  const sourceUrls = [...new Set([
    ...freshProducts.map(product => product.sourceUrl),
    ...(accessEvidence?.sourceUrls ?? []),
  ])]
  const partnerAlternatives = ['fundednext', 'bright-funded'].flatMap(slug => {
    const partnerFirm = firms.find(candidate => outboundSlug(candidate.name) === slug)
    if (!partnerFirm?.affiliateUrl) return []
    const partnerProducts = getChallengesByFirm(slug).filter(product => isChallengeFresh(product))
    const priceCount = partnerProducts.reduce((total, product) => total + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0)).length, 0)
    return [{ slug, firm: partnerFirm, products: partnerProducts, priceCount }]
  })
  const account100k = (product: Challenge | undefined) =>
    product?.accountSizes.find(tier => tier.sizeUsd === 100000)
  const twoStep100k = account100k(twoStep)
  const oneStep100k = account100k(oneStep)
  const twoStep100kEconomics = twoStep && twoStep100k
    ? challengeTierEconomics(twoStep, twoStep100k)
    : null
  const oneStep100kEconomics = oneStep && oneStep100k
    ? challengeTierEconomics(oneStep, oneStep100k)
    : null

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор FTMO' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-08-28',
    dateModified: latestCapture,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-ftmo-review="search-to-decision">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / FTMO</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Условия проверены {latestCapture}</div>
          <h1>FTMO: обзор 2026 — 2 программы и 10 цен</h1>
          <p className="ru-lead">
            FTMO 1-Step и 2-Step различаются не только числом фаз. У них разные дневные лимиты, механика максимального убытка,
            правило Best Day, стартовый profit split и возврат fee. Для русскоязычного читателя первым фильтром остаётся страна,
            а не язык: Российская Федерация прямо указана FTMO среди неподдерживаемых территорий.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {latestCapture}</span>
            <span>13 минут чтения</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>текущие программы</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>цен в исходной валюте</span></div>
            <div className="ru-stat"><strong>{eur(Math.min(...pricedTiers.map(item => item.price)))}</strong><span>минимальная цена</span></div>
            <div className="ru-stat"><strong>{firm?.affiliateUrl ? 'да' : 'нет'}</strong><span>партнёрская связь с FTMO</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-ftmo-article="long-form-source-first">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора FTMO">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#country">Страна и русскоязычная аудитория</a></li>
                <li><a href="#verdict">Краткий вывод</a></li>
                <li><a href="#official">Официальный сайт</a></li>
                <li><a href="#products">1-Step против 2-Step</a></li>
                <li><a href="#prices">10 цен и true cost</a></li>
                <li><a href="#risk">Просадка и Best Day</a></li>
                <li><a href="#payout">Возврат fee и выплаты</a></li>
                <li><a href="#fit">Кому подходит FTMO</a></li>
                <li><a href="#alternatives">FundedNext и Bright Funded</a></li>
                <li><a href="#checklist">Проверка перед оплатой</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="country" data-russian-country-boundary="ftmo-russia-restricted">
            <div className="ru-notice">
              <strong>FTMO не обслуживает клиентов в Российской Федерации.</strong>{' '}
              На официальной странице Who can join FTMO страна названа прямо. Русский язык страницы не меняет это ограничение,
              а VPN, прокси или чужие документы создают нарушение, а не допустимый маршрут регистрации.
            </div>
            <h2>Русскоязычный трейдер — не синоним резидента России</h2>
            <p>
              Этот обзор адресован русскоязычным людям в разных странах. Официальный список FTMO описывает территориальную доступность,
              поэтому жителю Латвии, Германии, Израиля, ОАЭ или другой страны нужно проверять собственное резидентство, документы,
              платёжный метод и фактический checkout. Мы не переносим запрет для Российской Федерации на всех носителей русского языка,
              но и не обещаем допуск человеку только по адресу за рубежом.
            </p>
            <p>
              Практическое правило состоит из 4 проверок: страна фактического проживания, гражданство в KYC, имя владельца платежа и
              доступность будущего payout-метода. Если хотя бы 1 поле не подтверждено самим FTMO, оплачивать challenge преждевременно.
              <a href={ACCESS_URL} target="_blank" rel="noopener noreferrer"> Проверить текущий список FTMO</a>.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="verdict" data-russian-ftmo-verdict="two-products-not-one-brand">
            <h2>Краткий вывод: выбирать нужно между 2 наборами ограничений</h2>
            <p>
              2-Step логичнее для трейдера, которому важны статическая граница 10%, дневной лимит 5% и возврат 100% fee после первой
              reward-выплаты. Цена $100K-счёта составляет {eur(twoStep100k?.priceEur)}, базовый split — {twoStep?.profitSplitPct ?? '—'}%,
              а расчётный gross profit для компенсации fee до учёта возврата — {eur(twoStep100kEconomics?.breakEvenProfit)}.
            </p>
            <p>
              1-Step сокращает оценку до 1 фазы и начинает со split {oneStep?.profitSplitPct ?? '—'}%, но снижает дневной лимит до
              {oneStep?.dailyLossPct ?? '—'}%, двигает 10%-ю границу по EOD-механике и применяет Best Day {oneStep?.consistencyRulePct ?? '—'}%.
              Fee {eur(oneStep100k?.priceEur)} на $100K не возвращается, а для его компенсации при split {oneStep?.profitSplitPct ?? '—'}%
              нужен gross profit {eur(oneStep100kEconomics?.breakEvenProfit)}. Поэтому более низкая цена не означает более низкую полную стоимость решения.
            </p>
            <div className="ru-actions">
              <Link href="/go/ftmo?from=ru-ftmo-review-verdict" rel="nofollow noopener" className="btn-outline">
                Открыть официальный сайт FTMO <ExternalLink size={14} aria-hidden="true" />
              </Link>
              <Link href="#alternatives" className="btn-primary">Сравнить партнёрские альтернативы <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <p className="ru-source-line">Ссылка FTMO не является партнёрской: Traders Fund Hub не получает комиссию за этот переход.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="official" data-russian-ftmo-official-site="non-affiliate">
            <h2>Официальный сайт FTMO: как не попасть на копию</h2>
            <p>
              Глобальный официальный домен — <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer">ftmo.com</a>.
              Зафиксированный поисковый снимок содержит запрос «{ftmoSearchQuery?.query ?? 'ftmo проп компания сайт официальный'}» с оценкой
              {ftmoSearchQuery?.monthlyFrequency ?? 16} показов за январь 2026 года в Yandex Moscow. Это малый сторонний сигнал формулировки,
              а не Search Console, не объём всей русскоязычной аудитории и не основание доверять любому похожему домену.
            </p>
            <p>
              Перед вводом карты проверьте 3 элемента: адрес начинается с ftmo.com, продукт называется FTMO Challenge: 1-Step или 2-Step,
              а цена и валюта совпадают с checkout. Для США FTMO публикует отдельный переход на ftmo.oanda.com; цифры глобальной версии нельзя
              автоматически переносить на другую сущность или региональный storefront.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="products" data-russian-ftmo-product-matrix="two-current-products">
            <h2>FTMO 1-Step и 2-Step: сравнение правил</h2>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead>
                  <tr><th>Условие</th><th>FTMO 2-Step</th><th>FTMO 1-Step</th><th>Почему это меняет решение</th></tr>
                </thead>
                <tbody>
                  <tr><td>Фазы</td><td>{twoStep?.phases ?? '—'}</td><td>{oneStep?.phases ?? '—'}</td><td>1-Step убирает Verification, но не остальные ограничения.</td></tr>
                  <tr><td>Цели</td><td>{twoStep ? targetLabel(twoStep) : '—'}</td><td>{oneStep ? targetLabel(oneStep) : '—'}</td><td>У 2-Step общая цель распределена между 2 этапами.</td></tr>
                  <tr><td>Дневной лимит</td><td>{twoStep?.dailyLossPct ?? '—'}%</td><td>{oneStep?.dailyLossPct ?? '—'}%</td><td>На $100K разница составляет $2,000 дневного пространства.</td></tr>
                  <tr><td>Максимальный убыток</td><td>{twoStep?.maxLossPct ?? '—'}%, {drawdownLabels[twoStep?.drawdownType ?? ''] ?? '—'}</td><td>{oneStep?.maxLossPct ?? '—'}%, {drawdownLabels[oneStep?.drawdownType ?? ''] ?? '—'}</td><td>Одинаковые 10% работают по разной механике.</td></tr>
                  <tr><td>Минимальные дни</td><td>{twoStep?.minTradingDays ?? '—'} на фазу</td><td>{oneStep?.minTradingDays ?? 'нет опубликованного минимума'}</td><td>2-Step нельзя завершить одной сделкой в каждой фазе.</td></tr>
                  <tr><td>Best Day</td><td>{twoStep?.consistencyRulePct ?? 'нет'}</td><td>{oneStep?.consistencyRulePct ?? '—'}%</td><td>На 1-Step крупнейший положительный день влияет и на pass, и на reward.</td></tr>
                  <tr><td>Базовый split</td><td>{twoStep?.profitSplitPct ?? '—'}%</td><td>{oneStep?.profitSplitPct ?? '—'}%</td><td>«До 90%» у 2-Step не равно стартовым 90%.</td></tr>
                  <tr><td>Возврат fee</td><td>{twoStep100k?.refundable ? '100% с первой reward' : 'нет'}</td><td>{oneStep100k?.refundable ? 'да' : 'нет'}</td><td>Возврат меняет экономику успешного маршрута.</td></tr>
                  <tr><td>Первая reward</td><td>{twoStep?.payoutFirstDays ?? '—'} дней</td><td>{oneStep?.payoutFirstDays ?? '—'} дней</td><td>Счёт начинается после первой сделки, а не после покупки challenge.</td></tr>
                </tbody>
              </table>
            </div>
            <p><a href={COMPARISON_URL} target="_blank" rel="noopener noreferrer">Сверить официальную сравнительную таблицу FTMO</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="prices" data-russian-ftmo-price-count={pricedTiers.length} data-russian-ftmo-truecost={pricedTiers.length}>
            <h2>Все 10 цен FTMO и true cost в EUR</h2>
            <p>
              FTMO маркирует размер симулируемого счёта в USD, но публикует fee в EUR. Мы сохраняем обе единицы и не применяем курс дня:
              пересчёт €540 в доллары быстро устареет и скроет комиссию банка. Таблицы ниже используют только list price из захвата {latestCapture}
              и функцию computeTrueCost() через challengeTierEconomics().
            </p>
            {freshProducts.map(product => (
              <div key={product.productSlug} data-russian-ftmo-pricing-product={product.productSlug}>
                <h3>{product.productName}</h3>
                <div className="ru-table-wrap">
                  <table className="ru-table">
                    <thead><tr><th>Счёт</th><th>Fee</th><th>Минимальный outlay</th><th>Gross profit для компенсации</th><th>Возврат</th></tr></thead>
                    <tbody>
                      {[...product.accountSizes].sort((a, b) => a.sizeUsd - b.sizeUsd).map(tier => {
                        const economics = challengeTierEconomics(product, tier)
                        return (
                          <tr key={tier.sizeUsd}>
                            <td>{usdAccount(tier.sizeUsd)}</td>
                            <td>{eur(tier.priceEur)}</td>
                            <td>{eur(economics?.minimumCost)}</td>
                            <td>{eur(economics?.breakEvenProfit)}</td>
                            <td>{tier.refundable ? 'с первой reward' : 'не возвращается'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p>
              На $100K разница list price составляет только {eur((twoStep100k?.priceEur ?? 0) - (oneStep100k?.priceEur ?? 0))}:
              {eur(twoStep100k?.priceEur)} против {eur(oneStep100k?.priceEur)}. Но у 2-Step возврат привязан к первой reward,
              тогда как {eur(oneStep100k?.priceEur)} у 1-Step остаётся расходом даже после pass. Поэтому fee, refund и вероятность нарушения
              конкретной просадки нужно моделировать одной системой, а не тремя рекламными тезисами.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="risk" data-russian-ftmo-risk="static-vs-eod-trailing">
            <h2>Статическая просадка против EOD-trailing</h2>
            <div className="ru-grid">
              <article className="ru-card">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>2-Step: фиксированная граница</h3>
                <p>
                  Для $100K 10%-й Maximum Loss означает исходную нижнюю границу $90,000, а 5%-й Max Daily Loss даёт $5,000 дневного лимита
                  по формуле FTMO. Прибыльный день не поднимает постоянный максимум убытка, поэтому риск на сделку можно привязать к неизменной базе.
                </p>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>1-Step: EOD-граница движется</h3>
                <p>
                  На $100K дневной лимит равен 3%, или $3,000, а 10%-й Maximum Loss пересчитывается как balance-based end-of-day trailing limit.
                  Граница может повышаться после прибыльного закрытия дня, поэтому возврат накопленной прибыли способен нарушить 1-Step раньше,
                  чем статический 2-Step при той же надписи «10%».
                </p>
              </article>
            </div>
            <h3>Best Day 50% — это правило концентрации прибыли</h3>
            <p>
              На 1-Step самый прибыльный день не должен превышать 50% суммы Positive Days’ Profit. Если положительные дни дали $10,000,
              один день не может составлять больше $5,000; иначе нужно продолжать торговлю, пока доля не снизится. Правило применяется не только
              к прохождению challenge, но и к запросу reward. В structured capture 2-Step хранит null, потому что это ограничение там не опубликовано.
            </p>
            <p><a href={NEWS_URL} target="_blank" rel="noopener noreferrer">Проверить отдельное правило FTMO для торговли на новостях</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="payout" data-russian-ftmo-payout="day-14-refund-split">
            <h2>Reward, возврат fee и реальный денежный цикл</h2>
            <p>
              Обе программы публикуют первый запрос на 14-й день или позже после первой сделки FTMO Account. Перед запросом нужно закрыть все
              позиции и pending orders. FTMO заявляет 1–2 рабочих дня на проверку и обычно ещё 1–2 рабочих дня на отправку после одобрения invoice;
              это не означает гарантированное поступление в банк или кошелёк за 14 дней от покупки challenge.
            </p>
            <p>
              Базовая доля 2-Step равна {twoStep?.profitSplitPct ?? '—'}% и может вырасти до 90% при выполнении отдельных условий Scaling Plan или
              Premium Programme. Текущий Scaling Plan называет 4 обязательных поля: минимум 4 месяца с начала или прошлого scale-up,
              не менее 10% net simulated profit над стартовым балансом за эти 4 месяца, минимум 2 обработанные reward-выплаты и положительный
              баланс в момент увеличения. При выполнении условий баланс растёт на 25% каждые 4 месяца до совокупного лимита $2,000,000;
              повышенный split 90% по этому маршруту относится к 2-Step. 1-Step начинает с {oneStep?.profitSplitPct ?? '—'}%, но не позволяет
              оставлять reward для увеличения баланса по опубликованной payout-справке.
            </p>
            <p>
              2-Step возвращает 100% первоначального fee только вместе с первой reward-выплатой. Если трейдер прошёл 2 фазы, но нарушил funded-правило
              до первой выплаты, возврат не состоялся. 1-Step не возвращает fee ни при pass, ни при reward, поэтому каждый повторный €79–€999 является
              новым невозвратным расходом.
            </p>
            <p><a href={PAYOUT_URL} target="_blank" rel="noopener noreferrer">Официальная payout-справка</a>{' · '}<a href={FEES_URL} target="_blank" rel="noopener noreferrer">Правило возврата fee</a>{' · '}<a href={SCALING_URL} target="_blank" rel="noopener noreferrer">Условия Scaling Plan</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="fit" data-russian-ftmo-fit="rule-before-brand">
            <h2>Кому подходит и кому не подходит FTMO</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Подходит: статический риск</h3><p>2-Step подходит плану, который требует фиксированного 10%-го пола, 5%-го дневного пространства и допускает минимум 4 торговых дня на каждую из 2 фаз.</p></article>
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Подходит: одна фаза и ровные дни</h3><p>1-Step подходит стратегии, способной выдержать 3%-й дневной лимит, движущийся EOD-пол и Best Day 50% ради 1 оценочной фазы и стартового split 90%.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не подходит: Российская Федерация</h3><p>Официальный country list прямо исключает территорию. Ни русская версия обзора, ни способ выплаты, ни VPN не отменяют опубликованный запрет.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не подходит: концентрация прибыли</h3><p>Если 1 сильный день регулярно создаёт больше половины общей положительной прибыли, Best Day 50% на 1-Step может задержать pass и reward даже без нарушения 10%-го Maximum Loss.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="alternatives" data-russian-ftmo-global-funnel="fundednext-bright-funded">
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ftmo-alternatives">
              <strong>Коммерческое раскрытие.</strong>{' '}
              FTMO не является нашим партнёром. FundedNext и Bright Funded являются партнёрами: если подходящий читатель зарегистрируется
              через помеченную ссылку, Traders Fund Hub может получить комиссию. Это не доказывает доступность страны и не меняет продуктовые числа.
            </div>
            <h2>Если FTMO не подходит: FundedNext и Bright Funded</h2>
            <p>
              Альтернатива должна решать конкретную проблему FTMO, а не просто вести на другой логотип. Для русскоязычного жителя разрешённой страны
              сначала сравниваются валюта fee, тип просадки, число фаз и payout; для резидента России отдельно проверяется country policy каждой фирмы.
              FundedNext сохраняет конфликт официальных формулировок по России, а отсутствие России в опубликованном списке Bright Funded не заменяет KYC.
            </p>
            <div className="ru-grid">
              {partnerAlternatives.map(item => {
                const reviewHref = item.slug === 'fundednext' ? '/ru/obzor-fundednext' : '/ru/obzor-bright-funded'
                return (
                  <article className="ru-card" key={item.slug} data-russian-ftmo-alternative={item.slug}>
                    <div className="ru-card-head"><h3>{item.firm.name}</h3><span className="ru-score">Партнёр</span></div>
                    <ul className="ru-facts">
                      <li><Database size={14} aria-hidden="true" /> {item.products.length} свежих продуктов</li>
                      <li><BadgeDollarSign size={14} aria-hidden="true" /> {item.priceCount} опубликованных цен</li>
                      <li><Globe2 size={14} aria-hidden="true" /> Страна и KYC проверяются до оплаты</li>
                    </ul>
                    <p>
                      {item.slug === 'fundednext'
                        ? 'Начните с выбора между Stellar 2-Step, 1-Step, Lite и Instant; официальный конфликт по российским резидентам не позволяет обещать доступ.'
                        : 'Начните с выбора между 1-Step, 2-Step Bright и 2-Step Classic; fee публикуется в EUR, а базовый split нельзя подменять платным или scaling-потолком.'}
                    </p>
                    <div className="ru-actions">
                      <Link href={reviewHref} className="btn-outline">Русский обзор</Link>
                      <Link href={`/go/${item.slug}?from=ru-ftmo-alternative-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                        Проверить {item.firm.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="ru-actions">
              <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary"><Scale size={15} aria-hidden="true" /> Сравнить FundedNext и Bright Funded</Link>
              <Link href="/ru/promokody-prop-firm" className="btn-outline">Проверить действующие предложения</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="checklist" data-russian-ftmo-checklist="seven-fields">
            <h2>7 проверок перед покупкой challenge</h2>
            <ol>
              <li>Откройте официальный domain и подтвердите страну по текущему списку, а не по языку интерфейса.</li>
              <li>Выберите 1-Step или 2-Step по просадке, а не по разнице {eur((twoStep100k?.priceEur ?? 0) - (oneStep100k?.priceEur ?? 0))} на $100K.</li>
              <li>Сохраните финальный EUR total checkout; отображаемая цена может отличаться из-за налога, региона или действующей акции.</li>
              <li>Для 1-Step смоделируйте Max Daily Loss {oneStep?.dailyLossPct ?? '—'}%, EOD-trailing и Best Day {oneStep?.consistencyRulePct ?? '—'}% вместе.</li>
              <li>Для 2-Step заложите {twoStep?.minTradingDays ?? '—'} торговых дня в каждой фазе и не считайте refund полученным до первой reward.</li>
              <li>Проверьте funded-правила новостей, overnight и weekend отдельно от evaluation-правил.</li>
              <li>Заранее проверьте KYC, имя платёжного метода и способ получения reward в фактической стране.</li>
            </ol>
            <div className="ru-actions">
              <Link href="/go/ftmo?from=ru-ftmo-review-checklist" rel="nofollow noopener" className="btn-outline">Официальный сайт FTMO</Link>
              <Link href="/ru/luchshie-prop-firmy" className="btn-primary">Сравнить глобальные фирмы <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Первичные источники: {sourceUrls.map((url, index) => <span key={url}>{index ? ' · ' : ''}<a href={url} target="_blank" rel="noopener noreferrer">страница {index + 1}</a></span>)}{' · '}<a href={COMPARISON_URL} target="_blank" rel="noopener noreferrer">сравнение продуктов</a>{' · '}<a href={PAYOUT_URL} target="_blank" rel="noopener noreferrer">выплаты</a>.</p>
            <p className="ru-source-line">Англоязычная проверка: <Link href="/blog/ftmo-review" hrefLang="en">FTMO review</Link>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="faq">
            <h2>Частые вопросы</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
