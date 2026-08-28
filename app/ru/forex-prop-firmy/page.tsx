import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ChartCandlestick,
  CircleAlert,
  Database,
  Globe2,
  MonitorCog,
  Scale,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, isChallengeFresh, type Challenge, type ChallengeAccountSize } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import forexEvidence from '@/content/data/russian-forex-evidence.json'

const PATH = '/ru/forex-prop-firmy'
const TITLE = 'Форекс проп-фирмы 2026: 7 продуктов и правила'
const DESCRIPTION = 'Сравнение 7 forex-продуктов FundedNext и Bright Funded: цены, плечо, просадка, платформы, валютные пары, KYC и доступ для русскоязычных.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое forex prop firm?',
    a: 'Это retail-проп-фирма с программой оценки или instant-продуктом, где доступны симулированные forex-инструменты. Трейдер соблюдает цели и риск-лимиты, а после проверки может получать договорную долю одобренного performance reward.',
  },
  {
    q: 'Forex-проп-фирма является брокером?',
    a: 'Не обязательно. FundedNext прямо описывает Stellar как CFD-продукты в симулированной среде, а Bright Funded называет свою среду simulated. Проверять нужно юридическое лицо, договор, платформу и статус счёта, а не только наличие EURUSD.',
  },
  {
    q: 'У какой из двух фирм больше опубликованных forex-пар?',
    a: 'FundedNext публикует список из 43 уникальных символов. Bright Funded подтверждает major, minor и exotic pairs, но на захваченной первичной странице не публикует итоговое число; поэтому сравнивать 43 с выдуманным числом Bright нельзя.',
  },
  {
    q: 'Плечо 1:100 лучше, чем 1:30?',
    a: 'Не автоматически. 1:100 уменьшает требуемую маржу для той же позиции, но не расширяет daily loss или maximum loss. Для стратегии важны одновременно размер лота, стоп, корреляция, плавающий убыток и формула просадки.',
  },
  {
    q: 'Можно ли торговать forex без челленджа?',
    a: 'FundedNext Stellar Instant имеет 0 фаз и forex-плечо 1:30, но сохраняет 6% trailing maximum loss, 70% стартовый split и отдельный reward gate. Отсутствие оценки не означает отсутствие правил.',
  },
  {
    q: 'Доступны ли эти forex-проп-фирмы резидентам России?',
    a: 'Нельзя давать общее обещание. Официальные страницы FundedNext противоречат друг другу по российским резидентам, а доступ Bright Funded также требует проверки страны, KYC, платформы, платежа и payout rail до покупки.',
  },
  {
    q: 'Есть ли российские forex-проп-компании?',
    a: 'Русскоязычный или российский оператор не обязательно предлагает глобальную CFD forex-модель. Некоторые локальные компании работают с фьючерсами Московской биржи, обучением или стажировкой. Их нужно проверять отдельно от FundedNext и Bright Funded.',
  },
]

function priceForTier(tier: ChallengeAccountSize) {
  if (tier.priceUsd != null) return `$${tier.priceUsd.toFixed(2)}`
  if (tier.priceEur != null) return `€${tier.priceEur.toFixed(0)}`
  return 'не опубликована'
}

function referenceTier(product: Challenge) {
  return product.accountSizes.find(tier => tier.sizeUsd === 100000)
    ?? [...product.accountSizes].sort((a, b) => b.sizeUsd - a.sizeUsd)[0]
}

function formatAccountSize(sizeUsd: number) {
  return `$${sizeUsd.toLocaleString('en-US')}`
}

function formatTargets(product: Challenge) {
  if (product.phases === 0 || product.profitTargets == null) return '0 фаз'
  const targets = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((target): target is number => target != null)
  return targets.map(target => `${target}%`).join(' → ')
}

function formatRiskRoom(product: Challenge, tier: ChallengeAccountSize) {
  const daily = product.dailyLossPct == null
    ? 'daily не опубликован'
    : `daily $${Math.round(tier.sizeUsd * product.dailyLossPct / 100).toLocaleString('en-US')}`
  const maximum = product.maxLossPct == null
    ? 'max не опубликован'
    : `max $${Math.round(tier.sizeUsd * product.maxLossPct / 100).toLocaleString('en-US')}`
  return `${daily}; ${maximum}`
}

function formatDrawdown(product: Challenge) {
  if (product.drawdownType === 'static') return 'static'
  if (product.drawdownType === 'trailing') return 'trailing'
  if (product.drawdownType === 'eod-trailing') return 'EOD trailing'
  return product.drawdownType ?? 'не подтверждён'
}

function productFirm(product: Challenge) {
  return product.firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'
}

export default function RussianForexPropFirmsPage() {
  const products = getAllChallenges()
    .filter(product => isChallengeFresh(product))
    .filter(product => product.firmSlug === 'fundednext' || product.firmSlug === 'bright-funded')
  const fundedNextProducts = products.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = products.filter(product => product.firmSlug === 'bright-funded')
  const fundedNextEvidence = forexEvidence.firms.find(firm => firm.firmSlug === 'fundednext')
  const brightEvidence = forexEvidence.firms.find(firm => firm.firmSlug === 'bright-funded')
  const sourceCount = new Set([
    ...products.map(product => product.sourceUrl),
    ...forexEvidence.firms.flatMap(firm => firm.sourceUrls),
  ]).size

  function leverageFor(product: Challenge) {
    const firm = forexEvidence.firms.find(item => item.firmSlug === product.firmSlug)
    const rule = firm?.forexLeverage.find(item => item.products.includes(product.productName))
    return rule ? `1:${rule.ratio}` : 'не подтверждено'
  }

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Форекс проп-фирмы' },
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
    dateModified: '2026-08-28',
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <article data-russian-forex-article="instrument-to-product" data-russian-search-intent="prop-forex">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Форекс проп-фирмы</div>
          <div className="ru-eyebrow"><ChartCandlestick size={14} aria-hidden="true" /> Forex: продукт, а не логотип</div>
          <h1>Форекс проп-фирмы: 7 продуктов для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Сравниваем 7 продуктов FundedNext и Bright Funded как forex-маршруты:
            опубликованные валютные пары, плечо 1:30 или 1:100, цена, тип просадки,
            платформа, KYC и первая дата reward. Русский язык не заменяет проверку страны.
          </p>
          <div className="ru-stats" aria-label="Проверяемая forex-выборка">
            <div className="ru-stat"><strong>{products.length}</strong><span>актуальных продуктов</span></div>
            <div className="ru-stat"><strong>{fundedNextEvidence?.forexSymbols?.length ?? '—'}</strong><span>пар в списке FundedNext</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>уникальных первичных страниц</span></div>
            <div className="ru-stat"><strong>{forexEvidence.capturedAt}</strong><span>проверка forex-источников</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#produkty" className="btn-primary btn-glow">Сравнить 7 продуктов <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/chto-takoe-prop-firma" className="btn-outline">Сначала понять модель</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="forex-profile-not-language">
            <strong>Forex-инструмент не доказывает доступ страны.</strong>{' '}
            Для русскоязычного трейдера в любой стране отдельно проверяются 7 полей:
            резидентство, гражданство, KYC, IP, платёж, платформа и payout rail.
            VPN не меняет договор, удостоверение личности или адрес.
          </div>
          <h2>Что означает «проп форекс» в этой статье</h2>
          <p>
            Здесь «forex prop» означает глобальный retail-продукт с симулированными валютными инструментами,
            оценкой от 0 до 2 фаз и договорным performance reward. Это не депозит у forex-брокера,
            не покупка 43 валютных пар и не работа в традиционном банковском dealing desk.
          </p>
          <p>
            Разница важна из-за 3 денежных объектов. Fee оплачивает доступ к оценке или instant-продукту;
            номинал $100 000 задаёт базу части правил; payout относится только к одобренной доле результата.
            Ни один из этих объектов нельзя автоматически считать личным брокерским балансом.
          </p>
          <p>
            Английские термины forex, simulated account и performance reward сохранены рядом с русским объяснением,
            потому что именно эти слова встречаются в правилах и checkout глобальных фирм. Перед оплатой сопоставьте
            перевод с исходной формулировкой продукта, а не полагайтесь только на русскоязычную рекламу.
          </p>
        </div>
      </section>

      <section className="ru-section" id="produkty" data-russian-forex-products={products.length}>
        <div className="ru-shell ru-content">
          <h2>Семь текущих forex-продуктов: цена, плечо и риск</h2>
          <p>
            В таблице используется общий tier $100 000, если фирма его продаёт; у Stellar Instant показан максимальный tier $20 000.
            Денежные daily/max значения вычисляются из номинала и текущего процента продукта, а не из возможной позиции 1:100.
            Цена сохраняет исходную валюту: USD у FundedNext и EUR у Bright Funded.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Семь forex-продуктов FundedNext и Bright Funded</caption>
              <thead><tr><th>Продукт</th><th>Tier / цена</th><th>Цель</th><th>Forex-плечо</th><th>Daily / max</th><th>Тип</th><th>Источник</th></tr></thead>
              <tbody>
                {products.map(product => {
                  const tier = referenceTier(product)
                  return (
                    <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-forex-product={`${product.firmSlug}:${product.productSlug}`}>
                      <td><strong>{productFirm(product)}</strong><br />{product.productName}</td>
                      <td>{formatAccountSize(tier.sizeUsd)} / {priceForTier(tier)}</td>
                      <td>{formatTargets(product)}</td>
                      <td>{leverageFor(product)}</td>
                      <td>{formatRiskRoom(product, tier)}</td>
                      <td>{formatDrawdown(product)}</td>
                      <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt}</a></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Продуктовые записи проверены не более 30 дней назад. Forex-плечо взято из отдельных первичных справок,
            потому что цена и drawdown не доказывают margin rule. «Не опубликован» означает пробел источника, а не нулевой лимит.
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-featured-partners="fundednext-bright-funded">
        <div className="ru-shell ru-content">
          <h2>FundedNext или Bright Funded для forex: где реальная развилка</h2>
          <p>
            FundedNext даёт 4 продуктовых маршрута, включая 0-фазный Instant; Bright Funded даёт 3 оценки
            с единым forex-плечом 1:100. Это коммерческий shortlist из 2 партнёров, а не утверждение,
            что одна фирма подходит любому скальперу, swing-трейдеру или резидентству.
          </p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-forex-featured-partner="fundednext">
              <div className="ru-card-head"><h3>FundedNext</h3><span className="ru-score">{fundedNextProducts.length} продукта</span></div>
              <ul className="ru-facts">
                <li><Database size={14} aria-hidden="true" /> {fundedNextEvidence?.forexSymbols?.length ?? '—'} опубликованных forex-пар</li>
                <li><Scale size={14} aria-hidden="true" /> 1:100 для 3 оценок; 1:30 для Instant</li>
                <li><MonitorCog size={14} aria-hidden="true" /> MT4, MT5, cTrader, Match-Trader</li>
                <li><WalletCards size={14} aria-hidden="true" /> Первый standard reward: 5 или 21 день по продукту</li>
              </ul>
              <p className="ru-muted">
                Подходит для сравнения 0-, 1- и 2-фазного пути. Stellar Instant нельзя оценивать по правилам Stellar 2-Step:
                у Instant ниже плечо, trailing max loss и отдельный reward gate.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор</Link>
                <Link href="/go/fundednext?from=ru-forex-shortlist-fundednext" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить FundedNext <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
            <article className="ru-card" data-russian-forex-featured-partner="bright-funded">
              <div className="ru-card-head"><h3>Bright Funded</h3><span className="ru-score">{brightProducts.length} продукта</span></div>
              <ul className="ru-facts">
                <li><Database size={14} aria-hidden="true" /> Major, minor и exotic pairs; число не опубликовано</li>
                <li><Scale size={14} aria-hidden="true" /> 1:100 на Challenge и Funded Account</li>
                <li><MonitorCog size={14} aria-hidden="true" /> DXTrade, cTrader, MT5</li>
                <li><WalletCards size={14} aria-hidden="true" /> Первый standard reward: 30 дней</li>
              </ul>
              <p className="ru-muted">
                Подходит для сравнения трёх EUR-priced оценок. 1-Step использует 6% trailing max,
                а 2-Step Bright и Classic — 8% и 10% static; одинаковое плечо не делает риск одинаковым.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-bright-funded" className="btn-outline">Полный обзор</Link>
                <Link href="/go/bright-funded?from=ru-forex-shortlist-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="forex-shortlist">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Traders Fund Hub может получить комиссию после перехода на FundedNext или Bright Funded.
            Коммерческая связь не меняет {products.length} строк, {sourceCount} первичных страниц,
            формулу risk room или предупреждение о стране.
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-leverage="margin-not-risk-room">
        <div className="ru-shell ru-content">
          <h2>Плечо 1:100 не превращает просадку 6% в просадку 100%</h2>
          <p>
            Плечо определяет максимальную экспозицию относительно маржи, а drawdown определяет линию нарушения.
            <a href={brightEvidence?.sourceUrls[1]} target="_blank" rel="nofollow noopener">Bright Funded приводит пример</a>:
            на $100 000 Challenge Account forex-плечо 1:100 соответствует
            $10 000 000 теоретической экспозиции. Но daily loss 3% на Bright 1-Step остаётся $3 000,
            а 6% maximum loss — $6 000 по номиналу продукта.
          </p>
          <p>
            Для FundedNext Stellar 2-Step tier $100 000 имеет 5% daily и 10% static maximum loss:
            это $5 000 и $10 000 границы до учёта точной формулы equity и reset time.
            Та же фирма даёт Instant только 1:30 и 6% trailing max; меньшая маржинальная мощность
            не отменяет движения trailing-линии за новым максимумом.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <Calculator size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>1. Стоп в валюте</h3>
              <p className="ru-muted">Риск сделки = размер лота × стоимость пункта × стоп. Плечо не заменяет этот расчёт.</p>
            </article>
            <article className="ru-card">
              <CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>2. Совокупный риск</h3>
              <p className="ru-muted">EURUSD, GBPUSD и XAUUSD могут двигаться коррелированно; 3 позиции не являются 3 независимыми рисками.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>3. Остаток до breach</h3>
              <p className="ru-muted">Считайте от текущей equity и правила static/trailing, а не от первоначального рекламного номинала.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-instruments="published-vs-terminal">
        <div className="ru-shell ru-content">
          <h2>Пары и платформы: что подтверждено первичными источниками</h2>
          <p>
            FundedNext публикует {fundedNextEvidence?.forexSymbols?.length ?? '—'} уникальных forex-символа,
            включая major, minor и exotic pairs. В список входят EURUSD, GBPUSD, USDJPY, EURGBP,
            USDMXN, USDZAR и USDSEK; XAUUSD находится в отдельной категории commodities,
            поэтому золото нельзя считать 44-й валютной парой.
          </p>
          <p>
            <a href={fundedNextEvidence?.sourceUrls[0]} target="_blank" rel="nofollow noopener">Справка FundedNext об инструментах</a>{' '}
            называет 4 терминала: MT4, MT5, cTrader и Match-Trader, но финальный список нужно открывать
            через Market Watch конкретного аккаунта. Публичный список от 9 апреля 2026 не гарантирует,
            что каждый символ включён на любой платформе и сервере 28 августа 2026.
          </p>
          <p>
            Bright Funded подтверждает <a href={brightEvidence?.sourceUrls[0]} target="_blank" rel="nofollow noopener">major, minor и exotic forex pairs</a>,
            но не публикует итоговое число на захваченной странице. Отдельная
            <a href={brightEvidence?.sourceUrls[2]} target="_blank" rel="nofollow noopener"> справка о 3 платформах</a>{' '}
            называет DXTrade, cTrader и MT5 и предупреждает, что MT5 недоступен гражданам, резидентам или проживающим в США и ОАЭ.
          </p>
          <div className="ru-notice">
            <strong>Проверка перед оплатой занимает 4 действия.</strong>{' '}
            Откройте live symbol list, сравните contract size, сохраните spread/commission snapshot и подтвердите платформу для страны.
            Логотип MT5 на общей странице не является гарантией MT5 для вашего профиля.
          </div>
          <div className="ru-actions">
            <Link href="/ru/prop-firmy-s-ctrader" className="btn-primary">
              Сравнить FundedNext и Bright Funded на cTrader <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/ru/fundednext-mt5" className="btn-outline">FundedNext MT5 и правила EA</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Цена челленджа — не полная стоимость forex-стратегии</h2>
          <p>
            Денежный путь содержит как минимум 6 слоёв: fee, повторная попытка, reset, add-on,
            spread и commission. Для позиции, которую держат ночью, добавляется swap или swap-free условие.
            В текущей структурированной записи есть fee и refund status, но нет универсального live spread;
            поэтому таблица не придумывает стоимость пункта.
          </p>
          <p>
            У FundedNext Stellar 2-Step tier $100 000 стоит $549.99 и fee связан с первым одобренным reward;
            Stellar 1-Step стоит $569.99, но refund для новых аккаунтов связан с третьим reward.
            Разница $20 не отвечает на вопрос о более дешёвом пути без вероятности повторов и фактического refund milestone.
          </p>
          <p>
            У Bright Funded 2-Step Bright tier $100 000 стоит €477, а 1-Step и 2-Step Classic — по €497.
            Экономия €20 сопровождается другой целью и другими daily/max rules. Конвертация EUR в RUB или USD
            должна использовать курс и комиссию в день платежа; фиксированный пересчёт быстро становится ложным.
          </p>
          <p>
            Промокод уменьшает checkout, но не меняет 1:100 leverage, trailing/static drawdown или payout gate.
            Текущие проверенные предложения находятся на <Link href="/ru/promokody-prop-firm">русской странице промокодов</Link>;
            итоговую цену всё равно нужно сверять в checkout.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Country, KYC и payout: маршрут русскоязычного трейдера</h2>
          <p>
            Русскоязычная аудитория живёт в десятках стран, поэтому статья не использует IP-язык как eligibility signal.
            Для FundedNext официальный company disclosure и отдельный CFD FAQ конфликтуют по российским резидентам;
            пока support и checkout не подтверждают профиль, покупка не должна описываться как доступная.
          </p>
          <p>
            Bright Funded использует SumSub KYC после финальной оценки, затем Risk Team Security Check.
            FundedNext проводит KYC после успешного challenge и до активации FundedNext Account.
            Эти 2 последовательности различаются, но обе означают, что успешная forex-сделка до KYC не отменяет проверку документов.
          </p>
          <p>
            Выплата также не определяется словом forex. Bright Funded публикует USDC ERC-20 и банковский перевод в EUR;
            FundedNext публикует несколько rails, но их доступность зависит от страны. Криптовалютный payout
            не отменяет KYC, договор или restriction profile.
          </p>
          <div className="ru-actions">
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary"><Globe2 size={15} aria-hidden="true" /> Проверить профиль страны</Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Сравнить способы выплаты</Link>
            <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Разобрать KYC</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-local-boundary="moex-not-cfd-forex">
        <div className="ru-shell ru-content">
          <h2>Локальные российские компании используют другую продуктовую модель</h2>
          <p>
            Трейдер, который ищет forex CFD, не должен автоматически переходить в любой русскоязычный «проп».
            PropLive описывает торговлю на Московской бирже через Финам, а TeamTraders — фьючерсы Московской биржи.
            Эти 2 модели могут быть полезны для локальной инфраструктуры, но они не заменяют EURUSD в глобальном CFD challenge.
          </p>
          <p>
            Отдельная проверка охватывает 6 операторов: Era Trade, PropLive, KasCapital, А-Лаб Групп,
            TeamTraders и Trade System. Она не выдаёт список за forex-рейтинг и не использует отсутствие affiliate deal
            как отрицательный продуктовый факт.
          </p>
          <div className="ru-actions">
            <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">Проверить 6 локальных моделей</Link>
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary">Вернуться к глобальному сравнению <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-checklist="nine-fields">
        <div className="ru-shell ru-content">
          <h2>Девять полей forex-продукта до checkout</h2>
          <ol>
            <li><strong>Профиль:</strong> гражданство, резидентство, KYC и совпадение владельца платежа.</li>
            <li><strong>Пара:</strong> точный symbol, contract size и доступность на выбранном сервере.</li>
            <li><strong>Платформа:</strong> MT4, MT5, cTrader, Match-Trader или DXTrade для фактической страны.</li>
            <li><strong>Плечо:</strong> 1:30 или 1:100 для названного продукта, а не firm-wide максимум.</li>
            <li><strong>Стоимость:</strong> fee, currency, reset, add-on, spread, commission и swap.</li>
            <li><strong>Просадка:</strong> daily, maximum, static/trailing, equity и reset time.</li>
            <li><strong>Ограничения:</strong> news, overnight, weekend, EA, copying и prohibited conduct.</li>
            <li><strong>Reward:</strong> base split, первая дата, consistency и refund milestone.</li>
            <li><strong>Payout:</strong> rail, валюта, комиссия, минимум и доступность для профиля.</li>
          </ol>
          <p>
            Если 1 из 9 полей остаётся неизвестным, сохраните его как пробел, а не выбирайте рекламный максимум.
            Для product-level решения откройте <Link href="/ru/obzor-fundednext">обзор FundedNext</Link>,
            <Link href="/ru/obzor-bright-funded"> обзор Bright Funded</Link> и их
            <Link href="/ru/fundednext-vs-bright-funded"> прямое сравнение 7 продуктов</Link>. Для MT5 download, login и EA-rule используйте
            <Link href="/ru/fundednext-mt5"> отдельный гайд FundedNext MT5</Link>.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="forex-verdict">
            <strong>Финальный коммерческий маршрут.</strong>{' '}
            Если после 9 проверок подходит FundedNext, используйте
            <Link href="/go/fundednext?from=ru-forex-verdict-fundednext" rel="sponsored nofollow noopener"> текущий партнёрский переход</Link>.
            Если подходит Bright Funded —
            <Link href="/go/bright-funded?from=ru-forex-verdict-bright-funded" rel="sponsored nofollow noopener"> переход Bright Funded</Link>.
            Мы можем получить комиссию; решение и риск остаются у трейдера.
          </div>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <p className="ru-source-line">
            Forex evidence captured {forexEvidence.capturedAt}; product rows use their own sourceCapturedAt.
            Материал информационный и не является финансовой или юридической рекомендацией.
          </p>
        </div>
      </section>
    </article>
  )
}
