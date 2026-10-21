import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { ArrowRight, CheckCircle2, Scale, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RuPendingLink from '@/components/RuPendingLink'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import Breadcrumbs from '@/components/Breadcrumbs'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import { challengeCurrency, challengeTierEconomics, minimumCostToFundedUsd, getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { goLinkRel } from '@/lib/russiaAvailability'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/fundingpips-vs-bright-funded'
const TITLE = 'FundingPips или BrightFunded: условия и доступ из РФ 2026'
const DESCRIPTION = 'FundingPips или BrightFunded: сравнение 1-Step, 2-Step и Zero, цен в USD и EUR, просадки, сплита и выплат. BrightFunded открыта для РФ, FundingPips — неясно.'

// Official pages re-read by the RU Writer on this date: FundingPips Get Started (countries, checkout, HELLO, refund),
// BrightFunded help country list + Terms §2, payout methods, news rule, platforms.
const CHECKED = '20.10.2026'
// Prop Firm Tracker, content/data/challenges/_captures/fundingpips-2026-10-20.json → refundTerms (help centre 4th-reward refund vs Terms «ALL PAYMENTS ARE FINAL»).
// Prop Firm Tracker, /workspace/ru-data/2026-10-20-fundingpips-checkout-rules.md + branch data/daily-check-2026-10-20 (FundingPips reward routes, checkout, EA/copy, Prime).
const TRACKER_FP = '20.10.2026'
// Prop Firm Tracker, /workspace/ru-data/2026-10-19-ftmo-brightfunded-payments.md (BrightFunded checkout and payout cycle).
const TRACKER_BRIGHT = '19.10.2026'
// Prop Firm Tracker recapture of FundingPips Reward Methods (article last edited 28.09.2026):
// /workspace/tradersfundhub/evidence/fundingpips-reward-methods-2026-10-20.md; data branch data/fundingpips-reward-methods-2026-10-20.
const FP_REWARD_METHODS = '20.10.2026'
const FP_PAYOUT_COUNTRIES = 'Бельгия, Франция, Германия, Италия, Нидерланды, Испания, Бразилия, Колумбия, Мексика, Нигерия, ЮАР, Великобритания, Турция и Индонезия'
const TRACKER_CFT_ACCESS = '14.10.2026'
const FN_ACCESS = '20.10.2026'

const SRC = {
  brightCountries: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded',
  brightTerms: 'https://brightfunded.com/terms-and-conditions',
  brightReward: 'https://help.brightfunded.com/en/articles/9268736-how-does-my-reward-split-work-on-my-funded-account',
  brightPayouts: 'https://help.brightfunded.com/en/articles/9241681-how-can-i-get-paid',
  brightCrypto: 'https://help.brightfunded.com/en/articles/9286623-can-i-pay-for-my-challenge-with-crypto',
  brightPlatforms: 'https://help.brightfunded.com/en/articles/10855521-what-trading-platform-does-brightfunded-offer',
  brightNews: 'https://help.brightfunded.com/en/articles/9241694-can-i-trade-news',
  fpGetStarted: 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started',
  fpStandard: 'https://help.fundingpips.com/hc/en-us/articles/34501809112081-2-Step-Standard',
  fpConduct: 'https://help.fundingpips.com/hc/en-us/articles/34505029138449-Trading-Conduct-and-Security-Standards',
  fpPrime: 'https://help.fundingpips.com/hc/en-us/articles/34447308895889',
  fpPro: 'https://help.fundingpips.com/hc/en-us/articles/34502027344017-2-Step-Pro-Model',
  fpRewardMethods: 'https://help.fundingpips.com/hc/en-us/articles/34504564970385-Reward-Methods',
  fpTerms: 'https://fundingpips.com/terms-and-conditions',
}

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что лучше: FundingPips или BrightFunded?',
    a: `Единого ответа нет. Сначала страна: у BrightFunded Россия не названа ни в справке, ни в условиях; у FundingPips Россия тоже не названа, но фирма не обслуживает жителей стран из санкционных списков FATF и ЕС/ООН, поэтому доступ для РФ неясен (по данным на ${CHECKED}). Затем выбирайте продукт: число этапов, тип просадки, валюту взноса и цикл выплат.`,
  },
  {
    q: 'Работает ли FundingPips в России?',
    a: `Не подтверждено. FundingPips прямо не принимает резидентов Ирана, Вьетнама и ОАЭ, а также ссылается на страны из санкционных списков FATF и ЕС/ООН (по данным на ${CHECKED}). Россию фирма не называет, регистрацию с российскими документами мы не проверяли. Прежде чем платить, получите письменный ответ поддержки. VPN и неверные данные не используйте.`,
  },
  {
    q: 'Можно ли пройти BrightFunded из России?',
    a: `России нет ни в одном из двух опубликованных списков (по данным на ${CHECKED}). Но сами списки расходятся: справка называет шесть стран, включая Пакистан, а условия — пять, без Пакистана. Проверка личности и способ оплаты — отдельные шаги, и само отсутствие страны в списке их не гарантирует.`,
  },
  {
    q: 'У кого выше сплит?',
    a: 'У BrightFunded базовая доля 80%, 90% — платное дополнение, 100% — только через масштабирование. У FundingPips доля зависит от модели и маршрута: 2 Step Flex — 80% или 95% раз в две недели, 2 Step Pro — 80% еженедельно, 1 Step Flex — 80% раз в две недели, 2 Step Standard — 60% еженедельно или 80% раз в две недели, Zero — 95%. У всех моделей, кроме Zero, есть выплата 100% по запросу (On Demand) при правиле стабильности 35% и других условиях; ежемесячного маршрута больше нет (по данным на 20.10.2026).',
  },
  {
    q: 'Чем отличается просадка BrightFunded 1-Step от FundingPips 1 Step Flex?',
    a: 'У BrightFunded 1-Step общий лимит 6%: он движется за максимальным капиталом и фиксируется на стартовом балансе после роста на 6%. У FundingPips 1 Step Flex общий лимит 12% и статический. Дневной лимит у обеих — 3% в базовой конфигурации (по данным на 19.10.2026).',
  },
  {
    q: 'Есть ли счёт без челленджа?',
    a: 'У FundingPips есть Zero: торговля сразу на мастер-счёте, общий лимит 5% подвижный, 95% вознаграждения раз в две недели. У BrightFunded такого продукта в наших данных нет (по данным на 19.10.2026).',
  },
]

type Firm = 'BrightFunded' | 'FundingPips'
type ProductRow = { firm: Firm; product: Challenge; price: string }

function ruDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso
}

function validPrice(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

function validCaptureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function freshProduct(product: Challenge) {
  return validCaptureDate(product.sourceCapturedAt) && isChallengeFresh(product)
}

function freshDate(value: string | null | undefined, now = new Date()) {
  if (!value || !validCaptureDate(value)) return false
  const age = Math.floor((now.getTime() - new Date(`${value}T00:00:00Z`).getTime()) / 86_400_000)
  return age >= 0 && age <= 30
}

function formatPrice(value: number, currency: 'USD' | 'EUR') {
  return `${currency === 'EUR' ? '€' : '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function priceRange(product: Challenge) {
  const currency = challengeCurrency(product)
  const values = product.accountSizes
    .map(tier => (currency === 'EUR' ? tier.priceEur : tier.priceUsd))
    .filter(validPrice)
    .sort((a, b) => a - b)
  if (!values.length) return 'не опубликована'
  return values[0] === values.at(-1)
    ? formatPrice(values[0], currency)
    : `${formatPrice(values[0], currency)}–${formatPrice(values.at(-1)!, currency)}`
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) || value < 0 || value > 100 ? 'не подтверждено' : `${value}%`
}

function targetLabel(product: Challenge) {
  if (product.phases === 0) return 'без оценочного этапа'
  return Array.from({ length: product.phases }, (_, index) => percent(product.profitTargets?.[`phase${index + 1}` as keyof NonNullable<Challenge['profitTargets']>])).join(' → ')
}

function drawdownLabel(product: Challenge) {
  return ({
    static: 'статическая',
    trailing: 'подвижная',
    'eod-trailing': 'подвижная по итогам дня',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

function splitLabel(product: Challenge) {
  return validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? percent(product.profitSplitPct) : 'зависит от маршрута'
}

function daysLabel(product: Challenge) {
  if (product.firmSlug === 'fundingpips' && product.productSlug === '2-step-pro' && product.minTradingDays === 0) return 'нет (новые и сброшенные счета; купленные до 26.08.2026 — 1)'
  if (product.firmSlug === 'fundingpips' && product.productSlug === 'zero') return 'нет оценки; 7 прибыльных дней от 0,25% за 30 дней'
  return minimumTradingDaysLabel(product.minTradingDays ?? null, 'ru')
}

function payoutLabel(product: Challenge) {
  if (product.firmSlug === 'bright-funded') {
    return product.payoutFirstDays === 30
      ? 'первый запрос через 30 дн. после первой сделки на funded-счёте; затем раз в 14 дней (справка называет этот цикл и стандартом, и дополнением)'
      : 'срок не подтверждён'
  }
  if (product.payoutFirstDays == null || !Number.isInteger(product.payoutFirstDays) || product.payoutFirstDays < 0) return 'зависит от выбранного маршрута'
  const frequency = ({
    weekly: 'еженедельно',
    'bi-weekly': 'далее раз в две недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'цикл не указан'
  return `${product.payoutFirstDays} дн.; ${frequency}`
}

function tierCost(product: Challenge | undefined, size: number) {
  if (!product) return { fee: 'не подтверждено', recovery: '—' }
  const tier = product.accountSizes.find(candidate => candidate.sizeUsd === size)
  const currency = challengeCurrency(product)
  const fee = currency === 'USD' ? tier?.priceUsd : tier?.priceEur
  if (!tier || !validPrice(fee)) return { fee: 'нет такого размера', recovery: '—' }
  const cost = currency === 'USD' ? minimumCostToFundedUsd(product, tier) : fee
  const economics = validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? challengeTierEconomics(product, tier) : null
  return {
    fee: validPrice(cost) ? formatPrice(cost, currency) : 'не подтверждено',
    recovery: economics && validPrice(economics.breakEvenProfit) ? formatPrice(economics.breakEvenProfit, currency) : 'не рассчитывается: доля зависит от маршрута',
  }
}

const SHARED_SIZES = [5000, 10000, 25000, 50000, 100000]

export default function RussianFundingPipsVsBrightFundedPage() {
  const firms = getAllFirms()
  const bfFirm = firms.find(firm => firm.name === 'BrightFunded')
  const fpFirm = firms.find(firm => firm.name === 'FundingPips')
  const bfProducts = getChallengesByFirm('bright-funded')
  const fpProducts = getChallengesByFirm('fundingpips')
  const relevantProducts = [...bfProducts, ...fpProducts]
  const productRows: ProductRow[] = [
    ...bfProducts.filter(freshProduct).map(product => ({ firm: 'BrightFunded' as const, product, price: priceRange(product) })),
    ...fpProducts.filter(freshProduct).map(product => ({ firm: 'FundingPips' as const, product, price: priceRange(product) })),
  ]
  const find = (firm: Firm, slug: string) => productRows.find(row => row.firm === firm && row.product.productSlug === slug)?.product
  const bfOne = find('BrightFunded', 'bright-funded-1-step')
  const bfBright = find('BrightFunded', 'bright-funded-2-step-bright')
  const bfClassic = find('BrightFunded', 'bright-funded-2-step-classic')
  const fpOne = find('FundingPips', '1-step-flex')
  const fpFlex = find('FundingPips', '2-step-flex')
  const fpPro = find('FundingPips', '2-step-pro')
  const fpStandard = find('FundingPips', '2-step-standard')
  const fpZero = find('FundingPips', 'zero')
  const sourceDates = relevantProducts.map(product => product.sourceCapturedAt).filter(validCaptureDate).sort()
  const latestCapture = sourceDates.at(0) ?? 'дата не указана'
  const articleDateModified = russianRouteDateModified(PATH, latestCapture)
  const completeEvidence = relevantProducts.length > 0 && productRows.length === relevantProducts.length
    && productRows.every(row => row.product.accountSizes.some(tier => validPrice(tier.priceUsd) || validPrice(tier.priceEur)))
    && [bfOne, bfBright, bfClassic, fpOne, fpFlex, fpPro, fpStandard, fpZero].every(Boolean)
  const missingPair = <p className="ru-muted">Условия одного или обоих продуктов требуют повторной проверки. Числовое сравнение этой пары временно скрыто.</p>
  const bfRows = productRows.filter(row => row.firm === 'BrightFunded')
  const fpRows = productRows.filter(row => row.firm === 'FundingPips')
  const short = (product: Challenge) => product.productName.replace('BrightFunded ', '').replace('FundingPips ', '')
  const corporate = (firm: typeof bfFirm, label: string) => firm && freshDate(firm.corporateCapturedAt)
    ? `${firm.founded} / ${firm.legalEntity}, ${label} (по данным на ${ruDate(firm.corporateCapturedAt!)})`
    : 'требует повторной проверки'
  const bfTrustpilot = bfFirm && freshDate(bfFirm.trustpilotCapturedAt)
    ? `рейтинг скрыт Trustpilot из-за нарушения правил площадки (по данным на ${ruDate(bfFirm.trustpilotCapturedAt!)})`
    : 'требует повторной проверки'
  const fpTrustpilot = fpFirm && fpFirm.trustpilotScore != null && fpFirm.trustpilotCount != null && freshDate(fpFirm.trustpilotCapturedAt)
    ? `оценка ${fpFirm.trustpilotScore}, отзывов: ${fpFirm.trustpilotCount.toLocaleString('ru-RU')} (по данным на ${ruDate(fpFirm.trustpilotCapturedAt!)})`
    : 'требует повторной проверки'
  const keyFields: Array<{ field: string; bf: ReactNode; fp: ReactNode }> = [
    {
      field: 'Доступ для резидентов РФ',
      bf: <>Россия не названа ни в справке, ни в условиях <RuAccessBadge firm="bright-funded" /></>,
      fp: <>Россия не названа, но есть оговорка о санкционных списках FATF и ЕС/ООН <RuAccessBadge firm="fundingpips" /></>,
    },
    {
      field: 'Страны в опубликованных ограничениях',
      bf: `справка: ${bfFirm?.countriesRestricted?.join(', ') ?? '—'}; условия (п. 2): те же без Пакистана`,
      fp: `${fpFirm?.countriesRestricted?.join(', ') ?? '—'} + страны из санкционных списков FATF и ЕС/ООН`,
    },
    { field: 'Основана / юрлицо', bf: corporate(bfFirm, 'Сент-Люсия'), fp: corporate(fpFirm, 'Коморы; адрес в Дубае') },
    { field: 'Платформы', bf: bfFirm?.platforms.join(', ') ?? '—', fp: fpFirm?.platforms.join(', ') ?? '—' },
    { field: 'Программы (свежие записи)', bf: bfRows.map(row => short(row.product)).join(', ') || '—', fp: fpRows.map(row => short(row.product)).join(', ') || '—' },
    { field: 'Валюта и диапазон взноса', bf: bfRows.map(row => `${short(row.product)}: ${row.price}`).join('; ') || '—', fp: fpRows.map(row => `${short(row.product)}: ${row.price}`).join('; ') || '—' },
    { field: 'Минимум торговых дней', bf: bfRows.map(row => `${short(row.product)}: ${daysLabel(row.product)}`).join('; ') || '—', fp: fpRows.map(row => `${short(row.product)}: ${daysLabel(row.product)}`).join('; ') || '—' },
    { field: 'Доля вознаграждения', bf: '80% базово; 90% — платное дополнение; 100% — через масштабирование', fp: 'по модели: 1 Step Flex и 2 Step Pro — 80%; 2 Step Flex — 80% или 95%; 2 Step Standard — 60% или 80%; у всех, кроме Zero, — 100% по запросу при условиях; Zero — 95%' },
    { field: 'Первая выплата', bf: 'через 30 дн. после первой сделки на funded-счёте, затем раз в 14 дней (официальное противоречие, см. ниже)', fp: fpRows.map(row => `${short(row.product)}: ${payoutLabel(row.product)}`).join('; ') || '—' },
    { field: 'Способы выплаты', bf: `банковский перевод (в EUR), USDC (ERC-20) (по данным на ${CHECKED})`, fp: `карта (Visa/Mastercard; Pay to Card — только в 14 странах), USDT/USDC только в сети ERC-20, Rise, банковский перевод (только в тех же 14 странах); минимум 1% мастер-счёта, для Rise и банка — $500 (по данным на ${FP_REWARD_METHODS})` },
    { field: 'Trustpilot', bf: bfTrustpilot, fp: fpTrustpilot },
  ]
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'FundingPips или BrightFunded' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: articleDateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {completeEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-partner-comparison="fundingpips-bright-funded" data-russian-comparison-editorial-date={articleDateModified}>
          <RussianDataFreshnessNotice firmSlugs={['bright-funded', 'fundingpips']} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Сравнение · доступ проверен {CHECKED}</div>
          <h1>FundingPips или BrightFunded: что выбрать в 2026 году</h1>
          <p className="ru-lead">
            FundingPips (Funding Pips, «Фандинг Пипс») знают многие, но для резидента России первый вопрос — не цена, а доступ. BrightFunded Россию в своих
            ограничениях не называет. У FundingPips статус неясен. Ниже — доступ по странам, программы, просадка, взносы в EUR
            и USD, доля вознаграждения и выплаты.
          </p>
          <div className="ru-notice" data-russian-access-answer="first-screen">
            <strong>Коротко о доступе (по данным на {CHECKED}):</strong>
            <ul>
              <li>BrightFunded <RuAccessBadge firm="bright-funded" /> — России нет ни в справке (6 стран, включая Пакистан), ни в условиях (5 стран, без Пакистана).</li>
              <li>FundingPips <RuAccessBadge firm="fundingpips" /> — закрыта для Ирана, Вьетнама и ОАЭ; Россия не названа, но фирма ссылается на страны из санкционных списков FATF и ЕС/ООН.</li>
              <li>Живёте в Дубае или другом эмирате — FundingPips вам недоступна, хотя сама зарегистрирована в Дубае.</li>
            </ul>
          </div>
          <p className="ru-source-line">Автор: редакция Traders Fund Hub · Редакционная проверка: {articleDateModified}. Даты источников указаны у каждого факта.</p>
          <div className="ru-actions" data-russian-comparison-cta="bright-funded-first">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-comparison-fundingpips-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">
              Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted" data-russian-fundingpips-bright-funded-country-conflict="help-six-terms-five">списки стран в справке и условиях расходятся по Пакистану</span>
          </div>
          <div className="ru-actions">
            <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-comparison-fundingpips-bright-funded" rel={goLinkRel('fundingpips')} className="btn-outline">
              Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">доступ для резидентов РФ не подтверждён; резидентам ОАЭ недоступно</span>
          </div>
          <nav className="ru-review-toc" aria-label="Содержание сравнения">
            <Link href="#verdikt">Вердикт</Link> · <Link href="#dostup">Доступ</Link> · <Link href="#programmy">Программы</Link> · <Link href="#dva-etapa">Два этапа</Link> · <Link href="#odin-etap">Один этап</Link> · <Link href="#bez-ocenki">Без оценки</Link> · <Link href="#stoimost">Стоимость</Link> · <Link href="#vyplaty">Выплаты</Link> · <Link href="#oplata">Оплата</Link> · <Link href="#alternativy">Альтернативы</Link> · <Link href="#sources">Источники</Link>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="comparison-not-access">
            <strong>Русский язык страницы не означает доступ.</strong>{' '}
            Решают гражданство, место проживания, проверка личности, способ оплаты и способ выплаты. Не используйте VPN,
            чужие документы или неверный адрес для обхода ограничений.
          </div>
          <p className="ru-source-line">У обеих фирм с нами партнёрские программы: после регистрации по ссылкам на странице мы можем получить комиссию. Это не подтверждение доступа для вашего профиля.</p>
        </div>
      </section>

      <section className="ru-section" id="verdikt">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-verdict="by-trader-type">
          <h2>Короткий вердикт: для резидента РФ выбор решает доступ</h2>
          <p>
            <strong>Живёте в России.</strong> Начните с BrightFunded: Россия не названа ни в одном из её списков. У FundingPips
            прямого запрета нет, но есть оговорка о санкционных списках, а значит, ясности тоже нет. Платить за челлендж, не
            получив от поддержки письменного «да», мы бы не стали.
          </p>
          <p>
            <strong>Живёте в ОАЭ.</strong> FundingPips для вас закрыта. У BrightFunded нет запрета по стране, но MT5 для
            жителей ОАЭ недоступен, так что выбирайте другую платформу.
          </p>
          <p>
            <strong>Живёте в стране, открытой для обеих.</strong> Сравнивайте модель, а не бренд. FundingPips даёт больше
            вариантов: 12% статического запаса в 1 Step Flex, отсутствие минимума дней в 2 Step Pro у новых счетов, счёт без оценки
            Zero. BrightFunded проще устроена: базовые 80%, взносы в евро, пять торговых дней на фазу и первая выплата через
            30 дней.
          </p>
          <p>
            <strong>Скальпер или свинг-трейдер.</strong> Подвижный лимит BrightFunded 1-Step наказывает за откат после прибыли.
            Статические лимиты FundingPips прощают его, но на мастер-счёте 2 Step Pro перенос позиций через ночь и выходные
            требует платной опции Swing.
          </p>
        </div>
      </section>

      <section className="ru-section" id="dostup">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Доступ: Россия, Беларусь, Казахстан, ОАЭ</h2>
          <p>Таблица собрана по официальным спискам, проверенным {CHECKED}. «Не названа» означает только то, что страны нет в тексте ограничений: регистрацию с документами этих стран мы не тестировали.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ по странам">
            <table className="ru-table" data-russian-access-table="ru-by-kz-ae">
              <thead><tr><th>Страна</th><th>BrightFunded</th><th>FundingPips</th></tr></thead>
              <tbody>
                <tr><td><strong>Россия</strong></td><td>не названа</td><td>не названа; оговорка о санкционных списках FATF и ЕС/ООН — неясно</td></tr>
                <tr><td><strong>Беларусь</strong></td><td>не названа</td><td>не названа; та же оговорка — неясно</td></tr>
                <tr><td><strong>Казахстан</strong></td><td>не назван</td><td>не назван</td></tr>
                <tr><td><strong>ОАЭ</strong></td><td>не названы; MT5 для жителей ОАЭ недоступен</td><td>закрыта для резидентов</td></tr>
              </tbody>
            </table>
          </div>
          <div className="ru-notice" data-russian-fundingpips-bright-funded-country-conflict="help-six-terms-five">
            <strong>Списки BrightFunded расходятся.</strong> Справка (обновлена 15.09.2026) запрещает покупку и регистрацию
            гражданам и жителям Кубы, Ирана, Северной Кореи, Сирии, Вьетнама и Пакистана; пакистанцы с уже активным счётом
            могут продолжать торговлю. Пункт 2 условий называет пять стран без Пакистана и добавляет фактическое
            местонахождение; фирма оставляет за собой право вводить новые ограничения. Оба источника проверены {CHECKED}.
            Россию не называет ни один.
          </div>
          <p className="ru-source-line">
            Источники: <a href={SRC.brightCountries} target="_blank" rel="noopener noreferrer">справка BrightFunded</a>; <a href={SRC.brightTerms} target="_blank" rel="noopener noreferrer">условия BrightFunded</a>; <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips Get Started</a>.
            Подробнее — в разделе <Link href="/ru/obzor-fundingpips#dostup-iz-rossii">доступ к FundingPips из России</Link> обзора и на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="programmy">
        <div className="ru-shell">
          <h2>Программы: BrightFunded 1-Step, 2-Step Bright и Classic против пяти моделей FundingPips</h2>
          <p className="ru-muted">Сначала ключевые различия фирм, затем все продукты со свежей проверкой. Значения выводятся из датированных записей; если запись старше 30 дней, строка помечается или скрывается.</p>
          {!completeEvidence && <p className="ru-notice" data-russian-comparison-evidence-status="recapture-required">Часть данных требует повторной проверки. Полное числовое сравнение сейчас не подтверждено.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Ключевые различия BrightFunded и FundingPips">
            <table className="ru-table" data-russian-comparison-key-fields={keyFields.length}>
              <thead><tr><th>Параметр</th><th>BrightFunded</th><th>FundingPips</th></tr></thead>
              <tbody>{keyFields.map(row => <tr key={row.field}><td><strong>{row.field}</strong></td><td>{row.bf}</td><td>{row.fp}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Все программы BrightFunded и FundingPips">
            <table className="ru-table" data-russian-comparison-product-count={productRows.length} data-russian-comparison-source-links={productRows.length}>
              <thead><tr><th>Фирма</th><th>Программа</th><th>Цель</th><th>Лимиты убытка</th><th>Мин. дней</th><th>Взнос</th><th>Доля</th><th>Выплата</th><th>Источник</th></tr></thead>
              <tbody>
                {productRows.map(row => (
                  <tr key={`${row.firm}-${row.product.productSlug}`} data-russian-comparison-product={`${row.product.firmSlug}:${row.product.productSlug}`}>
                    <td><strong>{row.firm}</strong></td>
                    <td>{row.product.productName}</td>
                    <td>{targetLabel(row.product)}</td>
                    <td>Дневной: {percent(row.product.dailyLossPct)}; общий: {percent(row.product.maxLossPct)}; {drawdownLabel(row.product)}</td>
                    <td>{daysLabel(row.product)}</td>
                    <td>{row.price}</td>
                    <td>{splitLabel(row.product)}</td>
                    <td>{payoutLabel(row.product)}</td>
                    <td><a href={row.product.sourceUrl} target="_blank" rel="noopener noreferrer">{ruDate(row.product.sourceCapturedAt)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!productRows.length && <p className="ru-notice">Нет программ с актуальной проверкой. Цены временно скрыты.</p>}
          <p className="ru-source-line">Самая ранняя проверка программ: {ruDate(latestCapture)}. Цены — без акций. Правила каждой фирмы подробно — в <Link href="/ru/obzor-bright-funded">обзоре BrightFunded</Link> и <Link href="/ru/obzor-fundingpips">обзоре FundingPips</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-scenarios="like-for-like-pairs">
          <div id="dva-etapa">
            <h2>Два этапа: пары, которые реально сравнимы</h2>
            {bfClassic && fpStandard ? <article data-russian-comparison-pair="classic-standard">
              <h3>2-Step Classic или 2 Step Standard</h3>
              <p>
                Самая близкая пара. Цели: {targetLabel(bfClassic)} у BrightFunded и {targetLabel(fpStandard)} у FundingPips, так что первый
                этап у FundingPips на 2 пункта легче. Лимиты одинаковые: дневной {percent(bfClassic.dailyLossPct)} и {percent(fpStandard.dailyLossPct)},
                общий {percent(bfClassic.maxLossPct)} и {percent(fpStandard.maxLossPct)}, оба статические. Минимум дней: {daysLabel(bfClassic)} у BrightFunded
                и {daysLabel(fpStandard)} у FundingPips.
              </p>
              <p>
                После оценки у 2 Step Standard нет единой доли: еженедельно 60%, раз в две недели 80% или по запросу 100%, причём для
                выплаты по запросу действует правило стабильности 35%. Прежних маршрутов «ежемесячно 100%» и «по запросу 90%» больше нет (по данным на 20.10.2026).
              </p>
              <p data-russian-fundingpips-refund-conflict="help-vs-terms">
                <strong>Возврат взноса: источники FundingPips расходятся.</strong> По справке FundingPips (Get Started и Reward Methods) взнос за 2 Step Standard
                возвращается с четвёртым вознаграждением на мастер-счёте; на 1 Step Flex, 2 Step Flex, 2 Step Pro и Zero это не распространяется.
                В общих условиях этого пункта нет: там сказано «ALL PAYMENTS ARE FINAL», а регистрационный взнос назван невозвратным, кроме случаев,
                когда возврат требует закон (по данным Prop Firm Tracker на {TRACKER_FP}). Не рассчитывайте на возврат, пока поддержка не подтвердит его письменно.
              </p>
              <p className="ru-source-line">Возврат взноса: <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">справка Get Started</a>; <a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">справка Reward Methods</a>; <a href={SRC.fpTerms} target="_blank" rel="noopener noreferrer">условия FundingPips</a> (все — {TRACKER_FP}).</p>
              <p className="ru-source-line">Источники: <a href={bfClassic.sourceUrl} target="_blank" rel="noopener noreferrer">2-Step Classic</a> ({ruDate(bfClassic.sourceCapturedAt)}); <a href={fpStandard.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Standard</a> ({ruDate(fpStandard.sourceCapturedAt)}).</p>
            </article> : <article><h3>2-Step Classic или 2 Step Standard</h3>{missingPair}</article>}

            {bfBright && fpFlex && fpPro ? <article data-russian-comparison-pair="bright-flex-pro">
              <h3>2-Step Bright или 2 Step Flex / Pro</h3>
              <p>
                2-Step Bright: цели {targetLabel(bfBright)}, дневной {percent(bfBright.dailyLossPct)}, общий {percent(bfBright.maxLossPct)} ({drawdownLabel(bfBright)}).
                2 Step Flex требует больше прибыли ({targetLabel(fpFlex)}), зато даёт общий запас {percent(fpFlex.maxLossPct)} при дневном {percent(fpFlex.dailyLossPct)}.
                2 Step Pro — противоположность: цели {targetLabel(fpPro)}, но лимиты всего {percent(fpPro.dailyLossPct)} и {percent(fpPro.maxLossPct)}.
              </p>
              <p>
                Минимум дней: у Bright {daysLabel(bfBright)}; у 2 Step Flex — {daysLabel(fpFlex)} на маршруте 80% (маршрут 95% требует три прибыльных дня);
                у 2 Step Pro — {daysLabel(fpPro)} (по данным на 19.10.2026). Выплаты 2 Step Pro еженедельные по 80%, минимальный запрос — 1% размера счёта.
              </p>
              <p className="ru-source-line">Источники: <a href={bfBright.sourceUrl} target="_blank" rel="noopener noreferrer">2-Step Bright</a>; <a href={fpFlex.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Flex</a>; <a href={fpPro.sourceUrl} target="_blank" rel="noopener noreferrer">2 Step Pro</a> (все — {ruDate(fpPro.sourceCapturedAt)}).</p>
            </article> : <article><h3>2-Step Bright или 2 Step Flex / Pro</h3>{missingPair}</article>}
          </div>

          {bfOne && fpOne ? <article id="odin-etap" data-russian-comparison-pair="one-step">
            <h2>Один этап: BrightFunded 1-Step или FundingPips 1 Step Flex</h2>
            <p>
              Главное — механика общего лимита. У BrightFunded 1-Step он {percent(bfOne.maxLossPct)} и {drawdownLabel(bfOne)}: идёт за максимальным
              капиталом и фиксируется на стартовом балансе после роста на 6%. У 1 Step Flex — {percent(fpOne.maxLossPct)}, {drawdownLabel(fpOne)}.
              Цель {targetLabel(bfOne)} против {targetLabel(fpOne)}, дневной лимит {percent(bfOne.dailyLossPct)} и {percent(fpOne.dailyLossPct)}; у FundingPips
              есть и конфигурация с дневным лимитом 2%. Минимум дней: {daysLabel(bfOne)} у BrightFunded, у FundingPips — {daysLabel(fpOne)}.
            </p>
            <p>
              Скальперу, который быстро набирает и фиксирует прибыль, подвижный лимит BrightFunded мешает меньше, чем кажется: после +6%
              он перестаёт двигаться. Свинг-трейдеру с глубокими откатами ближе статические 12% FundingPips, но цель там выше. Победителя
              здесь нет — есть подходящая под стратегию механика.
            </p>
            <p className="ru-source-line">Источники: <a href={bfOne.sourceUrl} target="_blank" rel="noopener noreferrer">BrightFunded 1-Step</a> ({ruDate(bfOne.sourceCapturedAt)}); <a href={fpOne.sourceUrl} target="_blank" rel="noopener noreferrer">1 Step Flex</a> ({ruDate(fpOne.sourceCapturedAt)}).</p>
          </article> : <article id="odin-etap"><h2>Один этап: BrightFunded 1-Step или FundingPips 1 Step Flex</h2>{missingPair}</article>}

          <article id="bez-ocenki" data-russian-comparison-pair="zero-only-fundingpips">
            <h2>Без оценки: только у FundingPips (Zero)</h2>
            {fpZero ? <p>
              Zero стартует сразу на мастер-счёте, взнос {priceRange(fpZero)}. Дневной лимит {percent(fpZero.dailyLossPct)}, общий {percent(fpZero.maxLossPct)} —
              {' '}{drawdownLabel(fpZero)}, фиксируется на стартовом балансе после первых +5%. Доля {splitLabel(fpZero)}, выплаты раз в две недели.
              Условия жёсткие: правило стабильности 15% (по данным на 15.10.2026), не меньше 7 прибыльных дней от 0,25% в каждом скользящем
              30-дневном окне, а торговля в новостное окно и перенос через выходные — грубые нарушения с закрытием счёта (по данным на 19.10.2026).
              У BrightFunded продукта без оценки в наших данных нет. Другие варианты — в подборке <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирм без челленджа</Link>.
            </p> : missingPair}
          </article>
        </div>
      </section>

      <section className="ru-section" id="stoimost">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Стоимость на одинаковом размере счёта</h2>
          <p>Сравниваем только размеры, которые продают обе фирмы. Взносы BrightFunded в евро, FundingPips — в долларах. Курс мы не подставляем. Цены — без акций: промокоды вынесены в отдельный блок ниже. «Возврат затрат» посчитан методикой сайта из взноса и доли вознаграждения; где доля зависит от маршрута, расчёт не делаем.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Стоимость одинаковых размеров счёта">
            <table className="ru-table" data-russian-comparison-cost="shared-sizes">
              <thead><tr><th>Счёт</th><th>BF 2-Step Classic</th><th>FP 2 Step Standard</th><th>BF 2-Step Bright</th><th>FP 2 Step Pro</th><th>BF 1-Step</th><th>FP 1 Step Flex</th></tr></thead>
              <tbody>{SHARED_SIZES.map(size => {
                const cells = [bfClassic, fpStandard, bfBright, fpPro, bfOne, fpOne].map(product => tierCost(product, size))
                return <tr key={size} data-russian-comparison-cost-size={size}>
                  <td>${size.toLocaleString('en-US')}</td>
                  {cells.map((cell, index) => <td key={index}>{cell.fee}<br /><span className="ru-muted">возврат затрат: {cell.recovery}</span></td>)}
                </tr>
              })}</tbody>
            </table>
          </div>
          <p>Счёт $200K есть у всех продуктов BrightFunded и у FundingPips 2 Step Pro и Zero. Размер $2.5K у Pro и Standard в наших данных без подтверждённой цены, поэтому в таблицу не попал.</p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Сплит и выплаты</h2>
          <p>
            <strong>BrightFunded.</strong> Базовая доля 80%, 90% — платное дополнение, 100% — только через масштабирование (по данным на
            19.10.2026). Первый запрос — через 30 дней после первой сделки на funded-счёте, дальше раз в 14 дней. Здесь у фирмы
            противоречие: та же статья справки перечисляет 14-дневные выплаты среди платных дополнений, а на главной и в разделе
            How it works среди дополнений есть только еженедельные выплаты (по данным на {TRACKER_BRIGHT}). Наше прочтение: 14 дней —
            стандарт, еженедельно — за доплату. Перед оплатой сверьте это на кассе. Выплаты — банковским переводом в евро или в USDC (ERC-20), обработка в течение
            одного дня по FAQ фирмы.
          </p>
          <p>
            <strong>FundingPips.</strong> Единой доли нет: 1 Step Flex — 80% раз в две недели; 2 Step Flex — 80% с одним торговым днём или 95% с тремя
            прибыльными днями; 2 Step Pro — 80% еженедельно; 2 Step Standard — 60% еженедельно или 80% раз в две недели; Zero — 95% раз в две недели.
            Кроме Zero, у каждой модели есть выплата 100% по запросу: нужны правило стабильности 35% и прибыльные дни (по данным на 20.10.2026). Масштабирование
            до счёта Prime (на главной — «до $2M») — только по приглашению FundingPips, с долей 80% и своими лимитами (по данным на 20.10.2026).
          </p>
          <p data-russian-fundingpips-payout-methods="reward-methods">
            <strong>Способы выплаты FundingPips</strong> (по данным на {FP_REWARD_METHODS}): карта Visa/Mastercard (Pay to Card — только в отдельных странах),
            криптовалюта USDT или USDC только в сети ERC-20, Rise и банковский перевод. Минимум — 1% размера мастер-счёта для карты и криптовалюты,
            $500 для Rise и банковского перевода. Заявку обрабатывают 1–3 рабочих дня, ещё 1–2 рабочих дня деньги идут до кошелька или счёта;
            обычная выплата на карту — как правило, 1–5 рабочих дней после одобрения. С крипто-выплат удерживаются комиссии сервиса и сети,
            но размер комиссии не опубликован. Если Rise в вашей стране не поддерживается, выплата автоматически уходит в криптовалюту.
          </p>
          <p className="ru-notice" data-russian-fundingpips-payout-countries="pay-to-card-bank-14">
            Pay to Card и банковский перевод FundingPips перечисляет только для 14 стран: {FP_PAYOUT_COUNTRIES}.
            России, Беларуси, Украины и Казахстана в этом списке нет (по данным на {FP_REWARD_METHODS}).
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.brightReward} target="_blank" rel="noopener noreferrer">BrightFunded: reward split</a>; <a href={SRC.brightPayouts} target="_blank" rel="noopener noreferrer">BrightFunded: how can I get paid</a>; <a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">FundingPips: Reward Methods</a> ({FP_REWARD_METHODS}). Сравнение выплат у других фирм — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="oplata">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Оплата челленджа</h2>
          <p>
            <strong>BrightFunded</strong> принимает криптовалюту: BTC (сети Bitcoin и Lightning), USDT (TRC20), USDC (ERC-20), ETH (ERC-20), LTC, TRX и SOL.
            Оплата картой подтверждена, но сети карт фирма не называет. На главной странице показан Revolut Pay. PayPal, Apple Pay и Google Pay
            официально не подтверждены (по данным на {TRACKER_BRIGHT}).
          </p>
          <p>
            <strong>FundingPips</strong> перечисляет карты Visa и Mastercard (только на ваше имя), Google Pay и Apple Pay, PayPal, Neteller, Skrill,
            Paysafe Card и криптовалюту. Фирма предупреждает, что набор способов зависит от региона (по данным на {CHECKED}).
          </p>
          <p>Ни одна из фирм не упоминает «Мир» или карты российских банков, поэтому мы не утверждаем, что они сработают.</p>
          <p className="ru-source-line">Источники: <a href={SRC.brightCrypto} target="_blank" rel="noopener noreferrer">BrightFunded: crypto payment</a>; <a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips Get Started</a>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Платформы, советники, новости, копирование</h2>
          <p>
            Платформы BrightFunded: {bfFirm?.platforms.join(', ')}. MT5 недоступен для граждан, жителей и находящихся в США и ОАЭ, cTrader — для профиля
            США (статья справки проверена {CHECKED}). Платформы FundingPips: {fpFirm?.platforms.join(', ')}. Советники и копирование сделок у обеих фирм
            разрешены с ограничениями. У FundingPips сторонний советник допустим только как менеджер сделок или риска, свой советник
            может торговать полностью автоматически при подтверждении авторства. Копировать сделки между своими счетами FundingPips и
            со счёта FundingPips на внешний можно, а копировать во FundingPips со стороннего источника или сигнального сервиса нельзя (по данным на 20.10.2026).
            Точные условия BrightFunded смотрите в правилах выбранного продукта.
          </p>
          <p>
            Новости. У BrightFunded сделки за 5 минут до и 5 минут после важной новости запрещены: прибыль от них вычитается, но счёт не закрывают
            (по данным на {CHECKED}). У FundingPips 2 Step Pro на оценке новостных ограничений нет, а на мастер-счёте прибыль от сделок в окне
            ±5 минут может быть вычтена. Позиции, открытые за 5 часов и раньше, это правило не затрагивает (по данным на {CHECKED}). Перенос через выходные у FundingPips разрешён на оценке, а на мастер-счёте нужна опция Swing; у BrightFunded
            условия переноса сверяйте в правилах выбранной программы.
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.brightPlatforms} target="_blank" rel="noopener noreferrer">BrightFunded: platforms</a>; <a href={SRC.brightNews} target="_blank" rel="noopener noreferrer">BrightFunded: news</a>; <a href={SRC.fpPro} target="_blank" rel="noopener noreferrer">FundingPips 2 Step Pro</a>.</p>
        </div>
      </section>

      <section className="ru-section" id="promokody">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Промокоды</h2>
          <p>
            BrightFunded: на главной странице висит акция Double Up с кодом DOUBLE25 — 25% скидки на 2-Step (наблюдение 16.10.2026). Дата окончания
            не указана, на кассе мы её не проверяли. FundingPips: код HELLO даёт 20% на первую покупку, кроме счетов $100K (по данным на {CHECKED}).
            Статус проверенных предложений — на странице <Link href="/ru/promokody-prop-firm">промокодов проп-фирм</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell" data-russian-alternatives="bright-funded-first">
          <h2>Если FundingPips не подходит: альтернативы для трейдеров из РФ</h2>
          <p className="ru-muted">Порядок редакционный. Бейдж показывает статус доступа для резидентов РФ по нашим данным.</p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-alternative="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded <RuAccessBadge firm="bright-funded" /></h3>
              <p className="ru-muted">Россия не названа ни в справке, ни в условиях (по данным на {CHECKED}). Взносы в EUR.</p>
              <p className="ru-source-line"><Link href="/ru/obzor-bright-funded">Обзор BrightFunded</Link> · <Link href="/ru/fundednext-vs-bright-funded">FundedNext или BrightFunded</Link> · <RuPendingLink href="/ru/ftmo-vs-bright-funded">FTMO или BrightFunded</RuPendingLink></p>
              <div className="ru-actions">
                <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-fundingpips-vs-bright-alt-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Перейти в BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russian-alternative="crypto-fund-trader">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Crypto Fund Trader <RuAccessBadge firm="crypto-fund-trader" /></h3>
              <p className="ru-muted">Только через Match-Trader: там ограничений по странам нет; MT5 недоступен резидентам США (по данным на {TRACKER_CFT_ACCESS}).</p>
              <p className="ru-source-line"><RuPendingLink href="/ru/obzor-crypto-fund-trader">Обзор Crypto Fund Trader</RuPendingLink> · <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп компании</Link></p>
              <div className="ru-actions">
                <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-fundingpips-vs-bright-alt-cft" rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Перейти в Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
          </div>
          <p className="ru-muted" data-russian-alternative-excluded="fundednext">FundedNext в этот список не входит: резидентам РФ она недоступна — в подвале fundednext.com сказано, что услуги резидентам России не оказываются, хотя список в условиях (п. 5.3, CFD) Россию не называет (по данным на {FN_ACCESS}). Условия двух фирм рядом — в сравнении <Link href="/ru/fundednext-vs-fundingpips">FundedNext против FundingPips</Link>.</p>
          <p className="ru-source-line">Полный рейтинг с отметкой доступа — <Link href="/ru/luchshie-prop-firmy">лучшие проп-фирмы для трейдеров из РФ</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-decision="four-checks">
          <h2>Как выбрать за 4 проверки</h2>
          <p>Если модель с оценкой и долей вознаграждения для вас новая, сначала прочитайте, <Link href="/ru/prop-trejding">что такое проп-трейдинг</Link>.</p>
          <ol>
            <li><strong>Страна.</strong> Найдите свою страну проживания и гражданство в обоих списках. Для FundingPips из России или Беларуси сначала получите письменный ответ поддержки.</li>
            <li><strong>Тип продукта.</strong> Один этап, два этапа или без оценки (Zero есть только у FundingPips). От этого зависит, сколько этапов до <Link href="/ru/funded-account">проп-счёта</Link>.</li>
            <li><strong>Лимиты убытка.</strong> Статический или подвижный лимит, дневной лимит и минимум дней — под вашу худшую серию сделок.</li>
            <li><strong>Полная стоимость.</strong> Взнос в своей валюте (EUR или USD), комиссия способа оплаты, повторная попытка и способ получения выплат.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и дата проверки</h2>
          <p>Цены, цели, лимиты, доли и сроки выплат взяты из датированных записей по программам. Списки стран, способы оплаты FundingPips, код HELLO, способы выплаты и правило новостей BrightFunded перепроверены на официальных страницах {CHECKED}. Касса BrightFunded и противоречие по циклу выплат — из проверки Prop Firm Tracker от {TRACKER_BRIGHT}. Trustpilot — по данным на 15.10.2026; как отличить проверяемый отзыв от рекламы — в руководстве <Link href="/ru/otzyvy-prop-firm">отзывы о проп-фирмах</Link>.</p>
          <ul>
            {relevantProducts.map(product => <li key={`${product.firmSlug}:${product.productSlug}`}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.productName}: официальные условия</a> — {validCaptureDate(product.sourceCapturedAt) ? ruDate(product.sourceCapturedAt) : 'дата не подтверждена'}.</li>)}
            <li><a href={SRC.brightCountries} target="_blank" rel="noopener noreferrer">BrightFunded: ограничения по странам (справка)</a> — {CHECKED}.</li>
            <li><a href={SRC.brightTerms} target="_blank" rel="noopener noreferrer">BrightFunded: условия, п. 2</a> — {CHECKED}.</li>
            <li><a href={SRC.fpGetStarted} target="_blank" rel="noopener noreferrer">FundingPips: Get Started (страны, оплата, HELLO)</a> — {CHECKED}.</li>
            <li><a href={SRC.fpRewardMethods} target="_blank" rel="noopener noreferrer">FundingPips: Reward Methods (способы, минимумы и сроки выплат, страны Pay to Card и банковского перевода)</a> — Prop Firm Tracker, {FP_REWARD_METHODS}.</li>
            <li><a href={SRC.fpStandard} target="_blank" rel="noopener noreferrer">FundingPips: 2 Step Standard (циклы выплат)</a>, <a href={SRC.fpConduct} target="_blank" rel="noopener noreferrer">правила советников и копирования</a> и <a href={SRC.fpPrime} target="_blank" rel="noopener noreferrer">счёт Prime</a> — Prop Firm Tracker, {TRACKER_FP}.</li>
          </ul>
          <p>Мы не тестировали регистрацию, KYC и оплату с российскими документами и картами. Если фирма меняет правила, сравнение нужно повторить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="comparison">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            У BrightFunded и FundingPips с нами партнёрские программы, у Crypto Fund Trader — нет. Комиссия не меняет таблицы,
            порядок и оценку доступа.
          </div>
          <div className="ru-notice" data-russian-risk-disclaimer="comparison">
            <strong>Риск.</strong> Оценочные программы платные, и при нарушении лимита взнос не возвращается. Доля вознаграждения и
            прошлые выплаты не обещают дохода. Платите только ту сумму, потерю которой готовы принять.
          </div>
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-comparison-fundingpips-bright-funded-footer" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">Перейти в BrightFunded <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="fundingpips" href="/go/fundingpips?from=ru-comparison-fundingpips-bright-funded-footer" rel={goLinkRel('fundingpips')} className="btn-outline">Перейти в FundingPips <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
