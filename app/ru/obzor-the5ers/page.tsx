import type { Metadata } from 'next'
import type React from 'react'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import Breadcrumbs from '@/components/Breadcrumbs'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { authorSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'
import { isProductSetFresh } from '@/lib/reviewFreshness'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { RU_NOT_A_RUSSIA_OPTION, RU_RELATED, ruPublishedLinks, ruReviewFirmFor, ruReviewRank } from '@/lib/ruRelatedLinks'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-the5ers'
export const revalidate = 86400

// Brief 2026-10-23-obzor-the5ers.md §2: title 58, meta 150, H1 different from the title.
const TITLE = 'The5ers: обзор 2026 — программы, правила, доступ из России'
const H1 = 'Обзор The5ers: программы, правила и доступ из России'
// «75–80%» = starting split: Growth 75%, High Stakes 80% (challenges/the5ers.json). Update in the same commit if the data changes.
const DESCRIPTION = 'The5ers проп: High Stakes, Pro/Hyper Growth и Bootcamp, цели, просадка, доля 75–80% и выплаты раз в 2 недели. Россия и Беларусь в запрещённых странах.'

// Official the5ers.com pages re-read by RU Writer on this date; raw HTML and text in
// /workspace/tradersfundhub/evidence/the5ers-2026-10-21/ (Terms, programme pages, FAQ articles below).
const CHECKED_ISO = '2026-10-21'
const CHECKED = '21.10.2026'
// BrightFunded help article «What countries are restricted» (updated 15.09.2026), re-read on CHECKED.
// Crypto Fund Trader: FAQ + Terms §7.3 quotes in content/data/russian-market-evidence.json (Prop Firm Tracker, 20.10.2026).
const CFT_ACCESS = '20.10.2026'

const SRC = {
  terms: 'https://the5ers.com/terms-and-conditions/',
  highStakes: 'https://the5ers.com/high-stakes/',
  growth: 'https://the5ers.com/hyper-growth/',
  bootcamp: 'https://the5ers.com/bootcamp/',
  withdrawals: 'https://the5ers.com/faqs/withdrawals-everything-you-need-to-know/',
  minWithdrawal: 'https://the5ers.com/faqs/what-are-the-minimum-withdrawal-amounts-and-limits/',
  platforms: 'https://the5ers.com/faqs/which-trading-platform-do-you-use/',
  drawdown: 'https://the5ers.com/faqs/what-is-drawdown-and-how-is-it-calculated/',
  hsDrawdown: 'https://the5ers.com/faqs/what-is-the-drawdown-rule-for-high-stakes/',
  pgDrawdown: 'https://the5ers.com/faqs/what-is-the-drawdown-rule-for-progrowth/',
  hsPayout: 'https://the5ers.com/faqs/payout-policy-and-hub-credit-in-the-high-stakes-program/',
  hyperFaq: 'https://the5ers.com/faqs/how-does-the-hyper-growth-program-work/',
  bootcampFaq: 'https://the5ers.com/faqs/how-does-the-bootcamp-program-work/',
  consistency: 'https://the5ers.com/faqs/what-is-constancy-rule/',
  brightCountries: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded',
  cftTerms: 'https://cryptofundtrader.com/terms-and-conditions/',
  trustpilot: 'https://www.trustpilot.com/review/the5ers.com',
}

function S({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener noreferrer">{children}</a>
}

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['the5ers', 'the5ers проп', 'the5ers отзывы', 'the5ers правила', 'the5ers россия'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

function ruDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : 'дата не указана'
}

function usd(value: number | null | undefined) {
  return value == null ? '—' : `$${value.toLocaleString('en-US')}`
}

function sizeLabel(value: number) {
  return `$${(value / 1000).toLocaleString('en-US')}K`
}

function targets(product: Challenge) {
  const values = [product.profitTargets?.phase1, product.profitTargets?.phase2, product.profitTargets?.phase3]
    .filter((value): value is number => value != null)
  return values.length ? values.map(value => `${value}%`).join(' → ') : '—'
}

function lossLabel(product: Challenge) {
  const daily = product.dailyLossPct == null ? 'нет дневного лимита' : `${product.dailyLossPct}% в день`
  const max = product.maxLossPct == null ? '—' : `${product.maxLossPct}% макс.`
  const reduced = product.accountSizes.filter(tier => tier.maxLossUsd != null && tier.sizeUsd > 0)
  if (!reduced.length) return `${daily} / ${max}`
  const tiers = reduced.map(tier => sizeLabel(tier.sizeUsd)).join(', ')
  const first = reduced[0]
  const dailyPct = first.dailyLossUsd != null ? Math.round((first.dailyLossUsd / first.sizeUsd) * 100) : null
  const maxPct = Math.round(((first.maxLossUsd ?? 0) / first.sizeUsd) * 100)
  return `${daily} / ${max}; ${tiers}: ${dailyPct ?? '—'}% / ${maxPct}%`
}

function daysLabel(product: Challenge) {
  if (product.minTradingDays == null) return 'не указан'
  if (product.minTradingDays === 0) return 'нет'
  return `${product.minTradingDays} прибыльных дня`
}

function splitLabel(product: Challenge) {
  return product.profitSplitPct == null ? 'до 100% (по данным The5ers)' : `${product.profitSplitPct}% на старте`
}

function priceLabel(product: Challenge) {
  return product.accountSizes.map(tier => {
    const second = tier.activationFeeUsd != null ? ` + ${usd(tier.activationFeeUsd)}` : ''
    return `${sizeLabel(tier.sizeUsd)} — ${usd(tier.priceUsd)}${second}`
  }).join(' · ')
}

const ALT_NOTES: Record<string, { note: string; sourceHref?: string; fallbackHref?: string; fallbackLabel?: string }> = {
  'bright-funded': {
    sourceHref: SRC.brightCountries,
    note: `Россия не названа в списке ограниченных стран справки BrightFunded (Куба, Иран, КНДР, Сирия, Вьетнам, Пакистан; по данным на ${CHECKED}).`,
  },
  'crypto-fund-trader': {
    note: `По FAQ и условиям (п. 7.3) Crypto Fund Trader на Match-Trader ограничений по странам нет; MT5 недоступен резидентам США (по данным на ${CFT_ACCESS}).`,
    sourceHref: SRC.cftTerms,
    fallbackHref: '/blog/crypto-fund-trader-review',
    fallbackLabel: 'Обзор Crypto Fund Trader (англ.)',
  },
}

export default function RussianThe5ersReviewPage() {
  const firm = getAllFirms().find(candidate => candidate.name === 'The5ers')
  const products = getChallengesByFirm('the5ers')
  const fresh = products.filter(product => isChallengeFresh(product))
  const allFresh = isProductSetFresh(products) && isChallengeFresh({ sourceCapturedAt: CHECKED_ISO })
  const bySlug = (slug: string) => fresh.find(product => product.productSlug === slug)
  const hsNew = bySlug('high-stakes-new')
  const hsClassic = bySlug('high-stakes-classic')
  const proGrowth = bySlug('pro-growth')
  const hyper = bySlug('hyper-growth')
  const bootcamp = bySlug('bootcamp')
  const latestCapture = fresh.map(product => product.sourceCapturedAt).sort().at(-1)
    ?? products.map(product => product.sourceCapturedAt).sort().at(-1) ?? CHECKED_ISO
  const prices = fresh.flatMap(product => product.accountSizes.map(tier => tier.priceUsd).filter((price): price is number => price != null && price > 0))
  const minPrice = prices.length ? Math.min(...prices) : null
  const minPriceTier = fresh.flatMap(product => product.accountSizes.map(tier => ({ product, tier })))
    .find(item => item.tier.priceUsd === minPrice)
  const hs100k = hsNew?.accountSizes.find(tier => tier.sizeUsd === 100000)
  // Worked example (brief §14): High Stakes New $10K, every input read from challenges/the5ers.json.
  const ex = hsNew?.accountSizes.find(tier => tier.sizeUsd === 10000)
  const exFee = ex?.priceUsd ?? null
  const pct = (base: number | null | undefined, value: number | null | undefined) => base != null && value != null ? Math.round(base * value) / 100 : null
  const exT1 = pct(ex?.sizeUsd, hsNew?.profitTargets?.phase1)
  const exT2 = pct(ex?.sizeUsd, hsNew?.profitTargets?.phase2)
  const exDaily = pct(ex?.sizeUsd, hsNew?.dailyLossPct)
  const exFloor = ex && hsNew?.maxLossPct != null ? ex.sizeUsd - (pct(ex.sizeUsd, hsNew.maxLossPct) ?? 0) : null
  const exProfitDay = pct(ex?.sizeUsd, 0.5)
  const money2 = (value: number | null) => value == null ? '—' : `$${value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`
  const GROSS = 800
  const WITHDRAWAL_FEE_PCT = 3.5
  const net = (split: number | null | undefined) => split == null ? null : Math.round(GROSS * split * (100 - WITHDRAWAL_FEE_PCT)) / 10000
  const hsShare = hsNew?.profitSplitPct != null ? GROSS * hsNew.profitSplitPct / 100 : null
  const growthShare = proGrowth?.profitSplitPct != null ? GROSS * proGrowth.profitSplitPct / 100 : null
  const bootcampTotals = (bootcamp?.accountSizes ?? []).map(tier => ({ size: tier.sizeUsd, entry: tier.priceUsd, funded: tier.activationFeeUsd, total: tier.priceUsd != null && tier.activationFeeUsd != null ? tier.priceUsd + tier.activationFeeUsd : null }))
  const trustpilotDate = firm?.trustpilotCapturedAt ? ruDate(firm.trustpilotCapturedAt) : null
  const closedHref = ruClosedFirmsHref()
  const dateModified = russianRouteDateModified(PATH, latestCapture)

  const alternatives = (RU_RELATED[PATH] ?? [])
    .filter(link => link.slot === 'alternatives')
    .flatMap(link => {
      const review = ruReviewFirmFor(link.href)
      if (!review || RU_NOT_A_RUSSIA_OPTION.has(review.firm)) return []
      return [{ ...review, href: link.href, status: russiaStatusFor(review.firm) }]
    })
    .filter(item => item.status === 'available')
    .map((item, index) => ({ item, index }))
    .sort((a, b) => ruReviewRank(a.item, a.item.status) - ruReviewRank(b.item, b.item.status) || a.index - b.index)
    .map(({ item }) => item)
  const compareLinks = ruPublishedLinks(PATH, 'compare')
  const altNames = alternatives.map(item => item.name).join(', затем ')

  const faqs: RussianFaqItem[] = [
    {
      q: 'Можно ли торговать в The5ers из России?',
      a: `Нет. Россия входит в список запрещённых территорий (Forbidden Territory) в условиях The5ers, по данным на ${CHECKED}. Условия требуют не проживать в такой стране, а обход ограничений через VPN называют существенным нарушением: при проверке KYC счёт могут закрыть.`,
    },
    {
      q: 'А из Казахстана, Беларуси или Украины?',
      a: `Беларусь и Крым в списке запрещённых территорий. Казахстан и остальная Украина в нём не названы, но список открыт («including but not limited to»), поэтому отсутствие страны не подтверждает доступ. Решает страна проживания (а по тексту в подвале сайта — и гражданство), а не язык. Израиль, где живёт много русскоязычных трейдеров, тоже в списке (по данным на ${CHECKED}).`,
    },
    {
      q: 'Сколько стоит челлендж The5ers?',
      a: minPriceTier
        ? `От ${usd(minPrice)} за ${minPriceTier.product.productName} ${sizeLabel(minPriceTier.tier.sizeUsd)} (по данным на ${ruDate(minPriceTier.product.sourceCapturedAt)}). Bootcamp оплачивается в два платежа: взнос при покупке и плата при получении финансирования. Все цены — в таблице программ выше.`
        : 'Свежих цен в наших данных сейчас нет: смотрите цену на странице оформления заказа The5ers.',
    },
    {
      q: 'Как The5ers выплачивает прибыль?',
      a: `Первый запрос — через 14 дней после активации финансируемого счёта, затем раз в 2 недели. Способы: Rise, криптовалюта (USDT TRC20, USDC ERC20, ETH, LTC, до $1 500 за выплату) и банковский перевод; с каждой выплаты удерживается комиссия 3,5%. Минимум — $150 на стандартных CFD-программах (по данным на ${CHECKED}).`,
    },
    {
      q: 'Какая просадка в The5ers?',
      a: `High Stakes: 5% в день и 10% от начального баланса, на счетах $50K и $100K — 4% и 8%. Pro Growth и Hyper Growth: уровень закрытия 6% ниже начального баланса и лимит 3% в день. Bootcamp: 5% максимального убытка на этапах оценки, по примеру The5ers граница закрытия считается от начального баланса и не поднимается вслед за прибылью (по данным на ${CHECKED}).`,
    },
    {
      q: 'Какие альтернативы The5ers для трейдеров из России?',
      a: `${altNames || 'BrightFunded, затем Crypto Fund Trader'}: обе фирмы не называют Россию в своих ограничениях. Бейдж доступа у каждой — в блоке альтернатив. Правила у них другие, поэтому сравнивайте программы, а не только доступ.`,
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Рейтинг проп-компаний', url: '/ru/luchshie-prop-firmy' },
    { name: 'Обзор The5ers' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-10-23',
    dateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {allFresh && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-the5ers="restricted" data-russian-review-editorial-date={dateModified}>
          <RussianDataFreshnessNotice firmSlugs={['the5ers']} />
          <div className="ru-eyebrow"><ShieldAlert size={14} aria-hidden="true" /> <RuAccessBadge firm="the5ers" /> · условия проверены {CHECKED}</div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            The5ers — форекс-проп-фирма, основанная в {firm?.founded ?? '2016'} году, с четырьмя программами: двухэтапной High Stakes,
            одноэтапными Pro Growth и Hyper Growth и трёхэтапной Bootcamp. Резидентам России она недоступна: Россия и Беларусь
            стоят в списке запрещённых территорий её условий. Из России смотрите BrightFunded или Crypto Fund Trader. Если вы живёте в
            другой стране, ниже — цены, правила и выплаты, сверенные с официальными страницами.
          </p>
          <p className="ru-source-line">Автор: редакция Traders Fund Hub · Обновлено: {ruDate(dateModified)}</p>
          <p className="ru-source-line" data-russian-the5ers-verified={CHECKED_ISO}>
            Проверено {ruDate(latestCapture)}–{CHECKED} по официальным страницам: <S href={SRC.terms}>условия</S>, <S href={SRC.highStakes}>High Stakes</S>,{' '}
            <S href={SRC.growth}>Growth</S>, <S href={SRC.bootcamp}>Bootcamp</S>, <S href={SRC.withdrawals}>FAQ о выплатах</S>. Полный список — в разделе «Источники».
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="the5ers">
            <strong>Партнёрское раскрытие.</strong> С The5ers у нас нет партнёрской программы: ссылка на её сайт обычная. По кнопкам альтернатив мы можем получить комиссию.
          </div>
          <div className="ru-actions" data-russian-the5ers-official="non-affiliate">
            <RuGoLink firm="the5ers" href="/go/the5ers?from=ru-obzor-the5ers-official" rel={goLinkRel('the5ers')} className="btn-outline">
              Официальный сайт The5ers <ArrowRight size={14} aria-hidden="true" />
            </RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section" id="korotko">
        <div className="ru-shell ru-content" data-russian-the5ers-verdict="human">
          <h2>Коротко: сильная форекс-проп-фирма, но не для резидентов РФ</h2>
          <p>
            The5ers работает с {firm?.founded ?? '2016'} года и продаёт не один челлендж, а четыре разных контракта. Самый дешёвый вход — {usd(minPrice)} за
            {minPriceTier ? ` ${minPriceTier.product.productName} ${sizeLabel(minPriceTier.tier.sizeUsd)}` : ' минимальный счёт'}. У всех программ нет
            срока на прохождение, а максимальный убыток считается от начального баланса, а не от пика счёта. Слабые места тоже конкретные:
            3,5% с каждой выплаты, первая выплата только через 14 дней после финансирования, окно новостей в High Stakes и правило
            согласованности, которое фирма применяет «в зависимости от типа счёта или региона», не называя программы.
          </p>
          <p>
            Наша оценка в базе — {firm?.score ?? '—'}/10.{' '}
            {firm?.trustpilotScore != null && firm?.trustpilotCount != null
              ? <>На <a href={firm.trustpilotUrl ?? 'https://www.trustpilot.com/review/the5ers.com'} target="_blank" rel="nofollow noopener noreferrer">Trustpilot</a> — {firm.trustpilotScore.toLocaleString('ru-RU')} при {firm.trustpilotCount.toLocaleString('ru-RU')} отзывах{trustpilotDate ? ` (по данным на ${trustpilotDate})` : ''}. Отзывы не проверяют страну автора и не гарантируют выплату конкретному трейдеру.</>
              : null}
          </p>
          <p>
            <strong>Для кого:</strong> трейдеру, который живёт в стране вне списка ограничений (например, в Казахстане) и подтвердил доступ у
            поддержки, если ему нужны дешёвый вход, торговля без срока и понятная граница убытка. <strong>Не для кого:</strong> резидента России или Беларуси — здесь вопрос закрыт условиями фирмы, а не
            вкусом. Из России начинайте с {altNames || 'BrightFunded, затем Crypto Fund Trader'}.
          </p>
          <p className="ru-source-line">
            Источники чисел: цена — <S href={SRC.highStakes}>High Stakes</S>; 3,5% и 14 дней — <S href={SRC.withdrawals}>FAQ о выплатах</S>; новости — <S href={SRC.highStakes}>High Stakes</S>;
            согласованность — <S href={SRC.consistency}>FAQ</S> (по данным на {CHECKED}); год основания и оценка — наша база по фирмам; Trustpilot — данные <S href={SRC.trustpilot}>Trustpilot</S>{trustpilotDate ? ` на ${trustpilotDate}` : ''}.
          </p>
        </div>
      </section>

      <section className="ru-section" id="strany">
        <div className="ru-shell ru-content" data-russian-the5ers-territories="cis">
          <h2>The5ers и страны СНГ: что в списке ограничений</h2>
          <p>
            В <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условиях The5ers</a> есть определение запрещённой территории:
          </p>
          <blockquote lang="en">{firm?.russiaSourceQuote ?? '“Forbidden Territory” means any jurisdiction where Our Services are not available…'}</blockquote>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Страна</th><th>В списке The5ers (по данным на {CHECKED})</th></tr></thead>
              <tbody>
                <tr><td><strong>Россия</strong></td><td>Да</td></tr>
                <tr><td><strong>Беларусь</strong></td><td>Да</td></tr>
                <tr><td><strong>Украина</strong></td><td>Только Крым</td></tr>
                <tr><td><strong>Израиль</strong></td><td>Да</td></tr>
                <tr><td><strong>Казахстан</strong></td><td>Не назван</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Условия разрешают открыть счёт только тому, кто «do not reside in any Forbidden Territory», то есть не проживает в такой стране. Текст в
            подвале сайта формулирует шире: услуги недоступны «residents or citizens» — резидентам <em>или гражданам</em> этих стран, а пользоваться
            сервисом с запрещённой территории «strictly prohibited». Формулировки расходятся, поэтому:
          </p>
          <ul data-russian-the5ers-access-explainer="three-cases">
            <li><strong>Вы живёте в России</strong> — нет: это прямо запрещено условиями.</li>
            <li><strong>Вы гражданин РФ и живёте в Казахстане, Грузии, Армении, Сербии или ЕС</strong> — по условиям решает страна проживания, по тексту в подвале — и гражданство. Уточните письменно у The5ers до оплаты; мы не обещаем, что доступ будет.</li>
            <li><strong>Вы живёте за рубежом и приезжаете в Россию</strong> — пользоваться сервисом с запрещённой территории нельзя, поэтому не торгуйте и не входите в кабинет, пока находитесь в РФ.</li>
          </ul>
          <p>
            <strong>«Не в списке» не значит «доступ подтверждён».</strong> Список открыт словами «including but not limited to», и фирма оставляет
            за собой право отклонить любую заявку. Обход ограничений через VPN или другие технические средства условия называют существенным
            нарушением: если на любом этапе, включая KYC после прохождения оценки, выяснится, что вы резидент запрещённой страны, счёт
            закроют сразу. В этом случае условия не предусматривают возврата взносов, а накопленная прибыль аннулируется. VPN и чужие данные — не
            способ попасть в The5ers, а причина потерять и оплату, и прибыль.
          </p>
          <p className="ru-source-line">Источник: <S href={SRC.terms}>Terms and Conditions</S> и подвал сайта the5ers.com — по данным на {CHECKED}.</p>
          <p>
            Какие фирмы открыты для русскоязычных трейдеров и как проверить свою страну — на странице{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для русскоязычных трейдеров</Link>
            {closedHref ? <>; фирмы, которые закрылись или прекратили приём, — в списке <Link href={closedHref}>закрытых проп-фирм</Link></> : null}.
          </p>
        </div>
      </section>

      <section className="ru-section" id="programmy">
        <div className="ru-shell" data-russian-the5ers-programs={latestCapture}>
          <div className="ru-content">
            <h2>Программы The5ers: High Stakes, Pro Growth, Hyper Growth, Bootcamp</h2>
            <p>
              В таблице — только программы с данными не старше 30 дней. Цены указаны в USD за разовый взнос; у Bootcamp второй платёж
              вносится при получении финансирования. Как устроены этапы оценки в целом — в руководстве{' '}
              <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работают челленджи проп-фирм</Link>.
            </p>
          </div>
          {fresh.length > 0 ? (
            <div className="ru-table-wrap">
              <table className="ru-table" data-russian-the5ers-programs-table={fresh.length}>
                <thead><tr><th>Программа</th><th>Этапы</th><th>Цель</th><th>Дневной / макс. убыток</th><th>Мин. дни</th><th>Доля</th><th>Размер — цена (USD)</th></tr></thead>
                <tbody>
                  {fresh.map(product => (
                    <tr key={product.productSlug}>
                      <td><strong>{product.productName}</strong><br /><span className="ru-muted">проверено {ruDate(product.sourceCapturedAt)}</span></td>
                      <td>{product.phases}</td>
                      <td>{targets(product)}</td>
                      <td>{lossLabel(product)}</td>
                      <td>{daysLabel(product)}</td>
                      <td>{splitLabel(product)}</td>
                      <td>{priceLabel(product)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ru-content ru-muted">Свежих данных о программах The5ers сейчас нет: цены скрыты до повторной проверки.</p>
          )}
          <p className="ru-content ru-muted">
            Цены по всем вкладкам мы дополнительно сверили с официальными страницами программ {CHECKED}. «Мин. дни» в High Stakes и Pro Growth —
            прибыльные дни, а не торговые. В Bootcamp размер счёта — итоговый финансируемый баланс: этапы оценки идут на меньших счетах.
            Источники: <S href={SRC.highStakes}>High Stakes</S>, <S href={SRC.growth}>Growth</S>, <S href={SRC.bootcamp}>Bootcamp</S>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="high-stakes">
        <div className="ru-shell ru-content">
          <h2>High Stakes (2 этапа): New и Classic</h2>
          <p>
            High Stakes — двухэтапная программа с плечом 1:100 и двумя вариантами: New с целью {hsNew?.profitTargets?.phase1 ?? '—'}% на первом
            этапе и Classic с целью {hsClassic?.profitTargets?.phase1 ?? '—'}%; на втором этапе у обоих {hsNew?.profitTargets?.phase2 ?? '—'}%.
            New дешевле: например, {usd(hs100k?.priceUsd)} против {usd(hsClassic?.accountSizes.find(tier => tier.sizeUsd === 100000)?.priceUsd)} за $100K.
          </p>
          <ul>
            <li><strong>Прибыльные дни.</strong> Минимум 3 на каждом этапе. Прибыльным считается день, когда закрытые сделки дали не меньше 0,5% начального баланса. Обычные торговые дни без такой прибыли не засчитываются.</li>
            <li><strong>Просадка.</strong> Максимальный убыток — 10% от начального баланса (в FAQ — «absolute drawdown»), дневной — 5% от большего из баланса или эквити на конец предыдущего дня по серверу. На $50K и $100K — 4% и 8%.</li>
            <li><strong>Новости.</strong> Сделки за 2 минуты до и после важных новостей запрещены.</li>
            <li><strong>Награды за этапы.</strong> После первого этапа — фиксированная награда от $2 до $40 в зависимости от размера счёта. В Hub начисляется 10% стоимости после этапа 1 и 20% после этапа 2 (Hub Credits, вывести нельзя). На финансируемом счёте 70% стоимости возвращается с первой выплатой, если прибыль не меньше $150 и счёт активен не меньше 14 дней. Возврат считается только с части, оплаченной деньгами, а не Hub Credits.</li>
            <li><strong>Лимит выплаты на крупных счетах.</strong> На финансируемом $50K — не больше $3 000 за выплату при минимальном результате $300, на $100K — $4 000 и $500.</li>
            <li><strong>Рост.</strong> Счёт увеличивается после каждой цели 10%. Доля 80% растёт до 85% от $175 000, до 90% от $250 000 и до 100% плюс фиксированная выплата от $350 000; потолок — $500 000.</li>
          </ul>
          <p className="ru-source-line">
            Источники: <a href={SRC.highStakes} target="_blank" rel="nofollow noopener noreferrer">High Stakes</a>, <a href={SRC.hsDrawdown} target="_blank" rel="nofollow noopener noreferrer">правило просадки High Stakes</a>, <a href={SRC.hsPayout} target="_blank" rel="nofollow noopener noreferrer">выплаты и Hub Credit в High Stakes</a> — по данным на {CHECKED}.
          </p>
        </div>
      </section>

      {ex && exFee != null ? (
        <section className="ru-section" id="primer">
          <div className="ru-shell ru-content" data-russian-the5ers-worked-example="high-stakes-new-10k">
            <h2>Пример: High Stakes New $10K от оплаты до первой выплаты</h2>
            <p className="ru-muted">Пример, не прогноз. Все входные данные — со страницы <S href={SRC.highStakes}>High Stakes</S> (по данным на {ruDate(hsNew?.sourceCapturedAt ?? latestCapture)}) и <S href={SRC.hsPayout}>FAQ о Hub Credit</S>, <S href={SRC.withdrawals}>FAQ о выплатах</S> (по данным на {CHECKED}).</p>
            <ol>
              <li><strong>Взнос:</strong> {money2(exFee)}.</li>
              <li><strong>Этап 1:</strong> цель {hsNew?.profitTargets?.phase1}% = {money2(exT1)}. Нужно минимум 3 прибыльных дня, каждый — закрытая прибыль не меньше 0,5% = {money2(exProfitDay)}. Награда за этап на странице — $10; в Hub начисляется 10% взноса = {money2(pct(exFee, 10))} (Hub Credits, не деньги).</li>
              <li><strong>Этап 2:</strong> цель {hsNew?.profitTargets?.phase2}% = {money2(exT2)}, снова минимум 3 прибыльных дня; в Hub — ещё 20% взноса = {money2(pct(exFee, 20))}.</li>
              <li><strong>Границы убытка на всём пути:</strong> дневной лимит {hsNew?.dailyLossPct}% = {money2(exDaily)} от большего из баланса или эквити на конец прошлого дня; счёт закрывается, если эквити опустится ниже {money2(exFloor)} ({hsNew?.maxLossPct}% от начального баланса).</li>
              <li><strong>Финансирование и первая выплата:</strong> запрос — не раньше чем через 14 дней после активации финансируемого счёта. С первой выплатой можно вывести 70% взноса = {money2(pct(exFee, 70))}, если прибыль не меньше $150 и счёт активен не меньше 14 дней.</li>
            </ol>
            <h3>Сколько дойдёт до вас с выплаты</h3>
            <p>
              Формула: прибыль × доля − комиссия 3,5% за вывод. Если финансируемый $10K заработал {money2(GROSS)}: доля {hsNew?.profitSplitPct}% = {money2(hsShare)}, минус 3,5% — получите {money2(net(hsNew?.profitSplitPct))}.
              Это выше минимума $150 и ниже лимита $1 500 на одну криптовыплату. Для сравнения, в Pro Growth при доле {proGrowth?.profitSplitPct}% те же {money2(GROSS)} дают {money2(growthShare)}, после комиссии — {money2(net(proGrowth?.profitSplitPct))}.
              Банк-получатель может удержать свою комиссию сверху.
            </p>
            <p className="ru-source-line">Источники: <S href={SRC.highStakes}>High Stakes</S>, <S href={SRC.hsDrawdown}>правило просадки</S>, <S href={SRC.hsPayout}>Hub Credit и возврат 70%</S>, <S href={SRC.withdrawals}>способы и комиссия</S>, <S href={SRC.minWithdrawal}>минимум $150</S>, <S href={SRC.growth}>доля Growth</S>.</p>
          </div>
        </section>
      ) : null}

      <section className="ru-section" id="growth">
        <div className="ru-shell ru-content">
          <h2>Pro Growth и Hyper Growth (1 этап)</h2>
          <p>
            Обе программы — один этап с целью {proGrowth?.profitTargets?.phase1 ?? '—'}%, уровнем закрытия {proGrowth?.maxLossPct ?? '—'}% ниже
            начального баланса, дневным лимитом {proGrowth?.dailyLossPct ?? '—'}% и плечом 1:30. Доля на старте —{' '}
            {proGrowth?.profitSplitPct ?? '—'}%: по таблице роста она остаётся такой до $300 000, становится 80% на $350 000 и 80–100% от $400 000.
            Заголовок «до 100%» — вершина этой лестницы, а не стартовые условия.
          </p>
          <ul>
            <li><strong>Pro Growth.</strong> Дешевле ({usd(proGrowth?.accountSizes[0]?.priceUsd)} за {proGrowth?.accountSizes[0] ? sizeLabel(proGrowth.accountSizes[0].sizeUsd) : '—'}), требует 3 прибыльных дня, есть счёт $50K. Можно держать до 4 счетов, по одному каждого размера.</li>
            <li><strong>Hyper Growth.</strong> Заметно дороже ({usd(hyper?.accountSizes[0]?.priceUsd)} за {hyper?.accountSizes[0] ? sizeLabel(hyper.accountSizes[0].sizeUsd) : '—'}), зато без минимума дней: этап засчитывается сразу при достижении цели. Счёта $50K нет, а суммарный стартовый капитал на оценке — не больше $40 000. Счёт удваивается на каждой цели, рост — до $4 млн.</li>
            <li><strong>Дневной лимит работает по-разному.</strong> В Hyper Growth 3% — это «пауза»: торговля отключается до 00:00 по серверу MT5, счёт не закрывается. Для Pro Growth FAQ фирмы пишет, что достижение 3% дневного убытка ведёт к закрытию счёта, хотя в шапке страницы Growth стоит «No daily stop-loss». Пока фирма не устранит расхождение, считайте 3% в Pro Growth жёстким лимитом.</li>
            <li><strong>Новости.</strong> Разрешены, кроме стратегий-«вилок» вокруг новостей и практик из условий.</li>
          </ul>
          <p className="ru-source-line">
            Источники: <a href={SRC.growth} target="_blank" rel="nofollow noopener noreferrer">Growth</a>, <a href={SRC.hyperFaq} target="_blank" rel="nofollow noopener noreferrer">как работает Hyper Growth</a>, <a href={SRC.pgDrawdown} target="_blank" rel="nofollow noopener noreferrer">правило просадки Pro Growth</a> — по данным на {CHECKED}.
          </p>
        </div>
      </section>

      <section className="ru-section" id="bootcamp">
        <div className="ru-shell ru-content" data-russian-the5ers-bootcamp-drawdown="neutral">
          <h2>Bootcamp: дешёвый вход и плата при финансировании</h2>
          <p>
            Bootcamp — три этапа оценки с целью {bootcamp?.profitTargets?.phase1 ?? '—'}% на каждом и максимальным убытком{' '}
            {bootcamp?.maxLossPct ?? '—'}% без дневного лимита. Платите в два приёма: небольшой взнос при покупке и вторую часть, только когда
            получите финансирование (суммы — в таблице выше). Этапы идут на меньших счетах: для плана $100K это $25K, $50K и $75K.
          </p>
          <ul>
            <li><strong>Финансируемый счёт.</strong> Цель 5% для роста, максимальный убыток {bootcamp?.fundedMaxLossPct ?? '—'}% и пауза при {bootcamp?.fundedDailyLossPct ?? '—'}% за день. Рост — на каждой цели 5%, до $4 млн.</li>
            <li><strong>Просадка.</strong> Максимальный убыток — 5%. По примеру The5ers, при начальном балансе $10 000 счёт закрывается ниже $9 500; если эквити выросло до $10 300, допустимая просадка становится $800, то есть граница закрытия остаётся на $9 500. Отдельно тип просадки для Bootcamp фирма не называет.</li>
            <li><strong>Доля.</strong> До 100% (по данным The5ers); стартовый процент на странице не опубликован, поэтому в таблице числа нет.</li>
            {bootcampTotals.length ? <li data-russian-the5ers-bootcamp-cost="entry-plus-funded"><strong>Полная стоимость до финансирования:</strong> {bootcampTotals.map(row => `${sizeLabel(row.size)} — ${usd(row.entry)} + ${usd(row.funded)} = ${usd(row.total)}`).join('; ')}. Вторую часть платите, только если прошли все три этапа; при провале теряете лишь первый взнос, а новая попытка — это новая покупка.</li> : null}
            <li><strong>Ограничения.</strong> Не больше 4 активных счетов (1 × $250K, 1 × $100K, 2 × $20K), и на каждом должна быть своя стратегия. Взнос за Bootcamp не возвращается.</li>
          </ul>
          <p className="ru-source-line">
            Источники: <a href={SRC.bootcamp} target="_blank" rel="nofollow noopener noreferrer">Bootcamp</a>, <a href={SRC.bootcampFaq} target="_blank" rel="nofollow noopener noreferrer">как работает Bootcamp</a>, <a href={SRC.drawdown} target="_blank" rel="nofollow noopener noreferrer">как считается просадка</a> — по данным на {CHECKED}.
          </p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content">
          <h2>Выплаты: раз в 2 недели, комиссия 3,5%</h2>
          <p>
            Первый запрос на вывод — через 14 дней после активации финансируемого счёта, следующие — каждые 2 недели после последней одобренной
            выплаты. После увеличения счёта 14-дневный отсчёт начинается заново. Одобренные запросы обрабатываются до 3 рабочих дней; перед
            запросом нужно закрыть все сделки.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-the5ers-payout-methods="four">
              <thead><tr><th>Способ</th><th>Условия</th><th>Комиссия</th></tr></thead>
              <tbody>
                <tr><td><strong>Rise</strong></td><td>email в Rise должен совпадать с email в The5ers</td><td>3,5%</td></tr>
                <tr><td><strong>Криптовалюта</strong></td><td>USDT (TRC20), USDC (ERC20), ETH, LTC; до $1 500 за выплату, больше — через Rise</td><td>3,5%</td></tr>
                <tr><td><strong>Банковский перевод</strong></td><td>лимиты и сроки зависят от банка</td><td>3,5% + комиссия банка-получателя</td></tr>
                <tr><td><strong>Hub Credits</strong></td><td>не деньги: только на покупку новых счетов</td><td>нет</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Минимальная выплата — $150 на стандартных CFD-программах и $250 на Summer Plan; делить одну выплату между двумя способами нельзя.
            Для High Stakes $50K и $100K действуют отдельные лимиты (см. выше). Как такие условия выглядят у других фирм — в обзоре{' '}
            <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
          </p>
          <p className="ru-source-line">
            Источники: <a href={SRC.withdrawals} target="_blank" rel="nofollow noopener noreferrer">выплаты: всё, что нужно знать</a>, <a href={SRC.minWithdrawal} target="_blank" rel="nofollow noopener noreferrer">минимальные суммы</a> — по данным на {CHECKED}.
          </p>
          <div className="ru-notice" data-russian-the5ers-payout-risks="firm-rules">
            <strong>Что может пойти не так на выплате.</strong>
            <ul>
              <li><strong>KYC и интервью.</strong> На любом этапе проверки The5ers может запросить документы и видеоинтервью; на него нужно записаться и прийти с email, привязанным к счёту, а назначить и пройти его — в течение 5 рабочих дней (<S href={SRC.terms}>условия</S>).</li>
              <li><strong>Крупные суммы.</strong> Если выплата превышает лимит на одну транзакцию, который устанавливает фирма, её переводят частями по $10 000 в неделю (<S href={SRC.terms}>условия</S>).</li>
              <li><strong>Согласованность.</strong> Для части счетов лучший день не должен превышать 30%, 50% или другой процент общей прибыли — иначе выплату придётся отложить (<S href={SRC.consistency}>FAQ</S>).</li>
              <li><strong>Новости в High Stakes.</strong> Сделки за 2 минуты до и после важных новостей запрещены (<S href={SRC.highStakes}>High Stakes</S>).</li>
              <li><strong>Страна.</strong> Если при KYC выяснится проживание в запрещённой стране или обход через VPN, счёт закрывают без возврата взносов и с аннулированием прибыли (<S href={SRC.terms}>условия</S>).</li>
            </ul>
            <p className="ru-source-line">По данным на {CHECKED}.</p>
          </div>
        </div>
      </section>

      <section className="ru-section" id="platformy">
        <div className="ru-shell ru-content">
          <h2>Платформы и правила торговли</h2>
          <ul>
            <li><strong>Платформы.</strong> Для клиентов не из США — MetaTrader 5, cTrader и TradingView; клиентам из США доступен только TradingView. cTrader стоит на $10 больше цены программы. Выбор платформы окончательный: после покупки сменить её нельзя.</li>
            <li><strong>Копирование сделок.</strong> Условия прямо запрещают координацию и копирование сделок с другими трейдерами или счетами.</li>
            <li><strong>Советники (EA).</strong> Ограничены: условия запрещают, например, советники, которые скальпируют на ночном ролловере, и сторонние советники, уже используемые другими трейдерами.</li>
            <li><strong>Перенос позиций.</strong> Через ночь и выходные разрешён во всех программах; за удержание индексов на выходных фирма предупреждает о высоком свопе.</li>
            <li><strong>Фьючерсы.</strong> Условия упоминают торговлю фьючерсными контрактами, а FAQ о минимальных выплатах называет фьючерсные программы. Их правила мы не проверяли; обзор описывает только CFD-программы.</li>
            <li><strong>Неактивность.</strong> Счёт без сделок больше 30 дней подряд закрывается или истекает.</li>
            <li><strong>Правило согласованности.</strong> На страницах программ его нет, но в FAQ The5ers сказано, что процент зависит от типа счёта или региона — 30%, 50% или другой. Лучший день не должен превышать этот процент от общей прибыли при запросе выплаты или роста счёта. Какие счета затронуты, фирма не уточняет: спросите поддержку для своего счёта.</li>
          </ul>
          <p className="ru-source-line">
            Источники: <a href={SRC.platforms} target="_blank" rel="nofollow noopener noreferrer">платформы для CFD</a>, <a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">условия</a>, <a href={SRC.consistency} target="_blank" rel="nofollow noopener noreferrer">правило согласованности</a> — по данным на {CHECKED}.
          </p>
        </div>
      </section>

      <section className="ru-section" id="plyusy-minusy">
        <div className="ru-shell ru-content">
          <h2>Плюсы и минусы</h2>
          <h3>Плюсы</h3>
          <ul>
            <li>Нет срока на прохождение ни в одной из четырёх программ.</li>
            <li>Низкий вход: от {usd(minPrice)} в High Stakes, а Bootcamp откладывает основную плату до финансирования.</li>
            <li>Максимальный убыток считается от начального баланса: прибыль увеличивает запас до границы закрытия.</li>
            <li>Опубликованы способы выплат, сроки обработки, минимумы и комиссии, включая криптовалюту и Rise.</li>
          </ul>
          <h3>Минусы</h3>
          <ul>
            <li>3,5% удерживается с каждой выплаты, у банковского перевода — ещё и комиссия банка.</li>
            <li>Первая выплата — только через 14 дней после финансирования, и отсчёт сбрасывается после каждого роста счёта.</li>
            <li>Правило согласованности может действовать в зависимости от счёта или региона, но на страницах программ его нет.</li>
            <li>Дневное правило Pro Growth описано противоречиво: в FAQ — закрытие счёта, на странице — «No daily stop-loss».</li>
          </ul>
          <p className="ru-source-line">Источники: <S href={SRC.highStakes}>High Stakes</S>, <S href={SRC.growth}>Growth</S>, <S href={SRC.bootcamp}>Bootcamp</S>, <S href={SRC.withdrawals}>FAQ о выплатах</S>, <S href={SRC.consistency}>правило согласованности</S>, <S href={SRC.pgDrawdown}>просадка Pro Growth</S> — по данным на {CHECKED}.</p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell" data-russian-alternatives="bright-funded-first">
          <h2>Альтернативы The5ers для трейдеров из России</h2>
          <p className="ru-muted">Порядок редакционный: сначала фирмы, открытые для РФ по нашим данным. Бейдж — статус доступа для резидентов России.</p>
          <div className="ru-grid">
            {alternatives.map(item => {
              const notes = ALT_NOTES[item.firm]
              return (
                <article key={item.firm} className="ru-card" data-russian-alternative={item.firm}>
                  <h3>{item.name} <RuAccessBadge firm={item.firm} /></h3>
                  {notes ? <p className="ru-muted">{notes.note}{notes.sourceHref ? <> (<S href={notes.sourceHref}>источник</S>)</> : null}</p> : null}
                  <p className="ru-source-line">
                    <RuPendingLink href={item.href}>Обзор {item.name}</RuPendingLink>
                    {notes?.fallbackHref ? <> · <Link href={notes.fallbackHref} hrefLang="en">{notes.fallbackLabel}</Link></> : null}
                  </p>
                  <div className="ru-actions">
                    <RuGoLink firm={item.firm} href={`/go/${item.firm}?from=ru-obzor-the5ers-alt-${item.firm}`} rel={goLinkRel(item.firm)} className={item.firm === 'bright-funded' ? 'btn-primary' : 'btn-outline'}>
                      Перейти в {item.name} <ArrowRight size={14} aria-hidden="true" />
                    </RuGoLink>
                  </div>
                </article>
              )
            })}
          </div>
          {compareLinks.length > 0 ? (
            <p className="ru-source-line">Сравнения: {compareLinks.map((link, index) => <span key={link.href}>{index > 0 ? ' · ' : null}<Link href={link.href}>{link.anchor}</Link></span>)}</p>
          ) : null}
          <div className="ru-notice" data-russian-risk-disclaimer="the5ers">
            <strong>Риск.</strong> Торговля с плечом связана с высоким риском, а взнос за оценку может не вернуться. Не обходите ограничения стран через VPN или чужие данные.
          </div>
        </div>
      </section>

      <section className="ru-section" id="faq">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
          <p className="ru-source-line">Источники ответов: <S href={SRC.terms}>условия</S>, <S href={SRC.highStakes}>High Stakes</S>, <S href={SRC.growth}>Growth</S>, <S href={SRC.bootcamp}>Bootcamp</S>, <S href={SRC.drawdown}>просадка</S>, <S href={SRC.withdrawals}>выплаты</S>, <S href={SRC.minWithdrawal}>минимумы</S> — по данным на {CHECKED}.</p>
        </div>
      </section>

      <section className="ru-section" id="istochniki">
        <div className="ru-shell ru-content">
          <h2>Источники и дата проверки</h2>
          <p>
            Цены, цели, лимиты и доли — из наших датированных данных по программам (по данным на {ruDate(latestCapture)}), сверенных с
            официальными страницами {CHECKED}. Условия, страны, выплаты, платформы и правила перечитаны на сайте The5ers {CHECKED}.
            Регистрацию, KYC и оплату с российскими документами мы не тестировали. Английская версия обзора —{' '}
            <Link href="/blog/the5ers-review" hrefLang="en">The5ers review</Link>.
          </p>
          <ul>
            <li><a href={SRC.terms} target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions (Forbidden Territory, возврат, VPN, KYC)</a> — {CHECKED}</li>
            <li><a href={SRC.highStakes} target="_blank" rel="nofollow noopener noreferrer">High Stakes</a>, <a href={SRC.growth} target="_blank" rel="nofollow noopener noreferrer">Growth</a>, <a href={SRC.bootcamp} target="_blank" rel="nofollow noopener noreferrer">Bootcamp</a> — {CHECKED}</li>
            <li><a href={SRC.withdrawals} target="_blank" rel="nofollow noopener noreferrer">FAQ: выплаты</a>, <a href={SRC.minWithdrawal} target="_blank" rel="nofollow noopener noreferrer">минимумы</a>, <a href={SRC.hsPayout} target="_blank" rel="nofollow noopener noreferrer">Hub Credit в High Stakes</a> — {CHECKED}</li>
            <li><a href={SRC.drawdown} target="_blank" rel="nofollow noopener noreferrer">FAQ: просадка</a>, <a href={SRC.hsDrawdown} target="_blank" rel="nofollow noopener noreferrer">High Stakes</a>, <a href={SRC.pgDrawdown} target="_blank" rel="nofollow noopener noreferrer">Pro Growth</a>, <a href={SRC.consistency} target="_blank" rel="nofollow noopener noreferrer">правило согласованности</a>, <a href={SRC.platforms} target="_blank" rel="nofollow noopener noreferrer">платформы</a> — {CHECKED}</li>
            <li><a href={SRC.brightCountries} target="_blank" rel="nofollow noopener noreferrer">BrightFunded: ограниченные страны</a> — {CHECKED}</li>
          </ul>
        </div>
      </section>

      <RuRelatedBlock path={PATH} />
    </>
  )
}
