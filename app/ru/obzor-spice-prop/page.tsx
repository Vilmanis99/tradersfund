import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import { ruNotListedDate } from '@/lib/ruBasisWording'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-spice-prop'
const TITLE = 'Spice Prop: отзывы и обзор 2026 — условия и доступ из РФ'
const H1 = 'Spice Prop (Спайс Проп): обзор и отзывы 2026'
const DESCRIPTION = 'Spice Prop (Спайс Проп): обзор 2026 — программы от €45, сплит 80–90%, MT5, выплаты в крипту и статус доступа из России по официальным источникам.'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['spice prop', 'спайс проп', 'spice prop отзывы', 'спайс проп отзывы', 'spice prop проп', 'spiceprop'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

/**
 * Facts: Prop Firm Tracker final capture /workspace/ru-data/2026-10-26-spice-prop-final.md
 * and content/data/challenges/_captures/spice-prop-2026-10-26.json (data ffbf684, already on main).
 * Spice Prop is only in firms-pending.json (russiaStatus 'unclear'); no /go route — official-site
 * nofollow CTA. List prices «по данным на 26.10.2026»; the 26–28.10 promo is omitted (ends before ship).
 * Conflicts on the firm's own pages are labelled «условия расходятся, уточните у поддержки».
 */
const CHECKED = '2026-10-26'
const TERMS_EFFECTIVE = '2025-10-16'
const DATE_PUBLISHED = '2026-10-30'
const NSSMC_ORDER = '2025-06-24'
const NSSMC_STILL = '2026-10-26'

const SOURCES = {
  home: 'https://spiceprop.com/',
  homeRu: 'https://spiceprop.com/ru',
  terms: 'https://spiceprop.com/terms-conditions',
  addons: 'https://spiceprop.com/terms-addons',
  about: 'https://spiceprop.com/about',
  affiliate: 'https://spiceprop.com/affiliate',
  payouts: 'https://spiceprop.com/payouts',
  twoStep: 'https://spiceprop.com/programs/spice-2-step',
  twoStepPro: 'https://spiceprop.com/programs/spice-2-step-pro',
  oneStep: 'https://spiceprop.com/programs/spice-1-step',
  threeStep: 'https://spiceprop.com/programs/spice-3-step',
  instant: 'https://spiceprop.com/programs/spice-instant',
  instantPro: 'https://spiceprop.com/programs/spice-instant-pro',
  qa891: 'https://spiceprop.com/qa/891-what-is-kyc-and-why-is-it-required',
  qa892: 'https://spiceprop.com/qa/892-who-can-register-and-are-there-any-restricted-countries',
  qa897: 'https://spiceprop.com/qa/897-are-eas-and-copy-trading-allowed',
  qa898: 'https://spiceprop.com/qa/898-kakie-torgovye-praktiki-zapreshcheny',
  qa900: 'https://spiceprop.com/qa/900-what-instruments-and-leverage-are-available',
  qa902: 'https://spiceprop.com/qa/902-what-is-the-2-risk-rule',
  qa903: 'https://spiceprop.com/qa/903-how-is-drawdown-calculated',
  qa904: 'https://spiceprop.com/qa/904-can-i-trade-news-overnight-and-weekends',
  qa912: 'https://spiceprop.com/qa/912-is-the-challenge-fee-refundable',
  qa913: 'https://spiceprop.com/qa/913-how-do-i-request-a-payout-and-what-methods-are-available',
  qa915: 'https://spiceprop.com/qa/915-when-can-i-request-a-payout',
  qa917: 'https://spiceprop.com/qa/917-what-is-the-consistency-rule',
  qa919: 'https://spiceprop.com/qa/919-what-counts-as-a-profitable-day',
  qa920: 'https://spiceprop.com/qa/920-what-trading-practices-are-banned-on-funded',
  nssmcList: 'https://www.nssmc.gov.ua/activity/insha-diialnist/zakhyst-investoriv/',
  nssmcNews: 'https://www.nssmc.gov.ua/budte-obachni-nktspfr-vyiavyla-4-novi-scam-proiekty/',
  trustpilot: 'https://www.trustpilot.com/review/spiceprop.com',
} as const

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const asOf = (iso: string) => `по данным на ${ruDate(iso)}`
/** RU thousand separator: plain space (€1 573). */
const eur = (value: number) => `€${value.toLocaleString('en-US').replace(/,/g, ' ')}`

type ProgramRow = {
  key: string
  name: string
  href: string
  targets: string
  daily: string
  maxLoss: string
  days: string
  leverage: string
  split: string
  cycle: string
  sizes: string
}

const PROGRAMS: ProgramRow[] = [
  {
    key: '2-step',
    name: 'Spice 2-Step',
    href: SOURCES.twoStep,
    targets: 'P1 7,5% → P2 5%',
    daily: 'P1 5,5%; P2 и funded 4,5%',
    maxLoss: '11% (статический)',
    days: '3 на этап; 4 на funded',
    leverage: '1:100',
    split: '80%',
    cycle: '14 дней',
    sizes: `${eur(45)} / ${eur(99)} / ${eur(166)} / ${eur(295)} / ${eur(499)} / ${eur(715)} (€6K–€150K)`,
  },
  {
    key: '2-step-pro',
    name: 'Spice 2-Step Pro',
    href: SOURCES.twoStepPro,
    targets: 'как 2-Step',
    daily: 'как 2-Step',
    maxLoss: '11% (статический)',
    days: '3 / 4',
    leverage: '1:100',
    split: '90%',
    cycle: '7 дней',
    sizes: `${eur(1_573)} (€300K, макс. 1 счёт)`,
  },
  {
    key: '1-step',
    name: 'Spice 1-Step',
    href: SOURCES.oneStep,
    targets: '10%',
    daily: '4% (на сетке funded — 4,5%; см. конфликт)',
    maxLoss: '11% (статический)',
    days: '3 / 4',
    leverage: '1:100',
    split: '80%',
    cycle: '14 дней',
    sizes: `${eur(129)} / ${eur(219)} / ${eur(389)} / ${eur(586)} (€10K–€75K)`,
  },
  {
    key: '3-step',
    name: 'Spice 3-Step',
    href: SOURCES.threeStep,
    targets: '4% / 6% / 6%',
    daily: '3%',
    maxLoss: '7% (статический)',
    days: '3 на этап; 4 на funded',
    leverage: '1:33',
    split: '80%',
    cycle: '14 дней',
    sizes: '30% сразу + 70% после прохождения: €15K 18+42; €40K 39+91; €80K 60+140; €120K 90+210',
  },
  {
    key: 'instant',
    name: 'Spice Instant',
    href: SOURCES.instant,
    targets: 'нет этапов',
    daily: '2,5%',
    maxLoss: '8% (статический)',
    days: '7 прибыльных за 14-дневный цикл',
    leverage: '1:33 на странице / 1:30 на сетке',
    split: '80%',
    cycle: '14 дней',
    sizes: `${eur(40)} / ${eur(120)} / ${eur(234)} / ${eur(422)} / ${eur(780)} (€1K–€40K)`,
  },
  {
    key: 'instant-pro',
    name: 'Spice Instant Pro',
    href: SOURCES.instantPro,
    targets: '8% на исходном счёте',
    daily: '2,5% (сетка)',
    maxLoss: '8% (статический)',
    days: '3 прибыльных за 14-дневный цикл',
    leverage: '1:33 на странице / 1:30 на сетке',
    split: '50% до первого +8%, далее 80%',
    cycle: '14 дней',
    sizes: `${eur(62)} / ${eur(185)} / ${eur(360)} (€1K–€10K)`,
  },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Spice Prop — это развод?',
    a: `Фактов о мошенничестве у нас нет, и независимой проверки выплат тоже нет. ${asOf(CHECKED)} известно: сайтом управляет SPICEPROP SL LTD (Сент-Люсия); платежные посредники — SPICEPROP HK LIMITED (Гонконг) и SPICEPROP SRO (Прага). Условия регулируются чешским правом (п. 11.3). Регулятор Украины НКЦПФР внёс spiceprop.com в список проектов с признаками сомнительности (решение №10/21/2485/К04 от ${ruDate(NSSMC_ORDER)}; запись сохраняется на ${ruDate(NSSMC_STILL)}). Номера регистрации и год основания на сайте не указаны.`,
  },
  {
    q: 'Работает ли Spice Prop в России?',
    a: `Однозначного ответа на сайте нет. В подвале перечислены 14 стран (США, КНДР, Эритрея, Иран, Ирак, Либерия, Ливия, Сомали, Судан, Сирия, Япония, Канада, Пуэрто-Рико, Индонезия) — России, Беларуси, Казахстана и Украины среди них нет. При этом п. 2.2 условий исключает «citizens, residents, or persons located in restricted or sanctioned countries», а п. 9.4 — лиц из санкционных списков ЕС/ООН/Великобритании/OFAC. Статус в нашей базе — «неясен». Русская версия сайта (spiceprop.com/ru) не означает доступ.`,
  },
  {
    q: 'Сколько стоит челлендж Spice Prop?',
    a: `Лист-цены ${asOf(CHECKED)}: 2-Step от ${eur(45)} (€6K) до ${eur(715)} (€150K); 2-Step Pro ${eur(1_573)} (€300K); 1-Step от ${eur(129)}; 3-Step — 30% сразу и 70% после прохождения; Instant от ${eur(40)} до ${eur(780)}; Instant Pro от ${eur(62)} до ${eur(360)}. Актуальную скидку смотрите на сайте: мы печатаем только лист-цены.`,
  },
  {
    q: 'Какой сплит и как выводить прибыль?',
    a: `Базовый сплит — 80%, на 2-Step Pro — 90%, на Instant Pro — 50% до первого +8%, затем 80%. Выплаты — только на криптокошелёк на имя трейдера (Q&A 913); сети и монеты на сайте не указаны. Минимум реализованной прибыли для заявки — ${eur(100)}; максимум выплаты на сайте не указан. Цикл — 14 дней (7 на 2-Step Pro).`,
  },
  {
    q: 'Какие правила просадки?',
    a: `Дневной лимит считается от стартового эквити дня (сброс в 23:59:59 по CET). Общий лимит — статический от начального баланса счёта (Q&A 903). На 2-Step: дневной 5,5%/4,5%, общий 11%. На Instant: дневной 2,5%, общий 8%. Прибыльный день — рост баланса и эквити ≥ +0,5% к предыдущему закрытию (Q&A 919).`,
  },
  {
    q: 'Чем Spice Prop отличается от Hash Hedge и Crypto Fund Trader?',
    a: `Spice Prop работает на MT5, цены в евро, сплит 80–90%. Hash Hedge — свой веб-терминал и выплаты в USDT с потолком $10 000 за 14 дней. Crypto Fund Trader — Match-Trader/MT5, цены в долларах, у Match-Trader России нет в списке ограничений (на ${ruNotListedDate('crypto-fund-trader')}). У всех трёх статус доступа из РФ нужно сверять по своим условиям.`,
  },
]

export default function RussianSpicePropReviewPage() {
  const spiceStatus = russiaStatusFor('spice-prop')
  const fresh = isChallengeFresh({ sourceCapturedAt: CHECKED })
  const dateModified = russianRouteDateModified(PATH)
  const bright = getChallengesByFirm('bright-funded').filter(product => isChallengeFresh(product))
  const brightSplit = bright.map(product => product.profitSplitPct).find(value => value != null)
  const brightFrequency = bright.map(product => product.payoutFrequency).find(Boolean)
  const frequencyRu: Record<string, string> = { 'bi-weekly': 'раз в 2 недели', weekly: 'еженедельно', monthly: 'ежемесячно', 'on-demand': 'по запросу' }
  const closedHref = ruClosedFirmsHref()

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Крипто проп-компании', url: '/ru/luchshie-kripto-prop-firmy' },
    { name: 'Обзор Spice Prop' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: DATE_PUBLISHED,
    dateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  const officialCta = (placement: string, label: string) => (
    <span className="ru-actions" data-russian-spice-cta={placement}>
      <a href={SOURCES.home} target="_blank" rel="nofollow noopener" className="btn-primary" data-russian-spice-official="non-affiliate">
        {label} <ExternalLink size={14} aria-hidden="true" />
      </a>{' '}
      <RuAccessBadgeView firm="spice-prop" status={spiceStatus} />
    </span>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {fresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-review="spice-prop" data-russia-status-spice-prop={spiceStatus}>
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            <Link href="/ru/luchshie-kripto-prop-firmy">Крипто проп-компании</Link>
            {' / '}
            Обзор Spice Prop
          </div>
          <div className="ru-eyebrow">
            <Database size={14} aria-hidden="true" /> Официальные страницы проверены {ruDate(CHECKED)} · условия от {ruDate(TERMS_EFFECTIVE)}
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Spice Prop (Спайс Проп) — проп-компания на MetaTrader 5 с программами 1/2/3-Step, Instant и Instant Pro.
            Вход — от {eur(45)} за 2-Step €6K; сплит 80% (90% на 2-Step Pro); выплаты — на криптокошелёк.
            Доступ из России по публичным источникам неясен: России нет в подвальном списке стран, но условия
            исключают «restricted or sanctioned countries». Ниже — что прямо записано на сайте, а где страницы фирмы расходятся.
          </p>
          {!fresh && (
            <p className="ru-notice" data-russian-spice-evidence-status="recapture-required">
              Данные проверки от {ruDate(CHECKED)} старше 30 дней. Сверьте цены и условия на официальном сайте.
            </p>
          )}
          <div className="ru-review-meta" aria-label="Редакционные данные обзора">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {ruDate(dateModified)}</span>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>6</strong><span>программ в линейке</span></div>
            <div className="ru-stat"><strong>{eur(45)}</strong><span>минимальный взнос (2-Step €6K)</span></div>
            <div className="ru-stat"><strong>80% / 90%</strong><span>доля трейдера</span></div>
            <div className="ru-stat"><strong>MT5</strong><span>единственная платформа</span></div>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-spice-article="long-form">
        <section className="ru-section ru-review-toc-section">
          <div className="ru-shell">
            <nav className="toc ru-review-toc" aria-label="Содержание обзора Spice Prop">
              <div className="toc-title">Содержание обзора</div>
              <ol>
                <li><a href="#verdict">Коротко: что такое Spice Prop</a></li>
                <li><a href="#company">Компания и юрлица</a></li>
                <li><a href="#access">Доступ из России и СНГ</a></li>
                <li><a href="#programs">Программы и цены</a></li>
                <li><a href="#example">Пример: 2-Step €10K</a></li>
                <li><a href="#rules">Правила торговли</a></li>
                <li><a href="#payouts">Выплаты</a></li>
                <li><a href="#platform">Платформа</a></li>
                <li><a href="#reviews">Отзывы</a></li>
                <li><a href="#risks">Риски до оплаты</a></li>
                <li><a href="#compare">Альтернативы</a></li>
                <li><a href="#sources">Источники</a></li>
                <li><a href="#faq">Частые вопросы</a></li>
              </ol>
            </nav>
          </div>
        </section>

        <section className="ru-section" id="verdict">
          <div className="ru-shell ru-content" data-russian-spice-verdict="summary">
            <h2>Коротко: что такое Spice Prop и доступна ли она из России</h2>
            <div className="ru-notice" data-russian-spice-access="unclear">
              <strong>Доступ из России:</strong> <RuAccessBadgeView firm="spice-prop" status={spiceStatus} />{' '}
              России нет в подвальном списке из 14 стран ({asOf(CHECKED)}), но п. 2.2 и п. 9.4 условий исключают
              резидентов и лиц из «restricted or sanctioned» юрисдикций без отдельного перечня. Регистрацию, оплату
              и выплату из России мы не проверяли. Русский язык сайта ≠ доступ.
            </div>
            <p>
              Spice Prop подходит трейдеру, которому нужен MT5, евро-цены и классический 2-Step с возвратом взноса
              при первой выплате. Не подходит, если нужен однозначный доступ из РФ, прозрачный список криптосетей
              для вывода или независимо проверенный Trustpilot: эти пункты на сайте не закрыты или расходятся.
            </p>
            <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="spice-prop-review">
              <strong>Раскрытие.</strong> Ссылка на Spice Prop на этой странице обычная: у сайта нет партнёрского
              договора со Spice Prop, хотя партнёрская программа у фирмы есть (до 20% lifetime). Ссылка на
              BrightFunded в блоке альтернатив — партнёрская; ссылка на Crypto Fund Trader — обычная.
            </div>
            {officialCta('summary', 'Официальный сайт Spice Prop')}
          </div>
        </section>

        <RuTelegramBlock placement="obzor-spice-prop" />

        <section className="ru-section" id="company">
          <div className="ru-shell ru-content" data-russian-spice-entity={CHECKED}>
            <h2>Компания: юрлицо, страна, год запуска</h2>
            <p>
              По подвалу сайта ({asOf(CHECKED)}) оператор — <strong>SPICEPROP SL LTD</strong>, Rodney Court Building,
              Rodney Bay, Gros Islet, Saint Lucia. Платёжные посредники — <strong>SPICEPROP HK LIMITED</strong> (Гонконг)
              и <strong>SPICEPROP SRO</strong>, Bucharova 2657/12, 158 00 Prague, Czech Republic. Условия (Effective Date{' '}
              {ruDate(TERMS_EFFECTIVE)}) подчинены чешскому праву, споры — судам Чехии по месту SpiceProp SRO (п. 11.3).
            </p>
            <p>
              Номера регистрации всех трёх юрлиц и год основания на сайте не указаны (подвал, Terms, About, Affiliate — {asOf(CHECKED)}).
              About пишет только «Founded by financial engineers…» без даты компании; даты в биографиях команды — личные карьеры, не год фирмы.
            </p>
            <p className="ru-source-line">
              Источники:{' '}
              <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">spiceprop.com</a>,{' '}
              <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms</a>,{' '}
              <a href={SOURCES.about} target="_blank" rel="nofollow noopener noreferrer">About</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="access">
          <div className="ru-shell ru-content" data-russian-spice-terms={TERMS_EFFECTIVE}>
            <h2>Доступ из России и СНГ</h2>
            <p>
              Подвал EN и RU ({asOf(CHECKED)}) одинаков: «we cannot register citizens from the following countries» —
              USA, North Korea, Eritrea, Iran, Iraq, Liberia, Libya, Somalia, Sudan, Syria, Japan, Canada, Puerto Rico,
              Indonesia. России, Беларуси, Казахстана и Украины в этом списке нет.
            </p>
            <p>
              Пункт 2.2 <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">условий</a> требует
              жить в стране, где сервис законен, и прямо говорит: «Citizens, residents, or persons located in restricted
              or sanctioned countries are not eligible.» Пункт 9.4 закрывает услуги для резидентов restricted/sanctioned
              регионов и лиц из списков ЕС/ООН/Великобритании/OFAC. Пункт 9.6 разрешает VPN/VPS только с одобрения компании
              или если они не скрывают личность и локацию. Q&A 892 повторяет: не резидент restricted/sanctioned регионов.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ к Spice Prop по странам">
              <table className="ru-table">
                <caption className="sr-only">Spice Prop: страны СНГ в публичных источниках на 26.10.2026</caption>
                <thead><tr><th>Страна</th><th>В подвальном списке</th><th>Что учесть</th></tr></thead>
                <tbody>
                  <tr><td>Россия</td><td>Не названа</td><td>Есть официальная русская версия сайта; п. 2.2/9.4 про sanctioned остаются</td></tr>
                  <tr><td>Беларусь</td><td>Не названа</td><td>Тот же санкционный пункт</td></tr>
                  <tr><td>Казахстан</td><td>Не назван</td><td>Отдельного ограничения не нашли</td></tr>
                  <tr><td>Украина</td><td>Не названа</td><td>НКЦПФР публикует предупреждение по spiceprop.com (см. риски)</td></tr>
                </tbody>
              </table>
            </div>
            <p data-russian-spice-access-explainer="unclear">
              «Не названа» ≠ «гарантированно пустят». Для резидента РФ, гражданина РФ за рубежом и для поездки в РФ
              однозначного правила на сайте нет: п. 2.2 смотрит на гражданство, резидентство и местонахождение сразу.
              Регистрацию и оплату из России мы не тестировали. До оплаты запросите письменный ответ поддержки.
              Обход через VPN или ложные данные — основание для закрытия счёта (п. 9.6); советов по обходу мы не даём.
            </p>
            <h3>Проверка личности (KYC)</h3>
            <p>
              По Q&A 891 и п. 9.3 условий: удостоверение личности и proof of address не старше 3 месяцев.
              Непрохождение KYC в течение 30 дней может приостановить счёт или отменить выплату.
            </p>
            <p className="ru-source-line">
              Источники:{' '}
              <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">подвал</a>,{' '}
              <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms §2.2, §9.3, §9.4, §9.6</a>,{' '}
              <a href={SOURCES.qa892} target="_blank" rel="nofollow noopener noreferrer">Q&A 892</a>,{' '}
              <a href={SOURCES.qa891} target="_blank" rel="nofollow noopener noreferrer">Q&A 891</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="programs">
          <div className="ru-shell">
            <h2>Программы и цены</h2>
            <p className="ru-muted">
              Лист-цены с сетки программ и кнопок «Get it for» / «Купить за» — {asOf(CHECKED)}, в евро; EN и RU совпадают.
              URL программ — новые слаги Tracker ({asOf(CHECKED)}); старые (/programs/sweet, /black, /chilli, /jalapeno-*) отдают 301.
            </p>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Программы Spice Prop">
              <table className="ru-table" data-russian-spice-product-count={PROGRAMS.length}>
                <caption className="sr-only">Программы Spice Prop: цели, лимиты, цены</caption>
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Цели / дневной / макс.</th>
                    <th>Дни</th>
                    <th>Плечо</th>
                    <th>Сплит / цикл</th>
                    <th>Цены (лист)</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.map(program => (
                    <tr key={program.key} data-russian-spice-product={program.key}>
                      <td>
                        <strong>
                          <a href={program.href} target="_blank" rel="nofollow noopener noreferrer">{program.name}</a>
                        </strong>
                      </td>
                      <td>{program.targets}; дневной {program.daily}; макс. {program.maxLoss}</td>
                      <td>{program.days}</td>
                      <td>{program.leverage}</td>
                      <td>{program.split} / {program.cycle}</td>
                      <td>{program.sizes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {officialCta('programs', 'Выбрать программу на сайте Spice Prop')}
          </div>
          <div className="ru-shell ru-content">
            <h3>Где условия на сайте расходятся</h3>
            <ul className="wp-block-list" data-russian-spice-conflicts={CHECKED}>
              <li>
                <strong>Плечо Instant / Instant Pro:</strong> сетка показывает 1:30, страницы программ и Q&A 900 — 1:33.
                Условия расходятся, уточните у поддержки.
              </li>
              <li>
                <strong>Возврат взноса 1-Step:</strong> блок общих правил на страницах программ говорит о возврате взноса
                с первой выплатой («Does not apply to Spice Instant (Pro)»), а Add-Ons T&C §4 и Q&A 912 — что у 1-Step
                возврата взноса нет. Условия расходятся, уточните у поддержки. Для 2-Step и 2-Step Pro возврат с первой
                выплатой согласован между источниками.
              </li>
              <li>
                <strong>Дневной лимит 1-Step на funded:</strong> сетка — 4,5%, страница 1-Step и общие правила — 4%.
                Условия расходятся, уточните у поддержки.
              </li>
              <li>
                <strong>Цены Instant:</strong> на странице программы в cost table ещё стоят €165 / €285 / €455 за €5K/€10K/€20K;
                сетка и кнопки «Get it for» — {eur(120)} / {eur(234)} / {eur(422)}. Мы печатаем значения сетки и кнопок.
              </li>
            </ul>
            <p>
              Страница /programs/unlimited («Spice Unlimited») жива, но не в навигации и не в сетке — в текущую линейку
              не включаем. Add-ons (+5% к сплиту, 150% refund, 8-дневный вывод, +4% к просадке) описаны на{' '}
              <a href={SOURCES.addons} target="_blank" rel="nofollow noopener noreferrer">terms-addons</a>; цены add-on
              на сайте не опубликованы (только в чекауте).
            </p>
            <p className="ru-source-line">
              Источники: сетка{' '}
              <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">spiceprop.com</a> /{' '}
              <a href={SOURCES.homeRu} target="_blank" rel="nofollow noopener noreferrer">/ru</a>, страницы программ,
              <a href={SOURCES.addons} target="_blank" rel="nofollow noopener noreferrer"> Add-Ons T&C</a>,{' '}
              <a href={SOURCES.qa900} target="_blank" rel="nofollow noopener noreferrer">Q&A 900</a>,{' '}
              <a href={SOURCES.qa912} target="_blank" rel="nofollow noopener noreferrer">Q&A 912</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="example">
          <div className="ru-shell ru-content" data-russian-spice-example="2-step-10k">
            <h2>Пример пути: Spice 2-Step €10K</h2>
            <p className="ru-muted">Пример, не прогноз. Цифры — лист-цены и правила {asOf(CHECKED)}.</p>
            <ul className="wp-block-list">
              <li>
                <strong>Взнос:</strong> {eur(99)} за счёт €10K (
                <a href={SOURCES.twoStep} target="_blank" rel="nofollow noopener noreferrer">страница 2-Step</a>
                ). Отдельной платы за активацию на 2-Step на сайте не указано.
              </li>
              <li>
                <strong>Этап 1:</strong> цель 7,5% = {eur(750)} (эквити €10 750). Дневной лимит 5,5% от стартового эквити дня
                = {eur(550)} на старте €10 000. Минимум 3 прибыльных дня.
              </li>
              <li>
                <strong>Этап 2:</strong> цель 5% = {eur(500)}. Дневной 4,5% = {eur(450)} на старте €10 000. Минимум 3 прибыльных дня.
              </li>
              <li>
                <strong>Общий лимит (статический, все стадии):</strong> 11% = {eur(1_100)} → пол эквити €8 900.
              </li>
              <li>
                <strong>Funded:</strong> дневной 4,5%, пол €8 900, цели нет. Заявка на выплату — после ≥14 активных дней,
                ≥4 прибыльных дней (≥+0,5% каждый), ≥{eur(100)} реализованной прибыли и завершённого KYC (Q&A 915).
              </li>
              <li>
                <strong>Первая выплата (пример):</strong> валовая прибыль {eur(600)} × 80% = {eur(480)}, плюс возврат взноса{' '}
                {eur(99)} с первой выплатой (для 2-Step согласован источниками) → {eur(579)} на кошелёк.
                С add-on +5% (сплит 85%): {eur(510)} + {eur(99)}; цена add-on на сайте не опубликована, поэтому чистая
                стоимость пути с опцией неизвестна. Следующая заявка — через 14 дней; условия сбрасываются после каждой заявки.
              </li>
              <li>
                <strong>Полная стоимость до funded:</strong> {eur(99)}. Отдельной цены «reset» для 2-Step на сайте нет —
                повтор = новая покупка €10K за {eur(99)}.
              </li>
            </ul>
            <p className="ru-source-line">
              Источники:{' '}
              <a href={SOURCES.twoStep} target="_blank" rel="nofollow noopener noreferrer">2-Step</a>,{' '}
              <a href={SOURCES.qa915} target="_blank" rel="nofollow noopener noreferrer">Q&A 915</a>,{' '}
              <a href={SOURCES.addons} target="_blank" rel="nofollow noopener noreferrer">Add-Ons §4</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="rules">
          <div className="ru-shell ru-content" data-russian-spice-rules={CHECKED}>
            <h2>Правила торговли</h2>
            <ul className="wp-block-list">
              <li>
                <strong>Новости, ночь, выходные:</strong> разрешены; нельзя хеджировать обе стороны и эксплуатировать
                задержку; 5-минутное окно без хеджа вокруг крупных новостей (Q&A 904).
              </li>
              <li>
                <strong>Советники (EA):</strong> разрешены; фирма может запросить исходный код (Q&A 897).
              </li>
              <li>
                <strong>Копирование:</strong> только Funded (master) → Challenge (slave); обратное и между разными людьми —
                нельзя (Q&A 897 и страницы программ).
              </li>
              <li>
                <strong>Сделки &lt; 3 минут:</strong> допустимы, пока их доля ≤ 5% всех транзакций; выше — правила SL/TP
                (Q&A 898, §4.2.2 условий).
              </li>
              <li>
                <strong>На funded запрещены:</strong> мартингейл/сетка, all-in, копирование вне правила выше, news hedging,
                latency, inactive trading (Q&A 920).
              </li>
              <li>
                <strong>Риск 2%:</strong> на одну идею — не больше 2% эквити на входе (Q&A 902, funded).
              </li>
              <li>
                <strong>Consistency (C-Score):</strong> если один день даёт больше 30% суммарной прибыли, выплату могут
                временно отложить (Q&A 917); для Вьетнама/Кореи — 25% (Annex A).
              </li>
              <li>
                <strong>Инструменты и плечо:</strong> FX/металлы/индексы до 1:100, крипто и акции 1:5 (Q&A 900); для Instant
                и 3-Step на страницах — 1:33 (см. конфликт с сеткой 1:30).
              </li>
              <li>
                <strong>Просадка:</strong> дневная — от стартового эквити дня; общая — «largest permitted decline… from the
                initial account balance» → статическая (Q&A 903). Сброс лимитов — 23:59:59 по CET.
              </li>
              <li>
                <strong>Неактивность:</strong> 30 дней без сделок — счёт закрывают (блок правил на страницах программ).
              </li>
            </ul>
            <p>
              Как устроены этапы оценки в целом — в{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">гиде по челленджам</Link>. Что такое{' '}
              <Link href="/ru/prop-trejding">проп-трейдинг</Link> и чем funded-счёт отличается от демо — в разделе{' '}
              <Link href="/ru/funded-account">funded account</Link>.
            </p>
            <p className="ru-source-line">
              Источники: Q&A{' '}
              <a href={SOURCES.qa904} target="_blank" rel="nofollow noopener noreferrer">904</a>,{' '}
              <a href={SOURCES.qa897} target="_blank" rel="nofollow noopener noreferrer">897</a>,{' '}
              <a href={SOURCES.qa898} target="_blank" rel="nofollow noopener noreferrer">898</a>,{' '}
              <a href={SOURCES.qa920} target="_blank" rel="nofollow noopener noreferrer">920</a>,{' '}
              <a href={SOURCES.qa902} target="_blank" rel="nofollow noopener noreferrer">902</a>,{' '}
              <a href={SOURCES.qa917} target="_blank" rel="nofollow noopener noreferrer">917</a>,{' '}
              <a href={SOURCES.qa900} target="_blank" rel="nofollow noopener noreferrer">900</a>,{' '}
              <a href={SOURCES.qa903} target="_blank" rel="nofollow noopener noreferrer">903</a>,{' '}
              <a href={SOURCES.qa919} target="_blank" rel="nofollow noopener noreferrer">919</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="payouts">
          <div className="ru-shell ru-content" data-russian-spice-payouts={CHECKED}>
            <h2>Выплаты</h2>
            <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Условия выплат Spice Prop">
              <table className="ru-table">
                <caption className="sr-only">Сплит, цикл и лимиты выплат Spice Prop</caption>
                <tbody>
                  <tr><th scope="row">Сплит</th><td>80% стандарт; 90% на 2-Step Pro; Instant Pro — 50% до первого +8%, затем 80%</td></tr>
                  <tr><th scope="row">Цикл</th><td>14 дней (7 на 2-Step Pro; 8 с Fast-Payout add-on)</td></tr>
                  <tr><th scope="row">Минимум</th><td>{eur(100)} реализованной прибыли (Q&A 915)</td></tr>
                  <tr><th scope="row">Максимум</th><td>на сайте не указан</td></tr>
                  <tr><th scope="row">Способ</th><td>криптокошелёк на имя трейдера; сети и монеты на сайте не указаны</td></tr>
                  <tr><th scope="row">Срок</th><td>обычно в пределах 24 рабочих часов после одобрения; ручная проверка обычно до 7 календарных дней</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Условия заявки (Q&A 915): счёт активен ≥14 дней (или 7/8 по исключениям выше), ≥4 прибыльных дня
              (≥+0,5% каждый), ≥{eur(100)} реализованной прибыли, KYC завершён. После любой заявки — одобренной или
              отклонённой — условия сбрасываются.
            </p>
            <div className="ru-notice" data-russian-spice-payout-risks="stage-checks">
              <strong>Что может пойти не так на выплате.</strong> Фирма проверяет KYC (ID + адрес ≤3 месяцев),
              запрещённые практики (§4.2.1 копирование, §4.2.2 короткие сделки), consistency 30%, IP/устройство
              (расхождение KYC и MT5 — признак fraud, Terms §6 / Annex A), VPN без одобрения (п. 9.6). Жалобу нужно
              подать в течение 2 дней (п. 11.9). Темы отказов у третьих лиц (мартингейл, копирование, сделки &lt;3 мин)
              встречаются в открытых обсуждениях октября 2026 — это данные третьих сторон, не наша проверка.
            </div>
            <p>
              Сравнить сроки и способы вывода с другими фирмами — в разделе{' '}
              <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
            </p>
            <p className="ru-source-line">
              Источники:{' '}
              <a href={SOURCES.qa913} target="_blank" rel="nofollow noopener noreferrer">Q&A 913</a>,{' '}
              <a href={SOURCES.qa915} target="_blank" rel="nofollow noopener noreferrer">Q&A 915</a>,{' '}
              <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms §4.2, §9.3, §9.6, §11.9</a> — {asOf(CHECKED)}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="platform">
          <div className="ru-shell ru-content" data-russian-spice-platform={CHECKED}>
            <h2>Платформа</h2>
            <p>
              Только MetaTrader 5: подвал сайта ({asOf(CHECKED)}) — «Download the MetaTrader trading platform or use the
              web terminal». Других платформ на проверенных страницах нет. Партнёрская программа есть: до 20% lifetime
              recurring (
              <a href={SOURCES.affiliate} target="_blank" rel="nofollow noopener noreferrer">/affiliate</a>
              ); тиры на сайте не раскрыты.
            </p>
          </div>
        </section>

        <section className="ru-section" id="reviews">
          <div className="ru-shell ru-content" data-russian-spice-trustpilot="unavailable">
            <h2>Отзывы о Spice Prop</h2>
            <p>
              Рейтинг Trustpilot на дату проверки в открытых источниках не прочитали: страница{' '}
              <a href={SOURCES.trustpilot} target="_blank" rel="nofollow noopener noreferrer">trustpilot.com/review/spiceprop.com</a>{' '}
              отвечает 403 на обычный запрос (проверка {ruDate(CHECKED)}). Цифры с чужих обзоров не переносим.
              Как читать отзывы о проп-фирмах — в разделе <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.
            </p>
          </div>
        </section>

        <section className="ru-section" id="risks">
          <div className="ru-shell ru-content" data-russian-spice-risks={CHECKED}>
            <h2>Риски и что проверить до оплаты</h2>
            <h3>Предупреждение регулятора Украины</h3>
            <p data-russian-spice-nssmc={NSSMC_STILL}>
              Регулятор Украины НКЦПФР внёс сайт spiceprop.com в свой список проектов с признаками сомнительности
              (решение №10/21/2485/К04 от {ruDate(NSSMC_ORDER)}; по состоянию на {ruDate(NSSMC_STILL)} запись на сайте
              НКЦПФР сохраняется). Формулировка «сомнительности» / «SCAM-проєктами» — регулятора, не наша.
              Для читателей в Украине это официальное предупреждение инвесторам. Источники:{' '}
              <a href={SOURCES.nssmcList} target="_blank" rel="nofollow noopener noreferrer">список НКЦПФР</a>,{' '}
              <a href={SOURCES.nssmcNews} target="_blank" rel="nofollow noopener noreferrer">анонс</a>.
            </p>
            <h3>Не финансовая организация</h3>
            <p>
              В подвале фирма пишет, что работает как marketing, promotional and educational services provider и
              «does not operate under the supervision of financial regulatory authorities» — не финансовое учреждение.
            </p>
            <h3>Условия, которые стоит прочитать до оплаты</h3>
            <ul className="wp-block-list">
              <li>п. 2.2 — eligibility и sanctioned countries;</li>
              <li>п. 11.3 — чешское право и суды Чехии;</li>
              <li>п. 11.9 — жалоба в течение 2 дней;</li>
              <li>п. 9.6 — VPN/VPS только с одобрения.</li>
            </ul>
            <p>
              Примеры закрытых проп-фирм и на что смотреть заранее — в разделе{' '}
              {closedHref ? <Link href={closedHref}>закрытые проп-фирмы</Link> : 'закрытые проп-фирмы'}.
            </p>
          </div>
        </section>

        <section className="ru-section" id="compare">
          <div className="ru-shell ru-content">
            <h2>Альтернативы для трейдеров из РФ</h2>
            <p data-russian-spice-alt-basis="not-in-restricted-list">
              Если важен именно список ограничений: у BrightFunded России нет в списке ограничений (на{' '}
              {ruNotListedDate('bright-funded')}), у Crypto Fund Trader для Match-Trader — тоже нет в списке ограничений
              (на {ruNotListedDate('crypto-fund-trader')}). Это не письменная гарантия доступа. Hash Hedge — ещё один
              крипто-проп со статусом «неясен»; его разбор — в <Link href="/ru/obzor-hash-hedge">обзоре Hash Hedge</Link>.
              Сводный взгляд на варианты — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
            </p>
            <div className="ru-grid" data-russian-spice-alternatives="bright-funded-first">
              <article className="ru-card" data-russian-spice-alternative="bright-funded">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>BrightFunded</h3>
                <p className="ru-muted">
                  MT5 / cTrader / DXTrade; сплит{' '}
                  {brightSplit != null ? `${brightSplit}%` : 'по программе'}; цикл{' '}
                  {brightFrequency ? frequencyRu[brightFrequency] ?? brightFrequency : 'по программе'}.
                </p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="bright-funded"
                    href="/go/bright-funded?from=ru-spice-prop-alternative-bright-funded"
                    rel={goLinkRel('bright-funded')}
                    className="btn-primary"
                  >
                    Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
              <article className="ru-card" data-russian-spice-alternative="crypto-fund-trader">
                <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Crypto Fund Trader</h3>
                <p className="ru-muted">Крипта и форекс на Match-Trader или MT5; оплата картой, PayPal или криптой.</p>
                <div className="ru-actions">
                  <Link href="/ru/obzor-crypto-fund-trader" className="btn-outline">Обзор</Link>
                  <RuGoLink
                    firm="crypto-fund-trader"
                    href="/go/crypto-fund-trader?from=ru-spice-prop-alternative-cft"
                    rel={goLinkRel('crypto-fund-trader')}
                    className="btn-primary"
                  >
                    Проверить CFT <ArrowRight size={14} aria-hidden="true" />
                  </RuGoLink>
                </div>
              </article>
            </div>
            <p>
              Все крипто-варианты в одной таблице — в{' '}
              <Link href="/ru/luchshie-kripto-prop-firmy">рейтинге крипто-проп фирм</Link>. Для русскоязычных трейдеров
              в разных странах — гид{' '}
              <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.
            </p>
            <div className="ru-grid" style={{ marginTop: '1.5rem' }}>
              <article className="ru-card">
                <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Плюсы</h3>
                <ul>
                  <li><strong>MT5</strong> и EA с оговоркой про исходный код.</li>
                  <li><strong>2-Step от {eur(45)}</strong>, возврат взноса с первой выплатой (согласован источниками).</li>
                  <li><strong>Новости / ночь / выходные</strong> разрешены (с окном без хеджа).</li>
                  <li><strong>Русская версия сайта</strong> и Q&A на русском (доступ из РФ неясен).</li>
                </ul>
              </article>
              <article className="ru-card">
                <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
                <h3>Минусы</h3>
                <ul>
                  <li><strong>Статус для РФ неясен</strong> из‑за п. 2.2/9.4 про sanctioned countries.</li>
                  <li><strong>Конфликты на сайте</strong> по плечу Instant, возврату 1-Step и дневному лимиту 1-Step funded.</li>
                  <li><strong>Сети выплат и max payout</strong> на сайте не указаны.</li>
                  <li><strong>НКЦПФР</strong> держит spiceprop.com в списке сомнительных проектов.</li>
                  <li><strong>Trustpilot</strong> на дату проверки не прочитали (403).</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell ru-content">
            <h2>Источники и дата проверки</h2>
            <p>Проверено {ruDate(CHECKED)} по официальным страницам Spice Prop и списку НКЦПФР.</p>
            <ul>
              <li>
                <a href={SOURCES.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a>{' '}
                (Effective Date {ruDate(TERMS_EFFECTIVE)}): §2.2, §4.2, §9.3–9.6, §11.3, §11.9 — {asOf(CHECKED)}.
              </li>
              <li>
                <a href={SOURCES.home} target="_blank" rel="nofollow noopener noreferrer">spiceprop.com</a> /{' '}
                <a href={SOURCES.homeRu} target="_blank" rel="nofollow noopener noreferrer">/ru</a>: сетка цен, подвал, юрлица — {asOf(CHECKED)}.
              </li>
              <li>
                Программы:{' '}
                <a href={SOURCES.twoStep} target="_blank" rel="nofollow noopener noreferrer">2-Step</a>,{' '}
                <a href={SOURCES.twoStepPro} target="_blank" rel="nofollow noopener noreferrer">2-Step Pro</a>,{' '}
                <a href={SOURCES.oneStep} target="_blank" rel="nofollow noopener noreferrer">1-Step</a>,{' '}
                <a href={SOURCES.threeStep} target="_blank" rel="nofollow noopener noreferrer">3-Step</a>,{' '}
                <a href={SOURCES.instant} target="_blank" rel="nofollow noopener noreferrer">Instant</a>,{' '}
                <a href={SOURCES.instantPro} target="_blank" rel="nofollow noopener noreferrer">Instant Pro</a> — {asOf(CHECKED)}.
              </li>
              <li>
                <a href={SOURCES.addons} target="_blank" rel="nofollow noopener noreferrer">Add-Ons T&C</a> — {asOf(CHECKED)}.
              </li>
              <li>
                Q&A 891–920 (в т.ч.{' '}
                <a href={SOURCES.qa898} target="_blank" rel="nofollow noopener noreferrer">898 на русском</a>) — {asOf(CHECKED)}.
              </li>
              <li>
                НКЦПФР:{' '}
                <a href={SOURCES.nssmcList} target="_blank" rel="nofollow noopener noreferrer">список</a>,{' '}
                <a href={SOURCES.nssmcNews} target="_blank" rel="nofollow noopener noreferrer">анонс</a> — запись на {ruDate(NSSMC_STILL)}.
              </li>
            </ul>
            <p>
              Открытые пробелы (на сайте не указано / в открытых источниках не нашли {asOf(CHECKED)}): номера регистрации
              и год основания; криптосети выплат и максимальная выплата; цены add-on; рейтинг Trustpilot.
            </p>
            <p>Мы не регистрировались, не оплачивали челлендж и не получали выплату от Spice Prop.</p>
            <div className="ru-notice" data-russian-risk-disclaimer="spice-prop-review">
              <strong>Риск.</strong> Торговля с плечом связана с высоким риском. Большинство участников не проходит оценку,
              взнос после активации обычно не возвращается. Счета на этапах оценки — симулированные; вознаграждение
              выплачивается по правилам фирмы, это не инвестиция и не гарантированный доход.
            </div>
            {officialCta('final', 'Перейти на сайт Spice Prop')}
          </div>
        </section>

        <section className="ru-section" id="faq">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы о Spice Prop</h2>
            <RussianFaq items={faqs} />
          </div>
        </section>

        <RuRelatedBlock path={PATH} />
      </article>
    </>
  )
}
