import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Database, ExternalLink } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import {
  challengeTierEconomics,
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
} from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-bright-funded'
const TITLE = 'Bright Funded: обзор 2026, цены, правила и выплаты'
const DESCRIPTION = 'Подробный обзор Bright Funded на русском: 18 цен в EUR, 3 программы, просадка, true cost, выплаты, 15% evaluation reward и проверка страны.'

const RULES_URL = 'https://help.brightfunded.com/en/articles/9241611-what-are-the-current-rules-for-the-evaluation-process'
const REWARD_URL = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account'
const NEWS_URL = 'https://help.brightfunded.com/en/articles/9241694-can-i-trade-news'
const REFUND_URL = 'https://help.brightfunded.com/en/articles/9460023-can-i-get-a-refund-for-my-brightfunded-challenge'
const COUNTRIES_URL = 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded'

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

function targets(product: Challenge) {
  if (!product.profitTargets) return 'без цели оценки'
  const values = [product.profitTargets.phase1, product.profitTargets.phase2, product.profitTargets.phase3]
    .filter((value): value is number => value != null)
  return values.length ? `${values.join('% / ')}%` : 'не опубликованы'
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая программа Bright Funded самая дешёвая?',
    a: 'В захвате от 27 августа 2026 года минимальная листинговая цена — €47 за 2-Step Bright на $5K. У программы две фазы с целями 8% и 5%, дневной лимит 4% и статический максимальный убыток 8%.',
  },
  {
    q: 'Bright Funded доступен русскоязычным трейдерам?',
    a: 'Язык сам по себе не ограничивает доступ. Опубликованный список запрещает регистрацию и покупку резидентам или гражданам Кубы, Ирана, Северной Кореи, Сирии, Вьетнама и Пакистана. Россия в списке не названа, но конкретный профиль всё равно должен пройти checkout, санкционную проверку и KYC.',
  },
  {
    q: 'Можно ли зарегистрироваться, проживая в России?',
    a: 'Россия отсутствует в опубликованном списке шести стран от 20 апреля 2026 года, но это не индивидуальное разрешение. До оплаты запросите письменное подтверждение поддержки для своего гражданства, резидентства, способа оплаты и будущего метода выплаты; VPN и неверные данные использовать нельзя.',
  },
  {
    q: 'У Bright Funded базовый сплит 90%?',
    a: 'Нет. Базовая доля составляет 80%. Доля 90% подключается как платное дополнение, а 100% относится к scaling plan и не является стартовым условием нового funded-счёта.',
  },
  {
    q: 'Как Bright Funded выплачивает reward?',
    a: 'Официальная справка указывает банковский перевод в EUR и криптовалюту USDC в сети ERC-20. Минимального reward нет: справка допускает запрос даже при $0.01, но комиссия банка, сети или обмена может сделать микровыплату невыгодной.',
  },
  {
    q: 'Что означает 15% Evaluation Profit Reward?',
    a: 'Это не автоматическая выплата после challenge. Сначала funded-счета должны набрать минимум 10% совокупного роста и получить одобренную выплату; затем 15% прибыли оценочных фаз добавляется к балансу нового funded-счёта и выводится в следующем цикле после одной активирующей сделки.',
  },
  {
    q: 'Можно ли торговать новости?',
    a: 'На этапах оценки новостная торговля не ограничена. На funded-счёте запрещено исполнение за 5 минут до и 5 минут после целевой важной новости: прибыль сделки вычитается, убыток остаётся, а событие считается soft breach. Для take profit сделки старше 48 часов опубликовано исключение.',
  },
  {
    q: 'Возвращается ли комиссия после прохождения challenge?',
    a: 'Автоматического возврата за прохождение в базовой цене нет. 100% challenge-fee refund — отдельное дополнение. Другая политика позволяет отменить неиспользованный счёт в течение 30 дней, только если на нём не было ни одной сделки.',
  },
]

export default function RussianBrightFundedReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'Bright Funded')
  const products = getChallengesByFirm('bright-funded')
  const freshProducts = products.filter(product => isChallengeFresh(product))
  const pricedTiers = freshProducts.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceEur != null && tier.priceEur > 0 ? [{ product, tier, price: tier.priceEur }] : []))
  const latestCapture = freshProducts.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? products.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? 'дата не указана'
  const sourceUrls = [...new Set(freshProducts.map(product => product.sourceUrl))]
  const oneStep = freshProducts.find(product => product.productSlug === 'bright-funded-1-step')
  const bright = freshProducts.find(product => product.productSlug === 'bright-funded-2-step-bright')
  const classic = freshProducts.find(product => product.productSlug === 'bright-funded-2-step-classic')
  const product100k = (product: Challenge | undefined) => product?.accountSizes.find(tier => tier.sizeUsd === 100000)
  const oneStep100k = product100k(oneStep)
  const bright100k = product100k(bright)
  const classic100k = product100k(classic)
  const minPrice = pricedTiers.length ? Math.min(...pricedTiers.map(item => item.price)) : null
  const maxPrice = pricedTiers.length ? Math.max(...pricedTiers.map(item => item.price)) : null

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Лучшие проп-фирмы', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Bright Funded' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2025-05-19',
    dateModified: latestCapture,
    author: { '@type': 'Person', name: 'Tara Mohseni' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-partner-review="bright-funded">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Bright Funded</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Условия проверены {latestCapture}</div>
          <h1>Bright Funded: обзор 2026 — 3 программы и 18 цен</h1>
          <p className="ru-lead">Bright Funded продаёт challenge в евро, а размер симулируемого счёта показывает в долларах. Главный выбор — не между «дешевле» и «дороже», а между 6% трейлинг-просадкой, 8% статикой и 10% статикой.</p>
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: Tara Mohseni</span>
            <span>Обновлено: {latestCapture}</span>
            <span>11 минут чтения</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{freshProducts.length}</strong><span>текущие программы</span></div>
            <div className="ru-stat"><strong>{pricedTiers.length}</strong><span>ценовых уровней</span></div>
            <div className="ru-stat"><strong>{eur(minPrice)}–{eur(maxPrice)}</strong><span>листинговые цены</span></div>
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
                <li><a href="#access">Доступ для русскоязычных трейдеров</a></li>
                <li><a href="#plans">Сравнение трёх программ</a></li>
                <li><a href="#prices">Все 18 цен</a></li>
                <li><a href="#true-cost">True cost в EUR</a></li>
                <li><a href="#payouts">Выплаты и 15% reward</a></li>
                <li><a href="#rules">Новости, удержание и возвраты</a></li>
                <li><a href="#diaspora">Евро-цена для русскоязычных за рубежом</a></li>
                <li><a href="#fit">Кому подходит Bright Funded</a></li>
                <li><a href="#register">Проверка перед регистрацией</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="verdict">Краткий вывод</h2>
            <p><strong>2-Step Bright — рациональная отправная точка по листинговой цене:</strong> {eur(bright?.accountSizes.find(tier => tier.sizeUsd === 5000)?.priceEur)} за $5K, цели {bright ? targets(bright) : '—'}, дневной лимит {bright?.dailyLossPct ?? '—'}% и {bright?.maxLossPct ?? '—'}% статического максимального убытка. Но экономия {minPrice != null ? eur(49 - minPrice) : '—'} относительно двух других стартовых планов не делает две фазы автоматически легче одной.</p>
            <p><strong>1-Step сокращает оценку, но двигает пол убытка.</strong> На $100K он стоит {eur(oneStep100k?.priceEur)}, требует {oneStep?.profitTargets?.phase1 ?? '—'}% и использует {oneStep?.maxLossPct ?? '—'}% трейлинг от максимальной equity. Classic на том же $100K стоит {eur(classic100k?.priceEur)}, оставляет {classic?.maxLossPct ?? '—'}% статического пространства, но требует две фазы и {classic?.profitTargets?.phase1 ?? '—'}% в первой.</p>
            <p>Для русскоязычного пользователя за пределами России Bright Funded интересен именно как глобальная EUR-priced фирма. Для резидента или гражданина любой страны решение начинается с опубликованного списка ограничений, KYC и доступного способа выплаты, а не с языка сайта.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="access">Доступ для России и русскоязычных трейдеров за рубежом</h2>
            <div className="ru-notice" data-russian-bright-country-access="published-list">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Россия не названа в опубликованном списке, но это не персональная гарантия.</strong>{' '}
              Статья Bright Funded от 20 апреля 2026 года запрещает покупку и регистрацию людям, которые проживают в или имеют гражданство Кубы, Ирана, Северной Кореи, Сирии, Вьетнама и Пакистана. Проверка применяется к резидентству и гражданству, поэтому адрес, документы и платёжный профиль должны совпадать.
            </div>
            <p>Русскоязычный трейдер в ЕС, Великобритании, Казахстане, ОАЭ, Израиле, Северной Америке или другой стране не должен выбирать ответ по языку. Перед оплатой нужно проверить точное гражданство и резидентство, затем пройти checkout своими данными и подтвердить доступный payout-метод. Мы не используем отсутствие страны в списке как обещание, что банк, санкционный фильтр или KYC примет конкретный профиль.</p>
            <p><a href={COUNTRIES_URL} target="_blank" rel="noopener noreferrer">Открыть официальный список ограниченных стран</a>. VPN, прокси, чужая карта или неверный адрес не являются способом получить доступ: несоответствие данных создаёт риск закрытия счёта и отказа в reward.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell">
            <div className="ru-content">
              <h2 id="plans">Сравнение трёх программ Bright Funded</h2>
              <p>Одинаковые 6 размеров счёта скрывают три разные геометрии риска. В таблице цена относится к уровню $100K, чтобы не смешивать изменение правил с изменением размера.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-bright-plan-matrix="three-products">
                <thead><tr><th>Программа</th><th>Цена $100K</th><th>Фазы / цели</th><th>Дневной лимит</th><th>Макс. убыток</th><th>Тип</th><th>Мин. дни</th><th>Базовый сплит</th></tr></thead>
                <tbody>
                  {freshProducts.map(product => (
                    <tr key={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{eur(product100k(product)?.priceEur)}</td>
                      <td>{product.phases}; {targets(product)}</td>
                      <td>{product.dailyLossPct ?? '—'}%</td>
                      <td>{product.maxLossPct ?? '—'}%</td>
                      <td>{product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : '—'}</td>
                      <td>{product.minTradingDays ?? '—'} на этап</td>
                      <td>{product.profitSplitPct ?? '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-content ru-prose-stack">
              <section><h3>1-Step: меньше этапов, меньше запас</h3><p>Одна цель {oneStep?.profitTargets?.phase1 ?? '—'}% выглядит быстрее двух фаз, но дневной лимит {oneStep?.dailyLossPct ?? '—'}% и трейлинг {oneStep?.maxLossPct ?? '—'}% реагируют на плавающий максимум. На $100K стартовый пол находится у $94K; если equity поднимется до $104K, граница сдвигается к $98K и не возвращается вниз.</p></section>
              <section><h3>2-Step Bright: ниже цена и цель первой фазы</h3><p>На $100K план стоит {eur(bright100k?.priceEur)}, на {eur((oneStep100k?.priceEur ?? 0) - (bright100k?.priceEur ?? 0))} меньше 1-Step и Classic. За это трейдер принимает две фазы, {bright?.maxLossPct ?? '—'}% статического максимального убытка и {bright?.dailyLossPct ?? '—'}% дневного лимита.</p></section>
              <section><h3>2-Step Classic: больше статического пространства</h3><p>Classic сохраняет пол $90K на счёте $100K при {classic?.maxLossPct ?? '—'}% максимального убытка и допускает {classic?.dailyLossPct ?? '—'}% в день. Компромисс — первая цель {classic?.profitTargets?.phase1 ?? '—'}% вместо {bright?.profitTargets?.phase1 ?? '—'}% у 2-Step Bright.</p></section>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell">
            <div className="ru-content">
              <h2 id="prices">Все {pricedTiers.length} листинговых цен</h2>
              <p>Счёт номинирован в USD, а challenge оплачивается в EUR. Таблица сохраняет валюту фирмы и не конвертирует её в рубли, тенге, дирхамы или доллары по курсу, который устареет после публикации.</p>
              <div className="ru-notice"><strong>Временная акция не стала базовой ценой.</strong> На момент захвата сайт показывал код B2B30 и скидку 30%. Ни одна промо-сумма не записана ниже как постоянный листинг; финальную сумму нужно проверять в checkout.</div>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-bright-price-count={pricedTiers.length}>
                <thead><tr><th>Программа</th><th>Размер</th><th>Цена EUR</th><th>Цели</th><th>Лимиты</th><th>Дата</th></tr></thead>
                <tbody>
                  {pricedTiers.map(({ product, tier, price }) => (
                    <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                      <td>{product.productName}</td>
                      <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                      <td>{eur(price)}</td>
                      <td>{targets(product)}</td>
                      <td>{product.dailyLossPct ?? '—'}% / {product.maxLossPct ?? '—'}% {product.drawdownType ? drawdownLabels[product.drawdownType] : ''}</td>
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
              <h2 id="true-cost">True cost: сколько EUR нужно вернуть через reward</h2>
              <p>Расчёт использует ту же функцию <Link href="/true-cost-of-prop-firm-challenges"><code>computeTrueCost()</code></Link>, что и английский обзор: листинговая цена делится на базовый сплит 80%. Это порог валовой прибыли для компенсации одного взноса, а не прогноз дохода.</p>
              <p>R-множитель не показан намеренно. Fee выражен в EUR, а лимит убытка — в USD; без текущего курса их нельзя честно делить друг на друга. Повторная попытка, платные дополнения, банковский FX и налог в расчёт не входят.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-bright-truecost={pricedTiers.length}>
                <thead><tr><th>Программа / счёт</th><th>Листинговый fee</th><th>Базовый сплит</th><th>Валовая прибыль до возврата fee</th></tr></thead>
                <tbody>
                  {pricedTiers.map(({ product, tier }) => {
                    const economics = challengeTierEconomics(product, tier)
                    return (
                      <tr key={`true-cost-${product.productSlug}-${tier.sizeUsd}`}>
                        <td>{product.productName} ${tier.sizeUsd.toLocaleString('en-US')}</td>
                        <td>{eur(economics?.minimumCost)}</td>
                        <td>{product.profitSplitPct ?? '—'}%</td>
                        <td>{eur(economics?.breakEvenProfit)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="ru-content">
              <p>Минимальный порог — {bright ? eur(challengeTierEconomics(bright, bright.accountSizes[0])?.breakEvenProfit) : '—'} для 2-Step Bright $5K. На $100K этот план требует {eur(bright && bright100k ? challengeTierEconomics(bright, bright100k)?.breakEvenProfit : null)}, а 1-Step и Classic — по {eur(oneStep && oneStep100k ? challengeTierEconomics(oneStep, oneStep100k)?.breakEvenProfit : null)}.</p>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-bright-payouts="eur-usdc">
            <h2 id="payouts">Выплаты: 30 дней, EUR или USDC и условные 15%</h2>
            <div className="ru-prose-stack">
              <section><h3>Срок первой и следующих выплат</h3><p>Справка указывает первый запрос через {freshProducts[0]?.payoutFirstDays ?? '—'} дней после первой funded-сделки, затем каждые 14 дней. Но та же страница называет bi-weekly режим дополнением. Это внутреннее противоречие Bright Funded: до покупки нужно получить подтверждение именно базового цикла выбранной конфигурации.</p></section>
              <section><h3>Два маршрута денег</h3><p>Банковский перевод обрабатывается в EUR, криптовыплата — в USDC по сети ERC-20. Опубликованного минимального reward нет: справка разрешает запрос от $0.01. Практически маленькая сумма всё равно может потерять заметную долю на банковской, сетевой или обменной комиссии.</p></section>
              <section><h3>15% Evaluation Profit Reward — не мгновенный cashback</h3><p>После минимум 10% совокупного роста на funded-счетах и одобренной выплаты Bright Funded создаёт новый funded-счёт, добавляя 15% прибыли оценочных фаз к его стартовому балансу. Бонус становится выводимым в следующем payout-цикле после одной активирующей сделки. Он не компенсирует fee сразу после прохождения challenge.</p></section>
              <section><h3>80%, 90% и 100% — три разных условия</h3><p>Новый funded-счёт стартует с 80%. Доля 90% — checkout add-on; 100% относится к scaling plan. Для сравнения true cost мы используем только базовые 80%, иначе расчёт подменил бы стартовое условие рекламным потолком.</p></section>
            </div>
            <p><a href={REWARD_URL} target="_blank" rel="noopener noreferrer">Проверить официальные условия reward и payout</a>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="rules">Новости, удержание, автоматизация и возвраты</h2>
            <div className="ru-prose-stack">
              <section><h3>Новостное окно действует только на funded-счёте</h3><p>Фазы 1 и 2 допускают торговлю вокруг новостей. После финансирования исполнение за 5 минут до и 5 минут после целевого high-impact события приводит к вычету прибыли, тогда как убыток остаётся; это soft breach, а не автоматическое закрытие счёта. Take profit сделки, открытой минимум за 48 часов, имеет опубликованное исключение.</p></section>
              <section><h3>Overnight и weekend разрешены</h3><p>Все 3 программы допускают удержание ночью и через выходные. Разрешение не отменяет swap, гэп и дневной или максимальный лимит. Swing-трейдеру особенно важно различать статическую границу 2-Step и двигающуюся equity-границу 1-Step.</p></section>
              <section><h3>EA и copy-trading разрешены не безусловно</h3><p>Автоматизация зависит от платформы, а копирование ограничено собственными счетами одного владельца. Сигналы третьих лиц и копирование чужого трейдера не следует считать разрешёнными только потому, что общий ярлык EA отмечен положительно.</p></section>
              <section><h3>Два разных вида возврата</h3><p>Обычная отмена возможна в течение 30 дней, только если на счёте не совершено ни одной сделки; обработка заявлена в течение 48 часов, зачисление — 3–10 рабочих дней. Возврат 100% challenge fee после прохождения — отдельный платный add-on и не включён в {eur(minPrice)}–{eur(maxPrice)}.</p></section>
            </div>
            <p><a href={RULES_URL} target="_blank" rel="noopener noreferrer">Правила evaluation</a>{' · '}<a href={NEWS_URL} target="_blank" rel="noopener noreferrer">Правило новостей</a>{' · '}<a href={REFUND_URL} target="_blank" rel="noopener noreferrer">Политика возврата</a></p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" data-russian-bright-diaspora="currency-first">
            <h2 id="diaspora">Что означает EUR-цена для русскоязычных за рубежом</h2>
            <p>Bright Funded отделяет валюту покупки от размера счёта: fee от {eur(minPrice)} до {eur(maxPrice)} списывается в евро, тогда как аккаунты маркируются $5K–$200K. Для человека с EUR-картой это убирает одну конверсию при покупке; для карты в другой валюте итог задаёт банк или платёжный провайдер.</p>
            <p>Маршрут выплаты тоже влияет на чистый результат. EUR bank transfer может быть удобнее пользователю с европейским банковским счётом, а USDC ERC-20 — пользователю с законным доступом к подходящему кошельку и off-ramp. Ни один маршрут не следует описывать как универсальный для «русских»: страна проживания, банк, налоговый статус и правила криптовалют различаются.</p>
            <p>Практический фильтр состоит из 5 шагов: проверить гражданство и резидентство, увидеть EUR-total в checkout, использовать платёжный метод на своё имя, заранее выбрать EUR bank или USDC, затем сохранить условия выбранных add-ons. Такой порядок повышает шанс, что регистрация дойдёт до KYC и выплаты, а не остановится после покупки.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="fit">Кому подходит и кому не подходит Bright Funded</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Подходит для статического риск-плана</h3><p>2-Step Bright даёт {bright?.maxLossPct ?? '—'}% статического максимального убытка при входе от {eur(bright?.accountSizes[0]?.priceEur)}. Classic повышает пространство до {classic?.maxLossPct ?? '—'}%, если первая цель {classic?.profitTargets?.phase1 ?? '—'}% укладывается в стратегию.</p></article>
              <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Подходит swing-трейдеру</h3><p>Overnight и weekend разрешены, а consistency percentage не опубликован. Тем не менее 10-минутное funded-окно новостей и swap должны быть заложены в торговый план.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не подходит при возврате floating profit</h3><p>1-Step отслеживает максимум equity в реальном времени. Стратегия, которая часто сначала показывает прибыль, а затем отдаёт её, может нарушить {oneStep?.maxLossPct ?? '—'}% trail раньше, чем статический лимит.</p></article>
              <article className="ru-card"><AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не подходит для новости или раннего cash flow</h3><p>News-scalper теряет funded-прибыль в 10-минутном окне. Трейдеру, которому нужна первая базовая выплата раньше 30 дней, следует сравнить глобальные фирмы с более коротким стандартным циклом.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="register">Проверка перед регистрацией</h2>
            <ol>
              <li>Выберите 1-Step, 2-Step Bright или Classic по просадке и целям, а не по слову «до 90%».</li>
              <li>Сверьте один из {pricedTiers.length} EUR-листингов и финальную сумму после B2B30 или другой текущей акции.</li>
              <li>Подтвердите гражданство, резидентство, KYC и совпадение имени владельца платежа.</li>
              <li>Проверьте базовый payout-cycle: в справке остаётся противоречие вокруг 14-дневного режима.</li>
              <li>Выберите EUR bank transfer или USDC ERC-20 и оцените комиссию до первой маленькой выплаты.</li>
            </ol>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="bright-funded">
              <strong>Партнёрское раскрытие.</strong> Мы можем получить комиссию, если подходящий читатель зарегистрируется через ссылку ниже. Партнёрство не меняет {freshProducts.length} продукта, {pricedTiers.length} цен, расчёт true cost или вывод по стране. Нельзя обходить ограничения VPN, прокси или неверными данными.
            </div>
            {firm?.affiliateUrl ? (
              <div className="ru-actions">
                <Link href="/go/bright-funded?from=ru-bright-funded-review-verdict" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                  Проверить страну и планы Bright Funded <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сравнить с FundedNext</Link>
                <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Все глобальные фирмы</Link>
              </div>
            ) : <p>Партнёрская ссылка не настроена; используйте рейтинг для сравнения.</p>}
            <p className="ru-source-line"><BadgeDollarSign size={14} aria-hidden="true" /> Переход проходит через контролируемый редирект Traders Fund Hub и помечен sponsored и nofollow.</p>
            <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Продуктовые источники: {sourceUrls.map((url, index) => <span key={url}>{index ? ' · ' : ''}<a href={url} target="_blank" rel="noopener noreferrer">страница {index + 1}</a></span>)}</p>
            <p className="ru-source-line">Подробная англоязычная проверка: <Link href="/blog/bright-funded-prop-firm" hrefLang="en">Bright Funded review</Link>.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="faq">Частые вопросы</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
