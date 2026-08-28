import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  Globe2,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, isChallengeFresh, type Challenge } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/chto-takoe-prop-firma'
const TITLE = 'Что такое проп-фирма: как это работает в 2026 году'
const DESCRIPTION = 'Что означает проп-фирма, чем глобальный челлендж отличается от традиционного проп-деска и российской компании, как проверить цену, просадку, KYC и выплату.'

const FUNDEDNEXT_ACCESS_URL = 'https://fundednext.com/company'
const FUNDEDNEXT_KYC_URL = 'https://help.fundednext.com/en/articles/8020293-how-can-i-complete-the-kyc-verification-process'
const BRIGHT_KYC_URL = 'https://help.brightfunded.com/en/articles/9973224-how-does-the-kyc-process-work'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Проп-фирма даёт трейдеру настоящие деньги?',
    a: 'Не автоматически. В традиционном проп-деске может использоваться капитал компании, а глобальный retail-продукт часто начинается с симулированной оценки и может сохранять симулированную среду на funded-этапе. Договор конкретного продукта определяет среду, правила и право на вознаграждение.',
  },
  {
    q: 'Чем проп-фирма отличается от брокера?',
    a: 'Проп-фирма задаёт продукт оценки, риск-лимиты и договор о вознаграждении. Брокер или платформенный провайдер обеспечивает торговую инфраструктуру или исполнение. Один бренд может использовать стороннюю платформу, поэтому договор и список провайдеров проверяются отдельно.',
  },
  {
    q: 'Что означает счёт $100 000?',
    a: 'Это номинальный размер, от которого могут считаться цели и лимиты; он не означает депозит $100 000 на личном счёте трейдера. Денежный риск покупки начинается с fee, подписки, activation fee, reset и платных дополнений.',
  },
  {
    q: 'Можно ли выбрать проп-фирму только по проценту прибыли?',
    a: 'Нет. Базовый profit split нужно читать вместе с daily loss, maximum loss, типом просадки, первой датой выплаты, consistency rule и условиями возврата fee. Максимум «до 95%» не заменяет базовый процент выбранного продукта.',
  },
  {
    q: 'Русская страница означает доступ для резидента России?',
    a: 'Нет. Русский язык страницы предназначен для русскоязычной аудитории во всём мире. Доступ зависит от фактического гражданства и резидентства, KYC, IP, карты, платформы и payout-метода; эти поля проверяются до оплаты.',
  },
  {
    q: 'Российская проп-компания и глобальная prop firm — одно и то же?',
    a: 'Не обязательно. Российский оператор может отбирать трейдеров для Московской биржи, совмещать обучение и стажировку или заключать местный договор. Глобальный retail-челлендж обычно продаёт стандартизированную онлайн-оценку, часто на CFD или фьючерсах. Сравнивать их нужно как разные модели.',
  },
]

function formatPriceRange(product: Challenge) {
  const usd = product.accountSizes
    .map(tier => tier.priceUsd)
    .filter((price): price is number => price != null && price > 0)
    .sort((a, b) => a - b)
  const eur = product.accountSizes
    .map(tier => tier.priceEur)
    .filter((price): price is number => price != null && price > 0)
    .sort((a, b) => a - b)

  if (usd.length > 0) {
    return usd[0] === usd.at(-1)
      ? `$${usd[0].toFixed(2)}`
      : `$${usd[0].toFixed(2)}–$${usd.at(-1)?.toFixed(2)}`
  }
  if (eur.length > 0) {
    return eur[0] === eur.at(-1)
      ? `€${eur[0].toFixed(0)}`
      : `€${eur[0].toFixed(0)}–€${eur.at(-1)?.toFixed(0)}`
  }
  return 'не опубликовано'
}

function formatTargets(product: Challenge) {
  if (product.phases === 0 || !product.profitTargets) return '0 фаз'
  const targets = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((target): target is number => target != null)
  return `${product.phases} ${product.phases === 1 ? 'фаза' : 'фазы'}: ${targets.map(target => `${target}%`).join(' → ')}`
}

function formatLoss(product: Challenge) {
  const daily = product.dailyLossPct == null ? 'daily —' : `daily ${product.dailyLossPct}%`
  const maximum = product.maxLossPct == null ? 'max —' : `max ${product.maxLossPct}%`
  const type = product.drawdownType === 'static'
    ? 'static'
    : product.drawdownType === 'trailing'
      ? 'trailing'
      : product.drawdownType ?? 'тип не подтверждён'
  return `${daily}; ${maximum} ${type}`
}

function productFirm(product: Challenge) {
  return product.firmSlug === 'fundednext' ? 'FundedNext' : 'Bright Funded'
}

export default function RussianWhatIsPropFirmPage() {
  const products = getAllChallenges()
    .filter(product => isChallengeFresh(product))
    .filter(product => product.firmSlug === 'fundednext' || product.firmSlug === 'bright-funded')
  const fundedNextProducts = products.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = products.filter(product => product.firmSlug === 'bright-funded')
  const pricedTierCount = products.reduce((total, product) => total + product.accountSizes.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0),
  ).length, 0)
  const sourceCount = new Set(products.map(product => product.sourceUrl)).size
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1)
  const phaseRange = [...new Set(products.map(product => product.phases))].sort((a, b) => a - b)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Что такое проп-фирма' },
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
    <article data-russian-prop-definition="three-models-not-one-label" data-russian-search-intent="prop-kompanii-eto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Что такое проп-фирма</div>
          <div className="ru-eyebrow"><CircleHelp size={14} aria-hidden="true" /> Термин без рекламных сокращений</div>
          <h1>Что такое проп-фирма и как она работает</h1>
          <p className="ru-lead">
            Проп-фирма использует правила компании, чтобы отбирать трейдеров и определять их вознаграждение.
            Но под одним словом скрываются как минимум 3 модели: традиционный торговый деск,
            глобальная retail-оценка и локальный оператор с собственной программой отбора.
          </p>
          <div className="ru-stats" aria-label="Проверяемая база примеров">
            <div className="ru-stat"><strong>3</strong><span>разные модели слова «проп»</span></div>
            <div className="ru-stat"><strong>{products.length}</strong><span>продуктов 2 главных партнёров</span></div>
            <div className="ru-stat"><strong>{pricedTierCount}</strong><span>опубликованных ценовых уровней</span></div>
            <div className="ru-stat"><strong>{latestCapture ?? '—'}</strong><span>последняя проверка продуктов</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#tri-modeli" className="btn-primary btn-glow">Понять 3 модели <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сравнить FundedNext и Bright Funded</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="definition-not-russia-access">
            <strong>Русский язык — это язык объяснения, а не разрешение страны.</strong>{' '}
            Эта статья написана для русскоязычных трейдеров в разных государствах. Перед покупкой проверяются
            6 полей фактического профиля: гражданство, резидентство, KYC, IP, способ оплаты и способ выплаты.
            VPN не меняет документы или договорную юрисдикцию.
          </div>
          <h2>Короткий ответ: проп-компания продаёт не баланс, а набор условий</h2>
          <p>
            В глобальной retail-модели трейдер обычно оплачивает продукт, получает симулированный счёт,
            выполняет 0, 1, 2 или 3 фазы и после проверки может заключить договор о performance reward.
            Поэтому надпись «$100 000 funded account» не доказывает депозит $100 000 на имя трейдера:
            юридическое значение имеют договор, среда исполнения и правило выплаты.
          </p>
          <p>
            У продукта есть 2 разных вида риска. Денежный риск — fee, подписка, activation fee, reset и add-ons.
            Торговый риск — daily loss, maximum loss, trailing или static drawdown, запрещённые стратегии и reward gate.
            Сравнение только по размеру счёта смешивает эти 2 величины и скрывает реальную точку отказа.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <BadgeDollarSign size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Что покупается</h3>
              <p className="ru-muted">Доступ к продукту с конкретной ценой, фазами, лимитами и договором; не личный депозит на сумму заголовка.</p>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Что проверяется</h3>
              <p className="ru-muted">Цель по прибыли, daily loss, maximum loss, торговые дни, conduct rules и KYC конкретного продукта.</p>
            </article>
            <article className="ru-card">
              <FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Что выплачивается</h3>
              <p className="ru-muted">Не отображаемый баланс, а договорная доля одобренного результата после первой даты и всех reward-условий.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="tri-modeli">
        <div className="ru-shell ru-content">
          <h2>Три модели: одинаковое слово, разные отношения</h2>
          <p>
            Термин proprietary trading появился не как название онлайн-челленджа. В 2026 году русскоязычный поиск
            смешивает 3 отношения: работу в традиционном деске, покупку глобальной retail-оценки и участие
            в локальной программе с биржевой инфраструктурой. Выбор начинается с определения модели, а не бренда.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <caption className="sr-only">Три модели проп-трейдинга</caption>
              <thead><tr><th>Проверка</th><th>Традиционный деск</th><th>Глобальная retail-фирма</th><th>Локальный оператор</th></tr></thead>
              <tbody>
                <tr><td>Вход</td><td>найм или договорный отбор</td><td>checkout, 0–3 фазы</td><td>отбор, стажировка или локальная программа</td></tr>
                <tr><td>Среда</td><td>капитал и инфраструктура деска</td><td>часто симулированная оценка и reward-контракт</td><td>может использовать Московскую биржу или собственную инфраструктуру</td></tr>
                <tr><td>Оплата трейдера</td><td>зависит от трудового или подрядного договора</td><td>разовый fee, подписка или instant-продукт</td><td>стоимость и договор проверяются у оператора</td></tr>
                <tr><td>Результат</td><td>вознаграждение по роли</td><td>доля одобренного performance reward</td><td>доля или выплата по локальному договору</td></tr>
                <tr><td>Главный документ</td><td>договор с деском</td><td>product rules и funded agreement</td><td>оферта, договор и правила отбора</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Эта граница объясняет 2 частые ошибки: глобальный челлендж не является вакансией,
            а локальная компания с торговлей на Московской бирже не обязана быть аналогом CFD-программы.
            Наш раздел <Link href="/ru/rossiyskie-prop-kompanii">о 6 локальных операторах</Link> поэтому отделён
            от <Link href="/ru/luchshie-prop-firmy">рейтинга глобальных продуктов</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как работает глобальная retail-проп-фирма: 5 контрольных точек</h2>
          <ol>
            <li><strong>Профиль страны.</strong> До checkout проверяются резидентство, гражданство, KYC, платёж и payout rail.</li>
            <li><strong>Покупка продукта.</strong> Фиксируются валюта, цена, фазы, возврат fee и дополнительные платежи.</li>
            <li><strong>Оценка.</strong> Трейдер достигает цели, не нарушая daily loss, maximum loss, minimum days и conduct rules.</li>
            <li><strong>Проверка и договор.</strong> Результат проходит review, затем KYC и принятие funded agreement.</li>
            <li><strong>Reward gate.</strong> Первая дата, profit split, consistency, минимальная сумма и выбранный способ выплаты определяют запрос.</li>
          </ol>
          <p>
            Phase 0 убирает этап оценки, но не убирает остальные 4 контрольные точки.
            FundedNext Stellar Instant в текущей записи имеет 0 фаз, 6% trailing maximum loss,
            70% стартовый split и отдельный growth/EOD gate для on-demand reward. Термин instant описывает вход,
            а не обещает выплату сразу после первой прибыльной сделки.
          </p>
          <p>
            Подробная схема целей, просадки и funded-этапа вынесена в отдельный
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm"> гайд по 5 этапам челленджа</Link>.
            Здесь важна последовательность: если страна или KYC не проходят точку 1, низкая цена в точке 2 уже не создаёт подходящий продукт.
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-global-funnel="fundednext-bright-funded">
        <div className="ru-shell ru-content">
          <h2>Два главных партнёра: {products.length} продуктов вместо 2 логотипов</h2>
          <p>
            FundedNext и Bright Funded — наши 2 основных коммерческих маршрута, но партнёрство не превращает их
            в универсальные варианты. Текущая выборка содержит {fundedNextProducts.length} продукта FundedNext и {brightProducts.length} продукта Bright Funded,
            {pricedTierCount} ценовых уровней и диапазон от {phaseRange.at(0)} до {phaseRange.at(-1)} фаз.
            Каждая строка ниже ведёт на первичную страницу продукта и показывает дату захвата.
          </p>
          <div className="ru-table-wrap" data-russian-prop-definition-products={products.length}>
            <table className="ru-table">
              <caption className="sr-only">Семь актуальных продуктов FundedNext и Bright Funded</caption>
              <thead><tr><th>Фирма и продукт</th><th>Цена</th><th>Оценка</th><th>Просадка</th><th>Базовый split</th><th>Источник</th></tr></thead>
              <tbody>
                {products.map(product => (
                  <tr key={`${product.firmSlug}:${product.productSlug}`} data-russian-product-example={`${product.firmSlug}:${product.productSlug}`}>
                    <td><strong>{productFirm(product)}</strong><br />{product.productName}</td>
                    <td>{formatPriceRange(product)}</td>
                    <td>{formatTargets(product)}</td>
                    <td>{formatLoss(product)}</td>
                    <td>{product.profitSplitPct == null ? 'не подтверждён' : `${product.profitSplitPct}%`}</td>
                    <td><a href={product.sourceUrl} target="_blank" rel="nofollow noopener">{product.sourceCapturedAt}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Источников в таблице: {sourceCount}. Цены приведены в собственной валюте фирмы: USD для FundedNext и EUR для Bright Funded;
            временные промоакции и самостоятельный пересчёт в RUB не включены.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <div className="ru-card-head"><h3>FundedNext</h3><span className="ru-score">{fundedNextProducts.length} продукта</span></div>
              <p className="ru-muted">
                Stellar 2-Step, 1-Step, Lite и Instant различаются числом фаз, refund milestone,
                maximum loss и первой датой reward. Для резидентов России официальные страницы содержат конфликт,
                поэтому checkout и support проверяются до оплаты.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-fundednext" className="btn-outline">Русский обзор</Link>
                <Link href="/go/fundednext?from=ru-prop-definition-fundednext" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить FundedNext <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
            <article className="ru-card">
              <div className="ru-card-head"><h3>Bright Funded</h3><span className="ru-score">{brightProducts.length} продукта</span></div>
              <p className="ru-muted">
                1-Step, 2-Step Bright и 2-Step Classic используют EUR-цены, но дают разные daily/max loss и target.
                SumSub KYC и Security Check остаются отдельными этапами после успешной оценки.
              </p>
              <div className="ru-actions">
                <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор</Link>
                <Link href="/go/bright-funded?from=ru-prop-definition-bright-funded" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить Bright Funded <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="prop-definition">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Переходы на FundedNext и Bright Funded могут принести Traders Fund Hub комиссию.
            Коммерческая связь не меняет {products.length} строк, {pricedTierCount} цен, даты источников или предупреждение о доступе страны.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Русскоязычный трейдер за рубежом: язык не равен профилю KYC</h2>
          <p>
            Русскоязычный резидент Германии, Латвии, Казахстана, ОАЭ или любой другой страны проверяется по фактическому профилю,
            а не по языку браузера. У FundedNext KYC начинается после успешного challenge и до активации FundedNext Account;
            официальный список документов включает паспорт, государственное удостоверение личности или residence permit.
            <a href={FUNDEDNEXT_KYC_URL} target="_blank" rel="nofollow noopener"> Проверить источник FundedNext</a>.
          </p>
          <p>
            Bright Funded описывает другой маршрут: после финальной фазы используется SumSub KYC, затем Risk Team Security Check,
            который обычно занимает 1–2 рабочих дня и может занимать до 4 рабочих дней в пиковый период.
            <a href={BRIGHT_KYC_URL} target="_blank" rel="nofollow noopener"> Проверить источник Bright Funded</a>.
            Разные последовательности нельзя объединять в обещание «KYC пройдёт за один день».
          </p>
          <p>
            Для российского резидентства действует отдельная осторожность: страница компании FundedNext заявляет,
            что FundedNext Ltd не обслуживает российских резидентов, тогда как отдельный CFD FAQ формулирует список иначе.
            <a href={FUNDEDNEXT_ACCESS_URL} target="_blank" rel="nofollow noopener"> Официальное раскрытие компании</a> важнее языковой версии сайта;
            до разрешения конфликта нельзя обещать доступ.
          </p>
          <div className="ru-actions">
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary">Пройти проверку профиля <Globe2 size={15} aria-hidden="true" /></Link>
            <Link href="/ru/prop-firmy-bez-kyc" className="btn-outline">Понять KYC трёх фирм</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-local-model-boundary="six-operators-not-global-ranking">
        <div className="ru-shell ru-content">
          <h2>Где в этой схеме российские проп-компании</h2>
          <p>
            Локальный рынок полезен для читателя, который ищет Московскую биржу, рублёвую инфраструктуру,
            обучение или договорный отбор. В нашей текущей проверке 6 примеров: Era Trade, PropLive, KasCapital,
            А-Лаб Групп, TeamTraders и Trade System. Это не 6 взаимозаменяемых челленджей и не рейтинг по размеру обещанной выплаты.
          </p>
          <p>
            PropLive описывает торговлю на Московской бирже через Финам, TeamTraders публикует отбор по фьючерсам Московской биржи,
            а Era Trade указывает оператора в Dubai Silicon Oasis. Уже эти 3 факта показывают, почему слово «русская» может означать язык,
            рынок, инфраструктуру или аудиторию, но не всегда российское юридическое лицо.
          </p>
          <div className="ru-notice">
            <strong>Практическая развилка из 2 вопросов.</strong>{' '}
            Нужна местная биржа и договор с локальным оператором — откройте
            <Link href="/ru/rossiyskie-prop-kompanii"> 6 проверяемых примеров</Link>.
            Нужен глобальный CFD retail-продукт — сравните FundedNext и Bright Funded,
            затем заново проверьте страну, KYC и payout rail.
          </div>
          <div className="ru-actions">
            <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline"><Building2 size={15} aria-hidden="true" /> Российские операторы</Link>
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary">Глобальное сравнение <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как проп-фирма зарабатывает и что это меняет для трейдера</h2>
          <p>
            У retail-фирмы могут быть несколько источников выручки: evaluation fee, подписка, activation fee,
            reset и платные add-ons. Публичная цена одной попытки поэтому не отвечает на вопрос о полной стоимости;
            нужно записать как минимум 5 денежных полей и отдельно условие возврата fee.
          </p>
          <p>
            Доход фирмы от fee сам по себе не доказывает ни мошенничество, ни будущую выплату.
            Для решения важнее 4 проверяемых слоя: юридическое лицо, продуктовые правила, funded agreement и история изменений.
            Скриншот payout или Trustpilot score не заменяет ни один из этих 4 документов.
          </p>
          <p>
            Безопасный бюджет принимает худший денежный результат попытки: reward равен $0, fee не возвращён,
            а повторная покупка не совершается автоматически. Если такой исход нарушает личный бюджет,
            продукт не подходит независимо от рекламного split 80%, 90% или «до 95%».
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Восемь полей, которые нужно выписать до checkout</h2>
          <div className="ru-grid" data-russian-decision-checklist="eight-fields">
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>1. Профиль</h3><p className="ru-muted">Гражданство, резидентство, KYC, IP и доступный платёжный маршрут.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>2. Продукт</h3><p className="ru-muted">Точное название, 0–3 фазы, размер и торговая платформа.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>3. Полная цена</h3><p className="ru-muted">Первый платёж, подписка, activation, reset, add-ons и refund milestone.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>4. Цели</h3><p className="ru-muted">Phase 1–3 targets, minimum days и maximum days.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>5. Просадка</h3><p className="ru-muted">Daily loss, maximum loss, static, balance, trailing или EOD.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>6. Ограничения</h3><p className="ru-muted">News, overnight, weekend, EA, copying и consistency rule.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>7. Reward</h3><p className="ru-muted">Базовый split, первая дата, минимум, цикл и причины отказа.</p></article>
            <article className="ru-card"><CheckCircle2 size={20} color="var(--accent-light)" aria-hidden="true" /><h3>8. Выплата</h3><p className="ru-muted">Банк, wallet, сеть, валюта, комиссия и совпадение владельца счёта.</p></article>
          </div>
          <p>
            После заполнения 8 полей используйте <Link href="/ru/luchshie-prop-firmy">русский рейтинг</Link> для shortlist,
            <Link href="/ru/forex-prop-firmy"> forex-сравнение</Link> для валютных пар и плеча,
            <Link href="/ru/vyplaty-prop-firm"> сравнение выплат</Link> для payout rail и
            <Link href="/ru/otzyvy-prop-firm"> методику отзывов</Link> для проверки повторяющихся жалоб.
            Финальный источник — live checkout и договор в день оплаты.
          </p>
          <div className="ru-actions">
            <Link href="/ru/obzor-fundednext" className="btn-primary">Начать с FundedNext <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/obzor-bright-funded" className="btn-outline">Проверить Bright Funded</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <div className="ru-notice">
            <Scale size={18} aria-hidden="true" /> Материал объясняет продуктовую модель и не является финансовой или юридической рекомендацией.
            Правила {products.length} продуктов проверены {latestCapture ?? 'без текущей даты'}; перед оплатой откройте первичный источник ещё раз.
          </div>
        </div>
      </section>
    </article>
  )
}
