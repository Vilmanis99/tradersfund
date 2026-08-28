import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CircleAlert,
  Database,
  Globe2,
  KeyRound,
  MonitorCog,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getDealsByFirm } from '@/lib/deals'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import mt5Evidence from '@/content/data/russian-fundednext-mt5-evidence.json'

const PATH = '/ru/fundednext-mt5'
const TITLE = 'FundedNext MT5: вход, download и правила EA (2026)'
const DESCRIPTION = 'FundedNext MT5 на русском: официальный download, вход и серверы, правила EA, Free Trial, 4 модели, 22 цены и ограничения по стране.'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const drawdownLabels: Record<string, string> = {
  static: 'статическая',
  trailing: 'трейлинг',
  'eod-trailing': 'EOD-трейлинг',
  'balance-based': 'по балансу',
}

function money(value: number | null | undefined) {
  return value == null
    ? 'не опубликована'
    : `$${value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
}

function priceRange(product: Challenge) {
  const prices = product.accountSizes
    .map(tier => tier.priceUsd)
    .filter((price): price is number => price != null && price > 0)
  if (!prices.length) return 'не опубликована'
  const minimum = Math.min(...prices)
  const maximum = Math.max(...prices)
  return minimum === maximum ? money(minimum) : `${money(minimum)}–${money(maximum)}`
}

function targetLabel(product: Challenge) {
  if (!product.profitTargets) return 'нет evaluation-цели'
  const values = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((value): value is number => value != null)
  return values.length ? values.map(value => `${value}%`).join(' → ') : 'не опубликована'
}

function payoutLabel(product: Challenge) {
  if (product.payoutFirstDays === 0) return 'по запросу после условий'
  if (product.payoutFirstDays == null) return 'не опубликована'
  return `${product.payoutFirstDays} дн.`
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Поддерживает ли FundedNext MetaTrader 5?',
    a: 'Да. Официальная страница платформ перечисляет MT5 вместе с MT4, cTrader и Match-Trader. Для профилей из США действует отдельное правило: торговля доступна только через Match-Trader, поэтому логотип MT5 не является универсальной гарантией по стране.',
  },
  {
    q: 'Где скачать FundedNext MT5?',
    a: `FundedNext указывает раздел Utilities в Client Dashboard, где доступны версии MT5 для ${mt5Evidence.utilities.mt5Downloads.join(', ')}. Официальная PC-инструкция также допускает установку с сайта MetaQuotes. Не вводите ID, пароль или сервер в файл со стороннего зеркала.`,
  },
  {
    q: 'Как войти в FundedNext MT5?',
    a: `Выберите Connect with an Existing Trade Account и введите login ID, password и точный server name из письма или Account Dashboard. Платные счета используют ${mt5Evidence.desktopLogin.paidServers.join(' либо ')}, а Free Trial — ${mt5Evidence.desktopLogin.freeTrialServer}.`,
  },
  {
    q: 'Разрешены ли советники EA в FundedNext MT5?',
    a: `Да, но не автоматически: для MT4/MT5 требуется платное невозвратное дополнение EA, настройки нужно персонализировать, а одна стратегия ограничена суммарным allocation $${mt5Evidence.ea.maxAllocationUsdPerStrategy.toLocaleString('en-US')}. cTrader и Match-Trader остаются ручными платформами.`,
  },
  {
    q: 'Можно ли использовать EA в FundedNext Free Trial?',
    a: `Нет. Free Trial проходит на MT5, кроме профилей США на Match-Trader, но отдельное правило запрещает EA. Цель ${mt5Evidence.freeTrial.profitTargetPct}% требует минимум ${mt5Evidence.freeTrial.minimumTradingDays} торговых дня внутри ${mt5Evidence.freeTrial.durationDays}-дневного окна.`,
  },
  {
    q: 'Можно ли сменить ручную торговлю на EA после challenge?',
    a: 'Нет. Официальное правило strategy continuity запрещает пройти evaluation вручную и перейти на EA на FundedNext Account, а также обратную замену EA на ручную торговлю. Существенная смена класса активов, маржи или риска тоже может привести к review и отказу в reward.',
  },
  {
    q: 'Подходит ли FundedNext MT5 всем русскоязычным трейдерам?',
    a: 'Нет. Язык не определяет доступ: проверяются гражданство, резидентство, адрес, KYC, способ оплаты и payout route. Для резидентов России официальные страницы FundedNext дают противоречивые сигналы; до оплаты нужно письменное подтверждение конкретного профиля.',
  },
]

export default function RussianFundedNextMt5Page() {
  const products = getChallengesByFirm('fundednext').filter(product => isChallengeFresh(product))
  const brightFirm = getAllFirms().find(candidate => candidate.name === 'Bright Funded')
  const currentDeal = getDealsByFirm('fundednext')
    .find(deal => deal.mechanism === 'earned-coupon' && deal.pct != null)
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const priceCount = products.reduce((total, product) => total + product.accountSizes.filter(tier =>
    tier.priceUsd != null && tier.priceUsd > 0,
  ).length, 0)
  const allPrices = products.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : [],
  ))
  const minimumPrice = allPrices.length ? Math.min(...allPrices) : null
  const maximumPrice = allPrices.length ? Math.max(...allPrices) : null
  const latestProductCapture = products.map(product => product.sourceCapturedAt).sort().at(-1)
  const sourceUrls = [...new Set([
    mt5Evidence.platformAvailability.sourceUrl,
    mt5Evidence.desktopLogin.sourceUrl,
    mt5Evidence.dashboardLogin.sourceUrl,
    mt5Evidence.utilities.sourceUrl,
    mt5Evidence.password.sourceUrl,
    mt5Evidence.ea.sourceUrl,
    mt5Evidence.strategyContinuity.sourceUrl,
    mt5Evidence.prohibitedStrategies.sourceUrl,
    mt5Evidence.freeTrial.sourceUrl,
    ...products.map(product => product.sourceUrl),
    ...(accessEvidence?.sourceUrls ?? []),
  ])]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Обзор FundedNext', url: '/ru/obzor-fundednext' },
    { name: 'FundedNext MT5' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-08-28',
    dateModified: mt5Evidence.capturedAt,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <article
        data-russian-fundednext-mt5="search-to-rule"
        data-russian-platform-intent="fundednext-mt5-ea"
      >
        <section className="ru-hero">
          <div className="ru-shell">
            <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/obzor-fundednext">FundedNext</Link> / MT5</div>
            <div className="ru-eyebrow"><MonitorCog size={14} aria-hidden="true" /> Источники проверены {mt5Evidence.capturedAt}</div>
            <h1>FundedNext MT5: вход, download и правила EA</h1>
            <p className="ru-lead">
              MT5 у FundedNext — не просто ссылка на установщик. До покупки нужно связать 1 из {products.length} моделей
              с доступностью страны, сервером, невозвратным EA add-on и правилом непрерывности стратегии.
            </p>
            <div className="ru-stats">
              <div className="ru-stat"><strong>{products.length}</strong><span>текущие CFD-модели</span></div>
              <div className="ru-stat"><strong>{priceCount}</strong><span>опубликованные USD-цены</span></div>
              <div className="ru-stat"><strong>{money(minimumPrice)}–{money(maximumPrice)}</strong><span>листинговый диапазон</span></div>
              <div className="ru-stat"><strong>{sourceUrls.length}</strong><span>первичных страниц</span></div>
            </div>
            <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-mt5-hero">
              <Link href="/go/fundednext?from=ru-fundednext-mt5-hero" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                Проверить FundedNext MT5 <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <a href="#login" className="btn-outline">Инструкция входа</a>
              <a href="#ea-rules" className="btn-outline">Правила EA</a>
            </div>
            <p className="ru-source-line">Партнёрская ссылка может принести нам комиссию; она не подтверждает страну, MT5 на checkout или разрешение конкретного EA.</p>
          </div>
        </section>

        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <div className="ru-notice" data-russian-country-boundary="fundednext-mt5-profile-not-language">
              <strong><Globe2 size={16} aria-hidden="true" /> Русский язык не является разрешением на MT5.</strong>{' '}
              Для США официально указан только Match-Trader. Для резидентов России источники по доступу конфликтуют.
              В любой другой стране проверяются фактические гражданство, резидентство, KYC, платёж и payout route.
            </div>
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрское раскрытие.</strong>{' '}
              CTA регистрации ведут через контролируемый маршрут /go/fundednext и могут принести Traders Fund Hub комиссию.
              Официальные инструкции download, login, EA и стратегии открываются отдельно и не являются партнёрскими.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание руководства FundedNext MT5">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#answer">Короткий ответ</a></li>
                <li><a href="#login">Download, вход и сервер</a></li>
                <li><a href="#products">4 модели и 22 цены</a></li>
                <li><a href="#free-trial">Free Trial на MT5</a></li>
                <li><a href="#ea-rules">Правила EA и add-on</a></li>
                <li><a href="#continuity">Непрерывность стратегии</a></li>
                <li><a href="#platforms">MT5 против cTrader и Match-Trader</a></li>
                <li><a href="#checkout">Проверка итоговой стоимости</a></li>
                <li><a href="#country">Страна и русскоязычная диаспора</a></li>
                <li><a href="#verdict">Вердикт и альтернативы</a></li>
                <li><a href="#sources">Первичные источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="answer" data-russian-fundednext-mt5-answer="platform-before-download">
            <h2>Короткий ответ: MT5 поддерживается, но правила зависят от профиля и режима</h2>
            <p>
              Официальная страница FundedNext перечисляет MT5 как торговую платформу наряду с MT4, cTrader и Match-Trader.
              Однако пользователь из США получает только Match-Trader, а TradingView на дату {mt5Evidence.capturedAt} указан только для анализа, не исполнения.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-mt5-facts="six-gates">
                <thead><tr><th>Вопрос</th><th>Проверенный ответ</th><th>Что может изменить ответ</th></tr></thead>
                <tbody>
                  <tr><td><strong>Есть ли MT5?</strong></td><td>Да, в общем списке платформ</td><td>Страна и фактический checkout</td></tr>
                  <tr><td><strong>Где скачать?</strong></td><td>Utilities в Dashboard; Windows, iOS, Android</td><td>Не используйте стороннее зеркало</td></tr>
                  <tr><td><strong>Как войти?</strong></td><td>ID, пароль и точный server name</td><td>Paid и Free Trial используют разные серверы</td></tr>
                  <tr><td><strong>Разрешён ли EA?</strong></td><td>На MT4/MT5 с платным add-on</td><td>Free Trial запрещает EA; cTrader/Match остаются ручными</td></tr>
                  <tr><td><strong>Возвращается ли add-on?</strong></td><td>Нет, EA fee невозвратная</td><td>Refund registration fee её не включает</td></tr>
                  <tr><td><strong>Можно ли сменить стратегию?</strong></td><td>Manual ↔ EA после evaluation запрещено</td><td>Смена риска или класса активов тоже проверяется</td></tr>
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">
              <a href={mt5Evidence.platformAvailability.sourceUrl} target="_blank" rel="nofollow noopener">Официальный список платформ</a> · проверено {mt5Evidence.platformAvailability.sourceCapturedAt}.
            </p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="login" data-russian-fundednext-mt5-login="credentials-and-server">
            <div className="ru-content">
              <h2>FundedNext MT5 download и вход: безопасная последовательность</h2>
              <p>
                Инструкция от {mt5Evidence.desktopLogin.publishedAt} требует 3 поля: login ID, password и server name.
                Установка терминала без письма или Dashboard не создаёт FundedNext-счёт и не определяет правильный сервер.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card">
                <MonitorCog size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>1. Получите MT5 из официального маршрута</h3>
                <p>Раздел Utilities публикует 3 варианта: {mt5Evidence.utilities.mt5Downloads.join(', ')}. Название Toolkit устарело: с {mt5Evidence.utilities.publishedAt} источник использует Utilities.</p>
              </article>
              <article className="ru-card">
                <KeyRound size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>2. Выберите existing trade account</h3>
                <p>В PC-приложении найдите FundedNext и выберите Connect with an Existing Trade Account. Новый MetaTrader demo account не заменяет купленный challenge или Free Trial.</p>
              </article>
              <article className="ru-card">
                <Database size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>3. Сопоставьте сервер</h3>
                <p>Paid: {mt5Evidence.desktopLogin.paidServers.join(' или ')}. Free Trial и Monthly Competition: {mt5Evidence.desktopLogin.freeTrialServer}. Точный paid-сервер берётся из письма или Account Dashboard.</p>
              </article>
              <article className="ru-card">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>4. Не передавайте Master Password</h3>
                <p>Правило от {mt5Evidence.password.publishedAt} запрещает sharing. Новый MT4/MT5 password генерируется в Account Dashboard и приходит только на зарегистрированный email.</p>
              </article>
            </div>
            <div className="ru-actions">
              <a href={mt5Evidence.desktopLogin.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Официальная PC-инструкция</a>
              <a href={mt5Evidence.dashboardLogin.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Вход из Dashboard</a>
              <a href={mt5Evidence.utilities.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Utilities и download</a>
              <a href={mt5Evidence.password.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правило пароля</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="products" data-russian-fundednext-mt5-products={products.length}>
            <div className="ru-content">
              <h2>Сначала выберите модель FundedNext, затем MT5</h2>
              <p>
                Платформа не уравнивает {products.length} CFD-модели. В свежем захвате от {latestProductCapture ?? 'неуказанной даты'} находятся
                {' '}{priceCount} USD-цен, 0–2 evaluation-фазы, 6–10% максимального убытка и разные первые reward windows.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-mt5-product-matrix="four-models">
                <thead><tr><th>Модель</th><th>Фазы / цель</th><th>Цена</th><th>Макс. убыток</th><th>Тип</th><th>Базовый split</th><th>Первая заявка</th></tr></thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.productSlug} data-russian-fundednext-mt5-product={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{product.phases}; {targetLabel(product)}</td>
                      <td>{priceRange(product)}</td>
                      <td>{product.maxLossPct ?? '—'}%</td>
                      <td>{product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : '—'}</td>
                      <td>{product.profitSplitPct ?? '—'}%</td>
                      <td>{payoutLabel(product)}</td>
                    </tr>
                  ))}
                  {products.length === 0 ? <tr><td colSpan={7}>Продуктовые источники старше 30 дней; числовая матрица временно скрыта.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="ru-notice">
              <strong>Граница данных.</strong> Общая platform-страница подтверждает MT5 у FundedNext, но не заменяет финальный checkout конкретного продукта, размера и страны. До оплаты зафиксируйте выбранные model, tier и platform в заказе.
            </div>
            <div className="ru-actions">
              <Link href="/ru/obzor-fundednext#products" className="btn-outline">Полный обзор 4 моделей</Link>
              <Link href="/go/fundednext?from=ru-fundednext-mt5-products" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить MT5 на checkout <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="free-trial" data-russian-fundednext-mt5-free-trial="mt5-no-ea">
            <div className="ru-content">
              <h2>Free Trial: отдельный MT5-сервер, {mt5Evidence.freeTrial.profitTargetPct}% цель и запрет EA</h2>
              <p>
                Free Trial — 1-step тест на {mt5Evidence.freeTrial.durationDays} дней с минимум {mt5Evidence.freeTrial.minimumTradingDays} торговыми днями,
                целью {mt5Evidence.freeTrial.profitTargetPct}% и лимитом {mt5Evidence.freeTrial.maximumOpenPositions} одновременно открытых позиций.
                Для обычного профиля используется MT5 и {mt5Evidence.desktopLogin.freeTrialServer}; для США — только {mt5Evidence.freeTrial.usaPlatform}.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>EA запрещён именно в Free Trial</h3><p>Платный EA add-on для challenge нельзя переносить на бесплатный тест: Free Trial Rules прямо запрещают советники и блокируют новые сделки при их использовании.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Один активный тест</h3><p>Одновременно разрешён 1 Free Trial на один email и IP. После отключения можно запросить следующий; это не разрешает несколько параллельных аккаунтов.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Купон появляется после цели</h3><p>{currentDeal ? `Свежий offer подтверждает персональный купон ${currentDeal.pct}% после цели, действующий ${mt5Evidence.freeTrial.couponValidityDays} дней для новых пользователей и CFD-планов без resets.` : 'Купон сейчас не показывается как текущий: 30-дневная проверка предложения истекла или запись отсутствует.'}</p></article>
            </div>
            <p className="ru-source-line">
              <a href={mt5Evidence.freeTrial.sourceUrl} target="_blank" rel="nofollow noopener">Официальные Free Trial Rules</a> · проверено {mt5Evidence.freeTrial.sourceCapturedAt}.
              {currentDeal ? <> Offer перепроверен {currentDeal.verifiedOn}.</> : null}
            </p>
            <div className="ru-actions">
              {currentDeal ? <Link href="/go/fundednext?from=ru-fundednext-mt5-free-trial" rel="sponsored nofollow noopener" className="btn-primary">Начать Free Trial <ArrowRight size={15} aria-hidden="true" /></Link> : null}
              <Link href="/ru/promokody-prop-firm#fundednext-promokod" className="btn-outline">Как получить персональный купон</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="ea-rules" data-russian-fundednext-mt5-ea="paid-platform-specific">
            <div className="ru-content">
              <h2>FundedNext EA rules: «разрешено» означает 7 ограничений</h2>
              <p>
                Официальная EA-страница разрешает советники и bots на MT4/MT5 только с дополнительной usage fee.
                Точная сумма add-on в захваченном источнике не опубликована, а fee названа невозвратной даже при неиспользовании.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Bot size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Только MT4/MT5</h3><p>cTrader и Match-Trader оставлены для ручного исполнения. Возможности cAlgo или стороннего API не отменяют firm-level запрет автоматизации.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Платный и невозвратный add-on</h3><p>EA usage fee добавляется к product price и не входит в Refundable Fee. Если checkout не показывает сумму, не рассчитывайте total вручную.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Персонализация обязательна</h3><p>Настройки EA должны соответствовать собственной стратегии. Идентичные сделки через одинаковую конфигурацию на нескольких FundedNext-счетах создают риск soft breach.</p></article>
              <article className="ru-card"><Database size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. Лимит $300,000</h3><p>Одна EA/bot-стратегия ограничена allocation ${mt5Evidence.ea.maxAllocationUsdPerStrategy.toLocaleString('en-US')}. Несколько счетов не увеличивают лимит одной и той же стратегии.</p></article>
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>5. Нет Telegram/WhatsApp-интеграций</h3><p>EA с third-party приложениями вроде {mt5Evidence.ea.forbiddenThirdPartyIntegrations.join(' или ')} прямо запрещён; signal service не становится допустимым из-за MT5-оболочки.</p></article>
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>6. Нет challenge-passing bots</h3><p>Боты, созданные специально для прохождения prop challenge, запрещены. Источник перечисляет примеры, но список не является исчерпывающим разрешительным каталогом.</p></article>
              <article className="ru-card"><KeyRound size={22} color="var(--accent-light)" aria-hidden="true" /><h3>7. Даже risk tool считается EA</h3><p>Инструмент, который только меняет Stop Loss, Take Profit или lot size, всё равно классифицируется как EA и должен соблюдать add-on и правила стратегии.</p></article>
            </div>
            <p className="ru-source-line"><a href={mt5Evidence.ea.sourceUrl} target="_blank" rel="nofollow noopener">Официальное правило EA</a> · проверено {mt5Evidence.ea.sourceCapturedAt}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="continuity" data-russian-fundednext-mt5-continuity="same-strategy-after-evaluation">
            <h2>Нельзя пройти challenge вручную, а funded-счёт отдать EA</h2>
            <p>
              Strategy continuity запрещает две зеркальные замены: manual → EA и EA → manual после evaluation.
              FundedNext также называет существенную смену asset class, symbol category, margin use или risk use причиной review, suspension и возможного reward denial.
            </p>
            <ol>
              <li><strong>До оплаты:</strong> выберите manual или EA и сохраните параметры стратегии.</li>
              <li><strong>На Phase 1/2:</strong> не используйте проходной bot, signal service, чужой account или device sharing.</li>
              <li><strong>На FundedNext Account:</strong> сохраняйте тот же механизм исполнения, класс активов и сопоставимый risk profile.</li>
              <li><strong>При запросе фирмы:</strong> будьте готовы объяснить EA, настройки, владельца и источник логики.</li>
            </ol>
            <div className="ru-actions">
              <a href={mt5Evidence.strategyContinuity.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правило continuity</a>
              <a href={mt5Evidence.prohibitedStrategies.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Запрещённые стратегии</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="platforms" data-russian-fundednext-mt5-platform-boundary="automation-and-country">
            <div className="ru-content">
              <h2>MT5 против cTrader и Match-Trader в FundedNext</h2>
              <p>Выбор платформы меняет автоматизацию, сервер, доступные размеры и страну. Ответ «FundedNext разрешает EA» нельзя переносить с MT5 на cTrader или Match-Trader.</p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Платформа</th><th>EA / automation</th><th>$100K–$200K</th><th>Профили США</th><th>Логин</th></tr></thead>
                <tbody>
                  <tr><td><strong>MT5</strong></td><td>С paid EA add-on и 7 ограничениями</td><td>Общее MT5-ограничение не опубликовано</td><td>Недоступно; только Match-Trader</td><td>ID + password + server</td></tr>
                  <tr><td><strong>cTrader</strong></td><td>Только manual; cBot запрещён</td><td>Покупка, reset и top-up ограничены</td><td>Недоступно</td><td>cTID-маршрут</td></tr>
                  <tr><td><strong>Match-Trader</strong></td><td>Только manual</td><td>Ограничено, кроме U.S. Match-аккаунтов</td><td>Единственный опубликованный вариант</td><td>Данные аккаунта</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ru-actions"><Link href="/ru/prop-firmy-s-ctrader" className="btn-outline">Отдельный разбор cTrader</Link></div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="checkout" data-russian-fundednext-mt5-checkout="product-plus-add-on">
            <h2>Итоговая стоимость MT5-счёта: product price плюс add-on</h2>
            <p>
              В текущей продуктовой матрице {priceCount} базовых цен от {money(minimumPrice)} до {money(maximumPrice)}.
              EA fee не включена в эти числа и не имеет подтверждённой суммы в захваченном источнике, поэтому total контролируется только на checkout.
            </p>
            <ol>
              <li><strong>Зафиксируйте модель и размер:</strong> Stellar 2-Step, 1-Step, Lite или Instant.</li>
              <li><strong>Выберите MT5:</strong> не переносите цену с cTrader или Match-Trader.</li>
              <li><strong>Добавьте EA только при необходимости:</strong> add-on невозвратный и не покрывается refund registration fee.</li>
              <li><strong>Сверьте final total:</strong> promotion, swap-free, VPS и EA могут изменить сумму.</li>
              <li><strong>Сохраните order ID:</strong> product, tier, platform, add-ons, email и дату до первой сделки.</li>
            </ol>
            <div className="ru-notice"><strong>Стоп-сигнал:</strong> если MT5, сервер или EA add-on отсутствует в выбранном checkout, не завершайте оплату по общей статье о платформах.</div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="country" data-russian-fundednext-mt5-diaspora="country-before-platform">
            <div className="ru-content">
              <h2>Русскоязычные трейдеры живут в разных странах — MT5 проверяется по профилю</h2>
              <p>
                Русскоязычный пользователь в Казахстане, ОАЭ, ЕС, Израиле, Великобритании или Северной Америке должен проверять
                фактические citizenship, residency, address, IP, KYC, payment method и payout route. Русский интерфейс или паспорт другого государства не заменяет эти 8 полей.
              </p>
            </div>
            <div className="ru-notice">
              <strong>Для резидентов России остаётся конфликт.</strong>{' '}
              CFD restriction article не называет Россию, но корпоративная страница FundedNext говорит, что компания не обслуживает её резидентов.
              MT5 download не разрешает этот конфликт; нужен письменный ответ поддержки и успешная проверка собственного checkout.
            </div>
            <div className="ru-actions">
              {accessEvidence?.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="nofollow noopener" className="btn-outline">Источник доступа {index + 1}</a>)}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Проверка страны для диаспоры</Link>
              <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">KYC-чек-лист</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="verdict" data-russian-fundednext-mt5-verdict="ea-before-platform">
            <div className="ru-content">
              <h2>Вердикт: FundedNext MT5 подходит не каждому EA-трейдеру</h2>
              <p>
                Маршрут подходит, если профиль допускается, нужный product/tier виден на MT5 checkout, EA персонализирован,
                add-on включён в бюджет и одна стратегия остаётся в пределах ${mt5Evidence.ea.maxAllocationUsdPerStrategy.toLocaleString('en-US')}.
                Он не подходит для U.S. MT5, cBot, challenge-passing service, чужих сигналов или смены manual ↔ EA после evaluation.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card" data-russian-fundednext-mt5-primary-partner="fundednext">
                <h3>FundedNext: основной MT5-маршрут</h3>
                <p>{products.length} модели, {priceCount} базовых USD-цен, MT5 login/server docs и отдельное EA-rule дают проверяемую последовательность до checkout.</p>
                <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-mt5-verdict">
                  <Link href="/go/fundednext?from=ru-fundednext-mt5-verdict" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={15} aria-hidden="true" /></Link>
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                </div>
              </article>
              {brightFirm?.affiliateUrl && brightFirm.platforms.includes('MT5') ? (
                <article className="ru-card" data-russian-fundednext-mt5-alternative="bright-funded">
                  <h3>Bright Funded: запасной глобальный маршрут</h3>
                  <p>Профиль Bright Funded перечисляет MT5, но использует EUR-pricing и собственные country/KYC rules. Не переносите FundedNext server, EA add-on или Free Trial на Bright checkout.</p>
                  <div className="ru-actions">
                    <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright</Link>
                    <Link href="/go/bright-funded?from=ru-fundednext-mt5-alternative-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded</Link>
                  </div>
                </article>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="sources" data-russian-fundednext-mt5-sources={sourceUrls.length}>
            <h2>Первичные источники и дата проверки</h2>
            <p>Руководство использует {sourceUrls.length} уникальных страниц FundedNext и датированные продуктовые записи. Каждое число относится к названному platform, product или rule, а не ко всему бренду сразу.</p>
            <ol>
              {sourceUrls.map((url, index) => (
                <li key={url}><a href={url} target="_blank" rel="nofollow noopener">Источник {index + 1}</a></li>
              ))}
            </ol>
            <p className="ru-source-line">Платформа и правила: {mt5Evidence.capturedAt}. Продукты: {latestProductCapture ?? 'нужно обновить'}. Offer: {currentDeal?.verifiedOn ?? 'сейчас не показывается как свежий'}.</p>
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
