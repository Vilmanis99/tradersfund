import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Database,
  ExternalLink,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import cryptoMarketEvidence from '@/content/data/crypto-market-evidence.json'
import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  minimumCostToFundedUsd,
  type Challenge,
} from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import {
  getLanguageAlternates,
  getLocalizedRoutePair,
  russianRouteDateModified,
} from '@/lib/localizedRoutes'

const PATH = '/ru/luchshie-kripto-prop-firmy'
const TITLE = 'Крипто-проп-фирмы 2026: 3 проверенных варианта'
const DESCRIPTION = 'Проп трейдинг криптовалют: сравниваем 3 крипто-проп фирмы и 12 подтверждённых продуктов по цене, просадке, плечу, KYC и выплатам.'
const BRIGHT_REWARD_URL = 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'проп трейдинг криптовалют',
    'крипто проп фирма',
    'крипто проп компания',
    'проп трейдинг компании криптовалют',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const snapshots = cryptoMarketEvidence.ranked.flatMap(evidence => {
  const firm = getAllFirms().find(candidate => candidate.name === evidence.firmName)
  const products = getChallengesByFirm(evidence.firmSlug).filter(product =>
    evidence.productSlugs.includes(product.productSlug) && isChallengeFresh(product),
  )
  return firm && products.length === evidence.productSlugs.length
    ? [{ evidence, products, firm }]
    : []
}).sort((a, b) => {
  const aKey = (a.evidence.marketModel === 'crypto-native' ? 100 : 0) + a.firm.score
  const bKey = (b.evidence.marketModel === 'crypto-native' ? 100 : 0) + b.firm.score
  return bKey - aKey || a.firm.name.localeCompare(b.firm.name)
})

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function drawdownLabel(product: Challenge) {
  if (!product.drawdownType) return 'не опубликована'
  return drawdownLabels[product.drawdownType] ?? product.drawdownType
}

function valueRange(values: number[], suffix = '') {
  const unique = [...new Set(values)].sort((a, b) => a - b)
  if (!unique.length) return 'не опубликовано'
  return unique.length === 1
    ? `${unique[0]}${suffix}`
    : `${unique[0]}–${unique.at(-1)}${suffix}`
}

function splitLabel(products: Challenge[]) {
  return valueRange(products.flatMap(product =>
    product.profitSplitPct == null ? [] : [product.profitSplitPct]), '%')
}

function minimumKnownCost(products: Challenge[]) {
  const costs = products.flatMap(product => product.accountSizes.flatMap(tier => {
    const cost = minimumCostToFundedUsd(product, tier)
    return cost != null && cost > 0 ? [cost] : []
  }))
  return costs.length ? `$${Math.min(...costs).toLocaleString('en-US')}` : 'не опубликована'
}

function localizedReviewHref(reviewUrl: string) {
  return getLocalizedRoutePair(reviewUrl)?.ru ?? reviewUrl
}

function payoutGate(products: Challenge[]) {
  const days = products.flatMap(product =>
    product.payoutFirstDays == null ? [] : [product.payoutFirstDays])
  return days.length ? valueRange(days, ' дн.') : 'нужно проверить'
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая крипто-проп-фирма лучшая в 2026 году?',
    a: 'Единого победителя нет. FundedNext покрывает 4 текущих CFD-продукта одним опубликованным набором размеров криптоконтрактов; FundingPips подтверждает только 1 Step Flex с комиссией 0,04% и разным плечом на Phase 1 и Master; Maven публикует 4 криптопары и имеет 7 актуальных CFD-продуктов, но не является нашим партнёром.',
  },
  {
    q: 'Крипто-проп-фирма даёт реальные BTC или ETH?',
    a: 'Не обязательно. Все три варианта в рейтинге описывают торговые продукты или CFD-инструменты по первичному источнику. Размер условного счёта, Master Account или funded-этап не доказывает передачу трейдеру реальных BTC, ETH либо брокерского капитала.',
  },
  {
    q: 'Почему выплата в USDC не делает фирму крипто-проп-компанией?',
    a: 'Потому что торговый рынок и платёжный маршрут — разные факты. Bright Funded публикует выплату в USDC ERC-20, но его текущие структурированные продукты не подтверждают торговлю криптовалютой, поэтому он показан только как payout-альтернатива, а не участник крипторейтинга.',
  },
  {
    q: 'Можно ли держать криптопозиции на выходных?',
    a: 'Нельзя переносить разрешение базового крипторынка на правила проп-продукта. Нужно проверить weekend holding, время сервера, техническое обслуживание платформы и новостные ограничения на точном продукте. Например, текущий FundingPips 1 Step Flex и другие продукты фирмы нельзя считать одинаковыми только по логотипу.',
  },
  {
    q: 'Можно ли зарегистрироваться из России?',
    a: 'Русский язык и наличие криптоинструмента не подтверждают доступ. У FundedNext есть конфликтующие первичные формулировки о российских резидентах, а FundingPips применяет санкционные ограничения без доказательства успешного checkout, KYC и выплаты конкретному российскому профилю. До оплаты получите письменный ответ фирмы; VPN и неверные данные использовать нельзя.',
  },
  {
    q: 'Подходит ли FundingPips для криптотрейдинга?',
    a: 'Подтверждён только 1 Step Flex: источник указывает комиссию 0,04%, плечо 1:2 на Phase 1 и 1:1 на Master Account. Остальные 4 продукта FundingPips не наследуют это подтверждение автоматически.',
  },
  {
    q: 'Какие криптовалюты доступны у Maven?',
    a: 'Официальный FAQ называет BTCEUR, BTCUSD, ETHBTC и ETHUSD. Рейтинг связывает этот источник с 7 актуальными CFD-продуктами и исключает 2 Prediction Markets программы, потому что общий список CFD-инструментов не подтверждает их контракт.',
  },
  {
    q: 'Почему в рейтинге только 3 фирмы?',
    a: 'Фирма должна одновременно иметь свежий первичный источник крипторынка и свежие структурированные записи для каждого заявленного продукта. Ещё 7 фирм находятся ниже в evidence watch: двум нужны отдельные crypto-product записи, а пяти — повторный захват рынка или правил.',
  },
]

export default function RussianCryptoPropFirmsPage() {
  const productCount = snapshots.reduce((total, snapshot) => total + snapshot.products.length, 0)
  const partnerCount = snapshots.filter(snapshot => Boolean(snapshot.firm.affiliateUrl)).length
  const latestCapture = snapshots.map(snapshot => snapshot.evidence.sourceCapturedAt).sort().at(-1)
    ?? 'дата не указана'
  const lastModified = russianRouteDateModified(PATH, latestCapture)
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Крипто-проп-фирмы' },
  ])
  const list = itemListSchema(snapshots.map(snapshot => snapshot.firm), TITLE)
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: lastModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-crypto-hero="search-and-product-evidence">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Крипто</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Источники до {latestCapture}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            В этом рейтинге крипто-оплата отделена от торговли цифровыми активами: в сравнение входят только продукты,
            для которых первичный источник прямо подтверждает доступный крипторынок. Сейчас фильтр проходят
            {` ${snapshots.length} крипто-проп фирмы и ${productCount} продуктов`}; ещё {cryptoMarketEvidence.watch.length} кандидатов исключены до обновления доказательств.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные рейтинга крипто-проп-фирм">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
            <span>14 минут чтения</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{snapshots.length}</strong><span>фирмы с текущим crypto-market источником</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>точных продуктовых привязок</span></div>
            <div className="ru-stat"><strong>{partnerCount} из {snapshots.length}</strong><span>партнёрские фирмы; порядок не меняется</span></div>
            <div className="ru-stat"><strong>{cryptoMarketEvidence.watch.length}</strong><span>фирм в открытом evidence watch</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#ranking" className="btn-primary btn-glow">Сравнить 3 crypto-фирмы <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Выбрать по стране</Link>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-crypto-article="long-form">
        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <div className="ru-notice ru-disclosure ru-review-top-disclosure" data-russian-affiliate-disclosure="crypto-ranking">
              <strong>Партнёрское раскрытие.</strong> FundedNext и FundingPips имеют партнёрские ссылки; Maven — нет.
              Партнёрство даёт <strong>0 баллов</strong> к порядку, не добавляет продукт и не превращает crypto payout в торговый рынок.
              Мы можем получить комиссию после подходящей регистрации, но цена для читателя не увеличивается.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание рейтинга крипто-проп-фирм">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#country-check">Страна и KYC</a></li>
                <li><a href="#ranking">3 проверенные crypto-фирмы</a></li>
                <li><a href="#comparison">Сравнение 12 продуктов</a></li>
                <li><a href="#firm-decisions">Как выбрать по фирме</a></li>
                <li><a href="#crypto-risk">Комиссия, плечо и выходные</a></li>
                <li><a href="#payout-boundary">Торговля против USDC-выплаты</a></li>
                <li><a href="#evidence-watch">Почему исключены ещё 7 фирм</a></li>
                <li><a href="#alternatives">Следующий шаг</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="country-check">
          <div className="ru-shell">
            <div className="ru-notice" data-russian-country-boundary="crypto-not-access">
              <strong><AlertTriangle size={16} aria-hidden="true" /> Русский язык не означает доступность страны.</strong>{' '}
              Криптоинструмент не отменяет проверку гражданства, резидентства, KYC, санкций, checkout и будущей выплаты.
              Русскоязычный трейдер в Германии, Казахстане, Израиле, Великобритании или России проходит разные платёжные и compliance-маршруты;
              резиденту ОАЭ FundingPips прямо не подходит. VPN, прокси и неверные данные нельзя использовать для обхода ограничений.
            </div>
          </div>
        </section>

        <section className="ru-section" id="ranking">
          <div className="ru-shell" data-russian-crypto-ranking="source-gated" data-russian-crypto-product-count={productCount} data-russian-crypto-partner-count={partnerCount}>
            <div className="ru-content">
              <h2>Крипто-проп-фирмы с текущими продуктовыми доказательствами</h2>
              <p>Участник попадает ниже только при совпадении двух фактов: официальный источник называет криптовалюту торговым рынком, а каждая привязанная программа имеет свежую цену и правила. По этому фильтру 27 августа 2026 года доступны {snapshots.length} фирмы и {productCount} продуктов.</p>
            </div>
            <div className="ru-grid">
              {snapshots.map((snapshot, index) => {
                const { evidence, products, firm } = snapshot
                const affiliate = Boolean(firm.affiliateUrl)
                const productNames = products.map(product => product.productName)
                const drawdowns = [...new Set(products.map(drawdownLabel))]
                const reviewHref = localizedReviewHref(firm.reviewUrl)
                return (
                  <article className="ru-card" key={evidence.firmSlug} data-russian-crypto-firm={evidence.firmSlug} data-russian-crypto-commercial={affiliate ? 'partner' : 'independent'}>
                    <div className="ru-card-head">
                      <div>
                        <span className="ru-pill">#{index + 1} · {affiliate ? 'партнёр' : 'без партнёрской ссылки'}</span>
                        <h2>{firm.name}</h2>
                      </div>
                      <span className="ru-score">TFH {firm.score.toFixed(1)}/10</span>
                    </div>
                    <ul className="ru-facts">
                      <li><ShieldCheck size={14} aria-hidden="true" /> {products.length} продуктов: {productNames.slice(0, 3).join(', ')}{productNames.length > 3 ? ` и ещё ${productNames.length - 3}` : ''}</li>
                      <li><BadgeDollarSign size={14} aria-hidden="true" /> Минимальный известный полный путь: {minimumKnownCost(products)}; стартовый сплит {splitLabel(products)}</li>
                      <li><ShieldCheck size={14} aria-hidden="true" /> Просадка: {drawdowns.join(', ')}; первая выплата: {payoutGate(products)}</li>
                      <li><Database size={14} aria-hidden="true" /> {evidence.evidenceRu ?? evidence.evidence}</li>
                    </ul>
                    <p className="ru-muted">{evidence.scopeNoteRu ?? evidence.scopeNote}</p>
                    <div className="ru-actions">
                      <Link href={reviewHref} className="btn-outline">{reviewHref.startsWith('/ru/') ? 'Русский обзор' : 'Английский обзор'}</Link>
                      <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Источник <ExternalLink size={13} aria-hidden="true" /></a>
                      {affiliate ? (
                        <Link href={`/go/${evidence.firmSlug}?from=ru-crypto-ranking`} rel="sponsored nofollow noopener" className="btn-primary">
                          Проверить текущие условия <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="ru-section" id="comparison">
          <div className="ru-shell" data-russian-crypto-comparison="three-firms-twelve-products">
            <div className="ru-content">
              <h2>Сравнение 3 фирм и 12 crypto-mapped продуктов</h2>
              <p>Минимальная стоимость ниже использует полный известный путь из структурированных строк, поэтому $5 первоначального платежа Buy Now, Pay Later у Maven не выдаётся за итоговую цену. Диапазон сплита и просадки относится только к продуктам, связанным с криптоисточником.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Модель</th><th>Продукты</th><th>Мин. полный путь</th><th>Стартовый сплит</th><th>Просадка</th><th>Коммерческий статус</th></tr></thead>
                <tbody>
                  {snapshots.map(({ evidence, products, firm }) => (
                    <tr key={evidence.firmSlug}>
                      <td><strong>{firm.name}</strong></td>
                      <td>{evidence.marketModel === 'crypto-native' ? 'крипто-нативная' : 'мультиактивный CFD'}</td>
                      <td>{products.length}</td>
                      <td>{minimumKnownCost(products)}</td>
                      <td>{splitLabel(products)}</td>
                      <td>{[...new Set(products.map(drawdownLabel))].join(', ')}</td>
                      <td>{firm.affiliateUrl ? 'партнёр' : 'без комиссии TFH'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="firm-decisions">
          <div className="ru-shell ru-content" data-russian-crypto-decision-guide="product-not-logo">
            <h2>Как выбрать между FundedNext, FundingPips и Maven</h2>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>FundedNext: 4 продукта под одним instrument source</h3>
                <p>Источник публикует размеры криптоконтрактов 1, 100 и 1 000 в зависимости от пары и говорит, что они применяются ко всем счетам. Поэтому Stellar 2-Step, Stellar 1-Step, Stellar Lite и Stellar Instant проходят фильтр, но их цели, лимиты и календарь payout остаются разными.</p>
                <Link href="/ru/obzor-fundednext" className="ru-card-link">Открыть 22 цены и 4 набора правил →</Link>
              </article>
              <article className="ru-card">
                <h3>FundingPips: только 1 Step Flex</h3>
                <p>Текущий источник указывает 0,04% комиссии за крипто, плечо 1:2 на Phase 1 и 1:1 на Master Account. Это важнее общего логотипа: Zero, Pro, Standard и 2 Step Flex не получают crypto-eligibility без собственного подтверждения.</p>
                <Link href="/ru/obzor-fundingpips" className="ru-card-link">Открыть полный русский обзор →</Link>
              </article>
              <article className="ru-card">
                <h3>Maven: 4 пары и 7 CFD-программ</h3>
                <p>FAQ называет BTCEUR, BTCUSD, ETHBTC и ETHUSD. Мы привязываем 7 CFD-программ, но исключаем 2 Prediction Markets продукта. Maven не платит нам комиссию, поэтому его место показывает, что партнёрский статус не является условием рейтинга.</p>
                <Link href="/blog/maven-prop-firm-review" hrefLang="en" className="ru-card-link">Открыть английский обзор →</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="crypto-risk">
          <div className="ru-shell ru-content">
            <h2>Комиссия, плечо, выходные и просадка важнее числа пар</h2>
            <p><strong>Комиссия.</strong> Процент от номинала сделки может сделать частый скальпинг дороже фиксированной комиссии Forex. FundingPips прямо публикует формулу 0,04% от lot size × crypto price; пользователь должен считать оборот стратегии, а не только цену челленджа.</p>
            <p><strong>Плечо.</strong> Плечо меняется между стадиями: у подтверждённого FundingPips 1 Step Flex оно снижается с 1:2 на Phase 1 до 1:1 на Master. Одинаковый BTCUSD-сигнал поэтому может требовать другой размер позиции после прохождения.</p>
            <p><strong>Выходные.</strong> Базовый крипторынок работает непрерывно, но проп-платформа может закрываться на обслуживание, запрещать weekend holding или расширять spread. Разрешение на инструмент не равно разрешению переносить позицию с пятницы на понедельник.</p>
            <p><strong>Просадка.</strong> Среди 12 строк встречаются статическая и трейлинг-механика. При трейлинге новая equity-high может подтянуть линию нарушения; сравнивать такой продукт только по 5% или 10% без reference point нельзя.</p>
          </div>
        </section>

        <section className="ru-section" id="payout-boundary">
          <div className="ru-shell ru-content" data-russian-crypto-payout-boundary="bright-funded-not-ranked">
            <h2>Торговля криптовалютой и выплата в USDC — разные маршруты</h2>
            <p>Bright Funded публикует выплату reward в USDC по сети ERC-20 и банковский перевод в EUR. Однако 3 текущие структурированные программы не имеют отдельного первичного подтверждения криптоинструментов. Поэтому Bright Funded не занимает строку в рейтинге crypto trading, но остаётся коммерчески релевантной альтернативой для трейдера, которому важна именно криптовалютная выплата после торговли другими CFD.</p>
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрская payout-альтернатива.</strong> Переход ниже может принести нам комиссию. Он не добавляет Bright Funded к трём crypto-market фирмам и не доказывает доступность USDC для каждого резидентства.
            </div>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright Funded</Link>
              <a href={BRIGHT_REWARD_URL} target="_blank" rel="nofollow noopener" className="btn-outline">Официальные reward methods</a>
              <Link href="/go/bright-funded?from=ru-crypto-ranking-payout-alternative" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить payout-альтернативу <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="evidence-watch">
          <div className="ru-shell" data-russian-crypto-watch-count={cryptoMarketEvidence.watch.length}>
            <div className="ru-content">
              <h2>Почему ещё 7 известных фирм не входят в текущий рейтинг</h2>
              <p>Исключение не означает обвинение или постоянный запрет. Оно означает, что один из двух обязательных слоёв — рынок либо продуктовые строки — не проходит 30-дневное окно. Мы не оставляем старую карточку только ради более длинного списка.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Статус</th><th>Последний источник</th><th>Что требуется</th></tr></thead>
                <tbody>
                  {cryptoMarketEvidence.watch.map(item => (
                    <tr key={item.firmSlug}>
                      <td><strong>{item.firmName}</strong></td>
                      <td>{item.status === 'product-capture-needed' ? 'нужен crypto-product capture' : 'нужно обновить рынок или продукты'}</td>
                      <td><a href={item.sourceUrl} target="_blank" rel="nofollow noopener">{item.sourceCapturedAt}</a></td>
                      <td>{item.status === 'product-capture-needed'
                        ? 'Отдельные криптопродукты нельзя наследовать от Forex-строк.'
                        : 'Старые числа скрыты до повторного захвата первичных правил.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="alternatives">
          <div className="ru-shell ru-content">
            <h2>Следующий шаг для русскоязычного криптотрейдера</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={21} color="var(--accent-light)" aria-hidden="true" /><h3>1. Сначала страна</h3><p>Проверьте резидентство, гражданство, KYC, способ оплаты и будущую выплату. Язык интерфейса и crypto wallet ничего не гарантируют.</p><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="ru-card-link">Маршруты для диаспоры →</Link></article>
              <article className="ru-card"><BadgeDollarSign size={21} color="var(--accent-light)" aria-hidden="true" /><h3>2. Затем точный продукт</h3><p>Сравните полный известный cost, drawdown reference, комиссию, плечо, profitable days и payout gate.</p><Link href="/ru/luchshie-prop-firmy" className="ru-card-link">Общий рейтинг продуктов →</Link></article>
              <article className="ru-card"><WalletCards size={21} color="var(--accent-light)" aria-hidden="true" /><h3>3. Только потом checkout</h3><p>Откройте официальный источник ещё раз и сохраните письменный ответ поддержки, если страна или метод выплаты не названы прямо.</p><Link href="/ru/prop-firmy-bez-kyc" className="ru-card-link">Проверка KYC →</Link></article>
            </div>
            <div className="ru-review-author" aria-label="Автор рейтинга крипто-проп-фирм">
              <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
              <div>
                <strong>Автор: Edris Derakhshi</strong>
                <p>Основатель Traders Fund Hub, funded-трейдер с 2020 года и рыночный аналитик. В этом рейтинге партнёрская комиссия отделена от market eligibility, порядка и продуктовых чисел.</p>
                <Link href="/authors/edris-derakhshi">Профиль автора</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
