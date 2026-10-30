import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { ArrowRight, BookOpen, CheckCircle2, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RuPendingLink from '@/components/RuPendingLink'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import Breadcrumbs from '@/components/Breadcrumbs'
import RuMobileStickyCTA from '@/components/RuMobileStickyCTA'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { russianRouteDateModified } from '@/lib/localizedRoutes'
import { getRulesPageModel, rulesLanguageAlternates } from '@/lib/rulesPages'
import fpAccessEvidence from '@/content/data/russian-fundingpips-access-evidence.json'
import cryptoEvidence from '@/content/data/crypto-market-evidence.json'

const PATH = '/ru/fundingpips-pravila'
const TITLE = 'Правила FundingPips на русском 2026: лимиты, дни и выплаты'
const DESCRIPTION = 'Правила FundingPips на русском: 1 Step Flex, 2 Step Flex, Pro, Standard и Zero — цели, лимиты убытка, минимум дней, новости, советники и выплаты.'

// Rules re-read by Prop Firm Tracker on 23.10.2026, 11:09–11:16 Riga (US IP, public Zendesk API):
// /workspace/ru-data/2026-10-23-fundingpips-rules-capture.md, raw files /workspace/tradersfundhub/evidence/fundingpips-rules-2026-10-23/.
// Help text of 1SF, 2SF, 2SS, Pro, Zero and News is identical to the 21.10 overnight capture
// (/workspace/tradersfundhub/evidence/fundingpips-overnight-2026-10-21/). Product numbers (targets, limits, days, prices)
// come from content/data/challenges/fundingpips.json and carry their own sourceCapturedAt.
const RULES_CHECKED = '23.10.2026'
// News Trading & Weekend Holding article 34504137479441: page updated 08.10.2026, re-read 21.10 and 23.10.
const NEWS_UPDATED = '08.10.2026'
// Reward Methods article (page edited 28.09.2026), recaptured by Prop Firm Tracker 20.10 (4a230e1) and re-read 23.10.
const REWARD_METHODS_CHECKED = '20.10.2026'
// Get Started payment methods and HELLO (Prop Firm Tracker 20.10, /workspace/ru-data/2026-10-20-fundingpips-checkout-rules.md).
const CHECKOUT_CHECKED = '20.10.2026'
// Alternatives: BrightFunded country lists re-read 20.10 (see /ru/fundingpips-vs-bright-funded); CFT Match-Trader access 14.10.
const BF_ACCESS_CHECKED = '20.10.2026'
const CFT_ACCESS_CHECKED = '14.10.2026'

// Russia access: the line below reads russian-fundingpips-access-evidence.json (Prop Firm Tracker recapture 23.10, valid to
// 22.11, on main) and the badge reads firms.json russiaStatus ('unclear') via russiaStatusFor(). Re-checked 27.10: Tracker's
// 26.10 Get Started fetch has the same updated_at (2026-09-24), so the 23.10 evidence still applies.
const FP_HELP_UPDATED = fpAccessEvidence.sourceUpdatedAt.split('-').reverse().join('.')
const FP_ACCESS_CHECKED = fpAccessEvidence.sourceCapturedAt.split('-').reverse().join('.')
const FP_TERMS_EFFECTIVE = fpAccessEvidence.termsEffective.split('-').reverse().join('.')

const fpCrypto = (cryptoEvidence.ranked as Array<{ firmSlug: string; sourceCapturedAt?: string }>).find(firm => firm.firmSlug === 'fundingpips')
const CRYPTO_CHECKED = fpCrypto?.sourceCapturedAt ? fpCrypto.sourceCapturedAt.split('-').reverse().join('.') : null

const SRC = {
  getStarted: 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started',
  oneStepFlex: 'https://help.fundingpips.com/hc/en-us/articles/34501697434385-1-Step-Flex',
  twoStepFlex: 'https://help.fundingpips.com/hc/en-us/articles/47835196271249-2-Step-Flex',
  twoStepPro: 'https://help.fundingpips.com/hc/en-us/articles/34502027344017-2-Step-Pro-Model',
  twoStepStandard: 'https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard',
  zero: 'https://help.fundingpips.com/hc/en-us/articles/34502157694865-FundingPips-Zero',
  news: 'https://help.fundingpips.com/hc/en-us/articles/34504137479441-News-Trading-Weekend-Holding',
  conduct: 'https://help.fundingpips.com/hc/en-us/articles/34505029138449-Trading-Conduct-and-Security-Standards',
  prime: 'https://help.fundingpips.com/hc/en-us/articles/34447308895889',
  compare: 'https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models',
  rewardMethods: 'https://help.fundingpips.com/hc/en-us/articles/34504564970385-Reward-Methods',
  terms: 'https://fundingpips.com/terms-and-conditions',
}

const PRODUCT_ORDER = ['1-step-flex', '2-step-flex', '2-step-pro', '2-step-standard', 'zero'] as const
type ProductSlug = (typeof PRODUCT_ORDER)[number]
const PRODUCT_SOURCE: Record<ProductSlug, string> = {
  '1-step-flex': SRC.oneStepFlex,
  '2-step-flex': SRC.twoStepFlex,
  '2-step-pro': SRC.twoStepPro,
  '2-step-standard': SRC.twoStepStandard,
  zero: SRC.zero,
}

export const revalidate = 3600

// Rules gate (lib/rulesPages.ts, same as the template twins): indexable only with complete, unflagged
// FundingPips data and content/verdicts/rules/fundingpips.ru.md; hreflang only when the EN rules page is
// indexable too. Until then: noindex, follow, out of the sitemap, no hreflang.
const rulesGate = getRulesPageModel('fundingpips')?.ru ?? null
const RULES_INDEXABLE = rulesGate?.indexable === true
const RULES_LANGUAGES = RULES_INDEXABLE ? rulesLanguageAlternates(PATH) : undefined

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, ...(RULES_LANGUAGES ? { languages: RULES_LANGUAGES } : {}) },
  robots: RULES_INDEXABLE ? undefined : { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

function ruDate(iso: string | null | undefined) {
  return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : 'дата не указана'
}

function validCaptureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function freshProduct(product: Challenge) {
  return validCaptureDate(product.sourceCapturedAt) && isChallengeFresh(product)
}

function validNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value < 0 || value > 100 ? 'нет данных' : `${String(value).replace('.', ',')}%`
}

function usd(value: number) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function targetLabel(product: Challenge) {
  if (product.phases === 0) return 'нет оценки'
  return Array.from({ length: product.phases }, (_, index) => percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function drawdownLabel(product: Challenge) {
  return ({ static: 'статический', trailing: 'подвижный', 'eod-trailing': 'подвижный по итогам дня', 'balance-based': 'по балансу' } as Record<string, string>)[product.drawdownType ?? ''] ?? 'тип не опубликован'
}

function daysLabel(product: Challenge) {
  if (product.productSlug === '2-step-pro' && product.minTradingDays === 0) return 'нет (новые и сброшенные счета; купленные до 26.08.2026 — 1)'
  if (product.productSlug === '2-step-flex' && product.minTradingDays === 1) return '1 день (маршрут 80%) или 3 прибыльных дня (маршрут 95%)'
  if (product.productSlug === '2-step-standard' && product.minTradingDays === 3) return '3 дня; 0 в конфигурации с дневным лимитом 3%'
  if (product.productSlug === 'zero') return 'оценки нет; 7 прибыльных дней от 0,25% в каждом скользящем окне 30 дней'
  return minimumTradingDaysLabel(product.minTradingDays ?? null, 'ru')
}

function dailyLabel(product: Challenge) {
  if (product.productSlug === '1-step-flex') return `${percent(product.dailyLossPct)} (есть конфигурация 2%)`
  if (product.productSlug === '2-step-standard') return `${percent(product.dailyLossPct)} (или 3% в другой конфигурации)`
  return percent(product.dailyLossPct)
}

function rewardLabel(slug: ProductSlug) {
  return ({
    '1-step-flex': 'раз в две недели 80%; 100% по запросу на Master после выполнения условий',
    '2-step-flex': 'раз в две недели 80% или 95% (выбор при покупке); 100% по запросу на Master после выполнения условий',
    '2-step-pro': 'еженедельно 80%; 100% по запросу на Master после выполнения условий',
    '2-step-standard': 'еженедельно 60%, раз в две недели 80% или по запросу 100% (цикл выбирается при переходе на Master-счёт)',
    zero: 'раз в две недели 95%',
  } as Record<ProductSlug, string>)[slug]
}

function consistencyLabel(product: Challenge) {
  if (product.productSlug === 'zero') return `${percent(product.consistencyRulePct)} для любой выплаты`
  const onDemand = product.consistencyRules?.find(rule => /on-?demand/i.test(rule.appliesTo ?? ''))
  return onDemand ? `${percent(onDemand.percent)} только для выплаты 100% по запросу` : 'нет данных'
}

function weekendLabel(slug: ProductSlug) {
  return slug === 'zero'
    ? 'позиция на выходных — немедленное закрытие счёта; опции Swing нет'
    : 'оценка: можно; Master: только с опцией Swing (+10%)'
}

function newsLabel(slug: ProductSlug) {
  return slug === 'zero'
    ? 'окно ±10 минут — грубое нарушение, счёт закрывают'
    : 'оценка: держать можно, умышленная торговля новостей — закрытие; Master: прибыль в окне ±5 минут вычитается'
}

function priceRange(product: Challenge) {
  const values = product.accountSizes.map(tier => tier.priceUsd).filter(validNumber).sort((a, b) => a - b)
  if (!values.length) return 'не опубликована'
  return values[0] === values.at(-1) ? usd(values[0]) : `${usd(values[0])}–${usd(values.at(-1)!)}`
}

function sizesLabel(product: Challenge) {
  return product.accountSizes.map(tier => `$${tier.sizeUsd / 1000}K`).join(', ')
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export default function RussianFundingPipsRulesPage() {
  const fpFirm = getAllFirms().find(firm => firm.name === 'FundingPips')
  const fpStatus = russiaStatusFor('fundingpips')
  const allProducts = getChallengesByFirm('fundingpips')
  const products = PRODUCT_ORDER
    .map(slug => allProducts.find(product => product.productSlug === slug))
    .filter((product): product is Challenge => Boolean(product) && freshProduct(product!))
  const bySlug = (slug: ProductSlug) => products.find(product => product.productSlug === slug)
  const allFresh = products.length === PRODUCT_ORDER.length
  const one = bySlug('1-step-flex')
  const flex = bySlug('2-step-flex')
  const pro = bySlug('2-step-pro')
  const standard = bySlug('2-step-standard')
  const zero = bySlug('zero')
  const captureDates = products.map(product => product.sourceCapturedAt).filter(validCaptureDate).sort()
  const oldestCapture = captureDates.at(0) ?? null
  const articleDateModified = russianRouteDateModified(PATH, oldestCapture)
  const closedHref = ruClosedFirmsHref()
  const tierCount = products.flatMap(product => product.accountSizes).length

  // Worked example: 2 Step Standard $10K, every figure from challenges/fundingpips.json.
  const exampleSize = 10000
  const exampleTier = standard?.accountSizes.find(tier => tier.sizeUsd === exampleSize)
  const example = standard && exampleTier && validNumber(exampleTier.priceUsd)
    && validNumber(standard.profitTargets?.phase1) && validNumber(standard.profitTargets?.phase2)
    && validNumber(standard.dailyLossPct) && validNumber(standard.maxLossPct)
    ? {
        fee: exampleTier.priceUsd,
        feeHello: Math.round(exampleTier.priceUsd * 0.8 * 100) / 100,
        phase1: (exampleSize * standard.profitTargets!.phase1!) / 100,
        phase2: (exampleSize * standard.profitTargets!.phase2!) / 100,
        daily: (exampleSize * standard.dailyLossPct!) / 100,
        floor: exampleSize - (exampleSize * standard.maxLossPct!) / 100,
        days: standard.minTradingDays,
      }
    : null

  const faqs: RussianFaqItem[] = [
    {
      q: 'Есть ли у FundingPips минимальное количество торговых дней?',
      a: `Зависит от программы. ${products.map(product => `${product.productName}: ${daysLabel(product)}`).join('; ')}. Максимального срока нет, но 30 дней без сделок — нарушение (данные на ${ruDate(oldestCapture)}, правила перепроверены ${RULES_CHECKED}).`,
    },
    {
      q: 'Можно ли торговать на новостях в FundingPips?',
      a: `Держать позиции через новости на оценке можно, но умышленная торговля на новостях закрывает счёт на любом этапе. На Master прибыль сделок в окне ±5 минут вокруг важной новости вычитается, если сделка открыта меньше чем за 5 часов до события. На Zero окно ±10 минут — грубое нарушение (статья обновлена ${NEWS_UPDATED}, перепроверено ${RULES_CHECKED}).`,
    },
    {
      q: 'Можно ли держать сделки через ночь и выходные?',
      a: `На оценке — да. На Master без опции Swing (+10% при покупке) позиции закрываются автоматически каждый день, это не нарушение. На Zero позиция на выходных закрывает счёт немедленно (по данным на ${RULES_CHECKED}).`,
    },
    {
      q: 'Как работает выплата 100% по запросу (On Demand)?',
      a: `Нужны правило стабильности 35% и 7 прибыльных дней от 0,5% размера Master-счёта; убыток от 1% счёта на одну торговую идею — предупреждение, четвёртое закрывает счёт. У 2 Step Standard цикл выбирают при переходе на Master-счёт; у остальных оценочных программ выплату 100% по запросу запрашивают на Master; на Zero её нет (по данным на ${RULES_CHECKED}).`,
    },
    {
      q: 'Работает ли FundingPips в России?',
      a: `Неясно. Справка (обновлена ${FP_HELP_UPDATED}) называет Иран, Вьетнам и ОАЭ, условия (действуют с ${FP_TERMS_EFFECTIVE}) — страны из санкционных списков FATF и ЕС/ООН; Россию фирма не называет (проверено ${FP_ACCESS_CHECKED}). До оплаты получите письменный ответ поддержки; VPN правила запрещают.`,
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Обзор FundingPips', url: '/ru/obzor-fundingpips' },
    { name: 'Правила FundingPips' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-10-28',
    dateModified: articleDateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      <RuMobileStickyCTA firms={['bright-funded', 'fundingpips']} from="ru-rules-fundingpips-mobile-sticky" />
      {allFresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-fundingpips-rules-page="all-products" data-russian-rules-editorial-date={articleDateModified}>
          <RussianDataFreshnessNotice firmSlugs={['fundingpips']} />
          <div className="ru-eyebrow"><BookOpen size={14} aria-hidden="true" /> Правила · перепроверено {RULES_CHECKED}</div>
          <h1>Правила FundingPips на русском: все программы 2026</h1>
          <p className="ru-lead">
            Правила FundingPips (Funding Pips, «Фандинг Пипс») сильно различаются по программам: где-то нет минимума дней, где-то позиции на
            Master закрываются каждый вечер, а на Zero одна сделка в новостное окно закрывает счёт. Ниже — все пять программ по официальной
            справке, с датами, расчётом в долларах и местами, где источники фирмы расходятся. Цены и промокод — в материале{' '}
            <Link href="/ru/obzor-fundingpips">FundingPips отзывы и обзор</Link>.
          </p>
          <div className="ru-notice" data-russian-access-answer="first-screen" data-russian-fundingpips-access-status={fpStatus}>
            <strong>Доступ из России: <RuAccessBadge firm="fundingpips" /></strong>{' '}
            Россия не названа ни в справке (обновлена {FP_HELP_UPDATED}: Иран, Вьетнам, ОАЭ), ни в условиях (с {FP_TERMS_EFFECTIVE}: санкционные
            списки FATF и ЕС/ООН). Относится ли это к России, фирма не пишет; мы это не толкуем (проверено {FP_ACCESS_CHECKED}).{' '}
            <Link href="#dostup">Подробнее</Link>. Источники:{' '}
            <SourceLink href={SRC.getStarted}>Get Started</SourceLink>, <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия FundingPips</a>.
          </div>
          <p className="ru-source-line">Автор: редакция Traders Fund Hub · Редакционная проверка: {ruDate(articleDateModified)}. Правила перепроверены по справке {RULES_CHECKED}; даты данных — в таблице.</p>
          <div className="ru-actions" data-russian-rules-cta="bright-funded-first">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-rules-fundingpips-hero" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">
              Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">альтернатива: Россия не названа в её списках ограничений (по данным на {BF_ACCESS_CHECKED})</span>
          </div>
          <div className="ru-actions">
            <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-rules-fundingpips" rel={goLinkRel('fundingpips')} className="btn-outline">
              Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">статус для резидентов РФ неясен; резидентам ОАЭ недоступно</span>
          </div>
          <nav className="ru-review-toc" aria-label="Содержание">
            <Link href="#korotko">Коротко</Link> · <Link href="#tablica">Таблица</Link> · <Link href="#programmy">Программы</Link> · <Link href="#novosti">Новости</Link> · <Link href="#perenos">Перенос</Link> · <Link href="#sovetniki">Советники</Link> · <Link href="#vyplaty">Выплаты</Link> · <Link href="#primer">Пример</Link> · <Link href="#oshibki">Ошибки</Link> · <Link href="#alternativy">Альтернативы</Link> · <Link href="#sources">Источники</Link>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="rules-not-access">
            <strong>Русский язык страницы не означает доступ.</strong>{' '}
            Решают место проживания, проверка личности, способы оплаты и выплаты. VPN, чужие документы и неверный адрес не используйте.
          </div>
          <p className="ru-source-line">У FundingPips и BrightFunded с нами партнёрские программы: после регистрации по ссылкам мы можем получить комиссию. На правила и оценку доступа это не влияет.</p>
        </div>
      </section>

      <section className="ru-section" id="korotko">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-rules-summary="short">
          <h2>Коротко: 5 программ и главное в каждой</h2>
          <ul>
            <li><strong>1 Step Flex</strong> — один этап, без минимума дней, общий лимит статический.</li>
            <li><strong>2 Step Flex</strong> — два этапа, широкий общий лимит, доля 80% или 95% на выбор.</li>
            <li><strong>2 Step Pro</strong> — низкие цели и узкие лимиты; для новых счетов без минимума дней.</li>
            <li><strong>2 Step Standard</strong> — три маршрута выплат; возврат взноса по справке, но не по условиям.</li>
            <li><strong>Zero</strong> — сразу Master; самые жёсткие правила по новостям и выходным.</li>
            <li><strong>Для всех:</strong> 30 дней без сделок — нарушение, максимального срока нет (<SourceLink href={SRC.compare}>Compare Account Models</SourceLink>, {RULES_CHECKED}).</li>
          </ul>
        </div>
      </section>
      <RuTelegramBlock placement="fundingpips-pravila" />

      <section className="ru-section" id="tablica">
        <div className="ru-shell">
          <h2>Сводная таблица правил FundingPips</h2>
          <p className="ru-muted">Цифры — из датированных записей по программам; данные старше 30 дней скрываются. Цены — список справки в USD, без акций.</p>
          {!allFresh && <p className="ru-notice" data-russian-rules-evidence-status="recapture-required">Данные части программ требуют повторной проверки и временно скрыты.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Правила FundingPips по программам">
            <table className="ru-table" data-russian-fundingpips-rules-table="all-products" data-russian-fundingpips-rules-product-count={products.length}>
              <thead><tr><th>Параметр</th>{products.map(product => <th key={product.productSlug}>{product.productName}</th>)}</tr></thead>
              <tbody>
                <tr><td><strong>Этапы и цели</strong></td>{products.map(p => <td key={p.productSlug}>{p.phases === 0 ? 'оценки нет' : `${p.phases}: ${targetLabel(p)}`}</td>)}</tr>
                <tr><td><strong>Дневной лимит</strong></td>{products.map(p => <td key={p.productSlug}>{dailyLabel(p)}</td>)}</tr>
                <tr><td><strong>Общий лимит</strong></td>{products.map(p => <td key={p.productSlug}>{percent(p.maxLossPct)}, {drawdownLabel(p)}</td>)}</tr>
                <tr><td><strong>Минимум дней</strong></td>{products.map(p => <td key={p.productSlug}>{daysLabel(p)}</td>)}</tr>
                <tr><td><strong>Доля и цикл</strong></td>{products.map(p => <td key={p.productSlug}>{rewardLabel(p.productSlug as ProductSlug)}</td>)}</tr>
                <tr><td><strong>Правило стабильности</strong></td>{products.map(p => <td key={p.productSlug}>{consistencyLabel(p)}</td>)}</tr>
                <tr><td><strong>Новости</strong></td>{products.map(p => <td key={p.productSlug}>{newsLabel(p.productSlug as ProductSlug)}</td>)}</tr>
                <tr><td><strong>Ночь и выходные</strong></td>{products.map(p => <td key={p.productSlug}>{weekendLabel(p.productSlug as ProductSlug)}</td>)}</tr>
                <tr><td><strong>Размеры и взнос</strong></td>{products.map(p => <td key={p.productSlug}>{sizesLabel(p)}; {priceRange(p)}</td>)}</tr>
                <tr><td><strong>Возврат взноса</strong></td>{products.map(p => <td key={p.productSlug}>{p.productSlug === '2-step-standard' ? 'справка: с 4-й выплатой; условия: платежи окончательны' : 'нет'}</td>)}</tr>
                <tr><td><strong>Источник и дата данных</strong></td>{products.map(p => <td key={p.productSlug}><SourceLink href={PRODUCT_SOURCE[p.productSlug as ProductSlug] ?? p.sourceUrl}>{ruDate(p.sourceCapturedAt)}</SourceLink></td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Правила всех программ перепроверены по справке {RULES_CHECKED} (без изменений с 20–21.10.2026); новости и перенос — статья{' '}
            <SourceLink href={SRC.news}>News Trading & Weekend Holding</SourceLink> (обновлена {NEWS_UPDATED}); опция Swing +10% — FAQ той же статьи.
            В таблице {tierCount} вариантов размера счёта; самый маленький — $5K. Размер $2,5K не указан на официальных страницах на 23.10.2026.
          </p>
        </div>
      </section>

      <section className="ru-section" id="programmy">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-rules-products="five">
          <h2>Правила каждой программы</h2>

          {one && <article id="1-step-flex" data-russian-fundingpips-rules-product="1-step-flex">
            <h3>1 Step Flex</h3>
            <p>
              Один этап с целью {targetLabel(one)}. Дневной лимит {percent(one.dailyLossPct)}, но справка и условия (п. 8) называют и конфигурацию
              с 2% — «в зависимости от купленной конфигурации». Разницу в цене не указываем: проверена только касса из США. Общий лимит
              {' '}{percent(one.maxLossPct)}, {drawdownLabel(one)}: от стартового размера счёта. Минимума дней и срока прохождения нет.
            </p>
            <p>
              Выплаты: 80% раз в две недели — единственный цикл на кассе; 100% по запросу — на Master при стабильности 35% и 7 прибыльных днях
              от 0,5%, оба счётчика сбрасываются после выплаты.
            </p>
            <p className="ru-source-line">Источник: <SourceLink href={SRC.oneStepFlex}>справка 1 Step Flex</SourceLink> (данные на {ruDate(one.sourceCapturedAt)}, перепроверено {RULES_CHECKED}); <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия, п. 8</a>.</p>
          </article>}

          {flex && <article id="2-step-flex" data-russian-fundingpips-rules-product="2-step-flex">
            <h3>2 Step Flex</h3>
            <p>
              Цели {targetLabel(flex)}, дневной лимит {percent(flex.dailyLossPct)}, общий {percent(flex.maxLossPct)} ({drawdownLabel(flex)}). Долю выбирают при
              покупке: 80% при минимуме в 1 торговый день или 95% при 3 прибыльных днях — и на оценке, и на Master; счётчик трёх дней сбрасывается
              после каждой выплаты. Цена у обоих вариантов одинаковая (статья о программе, касса доплату не показывает), хотя таблица Compare
              подписывает 95% как «add-on» — источники расходятся. Выплата 100% по запросу — на Master после выполнения условий.
            </p>
            <p data-russian-fundingpips-conflict="2sf-phase2-target">
              <strong>Расхождение:</strong> условия FundingPips (действуют с {FP_TERMS_EFFECTIVE}, п. 8) всё ещё называют цель второго этапа 6%, а
              статья справки и касса — {percent(flex.profitTargets?.phase2)}. Условия старше; в таблице — значение справки.
            </p>
            <p className="ru-source-line">Источник: <SourceLink href={SRC.twoStepFlex}>справка 2 Step Flex</SourceLink> (данные на {ruDate(flex.sourceCapturedAt)}, перепроверено {RULES_CHECKED}); <SourceLink href={SRC.compare}>Compare Account Models</SourceLink>.</p>
          </article>}

          {pro && <article id="2-step-pro" data-russian-fundingpips-rules-product="2-step-pro">
            <h3>2 Step Pro</h3>
            <p>
              Цели {targetLabel(pro)} — самые низкие среди двухэтапных, зато лимиты узкие: дневной {percent(pro.dailyLossPct)}, общий {percent(pro.maxLossPct)}
              ({drawdownLabel(pro)}). Минимум дней: {daysLabel(pro)}. Выплаты еженедельно по 80%, минимальный запрос — 1% размера счёта; 100% по
              запросу — на Master после выполнения условий.
            </p>
            <p className="ru-source-line">Источник: <SourceLink href={SRC.twoStepPro}>справка 2 Step Pro</SourceLink> (данные на {ruDate(pro.sourceCapturedAt)}, перепроверено {RULES_CHECKED}).</p>
          </article>}

          {standard && <article id="2-step-standard" data-russian-fundingpips-rules-product="2-step-standard">
            <h3>2 Step Standard</h3>
            <p>
              Цели {targetLabel(standard)}, дневной лимит {percent(standard.dailyLossPct)}, общий {percent(standard.maxLossPct)} ({drawdownLabel(standard)}), минимум
              {' '}{standard.minTradingDays} торговых дня на первом этапе. В конфигурации с дневным лимитом 3% минимума дней на первом этапе нет (цену
              не указываем — проверена только касса из США). Дневной лимит считается от большего из баланса и средств на начало дня.
            </p>
            <p>
              Выплаты: еженедельно 60%, раз в две недели 80% или по запросу 100% — цикл выбирается при переходе на Master-счёт. Правило стабильности 35% действует
              только для маршрута 100%.
            </p>
            <p data-russian-fundingpips-refund-conflict="help-vs-terms">
              <strong>Возврат взноса — источники расходятся.</strong> Справка (Get Started и Reward Methods): взнос возвращают с четвёртой выплатой на Master 2 Step Standard;
              на 1 Step Flex, 2 Step Flex, 2 Step Pro и Zero это не распространяется. Условия: платежи окончательны, регистрационный взнос не возвращается. Не рассчитывайте
              на возврат без письменного ответа поддержки.
            </p>
            <p className="ru-source-line">Источники: <SourceLink href={SRC.twoStepStandard}>справка 2 Step Standard</SourceLink> (данные на {ruDate(standard.sourceCapturedAt)}, перепроверено {RULES_CHECKED}); <SourceLink href={SRC.getStarted}>Get Started</SourceLink>; <SourceLink href={SRC.rewardMethods}>Reward Methods</SourceLink>; <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия</a>.</p>
          </article>}

          {zero && <article id="zero" data-russian-fundingpips-rules-product="zero">
            <h3>FundingPips Zero (без оценки)</h3>
            <p>
              Торговля сразу на Master. Дневной лимит {percent(zero.dailyLossPct)} от большего из баланса и средств на начало дня. Общий лимит
              {' '}{percent(zero.maxLossPct)}, {drawdownLabel(zero)}. Справка формулирует так: «Trails the highest recorded equity. Locks at breakeven once 5% in
              profit» и ниже — «Once equity reaches 5% above the initial account size, the limit stops moving and locks at the initial account size».
              Пример из справки: счёт $100K, пик $102K — граница
              $97 000. Ещё одно ограничение — открытый убыток не больше 1% стартового размера в любой момент.
            </p>
            <p>
              Доля {percent(zero.profitSplitPct)} раз в две недели. Для выплаты нужны правило стабильности {percent(zero.consistencyRulePct)} (самый прибыльный день не больше
              15% общей прибыли) и 7 прибыльных дней от 0,25% в каждом скользящем окне 30 дней. Торговля в окне ±10 минут вокруг важной новости —
              грубое нарушение. О выходных справка пишет: «Can I hold positions over the weekend on FundingPips Zero? No. All positions on
              FundingPips Zero must be closed before Friday market close, regardless of instrument. Leaving any position open into the weekend is a
              hard breach and the account is closed immediately». Опции Swing у Zero нет.
            </p>
            <p data-russian-fundingpips-conflict="zero-reset">
              <strong>Сброс после нарушения — источники расходятся:</strong> в одном месте справки — скидка 20% на сброс (в течение 7 дней после
              нарушения), в FAQ той же статьи — 7%. Размер скидки мы не указываем.
            </p>
            <p className="ru-source-line">Источник: <SourceLink href={SRC.zero}>справка FundingPips Zero</SourceLink> (данные на {ruDate(zero.sourceCapturedAt)}, перепроверено {RULES_CHECKED}). Другие счета без оценки — в подборке <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирм без челленджа</Link>.</p>
          </article>}
          {!products.length && <p className="ru-notice">Нет программ с актуальной проверкой. Правила по программам временно скрыты.</p>}
        </div>
      </section>

      <section className="ru-section" id="novosti">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-news-rule="eval-hold-master-deduct">
          <h2>Правила для всех программ: новости</h2>
          <p>
            <strong>1 Step Flex, 2 Step Flex, 2 Step Standard, 2 Step Pro.</strong> На оценке держать сделки через новости можно. Но справка прямо
            пишет: «Purposely trading news in both evaluation and master phase is prohibited and will lead to account closure». На Master действует
            мягкое нарушение: прибыль сделок,
            открытых или закрытых за 5 минут до и 5 минут после важной новости по затронутой валюте, вычитается целиком. Для выступлений окно — от 5
            минут до начала до 5 минут после окончания. Сделки, открытые за 5 часов и раньше, правило не затрагивает. Если вычет прибыли доводит счёт
            до дневного или общего лимита, это нарушение. Список событий — экономический календарь в кабинете FundingPips.
          </p>
          <div className="ru-notice" data-russian-fundingpips-news-example="nfp-4h-6h">
            <strong>Пример (Master, не прогноз).</strong> Отчёт NFP (занятость в США) в 15:30 по Риге. Сделку по EURUSD открыли в 11:30 — за 4 часа — и
            закрыли в 15:33: вся её прибыль вычитается. Такую же сделку открыли в 09:30 — за 6 часов — и закрыли в 15:33: прибыль засчитывается. Сделка по
            AUDJPY в то же время не затронута: ограничение касается только валюты новости.
          </div>
          <p>
            <strong>Zero.</strong> Открывать, закрывать и держать позицию за 10 минут до и 10 минут после важной новости нельзя; для выступлений — от 10
            минут до начала до 10 минут после окончания. Нарушение закрывает счёт.
          </p>
          <p className="ru-source-line">Источник: <SourceLink href={SRC.news}>News Trading & Weekend Holding</SourceLink> (обновлена {NEWS_UPDATED}, текст совпадает 21.10 и {RULES_CHECKED}). Время NFP в примере условное.</p>
        </div>
      </section>

      <section className="ru-section" id="perenos">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-holding="eval-master-zero">
          <h2>Перенос через ночь и выходные, опция Swing</h2>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Перенос позиций в FundingPips">
            <table className="ru-table" data-russian-fundingpips-holding-table="three-cases">
              <thead><tr><th>Счёт</th><th>Через ночь (будни)</th><th>Через выходные</th></tr></thead>
              <tbody>
                <tr><td><strong>Оценка: 1 Step Flex, 2 Step Flex, 2 Step Standard, 2 Step Pro</strong></td><td>можно</td><td>можно</td></tr>
                <tr><td><strong>Master тех же программ без Swing</strong></td><td>система закрывает позиции каждый день: 20:45–21:00 UTC (летнее время, с первого воскресенья марта), 21:45–22:00 UTC (зимнее, с первого воскресенья ноября)</td><td>нельзя: позиции закрываются автоматически</td></tr>
                <tr><td><strong>Master со Swing</strong></td><td>можно</td><td>можно</td></tr>
                <tr><td><strong>Zero</strong></td><td>в будни справка ограничений не называет (Swap-Free — только MT5)</td><td>немедленное закрытие счёта</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Автоматическое закрытие на Master — не нарушение. Сделка через ночь в будни идёт в минимум дней, прибыльные дни и стабильность.
            Сделка через выходные торговым днём не считается, но её самый прибыльный и самый убыточный день входят в расчёт стабильности. Гэп в
            понедельник, пробивший общий лимит, — нарушение.
          </p>
          <p>
            Swing включают только при покупке (+10%); Swap Free — тоже +10% и требует Swing. На счетах Swing и Swap
            Free плечо ниже: форекс 1:30 вместо 1:100, металлы 1:5 вместо 1:30, индексы 1:5 вместо 1:20. На какой платформе доступен Swap Free для 1 Step
            Flex, источники расходятся (то «на трёх платформах», то «только MT5»), поэтому платформу не указываем.
          </p>
          <p className="ru-source-line">Источники: <SourceLink href={SRC.news}>News Trading & Weekend Holding</SourceLink> (обновлена {NEWS_UPDATED}); плечо — <SourceLink href={SRC.oneStepFlex}>справка 1 Step Flex</SourceLink> и <SourceLink href={SRC.twoStepStandard}>2 Step Standard</SourceLink> (перепроверено {RULES_CHECKED}).</p>
        </div>
      </section>

      <section className="ru-section" id="kripto">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-crypto="btc-eth">
          <h2>Криптовалюты: какие пары и какое плечо</h2>
          <p>
            Во всех пяти программах доступны только две криптопары — BTCUSD и ETHUSD, комиссия 0,04%. Плечо по криптовалютам — 1:2 на оценке и 1:1 на
            Master (в том числе на счетах Swing и Swap Free); у Zero — 1:2 на стандартном счёте и 1:1 на Swap Free. Крипто-сделка целиком на выходных на
            оценке не считается торговым днём и не сбрасывает счётчик неактивности. Больше криптопар — у других фирм: см. <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link>.
          </p>
          <p className="ru-source-line">Источники: <SourceLink href={SRC.oneStepFlex}>справка 1 Step Flex</SourceLink> и статьи остальных программ{CRYPTO_CHECKED ? ` (проверено ${CRYPTO_CHECKED})` : ''}; выходные — <SourceLink href={SRC.news}>FAQ статьи о новостях</SourceLink>.</p>
        </div>
      </section>

      <section className="ru-section" id="sovetniki">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-ea-copy="conduct">
          <h2>Советники (EA), копирование сделок и IP</h2>
          <ul>
            <li><strong>Сторонний советник</strong> — только как менеджер сделок или риска.</li>
            <li><strong>Собственный советник</strong> может торговать полностью автоматически, если вы докажете авторство (например, исходным кодом); достаточность доказательств решает фирма.</li>
            <li><strong>Копирование</strong> между своими счетами FundingPips и со счёта FundingPips на внешний — можно. Копирование во FundingPips с внешнего источника, сигнального сервиса или копировщика — запрещено.</li>
            <li><strong>VPN и VPS</strong> при входе в торговый счёт запрещены. Регион IP при покупке, входе на сайт и в счёт должен совпадать; при переезде фирма может попросить доказательства (билет, штамп в паспорте, видео).</li>
          </ul>
          <p className="ru-source-line">Источник: <SourceLink href={SRC.conduct}>Trading Conduct and Security Standards</SourceLink> (статья от 19.08.2026; советники и копирование — по данным Prop Firm Tracker на {CHECKOUT_CHECKED}, IP и VPN — перепроверено {FP_ACCESS_CHECKED}).</p>
          <h3>Масштабирование и счёт Prime</h3>
          <p>
            Prime — только по приглашению по результатам торговли: доля 80%, выплаты ежедневно, мягкий дневной лимит 3% (торговля останавливается
            до следующего дня), общий лимит 8%, отдельные проверка личности и договор (<SourceLink href={SRC.prime}>справка Prime</SourceLink>, перепроверено {RULES_CHECKED}).
          </p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-payout-methods="reward-methods">
          <h2>Выплаты: циклы, доли и условия выплаты по запросу</h2>
          <p>
            Циклы — в таблице выше. У выплаты 100% по запросу (кроме Zero) есть система предупреждений: если закрытый и плавающий убыток по одной
            торговой идее достигает 1% размера счёта, это предупреждение. Вторая — доля падает вдвое, третья — до 20%, четвёртая — счёт закрывают; прибыль идей с предупреждением
            вычитается. Торговой идеей считается сделка, несколько сделок в одну сторону по одному инструменту или новые сделки в течение 10 минут после
            убыточной (<SourceLink href={SRC.twoStepStandard}>справка 2 Step Standard</SourceLink>, такой же блок в статьях 1 Step Flex, 2 Step Flex и 2 Step Pro, перепроверено {RULES_CHECKED}).
          </p>
          <h3>Способы вывода</h3>
          <p>
            Карта, криптовалюта (USDT или USDC только в ERC-20), Rise и банковский перевод; минимум — 1% размера Master-счёта для карты и
            криптовалюты, $500 для Rise и банка. Обработка 1–3 рабочих дня плюс 1–2 рабочих дня на зачисление. Карта и банк доступны только в 14 странах, России среди них нет;
            без Rise выплата уходит в криптовалюту. Максимальная сумма одной выплаты не опубликована. Подробно о способах — в <Link href="/ru/obzor-fundingpips#payout-methods">обзоре FundingPips</Link>.
          </p>
          <p className="ru-source-line">Источник: <SourceLink href={SRC.rewardMethods}>Reward Methods</SourceLink> (статья от 28.09.2026, Prop Firm Tracker {REWARD_METHODS_CHECKED}, перепроверено {RULES_CHECKED}). Как платят другие фирмы — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
          {closedHref && <p className="ru-source-line" data-russian-closed-firms-link="fundingpips-pravila">Перед оплатой любого челленджа проверьте, нет ли фирмы в <Link href={closedHref}>списке закрытых проп-фирм</Link>.</p>}
        </div>
      </section>

      <section className="ru-section" id="primer">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-worked-example="2-step-standard-10k">
          <h2>Пример: 2 Step Standard $10K от взноса до первой выплаты</h2>
          {example ? <>
            <p className="ru-muted">Пример, не прогноз. Все цифры — из данных программы на {ruDate(standard!.sourceCapturedAt)} (<SourceLink href={SRC.twoStepStandard}>справка 2 Step Standard</SourceLink>) и статьи <SourceLink href={SRC.rewardMethods}>Reward Methods</SourceLink>.</p>
            <ol>
              <li><strong>Взнос:</strong> {usd(example.fee)} по списку справки. С кодом HELLO (−20% на первую покупку, кроме счетов $100K) — {usd(example.feeHello)}; код проверяйте на кассе.</li>
              <li><strong>Этап 1:</strong> цель {percent(standard!.profitTargets?.phase1)} = {usd(example.phase1)} прибыли, минимум {example.days} торговых дня.</li>
              <li><strong>Этап 2:</strong> цель {percent(standard!.profitTargets?.phase2)} = {usd(example.phase2)}.</li>
              <li><strong>Лимиты:</strong> дневной {percent(standard!.dailyLossPct)} = {usd(example.daily)}; общий {percent(standard!.maxLossPct)} статический — средства не должны опуститься до {usd(example.floor)}.</li>
              <li><strong>Выплата на Master:</strong> с $1,000 прибыли вы получите $600 при еженедельном цикле (60%), $800 раз в две недели (80%) или $1,000 по запросу (100%, при стабильности 35% и 7 прибыльных днях). Минимальный запрос на карту или в криптовалюте — 1% счёта, то есть $100; через Rise или банк — от $500.</li>
              <li><strong>Без опции Swing</strong> сделку на Master вечером закроет система — не нарушение, но и не ваша точка выхода.</li>
            </ol>
          </> : <p className="ru-muted">Данные 2 Step Standard требуют повторной проверки, пример временно скрыт.</p>}
        </div>
      </section>

      <section className="ru-section" id="oshibki">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-common-breaches="from-rules">
          <h2>Что чаще всего приводит к потере счёта или прибыли</h2>
          <p className="ru-muted">Список составлен по правилам выше, а не по статистике: числа нарушений FundingPips не публикует.</p>
          <ul>
            <li><strong>30 дней без сделок</strong> на любой программе. Справка пишет «no completed trades», условия (п. 9) — «no trades have been executed»: формулировки разные, срок один.</li>
            <li><strong>Сделка ради новости</strong> — даже на оценке; на Zero хватает позиции в 10-минутном окне.</li>
            <li><strong>Позиция на выходных на Zero.</strong></li>
            <li><strong>Гэп в понедельник</strong> или вычет новостной прибыли, доводящий счёт до лимита.</li>
            <li><strong>VPN, смена региона IP, копирование чужих сигналов.</strong></li>
            <li><strong>Риск 1% на идею при выплате 100%:</strong> четвёртое предупреждение закрывает счёт.</li>
          </ul>
          <p className="ru-source-line">Источники: <SourceLink href={SRC.news}>News Trading & Weekend Holding</SourceLink>; <SourceLink href={SRC.compare}>Compare Account Models</SourceLink> (неактивность 30 дней у всех пяти); <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия, п. 9</a>; <SourceLink href={SRC.conduct}>Trading Conduct</SourceLink> — перепроверено {RULES_CHECKED}. Общая механика оценки — в разделе <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работают челленджи</Link>; что такое <Link href="/ru/prop-trejding">проп-трейдинг</Link> и <Link href="/ru/funded-account">funded account</Link> — в отдельных руководствах.</p>
        </div>
      </section>

      <section className="ru-section" id="oplata">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-checkout="get-started">
          <h2>Оплата и промокод</h2>
          <p>
            Get Started: карты Visa и Mastercard на ваше имя, Google Pay, Apple Pay, PayPal, Neteller, Skrill, Paysafecard и криптовалюта; набор зависит
            от региона. {fpFirm?.discountCode ? `Код ${fpFirm.discountCode} даёт 20% на первую покупку, кроме счетов $100K` : 'Действующий код мы сейчас не указываем'} (по данным на {CHECKOUT_CHECKED}).
            Статус кодов — на странице <Link href="/ru/promokody-prop-firm">промокодов проп-фирм</Link>.
          </p>
          <p className="ru-source-line">Источник: <SourceLink href={SRC.getStarted}>Get Started</SourceLink> (Prop Firm Tracker, {CHECKOUT_CHECKED}).</p>
        </div>
      </section>

      <section className="ru-section" id="dostup">
        <div className="ru-shell ru-content ru-review-article" data-russian-fundingpips-access-explainer={fpStatus}>
          <h2>Доступ из России: что написано и что из этого следует</h2>
          <p>
            Условия FundingPips: «Services are not offered to residents of certain jurisdictions, including countries on the FATF and EU/UN sanctions lists,
            Vietnam, and UAE» — речь о резидентстве, а не о гражданстве. Поиск по справке по словам Russia, FATF и sanctions ничего не дал (проверено {FP_ACCESS_CHECKED}).
          </p>
          <ul>
            <li><strong>Живёте в России:</strong> статус неясен. До оплаты получите письменный ответ поддержки.</li>
            <li><strong>Гражданин РФ, живёте в другой стране</strong> (Казахстан, Грузия, Армения, Сербия, ЕС): ограничение — по резидентству, но решение принимает фирма на проверке личности.</li>
            <li><strong>Поездки в Россию:</strong> регион IP при покупке и входе должен совпадать; необъяснённая смена региона — риск проверки.</li>
          </ul>
          <p>Регистрацию, проверку личности и оплату с российскими документами мы не тестировали. VPN для обхода ограничений — прямое нарушение: фирма может отказать в выплате и закрыть счёт.</p>
          <p className="ru-source-line">Источники: <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия FundingPips</a> (с {FP_TERMS_EFFECTIVE}); <SourceLink href={SRC.getStarted}>Get Started</SourceLink>; <SourceLink href={SRC.conduct}>Trading Conduct</SourceLink> — проверено {FP_ACCESS_CHECKED}. Подробнее — в разделе <Link href="/ru/obzor-fundingpips#dostup-iz-rossii">доступ к FundingPips из России</Link> и на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell" data-russian-alternatives="bright-funded-first">
          <h2>Если FundingPips вам недоступна: альтернативы</h2>
          <p className="ru-muted">Порядок редакционный. Бейдж показывает статус доступа для резидентов РФ по нашим данным.</p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-alternative="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded <RuAccessBadge firm="bright-funded" /></h3>
              <p className="ru-muted">Россия не названа ни в справке, ни в условиях; при этом списки стран в справке и условиях расходятся по Пакистану (по данным на {BF_ACCESS_CHECKED}).</p>
              <p className="ru-source-line"><Link href="/ru/obzor-bright-funded">Обзор BrightFunded</Link> · <Link href="/ru/fundingpips-vs-bright-funded">FundingPips или BrightFunded</Link></p>
              <div className="ru-actions">
                <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-rules-fundingpips-alt-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Перейти в BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russian-alternative="crypto-fund-trader">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Crypto Fund Trader <RuAccessBadge firm="crypto-fund-trader" /></h3>
              <p className="ru-muted">Через Match-Trader ограничений по странам нет; MT5 недоступен резидентам США (по данным на {CFT_ACCESS_CHECKED}).</p>
              <p className="ru-source-line"><RuPendingLink href="/ru/obzor-crypto-fund-trader">Обзор Crypto Fund Trader</RuPendingLink></p>
              <div className="ru-actions">
                <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-rules-fundingpips-alt-cft" rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Перейти в Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
          </div>
          <p className="ru-source-line">Условия FundingPips рядом с другой фирмой — в сравнении <Link href="/ru/fundednext-vs-fundingpips">FundedNext против FundingPips</Link> (FundedNext резидентам РФ недоступна). Полный рейтинг — <Link href="/ru/luchshie-prop-firmy">проп компании для трейдеров</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и дата проверки</h2>
          <p>Проверено {RULES_CHECKED} по официальным страницам FundingPips (справка читалась из США; цены касс других стран не проверялись). Как отличать проверяемые отзывы от рекламы — в руководстве <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.</p>
          <ul>
            {products.map(product => <li key={product.productSlug}><SourceLink href={PRODUCT_SOURCE[product.productSlug as ProductSlug] ?? product.sourceUrl}>{product.productName}: статья справки</SourceLink> — данные на {ruDate(product.sourceCapturedAt)}, перепроверено {RULES_CHECKED}.</li>)}
            <li><SourceLink href={SRC.news}>News Trading & Weekend Holding</SourceLink> — обновлена {NEWS_UPDATED}, перепроверено {RULES_CHECKED}.</li>
            <li><SourceLink href={SRC.compare}>Compare Account Models</SourceLink> — перепроверено {RULES_CHECKED}.</li>
            <li><SourceLink href={SRC.conduct}>Trading Conduct and Security Standards</SourceLink> — статья от 19.08.2026, перепроверено {FP_ACCESS_CHECKED}.</li>
            <li><SourceLink href={SRC.prime}>Prime Account</SourceLink> — перепроверено {RULES_CHECKED}.</li>
            <li><SourceLink href={SRC.rewardMethods}>Reward Methods</SourceLink> — статья от 28.09.2026, Prop Firm Tracker {REWARD_METHODS_CHECKED}.</li>
            <li><SourceLink href={SRC.getStarted}>Get Started</SourceLink> — страны: обновлена {FP_HELP_UPDATED}, проверено {FP_ACCESS_CHECKED}; оплата и HELLO — {CHECKOUT_CHECKED}.</li>
            <li><a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">Условия FundingPips</a> — действуют с {FP_TERMS_EFFECTIVE}, проверено {FP_ACCESS_CHECKED}.</li>
          </ul>
          <h3>Что изменилось</h3>
          <ul data-russian-fundingpips-changes="2026-10-23">
            <li><strong>23.10.2026:</strong> правила не менялись с 20–21.10. Доступ из России — по-прежнему неясно. Впервые прочитана касса (из США): Swing +10%, Swap Free требует Swing, у 1 Step Flex есть конфигурация с дневным лимитом 2%; размера $2,5K нет.</li>
            <li><strong>21.10.2026:</strong> на Master без Swing позиции закрываются каждый день, а не только на выходных.</li>
            <li><strong>20.10.2026:</strong> у 2 Step Standard убраны маршруты «ежемесячно 100%» и «по запросу 90%».</li>
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="fundingpips-rules">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            У FundingPips и BrightFunded с нами партнёрские программы, у Crypto Fund Trader — нет. Комиссия не меняет правила, порядок и оценку доступа.
          </div>
          <div className="ru-notice" data-russian-risk-disclaimer="fundingpips-rules">
            <strong>Риск.</strong> Оценка платная, при нарушении лимита взнос не возвращается, доля вознаграждения не обещает дохода. Платите только
            сумму, потерю которой готовы принять.
          </div>
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-rules-fundingpips-footer" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-rules-fundingpips-footer" rel={goLinkRel('fundingpips')} className="btn-outline">Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
      <RuRelatedBlock path={PATH} />
    </>
  )
}
