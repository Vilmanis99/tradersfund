import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  Calculator,
  CircleAlert,
  Globe2,
  Laptop,
  MonitorCog,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, isChallengeFresh, type Challenge, type ChallengeAccountSize } from '@/lib/firms'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import cTraderEvidence from '@/content/data/russian-ctrader-evidence.json'

const PATH = '/ru/prop-firmy-s-ctrader'
const TITLE = 'Проп-фирмы с cTrader 2026: ограничения и цены'
const DESCRIPTION = 'Сравнение FundedNext и Bright Funded для cTrader: лимиты счёта, комиссия платформы, cBot, страны, устройства и проверка перед оплатой.'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие проп-фирмы с cTrader сравниваются на странице?',
    a: 'Подробно сравниваются 2 основных партнёра Traders Fund Hub: FundedNext и Bright Funded. Это коммерческий shortlist, а не полный каталог всех фирм с cTrader. Решение строится по лимиту счёта, комиссии, автоматизации, стране и правилам конкретного продукта.',
  },
  {
    q: 'Можно ли использовать cBot в FundedNext?',
    a: 'Нет. cTrader как платформа поддерживает алгоритмы, но FundedNext отдельно запрещает EA, ботов и алгоритмическую торговлю на cTrader. Все сделки на этом маршруте должны выполняться вручную.',
  },
  {
    q: 'Можно ли использовать cBot в Bright Funded?',
    a: 'Захваченная справка Bright Funded разрешает EA в целом и отдельно запрещает API и автоматизацию на DXTrade, но не подтверждает совместимость cBot с cTrader. До покупки нужно получить письменный ответ поддержки для конкретного продукта и сохранить его.',
  },
  {
    q: 'Возвращается ли комиссия cTrader в FundedNext?',
    a: 'Стандартная дополнительная комиссия cTrader составляет $25 и не возвращается. Возможный возврат registration fee по правилам продукта не включает эту платформенную комиссию.',
  },
  {
    q: 'Подходит ли cTrader русскоязычному трейдеру в любой стране?',
    a: 'Нет. Русский язык не определяет доступ. Фирма может отдельно проверять гражданство, резидентство, фактический адрес, IP, KYC, способ оплаты и payout route. Для профилей из США cTrader недоступен для новых покупок FundedNext и недоступен в Bright Funded.',
  },
  {
    q: 'Что дешевле: FundedNext или Bright Funded на cTrader?',
    a: 'Прямого универсального ответа нет. FundedNext публикует USD-цену продукта плюс невозвратные $25. Bright Funded публикует базовые EUR-цены, но захваченная платформенная справка не указывает отдельную cTrader-комиссию. USD и EUR нельзя сравнивать без курса и комиссии платежа в день checkout.',
  },
]

function formatPrice(tier: ChallengeAccountSize) {
  if (tier.priceUsd != null) return `$${tier.priceUsd.toFixed(2)}`
  if (tier.priceEur != null) return `€${tier.priceEur.toFixed(0)}`
  return 'не опубликована'
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function tierAtSize(product: Challenge, sizeUsd: number) {
  return product.accountSizes.find(tier => tier.sizeUsd === sizeUsd)
}

function formatTargets(product: Challenge) {
  if (product.profitTargets == null) return 'не опубликованы'
  return [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((target): target is number => target != null).map(target => `${target}%`).join(' → ')
}

export default function RussianCTraderPropFirmsPage() {
  const products = getAllChallenges()
    .filter(product => isChallengeFresh(product))
    .filter(product => product.firmSlug === 'fundednext' || product.firmSlug === 'bright-funded')
  const fundedNextProducts = products.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = products.filter(product => product.firmSlug === 'bright-funded')
  const fundedNextEvidence = cTraderEvidence.firms.find(firm => firm.firmSlug === 'fundednext')
  const brightEvidence = cTraderEvidence.firms.find(firm => firm.firmSlug === 'bright-funded')
  const fundedNextLimit = fundedNextEvidence?.maxAccountSizeUsd
  const fundedNextPlatformFee = fundedNextEvidence?.platformFee.amount
  const fundedNextCheckoutRows = fundedNextProducts
    .filter(product => product.phases > 0)
    .map(product => ({ product, tier: fundedNextLimit == null ? undefined : tierAtSize(product, fundedNextLimit) }))
    .filter((row): row is { product: Challenge; tier: ChallengeAccountSize } => row.tier != null)
  const brightReferenceRows = brightProducts
    .map(product => ({ product, tier: tierAtSize(product, 50000) }))
    .filter((row): row is { product: Challenge; tier: ChallengeAccountSize } => row.tier != null)
  const sourceCount = new Set([
    cTraderEvidence.platformSource.sourceUrl,
    ...cTraderEvidence.firms.flatMap(firm => firm.sourceUrls),
    ...products.map(product => product.sourceUrl),
  ]).size

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Проп-фирмы с cTrader' },
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
    dateModified: cTraderEvidence.capturedAt,
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Проп-фирмы с cTrader для проверки',
    numberOfItems: 2,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'FundedNext', url: 'https://tradersfundhub.com/ru/obzor-fundednext' },
      { '@type': 'ListItem', position: 2, name: 'Bright Funded', url: 'https://tradersfundhub.com/ru/obzor-bright-funded' },
    ],
  }

  return (
    <article data-russian-ctrader-article="platform-to-firm-rule" data-russian-platform-intent="ctrader-prop-firms">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Проп-фирмы с cTrader</div>
          <div className="ru-eyebrow"><MonitorCog size={14} aria-hidden="true" /> Платформа ≠ разрешение фирмы</div>
          <h1>Проп-фирмы с cTrader: FundedNext или Bright Funded</h1>
          <p className="ru-lead">
            Сравниваем 2 глобальные проп-фирмы не по логотипу cTrader, а по ограничениям покупки:
            максимальный tier, дополнительная комиссия, cBot, страна профиля, устройства и вход в аккаунт.
            Главная развилка — ручная торговля в FundedNext или отдельное подтверждение автоматизации в Bright Funded.
          </p>
          <div className="ru-stats" aria-label="Проверяемая выборка cTrader">
            <div className="ru-stat"><strong>2</strong><span>основных партнёра</span></div>
            <div className="ru-stat"><strong>{fundedNextLimit == null ? '—' : `$${(fundedNextLimit / 1000).toFixed(0)}K`}</strong><span>максимум FundedNext cTrader</span></div>
            <div className="ru-stat"><strong>{fundedNextPlatformFee == null ? '—' : `$${fundedNextPlatformFee}`}</strong><span>невозвратная fee FundedNext</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>уникальных первичных страниц</span></div>
          </div>
          <div className="ru-actions">
            <Link href="/go/fundednext?from=ru-ctrader-hero-fundednext" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
              Проверить FundedNext <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/go/bright-funded?from=ru-ctrader-hero-bright-funded" rel="sponsored nofollow noopener" className="btn-outline">
              Проверить Bright Funded
            </Link>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ctrader-hero">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Оба перехода коммерческие: Traders Fund Hub может получить комиссию после регистрации или покупки.
            Shortlist из 2 фирм не является полным каталогом и не отменяет проверку страны, KYC и live checkout.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="ctrader-profile-not-language">
            <strong>Русский язык не означает доступ в Российской Федерации.</strong>{' '}
            Статья предназначена для русскоязычных трейдеров по всему миру. До оплаты сопоставьте 7 полей:
            гражданство, резидентство, фактический адрес, IP, KYC, платёж и payout route.
            Выбор cTrader или VPN не меняет договорное ограничение страны.
          </div>
          <h2>Короткий ответ: кому подходит каждый маршрут</h2>
          <p>
            FundedNext имеет наиболее конкретные условия cTrader: Challenge до $50 000, дополнительные $25
            и только ручные сделки. Это понятный маршрут для discretionary-трейдера, которому достаточно tier до $50K
            и который заранее принимает невозвратную платформенную комиссию.
          </p>
          <p>
            Bright Funded публикует cTrader рядом с DXTrade и MT5, а также приложения для 5 сред: web, Windows,
            Mac, Android и iOS. Но в захваченных справках нет отдельного cTrader-лимита, cTrader-fee или прямого ответа
            о cBot. Эти 3 пробела нужно закрыть в поддержке и checkout до оплаты, а не считать их нулевыми ограничениями.
          </p>
          <div className="ru-table-wrap" data-russian-ctrader-matrix="two-primary-partners">
            <table className="ru-table">
              <caption className="sr-only">Сравнение FundedNext и Bright Funded для cTrader</caption>
              <thead><tr><th>Поле</th><th>FundedNext</th><th>Bright Funded</th></tr></thead>
              <tbody>
                <tr><td><strong>Статус cTrader</strong></td><td>Доступен с лимитами продукта и профиля</td><td>Доступен с ограничениями профиля</td></tr>
                <tr><td><strong>Максимальный tier</strong></td><td>Challenge до $50 000</td><td>Не опубликован в захваченной справке</td></tr>
                <tr><td><strong>Доплата</strong></td><td>$25; стандартно не возвращается</td><td>Не опубликована в захваченной справке</td></tr>
                <tr><td><strong>cBot / автоматизация</strong></td><td>Запрещены; только вручную</td><td>Нужно письменное подтверждение для cTrader</td></tr>
                <tr><td><strong>Профиль США</strong></td><td>Новые cTrader-покупки недоступны с 31.03.2026</td><td>Недоступен гражданам, резидентам или проживающим в США</td></tr>
                <tr><td><strong>Устройства</strong></td><td>Desktop, web и mobile</td><td>Web, Windows, Mac, Android и iOS</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Состояние платформенных источников: {cTraderEvidence.capturedAt}. «Не опубликовано» означает неизвестное поле,
            а не бесплатную функцию или отсутствие лимита.
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-checkout="base-plus-platform-fee">
        <div className="ru-shell ru-content">
          <h2>Сколько стоит вход через cTrader</h2>
          <p>
            Цена challenge и стоимость cTrader — разные денежные объекты. Для FundedNext ниже показан checkout-пример
            на максимальном подтверждённом tier $50 000: текущая базовая цена из продуктовой записи плюс опубликованные $25.
            Промокоды, swap-free и другие add-ons не включены, потому что они могут менять итоговую сумму независимо.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">FundedNext cTrader: базовая цена и платформенная комиссия</caption>
              <thead><tr><th>Продукт FundedNext</th><th>Tier</th><th>Базовая цена</th><th>cTrader fee</th><th>До других add-ons</th><th>Источник продукта</th></tr></thead>
              <tbody>
                {fundedNextCheckoutRows.map(({ product, tier }) => (
                  <tr key={product.productSlug} data-russian-ctrader-checkout-product={`fundednext:${product.productSlug}`}>
                    <td><strong>{product.productName}</strong><br />Цель {formatTargets(product)}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{formatPrice(tier)}</td>
                    <td>{fundedNextPlatformFee == null ? 'не опубликована' : formatUsd(fundedNextPlatformFee)}</td>
                    <td>{tier.priceUsd == null || fundedNextPlatformFee == null ? 'не вычислено' : formatUsd(tier.priceUsd + fundedNextPlatformFee)}</td>
                    <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Stellar Instant не включён в cTrader-таблицу. Его номинал до $20 000 сам по себе не доказывает платформу:
            официальная cTrader-справка говорит о Challenge до $50 000, но не подтверждает Instant по названию.
            До появления product-level источника это поле остаётся неизвестным.
          </p>
          <h3>Bright Funded: базовая EUR-цена без выдуманной доплаты</h3>
          <p>
            Для Bright Funded можно показать текущую базовую цену tier $50 000, но нельзя назвать её окончательной
            cTrader-ценой. Захваченная платформенная справка не публикует отдельную доплату и не обещает,
            что каждый tier доступен каждому профилю. Финальную сумму подтверждает только live checkout.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Базовые цены Bright Funded перед выбором cTrader</caption>
              <thead><tr><th>Продукт Bright Funded</th><th>Tier</th><th>Базовая цена</th><th>cTrader fee</th><th>Что проверить</th></tr></thead>
              <tbody>
                {brightReferenceRows.map(({ product, tier }) => (
                  <tr key={product.productSlug} data-russian-ctrader-reference-product={`bright-funded:${product.productSlug}`}>
                    <td><strong>{product.productName}</strong><br />Цель {formatTargets(product)}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{formatPrice(tier)}</td>
                    <td>Не опубликована</td>
                    <td>Платформа, tier, профиль и итоговая EUR-сумма</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ru-notice">
            <Calculator size={18} aria-hidden="true" />{' '}
            <strong>Не смешивайте USD и EUR.</strong> Сравните сумму карты или wallet после курса и комиссии провайдера
            в день оплаты. Фиксированный пересчёт в рубли быстро устаревает и может скрыть 2 отдельные комиссии.
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-featured-partners="fundednext-bright-funded">
        <div className="ru-shell ru-content">
          <h2>FundedNext и Bright Funded: продукт до партнёрской ссылки</h2>
          <div className="ru-grid">
            <article className="ru-card" data-russian-ctrader-featured-partner="fundednext">
              <div className="ru-card-head"><h3>FundedNext cTrader</h3><span className="ru-score">Ручная торговля</span></div>
              <ul className="ru-facts">
                <li><ShieldCheck size={14} aria-hidden="true" /> Challenge до $50 000</li>
                <li><WalletCards size={14} aria-hidden="true" /> $25 сверх базовой цены</li>
                <li><Bot size={14} aria-hidden="true" /> cBot и алгоритмы запрещены</li>
                <li><Laptop size={14} aria-hidden="true" /> Desktop, web и mobile</li>
              </ul>
              <p className="ru-muted">
                Выбирайте только если ручной execution соответствует стратегии. Наличие cTrader Algo в самой платформе
                не создаёт исключение из правила FundedNext и не превращает запрещённый cBot в разрешённый инструмент.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                <Link href="/go/fundednext?from=ru-ctrader-shortlist-fundednext" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить FundedNext <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
            <article className="ru-card" data-russian-ctrader-featured-partner="bright-funded">
              <div className="ru-card-head"><h3>Bright Funded cTrader</h3><span className="ru-score">Нужна проверка cBot</span></div>
              <ul className="ru-facts">
                <li><MonitorCog size={14} aria-hidden="true" /> cTrader рядом с DXTrade и MT5</li>
                <li><Smartphone size={14} aria-hidden="true" /> 5 опубликованных сред доступа</li>
                <li><CircleAlert size={14} aria-hidden="true" /> cTrader-fee не опубликована</li>
                <li><Bot size={14} aria-hidden="true" /> cBot не подтверждён захваченным правилом</li>
              </ul>
              <p className="ru-muted">
                Общая фраза «EA разрешены» недостаточна для cBot. В том же источнике Bright Funded отдельно исключает
                API и автоматизацию на DXTrade, поэтому platform-specific ответ нужно получить до покупки cTrader.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-bright-funded" className="btn-outline">Полный обзор</Link>
                <Link href="/go/bright-funded?from=ru-ctrader-shortlist-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ctrader-shortlist">
            <strong>Почему обе фирмы показаны заметно.</strong>{' '}
            FundedNext и Bright Funded — наши основные глобальные партнёры. Комиссия возможна по обоим маршрутам,
            но неизвестная cTrader-fee Bright и запрет автоматизации FundedNext остаются видимыми до CTA.
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-automation="platform-capability-vs-firm-permission">
        <div className="ru-shell ru-content">
          <h2>cTrader поддерживает cBots — проп-фирма может их запретить</h2>
          <p>
            <a href={cTraderEvidence.platformSource.sourceUrl} target="_blank" rel="nofollow noopener">Официальная документация cTrader Algo</a>{' '}
            описывает cBots, индикаторы и plugins, а также разработку на C# или Python. Это характеристика программной платформы,
            а не разрешение конкретного challenge. Договор фирмы находится выше функции терминала.
          </p>
          <p>
            <a href={fundedNextEvidence?.sourceUrls[3]} target="_blank" rel="nofollow noopener">FundedNext формулирует правило однозначно</a>:
            {' '}на cTrader запрещены EA, bot и algorithmic trading,
            а сделки должны исполняться вручную. Даже инструмент, который только меняет Stop Loss, Take Profit
            или lot size, может попадать в фирменную классификацию automation; спорное действие нужно подтвердить заранее.
          </p>
          <p>
            <a href={brightEvidence?.sourceUrls[1]} target="_blank" rel="nofollow noopener">Bright Funded разрешает EA в общей справке</a>,
            {' '}не гарантирует совместимость сторонних систем и отдельно пишет,
            что API и automated trading не поддерживаются на DXTrade. Поскольку cTrader в этом абзаце не назван,
            корректный статус cBot — «не подтверждено», а не «разрешено».
          </p>
          <div className="ru-grid">
            <article className="ru-card"><Bot size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Назовите инструмент</h3><p className="ru-muted">Укажите cBot, indicator, plugin, trade copier или risk manager и точную функцию, которую он исполняет.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Назовите платформу</h3><p className="ru-muted">Ответ про MT5 EA не переносится на cTrader, а ответ про DXTrade API не доказывает правило cBot.</p></article>
            <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Сохраните ответ</h3><p className="ru-muted">Попросите support подтвердить продукт, phase и funded stage письменно до запуска автоматизации.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-diaspora="country-before-platform">
        <div className="ru-shell ru-content">
          <h2>Страна профиля: русскоязычная аудитория живёт по всему миру</h2>
          <p>
            Язык интерфейса и язык этой статьи не являются compliance-полем. Русскоязычный трейдер в Казахстане,
            Германии, Латвии, Грузии, ОАЭ, Великобритании или другой стране проверяется по фактическому профилю.
            Фирма может учитывать одновременно гражданство, резидентство и место проживания.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Проверка cTrader по профилю трейдера</caption>
              <thead><tr><th>Профиль</th><th>Что известно</th><th>Действие до оплаты</th></tr></thead>
              <tbody>
                <tr><td><strong>Русскоязычный за пределами РФ</strong></td><td>Язык не запрещает и не разрешает cTrader</td><td>Проверить гражданство, резидентство, адрес, KYC, payment и payout</td></tr>
                <tr><td><strong>США</strong></td><td>Оба рассматриваемых cTrader-маршрута исключены для новых покупок</td><td>Не использовать cTrader CTA; проверить разрешённую альтернативную платформу</td></tr>
                <tr><td><strong>ОАЭ</strong></td><td>Bright ограничивает MT5 для профилей ОАЭ, но captured cTrader note называет США</td><td>Не переносить MT5-правило автоматически; подтвердить cTrader и весь профиль</td></tr>
                <tr><td><strong>Российская Федерация</strong></td><td>Русская страница не является обещанием доступа; опубликованные ограничения требуют отдельной проверки</td><td>Получить подтверждение фирмы до платежа и не обходить запрет через VPN</td></tr>
              </tbody>
            </table>
          </div>
          <div className="ru-actions">
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary"><Globe2 size={15} aria-hidden="true" /> Проверить профиль страны</Link>
            <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить payout routes</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-login="credentials-before-install">
        <div className="ru-shell ru-content">
          <h2>Установка и вход: не покупайте второй аккаунт из-за неправильного login</h2>
          <p>
            FundedNext отправляет письмо с деталями после покупки. Ссылка открывает cTrader Web Portal,
            затем пользователь принимает End-User License Agreement и Privacy Policy и вводит выданные login ID и password.
            Используйте именно account credentials из письма, а не случайный личный cTrader ID другого workspace.
          </p>
          <p>
            Bright Funded публикует branded cTrader routes для web, iOS и Android, а также guides для Windows и Mac.
            Наличие приложения в магазине не доказывает, что купленный профиль получил cTrader: сначала проверьте платформу
            в checkout, затем сохраните firm/server/account credentials из dashboard или письма.
          </p>
          <ol>
            <li><strong>До покупки:</strong> сделайте screenshot выбранного продукта, tier, платформы и итоговой суммы.</li>
            <li><strong>После письма:</strong> сопоставьте фирму, cTrader ID, account number и сервер.</li>
            <li><strong>До первой сделки:</strong> откройте symbols, contract size, commission и trading hours.</li>
            <li><strong>До mobile login:</strong> завершите web-активацию и соглашение, если этого требует фирменный flow.</li>
          </ol>
          <p className="ru-source-line">
            <a href={fundedNextEvidence?.sourceUrls[4]} target="_blank" rel="nofollow noopener">Инструкция входа FundedNext</a>{' · '}
            <a href={brightEvidence?.sourceUrls[0]} target="_blank" rel="nofollow noopener">Платформы и приложения Bright Funded</a>
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-local-boundary="global-cfd-not-local-moex">
        <div className="ru-shell ru-content">
          <h2>Локальная российская проп-компания — не автоматически cTrader prop firm</h2>
          <p>
            Некоторые российские операторы строят программы вокруг фьючерсов Московской биржи, обучения,
            стажировки или собственного терминала. Такой продукт нельзя считать заменой глобального cTrader CFD challenge
            только потому, что обе компании используют слово «проп».
          </p>
          <p>
            Наш отдельный локальный разбор проверяет 6 операторов и держит их продуктовую модель отдельно от FundedNext
            и Bright Funded. Если нужен именно cTrader, сначала подтвердите платформу и инструменты; если нужны MOEX-фьючерсы,
            переходите в локальную выборку без ожидания EURUSD, cBot или глобального payout rail.
          </p>
          <div className="ru-actions">
            <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">Проверить локальные модели</Link>
            <Link href="/ru/forex-prop-firmy" className="btn-primary">Сравнить глобальные forex-продукты <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-checklist="ten-fields">
        <div className="ru-shell ru-content">
          <h2>Десять проверок перед cTrader checkout</h2>
          <ol>
            <li><strong>Фирма:</strong> юридическое лицо, договор и simulated/real account wording.</li>
            <li><strong>Продукт:</strong> точное название, число фаз и funded-stage rules.</li>
            <li><strong>Tier:</strong> размер доступен именно на cTrader, а не только на MT5 или DXTrade.</li>
            <li><strong>Профиль:</strong> гражданство, резидентство, адрес, IP и restricted-country policy.</li>
            <li><strong>Цена:</strong> base fee, cTrader fee, add-ons, валюта и банковская комиссия.</li>
            <li><strong>Возврат:</strong> registration fee и platform fee проверяются отдельно.</li>
            <li><strong>Автоматизация:</strong> cBot, indicator, plugin, API и copier получают отдельный ответ.</li>
            <li><strong>Риск:</strong> daily/max loss, static/trailing, equity formula и reset time.</li>
            <li><strong>Терминал:</strong> symbols, contract size, spread, commission, swap и trading hours.</li>
            <li><strong>Reward:</strong> split, первая дата, KYC, payout rail, минимум и fee.</li>
          </ol>
          <p>
            Если хотя бы 1 из 10 полей неизвестно, не заменяйте его рекламным максимумом. Для product-level правил откройте
            <Link href="/ru/obzor-fundednext"> обзор FundedNext</Link>,
            <Link href="/ru/obzor-bright-funded"> обзор Bright Funded</Link> и
            <Link href="/ru/fundednext-vs-bright-funded"> прямое сравнение 7 продуктов</Link>. Если стратегия требует автоматизации,
            <Link href="/ru/fundednext-mt5"> сравните MT5 и 7 правил EA</Link>, а не переносите cBot на другой терминал.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ctrader-verdict">
            <strong>Финальный маршрут.</strong>{' '}
            Для manual cTrader до $50K проверьте
            <Link href="/go/fundednext?from=ru-ctrader-verdict-fundednext" rel="sponsored nofollow noopener"> FundedNext</Link>.
            Для Bright Funded сначала подтвердите cBot, tier и итоговую fee, затем используйте
            <Link href="/go/bright-funded?from=ru-ctrader-verdict-bright-funded" rel="sponsored nofollow noopener"> Bright Funded</Link>.
            Мы можем получить комиссию; ни один переход не является обещанием доступа или выплаты.
          </div>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <p className="ru-source-line">
            Platform evidence captured {cTraderEvidence.capturedAt}; product prices use their own sourceCapturedAt.
            Материал информационный и не является финансовой или юридической рекомендацией.
          </p>
        </div>
      </section>
    </article>
  )
}
