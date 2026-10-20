import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RuPendingLink from '@/components/RuPendingLink'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-hash-hedge'
const TITLE = 'Hash Hedge: отзывы и обзор крипто-проп-компании 2026'
const H1 = 'Hash Hedge: обзор и отзывы 2026'
const DESCRIPTION = 'Hash Hedge: обзор крипто-проп-компании. Челленджи и цены, правила просадки, вывод прибыли, отзывы трейдеров и доступ из России — по официальным условиям.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['hash hedge', 'hashhedge', 'hash hedge отзывы', 'хеш хедж', 'hash hedge проп', 'hash hedge промокод', 'hash hedge выплаты', 'hash hedge приложение'],
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker verdicts /workspace/ru-data/2026-10-19-hashhedge-cft.md (section B) and
 * capture content/data/challenges/_captures/hash-hedge-2026-10-19.json (data branch 331b985, not merged).
 * Hash Hedge is not in firms.json until 26.10.2026, so there is no /go route: the CTA is a plain,
 * non-affiliate link to the official site and the Russia badge uses a static status (Tracker russiaStatus = available).
 * All official URLs below returned 200 on 2026-10-19. Unofficial mirror sites are never cited.
 */
const CHECKED = '2026-10-19'
const TERMS_DATED = '2026-10-08'
const HH_RUSSIA_STATUS = 'available' as const

const SOURCES = {
  home: 'https://hashhedge.com/',
  ru: 'https://www.hashhedge.com/ru',
  terms: 'https://www.hashhedge.com/terms-and-conditions',
  commercial: 'https://www.hashhedge.com/commercial-terms',
  challengeTypes: 'https://hashhedge.gitbook.io/hashhedge-user-guide/start-here/challenge-types',
  buy: 'https://hashhedge.gitbook.io/hashhedge-user-guide/start-here/buy-challenge',
  payouts: 'https://hashhedge.gitbook.io/hashhedge-user-guide/account-and-payouts/profit-payouts',
  guideFaq: 'https://hashhedge.gitbook.io/hashhedge-user-guide/account-and-payouts/faq',
  rules: 'https://hashhedge.gitbook.io/hashhedge-user-guide/rules/challenge-rules',
  stocks: 'https://hashhedge.gitbook.io/hashhedge-user-guide/trading-terminal/stocks-terminal',
  trustpilot: 'https://www.trustpilot.com/review/hashhedge.com',
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
const usd = (value: number) => `$${value.toLocaleString('en-US')}`

const SIZES = ['$5K', '$10K', '$25K', '$50K', '$100K', '$200K']
const PROGRAMS = [
  { key: 'two-stage', name: 'Two-stage (Crypto + TradFi)', prices: [79, 99, 249, 499, 799, 1393], targets: '5% → 6%', limits: '5% в день; общий 10% на этапе 1 и 8% на этапе 2 и на реальном счёте', days: '5 торговых дней на каждом этапе' },
  { key: 'one-stage', name: 'One-stage (Crypto + TradFi)', prices: [99, 159, 349, 599, 999], targets: '10%', limits: '3% в день; 6% общий', days: '3 торговых дня' },
  { key: 'us-stocks', name: 'US Stocks Two-stage', prices: [79, 99, 249, 499, 799], targets: '5% → 6%', limits: 'как в Two-stage', days: '5 торговых дней на каждом этапе' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Hash Hedge — это развод?',
    a: `Фактов о мошенничестве у нас нет, но и независимой проверки выплат тоже нет. ${asOf(CHECKED)} известно: платформой управляет Empower Academy Ltd (ОАЭ, рег. № 01010596), выплаты по коммерческим условиям обязана производить FinSmart Solution Ltd (Сейшелы, рег. № 246832). Условия датированы 08.10.2026. Сертификаты выплат и цифра «5 792 трейдера с финансированием» — заявления самой фирмы.`,
  },
  {
    q: 'Работает ли Hash Hedge с трейдерами из России?',
    a: `Россия не названа в списке ограничений. В п. 4.3 условий от 08.10.2026 перечислены только Куба, Иран, КНДР, Сирия и Йемен («но не только»), а также лица и юрисдикции под всеобъемлющими санкциями. Регистрацию и оплату из России мы не проверяли. У фирмы есть официальная русская версия сайта.`,
  },
  {
    q: 'Как оплатить челлендж Hash Hedge?',
    a: `Только криптовалютой, без карт и банковских переводов. В руководстве указаны USDT или USDC, а в FAQ на главной — «только USDT». Сети: ERC-20, TRC-20, BEP-20, Arbitrum, Optimism и Solana (${asOf(CHECKED)}).`,
  },
  {
    q: 'Как вывести прибыль и какие лимиты?',
    a: 'Выплата доступна, когда прошёл 14-дневный период, счёт в прибыли и все позиции закрыты. Минимум — $100, максимум — $10 000 на счёт за 14 дней. Выплата приходит только в USDT, в одной из шести сетей. Доля трейдера — 80%, с платной опцией — 90%.',
  },
  {
    q: 'Можно ли торговать на новостях и в выходные?',
    a: 'Да: в руководстве сказано, что фирма не ограничивает торговлю на новостях и в выходные. Исключение — US Stocks: там все позиции закрываются в 23:59 (UTC+4), удерживать их через ночь и выходные нельзя.',
  },
  {
    q: 'Есть ли промокод Hash Hedge?',
    a: `У нас нет промокода Hash Hedge. Поле для промокода в корзине есть, но публичного официального кода мы не нашли (${asOf(CHECKED)}).`,
  },
]

export default function RussianHashHedgeReviewPage() {
  const fresh = isChallengeFresh({ sourceCapturedAt: CHECKED })
  const dateModified = russianRouteDateModified(PATH)
  const bright = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const brightSplit = bright.map(product => product.profitSplitPct).find(value => value != null)
  const brightFrequency = bright.map(product => product.payoutFrequency).find(Boolean)
  const frequencyRu: Record<string, string> = { 'bi-weekly': 'раз в 2 недели', weekly: 'еженедельно', monthly: 'ежемесячно' }

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор Hash Hedge' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }
  const officialCta = (placement: string, label: string) => (
    <span className="ru-actions" data-russian-hh-cta={placement}>
      <a href={SOURCES.home} target="_blank" rel="nofollow noopener" className="btn-primary" data-russian-hh-official="non-affiliate">
        {label} <ExternalLink size={14} aria-hidden="true" />
      </a>{' '}
      <RuAccessBadgeView firm="hash-hedge" status={HH_RUSSIA_STATUS} />
    </span>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {fresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-review="hash-hedge" data-russia-status-hash-hedge={HH_RUSSIA_STATUS}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/luchshie-prop-firmy">Рейтинг</Link> / Обзор Hash Hedge</div>
          <div className="ru-eyebrow"><Database size={14} aria-hidden="true" /> Официальные страницы проверены {ruDate(CHECKED)} · условия от {ruDate(TERMS_DATED)}</div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Hash Hedge (Хеш Хедж) — крипто-проп-компания со своим веб-терминалом: бессрочные фьючерсы на криптовалюту и
            традиционные рынки 24/7, а с недавних пор и отдельный терминал для 11 000+ акций США. Вход — от $79, оплата только
            криптовалютой, выплаты только в USDT и официальная гарантия: задержка дольше 72 часов — выплата в тройном размере.
            Ниже — что из этого подтверждено условиями, а что остаётся словами фирмы.
          </p>
          {!fresh && <p className="ru-notice" data-russian-hh-evidence-status="recapture-required">Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.</p>}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link></span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>3</strong><span>программы в продаже</span></div>
            <div className="ru-stat"><strong>$79</strong><span>минимальный взнос</span></div>
            <div className="ru-stat"><strong>80% / 90%</strong><span>доля трейдера (90% — платная опция)</span></div>
            <div className="ru-stat"><strong>72 ч</strong><span>гарантия выплаты по условиям</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-hh-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Hash Hedge">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: что такое Hash Hedge</a></li>
                <li><a href="#access">Доступ из России и СНГ</a></li>
                <li><a href="#programs">Челленджи и цены</a></li>
                <li><a href="#rules">Правила</a></li>
                <li><a href="#payouts">Вывод прибыли</a></li>
                <li><a href="#payment">Оплата из России</a></li>
                <li><a href="#reviews">Отзывы и «скам» ли это</a></li>
                <li><a href="#compare">Hash Hedge, CFT или BrightFunded</a></li>
                <li><a href="#pros-cons">Плюсы и минусы</a></li>
                <li><a href="#sources">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-hh-verdict="summary">
            <h2>Коротко: что такое Hash Hedge и кому подходит</h2>
            <div className="ru-notice" data-russian-hh-access="not-in-restricted-list">
              <strong>Доступ из России:</strong> <RuAccessBadgeView firm="hash-hedge" status={HH_RUSSIA_STATUS} />{' '}
              Россия не в списке ограничений: в условиях от {ruDate(TERMS_DATED)} запрещены только Куба, Иран, КНДР, Сирия, Йемен и
              санкционные лица. Регистрацию и оплату из России мы не проверяли.
            </div>
            <p>
              Hash Hedge подходит трейдеру, который торгует криптовалютой вручную в браузере и готов платить в USDT. Two-stage
              стоит от $79 за $5K до $1,393 за $200K, цели — 5% и 6%, минимум 5 торговых дней на этап, срока нет. Плечо — до 1:5.
            </p>
            <p>
              Не подходит, если вам нужны MT5, советники или карта: платформа только своя, боты запрещены (п. 12.2 условий),
              оплата — только криптой. Выплата — не чаще раза в 14 дней и не больше $10,000 за период на счёт. Как считается
              общая просадка, официальные страницы описывают по-разному, поэтому до покупки уточните это в поддержке.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="hash-hedge-review">
              <strong>Раскрытие.</strong> Ссылка на Hash Hedge на этой странице обычная: у сайта нет партнёрского договора с Hash
              Hedge, хотя партнёрская программа у фирмы есть. Ссылки на BrightFunded и FundedNext в блоке альтернатив —
              партнёрские, по ним мы можем получить комиссию.
            </div>
            {officialCta('summary', 'Официальный сайт Hash Hedge')}
          </div>
        </section>

        <section className="ru-section" id="access">
          <div className="ru-shell ru-content" data-russian-hh-terms={TERMS_DATED}>
            <h2>Доступ из России и СНГ</h2>
            <p>
              Пункт 4.1 <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">условий</a> (редакция от{' '}
              {ruDate(TERMS_DATED)}) требует, чтобы вы жили в юрисдикции, где сервис разрешён, и не попадали под ограничения
              международных санкций или местного законодательства. Пункт 4.3 называет конкретные страны: Куба, Иран, КНДР, Сирия и
              Йемен — с оговоркой «но не только», а также лица под санкциями и страны и регионы под всеобъемлющими
              экономическими санкциями.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ к Hash Hedge по странам">
              <table className="ru-table">
                <caption className="sr-only">Hash Hedge: страны СНГ в условиях от 08.10.2026</caption>
                <thead><tr><th>Страна</th><th>В списке п. 4.3</th><th>Что учесть</th></tr></thead>
                <tbody>
                  <tr><td>Россия</td><td>Не названа</td><td>Есть официальная русская версия сайта и русскоязычная поддержка</td></tr>
                  <tr><td>Беларусь</td><td>Не названа</td><td>Общий санкционный пункт 4.1 действует для всех</td></tr>
                  <tr><td>Казахстан</td><td>Не назван</td><td>Есть казахстанская версия сайта</td></tr>
                  <tr><td>Украина</td><td>Не названа</td><td>Есть украинская версия сайта; Крым и оккупированные регионы могут попасть под пункт о регионах под всеобъемлющими санкциями (по названию не указаны)</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              «Не названа» не значит «гарантированно пустят». Регистрацию, оплату и выплату из России мы не тестировали. Сама
              фирма проводила встречу партнёров «Moscow 2026 Affiliates Meet-up» — это её собственная активность, а не
              юридическое подтверждение доступа.
            </p>
            <h3>Кто стоит за Hash Hedge</h3>
            <p>
              Компаний две, и это важно для претензий. Платформой управляет <strong>Empower Academy Ltd</strong> (ОАЭ, рег.
              № 01010596) — так в п. 1 условий. Распределение прибыли и выплаты по{' '}
              <a href={SOURCES.commercial} target="_blank" rel="nofollow noopener noreferrer">коммерческим условиям</a> (§8) обязана
              производить <strong>FinSmart Solution Ltd</strong> (Сейшелы, рег. № 246832). Официальный сайт — hashhedge.com,
              русская версия — <a href={SOURCES.ru} target="_blank" rel="nofollow noopener noreferrer">hashhedge.com/ru</a>.
            </p>
            <h3>Проверка личности (KYC)</h3>
            <p>
              При покупке челленджа KYC нет. Проверка личности обязательна перед выдачей реального (Live) счёта, и фирма может
              потребовать повторную проверку перед выплатой. Что это значит на практике — в разделе{' '}
              <Link href="/ru/prop-firmy-bez-kyc">проп-фирмы без KYC</Link>.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a> (п. 1, 4.1, 4.3, 6.5) от {ruDate(TERMS_DATED)}, <a href={SOURCES.commercial} target="_blank" rel="nofollow noopener noreferrer">Commercial Terms</a> (§2, §3, §8) — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Челленджи и цены Hash Hedge</h2>
            <p className="ru-muted">Цены с официального сайта {asOf(CHECKED)}, в долларах, оплата в криптовалюте. Каждая карточка обещает «+5% Cashback» — это внутренние HH Coins, вывести их нельзя.</p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Цены челленджей Hash Hedge">
              <table className="ru-table" data-russian-hh-product-count={PROGRAMS.length}>
                <caption className="sr-only">Цены челленджей Hash Hedge по размеру счёта</caption>
                <thead><tr><th>Программа</th>{SIZES.map(size => <th key={size}>{size}</th>)}</tr></thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-hh-product={program.key}>
                      <td><strong>{program.name}</strong></td>
                      {SIZES.map((size, index) => <td key={size}>{program.prices[index] != null ? usd(program.prices[index]) : '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {officialCta('programs', 'Выбрать челлендж на сайте Hash Hedge')}
          </div>
          <div className="ru-shell ru-content">
            <p>
              Two-stage и US Stocks стоят одинаково до $100K: $79, $99, $249, $499 и $799. One-stage дороже на 20–60%: за $5K —
              $99 вместо $79, за $100K — $999 вместо $799. Размера $150K больше нет, а Instant и счёт $500K помечены как «скоро».
            </p>
            <p>
              При оформлении можно добавить две опции: <strong>+10% к доле</strong> (80% → 90% на стадии Trader) и{' '}
              <strong>Daily Loss Protection</strong> — разовый сброс дневного лимита. Цены опций зависят от размера счёта и видны
              только в корзине после входа, поэтому мы их не приводим.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">hashhedge.com</a> (выбор цен), <a href={SOURCES.challengeTypes} target="_blank" rel="nofollow noopener noreferrer">руководство: Challenge types</a> — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-hh-rules={CHECKED}>
            <h2>Правила: цели, просадка, минимум дней, плечо до 1:5</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Правила челленджей Hash Hedge">
              <table className="ru-table">
                <caption className="sr-only">Цели, лимиты убытка и минимум дней Hash Hedge</caption>
                <thead><tr><th>Программа</th><th>Цели</th><th>Лимиты убытка</th><th>Минимум дней</th></tr></thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key}><td><strong>{program.name}</strong></td><td>{program.targets}</td><td>{program.limits}</td><td>{program.days}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              На примере $100K Two-stage за $799: на первом этапе нужно заработать $5,000, на втором — $6,000; дневной убыток
              не должен превысить 5%, общий — 10% на первом этапе и 8% дальше. На одной карточке главной страницы ещё указаны
              цели «+8% / +6%» — мы используем таблицу и руководство (5% и 6%).
            </p>
            <p data-russian-hh-drawdown-basis="unconfirmed">
              <strong>База расчёта просадки не подтверждена.</strong> Руководство считает лимиты от размера счёта, а главная
              страница пишет «Peak-to-trough». Поэтому мы не называем просадку ни статической, ни подвижной. Максимальный размер
              финансируемого счёта тоже не подтверждён: официальные страницы называют разные суммы.
            </p>
            <ul className="wp-block-list">
              <li><strong>Торговый день</strong> — любой день, когда вы открыли хотя бы одну позицию. Срока на прохождение нет.</li>
              <li><strong>Плечо</strong> — не больше 1:5 на всех этапах и всех активах; в US Stocks покупательная способность — 5× от баланса.</li>
              <li><strong>Новости и выходные</strong> — без ограничений. В US Stocks все позиции закрываются в 23:59 (UTC+4).</li>
              <li><strong>Хеджирование между счетами запрещено</strong> (п. 11): противоположные позиции на двух и более счетах, в том числе по коррелирующим инструментам (корреляция за 30 дней ≥ 0,6) и по договорённости с другими трейдерами. Внутри одного счёта — разрешено.</li>
              <li><strong>Боты и советники</strong> — запрещены: п. 12.2 не разрешает автоматические инструменты, скрипты и API. MT4/MT5 нет, торговля идёт в собственном веб-терминале.</li>
              <li><strong>Правило лучшего дня</strong> — не найдено в условиях (это не то же самое, что «нет»).</li>
              <li><strong>Приложение</strong> — только для просмотра: открывать, менять и закрывать сделки в нём нельзя (п. 5.6).</li>
            </ul>
            <p className="ru-source-line">Источники: <a href={SOURCES.challengeTypes} target="_blank" rel="nofollow noopener noreferrer">Challenge types</a>, <a href={SOURCES.rules} target="_blank" rel="nofollow noopener noreferrer">Challenge rules</a>, <a href={SOURCES.guideFaq} target="_blank" rel="nofollow noopener noreferrer">FAQ руководства</a>, <a href={SOURCES.stocks} target="_blank" rel="nofollow noopener noreferrer">Stocks terminal</a>, <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms</a> — {asOf(CHECKED)}. Как устроены этапы в целом — в <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде по челленджам</Link>.</p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-hh-payouts={CHECKED}>
            <h2>Вывод прибыли</h2>
            <p>
              Доля трейдера — 80%, с опцией +10% — 90%. Выплата становится доступной, когда выполнены три условия: прошёл
              14-дневный период, счёт в прибыли и все позиции закрыты. По коммерческим условиям день выплаты вы выбираете сами:
              от 14 до 60 календарных дней после первой сделки цикла.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Лимиты выплат Hash Hedge">
              <table className="ru-table">
                <caption className="sr-only">Лимиты и способы выплат Hash Hedge</caption>
                <tbody>
                  <tr><th scope="row">Минимум</th><td>$100</td></tr>
                  <tr><th scope="row">Максимум</th><td>$10,000 на счёт за 14 дней</td></tr>
                  <tr><th scope="row">Валюта</th><td>Только USDT</td></tr>
                  <tr><th scope="row">Сети</th><td>ERC-20, TRC-20, BEP-20, Arbitrum, Optimism, Solana</td></tr>
                  <tr><th scope="row">Следующий запрос</th><td>Не раньше чем через 14 дней после предыдущей выплаты</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Потолок важен на крупных счетах. Если на $200K вы заработали $20,000, ваши 80% — это $16,000, но за один 14-дневный
              период можно вывести только $10,000 с этого счёта.
            </p>
            <h3>Гарантия 72 часа</h3>
            <p data-russian-hh-guarantee="official">
              Это официальное условие, а не рекламный лозунг. В{' '}
              <a href={SOURCES.commercial} target="_blank" rel="nofollow noopener noreferrer">коммерческих условиях</a> (§3)
              записано: если корректный и полный запрос на выплату за прибыльный цикл не обработан и не оплачен в течение 72
              часов, трейдер имеет право получить сумму в три раза больше выплаты. На главной то же сказано короче: «задержка
              дольше 72 часов — платим втрое». <strong>Исключения:</strong> гарантия не действует для запросов, которые
              находятся на удержании (Hold), под проверкой или ждут повторной верификации личности.
            </p>
            <p>Сравнить сроки и способы вывода с другими фирмами можно в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
            <p className="ru-source-line">Источники: <a href={SOURCES.payouts} target="_blank" rel="nofollow noopener noreferrer">Profit payouts</a>, <a href={SOURCES.commercial} target="_blank" rel="nofollow noopener noreferrer">Commercial Terms</a> (§3), <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">главная</a> — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="payment">
          <div className="ru-shell ru-content" data-russian-hh-payment="crypto-only">
            <h2>Оплата челленджа из России</h2>
            <p>
              Карт и банковских переводов нет — только криптовалюта. Здесь официальные страницы расходятся: руководство по
              покупке пишет «USDT или USDC», а FAQ на главной — «принимаем только USDT». Сети в обоих случаях одни и те же:
              ERC-20, TRC-20, BEP-20, Arbitrum, Optimism и Solana. Если у вас USDC, проверьте, есть ли он в корзине, до перевода.
            </p>
            <p>
              Для читателя из России это значит: вопрос «пройдёт ли карта» не возникает, но нужен свой криптокошелёк. Комиссия
              и время зачисления зависят от выбранной сети.
            </p>
            <p className="ru-source-line">Источники: <a href={SOURCES.buy} target="_blank" rel="nofollow noopener noreferrer">How to buy a Challenge</a>, FAQ на <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">hashhedge.com</a> — {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-hh-trustpilot={CHECKED}>
            <h2>Отзывы о Hash Hedge и «скам» ли это</h2>
            <p>
              {asOf(CHECKED)} на Trustpilot у Hash Hedge рейтинг 4.5 по 116 отзывам, 100 из них — за последние 12 месяцев.
              Площадка помечает профиль как «Claimed profile • Mar 2025», «Paid Trustpilot subscription» и «Asks customers to
              review»: фирма платит за подписку и сама просит клиентов оставлять отзывы. 116 отзывов — немного, и
              такой рейтинг не заменяет проверку выплат.
            </p>
            <p>
              Цифра «5 792 трейдера с финансированием», сертификаты выплат и Telegram-сообщество — собственные материалы фирмы.
              Независимого подтверждения выплат у нас нет. Как отличать полезный отзыв от рекламного — в разделе{' '}
              <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.
            </p>
            <h3>Промокод Hash Hedge</h3>
            <p>У нас нет промокода Hash Hedge. Поле для кода в корзине есть, но публичного официального кода мы не нашли ({asOf(CHECKED)}).</p>
            <p className="ru-source-line">Источник: <a href={SOURCES.trustpilot} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a>, {asOf(CHECKED)}.</p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Hash Hedge, Crypto Fund Trader или BrightFunded</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Сравнение Hash Hedge, CFT и BrightFunded">
              <table className="ru-table" data-russian-hh-compare="three-firms">
                <caption className="sr-only">Hash Hedge, Crypto Fund Trader и BrightFunded</caption>
                <thead><tr><th></th><th>BrightFunded</th><th>Hash Hedge</th><th>Crypto Fund Trader</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Рынки</th><td>Форекс, индексы, сырьё</td><td>Крипто и TradFi-фьючерсы, акции США</td><td>Крипто, форекс, индексы</td></tr>
                  <tr><th scope="row">Платформы</th><td>MT5, DXTrade, cTrader</td><td>Свой веб-терминал</td><td>Match-Trader, MT5, Bybit</td></tr>
                  <tr><th scope="row">Доля</th><td>{brightSplit != null ? `${brightSplit}%` : 'требует проверки'}</td><td>80% (90% с опцией)</td><td>80% в оценочных программах</td></tr>
                  <tr><th scope="row">Цикл выплат</th><td>{brightFrequency ? frequencyRu[brightFrequency] ?? brightFrequency : 'требует проверки'}</td><td>раз в 14 дней</td><td>после 15 торговых или раз в 30 календарных дней</td></tr>
                  <tr><th scope="row">Оплата</th><td>Крипта и карта</td><td>Только крипта</td><td>Карта, PayPal, Apple/Google Pay, крипта</td></tr>
                  <tr><th scope="row">Доступ для РФ</th><td><RuAccessBadgeView firm="bright-funded" status={russiaStatusFor('bright-funded')} /></td><td><RuAccessBadgeView firm="hash-hedge" status={HH_RUSSIA_STATUS} /></td><td><RuAccessBadgeView firm="crypto-fund-trader" status={russiaStatusFor('crypto-fund-trader')} /></td></tr>
                </tbody>
              </table>
            </div>
            <p className="ru-source-line">BrightFunded — данные программ по нашей базе; CFT — официальные страницы CFT по данным на 19.10.2026; Hash Hedge — {asOf(CHECKED)}.</p>
            <div className="ru-grid" data-russian-hh-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-hh-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">Если нужны MT5 или cTrader и форекс вместо крипты. Взносы в EUR.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-hash-hedge-alternative-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-hh-alternative="fundednext">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>FundedNext (CFD)</h3>
                <p className="ru-muted">CFD-программы Stellar. Выплаты в USDT и USDC; доступ для РФ — по бейджу рядом с кнопкой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-fundednext" className="btn-outline">Обзор</Link>
                  <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-hash-hedge-alternative-fundednext" rel={goLinkRel('fundednext')} className="btn-primary">Проверить FundedNext <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-hh-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Если нужна крипта, но на Match-Trader или MT5, и оплата не только криптой.</p>
                <div className="ru-actions">
                  <RuPendingLink href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</RuPendingLink>
                  <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-hash-hedge-alternative-cft" rel={goLinkRel('crypto-fund-trader')} className="btn-primary">Проверить CFT <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
                </div>
              </article>
            </div>
            <p>Все крипто-варианты в одной таблице — в <Link href="/ru/luchshie-kripto-prop-firmy">рейтинге крипто-проп фирм</Link>.</p>
          </div>
        </section>

        <section className="ru-section" id="pros-cons">
          <div className="ru-shell ru-content">
            <h2>Плюсы и минусы</h2>
            <div className="ru-grid">
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>Гарантия 72 часа</strong> записана в коммерческих условиях.</li>
                  <li><strong>Невысокие цели</strong> Two-stage: 5% и 6%.</li>
                  <li><strong>Нет срока</strong> на прохождение.</li>
                  <li><strong>Россия не в списке ограничений</strong>, есть русская версия сайта.</li>
                  <li><strong>Новости и выходные</strong> без ограничений (кроме US Stocks).</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Только крипта</strong> при оплате и только USDT при выводе.</li>
                  <li><strong>Нет MT5 и ботов</strong>, приложение только для просмотра.</li>
                  <li><strong>$10,000 за 14 дней</strong> — потолок выплаты на счёт.</li>
                  <li><strong>База просадки</strong> на официальных страницах описана по-разному.</li>
                  <li><strong>Плечо до 1:5</strong> — мало для активного интрадея.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <ul>
              <li><a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a> (редакция от {ruDate(TERMS_DATED)}): оператор, страны, хеджирование, боты, приложение — {asOf(CHECKED)}.</li>
              <li><a href={SOURCES.commercial} target="_blank" rel="nofollow noopener noreferrer">Commercial Terms</a>: FinSmart Solution Ltd, цикл выплат, лимиты, гарантия 72 часа — {asOf(CHECKED)}.</li>
              <li><a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">hashhedge.com</a>: цены, FAQ об оплате — {asOf(CHECKED)}.</li>
              <li>Руководство: <a href={SOURCES.challengeTypes} target="_blank" rel="nofollow noopener noreferrer">Challenge types</a>, <a href={SOURCES.buy} target="_blank" rel="nofollow noopener noreferrer">How to buy</a>, <a href={SOURCES.payouts} target="_blank" rel="nofollow noopener noreferrer">Profit payouts</a>, <a href={SOURCES.rules} target="_blank" rel="nofollow noopener noreferrer">Challenge rules</a> — {asOf(CHECKED)}.</li>
              <li><a href={SOURCES.trustpilot} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a> — {asOf(CHECKED)}.</li>
            </ul>
            <p>Мы не регистрировались, не оплачивали челлендж и не получали выплату от Hash Hedge.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="hash-hedge-review">
              <strong>Риск.</strong> Торговля криптовалютой и фьючерсами с плечом связана с высоким риском. Большинство участников
              не проходит оценку, взнос не возвращается. Счета на этапах оценки — симулированные; вознаграждение выплачивается по
              правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            {officialCta('final', 'Перейти на сайт Hash Hedge')}
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о Hash Hedge</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>
      </article>
    </>
  )
}
