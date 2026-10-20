import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { ArrowRight, BarChart3, CheckCircle2, Scale, ShieldAlert, ShieldCheck } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RussianFundedNextPayoutNotice from '@/components/RussianFundedNextPayoutNotice'
import RuPendingLink from '@/components/RuPendingLink'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import Breadcrumbs from '@/components/Breadcrumbs'
import { fundedNextOneStepPayoutLabel, isFundedNextPayoutSourceFresh } from '@/lib/fundedNextPayout'
import { minimumTradingDaysLabel } from '@/lib/challengeRuleLabels'
import { challengeCurrency, challengeTierEconomics, minimumCostToFundedUsd, getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { goLinkRel } from '@/lib/russiaAvailability'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/ftmo-vs-fundednext'
const TITLE = 'FTMO или FundedNext: что выбрать трейдеру из России в 2026'
const DESCRIPTION = 'FTMO или FundedNext: сравнение 2-Step и 1-Step, взносов в EUR и USD, просадки, сплита и выплат. FTMO закрыта для резидентов РФ, FundedNext CFD — открыта.'

// Official pages re-read by the RU Writer on this date (country lists, payment/withdrawal methods, news rule, scaling caps).
const CHECKED = '20.10.2026'
// Prop Firm Tracker captures used on this page.
const TRACKER_FTMO_PAYMENTS = '19.10.2026' // /workspace/ru-data/2026-10-19-ftmo-brightfunded-payments.md
const TRACKER_SPLIT = '14.10.2026' // /workspace/ru-data/2026-10-14-the5ers-ftmo-eu.md
const TRACKER_FN_PAYMENTS = '14.10.2026' // /workspace/ru-data/2026-10-14-payment-methods.md
const TRACKER_BRIGHT_COUNTRIES = '19.10.2026'
const TRACKER_CFT_ACCESS = '14.10.2026'

const SRC = {
  ftmoCountries: 'https://ftmo.com/en/faq/who-can-join-ftmo/',
  ftmoWithdraw: 'https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/',
  ftmoPayments: 'https://ftmo.com/en/faq/what-payment-methods-are-available/',
  ftmoPlatforms: 'https://ftmo.com/en/trading-platforms/',
  ftmoObjectives: 'https://ftmo.com/en/trading-objectives/',
  ftmoScaling: 'https://ftmo.com/en/scaling-plan/',
  ftmoTwoStep: 'https://ftmo.com/en/2-step-challenge/',
  fnCfdCountries: 'https://help.fundednext.com/en/articles/8020080-are-any-countries-restricted-on-fundednext-cfds',
  fnFuturesCountries: 'https://helpfutures.fundednext.com/en/articles/17228971-are-any-countries-restricted-on-fundednext-futures',
  fnPayments: 'https://help.fundednext.com/en/articles/8020089-what-are-the-available-payment-methods',
  fnCard: 'https://help.fundednext.com/en/articles/13990618-how-to-complete-a-card-payment-at-fundednext-cfds',
  fnWithdraw: 'https://help.fundednext.com/en/articles/8020084-how-can-i-withdraw-my-profits',
  fnNews: 'https://help.fundednext.com/en/articles/10701447-is-news-trading-allowed-at-fundednext',
  fnPlatforms: 'https://help.fundednext.com/en/articles/8019808-which-platforms-can-i-use-for-trading-at-fundednext',
  fnTwoStep: 'https://fundednext.com/cfds/stellar-2-step',
  brightCountries: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded',
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
    q: 'Что лучше: FTMO или FundedNext?',
    a: `Универсального победителя нет. Сначала страна: резидентам России FTMO недоступна, у FundedNext Россия не входит в список ограничений CFD-программ, но ограничена во FundedNext Futures (по данным на ${CHECKED}). Если обе фирмы открыты для вашей страны, сравнивайте конкретный продукт: число этапов, тип просадки, валюту взноса, долю вознаграждения и срок первой выплаты.`,
  },
  {
    q: 'Работает ли FTMO в России?',
    a: `Нет. Российская Федерация входит в официальный список стран, где FTMO не предоставляет FTMO CFDs (по данным на ${CHECKED}). В том же списке Беларусь и Казахстан. Полный разбор по странам СНГ — на странице «FTMO для россиян».`,
  },
  {
    q: 'Можно ли трейдеру из России пройти FundedNext?',
    a: `Для CFD-программ Stellar Россия не указана в списке ограничений на ${CHECKED}. FundedNext Futures Россию ограничивает. Проверка личности и способ оплаты — отдельные шаги: регистрация ещё не означает, что пройдёт KYC и сработает ваш платёж. FundedNext прямо пишет, что VPN, прокси, чужие документы или ложные данные о стране ведут к закрытию аккаунта.`,
  },
  {
    q: 'У кого выше сплит?',
    a: `У FTMO 1-Step — 90%, у 2-Step — 80% по умолчанию и 90% через Scaling Plan или Premium (по данным на ${TRACKER_SPLIT}). У FundedNext базовая доля Stellar 2-Step, 1-Step и Lite — 80% (дополнения поднимают её до 95%), у Stellar Instant — 70% со старта (по данным на 19.10.2026).`,
  },
  {
    q: 'Чем отличается просадка FTMO 1-Step от FundedNext 1-Step?',
    a: 'У FTMO 1-Step дневной лимит 3% и общий 10%, общий лимит подвижный по итогам дня (EOD-trailing). У Stellar 1-Step дневной лимит 3% и общий 6%, статический. Значения — по данным на 19.10.2026; актуальные цифры выводятся в таблице выше из проверенных записей.',
  },
  {
    q: 'Как оплатить FundedNext из России?',
    a: `FundedNext перечисляет карты (оформленные на ваше имя), PayPal, Skrill, Apple Pay, Google Pay, Binance Pay и криптовалюту (по данным на ${CHECKED}). Ни одна страница фирмы не упоминает «Мир» или карты российских банков, поэтому мы не утверждаем, что они сработают. Выплаты банковским переводом и на карту для России FundedNext не проводит.`,
  },
]

type ProductRow = { firm: 'FTMO' | 'FundedNext'; product: Challenge; price: string }

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

function sizesLabel(product: Challenge) {
  return product.accountSizes.map(tier => tier.sizeUsd).sort((a, b) => a - b).map(size => `${size / 1000}K`).join(', ')
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
    'eod-trailing': 'подвижная по итогам дня (EOD)',
    'balance-based': 'по балансу',
  } as Record<string, string>)[product.drawdownType ?? ''] ?? 'не опубликована'
}

function splitLabel(product: Challenge) {
  return validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? percent(product.profitSplitPct) : 'не подтверждено'
}

function payoutLabel(product: Challenge) {
  if (product.firmSlug === 'ftmo') {
    // Tracker 19.10.2026: first claim from day 14 after the first trade; later cadence is not public, so the stored "on-demand" is not shown.
    return product.payoutFirstDays === 14
      ? 'первый запрос — с 14-го дня после первой сделки; график следующих FTMO публично не уточняет'
      : 'срок не подтверждён'
  }
  const scoped = fundedNextOneStepPayoutLabel(product)
  if (scoped) return scoped
  if (product.payoutFirstDays === 0) return 'по запросу после выполнения условий программы'
  if (product.payoutFirstDays == null || !Number.isInteger(product.payoutFirstDays) || product.payoutFirstDays < 0) return 'срок не подтверждён'
  const frequency = ({
    weekly: 'еженедельно',
    'bi-weekly': 'далее каждые две недели',
    monthly: 'ежемесячно',
    'on-demand': 'по запросу',
  } as Record<string, string>)[product.payoutFrequency ?? ''] ?? 'следующий цикл в данных не указан однозначно'
  return `первый запрос через ${product.payoutFirstDays} дн.; ${frequency}`
}

function tierCost(product: Challenge | undefined, size: number) {
  if (!product) return { fee: 'не подтверждено', recovery: 'не подтверждено', refund: 'не подтверждён' }
  const tier = product.accountSizes.find(candidate => candidate.sizeUsd === size)
  const currency = challengeCurrency(product)
  const fee = currency === 'USD' ? tier?.priceUsd : tier?.priceEur
  if (!tier || !validPrice(fee)) return { fee: 'нет такого размера', recovery: '—', refund: '—' }
  const cost = currency === 'USD' ? minimumCostToFundedUsd(product, tier) : fee
  const economics = validPrice(product.profitSplitPct) && product.profitSplitPct <= 100 ? challengeTierEconomics(product, tier) : null
  return {
    fee: validPrice(cost) ? formatPrice(cost, currency) : 'не подтверждено',
    recovery: economics && validPrice(economics.breakEvenProfit) ? formatPrice(economics.breakEvenProfit, currency) : 'не подтверждено',
    refund: tier.refundable === true ? 'да, по условиям программы' : tier.refundable === false ? 'нет' : 'не подтверждён',
  }
}

const SHARED_SIZES = [25000, 50000, 100000, 200000]

export default function RussianFtmoVsFundedNextPage() {
  const firms = getAllFirms()
  const ftmoFirm = firms.find(firm => firm.name === 'FTMO')
  const fnFirm = firms.find(firm => firm.name === 'FundedNext')
  const ftmoProducts = getChallengesByFirm('ftmo')
  const fnProducts = getChallengesByFirm('fundednext')
  const relevantProducts = [...ftmoProducts, ...fnProducts]
  const productRows: ProductRow[] = [
    ...ftmoProducts.filter(freshProduct).map(product => ({ firm: 'FTMO' as const, product, price: priceRange(product) })),
    ...fnProducts.filter(freshProduct).map(product => ({ firm: 'FundedNext' as const, product, price: priceRange(product) })),
  ]
  const find = (firm: ProductRow['firm'], slug: string) => productRows.find(row => row.firm === firm && row.product.productSlug === slug)?.product
  const ftmoTwo = find('FTMO', 'ftmo-challenge-2-step')
  const ftmoOne = find('FTMO', 'ftmo-challenge-1-step')
  const fnTwo = find('FundedNext', 'stellar-2-step')
  const fnOne = find('FundedNext', 'stellar-1-step')
  const fnLite = find('FundedNext', 'stellar-lite')
  const fnInstant = find('FundedNext', 'stellar-instant')
  const sourceDates = relevantProducts.map(product => product.sourceCapturedAt).filter(validCaptureDate).sort()
  const latestCapture = sourceDates.at(0) ?? 'дата не указана'
  const articleDateModified = russianRouteDateModified(PATH, latestCapture)
  const completeEvidence = relevantProducts.length > 0 && productRows.length === relevantProducts.length
    && productRows.every(row => row.product.accountSizes.some(tier => validPrice(tier.priceUsd) || validPrice(tier.priceEur)))
    && [ftmoTwo, ftmoOne, fnTwo, fnOne, fnInstant].every(Boolean)
    && isFundedNextPayoutSourceFresh()
  const missingPair = <p className="ru-muted">Условия одного или обоих продуктов требуют повторной проверки. Числовое сравнение этой пары временно скрыто.</p>
  const trustpilot = (firm: typeof ftmoFirm) => firm && firm.trustpilotScore != null && firm.trustpilotCount != null && freshDate(firm.trustpilotCapturedAt)
    ? `${firm.trustpilotScore} / ${firm.trustpilotCount.toLocaleString('ru-RU')} отзывов (по данным на ${ruDate(firm.trustpilotCapturedAt!)})`
    : 'требует повторной проверки'
  const corporate = (firm: typeof ftmoFirm, extra = '') => firm && freshDate(firm.corporateCapturedAt)
    ? `${firm.founded} / ${firm.headquarters}${extra} (по данным на ${ruDate(firm.corporateCapturedAt!)})`
    : 'требует повторной проверки'
  const productsLabel = (rows: ProductRow[]) => rows.length ? rows.map(row => row.product.productName.replace('FTMO Challenge: ', 'Challenge ')).join(', ') : 'нет свежих данных'
  const ftmoRows = productRows.filter(row => row.firm === 'FTMO')
  const fnRows = productRows.filter(row => row.firm === 'FundedNext')
  const keyFields: Array<{ field: string; ftmo: ReactNode; fn: ReactNode }> = [
    {
      field: 'Доступ для резидентов РФ',
      ftmo: <>Закрыта <RuAccessBadge firm="ftmo" /></>,
      fn: <>CFD — Россия не в списке ограничений <RuAccessBadge firm="fundednext" />; Futures Россию ограничивает</>,
    },
    { field: 'Основана / офис', ftmo: corporate(ftmoFirm), fn: corporate(fnFirm, '; договорное лицо FundedNext Ltd зарегистрировано на Коморах') },
    { field: 'Платформы', ftmo: ftmoFirm?.platforms.join(', ') ?? '—', fn: fnFirm?.platforms.join(', ') ?? '—' },
    { field: 'Потолок капитала', ftmo: `до $2,000,000 через Scaling Plan (+25% каждые 4 месяца при условиях плана; по данным на ${CHECKED})`, fn: `$300K активного капитала; на странице Stellar 2-Step также указан Scale-Up Ceiling до $4,000,000 (по данным на ${CHECKED})` },
    { field: 'Программы (свежие записи)', ftmo: productsLabel(ftmoRows), fn: productsLabel(fnRows) },
    { field: 'Валюта и диапазон взноса', ftmo: ftmoRows.map(row => `${row.product.productName.replace('FTMO Challenge: ', '')}: ${row.price}`).join('; ') || '—', fn: fnRows.filter(row => row.product.phases > 0).map(row => `${row.product.productName.replace('Stellar ', '')}: ${row.price}`).join('; ') || '—' },
    { field: 'Размеры счёта', ftmo: ftmoTwo ? sizesLabel(ftmoTwo) : '—', fn: fnTwo ? `${sizesLabel(fnTwo)} (Lite: ${fnLite ? sizesLabel(fnLite) : '—'}; Instant: ${fnInstant ? sizesLabel(fnInstant) : '—'})` : '—' },
    { field: 'Доля вознаграждения', ftmo: `2-Step ${ftmoTwo ? splitLabel(ftmoTwo) : '—'} (90% через Scaling/Premium); 1-Step ${ftmoOne ? splitLabel(ftmoOne) : '—'}`, fn: `Stellar ${fnTwo ? splitLabel(fnTwo) : '—'} (дополнения до 95%); Instant ${fnInstant ? splitLabel(fnInstant) : '—'}` },
    { field: 'Первая выплата', ftmo: 'с 14-го дня после первой сделки; дальнейший график публично не уточнён', fn: `2-Step: ${fnTwo?.payoutFirstDays ?? '—'} дн., далее 14-дневные циклы; 1-Step: ${fnOne?.payoutFirstDays ?? '—'} раб. дн.; Lite: ${fnLite?.payoutFirstDays ?? '—'} дн.; Instant: по запросу при росте 5%` },
    { field: 'Trustpilot', ftmo: trustpilot(ftmoFirm), fn: trustpilot(fnFirm) },
  ]
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-фирм', url: '/ru/luchshie-prop-firmy' },
    { name: 'FTMO или FundedNext' },
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
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {completeEvidence && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-partner-comparison="ftmo-fundednext" data-russian-comparison-editorial-date={articleDateModified}>
          <RussianDataFreshnessNotice firmSlugs={['ftmo', 'fundednext']} />
          <div className="ru-eyebrow"><Scale size={14} aria-hidden="true" /> Сравнение · доступ проверен {CHECKED}</div>
          <h1>FTMO или FundedNext: что выбрать в 2026 году</h1>
          <p className="ru-lead">
            Если вы живёте в России, выбор решён ещё до сравнения цен: FTMO резидентов РФ не принимает, а CFD-программы
            FundedNext в списке ограничений Россию не называют. Если вы русскоязычный трейдер в другой стране, ниже — честное
            сравнение продуктов: этапы, просадка, взносы в EUR и USD, доля вознаграждения и выплаты.
          </p>
          <div className="ru-notice" data-russian-access-answer="first-screen">
            <strong>Коротко о доступе (по данным на {CHECKED}):</strong>
            <ul>
              <li>FTMO <RuAccessBadge firm="ftmo" /> — Российская Федерация, Беларусь и Казахстан в официальном списке ограничений.</li>
              <li>FundedNext CFD <RuAccessBadge firm="fundednext" /> — России и Казахстана в списке ограничений нет, Беларусь есть.</li>
              <li>FundedNext Futures ограничивает Россию, Беларусь и Украину.</li>
            </ul>
          </div>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Редакционная проверка: {articleDateModified}. Даты источников указаны у каждого факта.</p>
          <div className="ru-actions">
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-comparison-ftmo-fundednext" rel={goLinkRel('fundednext')} className="btn-primary btn-glow">
              Перейти в FundedNext <ArrowRight size={15} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">только CFD; FundedNext Futures Россию ограничивает</span>
          </div>
          <div className="ru-actions" data-russian-comparison-ftmo-cta="secondary-restricted">
            <RuGoLink firm="ftmo" href="/go/ftmo?from=ru-comparison-ftmo-fundednext" rel={goLinkRel('ftmo')} className="btn-outline">
              Сайт FTMO <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
            <span className="ru-muted">для резидентов других стран</span>
          </div>
          <nav className="ru-review-toc" aria-label="Содержание сравнения">
            <Link href="#verdikt">Вердикт</Link> · <Link href="#dostup">Доступ</Link> · <Link href="#programmy">Программы</Link> · <Link href="#dva-etapa">Два этапа</Link> · <Link href="#odin-etap">Один этап</Link> · <Link href="#stoimost">Стоимость</Link> · <Link href="#vyplaty">Выплаты</Link> · <Link href="#oplata">Оплата</Link> · <Link href="#alternativy">Альтернативы</Link> · <Link href="#sources">Источники</Link>
          </nav>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="comparison-not-access">
            <strong>Русский язык страницы не означает доступ.</strong>{' '}
            Решают гражданство, место проживания, проверка личности, способ оплаты и способ выплаты. Не используйте VPN,
            чужие документы или неверный адрес: обе фирмы считают это нарушением, и аккаунт закрывают.
          </div>
          <p className="ru-source-line">На странице есть партнёрская ссылка FundedNext: после регистрации мы можем получить комиссию. У FTMO партнёрской программы с нами нет — ссылка ведёт на официальный сайт без комиссии.</p>
        </div>
      </section>

      <section className="ru-section" id="verdikt">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-verdict="by-trader-type">
          <h2>Короткий вердикт: для резидентов РФ выбор решает доступ, а не цена</h2>
          <p>
            <strong>Живёте в России.</strong> FTMO не рассматривайте вовсе: Россия в её списке ограничений, и никакая скидка или
            удачная цена этого не меняет. Из этой пары остаётся FundedNext, причём только CFD-линейка Stellar. Заранее учтите две
            вещи: банковский перевод и выплату на карту FundedNext для России не проводит, а «Мир» и карты российских банков фирма
            нигде не упоминает. Прежде чем платить, разберитесь, каким способом вы будете получать деньги.
          </p>
          <p>
            <strong>Живёте в Казахстане или Беларуси.</strong> FTMO закрыта для обеих стран. FundedNext CFD ограничивает Беларусь,
            а Казахстана в её списке нет.
          </p>
          <p>
            <strong>Живёте в стране, открытой для обеих фирм.</strong> FTMO стоит выбрать, если нужны TradingView, возврат
            взноса в 2-Step и долгий путь масштабирования. Взносы при этом в евро. FundedNext удобнее, если хотите начать с
            маленького счёта, предпочитаете статическую просадку в одноэтапной программе или вам нужен счёт без оценки
            (Stellar Instant). Такого продукта у FTMO в наших данных нет.
          </p>
          <p>
            <strong>Торгуете на новостях.</strong> У FTMO новостные ограничения действуют только на счёте FTMO с типом Standard,
            а у Swing их нет. У FundedNext на профинансированном счёте прибыль от сделок вокруг важных новостей засчитывается
            только на 40%.
          </p>
        </div>
      </section>

      <section className="ru-section" id="dostup">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Доступ из России, Беларуси и Казахстана: FTMO и FundedNext</h2>
          <p>Таблица собрана по официальным спискам ограничений, проверенным {CHECKED}. «Нет в списке» означает только то, что страна не названа в ограничениях: регистрацию с российскими документами мы не тестировали.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Доступ по странам">
            <table className="ru-table" data-russian-access-table="ru-by-kz">
              <thead><tr><th>Продукт</th><th>Россия</th><th>Беларусь</th><th>Казахстан</th><th>Источник</th></tr></thead>
              <tbody>
                <tr><td><strong>FTMO CFDs</strong></td><td>закрыта</td><td>закрыта</td><td>закрыта</td><td><a href={SRC.ftmoCountries} target="_blank" rel="noopener noreferrer">ftmo.com, Who can join FTMO</a></td></tr>
                <tr><td><strong>FundedNext CFD (Stellar)</strong></td><td>нет в списке</td><td>закрыта</td><td>нет в списке</td><td><a href={SRC.fnCfdCountries} target="_blank" rel="noopener noreferrer">справка FundedNext (CFD)</a></td></tr>
                <tr><td><strong>FundedNext Futures</strong></td><td>закрыта</td><td>закрыта</td><td>покупка возможна; при переходе к live-торговле фирма отдельно рассматривает случай</td><td><a href={SRC.fnFuturesCountries} target="_blank" rel="noopener noreferrer">справка FundedNext Futures</a></td></tr>
              </tbody>
            </table>
          </div>
          <p>
            У FTMO ограничение для Украины касается только Крыма, Севастополя, Донецкой, Херсонской, Луганской и Запорожской
            областей; FundedNext Futures ограничивает Украину целиком. Полный список стран СНГ для FTMO — на странице{' '}
            <Link href="/ru/ftmo-dlya-rossiyan">FTMO для россиян</Link>, а проверка по другим фирмам — в разделе{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">для русскоязычных трейдеров</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="programmy">
        <div className="ru-shell">
          <h2>Программы: FTMO 2-Step и 1-Step против FundedNext Stellar</h2>
          <p className="ru-muted">Сначала ключевые различия фирм, затем все продукты со свежей проверкой. Значения выводятся из датированных записей; если запись старше 30 дней, строка помечается или скрывается.</p>
          {!completeEvidence && <p className="ru-notice" data-russian-comparison-evidence-status="recapture-required">Часть данных требует повторной проверки. Полное числовое сравнение сейчас не подтверждено.</p>}
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Ключевые различия FTMO и FundedNext">
            <table className="ru-table" data-russian-comparison-key-fields={keyFields.length}>
              <thead><tr><th>Параметр</th><th>FTMO</th><th>FundedNext</th></tr></thead>
              <tbody>{keyFields.map(row => <tr key={row.field}><td><strong>{row.field}</strong></td><td>{row.ftmo}</td><td>{row.fn}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Все программы FTMO и FundedNext">
            <table className="ru-table" data-russian-comparison-product-count={productRows.length} data-russian-comparison-source-links={productRows.length}>
              <thead><tr><th>Фирма</th><th>Программа</th><th>Цель</th><th>Лимиты убытка</th><th>Мин. дней</th><th>Взнос</th><th>Доля</th><th>Выплата</th><th>Источник</th></tr></thead>
              <tbody>
                {productRows.map(row => (
                  <tr key={`${row.firm}-${row.product.productSlug}`} data-russian-comparison-product={`${row.product.firmSlug}:${row.product.productSlug}`}>
                    <td><strong>{row.firm}</strong></td>
                    <td>{row.product.productName}</td>
                    <td>{targetLabel(row.product)}</td>
                    <td>Дневной: {percent(row.product.dailyLossPct)}; общий: {percent(row.product.maxLossPct)}; {drawdownLabel(row.product)}</td>
                    <td>{minimumTradingDaysLabel(row.product.minTradingDays ?? null, 'ru')}</td>
                    <td>{row.price}</td>
                    <td>{splitLabel(row.product)}</td>
                    <td data-russian-payout-product={`${row.product.firmSlug}:${row.product.productSlug}`}>{payoutLabel(row.product)}</td>
                    <td><a href={row.product.sourceUrl} target="_blank" rel="noopener noreferrer">{ruDate(row.product.sourceCapturedAt)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!productRows.length && <p className="ru-notice">Нет программ с актуальной проверкой. Цены временно скрыты.</p>}
          <p className="ru-source-line">Самая ранняя проверка программ: {ruDate(latestCapture)}. Разбор каждой фирмы — в <Link href="/ru/obzor-ftmo">обзоре FTMO</Link> и <Link href="/ru/obzor-fundednext">обзоре FundedNext</Link>.</p>
          <RussianFundedNextPayoutNotice />
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-scenarios="like-for-like-pairs">
          {ftmoTwo && fnTwo ? <article id="dva-etapa" data-russian-comparison-pair="two-step">
            <h2>Два этапа: FTMO Challenge 2-Step или Stellar 2-Step</h2>
            <p>
              Цели FTMO 2-Step — {targetLabel(ftmoTwo)}, у Stellar 2-Step — {targetLabel(fnTwo)}. На первом этапе FundedNext
              требует меньше, на втором цели равны. Лимиты убытка совпадают: дневной {percent(ftmoTwo.dailyLossPct)} против {percent(fnTwo.dailyLossPct)},
              общий {percent(ftmoTwo.maxLossPct)} против {percent(fnTwo.maxLossPct)}; граница у FTMO {drawdownLabel(ftmoTwo)}, у FundedNext {drawdownLabel(fnTwo)}.
              Минимум торговых дней: {minimumTradingDaysLabel(ftmoTwo.minTradingDays ?? null, 'ru')} у FTMO и {minimumTradingDaysLabel(fnTwo.minTradingDays ?? null, 'ru')} у FundedNext.
            </p>
            <p>
              Деньги после оценки: у FTMO базовая доля {splitLabel(ftmoTwo)}, а 90% даёт план масштабирования или Premium
              (по данным на {TRACKER_SPLIT}). Первый запрос — с 14-го дня после первой сделки. У FundedNext базовая доля {splitLabel(fnTwo)},
              первый запрос через {fnTwo.payoutFirstDays ?? '—'} дн., затем каждые 14 дней. Возврат взноса есть у обеих программ,
              у FundedNext — с первым вознаграждением.
            </p>
            <p className="ru-source-line">Источники: <a href={ftmoTwo.sourceUrl} target="_blank" rel="noopener noreferrer">FTMO 2-Step</a> ({ruDate(ftmoTwo.sourceCapturedAt)}); <a href={fnTwo.sourceUrl} target="_blank" rel="noopener noreferrer">Stellar 2-Step</a> ({ruDate(fnTwo.sourceCapturedAt)}).</p>
          </article> : <article id="dva-etapa"><h2>Два этапа: FTMO Challenge 2-Step или Stellar 2-Step</h2>{missingPair}</article>}

          {ftmoOne && fnOne ? <article id="odin-etap" data-russian-comparison-pair="one-step">
            <h2>Один этап: FTMO 1-Step или Stellar 1-Step</h2>
            <p>
              Главное различие этой пары — механика общего лимита. У FTMO 1-Step он {percent(ftmoOne.maxLossPct)} и {drawdownLabel(ftmoOne)}:
              граница поднимается вслед за прибылью на закрытии дня. У Stellar 1-Step общий лимит {percent(fnOne.maxLossPct)}, зато {drawdownLabel(fnOne)} и
              считается от стартового баланса. Дневной лимит у обеих — {percent(ftmoOne.dailyLossPct)} и {percent(fnOne.dailyLossPct)}, цель — {targetLabel(ftmoOne)} и {targetLabel(fnOne)}.
            </p>
            <p>
              У FTMO 1-Step есть правило стабильности: лучший день не должен давать больше 50% общей прибыли. Оно действует для
              счетов из заказов, оформленных с 12.10.2026 (по данным на 15.10.2026). Доля вознаграждения — {splitLabel(ftmoOne)} у FTMO и {splitLabel(fnOne)} у FundedNext.
              Срок первой выплаты у Stellar 1-Step: {payoutLabel(fnOne)}. Возврат взноса у FTMO 1-Step {ftmoOne.accountSizes.some(tier => tier.refundable) ? 'предусмотрен' : 'не предусмотрен'}.
            </p>
            <p className="ru-source-line">Источники: <a href={ftmoOne.sourceUrl} target="_blank" rel="noopener noreferrer">FTMO 1-Step</a> ({ruDate(ftmoOne.sourceCapturedAt)}); <a href={SRC.ftmoObjectives} target="_blank" rel="noopener noreferrer">FTMO Trading Objectives</a>; <a href={fnOne.sourceUrl} target="_blank" rel="noopener noreferrer">Stellar 1-Step</a> ({ruDate(fnOne.sourceCapturedAt)}).</p>
          </article> : <article id="odin-etap"><h2>Один этап: FTMO 1-Step или Stellar 1-Step</h2>{missingPair}</article>}

          <article id="bez-ocenki" data-russian-comparison-pair="instant-only-fundednext">
            <h2>Без оценки: только у FundedNext (Stellar Instant)</h2>
            {fnInstant ? <p>
              Stellar Instant продаётся без оценочного этапа, размеры от ${(fnInstant.accountSizes[0]?.sizeUsd ?? 0).toLocaleString('en-US')}, взнос {priceRange(fnInstant)}.
              Общий лимит — {percent(fnInstant.maxLossPct)}, {drawdownLabel(fnInstant)}. Стартовая доля — {splitLabel(fnInstant)}, по описанию продукта с третьего уровня она растёт до 80%.
              Вознаграждение можно запросить сразу при росте счёта на 5% или в обычном 14-дневном цикле. Возврата взноса нет.
              У FTMO в наших данных продукта без оценки нет. Подробно — на странице <Link href="/ru/fundednext-stellar-instant">FundedNext Stellar Instant</Link> и в подборке <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирм без челленджа</Link>.
            </p> : missingPair}
          </article>
        </div>
      </section>

      <section className="ru-section" id="stoimost">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Стоимость на одинаковом размере счёта</h2>
          <p>Сравниваем только размеры, которые продают обе фирмы. Взносы FTMO указаны в евро, FundedNext — в долларах. Курс мы не подставляем, так что сравнивать столбцы нужно с учётом валюты. «Прибыль для возврата затрат» посчитана методикой сайта из взноса и доли вознаграждения — это не прогноз заработка.</p>
          <div className="ru-table-wrap" tabIndex={0} role="region" aria-label="Стоимость одинаковых размеров счёта">
            <table className="ru-table" data-russian-comparison-cost="shared-sizes">
              <thead><tr><th>Счёт</th><th>FTMO 2-Step</th><th>Stellar 2-Step</th><th>FTMO 1-Step</th><th>Stellar 1-Step</th></tr></thead>
              <tbody>{SHARED_SIZES.map(size => {
                const cells = [ftmoTwo, fnTwo, ftmoOne, fnOne].map(product => tierCost(product, size))
                return <tr key={size} data-russian-comparison-cost-size={size}>
                  <td>${size.toLocaleString('en-US')}</td>
                  {cells.map((cell, index) => <td key={index}>{cell.fee}<br /><span className="ru-muted">возврат затрат: {cell.recovery}; возврат взноса: {cell.refund}</span></td>)}
                </tr>
              })}</tbody>
            </table>
          </div>
          <p>Кроме общих размеров, у FTMO есть счёт 10K, у FundedNext — 6K и 15K (у Lite и Instant свои размеры). Промокоды, дополнения и комиссия платёжного способа в таблицу не входят. Действующие предложения с датой проверки — на странице <Link href="/ru/promokody-prop-firm">промокодов проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Сплит и выплаты</h2>
          <p>
            <strong>FTMO.</strong> 2-Step — 80% по умолчанию, 90% через Scaling Plan или Premium; 1-Step — 90% (по данным на {TRACKER_SPLIT}).
            Первую выплату можно запросить на 14-й день после первой сделки. График следующих выплат FTMO публично не уточняет
            (по данным на {TRACKER_FTMO_PAYMENTS}). Способы: банковский перевод, Visa Direct / Mastercard Send (до $20 000),
            Skrill (до $3 000) и криптовалюта. FTMO пишет, что сама комиссию за вывод не берёт; проверка заявки и отправка денег
            занимают обычно по 1–2 рабочих дня.
          </p>
          <p>
            <strong>FundedNext.</strong> Базовая доля Stellar 2-Step, 1-Step и Lite — 80%, с дополнениями до 95%. Stellar Instant
            стартует с 70% (по данным на 19.10.2026). Способы вывода: USDT (ERC20, TRC20), USDC (ERC20), Confirmo, RiseWorks,
            банковский перевод, карта и зачисление на FNmarkets. Для России банковский перевод и выплата на карту недоступны —
            Россия есть в обоих списках исключений. Доступна ли россиянам RiseWorks, мы не подтверждали. Обработку заявки
            FundedNext обещает в течение 24 часов (по данным на {CHECKED}).
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.ftmoWithdraw} target="_blank" rel="noopener noreferrer">FTMO: How do I withdraw my reward</a>; <a href={SRC.fnWithdraw} target="_blank" rel="noopener noreferrer">FundedNext: How can I withdraw my profits</a>. Сравнение выплат у других фирм — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="oplata">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Оплата челленджа из России</h2>
          <p>
            <strong>FundedNext</strong> принимает карты Visa, Mastercard и Amex, оформленные на имя владельца аккаунта: при
            несовпадении имени заказ отменяют. Кроме того — PayPal (комиссия 1%), Skrill (3%), Apple Pay, Google Pay, Binance Pay и
            криптовалюта с комиссией 1%: BTC, ETH, LTC, DOGE, SOL, USDT (TRC20 и ERC20), USDC (ERC20). Данные по оплате — на {TRACKER_FN_PAYMENTS},
            страница способов оплаты перепроверена {CHECKED}. Российских и СНГ-методов в списке локальных способов нет. «Мир» и карты
            российских банков FundedNext не упоминает, поэтому мы не утверждаем, что они сработают.
          </p>
          <p>
            <strong>FTMO</strong> для резидентов России закрыта, так что её касса важна только для тех, кто живёт в других странах.
            Бесплатно: карта (Visa, Mastercard, Diners Club, Discover), Apple Pay, Google Pay, Revolut Pay. С комиссией 3%: PayPal, Skrill и
            криптовалюта. Банковский перевод — только в EUR/CZK, 2–5 рабочих дней (по данным на {TRACKER_FTMO_PAYMENTS}).
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.fnPayments} target="_blank" rel="noopener noreferrer">FundedNext: payment methods</a>; <a href={SRC.fnCard} target="_blank" rel="noopener noreferrer">FundedNext: card payment</a>; <a href={SRC.ftmoPayments} target="_blank" rel="noopener noreferrer">FTMO: payment methods</a>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Платформы, советники, новости</h2>
          <p>
            Платформы FTMO: {ftmoFirm?.platforms.join(', ')}; TradingView подключается через брокерский профиль OANDA. Платформы
            FundedNext: {fnFirm?.platforms.join(', ')}; TradingView фирма упоминает только для анализа. Советники у обеих фирм
            разрешены с ограничениями: условия зависят от стратегии и этапа, поэтому перед запуском EA откройте правила выбранной
            программы. Подробнее о советниках FundedNext — на странице <Link href="/ru/fundednext-mt5">FundedNext MT5</Link>.
          </p>
          <p>
            Новости. У FTMO ограничения на торговлю во время выбранных новостей действуют только для счетов Standard и только на
            этапе FTMO Account; на оценке их нет, у типа Swing их нет вовсе (по данным на 15.10.2026). У FundedNext сделки за 5 минут
            до и 5 минут после важной новости по связанному инструменту засчитываются только на 40% прибыли. Правило
            применяется на профинансированных счетах Stellar 1-Step, 2-Step и Lite, челленджа оно не касается (по данным на {CHECKED}).
          </p>
          <p className="ru-source-line">Источники: <a href={SRC.ftmoPlatforms} target="_blank" rel="noopener noreferrer">FTMO: platforms</a>; <a href={SRC.ftmoTwoStep} target="_blank" rel="noopener noreferrer">FTMO 2-Step (новости)</a>; <a href={SRC.fnPlatforms} target="_blank" rel="noopener noreferrer">FundedNext: platforms</a>; <a href={SRC.fnNews} target="_blank" rel="noopener noreferrer">FundedNext: news trading</a>.</p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell" data-russian-alternatives="bright-funded-first">
          <h2>Если FTMO закрыта: альтернативы для трейдеров из РФ</h2>
          <p className="ru-muted">Порядок редакционный. Каждая ссылка ниже ведёт на сайт фирмы; бейдж показывает статус доступа для резидентов РФ по нашим данным.</p>
          <div className="ru-grid">
            <article className="ru-card" data-russian-alternative="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded <RuAccessBadge firm="bright-funded" /></h3>
              <p className="ru-muted">Россия не в списке ограничений BrightFunded (справка, по данным на {TRACKER_BRIGHT_COUNTRIES}). Взносы в EUR, как у FTMO.</p>
              <p className="ru-source-line"><Link href="/ru/obzor-bright-funded">Обзор BrightFunded</Link> · <Link href="/ru/fundednext-vs-bright-funded">FundedNext или BrightFunded</Link> · <RuPendingLink href="/ru/ftmo-vs-bright-funded">FTMO или BrightFunded</RuPendingLink></p>
              <div className="ru-actions">
                <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-ftmo-vs-fundednext-alt-bright-funded" rel={goLinkRel('bright-funded')} className="btn-primary">Перейти в BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russian-alternative="fundednext">
              <BarChart3 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext CFD <RuAccessBadge firm="fundednext" /></h3>
              <p className="ru-muted">Участник этого сравнения: CFD-программы Россию в ограничениях не называют, Futures — называют (по данным на {CHECKED}).</p>
              <p className="ru-source-line"><Link href="/ru/obzor-fundednext">Обзор FundedNext</Link> · <Link href="/ru/fundednext-vs-fundingpips">FundedNext или FundingPips</Link></p>
              <div className="ru-actions">
                <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-ftmo-vs-fundednext-alt-fundednext" rel={goLinkRel('fundednext')} className="btn-outline">Перейти в FundedNext <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russian-alternative="crypto-fund-trader">
              <CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Crypto Fund Trader <RuAccessBadge firm="crypto-fund-trader" /></h3>
              <p className="ru-muted">Только через Match-Trader: там ограничений по странам нет; MT5 недоступен резидентам США (по данным на {TRACKER_CFT_ACCESS}).</p>
              <p className="ru-source-line"><RuPendingLink href="/ru/obzor-crypto-fund-trader">Обзор Crypto Fund Trader</RuPendingLink></p>
              <div className="ru-actions">
                <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-ftmo-vs-fundednext-alt-cft" rel={goLinkRel('crypto-fund-trader')} className="btn-outline">Перейти в Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
              </div>
            </article>
          </div>
          <p className="ru-source-line">Полный рейтинг с отметкой доступа — <Link href="/ru/luchshie-prop-firmy">лучшие проп-фирмы для трейдеров из РФ</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content ru-review-article" data-russian-comparison-decision="four-checks">
          <h2>Как принять решение за 4 проверки</h2>
          <ol>
            <li><strong>Страна.</strong> Найдите свою страну проживания и гражданство в обоих списках ограничений. Если FTMO вас не принимает, сравнение на этом закончено.</li>
            <li><strong>Тип продукта.</strong> Два этапа, один этап или без оценки. Для FundedNext отдельно проверьте, что выбираете CFD, а не Futures.</li>
            <li><strong>Лимиты риска.</strong> Сопоставьте дневной и общий лимит с вашей худшей серией сделок. Подвижная граница FTMO 1-Step и статическая у Stellar 1-Step по-разному ведут себя после прибыльной недели.</li>
            <li><strong>Полная стоимость.</strong> Взнос в своей валюте, комиссия платёжного способа, повторная попытка и то, как вы будете получать выплаты.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="sources">
        <div className="ru-shell ru-content ru-review-article">
          <h2>Источники и дата проверки</h2>
          <p>Цены, цели, лимиты, доли и сроки выплат берутся из датированных записей по программам. Списки стран, способы оплаты и вывода, правило новостей FundedNext и потолки капитала перепроверены на официальных страницах {CHECKED}. Способы оплаты и вывода FTMO взяты из проверки Prop Firm Tracker от {TRACKER_FTMO_PAYMENTS}. Trustpilot — по данным на 15.10.2026.</p>
          <ul>
            {relevantProducts.map(product => <li key={`${product.firmSlug}:${product.productSlug}`}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{product.productName}: официальные условия</a> — {validCaptureDate(product.sourceCapturedAt) ? ruDate(product.sourceCapturedAt) : 'дата не подтверждена'}.</li>)}
            <li><a href={SRC.ftmoCountries} target="_blank" rel="noopener noreferrer">FTMO: кто может участвовать</a> — {CHECKED}.</li>
            <li><a href={SRC.ftmoScaling} target="_blank" rel="noopener noreferrer">FTMO: Scaling Plan</a> — {CHECKED}.</li>
            <li><a href={SRC.fnCfdCountries} target="_blank" rel="noopener noreferrer">FundedNext CFD: ограничения по странам</a> — {CHECKED}.</li>
            <li><a href={SRC.fnFuturesCountries} target="_blank" rel="noopener noreferrer">FundedNext Futures: ограничения по странам</a> — {CHECKED}.</li>
            <li><a href={SRC.fnTwoStep} target="_blank" rel="noopener noreferrer">FundedNext Stellar 2-Step: Allocation Cap</a> — {CHECKED}.</li>
            <li><a href={SRC.brightCountries} target="_blank" rel="noopener noreferrer">BrightFunded: ограничения по странам</a> — {TRACKER_BRIGHT_COUNTRIES}.</li>
          </ul>
          <p>Мы не тестировали регистрацию, KYC и оплату с российскими документами и картами и не получали выплаты по каждому сценарию. Если фирма меняет правила, сравнение нужно повторить перед оплатой.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="comparison">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            У FundedNext, BrightFunded и Crypto Fund Trader ссылки идут через наш маршрут /go. Партнёрская комиссия возможна там, где у нас есть программа (FundedNext, BrightFunded). У FTMO и Crypto Fund Trader партнёрства нет. Комиссия не меняет таблицы, порядок и оценку доступа.
          </div>
          <div className="ru-notice" data-russian-risk-disclaimer="comparison">
            <strong>Риск.</strong> Оценочные программы платные, и при нарушении лимита взнос не возвращается. Прошлые результаты и доля вознаграждения не обещают дохода. Платите только ту сумму, потерю которой готовы принять.
          </div>
          <div className="ru-actions">
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-comparison-ftmo-fundednext-footer" rel={goLinkRel('fundednext')} className="btn-primary btn-glow">Перейти в FundedNext <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="ftmo" href="/go/ftmo?from=ru-comparison-ftmo-fundednext-footer" rel={goLinkRel('ftmo')} className="btn-outline">Сайт FTMO — для резидентов других стран <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
          </div>
          <p className="ru-source-line"><ShieldAlert size={14} aria-hidden="true" /> Нужна англоязычная версия? <Link href="/compare/ftmo-vs-fundednext" hrefLang="en">Открыть сравнение FTMO и FundedNext на английском</Link>.</p>
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
