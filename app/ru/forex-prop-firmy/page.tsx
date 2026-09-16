import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, ChartCandlestick, Globe2 } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import { getAllChallenges, isChallengeFresh, type Challenge, type ChallengeAccountSize } from '@/lib/firms'
import { getRussianReviewFinderHref } from '@/lib/challengeComparisonData'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import forexEvidence from '@/content/data/russian-forex-evidence.json'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/forex-prop-firmy'
const TITLE = 'Форекс проп-фирмы: плечо, цены и правила программ'
const DESCRIPTION = 'Разбор форекс-программ FundedNext и Bright Funded: валютные пары, плечо, цены в USD и EUR, лимиты убытка, платформы и проверка доступа по стране.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое форекс-проп-фирма?',
    a: 'В этой статье речь о платной программе с симулированными валютными инструментами. Участник соблюдает правила оценки и лимиты убытка, а вознаграждение зависит от договора и одобрения результата. Размер счёта не является суммой личного депозита.',
  },
  {
    q: 'Форекс-проп-фирма является брокером?',
    a: 'FundedNext описывает свои программы как симулированную торговлю, а Bright Funded также указывает симулированную среду. Наличие EURUSD в терминале само по себе не означает, что вы открыли обычный брокерский счёт с реальными средствами.',
  },
  {
    q: 'Какое форекс-плечо у FundedNext?',
    a: 'По источникам, проверенным 8 сентября 2026 года, у Stellar 1-Step и Stellar Instant — 1:30, у Stellar 2-Step и Stellar Lite — 1:100. В таблицах оценочного и следующего этапа Stellar 1-Step указано одинаковое форекс-плечо. Не переносите условия одного продукта на другой.',
  },
  {
    q: 'Плечо 1:100 лучше, чем 1:30?',
    a: 'Само по себе — нет. При той же позиции большее плечо уменьшает требуемую маржу, но не увеличивает допустимый убыток. Нужно отдельно учитывать стоп, размер позиции, открытые убытки и правило просадки.',
  },
  {
    q: 'У какой фирмы больше валютных пар?',
    a: 'В проверенном списке FundedNext — 43 уникальных валютных символа. Справка Bright Funded перечисляет категории пар и ссылается на отдельный список инструментов, но итоговое число в самой справке не указано. Мы не подставляем непроверенное число для сравнения.',
  },
  {
    q: 'Можно ли торговать форекс без челленджа?',
    a: 'Stellar Instant — отдельная программа FundedNext без оценочных этапов. Это не отменяет лимиты убытка и условия вознаграждения. Перед выбором нужно прочитать правила именно Instant, а не другой программы Stellar.',
  },
  {
    q: 'Русская версия означает, что можно зарегистрироваться из России?',
    a: 'Нет. Язык не подтверждает доступность услуги. Перед оплатой проверяются гражданство, резидентство, документы, платформа и способы платежа и выплаты. Разрешение открыть сайт не заменяет подтверждение соответствия условиям фирмы.',
  },
]

function priceForTier(tier: ChallengeAccountSize) {
  const prices = ([['USD', tier.priceUsd], ['EUR', tier.priceEur]] as const)
    .flatMap(([currency, value]) => value != null && value > 0
      ? [new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)] : [])
  return prices.length ? prices.join(' / ') : 'цена не подтверждена'
}

function referenceTier(product: Challenge) {
  const tiers = product.accountSizes.filter(tier => tier.sizeUsd > 0)
  return tiers.find(tier => tier.sizeUsd === 100000)
    ?? [...tiers].sort((a, b) => b.sizeUsd - a.sizeUsd)[0]
}

function formatAccountSize(sizeUsd: number) {
  return `$${sizeUsd.toLocaleString('en-US')}`
}

function formatTargets(product: Challenge) {
  if (product.phases === 0) return 'Без оценки'
  if (!product.profitTargets) return 'Цели не подтверждены'
  const targets = [product.profitTargets.phase1, product.profitTargets.phase2, product.profitTargets.phase3]
    .slice(0, product.phases)
  return targets.map(target => target == null ? 'не подтверждена' : `${target}%`).join(' → ')
}

function formatRiskRoom(product: Challenge, tier: ChallengeAccountSize) {
  const daily = tier.dailyLossUsd ?? (product.dailyLossPct == null ? null : tier.sizeUsd * product.dailyLossPct / 100)
  const maximum = tier.maxLossUsd ?? (product.maxLossPct == null ? null : tier.sizeUsd * product.maxLossPct / 100)
  const amount = (value: number | null) => value == null ? 'не подтверждён'
    : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
  return `Дневной: ${amount(daily)}; общий: ${amount(maximum)}`
}

function formatDrawdown(product: Challenge) {
  if (product.drawdownType === 'static') return 'Фиксированная граница'
  if (product.drawdownType === 'trailing') return 'Скользящая граница'
  if (product.drawdownType === 'eod-trailing') return 'Скользящая, по итогам дня'
  return 'Тип не подтверждён'
}

function productFirm(product: Challenge) {
  return product.firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'
}

export default function RussianForexPropFirmsPage() {
  const allProducts = getAllChallenges().filter(product => product.assetClass === 'cfd'
    && (product.firmSlug === 'fundednext' || product.firmSlug === 'bright-funded'))
  const products = allProducts.filter(product => isChallengeFresh(product))
  const fundedNextEvidence = forexEvidence.firms.find(firm => firm.firmSlug === 'fundednext')!
  const brightEvidence = forexEvidence.firms.find(firm => firm.firmSlug === 'bright-funded')!
  const evidenceFresh = (firm: typeof fundedNextEvidence) => isChallengeFresh({ sourceCapturedAt: firm.sourceCapturedAt })
  const fundedNextFresh = evidenceFresh(fundedNextEvidence)
  const brightFresh = evidenceFresh(brightEvidence)
  const symbols = fundedNextFresh ? fundedNextEvidence.forexSymbols ?? [] : []
  const sourceCount = new Set([...allProducts.map(product => product.sourceUrl), ...forexEvidence.firms.flatMap(firm => firm.sourceUrls)]).size
  const evidenceDates = [
    ...forexEvidence.firms.map(firm => ({ label: `форекс-справки ${firm.firmName}`, capturedAt: firm.sourceCapturedAt })),
    ...['fundednext', 'bright-funded'].map(slug => ({
      label: `цены и правила ${slug === 'fundednext' ? 'FundedNext' : 'Bright Funded'}`,
      capturedAt: allProducts.filter(product => product.firmSlug === slug).map(product => product.sourceCapturedAt).sort()[0] ?? '',
    })),
    { label: 'обзор доступа по стране', capturedAt: marketEvidence.capturedAt },
  ]
  const hasFreshEvidence = evidenceDates.every(item => isChallengeFresh({ sourceCapturedAt: item.capturedAt }))
  const updatedAt = russianRouteDateModified(PATH, forexEvidence.capturedAt)

  function leverageFor(product: Challenge) {
    const firm = forexEvidence.firms.find(item => item.firmSlug === product.firmSlug)
    if (!firm || !evidenceFresh(firm)) return 'Требует перепроверки'
    const rule = firm.forexLeverage.find(item => item.products.includes(product.productName))
    return rule ? `1:${rule.ratio}` : 'Не подтверждено'
  }

  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'Форекс проп-фирмы' }])
  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: TITLE, description: DESCRIPTION, url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru', datePublished: '2026-08-28', dateModified: updatedAt,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <article className="ru-review-article" data-russian-forex-article="instrument-to-product" data-russian-search-intent="prop-forex">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {hasFreshEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Форекс проп-фирмы</div>
          <div className="ru-eyebrow"><ChartCandlestick size={14} aria-hidden="true" /> От валютной пары к условиям программы</div>
          <h1>Форекс проп-фирмы: цены, плечо и правила для русскоязычных трейдеров</h1>
          <p className="ru-lead">
            Одинаковая пара EURUSD не означает одинаковые условия счёта. Сравниваем программы
            FundedNext и Bright Funded: стоимость участия, кредитное плечо, лимиты убытка и
            доступность терминала. Отдельно разбираем, что проверить перед оплатой из своей страны.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Обновлено {updatedAt}.</p>
          <RussianEvidenceFreshnessNotice evidence={evidenceDates} />
          <div className="ru-stats" aria-label="Выборка с датированными источниками">
            <div className="ru-stat"><strong>{products.length}</strong><span>программ с актуальными ценовыми записями</span></div>
            <div className="ru-stat"><strong>{symbols.length || 'Проверить'}</strong><span>валютных пар в списке FundedNext</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>первичных страниц в разборе</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#produkty" className="btn-primary">Сравнить программы <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/chto-takoe-prop-firma" className="btn-outline">Как устроена проп-фирма</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="forex-profile-not-language">
            <strong>Наличие форекс-инструментов не подтверждает доступ страны.</strong>{' '}
            Русскоязычным трейдерам по всему миру нужно проверить гражданство, резидентство,
            документы, ограничения по месту подключения, платёж, платформу и способ выплаты.
            VPN не меняет договор или документы.
          </div>
          <h2>Что означает «проп форекс»</h2>
          <p>
            Здесь речь о платной программе с симулированными валютными инструментами, а не о внесении
            депозита на обычный брокерский счёт. <a href={fundedNextEvidence.sourceUrls[3]} target="_blank" rel="nofollow noopener">FundedNext описывает виртуальные средства и симулированную торговлю</a>;
            Bright Funded также называет свою среду симулированной. Участник оплачивает доступ и
            соблюдает условия договора, в том числе правила оценки результата.
          </p>
          <p>
            В этой модели нельзя смешивать три суммы. Вступительный взнос — стоимость участия;
            номинал счёта — база для части торговых правил; вознаграждение — одобренная доля результата.
            Например, надпись «счёт $100 000» не означает, что вам перечислят $100 000 или разрешат потерять всю эту сумму.
          </p>
          <p>
            В договоре могут использоваться слова <em>simulated account</em> — симулированный счёт,
            <em> performance reward</em> — вознаграждение за результат, и <em>drawdown</em> — просадка.
            Сопоставляйте эти определения с конкретной программой: правила оценки и следующего этапа могут различаться.
          </p>
        </div>
      </section>

      <section className="ru-section" id="produkty" data-russian-forex-products={products.length}>
        <div className="ru-shell ru-content">
          <h2>Сравнение программ: цена, плечо и допустимый убыток</h2>
          <p>
            Для каждой программы берём номинал $100 000, если он есть в записи; иначе — наибольший
            доступный номинал. Поэтому строки не всегда относятся к одинаковому размеру счёта.
            Взнос указан в исходной валюте, без пересчёта и без обещания, что он включает все доплаты.
          </p>
          {products.length ? <div className="ru-table-wrap">
            <table className="ru-table">
              <caption>Цены и лимиты из продуктовых записей; плечо проверяется по отдельным справкам</caption>
              <thead><tr><th scope="col">Программа</th><th scope="col">Номинал / базовый взнос</th><th scope="col">Цель оценки</th><th scope="col">Форекс-плечо</th><th scope="col">Начальные лимиты убытка</th><th scope="col">Просадка</th><th scope="col">Источник цены и правил</th></tr></thead>
              <tbody>{products.map(product => {
                const tier = referenceTier(product)
                return <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-forex-product={`${product.firmSlug}:${product.productSlug}`}>
                  <th scope="row"><strong>{productFirm(product)}</strong><br />{product.productName}</th>
                  <td>{tier ? <>{formatAccountSize(tier.sizeUsd)} / {priceForTier(tier)}</> : 'Размеры счёта не подтверждены'}</td>
                  <td>{formatTargets(product)}</td>
                  <td data-russian-forex-leverage-product={`${product.firmSlug}:${product.productSlug}`}>{leverageFor(product)}</td>
                  <td>{tier ? formatRiskRoom(product, tier) : 'Лимиты в деньгах не рассчитаны'}</td>
                  <td>{formatDrawdown(product)}</td>
                  <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt}</a></td>
                </tr>
              })}</tbody>
            </table>
          </div> : <div className="ru-notice">Ценовые записи вышли за пределы окна проверки. Таблица появится после повторного сбора источников; это не означает, что фирмы прекратили работу.</div>}
          <p className="ru-source-line">
            Денежные лимиты берём из записи выбранного размера счёта, а при отсутствии таких значений
            рассчитываем от номинала и процента. Это начальные ограничения, не остаток доступного убытка
            в работающем терминале. Неизвестный лимит не считается нулевым.
          </p>
          <div className="ru-actions" data-russian-forex-finder="same-size-evaluations">
            <Link href={getRussianReviewFinderHref('fundednext')} className="btn-primary">Сравнить двухэтапные программы одного размера <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="ru-source-line">В подборе можно изменить номинал и этапы. Наличие строки не подтверждает доступ конкретной валютной пары или платформы для вашей страны.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-featured-partners="fundednext-bright-funded">
        <div className="ru-shell ru-content">
          <h2>FundedNext и Bright Funded: что сравнивать в первую очередь</h2>
          <p>
            Это разбор двух партнёров сайта, а не полный рейтинг рынка. Удобнее начинать не с логотипа,
            а с оценочных этапов, формулы просадки и подходящего размера счёта. Различия нужно проверять
            на уровне программы: одно название фирмы не задаёт единое плечо или единый порядок выплат.
          </p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-forex-featured-partner="fundednext">
              <h3>FundedNext</h3>
              <p>{fundedNextFresh
                ? 'В проверенном списке — 43 валютные пары. Для Stellar 1-Step и Instant указано плечо 1:30; для Stellar 2-Step и Lite — 1:100.'
                : 'Список инструментов и плечо требуют повторной проверки. Не переносите условия одной программы Stellar на другую.'}</p>
              <p className="ru-muted">Сравните оценочную программу с отдельной моделью Instant. Доступ к терминалу и разрешение на автоматизацию проверяются отдельно.</p>
              <div className="ru-actions">
                <Link href="/ru/obzor-fundednext" className="btn-outline">Полный обзор FundedNext</Link>
                <Link href="/go/fundednext?from=ru-forex-shortlist-fundednext" rel="sponsored nofollow noopener" className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            </article>
            <article className="ru-card" data-russian-forex-featured-partner="bright-funded">
              <h3>Bright Funded</h3>
              <p>{brightFresh
                ? 'Справка указывает форекс-плечо 1:100 на оценочном и следующем этапе. Это не означает, что программы имеют одинаковые цели или формулу просадки.'
                : 'Форекс-справки требуют повторной проверки. Цены, цели и ограничения сравнивайте по отдельным программам, а не по общему максимуму фирмы.'}</p>
              <p className="ru-muted">Проверяйте конкретную программу и валюту взноса. Перечень платформ не является подтверждением, что любая из них доступна вашему профилю.</p>
              <div className="ru-actions">
                <Link href="/ru/obzor-bright-funded" className="btn-outline">Полный обзор Bright Funded</Link>
                <Link href="/go/bright-funded?from=ru-forex-shortlist-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            </article>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="forex-shortlist">
            <strong>Партнёрские ссылки.</strong> Traders Fund Hub может получить комиссию после перехода
            на FundedNext или Bright Funded. Это не меняет расчёты, ограничения по стране или объяснение неизвестных условий.
          </div>
        </div>
      </section>

      <section className="ru-section" id="plecho" data-russian-forex-leverage="margin-not-risk-room">
        <div className="ru-shell ru-content">
          <h2>Плечо и просадка отвечают на разные вопросы</h2>
          <p>
            Плечо влияет на маржу, необходимую для открытия позиции. Просадка определяет границу,
            после которой счёт нарушает правила. Более высокая покупательная способность не
            увеличивает разрешённый убыток и не делает позицию менее рискованной.
          </p>
          <aside className="ru-notice" data-russian-forex-correction="stellar-1-step-leverage">
            <strong>Исправление от 8 сентября 2026 года.</strong> Ранее мы ошибочно включили Stellar 1-Step
            в группу с плечом 1:100. В <a href={fundedNextEvidence.sourceUrls[1]} target="_blank" rel="nofollow noopener">таблицах FundedNext</a> для
            оценочного и следующего этапа указано 1:30. Это исправление нашей записи, а не утверждение,
            что фирма изменила правило именно в этот день.
          </aside>
          <p>
            Учебный пример: при номинальной позиции $30 000 и плече 1:30 расчётная маржа составляет
            $1 000, а при 1:100 — $300. Размер позиции при этом одинаковый, поэтому её прибыль или
            убыток от одного и того же движения цены не уменьшается. Расчёт не учитывает специальные
            требования к инструменту, валютную конвертацию и дополнительные ограничения фирмы.
          </p>
          <p>
            Для контроля просадки проверьте три вещи: от чего считается граница, какие значения
            учитываются при нарушении и когда граница пересчитывается. Фиксированная граница
            относительно исходного номинала и скользящая граница за максимумом дают разные результаты
            после прибыльной серии и последующего отката.
          </p>
          <p>
            Денежная сумма из таблицы выше — не разрешённый риск каждой новой сделки. Из доступного
            запаса могут уже быть использованы убытки, комиссии и другие учитываемые расходы;
            открытый результат также может входить в проверку. Точный порядок нужно читать в правилах
            дневного и общего лимита выбранного продукта.
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-instruments="published-vs-terminal">
        <div className="ru-shell ru-content">
          <h2>Валютные пары и платформы: общий список не равен доступу счёта</h2>
          <p>
            В <a href={fundedNextEvidence.sourceUrls[0]} target="_blank" rel="nofollow noopener">справке FundedNext об инструментах</a>,
            проверенной {fundedNextEvidence.sourceCapturedAt}, перечислены основные, кросс- и экзотические пары.
            Примеры — EURUSD, GBPUSD, USDJPY и EURGBP. Золото XAUUSD относится к отдельной категории,
            а не добавляет ещё одну валютную пару.
          </p>
          <p>
            Окончательный список смотрите на нужном сервере и счёте. В MT4 или MT5 откройте
            «Обзор рынка» (Market Watch), вызовите контекстное меню и выберите «Показать все» (Show All).
            Затем проверьте спецификацию символа: размер контракта, торговые часы и условия расчёта.
            Наличие названия в общей справке не гарантирует одинаковые настройки всех терминалов.
          </p>
          <p>
            <a href={brightEvidence.sourceUrls[0]} target="_blank" rel="nofollow noopener">Bright Funded перечисляет категории пар и даёт ссылку на список инструментов</a>.
            В самой справке итоговое число не указано; мы не проверили число строк в связанном списке
            и не используем его как преимущество одной фирмы над другой.
          </p>
          <p>
            По <a href={brightEvidence.sourceUrls[2]} target="_blank" rel="nofollow noopener">платформенной справке Bright Funded</a>,
            проверенной {brightEvidence.sourceCapturedAt}, MT5 недоступен гражданам, резидентам и проживающим
            в США или ОАЭ, а cTrader — соответствующим профилям США. Применяются также ограничения по другим
            запрещённым странам. Наличие DXTrade, cTrader или MT5 в общем перечне не отменяет эти условия.
          </p>
          <div className="ru-notice">
            <strong>Перед оплатой уточните платформу для конкретного продукта.</strong> Проверьте её
            доступность для номинала и страны, отдельный сбор, разрешение на советники и фактический
            список символов. Поддержка роботов самим терминалом не является разрешением фирмы на их использование.
          </div>
          <div className="ru-actions">
            <Link href="/ru/prop-firmy-s-ctrader" className="btn-primary">Разобрать условия cTrader <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/fundednext-mt5" className="btn-outline">FundedNext MT5 и правила советников</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Вступительный взнос — не полная стоимость стратегии</h2>
          <p>
            Разделите стоимость участия и издержки торговли. К взносу могут добавляться повторная
            попытка, перезапуск счёта и платные опции; к результату сделок — спред, комиссия и перенос
            позиции через ночь. Таблица базовых цен не позволяет заранее посчитать всю эту сумму.
          </p>
          <p>
            Для сравнения спредов нужен один и тот же символ, время наблюдения и тип счёта. Один снимок
            EURUSD на спокойном рынке не описывает издержки во время новостей. Сохраните спецификацию
            инструмента и отдельно уточните комиссию за открытие и закрытие позиции, а не только за одну сторону сделки.
          </p>
          <p>
            Условия возврата взноса — отдельный пункт договора. Не вычитайте возможный возврат из
            суммы, которую придётся заплатить сейчас: он может зависеть от одобренного вознаграждения
            и других требований. Правила возврата и выплат разобраны в обзорах программ.
          </p>
          <p>
            Сохраняйте USD и EUR как разные валюты сравнения. Фиксированный пересчёт в рубли может
            скрыть курс банка и платёжную комиссию. <Link href="/ru/promokody-prop-firm">Проверенные промокоды</Link> следует
            сверять с итоговой ценой перед оплатой; скидка на взнос сама по себе не изменяет торговые правила.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Страна, документы и выплаты</h2>
          <p>
            Разделяйте три проверки: можно ли купить программу, можно ли пройти идентификацию
            и можно ли получить выплату на доступный вам счёт. Платёж, успешно принятый картой,
            не доказывает выполнение остальных условий.
          </p>
          <p>
            Сопоставьте гражданство и резидентство с официальными ограничениями. Затем уточните
            документы, момент проверки личности и допустимого получателя выплаты. Криптовалютный
            способ выплаты не отменяет идентификацию или договорные ограничения.
          </p>
          <p>
            Если официальные страницы расходятся, сохраните их и запросите письменное разъяснение
            для своего профиля и программы. Русская версия сайта предназначена для русскоязычных
            трейдеров в разных странах; она не является обещанием доступности услуг из России.
          </p>
          <div className="ru-actions">
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary"><Globe2 size={15} aria-hidden="true" /> Проверить профиль страны</Link>
            <Link href="/ru/vyplaty-prop-firm" className="btn-outline">Способы выплаты</Link>
            <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Требования к документам</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-local-boundary="moex-not-cfd-forex">
        <div className="ru-shell ru-content">
          <h2>Локальная проп-компания — не обязательно форекс-программа</h2>
          <p>
            В <Link href="/ru/rossiyskie-prop-kompanii">разборе российских проп-компаний</Link> отдельно рассматриваются
            PropLive, TeamTraders и другие операторы. Их модель нужно проверять по рынку, договору,
            условиям доступа и используемой инфраструктуре, а не по русскоязычному названию.
          </p>
          <p>
            Биржевой фьючерс и симулированный валютный CFD — разные продукты. Работа с Московской
            биржей, обучение или стажировка сами по себе не заменяют доступ к нужной паре в программе
            FundedNext или Bright Funded. Наличие либо отсутствие партнёрской сделки с нашим сайтом
            также не определяет пригодность локальной модели.
          </p>
          <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">FundedNext и Bright Funded: подробное сравнение</Link>
        </div>
      </section>

      <section className="ru-section" data-russian-forex-checklist="nine-fields">
        <div className="ru-shell ru-content">
          <h2>Девять пунктов перед покупкой форекс-программы</h2>
          <ol>
            <li><strong>Профиль:</strong> гражданство, резидентство, документы и владелец платежа.</li>
            <li><strong>Инструмент:</strong> точный символ, размер контракта и доступность на нужном сервере.</li>
            <li><strong>Терминал:</strong> выбранная платформа для программы, размера счёта и страны.</li>
            <li><strong>Плечо:</strong> значение для валютной пары и этапа, а не рекламный максимум фирмы.</li>
            <li><strong>Стоимость:</strong> валюта взноса, доплаты, повторные попытки, спред, комиссия и перенос позиции.</li>
            <li><strong>Просадка:</strong> дневной и общий лимит, плавающий результат, движение границы и время пересчёта.</li>
            <li><strong>Ограничения:</strong> новости, ночь, выходные, советники и копирование сделок.</li>
            <li><strong>Вознаграждение:</strong> базовая доля, первая допустимая заявка, дополнительные требования и возврат взноса.</li>
            <li><strong>Выплата:</strong> способ, валюта, комиссия, минимум и доступность для получателя.</li>
          </ol>
          <p>
            Неизвестное условие нужно уточнить, а не заменить наиболее выгодным предположением.
            Начните с <Link href="/ru/obzor-fundednext">обзора FundedNext</Link> или
            <Link href="/ru/obzor-bright-funded"> обзора Bright Funded</Link>, затем сопоставьте правила
            с договором выбранной программы.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="forex-verdict">
            <strong>Если программа подходит после проверки условий:</strong>{' '}
            <Link href="/go/fundednext?from=ru-forex-verdict-fundednext" rel="sponsored nofollow noopener">проверить предложение FundedNext</Link> или
            <Link href="/go/bright-funded?from=ru-forex-verdict-bright-funded" rel="sponsored nofollow noopener"> предложение Bright Funded</Link>.
            Мы можем получить комиссию по этим ссылкам. Это не гарантия одобрения счёта или выплаты.
          </div>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content">
          <h2>Первичные источники и даты проверки</h2>
          <p>Форекс-справки проверяются отдельно от цен и доступа по стране. Дата обновления статьи не обновляет эти записи автоматически.</p>
          {forexEvidence.firms.map(firm => <div key={firm.firmSlug}>
            <h3>{firm.firmName} · {firm.sourceCapturedAt}</h3>
            <ul>{firm.sourceUrls.map((url, index) => <li key={url}><a href={url} target="_blank" rel="nofollow noopener">{firm.firmName}: {index === 0 ? 'инструменты' : index === 1 ? 'кредитное плечо' : index === 2 && firm.firmSlug === 'fundednext' ? 'плечо Stellar Instant' : index === 2 ? 'платформы и ограничения' : 'описание CFD-программ'}</a></li>)}</ul>
          </div>)}
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <p className="ru-source-line">Ответы относятся к датированному разбору. Материал информационный и не является финансовой или юридической рекомендацией.</p>
        </div>
      </section>
    </article>
  )
}
