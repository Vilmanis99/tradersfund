import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
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
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import { getAllChallenges, isChallengeFresh, type Challenge, type ChallengeAccountSize } from '@/lib/firms'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
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
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие проп-фирмы с cTrader сравниваются на странице?',
    a: 'Подробно сравниваются 2 основных партнёра Traders Fund Hub: FundedNext и Bright Funded. Это партнёрская подборка, а не полный каталог всех фирм с cTrader. Решение зависит от размера счёта, комиссии, автоматизации, страны и правил конкретной программы.',
  },
  {
    q: 'Можно ли использовать cBot в FundedNext?',
    a: 'Нет. cTrader как платформа поддерживает алгоритмы, но FundedNext отдельно запрещает EA, ботов и алгоритмическую торговлю на cTrader. Все сделки на этом маршруте должны выполняться вручную.',
  },
  {
    q: 'Можно ли использовать cBot в Bright Funded?',
    a: 'Проверенная справка Bright Funded разрешает EA в целом и отдельно исключает API и автоматизацию на DXTrade, но не подтверждает совместимость cBot с cTrader. До покупки нужно получить письменный ответ поддержки для конкретной программы и сохранить его.',
  },
  {
    q: 'Возвращается ли комиссия cTrader в FundedNext?',
    a: 'Стандартная дополнительная комиссия cTrader составляет $25 и не возвращается вместе с основным взносом. В справке есть исключение для клиентов из США, однако отдельное правило запрещает им новые покупки cTrader. Исключение по возврату не является разрешением купить новый счёт.',
  },
  {
    q: 'Подходит ли cTrader русскоязычному трейдеру в любой стране?',
    a: 'Нет. Русский язык не определяет доступ. Фирма может отдельно проверять гражданство, резидентство, фактический адрес, IP, личность, способ оплаты и получения выплаты. Для профилей из США cTrader недоступен для новых покупок FundedNext и недоступен в Bright Funded.',
  },
  {
    q: 'Что дешевле: FundedNext или Bright Funded на cTrader?',
    a: 'Универсального ответа нет. FundedNext публикует цену программы в долларах плюс стандартную комиссию платформы $25. Bright Funded публикует базовые цены в евро, но проверенная платформенная справка не указывает отдельную комиссию cTrader. Суммы в разных валютах нужно сравнивать с учётом курса и комиссии платежа в день оплаты.',
  },
]

function formatPrice(tier: ChallengeAccountSize) {
  const prices = [tier.priceUsd != null && tier.priceUsd > 0 ? `$${tier.priceUsd.toFixed(2)}` : null,
    tier.priceEur != null && tier.priceEur > 0 ? `€${tier.priceEur.toFixed(2)}` : null].filter(Boolean)
  return prices.length ? prices.join(' / ') : 'не опубликована'
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
  const fundedNextRulesFresh = Boolean(fundedNextEvidence && isChallengeFresh(fundedNextEvidence))
  const fundedNextLimit = fundedNextRulesFresh ? fundedNextEvidence?.maxAccountSizeUsd : null
  const fundedNextPlatformFee = fundedNextRulesFresh ? fundedNextEvidence?.platformFee.amount : null
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
  const evidenceDates = [
    { label: 'возможности cTrader', capturedAt: cTraderEvidence.platformSource.sourceCapturedAt },
    ...cTraderEvidence.firms.map(firm => ({ label: `правила платформы ${firm.firmName}`, capturedAt: firm.sourceCapturedAt })),
    ...['fundednext', 'bright-funded'].map(firmSlug => ({ label: `цены ${firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'}`, capturedAt: products.filter(product => product.firmSlug === firmSlug).map(product => product.sourceCapturedAt).sort().at(0) ?? '' })),
  ]
  const hasFreshEvidence = evidenceDates.every(item => isChallengeFresh({ sourceCapturedAt: item.capturedAt }))

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
    dateModified: russianRouteDateModified(PATH, cTraderEvidence.capturedAt),
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
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
    <article className="ru-review-article" data-russian-ctrader-article="platform-to-firm-rule" data-russian-platform-intent="ctrader-prop-firms">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Проп-фирмы с cTrader</div>
          <div className="ru-eyebrow"><MonitorCog size={14} aria-hidden="true" /> Платформа ≠ разрешение фирмы</div>
          <h1>Проп-фирмы с cTrader: FundedNext или Bright Funded</h1>
          <p className="ru-lead">
            Сравниваем 2 глобальные проп-фирмы не по логотипу cTrader, а по ограничениям покупки:
            размер счёта, дополнительная комиссия, cBot, страна профиля, устройства и вход в аккаунт.
            Главная развилка — ручная торговля в FundedNext или отдельное подтверждение автоматизации в Bright Funded.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Обновлено {russianRouteDateModified(PATH, cTraderEvidence.capturedAt)}.</p>
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-stats" aria-label="Проверяемая выборка cTrader">
            <div className="ru-stat"><strong>2</strong><span>основных партнёра</span></div>
            <div className="ru-stat"><strong>{fundedNextLimit == null ? 'Проверить' : `$${(fundedNextLimit / 1000).toFixed(0)}K`}</strong><span>максимум FundedNext cTrader</span></div>
            <div className="ru-stat"><strong>{fundedNextPlatformFee == null ? 'Проверить' : `$${fundedNextPlatformFee}`}</strong><span>стандартная комиссия FundedNext</span></div>
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
            Подборка из 2 фирм не является полным каталогом и не отменяет проверку страны, личности и окончательных условий оплаты.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="ctrader-profile-not-language">
            <strong>Русский язык не означает доступ в Российской Федерации.</strong>{' '}
            Статья предназначена для русскоязычных трейдеров по всему миру. До оплаты сопоставьте 7 полей:
            гражданство, резидентство, фактический адрес, IP, документы для проверки личности, платёж и способ получения выплаты.
            Выбор cTrader или VPN не меняет договорное ограничение страны.
          </div>
          <h2>Короткий ответ: кому подходит каждый маршрут</h2>
          <p>
            В правилах FundedNext, проверенных {fundedNextEvidence?.sourceCapturedAt}, указаны оценочные счета до $50 000,
            стандартная доплата $25 и ручная торговля. Разрешённые встроенные ордера терминала и сторонний робот — не одно и то же:
            стратегию нужно сверять именно с запретом автоматизации фирмы.
          </p>
          <p>
            Bright Funded публикует cTrader рядом с DXTrade и MT5, а также доступ из 5 сред: браузера, Windows,
            Mac, Android и iOS. Но в проверенных справках нет отдельного лимита cTrader, комиссии платформы или прямого ответа
            о cBot. Эти 3 пробела нужно закрыть в поддержке до оплаты, а не считать их отсутствием ограничений.
          </p>
          <div className="ru-table-wrap" data-russian-ctrader-matrix="two-primary-partners">
            <table className="ru-table">
              <caption>Правила платформы по проверке от {cTraderEvidence.capturedAt}; доступность для вашего профиля требует отдельного подтверждения.</caption>
              <thead><tr><th>Поле</th><th>FundedNext</th><th>Bright Funded</th></tr></thead>
              <tbody>
                <tr><td><strong>Статус cTrader</strong></td><td>Доступен с лимитами продукта и профиля</td><td>Доступен с ограничениями профиля</td></tr>
                <tr><td><strong>Размер счёта</strong></td><td>Оценочная программа до $50 000</td><td>Не опубликован в проверенной справке</td></tr>
                <tr><td><strong>Доплата</strong></td><td>$25; стандартно не возвращается, в справке есть исключение для клиентов из США</td><td>Не опубликована в проверенной справке</td></tr>
                <tr><td><strong>cBot / автоматизация</strong></td><td>Запрещены; только вручную</td><td>Нужно письменное подтверждение для cTrader</td></tr>
                <tr><td><strong>Профиль США</strong></td><td>Новые cTrader-покупки недоступны с 31.03.2026</td><td>Недоступен гражданам, резидентам или проживающим в США</td></tr>
                <tr><td><strong>Устройства</strong></td><td>Приложение для компьютера, браузер и телефон</td><td>Браузер, Windows, Mac, Android и iOS</td></tr>
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
            Основной взнос и доплата за платформу — разные расходы. Для FundedNext ниже показан расчёт
            для счёта $50 000: базовая цена программы плюс стандартные $25 за cTrader.
            Строка доступна, только пока актуальны обе проверки — цены и платформенной комиссии.
            Промокоды, бессвоповый режим и другие дополнения не включены: они могут независимо менять итоговую сумму.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">FundedNext cTrader: базовая цена и платформенная комиссия</caption>
              <thead><tr><th>Программа FundedNext</th><th>Размер счёта</th><th>Базовая цена</th><th>Комиссия cTrader</th><th>Без других дополнений</th><th>Источник цены</th></tr></thead>
              <tbody>
                {fundedNextCheckoutRows.map(({ product, tier }) => (
                  <tr key={product.productSlug} data-russian-ctrader-checkout-product={`fundednext:${product.productSlug}`}>
                    <td><strong>{product.productName}</strong><br />Цель {formatTargets(product)}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{formatPrice(tier)}</td>
                    <td>{fundedNextPlatformFee == null ? 'не опубликована' : formatUsd(fundedNextPlatformFee)}</td>
                    <td>{tier.priceUsd == null || tier.priceUsd <= 0 || fundedNextPlatformFee == null ? 'не вычислено' : formatUsd(tier.priceUsd + fundedNextPlatformFee)}</td>
                    <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt}</a></td>
                  </tr>
                ))}
                {!fundedNextCheckoutRows.length && <tr><td colSpan={6}>Нужна повторная проверка цены или правил платформы. Расчёт временно скрыт.</td></tr>}
              </tbody>
            </table>
          </div>
          <p>
            Stellar Instant не включён в эту таблицу. Его <a href={fundedNextEvidence?.sourceUrls[5]} target="_blank" rel="nofollow noopener">отдельная страница платформ</a> перечисляет MT4 и MT5,
            а для профилей США — только Match-Trader. cTrader в этом списке не указан. Небольшой размер счёта
            не даёт основания переносить на Instant платформу оценочных программ.
          </p>
          <h3>Bright Funded: базовая EUR-цена без выдуманной доплаты</h3>
          <p>
            Для Bright Funded можно показать базовую цену счёта $50 000, но нельзя назвать её окончательной
            ценой с cTrader. Проверенная справка не публикует отдельную доплату и не обещает,
            что каждый размер доступен каждому профилю. Финальную сумму подтверждайте перед платежом.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Базовые цены Bright Funded перед выбором cTrader</caption>
              <thead><tr><th>Программа Bright Funded</th><th>Размер счёта</th><th>Базовая цена</th><th>Комиссия cTrader</th><th>Что проверить</th></tr></thead>
              <tbody>
                {brightReferenceRows.map(({ product, tier }) => (
                  <tr key={product.productSlug} data-russian-ctrader-reference-product={`bright-funded:${product.productSlug}`}>
                    <td><strong>{product.productName}</strong><br />Цель {formatTargets(product)}</td>
                    <td>${tier.sizeUsd.toLocaleString('en-US')}</td>
                    <td>{formatPrice(tier)}<br /><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">Проверено {product.sourceCapturedAt}</a></td>
                    <td>Не опубликована</td>
                    <td>Платформа, размер счёта, профиль и итоговая сумма в евро</td>
                  </tr>
                ))}
                {!brightReferenceRows.length && <tr><td colSpan={5}>Проверка базовых цен истекла; перечитайте источник перед оплатой.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="ru-notice">
            <Calculator size={18} aria-hidden="true" />{' '}
            <strong>Не смешивайте USD и EUR.</strong> Сравните списание с карты или кошелька после пересчёта валюты
            и комиссии платёжного сервиса в день оплаты. Фиксированный пересчёт в рубли быстро устаревает.
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
                <li><ShieldCheck size={14} aria-hidden="true" /> Оценочный счёт до $50 000</li>
                <li><WalletCards size={14} aria-hidden="true" /> $25 сверх базовой цены</li>
                <li><Bot size={14} aria-hidden="true" /> cBot и алгоритмы запрещены</li>
                <li><Laptop size={14} aria-hidden="true" /> Компьютер, браузер и телефон</li>
              </ul>
              <p className="ru-muted">
                Проверяйте этот вариант, только если ручная торговля соответствует стратегии. Наличие cTrader Algo в самой платформе
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
                <li><CircleAlert size={14} aria-hidden="true" /> Комиссия cTrader не опубликована</li>
                <li><Bot size={14} aria-hidden="true" /> cBot не подтверждён проверенным правилом</li>
              </ul>
              <p className="ru-muted">
                Общая фраза «EA разрешены» недостаточна для cBot. В том же источнике Bright Funded отдельно исключает
                API и автоматизацию на DXTrade, поэтому ответ именно о cTrader нужно получить до покупки.
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
            но неизвестная комиссия Bright Funded и запрет автоматизации FundedNext не скрываются за партнёрской рекомендацией.
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-automation="platform-capability-vs-firm-permission">
        <div className="ru-shell ru-content">
          <h2>cTrader поддерживает cBots — проп-фирма может их запретить</h2>
          <p>
            <a href={cTraderEvidence.platformSource.sourceUrl} target="_blank" rel="nofollow noopener">Официальная документация cTrader Algo</a>{' '}
            описывает торговых роботов cBot, индикаторы и плагины, а также разработку на C# или Python. Это возможности платформы,
            а не разрешение программы проп-фирмы. Наличие функции в терминале не отменяет договорные ограничения.
          </p>
          <p>
            <a href={fundedNextEvidence?.sourceUrls[3]} target="_blank" rel="nofollow noopener">FundedNext формулирует правило однозначно</a>:
            {' '}на cTrader запрещены советники, боты и алгоритмическая торговля,
            а сделки должны исполняться вручную. Инструмент, который только меняет стоп-лосс, тейк-профит
            или объём позиции, тоже относится к советникам по правилу фирмы.
          </p>
          <p>
            <a href={brightEvidence?.sourceUrls[1]} target="_blank" rel="nofollow noopener">Bright Funded разрешает EA в общей справке</a>,
            {' '}не гарантирует совместимость сторонних систем и отдельно пишет,
            что API и автоматическая торговля не поддерживаются на DXTrade. Поскольку cTrader в этом абзаце не назван,
            корректный статус cBot — «не подтверждено», а не «разрешено».
          </p>
          <div className="ru-grid">
            <article className="ru-card"><Bot size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Назовите инструмент</h3><p className="ru-muted">Укажите название робота, индикатора, плагина, копировщика сделок или помощника управления риском и его точную функцию.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Назовите платформу</h3><p className="ru-muted">Ответ про MT5 EA не переносится на cTrader, а ответ про DXTrade API не доказывает правило cBot.</p></article>
            <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Сохраните ответ</h3><p className="ru-muted">Попросите поддержку письменно подтвердить программу, оценочный этап и счёт после оценки до запуска автоматизации.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-diaspora="country-before-platform">
        <div className="ru-shell ru-content">
          <h2>Страна профиля: русскоязычная аудитория живёт по всему миру</h2>
          <p>
            Язык интерфейса и язык этой статьи не определяют право заключить договор. Русскоязычный трейдер в Казахстане,
            Германии, Латвии, Грузии, ОАЭ, Великобритании или другой стране проверяется по фактическому профилю.
            Фирма может учитывать одновременно гражданство, резидентство и место проживания.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Проверка cTrader по профилю трейдера</caption>
              <thead><tr><th>Профиль</th><th>Что известно</th><th>Действие до оплаты</th></tr></thead>
              <tbody>
                <tr><td><strong>Русскоязычный за пределами РФ</strong></td><td>Язык не запрещает и не разрешает cTrader</td><td>Проверить гражданство, резидентство, адрес, личность, оплату и выплату</td></tr>
                <tr><td><strong>США</strong></td><td>Оба рассматриваемых варианта cTrader исключены для новых покупок</td><td>Не покупать cTrader; проверить разрешённую альтернативную платформу</td></tr>
                <tr><td><strong>ОАЭ</strong></td><td>Bright Funded ограничивает MT5 для профилей ОАЭ, а примечание о cTrader отдельно называет США и другие ограниченные страны</td><td>Не переносить правило MT5 автоматически; подтвердить cTrader и весь профиль</td></tr>
                <tr><td><strong>Российская Федерация</strong></td><td>Русская страница не является обещанием доступа; опубликованные ограничения требуют отдельной проверки</td><td>Получить подтверждение фирмы до платежа и не обходить запрет через VPN</td></tr>
              </tbody>
            </table>
          </div>
          <div className="ru-actions">
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary"><Globe2 size={15} aria-hidden="true" /> Проверить профиль страны</Link>
            <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Проверить способы выплаты</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-login="credentials-before-install">
        <div className="ru-shell ru-content">
          <h2>Установка и вход: сначала проверьте данные своего счёта</h2>
          <p>
            FundedNext отправляет письмо с данными после покупки. Кнопка «Log In» открывает веб-портал cTrader;
            затем пользователь принимает лицензионное соглашение и политику конфиденциальности и вводит выданные логин и пароль.
            Сопоставьте номер счёта с письмом: успешный вход в cTrader ID сам по себе не доказывает, что выбран нужный торговый счёт.
          </p>
          <p>
            Bright Funded публикует ссылки на фирменную веб-версию, приложения iOS и Android и инструкции для Windows и Mac.
            Наличие приложения в магазине не доказывает, что купленный профиль получил cTrader: сначала проверьте платформу
            при оформлении, затем сохраните данные фирмы, сервера и счёта из личного кабинета или письма.
          </p>
          <ol>
            <li><strong>До покупки:</strong> сохраните снимок выбранной программы, размера счёта, платформы и итоговой суммы.</li>
            <li><strong>После письма:</strong> сопоставьте фирму, cTrader ID, номер счёта и сервер.</li>
            <li><strong>До первой сделки:</strong> проверьте инструменты, размер контракта, комиссии и торговые часы.</li>
            <li><strong>До входа с телефона:</strong> завершите активацию через браузер и примите соглашение, если этого требует инструкция фирмы.</li>
          </ol>
          <p className="ru-source-line">
            <a href={fundedNextEvidence?.sourceUrls[4]} target="_blank" rel="nofollow noopener">Инструкция входа FundedNext</a>{' · '}
            <a href={brightEvidence?.sourceUrls[0]} target="_blank" rel="nofollow noopener">Платформы и приложения Bright Funded</a>
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-local-boundary="global-cfd-not-local-moex">
        <div className="ru-shell ru-content">
          <h2>Локальная проп-компания не обязательно предлагает cTrader</h2>
          <p>
            Некоторые российские операторы строят программы вокруг фьючерсов Московской биржи, обучения,
            стажировки или собственного терминала. Такую программу нельзя считать заменой глобальной оценочной программы с CFD в cTrader
            только потому, что обе компании используют слово «проп».
          </p>
          <p>
            В отдельном разборе локальные модели рассматриваются отдельно от FundedNext
            и Bright Funded. Если нужен именно cTrader, сначала подтвердите платформу и инструменты; если нужны фьючерсы Московской биржи,
            изучайте локальные программы без предположения, что в них доступны EURUSD, cBot или привычный способ выплаты.
          </p>
          <div className="ru-actions">
            <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">Проверить локальные модели</Link>
            <Link href="/ru/forex-prop-firmy" className="btn-primary">Сравнить программы для валютной торговли <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-ctrader-checklist="ten-fields">
        <div className="ru-shell ru-content">
          <h2>Десять проверок перед оплатой счёта cTrader</h2>
          <ol>
            <li><strong>Фирма:</strong> юридическое лицо, договор и указание, является ли счёт симулированным или реальным.</li>
            <li><strong>Программа:</strong> точное название, число этапов и правила счёта после оценки.</li>
            <li><strong>Размер счёта:</strong> доступен именно в cTrader, а не только в MT5 или DXTrade.</li>
            <li><strong>Профиль:</strong> гражданство, резидентство, адрес, IP и ограничения стран.</li>
            <li><strong>Цена:</strong> основной взнос, комиссия cTrader, дополнения, валюта и банковские расходы.</li>
            <li><strong>Возврат:</strong> основной взнос и платформенная комиссия проверяются отдельно, включая исключения.</li>
            <li><strong>Автоматизация:</strong> робот, индикатор, плагин, API и копировщик сделок требуют отдельного ответа.</li>
            <li><strong>Риск:</strong> дневной и общий лимиты, статическая или плавающая граница, учёт открытых позиций и время пересчёта.</li>
            <li><strong>Терминал:</strong> инструменты, размер контракта, спред, комиссия, своп и торговые часы.</li>
            <li><strong>Вознаграждение:</strong> доля, дата первой заявки, проверка личности, способ перевода, минимум и комиссия.</li>
          </ol>
          <p>
            Если хотя бы 1 из 10 полей неизвестно, не заменяйте его рекламным максимумом. Для правил отдельных программ откройте
            <Link href="/ru/obzor-fundednext"> обзор FundedNext</Link>,
            <Link href="/ru/obzor-bright-funded"> обзор Bright Funded</Link> и
            <Link href="/ru/fundednext-vs-bright-funded"> прямое сравнение программ</Link>. Если стратегия требует автоматизации,
            <Link href="/ru/fundednext-mt5"> сравните MT5 и 7 правил EA</Link>, а не переносите cBot на другой терминал.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ctrader-verdict">
            <strong>Финальный маршрут.</strong>{' '}
            Для ручной торговли в cTrader проверьте действующие ограничения и комиссию
            <Link href="/go/fundednext?from=ru-ctrader-verdict-fundednext" rel="sponsored nofollow noopener"> FundedNext</Link>.
            Для Bright Funded сначала подтвердите cBot, размер счёта и итоговую цену, затем используйте
            <Link href="/go/bright-funded?from=ru-ctrader-verdict-bright-funded" rel="sponsored nofollow noopener"> Bright Funded</Link>.
            Мы можем получить комиссию; ни один переход не является обещанием доступа или выплаты.
          </div>
          <p><Link href="/ru/luchshie-prop-firmy#podbor">Перейти к подбору программ по размеру счёта и этапам</Link>. Подборщик сравнивает условия программ, но не подтверждает доступность cTrader для выбранного профиля.</p>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <p className="ru-source-line">
            Правила платформы проверены {cTraderEvidence.capturedAt}; даты проверки цен показаны отдельно.
            Материал информационный и не является финансовой или юридической рекомендацией.
          </p>
        </div>
      </section>
      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content">
          <h2>Официальные источники правил платформы</h2>
          <p>Проверка этих страниц не обновляет базовые цены программ. Их отдельные даты указаны в таблицах выше.</p>
          <ul>
            <li><a href={cTraderEvidence.platformSource.sourceUrl} target="_blank" rel="nofollow noopener">Возможности cTrader Algo</a> · {cTraderEvidence.platformSource.sourceCapturedAt}</li>
            {cTraderEvidence.firms.flatMap(firm => firm.sourceUrls.map((sourceUrl, index) => <li key={sourceUrl}>
              <a href={sourceUrl} target="_blank" rel="nofollow noopener">{firm.firmName}: {(firm.firmSlug === 'fundednext'
                ? ['платформы и размеры счетов', 'условия cTrader и комиссия', 'возврат взноса и исключения', 'советники и автоматизация', 'вход в cTrader', 'платформы Stellar Instant']
                : ['платформы, устройства и страны', 'советники и совместимость'])[index]}</a> · {firm.sourceCapturedAt}
            </li>))}
          </ul>
        </div>
      </section>
    </article>
  )
}
