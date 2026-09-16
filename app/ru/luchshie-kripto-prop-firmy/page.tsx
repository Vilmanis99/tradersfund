import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
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
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
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
const TITLE = 'Крипто-проп-фирмы 2026: цены, инструменты и правила'
const DESCRIPTION = 'Проп-трейдинг криптовалют: сравнение программ по датированным источникам, комиссии, плечо, просадка, выплаты и проверка доступа из своей страны.'
// Preserve existing sharing-preview text until the separate sharing update is approved.
const SOCIAL_TITLE = 'Крипто-проп-фирмы 2026: 3 проверенных варианта'
const SOCIAL_DESCRIPTION = 'Проп трейдинг криптовалют: сравниваем 3 крипто-проп фирмы и 12 подтверждённых продуктов по цене, просадке, плечу, KYC и выплатам.'
export const revalidate = 3600

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
  openGraph: { title: SOCIAL_TITLE, description: SOCIAL_DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: SOCIAL_TITLE, description: SOCIAL_DESCRIPTION },
}

function freshEvidence(evidence: { sourceCapturedAt: string }) {
  const date = evidence.sourceCapturedAt
  const parsed = new Date(`${date}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    && isChallengeFresh(evidence)
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function drawdownLabel(product: Challenge) {
  if (!product.drawdownType) return 'не подтверждена'
  return drawdownLabels[product.drawdownType] ?? product.drawdownType
}

function valueRange(values: number[], suffix = '') {
  const unique = [...new Set(values)].sort((a, b) => a - b)
  if (!unique.length) return 'не подтверждено'
  return unique.length === 1
    ? `${unique[0]}${suffix}`
    : `${unique[0]}–${unique.at(-1)}${suffix}`
}

function splitLabel(products: Challenge[]) {
  const values = products.flatMap(product => product.profitSplitPct == null ? [] : [product.profitSplitPct])
  return `${valueRange(values, '%')}${values.length && values.length < products.length ? '; часть условий не подтверждена' : ''}`
}

function minimumKnownCost(products: Challenge[]) {
  const costs = products.flatMap(product => product.accountSizes.flatMap(tier => {
    const cost = minimumCostToFundedUsd(product, tier)
    return cost != null && cost > 0 ? [cost] : []
  }))
  return costs.length ? `$${Math.min(...costs).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'не подтверждены'
}

function localizedReviewHref(reviewUrl: string) {
  return getLocalizedRoutePair(reviewUrl)?.ru ?? reviewUrl
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какая крипто-проп-фирма лучшая в 2026 году?',
    a: 'Единого победителя нет: сравнивайте конкретную программу, инструмент и этап. В датированном разборе FundedNext публикует размеры криптоконтрактов для всех счетов, FundingPips отдельно описывает 1 Step Flex, а Maven перечисляет четыре криптовалютные пары. В таблицу попадают только программы с актуальными источниками и известными ценами.',
  },
  {
    q: 'Крипто-проп-фирма даёт реальные BTC или ETH?',
    a: 'Не обязательно. Симулированный счёт или CFD на BTCUSD не означает передачу биткоинов на ваш кошелёк. Название следующего этапа, включая Master Account, также не доказывает, что трейдер получил реальные активы или брокерский капитал.',
  },
  {
    q: 'Почему выплата в USDC не делает фирму крипто-проп-компанией?',
    a: 'Потому что способ получения денег не определяет торговый инструмент. В проверенной справке Bright Funded указан перевод в USDC по сети ERC-20. Здесь фирма рассматривается отдельно как вариант выплаты в криптовалюте: подтверждённой связки её программ с криптоинструментами для этого рейтинга пока нет.',
  },
  {
    q: 'Можно ли держать криптопозиции на выходных?',
    a: 'Только если это разрешено правилами выбранной программы и этапа. Круглосуточный базовый рынок не отменяет расписание терминала, обслуживание и ограничения переноса позиций. Проверяйте оценочный и следующий этап отдельно.',
  },
  {
    q: 'Можно ли зарегистрироваться из России?',
    a: 'По языку статьи этого определить нельзя. До оплаты проверьте ограничения фирмы и платформы по гражданству и проживанию, документы для KYC, способ платежа и будущей выплаты. Наличие криптокошелька не заменяет эти проверки; при неясных условиях получите письменный ответ фирмы.',
  },
  {
    q: 'Подходит ли FundingPips для криптотрейдинга?',
    a: 'В этом сравнении источник связан только с 1 Step Flex: указаны комиссия 0,04%, плечо 1:2 на оценке и 1:1 на счёте Master Account. Это временное правило из датированной справки; другие программы фирмы не наследуют его автоматически.',
  },
  {
    q: 'Какие криптовалюты доступны у Maven?',
    a: 'В проверенной справке перечислены BTCEUR, BTCUSD, ETHBTC и ETHUSD. Это список инструментов для рассматриваемых CFD-программ, а не доказательство таких же контрактов в отдельных программах Prediction Markets. Перед торговлей проверьте символ в своей платформе.',
  },
  {
    q: 'Почему в сравнении нет некоторых известных фирм?',
    a: 'Одного названия фирмы или выплаты в криптовалюте недостаточно. Нужны актуальное подтверждение торговых инструментов и проверенные цены и правила каждой заявленной программы. Неполные проверки перечислены отдельно; это не обвинение фирмы и не вывод о закрытии её услуг.',
  },
]

export default function RussianCryptoPropFirmsPage() {
  const firms = getAllFirms()
  const mapped = cryptoMarketEvidence.ranked.map(evidence => ({
    evidence,
    firm: firms.find(candidate => candidate.name === evidence.firmName),
    products: getChallengesByFirm(evidence.firmSlug).filter(product => evidence.productSlugs.includes(product.productSlug)),
  }))
  // Re-evaluate on every render: newer prices cannot renew old instrument evidence.
  const snapshots = mapped.flatMap(({ evidence, firm, products }) =>
    firm && freshEvidence(evidence) && evidence.productSlugs.length > 0
      && products.length === evidence.productSlugs.length
      && products.every(product => freshEvidence(product)
        && product.accountSizes.some(tier => (minimumCostToFundedUsd(product, tier) ?? 0) > 0))
      ? [{ evidence, firm, products }] : [],
  ).sort((a, b) => {
    const aKey = (a.evidence.marketModel === 'crypto-native' ? 100 : 0) + a.firm.score
    const bKey = (b.evidence.marketModel === 'crypto-native' ? 100 : 0) + b.firm.score
    return bKey - aKey || a.firm.name.localeCompare(b.firm.name)
  })
  const payoutEvidence = cryptoMarketEvidence.payoutAlternative
  const evidenceDates = [
    ...mapped.flatMap(({ evidence, products }) => [
      { label: `инструменты ${evidence.firmName}`, capturedAt: evidence.sourceCapturedAt },
      { label: `цены и правила ${evidence.firmName}`, capturedAt: products.length === evidence.productSlugs.length
        ? products.map(product => product.sourceCapturedAt).sort()[0] ?? '' : '' },
    ]),
    { label: 'способы выплаты Bright Funded', capturedAt: payoutEvidence.sourceCapturedAt },
  ]
  const hasFreshEvidence = mapped.length > 0 && snapshots.length === mapped.length && freshEvidence(payoutEvidence)
  const productCount = snapshots.reduce((total, snapshot) => total + snapshot.products.length, 0)
  const partnerCount = snapshots.filter(snapshot => Boolean(snapshot.firm.affiliateUrl)).length
  const lastModified = russianRouteDateModified(PATH, '2026-09-08')
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Крипто-проп-фирмы' },
  ])
  const list = itemListSchema(snapshots.map(snapshot => ({ ...snapshot.firm, reviewUrl: localizedReviewHref(snapshot.firm.reviewUrl) })), TITLE)
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
      {snapshots.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list) }} />}
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-crypto-hero="search-and-product-evidence">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Крипто</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> От криптоинструмента к условиям счёта</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Сравниваем программы для торговли криптоинструментами: стоимость участия, комиссии, кредитное плечо
            и ограничения риска. Отдельно разбираем выплаты в криптовалюте и доступ из своей страны — это разные вопросы.
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные рейтинга крипто-проп-фирм">
            <span>Автор: Edris Derakhshi</span>
            <span>Обновлено: {lastModified}</span>
          </div>
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-stats">
            <div className="ru-stat"><strong>{snapshots.length}</strong><span>фирм с актуальными источниками в сравнении</span></div>
            <div className="ru-stat"><strong>{productCount}</strong><span>программ с известными ценами</span></div>
            <div className="ru-stat"><strong>{partnerCount} из {snapshots.length}</strong><span>партнёрские фирмы; порядок не меняется</span></div>
            <div className="ru-stat"><strong>{cryptoMarketEvidence.watch.length}</strong><span>незавершённых проверок других фирм</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#ranking" className="btn-primary">Открыть сравнение <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Выбрать по стране</Link>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-crypto-article="long-form">
        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <div className="ru-notice ru-disclosure ru-review-top-disclosure" data-russian-affiliate-disclosure="crypto-ranking">
              <strong>Партнёрские ссылки.</strong> Мы можем получить комиссию при переходе к партнёру.
              Она даёт <strong>0 баллов</strong> в сравнении и не подтверждает условия программы.
              Коммерческий статус указан возле каждой фирмы; Bright Funded рассматривается отдельно от крипторейтинга.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание рейтинга крипто-проп-фирм">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#country-check">Страна и KYC</a></li>
                <li><a href="#ranking">Фирмы с актуальными источниками</a></li>
                <li><a href="#comparison">Цены и условия программ</a></li>
                <li><a href="#firm-decisions">Как выбрать по фирме</a></li>
                <li><a href="#crypto-risk">Комиссия, плечо и выходные</a></li>
                <li><a href="#payout-boundary">Торговля против USDC-выплаты</a></li>
                <li><a href="#evidence-watch">Незавершённые проверки</a></li>
                <li><a href="#sources">Первичные источники</a></li>
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
              До оплаты проверьте гражданство, страну проживания, документы для KYC, ограничения фирмы и платформы,
              способы платежа и выплаты. Русскоязычным трейдерам в разных странах могут быть доступны разные условия.
              Не используйте ложные документы или неверные сведения для обхода ограничений.{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">Как проверить доступ из своей страны →</Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="ranking">
          <div className="ru-shell" data-russian-crypto-ranking="source-gated" data-russian-crypto-product-count={productCount} data-russian-crypto-partner-count={partnerCount}>
            <div className="ru-content">
              <h2>Фирмы с актуальными источниками по криптопрограммам</h2>
              <p>Для включения нужны два подтверждения: фирма публикует криптоинструменты для рассматриваемых программ, а цены и правила каждой из них проверены в пределах 30 дней. Сейчас в выборке: фирм — {snapshots.length}, программ — {productCount}. Это не проверка надёжности будущей выплаты и не разрешение зарегистрироваться из любой страны.</p>
              {!snapshots.length && <p className="ru-notice" data-russian-crypto-empty="recapture-required">Сейчас нет полной выборки со свежими источниками и известными ценами. Ниже сохранён датированный разбор правил; актуальные числовые карточки появятся после повторной проверки. <Link href="/ru/luchshie-prop-firmy#podbor">Открыть общий подбор программ →</Link></p>}
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
                      <li><ShieldCheck size={14} aria-hidden="true" /> {products.length} программ: {productNames.slice(0, 3).join(', ')}{productNames.length > 3 ? ` и ещё ${productNames.length - 3}` : ''}</li>
                      <li><BadgeDollarSign size={14} aria-hidden="true" /> Минимальные известные расходы в USD: {minimumKnownCost(products)}; начальная доля вознаграждения: {splitLabel(products)}</li>
                      <li><ShieldCheck size={14} aria-hidden="true" /> Просадка: {drawdowns.join(', ')}. Срок выплаты зависит от программы и условий запроса — см. обзор.</li>
                      <li><Database size={14} aria-hidden="true" /> {evidence.evidenceRu ?? evidence.evidence}</li>
                    </ul>
                    <p className="ru-muted">{evidence.scopeNoteRu ?? evidence.scopeNote}</p>
                    <p className="ru-source-line">Инструменты: {evidence.sourceCapturedAt}. Самая ранняя проверка цен и правил: {products.map(product => product.sourceCapturedAt).sort()[0]}.</p>
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
          <div className="ru-shell" data-russian-crypto-comparison="current-source-mapped-products">
            <div className="ru-content">
              <h2>Сравнение стоимости и правил</h2>
              <p>Показаны минимальные известные расходы в USD по программам из выборки, а не только рекламный первый платёж. Для Buy Now, Pay Later у Maven учитывается и обязательная доплата. У подписки минимум предполагает прохождение за первый платёжный период; повторные попытки, дополнительные периоды и опции увеличат расходы. Здесь нет прогноза прибыли или окупаемости.</p>
            </div>
            {snapshots.length > 0 && <div className="ru-table-wrap" role="region" aria-label="Сравнение криптопрограмм — таблицу можно прокрутить" tabIndex={0}>
              <table className="ru-table">
                <thead><tr><th scope="col">Фирма</th><th scope="col">Модель</th><th scope="col">Программы</th><th scope="col">Известные расходы, USD</th><th scope="col">Начальная доля</th><th scope="col">Просадка</th><th scope="col">Коммерческий статус</th></tr></thead>
                <tbody>
                  {snapshots.map(({ evidence, products, firm }) => (
                    <tr key={evidence.firmSlug}>
                      <td><strong>{firm.name}</strong></td>
                      <td>{evidence.marketModel === 'crypto-native' ? 'криптовалютные инструменты' : 'CFD на разные рынки'}</td>
                      <td>{products.length}</td>
                      <td>{minimumKnownCost(products)}</td>
                      <td>{splitLabel(products)}</td>
                      <td>{[...new Set(products.map(drawdownLabel))].join(', ')}</td>
                      <td>{firm.affiliateUrl ? 'партнёр' : 'без комиссии TFH'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        </section>

        <section className="ru-section" id="firm-decisions">
          <div className="ru-shell ru-content" data-russian-crypto-decision-guide="product-not-logo">
            <h2>Как выбрать между FundedNext, FundingPips и Maven</h2>
            <p className="ru-source-line">Разбор ниже относится к датам источников в конце статьи. Отсутствие фирмы в текущей таблице не удаляет её исторический разбор и не подтверждает закрытие программы.</p>
            <div className="ru-grid">
              <article className="ru-card">
                <h3>FundedNext: один список инструментов, разные правила счетов</h3>
                <p>Справка указывает размеры криптоконтрактов 1, 100 и 1 000 в зависимости от пары и распространяет спецификации на все счета. В нашем разборе это Stellar 2-Step, Stellar 1-Step, Stellar Lite и Stellar Instant. Общий инструмент не делает их одинаковыми: число оценочных этапов, просадка и условия вознаграждения различаются.</p>
                <Link href="/ru/obzor-fundednext" className="ru-card-link">Цены и правила FundedNext →</Link>
              </article>
              <article className="ru-card">
                <h3>FundingPips: только 1 Step Flex</h3>
                <p>Справка 1 Step Flex указывает комиссию 0,04%, плечо 1:2 на оценке и 1:1 на следующем счёте Master Account. Изменение плеча названо временным. Для Zero, Pro, Standard и 2 Step Flex нужны отдельные подтверждения — нельзя перенести на них условия этого документа.</p>
                <Link href="/ru/obzor-fundingpips" className="ru-card-link">Открыть полный русский обзор →</Link>
              </article>
              <article className="ru-card">
                <h3>Maven: четыре пары в справке по инструментам</h3>
                <p>FAQ перечисляет BTCEUR, BTCUSD, ETHBTC и ETHUSD. Важно проверить валюту котировки: BTCUSD и BTCEUR — не один и тот же контракт. Отдельные программы Prediction Markets не включены: список CFD-инструментов не подтверждает их условия. Партнёрский статус отмечается в карточке и не влияет на порядок сравнения.</p>
                <Link href="/blog/maven-prop-firm-review" hrefLang="en" className="ru-card-link">Открыть английский обзор →</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="crypto-risk">
          <div className="ru-shell ru-content">
            <h2>Комиссия, плечо, выходные и просадка важнее числа пар</h2>
            <p><strong>Комиссия.</strong> В примере FundingPips один лот ETH/USD при цене $2 600 даёт комиссию $1,04 по формуле «объём × цена × 0,04%». Это опубликованный пример расчёта, не результат торговли. Уточните, как учитываются открытие и закрытие сделки, спред и перенос позиции; одна цифра комиссии не описывает все расходы стратегии.</p>
            <p><strong>Плечо.</strong> Большее плечо уменьшает требуемую маржу для той же позиции, но не увеличивает разрешённый убыток. У 1 Step Flex условия оценки и следующего счёта различаются, поэтому расчёт позиции нужно проверить заново после перехода. Размер условного счёта также не является личным капиталом трейдера.</p>
            <p><strong>Выходные.</strong> Работа базового крипторынка не гарантирует непрерывную работу терминала. Проверьте обслуживание, спред, перенос открытых позиций и требования закрыться перед выходными. У разрешения торговать BTCUSD и разрешения держать сделку до понедельника разные основания.</p>
            <p><strong>Просадка.</strong> При статическом лимите общий порог привязан к исходной базе; при следящем лимите он может подниматься за результатом счёта. Узнайте, используется баланс или стоимость счёта с открытой прибылью и убытком, когда пересчитывается порог и что происходит после выплаты. Сам процент без этой механики недостаточен для выбора.</p>
          </div>
        </section>

        <section className="ru-section" id="payout-boundary">
          <div className="ru-shell ru-content" data-russian-crypto-payout-boundary="bright-funded-not-ranked">
            <h2>Торговля криптовалютой и выплата в USDC — разные маршруты</h2>
            <p>Для Bright Funded мы отдельно проверили способы вознаграждения, а не торговлю криптоинструментами. В справке перечислены USDC по сети ERC-20 и банковский перевод в EUR. Пока точная связка программы и криптоинструмента не подтверждена, этот способ перевода не даёт фирме место в таблице криптопрограмм.</p>
            <p className="ru-source-line" data-russian-crypto-payout-status={freshEvidence(payoutEvidence) ? 'dated' : 'recapture-required'}>Источник по способам выплаты: {payoutEvidence.sourceCapturedAt || 'дата не подтверждена'}. {!freshEvidence(payoutEvidence) && 'Проверка устарела или дата недостоверна: описание выше является датированным разбором, а не подтверждением действующих способов перевода.'}</p>
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрская ссылка.</strong> Переход ниже может принести нам комиссию. Это не добавляет Bright Funded в крипторейтинг и не подтверждает возможность получить USDC в каждой стране. До оплаты проверьте доступность метода для своих документов и места проживания.
            </div>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright Funded</Link>
              <a href={payoutEvidence.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальная справка о выплатах</a>
              <Link href="/go/bright-funded?from=ru-crypto-ranking-payout-alternative" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить условия Bright Funded <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="evidence-watch">
          <div className="ru-shell" data-russian-crypto-watch-count={cryptoMarketEvidence.watch.length}>
            <div className="ru-content">
              <h2>Какие проверки ещё не завершены</h2>
              <p>Для перечисленных ниже фирм не хватает проверки отдельных криптопрограмм либо актуальных сведений об инструментах и условиях. Это не обвинение фирмы, не подтверждение отсутствия криптоторговли и не вывод о закрытии услуги. Причина указана отдельно для каждого случая.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Статус</th><th>Источник по рынкам</th><th>Что требуется</th></tr></thead>
                <tbody>
                  {cryptoMarketEvidence.watch.map(item => (
                    <tr key={item.firmSlug}>
                      <td><strong>{item.firmName}</strong></td>
                      <td>{item.status === 'product-capture-needed' ? 'нужна проверка отдельных криптопрограмм' : 'нужно обновить рынок или продукты'}</td>
                      <td><a href={item.sourceUrl} target="_blank" rel="nofollow noopener">{item.sourceCapturedAt}</a></td>
                      <td>{'nextStepRu' in item && item.nextStepRu ? item.nextStepRu : item.status === 'product-capture-needed'
                        ? 'Отдельные криптопрограммы нельзя оценивать по ценам и правилам валютных счетов.'
                        : 'Нужна повторная проверка первичных источников, прежде чем использовать старые условия в сравнении.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ru-content" data-russian-crypto-cft-correction="2026-09-08">
              <h3>Crypto Fund Trader: что исправили 8 сентября</h3>
              <p>Повторно проверили 15 базовых цен в трёх программах: Evaluation, Accelerated и Instant. Это не подтверждает доступность каждого криптоинструмента на каждой платформе. Пока связка «программа — платформа — рынок» не проверена отдельно, CFT остаётся вне этого крипторейтинга.</p>
              <p>В проверенных начальных вариантах Instant доля вознаграждения составляет 50%, а не 80% стандартных оценочных программ. Для общего порядка запроса указаны 15 торговых дней или 30 календарных дней; отдельный путь Instant без минимального числа дней требует 10% симулированной прибыли и запроса на выплату с переходом на следующий уровень. Это не обещание немедленного перевода денег.</p>
              <p>Ascend завершается фиксированным вознаграждением после оценки, а не обычным счётом с постоянной долей прибыли. У Ascend и Break расходятся опубликованные цены; страница Break также показывает отсутствие в продаже. Поэтому их цены входа не подтверждены, а даты полной проверки остаются 27 июля. Это не вывод о закрытии программ и не подтверждение регистрации из какой-либо страны.</p>
              <p className="ru-source-line">Это датированное исправление нашего материала, не установленная дата изменения правил фирмы. Официальные источники и нерешённые вопросы перечислены в журнале; перед оплатой проверьте условия заново.</p>
              <div className="ru-actions">
                <Link href="/blog/crypto-fund-trader-review" hrefLang="en" className="btn-outline">Полный обзор CFT — на английском</Link>
                <Link href="/prop-firm-challenge-changes?products=crypto-fund-trader%3Ainstant%2Ccrypto-fund-trader%3Aascend%2Ccrypto-fund-trader%3Abreak#change-ledger" hrefLang="en" className="ru-card-link">Источники исправлений — на английском →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="alternatives">
          <div className="ru-shell ru-content">
            <h2>Следующий шаг для русскоязычного криптотрейдера</h2>
            <div className="ru-grid">
              <article className="ru-card"><CheckCircle2 size={21} color="var(--accent-light)" aria-hidden="true" /><h3>1. Сначала страна</h3><p>Уточните гражданство, проживание, документы и доступные способы платежа и выплаты. Криптокошелёк сам по себе не подтверждает соответствие условиям фирмы.</p><Link href="/ru/dlya-russkoyazychnykh-treyderov" className="ru-card-link">Проверки для своей страны →</Link></article>
              <article className="ru-card"><BadgeDollarSign size={21} color="var(--accent-light)" aria-hidden="true" /><h3>2. Затем точная программа</h3><p>Сопоставьте обязательные платежи, расчёт просадки, комиссию, плечо, требования к прибыльным дням и условия запроса вознаграждения.</p><Link href="/ru/luchshie-prop-firmy#podbor" className="ru-card-link">Подобрать программы →</Link></article>
              <article className="ru-card"><WalletCards size={21} color="var(--accent-light)" aria-hidden="true" /><h3>3. Только потом оплата</h3><p>Перед платежом повторно откройте правила и проверьте итоговую сумму. Если ответ о стране или способе выплаты неясен, сохраните письменное разъяснение поддержки.</p><Link href="/ru/prop-firmy-bez-kyc" className="ru-card-link">Что нужно для KYC →</Link></article>
            </div>
            <div className="ru-review-author" aria-label="Автор рейтинга крипто-проп-фирм">
              <div className="ru-review-author-avatar" aria-hidden="true">ED</div>
              <div>
                <strong>Автор: Edris Derakhshi</strong>
                <p>Автор обзоров и руководств Traders Fund Hub. В этом рейтинге различаем торговлю криптоактивами, оплату участия и получение прибыли в криптовалюте. Партнёрская комиссия не меняет порядок фирм.</p>
                <Link href="/authors/edris-derakhshi" hrefLang="en">Профиль автора — на английском</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Первичные источники и границы проверки</h2>
            <p>Даты по инструментам и способам выплаты ниже независимы от дат ценовых записей. Новая проверка справки о криптовалюте не означает повторную проверку стоимости челленджа, всех его правил или доступа по стране.</p>
            <ul>
              {mapped.map(({ evidence, products }) => <li key={evidence.firmSlug}>
                <a href={evidence.sourceUrl} target="_blank" rel="nofollow noopener">{evidence.firmName}: справка об инструментах</a> — {evidence.sourceCapturedAt || 'дата не подтверждена'}.
                {' '}Проверки программ: {[...new Set(products.map(product => product.sourceCapturedAt || 'дата не подтверждена'))].sort().join(', ') || 'записи отсутствуют'}.
              </li>)}
              <li><a href={payoutEvidence.sourceUrl} target="_blank" rel="nofollow noopener">Bright Funded: способы выплаты</a> — {payoutEvidence.sourceCapturedAt || 'дата не подтверждена'}. Доступность конкретного метода для читателя не подтверждена.</li>
              <li>CFT: <a href="https://cryptofundtrader.com/faq/" target="_blank" rel="nofollow noopener">FAQ</a> и <a href="https://cryptofundtrader.com/terms-and-conditions/" target="_blank" rel="nofollow noopener">условия программ</a>. Основания исправления от 8 сентября разобраны выше; полные проверки Ascend и Break остаются незавершёнными.</li>
            </ul>
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы</h2>
            {!hasFreshEvidence && <p className="ru-source-line">Ответы сохраняют датированный разбор. Часть источников или цен требует повторной проверки; не считайте эти ответы подтверждением текущего предложения.</p>}
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
