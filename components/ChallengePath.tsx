import type { Challenge, DrawdownType, PayoutFrequency } from '@/lib/firms'
import { buildChallengePaths, type ChallengePathGroup } from '@/lib/challengePath'
import { formatMatrixDate, shortProductName, type PriceMatrixLocale } from '@/lib/priceMatrix'

/**
 * C15 "path to funded" diagram (design/article-format-spec.md §4 C15, P3): the
 * evaluation stages, the loss limits and the first-payout rule of each product
 * as one left-to-right (top-to-bottom on phones) flow, instead of facts spread
 * over prose and three tables. Server component, no JS. Every figure is the
 * firm's published value from content/data/challenges; a missing value reads
 * "not published" rather than being filled in. The caller passes only fresh
 * products.
 */

const MAX_VISIBLE_GROUPS = 3

const COPY = {
  en: {
    title: (firm: string) => `${firm}: path to a funded account`,
    ariaLabel: (firm: string) => `${firm} path to funded account, one flow per product group`,
    phase: (n: number) => `Phase ${n}`,
    instant: 'Instant funded',
    instantNote: 'No evaluation stage',
    funded: 'Funded',
    target: (pct: number) => `${pct}% profit target`,
    targetMissing: 'Profit target not published',
    minDays: (n: number) => n === 0 ? 'No minimum trading days' : `Min ${n} trading days`,
    maxDays: (n: number) => `Max ${n} days`,
    unlimitedDays: 'No time limit',
    split: (pct: number) => `${pct}% profit split`,
    splitMissing: 'Profit split not published',
    firstPayout: (days: number) => `First payout request after ${days} days`,
    firstPayoutMissing: 'First payout timing not published',
    limitsLabel: 'Loss limits',
    fundedLimitsLabel: 'Funded-stage limits',
    daily: (pct: number) => `daily ${pct}%`,
    max: (pct: number) => `max ${pct}%`,
    drawdown: (label: string) => `${label} drawdown`,
    limitsMissing: 'Loss limits not published',
    moreSummary: (n: number) => `${n} more ${n === 1 ? 'product' : 'products'} with different terms`,
    checked: 'Checked',
    note: 'Figures are the firm’s published terms for each product, not converted or rounded. “Not published” means we could not verify it on the firm’s own pages.',
    frequency: { weekly: 'weekly', 'bi-weekly': 'every 2 weeks', monthly: 'monthly', 'on-demand': 'on request' } as Record<PayoutFrequency, string>,
    drawdownLabel: { static: 'static', trailing: 'trailing', 'eod-trailing': 'end-of-day trailing', 'balance-based': 'balance-based' } as Record<DrawdownType, string>,
  },
  ru: {
    title: (firm: string) => `${firm}: путь до funded-счёта`,
    ariaLabel: (firm: string) => `${firm}: путь до funded-счёта, схема для каждой группы продуктов`,
    phase: (n: number) => `Этап ${n}`,
    instant: 'Сразу funded',
    instantNote: 'Без оценочного этапа',
    funded: 'Funded',
    target: (pct: number) => `Цель по прибыли ${pct}%`,
    targetMissing: 'Цель по прибыли не опубликована',
    minDays: (n: number) => n === 0 ? 'Без минимума торговых дней' : `Минимум ${n} торговых дн.`,
    maxDays: (n: number) => `Максимум ${n} дн.`,
    unlimitedDays: 'Без лимита по времени',
    split: (pct: number) => `Доля трейдера ${pct}%`,
    splitMissing: 'Доля трейдера не опубликована',
    firstPayout: (days: number) => `Первая заявка на выплату через ${days} дн.`,
    firstPayoutMissing: 'Срок первой выплаты не опубликован',
    limitsLabel: 'Лимиты убытка',
    fundedLimitsLabel: 'Лимиты funded-этапа',
    daily: (pct: number) => `дневной ${pct}%`,
    max: (pct: number) => `общий ${pct}%`,
    drawdown: (label: string) => `просадка: ${label}`,
    limitsMissing: 'Лимиты убытка не опубликованы',
    moreSummary: (n: number) => `Ещё ${n} ${n === 1 ? 'продукт' : 'продукта(ов)'} с другими условиями`,
    checked: 'Проверено',
    note: 'Цифры — опубликованные условия фирмы по каждому продукту, без конвертации и округления. «Не опубликовано» значит, что на собственных страницах фирмы подтвердить значение не удалось.',
    frequency: { weekly: 'еженедельно', 'bi-weekly': 'каждые 2 недели', monthly: 'ежемесячно', 'on-demand': 'по запросу' } as Record<PayoutFrequency, string>,
    drawdownLabel: { static: 'статическая', trailing: 'трейлинг', 'eod-trailing': 'трейлинг по концу дня', 'balance-based': 'по балансу' } as Record<DrawdownType, string>,
  },
} as const

type Copy = (typeof COPY)[PriceMatrixLocale]

function limitsText(limits: Partial<ChallengePathGroup['limits']>, copy: Copy) {
  const parts = [
    limits.dailyLossPct != null ? copy.daily(limits.dailyLossPct) : null,
    limits.maxLossPct != null ? copy.max(limits.maxLossPct) : null,
    limits.drawdownType ? copy.drawdown(copy.drawdownLabel[limits.drawdownType]) : null,
  ].filter((part): part is string => part != null)
  return parts.join(' · ')
}

function Group({ group, firmName, copy }: { group: ChallengePathGroup; firmName: string; copy: Copy }) {
  const label = group.products.map(product => shortProductName(firmName, product.productName)).join(' · ')
  const evaluationLimits = limitsText(group.limits, copy)
  const fundedLimits = group.fundedLimits ? limitsText(group.fundedLimits, copy) : ''
  const dayFacts = [
    group.minTradingDays != null ? copy.minDays(group.minTradingDays) : null,
    group.maxTradingDaysUnlimited ? copy.unlimitedDays : group.maxTradingDays != null ? copy.maxDays(group.maxTradingDays) : null,
  ].filter((fact): fact is string => fact != null)
  return (
    <div className="challenge-path__group" data-challenge-path-group={group.products.map(product => product.productSlug).join(',')}>
      <p className="challenge-path__label">{label}</p>
      <ol className="challenge-path__steps">
        {group.phases === 0 ? (
          <li className="challenge-path__step challenge-path__step--instant" data-challenge-path-step="instant">
            <span className="challenge-path__badge" aria-hidden="true">0</span>
            <strong>{copy.instant}</strong>
            <span className="challenge-path__fact">{copy.instantNote}</span>
          </li>
        ) : group.stages.map((stage, index) => (
          <li className="challenge-path__step challenge-path__step--phase" key={stage.phase} data-challenge-path-step={`phase-${stage.phase}`}>
            <span className="challenge-path__badge" aria-hidden="true">{stage.phase}</span>
            <strong>{copy.phase(stage.phase)}</strong>
            <span className="challenge-path__fact">{stage.targetPct != null ? copy.target(stage.targetPct) : copy.targetMissing}</span>
            {index === 0 && dayFacts.map(fact => <span className="challenge-path__fact" key={fact}>{fact}</span>)}
          </li>
        ))}
        <li className="challenge-path__step challenge-path__step--funded" data-challenge-path-step="funded">
          <span className="challenge-path__badge" aria-hidden="true">✓</span>
          <strong>{copy.funded}</strong>
          <span className="challenge-path__fact">{group.profitSplitPct != null ? copy.split(group.profitSplitPct) : copy.splitMissing}</span>
          <span className="challenge-path__fact">
            {group.payoutFirstDays != null ? copy.firstPayout(group.payoutFirstDays) : copy.firstPayoutMissing}
            {group.payoutFrequency ? `, ${copy.frequency[group.payoutFrequency]}` : ''}
          </span>
        </li>
      </ol>
      <p className="challenge-path__limits">
        <span className="challenge-path__limits-label">{copy.limitsLabel}:</span> {evaluationLimits || copy.limitsMissing}
        {fundedLimits && <><br /><span className="challenge-path__limits-label">{copy.fundedLimitsLabel}:</span> {fundedLimits}</>}
      </p>
    </div>
  )
}

export default function ChallengePath({ products, firmName, firmSlug, locale, id }: {
  products: Challenge[]
  firmName: string
  firmSlug: string
  locale: PriceMatrixLocale
  id?: string
}) {
  const groups = buildChallengePaths(products)
  if (!groups.length) return null
  const copy = COPY[locale]
  const visible = groups.slice(0, MAX_VISIBLE_GROUPS)
  const hidden = groups.slice(MAX_VISIBLE_GROUPS)
  const dates = [...new Set(groups.flatMap(group => group.capturedAt))].sort()
  return (
    <figure className={`challenge-path challenge-path--${locale}`} id={id} data-challenge-path={firmSlug} data-challenge-path-groups={groups.length}
      role="group" aria-label={copy.ariaLabel(firmName)}>
      <figcaption className="challenge-path__title">{copy.title(firmName)}</figcaption>
      {visible.map(group => <Group key={group.key} group={group} firmName={firmName} copy={copy} />)}
      {hidden.length > 0 && (
        <details className="challenge-path__more">
          <summary>{copy.moreSummary(hidden.reduce((total, group) => total + group.products.length, 0))}</summary>
          {hidden.map(group => <Group key={group.key} group={group} firmName={firmName} copy={copy} />)}
        </details>
      )}
      <p className="challenge-path__note">
        {dates.length === 1 && <><span className="challenge-path__chip">{copy.checked} <time dateTime={dates[0]}>{formatMatrixDate(dates[0], locale)}</time></span>{' '}</>}
        {copy.note}
      </p>
    </figure>
  )
}
