import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
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
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import RussianFundedNextEaNotice from '@/components/RussianFundedNextEaNotice'
import RussianFundedNextPayoutNotice from '@/components/RussianFundedNextPayoutNotice'
import { fundedNextOneStepPayoutLabel } from '@/lib/fundedNextPayout'
import { getDealsByFirm } from '@/lib/deals'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { russianRouteDateModified } from '@/lib/localizedRoutes'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import mt5Evidence from '@/content/data/russian-fundednext-mt5-evidence.json'

const PATH = '/ru/fundednext-mt5'
const TITLE = 'FundedNext MT5: скачать, войти и проверить правила EA'
const DESCRIPTION = 'Как скачать FundedNext MT5, выбрать сервер и войти в счёт. Правила советников EA, ограничения по размеру счёта, бесплатный тест и проверка перед оплатой.'

export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
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
  if (!product.profitTargets) return product.phases === 0 ? 'без оценочного этапа' : 'цель не подтверждена'
  const values = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((value): value is number => value != null)
  return values.length ? values.map(value => `${value}%`).join(' → ') : 'не опубликована'
}

function payoutLabel(product: Challenge) {
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
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
    a: `Откройте раздел Utilities в личном кабинете FundedNext: там указаны версии MT5 для ${mt5Evidence.utilities.mt5Downloads.join(', ')}. Инструкция для компьютера также допускает загрузку с сайта MetaQuotes. Не устанавливайте терминал из неизвестного источника.`,
  },
  {
    q: 'Как войти в FundedNext MT5?',
    a: `Выберите подключение к существующему торговому счёту — Connect with an Existing Trade Account. Введите номер счёта, пароль и точное имя сервера из письма или личного кабинета. Для платных счетов указаны ${mt5Evidence.desktopLogin.paidServers.join(' либо ')}, для Free Trial — ${mt5Evidence.desktopLogin.freeTrialServer}.`,
  },
  {
    q: 'Разрешены ли советники EA в FundedNext MT5?',
    a: `По правилу от ${mt5Evidence.ea.sourceCapturedAt} — только на счёте меньше ${money(mt5Evidence.ea.manualOnlyFromAccountSizeUsd)}, с платным невозвратным дополнением и соблюдением правил стратегии. От этой суммы включительно требуется ручная торговля. Бесплатный тест отдельно запрещает EA.`,
  },
  {
    q: 'Можно ли использовать EA в FundedNext Free Trial?',
    a: `Нет. Free Trial проходит на MT5, кроме профилей США на Match-Trader, но отдельное правило запрещает EA. Цель ${mt5Evidence.freeTrial.profitTargetPct}% требует минимум ${mt5Evidence.freeTrial.minimumTradingDays} торговых дня внутри ${mt5Evidence.freeTrial.durationDays}-дневного окна.`,
  },
  {
    q: 'Можно ли перейти с ручной торговли на советника после оценки?',
    a: 'Нет. FundedNext запрещает проходить оценку вручную, а затем передавать торговлю советнику; обратная замена также запрещена. Существенное изменение класса активов, используемой маржи или риска может привести к проверке счёта и отказу в вознаграждении.',
  },
  {
    q: 'Подходит ли FundedNext MT5 всем русскоязычным трейдерам?',
    a: 'Нет. Язык не определяет доступ: важны гражданство, резидентство, адрес, проверка личности, способ оплаты и вывода. В зафиксированных источниках FundedNext остаётся противоречие по резидентам России; до оплаты нужно письменное подтверждение для конкретного профиля.',
  },
]

export default function RussianFundedNextMt5Page() {
  const products = getChallengesByFirm('fundednext').filter(product => isChallengeFresh(product))
  const brightFirm = getAllFirms().find(candidate => candidate.name === 'Bright Funded')
  const currentDeal = isChallengeFresh({ sourceCapturedAt: mt5Evidence.freeTrial.sourceCapturedAt }) ? getDealsByFirm('fundednext')
    .find(deal => deal.mechanism === 'earned-coupon' && deal.pct != null)
    : undefined
  const accessEvidence = marketEvidence.firmAccess.find(item => item.firmSlug === 'fundednext')
  const priceCount = products.reduce((total, product) => total + product.accountSizes.filter(tier =>
    tier.priceUsd != null && tier.priceUsd > 0,
  ).length, 0)
  const allPrices = products.flatMap(product => product.accountSizes.flatMap(tier =>
    tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : [],
  ))
  const minimumPrice = allPrices.length ? Math.min(...allPrices) : null
  const maximumPrice = allPrices.length ? Math.max(...allPrices) : null
  const oldestProductCapture = products.map(product => product.sourceCapturedAt).sort().at(0)
  const evidenceDates = [
    ...Object.entries(mt5Evidence).flatMap(([key, value]) => value && typeof value === 'object' && 'sourceCapturedAt' in value
      ? [{ label: key === 'ea' ? 'советники EA' : key === 'instantEaScope' ? 'советники Stellar Instant' : key === 'freeTrial' ? 'бесплатный тест' : key === 'platformAvailability' ? 'платформы' : key === 'strategyContinuity' ? 'сохранение стратегии' : key === 'prohibitedStrategies' ? 'запрещённые стратегии' : key === 'password' ? 'пароль' : key === 'utilities' ? 'загрузка' : 'вход в счёт', capturedAt: value.sourceCapturedAt }] : []),
    { label: 'цены', capturedAt: oldestProductCapture ?? '' },
    { label: 'доступ по стране', capturedAt: marketEvidence.capturedAt },
  ]
  const hasFreshEvidence = evidenceDates.every(item => isChallengeFresh({ sourceCapturedAt: item.capturedAt }))
  const sourceUrls = [...new Set([
    mt5Evidence.platformAvailability.sourceUrl,
    mt5Evidence.desktopLogin.sourceUrl,
    mt5Evidence.dashboardLogin.sourceUrl,
    mt5Evidence.utilities.sourceUrl,
    mt5Evidence.password.sourceUrl,
    mt5Evidence.ea.sourceUrl,
    mt5Evidence.instantEaScope.sourceUrl,
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
    dateModified: russianRouteDateModified(PATH, mt5Evidence.capturedAt),
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <article
        className="ru-review-article"
        data-russian-fundednext-mt5-article="unique-source-backed-guide"
        data-russian-fundednext-mt5="search-to-rule"
        data-russian-platform-intent="fundednext-mt5-ea"
      >
        <section className="ru-hero">
          <div className="ru-shell">
            <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/obzor-fundednext">FundedNext</Link> / MT5</div>
            <div className="ru-eyebrow"><MonitorCog size={14} aria-hidden="true" /> Установка, вход и условия автоматизации</div>
            <h1>FundedNext MT5: как скачать, войти и проверить правила EA</h1>
            <p className="ru-review-meta">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Текст обновлён <time dateTime={russianRouteDateModified(PATH)}>{russianRouteDateModified(PATH)}</time></p>
            <p className="ru-lead">
              Если счёт уже открыт, начните с номера счёта и сервера в личном кабинете. Если только выбираете программу,
              сначала проверьте доступность MT5 для своего профиля и ограничения советников: оплата дополнения EA сама по себе не разрешает автоматизацию на любом размере счёта.
            </p>
            <div className="ru-stats">
              <div className="ru-stat"><strong>{products.length}</strong><span>программы с проверкой цен</span></div>
              <div className="ru-stat"><strong>{priceCount}</strong><span>цены в долларах США</span></div>
              <div className="ru-stat"><strong>{minimumPrice != null && maximumPrice != null ? `${money(minimumPrice)}–${money(maximumPrice)}` : 'Нужна проверка'}</strong><span>базовая стоимость участия</span></div>
              <div className="ru-stat"><strong>{sourceUrls.length}</strong><span>первичных страниц</span></div>
            </div>
            <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-mt5-hero">
              <Link href="/go/fundednext?from=ru-fundednext-mt5-hero" rel="sponsored nofollow noopener" className="btn-primary btn-glow">
                Проверить FundedNext MT5 <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <a href="#login" className="btn-outline">Инструкция входа</a>
              <a href="#ea-rules" className="btn-outline">Правила EA</a>
            </div>
            <p className="ru-source-line">Партнёрская ссылка может принести нам комиссию. Она не подтверждает доступность MT5, допуск по стране или разрешение конкретного советника.</p>
          </div>
        </section>

        <section className="ru-section ru-review-opening">
          <div className="ru-shell">
            <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
            <RussianFundedNextEaNotice instant />
            <div className="ru-notice" data-russian-country-boundary="fundednext-mt5-profile-not-language">
              <strong><Globe2 size={16} aria-hidden="true" /> Русский язык не является разрешением на MT5.</strong>{' '}
              В датированных источниках для США указан только Match-Trader, а по резидентам России остаётся противоречие.
              В любой стране проверяйте гражданство, резидентство, документы, оплату и возможность вывода.
            </div>
            <div className="ru-notice ru-disclosure">
              <strong>О партнёрских ссылках.</strong>{' '}
              Регистрация по нашим ссылкам может принести Traders Fund Hub комиссию.
              Ссылки на инструкции FundedNext по установке, входу и правилам ведут прямо в справочный центр.
            </div>
            <nav className="toc ru-review-toc" aria-label="Содержание руководства FundedNext MT5">
              <div className="toc-title">Содержание</div>
              <ol>
                <li><a href="#answer">Короткий ответ</a></li>
                <li><a href="#login">Скачать MT5 и выбрать сервер</a></li>
                <li><a href="#products">Программы и базовые цены</a></li>
                <li><a href="#free-trial">Free Trial на MT5</a></li>
                <li><a href="#ea-rules">Советники: размер счёта и доплата</a></li>
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
                  <tr><td><strong>Есть ли MT5?</strong></td><td>Да, в общем списке платформ</td><td>Страна и доступность при оформлении заказа</td></tr>
                  <tr><td><strong>Где скачать?</strong></td><td>Utilities в личном кабинете; Windows, iOS, Android</td><td>Не используйте неизвестные зеркала загрузки</td></tr>
                  <tr><td><strong>Как войти?</strong></td><td>Номер счёта, пароль и точное имя сервера</td><td>Для платных счетов и Free Trial серверы различаются</td></tr>
                  <tr><td><strong>Разрешён ли EA?</strong></td><td>Только ниже {money(mt5Evidence.ea.manualOnlyFromAccountSizeUsd)}, с платным дополнением и условиями</td><td>Free Trial запрещает EA отдельно; cTrader и Match-Trader — только вручную</td></tr>
                  <tr><td><strong>Возвращается ли доплата за EA?</strong></td><td>Нет, она невозвратная</td><td>Возврат основного взноса не включает эту доплату</td></tr>
                  <tr><td><strong>Можно ли сменить стратегию?</strong></td><td>Нельзя после оценки менять ручную торговлю на EA или наоборот</td><td>Смена риска или класса активов тоже проверяется</td></tr>
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
              <h2>Где скачать FundedNext MT5 и как войти в счёт</h2>
              <p>
                Инструкция для компьютера от {mt5Evidence.desktopLogin.publishedAt} требует три поля: номер счёта, пароль и имя сервера.
                Сначала откройте письмо с данными счёта или личный кабинет FundedNext. Сам установщик не создаёт торговый счёт и не выбирает за вас правильный сервер.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card">
                <MonitorCog size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>1. Скачайте официальный терминал</h3>
                <p>В личном кабинете откройте Utilities и выберите версию для {mt5Evidence.utilities.mt5Downloads.join(', ')}. В справке от {mt5Evidence.utilities.publishedAt} этот раздел заменяет прежний Toolkit.</p>
              </article>
              <article className="ru-card">
                <KeyRound size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>2. Подключите существующий счёт</h3>
                <p>В терминале найдите FundedNext и выберите Connect with an Existing Trade Account — подключение к существующему торговому счёту. Создание нового демонстрационного счёта MetaTrader не заменяет программу FundedNext или Free Trial.</p>
              </article>
              <article className="ru-card">
                <Database size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>3. Сопоставьте сервер</h3>
                <p>Для платных счетов указаны {mt5Evidence.desktopLogin.paidServers.join(' или ')}; для Free Trial и ежемесячного конкурса — {mt5Evidence.desktopLogin.freeTrialServer}. Не выбирайте сервер наугад: сверяйте его с данными именно своего счёта.</p>
              </article>
              <article className="ru-card">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>4. Не передавайте торговый пароль</h3>
                <p>Правило от {mt5Evidence.password.publishedAt} запрещает делиться паролем. Новый пароль MT4/MT5 создаётся в личном кабинете и приходит на зарегистрированный адрес электронной почты.</p>
              </article>
            </div>
            <div className="ru-content">
              <h3>Если терминал не подключается</h3>
              <p>Сверьте все три поля с одним и тем же счётом: номер от платной программы и сервер бесплатного теста не образуют подходящую пару. Затем проверьте подключение к интернету. Если данные совпадают, обратитесь в поддержку FundedNext; не отправляйте торговый пароль в публичный чат.</p>
            </div>
            <div className="ru-actions">
              <a href={mt5Evidence.desktopLogin.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Инструкция для компьютера</a>
              <a href={mt5Evidence.dashboardLogin.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Вход из личного кабинета</a>
              <a href={mt5Evidence.utilities.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Раздел загрузок Utilities</a>
              <a href={mt5Evidence.password.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Правило пароля</a>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="products" data-russian-fundednext-mt5-products={products.length}>
            <div className="ru-content">
              <h2>Сначала выберите модель FundedNext, затем MT5</h2>
              <p>
                {products.length ? `Ниже — ${products.length} программы и ${priceCount} базовых цен в долларах США; самая ранняя проверка этих цен — ${oldestProductCapture}.` : 'Проверка цен вышла за 30-дневное окно, поэтому числовые предложения временно скрыты.'}
                {' '}Количество этапов, лимит убытка и условия первой заявки на вознаграждение относятся к программе, а не к терминалу MT5.
              </p>
            </div>
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-fundednext-mt5-product-matrix="four-models">
                <thead><tr><th>Программа</th><th>Этапы / цель</th><th>Цена</th><th>Макс. убыток</th><th>Тип лимита</th><th>Базовая доля</th><th>Первая заявка</th></tr></thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.productSlug} data-russian-fundednext-mt5-product={product.productSlug}>
                      <td><strong>{product.productName}</strong></td>
                      <td>{product.phases}; {targetLabel(product)}</td>
                      <td>{priceRange(product)}</td>
                      <td>{product.maxLossPct == null ? 'Не подтверждено' : `${product.maxLossPct}%`}</td>
                      <td>{product.drawdownType ? drawdownLabels[product.drawdownType] ?? product.drawdownType : '—'}</td>
                      <td>{product.profitSplitPct == null ? 'Не подтверждено' : `${product.profitSplitPct}%`}</td>
                      <td data-russian-payout-product={`${product.firmSlug}:${product.productSlug}`}>{payoutLabel(product)}</td>
                    </tr>
                  ))}
                  {products.length === 0 ? <tr><td colSpan={7}>Продуктовые источники старше 30 дней; числовая матрица временно скрыта.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="ru-notice">
              <strong>Что не доказывает таблица.</strong> Общий список платформ подтверждает MT5 у FundedNext, но не его доступность для любой программы, суммы и страны. До оплаты проверьте выбранные программу, размер счёта и платформу в заказе. Базовая цена не включает неподтверждённые дополнительные опции.
            </div>
            <RussianFundedNextPayoutNotice />
            <div className="ru-actions">
              <Link href="/ru/fundednext-stellar-instant" className="btn-outline">Правила Stellar Instant</Link>
              <Link href="/ru/obzor-fundednext#products" className="btn-outline">Полный обзор программ</Link>
              <Link href="/ru/luchshie-prop-firmy#podbor" className="btn-outline">Сравнить цены и правила программ</Link>
              <Link href="/go/fundednext?from=ru-fundednext-mt5-products" rel="sponsored nofollow noopener" className="btn-primary">
                Проверить MT5 при оформлении <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="free-trial" data-russian-fundednext-mt5-free-trial="mt5-no-ea">
            <div className="ru-content">
              <h2>Free Trial: отдельный MT5-сервер, {mt5Evidence.freeTrial.profitTargetPct}% цель и запрет EA</h2>
              <p>
                Free Trial — одноэтапный бесплатный тест на {mt5Evidence.freeTrial.durationDays} дней с минимум {mt5Evidence.freeTrial.minimumTradingDays} торговыми днями,
                целью {mt5Evidence.freeTrial.profitTargetPct}% и лимитом {mt5Evidence.freeTrial.maximumOpenPositions} одновременно открытых позиций.
                Для обычного профиля используется MT5 и {mt5Evidence.desktopLogin.freeTrialServer}; для США — только {mt5Evidence.freeTrial.usaPlatform}.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>EA запрещён в бесплатном тесте</h3><p>Платное дополнение для оценочной программы не даёт права использовать советника в Free Trial. Правила теста запрещают EA и предусматривают блокировку новых сделок при их использовании.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Один активный тест</h3><p>Одновременно разрешён 1 Free Trial на один email и IP. После отключения можно запросить следующий; это не разрешает несколько параллельных аккаунтов.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Купон появляется после цели</h3><p>{currentDeal ? `В проверенном предложении указан персональный купон ${currentDeal.pct}% после достижения цели. Срок — ${mt5Evidence.freeTrial.couponValidityDays} дней; только для новых пользователей и подходящих CFD-программ, без сброса счёта. Применимость к выбранной покупке нужно проверить отдельно.` : 'Предложение или правила теста требуют повторной проверки; купон не показывается как действующий.'}</p></article>
            </div>
            <p className="ru-source-line">
              <a href={mt5Evidence.freeTrial.sourceUrl} target="_blank" rel="nofollow noopener">Официальные Free Trial Rules</a> · проверено {mt5Evidence.freeTrial.sourceCapturedAt}.
              {currentDeal ? <> Предложение проверено {currentDeal.verifiedOn}.</> : null}
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
              <h2>Советники в FundedNext MT5: ограничения важнее доплаты</h2>
              <p>
                В проверке от {mt5Evidence.ea.sourceCapturedAt} платное дополнение доступно для допустимого использования EA на счетах меньше {money(mt5Evidence.ea.manualOnlyFromAccountSizeUsd)}.
                На этой сумме и выше требуется ручная торговля. Источник не указывает дату вступления ограничения в силу или исключение для ранее открытых счетов — не предполагайте такое исключение без письменного ответа фирмы.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card"><Bot size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Платформа и сумма счёта</h3><p>Проверьте обе границы: MT4/MT5 и счёт ниже указанного порога. В cTrader и Match-Trader автоматизация запрещена независимо от размера счёта.</p></article>
              <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Доплата невозвратная</h3><p>Дополнение EA оплачивается сверх основного взноса и не возвращается даже при неиспользовании. Подтверждённой суммы в статье нет; уточняйте её при оформлении.</p></article>
              <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Нужны собственные настройки</h3><p>Настройки советника должны соответствовать вашей стратегии. Одинаковые сделки на нескольких счетах могут привести к признанию нарушения и повторному прохождению этапа.</p></article>
              <article className="ru-card"><Database size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. Общий лимит стратегии</h3><p>Для одной стратегии EA указан суммарный размер счетов {money(mt5Evidence.ea.maxAllocationUsdPerStrategy)}. Это отдельная граница: она не разрешает советника на любом одиночном счёте внутри этой суммы.</p></article>
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>5. Запрещены сторонние сигнальные интеграции</h3><p>В правиле отдельно названы приложения {mt5Evidence.ea.forbiddenThirdPartyIntegrations.join(' и ')}. Установка их связки с MT5 не делает такую автоматизацию допустимой.</p></article>
              <article className="ru-card"><CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>6. Нет ботов для прохождения оценки</h3><p>Советники, специально предназначенные для прохождения испытаний проп-фирм, запрещены. Отсутствие названия бота в списке примеров не означает разрешения.</p></article>
              <article className="ru-card"><KeyRound size={22} color="var(--accent-light)" aria-hidden="true" /><h3>7. Помощник управления риском тоже может быть EA</h3><p>Изменение стоп-лосса, тейк-профита или объёма позиции инструментом считается автоматизацией. То, что он не открывает сделку самостоятельно, не освобождает от ограничений EA.</p></article>
            </div>
            <p className="ru-source-line"><a href={mt5Evidence.ea.sourceUrl} target="_blank" rel="nofollow noopener">Официальное правило EA</a> · проверено {mt5Evidence.ea.sourceCapturedAt}.</p>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="continuity" data-russian-fundednext-mt5-continuity="same-strategy-after-evaluation">
            <h2>Нельзя пройти оценку вручную, а затем передать торговлю советнику</h2>
            <p>
              Правило сохранения стратегии запрещает обе замены: с ручной торговли на советника и с советника на ручную торговлю после оценки.
              FundedNext также проверяет существенные изменения класса активов, категории инструментов, используемой маржи и риска. Последствия могут включать приостановку счёта и отказ в вознаграждении.
            </p>
            <ol>
              <li><strong>До оплаты:</strong> выберите допустимый для вашего счёта способ торговли и сохраните параметры стратегии.</li>
              <li><strong>Во время оценки:</strong> не используйте услуги прохождения за вас, чужие сигналы, счета или устройства.</li>
              <li><strong>На счёте после оценки:</strong> сохраняйте способ исполнения, класс активов и сопоставимый уровень риска.</li>
              <li><strong>При запросе фирмы:</strong> будьте готовы объяснить EA, настройки, владельца и источник логики.</li>
            </ol>
            <div className="ru-actions">
              <a href={mt5Evidence.strategyContinuity.sourceUrl} target="_blank" rel="nofollow noopener" className="btn-outline">Сохранение стратегии после оценки</a>
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
                <thead><tr><th>Платформа</th><th>Советники и автоматизация</th><th>$100K–$200K</th><th>Профили США</th><th>Вход</th></tr></thead>
                <tbody>
                  <tr><td><strong>MT5</strong></td><td>Счёт ниже {money(mt5Evidence.ea.manualOnlyFromAccountSizeUsd)}, платное дополнение и условия EA</td><td>Размеры не исключены общим списком платформ, но автоматизация на них запрещена</td><td>Недоступно; только Match-Trader</td><td>Номер, пароль и сервер</td></tr>
                  <tr><td><strong>cTrader</strong></td><td>Только ручная торговля; cBot запрещён</td><td>Покупка, сброс и увеличение счёта ограничены</td><td>Недоступно</td><td>Данные cTrader ID</td></tr>
                  <tr><td><strong>Match-Trader</strong></td><td>Только ручная торговля</td><td>Ограничено, кроме счетов Match-Trader для США</td><td>Единственный опубликованный вариант</td><td>Данные аккаунта</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ru-actions"><Link href="/ru/prop-firmy-s-ctrader" className="btn-outline">Отдельный разбор cTrader</Link></div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content" id="checkout" data-russian-fundednext-mt5-checkout="product-plus-add-on">
            <h2>Итоговая стоимость: основной взнос и дополнительные опции</h2>
            <p>
              {products.length ? `В таблице ${priceCount} базовых цен от ${money(minimumPrice)} до ${money(maximumPrice)}.` : 'Базовые цены нужно повторно проверить у FundedNext.'}
              {' '}Доплата за EA не включена в эти числа. Её подтверждённой суммы в статье нет, поэтому окончательную стоимость проверяйте в заказе — после проверки допустимости советника на выбранном счёте.
            </p>
            <ol>
              <li><strong>Зафиксируйте модель и размер:</strong> Stellar 2-Step, 1-Step, Lite или Instant.</li>
              <li><strong>Выберите MT5:</strong> не переносите цену с cTrader или Match-Trader.</li>
              <li><strong>Проверьте допуск к EA:</strong> если счёт подходит и советник нужен, уточните невозвратную доплату. Возврат основного взноса её не покрывает.</li>
              <li><strong>Сверьте итоговую сумму:</strong> акция, счёт без свопов, VPS и EA могут изменить стоимость.</li>
              <li><strong>Сохраните номер заказа:</strong> программу, сумму счёта, платформу, дополнительные опции и дату покупки.</li>
            </ol>
            <div className="ru-notice"><strong>Когда стоит остановиться:</strong> если MT5 или нужная опция недоступны при оформлении, не оплачивайте неподходящий вариант в расчёте на последующее переключение по общей статье о платформах.</div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" id="country" data-russian-fundednext-mt5-diaspora="country-before-platform">
            <div className="ru-content">
              <h2>Русскоязычные трейдеры живут в разных странах — MT5 проверяется по профилю</h2>
              <p>
                Русскоязычный пользователь в Казахстане, ОАЭ, ЕС, Израиле, Великобритании или Северной Америке должен проверять
                гражданство, резидентство, адрес, местоположение подключения, проверку личности, способ оплаты и вывода. Русский интерфейс или другой паспорт не заменяет проверку всего профиля.
              </p>
            </div>
            <div className="ru-notice">
              <strong>Для резидентов России остаётся конфликт.</strong>{' '}
              В зафиксированной статье об ограничениях CFD Россия не названа, но корпоративная страница говорит, что компания не обслуживает её резидентов.
              Установка MT5 не разрешает это противоречие. Перепроверьте оба источника и получите письменный ответ поддержки для своего профиля до оплаты.
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
                Сначала убедитесь, что ваш профиль и выбранная программа допускаются на MT5. Для советника дополнительно нужны подходящий размер счёта, собственные настройки,
                допустимая стратегия и учёт невозвратной доплаты. Суммарный лимит стратегии не заменяет ограничение отдельного счёта.
                Для профиля США, торговли через cBot, услуг прохождения оценки или смены способа торговли после оценки такой выбор не подходит.
              </p>
            </div>
            <div className="ru-grid">
              <article className="ru-card" data-russian-fundednext-mt5-primary-partner="fundednext">
                <h3>FundedNext: проверьте условия своей программы</h3>
                <p>Для покупки нужны три отдельных ответа: доступен ли ваш профиль, есть ли выбранная программа на MT5 и разрешён ли нужный способ торговли. Начните с обзора программ и официальных инструкций выше.</p>
                <div className="ru-actions" data-russian-affiliate-disclosure="fundednext-mt5-verdict">
                  <Link href="/go/fundednext?from=ru-fundednext-mt5-verdict" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={15} aria-hidden="true" /></Link>
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                </div>
              </article>
              {brightFirm?.affiliateUrl && brightFirm.platforms.includes('MT5') ? (
                <article className="ru-card" data-russian-fundednext-mt5-alternative="bright-funded">
                  <h3>Bright Funded: отдельная альтернатива для проверки</h3>
                  <p>В нашем профиле Bright Funded указан MT5, но это не подтверждение для любого счёта и страны. Цены выражены в евро; серверы, советники и проверка личности регулируются собственными условиями фирмы.</p>
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
            <p>Ниже {sourceUrls.length} уникальных страниц FundedNext, на которых основан разбор. Даты проверки установки, правил и цен различаются; обновление статьи не делает все условия заново подтверждёнными.</p>
            <ol>
              {sourceUrls.map((url, index) => (
                <li key={url}><a href={url} target="_blank" rel="nofollow noopener">Источник {index + 1}</a></li>
              ))}
            </ol>
            <p className="ru-source-line">Установка и исходные правила: {mt5Evidence.capturedAt}. Правило EA: {mt5Evidence.ea.sourceCapturedAt}. Самая ранняя проверка текущих цен: {oldestProductCapture ?? 'нужна повторная проверка'}. Предложение: {currentDeal?.verifiedOn ?? 'не показывается как действующее'}.</p>
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
