'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  Link2,
  Plus,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import ProductChangeSignals from '@/components/ProductChangeSignals'
import type { DrawdownType, RuleAvailability } from '@/lib/firms'
import type { IndiaMatcherFirm, IndiaMatcherProduct } from '@/lib/indiaMatcher'

type ProgramFilter = 'all' | 'instant' | 'one-step' | 'two-step' | 'three-step'
type MarketFilter = 'all' | IndiaMatcherProduct['assetClass']
type RuleFilter = 'all' | 'ea' | 'news' | 'swing'
type DrawdownFilter = 'all' | DrawdownType
type SortKey = 'evidence' | 'first-payout' | 'profit-split' | 'max-loss'
type DecisionPriority =
  | 'entry-cost'
  | 'funded-cost'
  | 'payout-speed'
  | 'loss-room'
  | 'ea'
  | 'swing'
  | 'evidence'

const MAX_SHORTLIST = 4
const DECISION_PRIORITIES: Array<{ value: DecisionPriority; label: string }> = [
  { value: 'evidence', label: 'Strongest India evidence' },
  { value: 'entry-cost', label: 'Lowest entry at selected size' },
  { value: 'funded-cost', label: 'Lowest funded cost at selected size' },
  { value: 'payout-speed', label: 'Earliest first payout request' },
  { value: 'loss-room', label: 'Largest percentage max-loss room' },
  { value: 'ea', label: 'EA compatibility' },
  { value: 'swing', label: 'Overnight + weekend holding' },
]
const VALID_DECISION_PRIORITIES = new Set(
  DECISION_PRIORITIES.map(priority => priority.value),
)

interface ProductRow {
  firm: IndiaMatcherFirm
  product: IndiaMatcherProduct
}

interface DecisionOutcome {
  title: string
  reason: string
  caveat: string
  winnerKeys: string[]
}

const FIELD_STYLE = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: '#fff',
  padding: '0 0.8rem',
  fontSize: '0.84rem',
  fontWeight: 700,
} as const

function phasesLabel(phases: IndiaMatcherProduct['phases']) {
  if (phases === 0) return 'Instant'
  if (phases === 1) return '1-step'
  return `${phases}-step`
}

function programMatches(product: IndiaMatcherProduct, filter: ProgramFilter) {
  if (filter === 'instant') return product.phases === 0
  if (filter === 'one-step') return product.phases === 1
  if (filter === 'two-step') return product.phases === 2
  if (filter === 'three-step') return product.phases === 3
  return true
}

function marketLabel(value: IndiaMatcherProduct['assetClass']) {
  if (value === 'prediction-markets') return 'Prediction markets'
  return value.toUpperCase()
}

function ruleMatches(product: IndiaMatcherProduct, filter: RuleFilter) {
  if (filter === 'ea') return product.rules.ea === true
  if (filter === 'news') return product.rules.news === true
  if (filter === 'swing') {
    return product.rules.weekend === true && product.rules.overnight === true
  }
  return true
}

function moneyLabel(product: IndiaMatcherProduct) {
  if (!product.entryPrice) return 'Unverified'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.entryPrice.currency,
    maximumFractionDigits: 2,
  }).format(product.entryPrice.amount)
}

function compactMoney(value: number, currency: 'USD' | 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function numberRange(values: number[], currency: 'USD' | 'EUR') {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const first = compactMoney(sorted[0], currency)
  const last = compactMoney(sorted.at(-1)!, currency)
  return first === last ? first : `${first}–${last}`
}

function priceRange(product: IndiaMatcherProduct) {
  const usd = numberRange(
    product.pricedTiers.flatMap(tier =>
      tier.price.currency === 'USD' ? [tier.price.amount] : []),
    'USD',
  )
  const eur = numberRange(
    product.pricedTiers.flatMap(tier =>
      tier.price.currency === 'EUR' ? [tier.price.amount] : []),
    'EUR',
  )
  return [usd, eur].filter((value): value is string => Boolean(value)).join(' / ') || 'Unverified'
}

function fundedFloorLabel(product: IndiaMatcherProduct) {
  const usd = product.pricedTiers.flatMap(tier =>
    tier.costToFundedUsd != null && tier.costToFundedUsd > 0
      ? [tier.costToFundedUsd]
      : [],
  )
  const eur = product.pricedTiers.flatMap(tier =>
    tier.costToFundedEur != null && tier.costToFundedEur > 0
      ? [tier.costToFundedEur]
      : [],
  )
  const values = [
    usd.length ? compactMoney(Math.min(...usd), 'USD') : null,
    eur.length ? compactMoney(Math.min(...eur), 'EUR') : null,
  ].filter((value): value is string => Boolean(value))
  if (!values.length) return 'Funding floor unverified'
  const value = values.join(' / ')
  return product.pricingModel === 'monthly-subscription'
    ? `${value} first-cycle floor`
    : `${value} minimum to funded`
}

function compactAccountSize(value: number) {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`
  if (value >= 1_000) return `$${value / 1_000}K`
  return `$${value}`
}

function accountRange(sizes: number[]) {
  if (!sizes.length) return 'No tiers'
  const sorted = [...sizes].sort((a, b) => a - b)
  if (sorted.length === 1) return compactAccountSize(sorted[0])
  return `${compactAccountSize(sorted[0])}–${compactAccountSize(sorted.at(-1)!)}`
}

function accountSizesForSelection(sizes: number[], accountSize: string) {
  return accountSize === 'all'
    ? sizes
    : sizes.filter(size => size === Number(accountSize))
}

function profitTargetLabel(product: IndiaMatcherProduct) {
  if (product.phases === 0) return 'No evaluation'
  if (!product.profitTargets) return 'Unverified'
  const targets = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((value): value is number => value != null)
  return targets.length ? targets.map(value => `${value}%`).join(' → ') : 'Unverified'
}

function pct(value: number | null) {
  return value == null ? 'Unverified' : `${value}%`
}

function drawdownLabel(value: DrawdownType | null) {
  if (!value) return 'Unverified'
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance based'
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function payoutLabel(product: IndiaMatcherProduct) {
  const first = product.payoutFirstDays == null
    ? 'First payout unverified'
    : `First request: day ${product.payoutFirstDays}`
  const frequency = product.payoutFrequency
    ? product.payoutFrequency.replace('-', ' ')
    : 'frequency unverified'
  return `${first} · ${frequency}`
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ruleLabel(value: RuleAvailability) {
  if (value === true) return 'Yes'
  if (value === 'restricted') return 'Restricted'
  if (value === false) return 'No'
  return 'Unknown'
}

function ruleColor(value: RuleAvailability) {
  if (value === true) return '#6ee7b7'
  if (value === 'restricted') return '#fcd34d'
  if (value === false) return '#fca5a5'
  return 'var(--muted)'
}

function evidenceStatusLabel(status: IndiaMatcherFirm['country']['status']) {
  if (status === 'verified') return 'Verified'
  if (status === 'partial') return 'Partial'
  return 'Unknown'
}

function evidenceStatusColor(status: IndiaMatcherFirm['country']['status']) {
  if (status === 'verified') return '#6ee7b7'
  if (status === 'partial') return '#fcd34d'
  return '#fca5a5'
}

function shortlistKey(row: ProductRow) {
  return `${row.firm.slug}:${row.product.slug}`
}

function indiaPlannerHref(row: ProductRow, accountSize: string) {
  const params = new URLSearchParams({
    costFirm: row.firm.slug,
    costProduct: row.product.slug,
  })
  if (
    accountSize !== 'all'
    && row.product.pricedTiers.some(tier => tier.sizeUsd === Number(accountSize))
  ) {
    params.set('costSize', accountSize)
  }
  return `/best-prop-firms-in-india?${params.toString()}#india-checkout-planner-heading`
}

function parseShortlist(value: string | null, validKeys: Set<string>) {
  if (!value) return []
  return [...new Set(value.split(',').map(key => key.trim()))]
    .filter(key => validKeys.has(key))
    .slice(0, MAX_SHORTLIST)
}

function sameKeys(a: string[], b: string[]) {
  return a.length === b.length && a.every((key, index) => key === b[index])
}

function selectedNames(rows: ProductRow[]) {
  const names = rows.map(row => `${row.firm.name} ${row.product.name}`)
  if (names.length <= 1) return names[0] ?? 'No product'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function numericWinners(
  rows: ProductRow[],
  valueFor: (row: ProductRow) => number | null,
  direction: 'lowest' | 'highest',
) {
  const known = rows.flatMap(row => {
    const value = valueFor(row)
    return value == null ? [] : [{ row, value }]
  })
  if (!known.length) return { winners: [] as ProductRow[], value: null, incomplete: true }
  const values = known.map(entry => entry.value)
  const best = direction === 'lowest' ? Math.min(...values) : Math.max(...values)
  return {
    winners: known.filter(entry => entry.value === best).map(entry => entry.row),
    value: best,
    incomplete: known.length !== rows.length,
  }
}

function decisionTiers(product: IndiaMatcherProduct, accountSize: string) {
  return accountSize === 'all'
    ? product.pricedTiers
    : product.pricedTiers.filter(tier => tier.sizeUsd === Number(accountSize))
}

function entryValue(product: IndiaMatcherProduct, accountSize: string) {
  const tiers = decisionTiers(product, accountSize)
  const usd = tiers.flatMap(tier => tier.price.currency === 'USD' ? [tier.price.amount] : [])
  const eur = tiers.flatMap(tier => tier.price.currency === 'EUR' ? [tier.price.amount] : [])
  if (usd.length && !eur.length) return { amount: Math.min(...usd), currency: 'USD' as const }
  if (eur.length && !usd.length) return { amount: Math.min(...eur), currency: 'EUR' as const }
  return null
}

function fundedFloorValue(product: IndiaMatcherProduct, accountSize: string) {
  const tiers = decisionTiers(product, accountSize)
  const usd = tiers.flatMap(tier =>
    tier.costToFundedUsd != null && tier.costToFundedUsd > 0
      ? [tier.costToFundedUsd]
      : [],
  )
  const eur = tiers.flatMap(tier =>
    tier.costToFundedEur != null && tier.costToFundedEur > 0
      ? [tier.costToFundedEur]
      : [],
  )
  if (usd.length && !eur.length) {
    return { amount: Math.min(...usd), currency: 'USD' as const }
  }
  if (eur.length && !usd.length) {
    return { amount: Math.min(...eur), currency: 'EUR' as const }
  }
  return null
}

function decisionMoneyLabel(
  product: IndiaMatcherProduct,
  field: 'entry' | 'funded',
  accountSize: string,
) {
  const value = field === 'entry'
    ? entryValue(product, accountSize)
    : fundedFloorValue(product, accountSize)
  if (value) return compactMoney(value.amount, value.currency)
  return accountSize === 'all'
    ? 'No comparable published value'
    : `No verified ${compactAccountSize(Number(accountSize))} value`
}

function outcomeForPriority(
  rows: ProductRow[],
  priority: DecisionPriority,
  accountSize: string,
): DecisionOutcome {
  const outcome = (
    title: string,
    reason: string,
    caveat: string,
    winners: ProductRow[] = [],
  ): DecisionOutcome => ({
    title,
    reason,
    caveat,
    winnerKeys: winners.map(shortlistKey),
  })

  if (rows.length < 2) {
    return outcome(
      'Select at least 2 products',
      'The decision memo compares only the products you deliberately shortlist.',
      'No product is ranked before a comparable set exists.',
    )
  }

  if (priority === 'entry-cost') {
    if (accountSize === 'all') {
      return outcome(
        'Choose one shared account size',
        'Minimum fees can belong to different account sizes, so they are not an apples-to-apples cost comparison.',
        'Use the account-size filter, then the memo can compare the same published tier across every selected product.',
      )
    }
    const prices = rows.map(row => entryValue(row.product, accountSize))
    if (prices.some(price => price == null)) {
      return outcome(
        'No defensible entry-cost winner',
        'At least 1 selected product does not have a verified public entry price.',
        'Unknown pricing cannot be treated as free or cheaper. Confirm the exact checkout total.',
      )
    }
    const currencies = new Set(prices.map(price => price!.currency))
    if (currencies.size !== 1) {
      return outcome(
        'Currency conversion is required',
        'The selected products publish prices in different currencies, so their face values are not directly comparable.',
        'Use the INR planner with the current bank or card rate and markup before deciding.',
      )
    }
    const result = numericWinners(
      rows,
      row => entryValue(row.product, accountSize)!.amount,
      'lowest',
    )
    const currency = prices[0]!.currency
    const sizeLabel = accountSize === 'all'
      ? 'each product’s minimum published tier'
      : `${compactAccountSize(Number(accountSize))} tiers`
    return outcome(
      `${selectedNames(result.winners)} ${
        result.winners.length === 1 ? 'has' : 'share'
      } the lowest published entry`,
      `${compactMoney(result.value!, currency)} is lowest across ${sizeLabel}.`,
      accountSize === 'all'
        ? 'Minimum fees may represent different account sizes and exclude card FX markup, taxes, resets, rebills, and activation fees.'
        : 'This excludes card FX markup, taxes, resets, rebills, and any later activation fee.',
      result.winners,
    )
  }

  if (priority === 'funded-cost') {
    if (accountSize === 'all') {
      return outcome(
        'Choose one shared account size',
        'Minimum cost-to-funded figures can belong to different account sizes and should not be ranked together.',
        'Use the account-size filter to compare the same published tier across every selected product.',
      )
    }
    const floors = rows.map(row => fundedFloorValue(row.product, accountSize))
    if (floors.some(floor => floor == null)) {
      return outcome(
        'No complete funded-cost comparison',
        'At least 1 selected product lacks a defensible minimum cost-to-funded figure.',
        'A missing activation fee or split payment cannot be assumed to be zero.',
      )
    }
    const currencies = new Set(floors.map(floor => floor!.currency))
    if (currencies.size !== 1) {
      return outcome(
        'Funded-cost currencies differ',
        'The selected minimum cost-to-funded figures are published in different currencies.',
        'Convert them with the same live INR rate and payment markup before comparing.',
      )
    }
    const result = numericWinners(
      rows,
      row => fundedFloorValue(row.product, accountSize)!.amount,
      'lowest',
    )
    const currency = floors[0]!.currency
    const sizeLabel = accountSize === 'all'
      ? 'each product’s minimum published tier'
      : `${compactAccountSize(Number(accountSize))} tiers`
    return outcome(
      `${selectedNames(result.winners)} ${
        result.winners.length === 1 ? 'has' : 'share'
      } the lowest funded-cost floor`,
      `${compactMoney(result.value!, currency)} is the lowest verified path across ${sizeLabel}.`,
      accountSize === 'all'
        ? 'Minimum floors may represent different account sizes; monthly figures assume a first-cycle pass and exclude later rebills and resets.'
        : 'Monthly figures assume a first-cycle pass; later rebills and resets remain separate.',
      result.winners,
    )
  }

  if (priority === 'payout-speed') {
    const result = numericWinners(
      rows,
      row => row.product.payoutFirstDays,
      'lowest',
    )
    if (!result.winners.length || result.incomplete) {
      return outcome(
        'First-payout timing is incomplete',
        'At least 1 selected product has no captured first-request day.',
        'Do not interpret an unpublished wait as immediate payout access.',
      )
    }
    return outcome(
      `${selectedNames(result.winners)} ${
        result.winners.length === 1 ? 'has' : 'share'
      } the earliest verified request point`,
      result.value === 0
        ? 'The published rule allows a request on demand, subject to its other payout gates.'
        : `The earliest captured request point is day ${result.value}.`,
      'Request timing is not receipt timing; consistency, buffer, KYC, and payout-rail gates still apply.',
      result.winners,
    )
  }

  if (priority === 'loss-room') {
    const drawdownTypes = new Set(rows.map(row => row.product.drawdownType))
    if (drawdownTypes.has(null) || drawdownTypes.size !== 1) {
      return outcome(
        'Drawdown methods differ',
        'A percentage cap is not enough to rank static, balance-based, trailing, and EOD-trailing limits together.',
        'Choose products with the same drawdown method, then compare the percentage and exact calculation rule.',
      )
    }
    const result = numericWinners(rows, row => row.product.maxLossPct, 'highest')
    if (!result.winners.length || result.incomplete) {
      return outcome(
        'Percentage loss room is not comparable',
        'At least 1 selected product lacks a percentage maximum-loss cap in the captured data.',
        'Dollar drawdown and percentage drawdown must not be compared as if they were the same measure.',
      )
    }
    return outcome(
      `${selectedNames(result.winners)} ${
        result.winners.length === 1 ? 'has' : 'share'
      } the largest published percentage cap`,
      `${result.value}% is the largest captured maximum-loss percentage.`,
      'Calculation timing and intraday balance changes can still matter more than the headline percentage.',
      result.winners,
    )
  }

  if (priority === 'ea' || priority === 'swing') {
    const winners = rows.filter(row => (
      priority === 'ea'
        ? row.product.rules.ea === true
        : row.product.rules.overnight === true && row.product.rules.weekend === true
    ))
    const capability = priority === 'ea' ? 'EA use' : 'overnight and weekend holding'
    if (!winners.length) {
      return outcome(
        `No selected product verifies ${capability}`,
        `The captured rules do not mark ${capability} as fully allowed for any selected product.`,
        'Restricted or unknown is not treated as allowed. Read the exact strategy restrictions before purchase.',
      )
    }
    return outcome(
      `${selectedNames(winners)} ${
        winners.length === 1 ? 'verifies' : 'verify'
      } ${capability}`,
      `${winners.length} of ${rows.length} selected products pass this rule filter.`,
      '“Allowed” can still carry platform, copy-trading, news, latency, or prohibited-strategy conditions.',
      winners,
    )
  }

  const result = numericWinners(rows, row => row.firm.evidenceScore, 'highest')
  return outcome(
    `${selectedNames(result.winners)} ${
      result.winners.length === 1 ? 'has' : 'share'
    } the strongest captured India evidence`,
    `${result.value}/12 is the highest completeness score across country, checkout, KYC, payout, fee, and currency fields.`,
    'Evidence completeness is not RBI authorisation, firm quality, payout proof, or a recommendation to buy.',
    result.winners,
  )
}

function compareNullable(
  a: number | null,
  b: number | null,
  direction: 'asc' | 'desc',
) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return direction === 'asc' ? a - b : b - a
}

function FilterField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: '0.4rem' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 800 }}>
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={event => {
          onChange(event.target.value)
          track('challenge_filter_used', {
            surface: 'india',
            filter: `${id.replace(/^india-(challenge|compare)-/, '')}:${event.target.value}`,
          })
        }}
        style={FIELD_STYLE}
      >
        {children}
      </select>
    </label>
  )
}

export default function IndiaChallengeComparison({ firms }: { firms: IndiaMatcherFirm[] }) {
  const allRows = useMemo<ProductRow[]>(
    () => firms.flatMap(firm => firm.products.map(product => ({ firm, product }))),
    [firms],
  )
  const accountSizes = useMemo(
    () => [...new Set(allRows.flatMap(row => row.product.accountSizesUsd))].sort((a, b) => a - b),
    [allRows],
  )
  const rowByShortlistKey = useMemo(
    () => new Map(allRows.map(row => [shortlistKey(row), row])),
    [allRows],
  )
  const validShortlistKeys = useMemo(
    () => new Set(rowByShortlistKey.keys()),
    [rowByShortlistKey],
  )

  const [firmSlug, setFirmSlug] = useState('all')
  const [program, setProgram] = useState<ProgramFilter>('all')
  const [market, setMarket] = useState<MarketFilter>('all')
  const [rule, setRule] = useState<RuleFilter>('all')
  const [drawdown, setDrawdown] = useState<DrawdownFilter>('all')
  const [accountSize, setAccountSize] = useState('all')
  const [sort, setSort] = useState<SortKey>('evidence')
  const [shortlist, setShortlist] = useState<string[]>([])
  const [decisionPriority, setDecisionPriority] = useState<DecisionPriority>('evidence')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const decisionViewRef = useRef('')

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const next = parseShortlist(params.get('shortlist'), validShortlistKeys)
      const priority = params.get('priority')
      const size = params.get('size')
      setShortlist(current => sameKeys(current, next) ? current : next)
      setDecisionPriority(
        priority && VALID_DECISION_PRIORITIES.has(priority as DecisionPriority)
          ? priority as DecisionPriority
          : 'evidence',
      )
      setAccountSize(
        size && accountSizes.includes(Number(size)) ? size : 'all',
      )
      setCopyState('idle')
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [accountSizes, validShortlistKeys])

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
  }, [])

  const selectedRows = useMemo(
    () => shortlist
      .map(key => rowByShortlistKey.get(key))
      .filter((row): row is ProductRow => Boolean(row)),
    [rowByShortlistKey, shortlist],
  )
  const decisionOutcome = useMemo(
    () => outcomeForPriority(selectedRows, decisionPriority, accountSize),
    [accountSize, decisionPriority, selectedRows],
  )
  const decisionWinnerRows = useMemo(
    () => selectedRows.filter(row => decisionOutcome.winnerKeys.includes(shortlistKey(row))),
    [decisionOutcome, selectedRows],
  )
  const plannerNextRows = decisionWinnerRows.length
    ? decisionWinnerRows
    : selectedRows.length === 1
      ? selectedRows
      : []
  const pricedPlannerNextRows = plannerNextRows.filter(
    row => row.product.pricedTiers.length > 0,
  )

  useEffect(() => {
    if (selectedRows.length < 2) return
    const viewKey = `${selectedRows.map(shortlistKey).join(',')}:${decisionPriority}:${accountSize}`
    if (decisionViewRef.current === viewKey) return
    decisionViewRef.current = viewKey
    track('challenge_decision_viewed', {
      surface: 'india',
      priority: decisionPriority,
      account_size: accountSize,
      shortlist_count: selectedRows.length,
      winner_count: decisionOutcome.winnerKeys.length,
    })
  }, [accountSize, decisionOutcome, decisionPriority, selectedRows])

  const commitShortlist = (next: string[]) => {
    const clean = [...new Set(next)]
      .filter(key => validShortlistKeys.has(key))
      .slice(0, MAX_SHORTLIST)
    setShortlist(clean)
    setCopyState('idle')
    const url = new URL(window.location.href)
    if (clean.length) url.searchParams.set('shortlist', clean.join(','))
    else {
      url.searchParams.delete('shortlist')
      url.searchParams.delete('priority')
      setDecisionPriority('evidence')
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const commitDecisionPriority = (priority: DecisionPriority) => {
    setDecisionPriority(priority)
    setCopyState('idle')
    const url = new URL(window.location.href)
    url.searchParams.set('priority', priority)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    track('challenge_priority_used', { surface: 'india', priority })
  }

  const commitAccountSize = (size: string) => {
    setAccountSize(size)
    setCopyState('idle')
    const url = new URL(window.location.href)
    if (size === 'all') url.searchParams.delete('size')
    else url.searchParams.set('size', size)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const toggleShortlist = (key: string) => {
    if (shortlist.includes(key)) {
      commitShortlist(shortlist.filter(value => value !== key))
      track('challenge_shortlist_remove', { surface: 'india', product: key })
      return
    }
    if (shortlist.length < MAX_SHORTLIST) {
      commitShortlist([...shortlist, key])
      track('challenge_shortlist_add', { surface: 'india', product: key })
    }
  }

  const copyShortlistLink = async () => {
    try {
      const link = window.location.href
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const input = document.createElement('textarea')
        input.value = link
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(input)
        if (!copied) throw new Error('Copy command was rejected')
      }
      setCopyState('copied')
      track('challenge_shortlist_copied', {
        surface: 'india',
        count: selectedRows.length,
      })
    } catch {
      setCopyState('error')
    }
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
    copyResetRef.current = setTimeout(() => setCopyState('idle'), 2400)
  }

  const rows = useMemo(() => {
    const selectedSize = accountSize === 'all' ? null : Number(accountSize)
    return allRows
      .filter(row => firmSlug === 'all' || row.firm.slug === firmSlug)
      .filter(row => programMatches(row.product, program))
      .filter(row => market === 'all' || row.product.assetClass === market)
      .filter(row => ruleMatches(row.product, rule))
      .filter(row => drawdown === 'all' || row.product.drawdownType === drawdown)
      .filter(row => selectedSize == null || row.product.accountSizesUsd.includes(selectedSize))
      .sort((a, b) => {
        if (sort === 'first-payout') {
          return compareNullable(a.product.payoutFirstDays, b.product.payoutFirstDays, 'asc')
        }
        if (sort === 'profit-split') {
          return compareNullable(a.product.profitSplitPct, b.product.profitSplitPct, 'desc')
        }
        if (sort === 'max-loss') {
          return compareNullable(a.product.maxLossPct, b.product.maxLossPct, 'desc')
        }
        return b.firm.evidenceScore - a.firm.evidenceScore
          || b.firm.editorialScore - a.firm.editorialScore
          || a.product.name.localeCompare(b.product.name)
      })
  }, [accountSize, allRows, drawdown, firmSlug, market, program, rule, sort])

  const reset = () => {
    setFirmSlug('all')
    setProgram('all')
    setMarket('all')
    setRule('all')
    setDrawdown('all')
    setAccountSize('all')
    setSort('evidence')
    const url = new URL(window.location.href)
    url.searchParams.delete('size')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    track('challenge_filters_reset', { surface: 'india', matching_products: rows.length })
  }
  const selectedSizeLabel = accountSize === 'all'
    ? 'Minimum published entry'
    : `${compactAccountSize(Number(accountSize))} published entry`
  const fundedSizeLabel = accountSize === 'all'
    ? 'Minimum funded-cost floor'
    : `${compactAccountSize(Number(accountSize))} funded-cost floor`
  const decisionMatrixRows = [
    {
      label: selectedSizeLabel,
      valueFor: (row: ProductRow) => decisionMoneyLabel(
        row.product,
        'entry',
        accountSize,
      ),
    },
    {
      label: fundedSizeLabel,
      valueFor: (row: ProductRow) => decisionMoneyLabel(
        row.product,
        'funded',
        accountSize,
      ),
    },
    {
      label: 'First payout request',
      valueFor: (row: ProductRow) => payoutLabel(row.product),
    },
    {
      label: 'Maximum loss',
      valueFor: (row: ProductRow) => pct(row.product.maxLossPct),
    },
    {
      label: 'Drawdown method',
      valueFor: (row: ProductRow) => drawdownLabel(row.product.drawdownType),
    },
    {
      label: 'Profit split',
      valueFor: (row: ProductRow) => pct(row.product.profitSplitPct),
    },
    {
      label: 'EA rule',
      valueFor: (row: ProductRow) => ruleLabel(row.product.rules.ea),
    },
    {
      label: 'Overnight + weekend',
      valueFor: (row: ProductRow) => (
        row.product.rules.overnight === true && row.product.rules.weekend === true
          ? 'Yes'
          : row.product.rules.overnight === false || row.product.rules.weekend === false
            ? 'No'
            : 'Restricted or unknown'
      ),
    },
    {
      label: 'India evidence',
      valueFor: (row: ProductRow) => (
        `${row.firm.evidenceScore}/12 · KYC ${evidenceStatusLabel(row.firm.kyc.status)}`
      ),
    },
    {
      label: 'RBI list snapshot',
      valueFor: (row: ProductRow) => (
        `Not found · ${dateLabel(row.firm.rbiAlert.sourceListUpdatedAt)}`
      ),
    },
    {
      label: 'Dated change signal',
      valueFor: (row: ProductRow) => (
        row.product.changeSignals.length
          ? `${row.product.changeSignals.length} · ${
            row.product.changeSignals.some(signal => signal.status === 'watch')
              ? 'Open watch'
              : 'Verified change'
          }`
          : 'No current signal'
      ),
    },
  ]

  return (
    <section className="home-section home-section--alt" aria-labelledby="india-challenge-table-heading">
      <div className="home-shell">
        <div className="section-head">
          <div>
            <h2 id="india-challenge-table-heading" className="section-title">
              <Scale size={18} style={{ color: 'var(--accent-light)' }} />
              Compare product rules
            </h2>
            <p className="section-sub-text">
              Filter eligible products without mixing restricted firms back in. Dated change
              signals stay attached to the affected programs.
            </p>
          </div>
          <span className="section-sub">
            <SlidersHorizontal size={13} /> First-party captures only
          </span>
        </div>

        <div className="post-sidebar-card" style={{ padding: '1.15rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
            gap: '0.8rem',
          }}>
            <FilterField id="india-compare-firm" label="Firm" value={firmSlug} onChange={setFirmSlug}>
              <option value="all">All screened firms</option>
              {firms.map(firm => <option key={firm.slug} value={firm.slug}>{firm.name}</option>)}
            </FilterField>
            <FilterField
              id="india-compare-program"
              label="Evaluation"
              value={program}
              onChange={value => setProgram(value as ProgramFilter)}
            >
              <option value="all">All programmes</option>
              <option value="instant">Instant funding</option>
              <option value="one-step">1-step</option>
              <option value="two-step">2-step</option>
              <option value="three-step">3-step</option>
            </FilterField>
            <FilterField
              id="india-compare-market"
              label="Market"
              value={market}
              onChange={value => setMarket(value as MarketFilter)}
            >
              <option value="all">All markets</option>
              <option value="cfd">CFD</option>
              <option value="futures">Futures</option>
              <option value="crypto">Crypto</option>
              <option value="prediction-markets">Prediction markets</option>
            </FilterField>
            <FilterField
              id="india-compare-rule"
              label="Trading style"
              value={rule}
              onChange={value => setRule(value as RuleFilter)}
            >
              <option value="all">Any style</option>
              <option value="ea">EA allowed</option>
              <option value="news">News allowed</option>
              <option value="swing">Overnight + weekend</option>
            </FilterField>
            <FilterField
              id="india-compare-drawdown"
              label="Drawdown"
              value={drawdown}
              onChange={value => setDrawdown(value as DrawdownFilter)}
            >
              <option value="all">Any method</option>
              <option value="static">Static</option>
              <option value="trailing">Trailing</option>
              <option value="eod-trailing">EOD trailing</option>
              <option value="balance-based">Balance based</option>
            </FilterField>
            <FilterField
              id="india-compare-size"
              label="Account size"
              value={accountSize}
              onChange={commitAccountSize}
            >
              <option value="all">Any size</option>
              {accountSizes.map(size => (
                <option key={size} value={size}>
                  ${size.toLocaleString('en-US')}
                </option>
              ))}
            </FilterField>
            <FilterField
              id="india-compare-sort"
              label="Sort"
              value={sort}
              onChange={value => setSort(value as SortKey)}
            >
              <option value="evidence">Strongest evidence</option>
              <option value="first-payout">Earliest first payout</option>
              <option value="profit-split">Highest profit split</option>
              <option value="max-loss">Largest max-loss room</option>
            </FilterField>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.8rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid var(--border)',
          }}>
            <p aria-live="polite" style={{ margin: 0, color: 'var(--text)', fontSize: '0.8rem', fontWeight: 800 }}>
              Showing {rows.length} of {allRows.length} products
            </p>
            <button
              type="button"
              onClick={reset}
              className="btn-outline"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
            >
              <RefreshCw size={12} /> Reset filters
            </button>
          </div>
        </div>

        <section
          className={`challenge-shortlist india-challenge-shortlist${
            selectedRows.length ? ' challenge-shortlist--active' : ''
          }`}
          aria-labelledby="india-challenge-shortlist-heading"
        >
          <div className="challenge-shortlist-head">
            <div>
              <span className="bento-tile-eyebrow">
                <Link2 size={12} aria-hidden="true" /> India due-diligence shortlist
              </span>
              <h3 id="india-challenge-shortlist-heading">
                Compare 2–{MAX_SHORTLIST} products with India evidence attached
              </h3>
              <p>
                The URL stores only product keys. It does not store identity, KYC documents, or
                payment details.
              </p>
            </div>
            <div className="challenge-shortlist-actions">
              <span className="challenge-shortlist-count" aria-live="polite">
                {selectedRows.length}/{MAX_SHORTLIST} selected
              </span>
              <button
                type="button"
                className="btn-outline"
                onClick={copyShortlistLink}
                disabled={!selectedRows.length}
              >
                {copyState === 'copied' ? <Check size={13} /> : <Clipboard size={13} />}
                {copyState === 'copied'
                  ? 'Link copied'
                  : copyState === 'error'
                    ? 'Copy failed'
                    : selectedRows.length >= 2
                      ? 'Copy decision link'
                      : 'Copy shortlist link'}
              </button>
              <button
                type="button"
                className="challenge-shortlist-clear"
                onClick={() => commitShortlist([])}
                disabled={!selectedRows.length}
              >
                <Trash2 size={13} aria-hidden="true" /> Clear
              </button>
            </div>
          </div>

          {!selectedRows.length ? (
            <div className="challenge-shortlist-empty">
              <Plus size={16} aria-hidden="true" />
              <span>
                Use <strong>Add</strong> in the first table column. The shortlist keeps RBI,
                country, KYC, payout, cost, and product-rule evidence together.
              </span>
            </div>
          ) : (
            <>
              {selectedRows.length === 1 && (
                <p className="challenge-shortlist-prompt" role="status">
                  Select 1 more product to create the India side-by-side comparison.
                </p>
              )}
              <div className="challenge-shortlist-grid">
                {selectedRows.map(({ firm, product }) => {
                  const key = `${firm.slug}:${product.slug}`
                  return (
                    <article key={key} className="challenge-shortlist-card">
                      <div className="challenge-shortlist-card-head">
                        <div className="challenge-shortlist-firm">
                          {firm.logo ? (
                            <Image
                              src={firm.logo}
                              alt=""
                              width={34}
                              height={34}
                              style={{ objectFit: 'contain' }}
                            />
                          ) : null}
                          <div>
                            <span>{firm.name}</span>
                            <strong>{product.name}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleShortlist(key)}
                          className="challenge-shortlist-remove"
                          aria-label={`Remove ${firm.name} ${product.name} from shortlist`}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <ProductChangeSignals signals={product.changeSignals} />

                      <dl className="challenge-shortlist-metrics">
                        <div>
                          <dt>Account sizes</dt>
                          <dd>{accountRange(accountSizesForSelection(
                            product.accountSizesUsd,
                            accountSize,
                          ))}</dd>
                        </div>
                        <div>
                          <dt>Published entry</dt>
                          <dd>{accountSize === 'all'
                            ? priceRange(product)
                            : decisionMoneyLabel(product, 'entry', accountSize)}</dd>
                        </div>
                        <div>
                          <dt>Funded-cost floor</dt>
                          <dd>{accountSize === 'all'
                            ? fundedFloorLabel(product)
                            : decisionMoneyLabel(product, 'funded', accountSize)}</dd>
                        </div>
                        <div>
                          <dt>Evaluation</dt>
                          <dd>{phasesLabel(product.phases)} · {profitTargetLabel(product)}</dd>
                        </div>
                        <div>
                          <dt>Loss limits</dt>
                          <dd>{pct(product.dailyLossPct)} daily · {pct(product.maxLossPct)} maximum</dd>
                        </div>
                        <div>
                          <dt>Drawdown</dt>
                          <dd>{drawdownLabel(product.drawdownType)}</dd>
                        </div>
                        <div>
                          <dt>Payout timing</dt>
                          <dd>{payoutLabel(product)}</dd>
                        </div>
                        <div>
                          <dt>Profit split</dt>
                          <dd>{pct(product.profitSplitPct)}</dd>
                        </div>
                      </dl>

                      <div
                        className="challenge-shortlist-rules"
                        aria-label={`${firm.name} ${product.name} trading rules`}
                      >
                        {[
                          ['EA', product.rules.ea],
                          ['News', product.rules.news],
                          ['Overnight', product.rules.overnight],
                          ['Weekend', product.rules.weekend],
                        ].map(([label, value]) => (
                          <span
                            key={label as string}
                            style={{ color: ruleColor(value as RuleAvailability) }}
                          >
                            {label as string}: {ruleLabel(value as RuleAvailability)}
                          </span>
                        ))}
                      </div>

                      <div className="india-shortlist-evidence">
                        <div>
                          <span>RBI Alert List snapshot</span>
                          <strong style={{ color: '#6ee7b7' }}>Not found</strong>
                          <small>{firm.rbiAlert.summary}</small>
                          <a
                            href={firm.rbiAlert.sourceUrl}
                            target="_blank"
                            rel="nofollow noopener"
                          >
                            List dated {dateLabel(firm.rbiAlert.sourceListUpdatedAt)}
                            <ExternalLink size={9} aria-hidden="true" />
                          </a>
                        </div>
                        {([
                          ['Country availability', firm.country],
                          ['KYC evidence', firm.kyc],
                          ['Payout evidence', firm.payout],
                        ] as const).map(([label, evidence]) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong style={{ color: evidenceStatusColor(evidence.status) }}>
                              {evidenceStatusLabel(evidence.status)}
                            </strong>
                            <small>
                              {label === 'Payout evidence' && firm.payoutRails.length
                                ? `${firm.payoutRails.join(', ')} · ${evidence.summary}`
                                : evidence.summary}
                            </small>
                            {evidence.sourceUrls[0] ? (
                              <a
                                href={evidence.sourceUrls[0]}
                                target="_blank"
                                rel="nofollow noopener"
                              >
                                Evidence source <ExternalLink size={9} aria-hidden="true" />
                              </a>
                            ) : (
                              <em>No public source captured</em>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="challenge-shortlist-card-foot">
                        <span>Rules captured {dateLabel(product.capturedAt)}</span>
                        <span>India evidence {dateLabel(firm.evidenceCapturedAt)}</span>
                        <a href={product.sourceUrl} target="_blank" rel="nofollow noopener">
                          Product source <ExternalLink size={10} aria-hidden="true" />
                        </a>
                        <Link
                          href={firm.reviewUrl}
                          onClick={() => track('challenge_review_open', {
                            surface: 'india',
                            product: key,
                          })}
                        >
                          Review <ArrowRight size={10} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
              {selectedRows.length >= 2 && (
                <section
                  className="india-decision-memo"
                  aria-labelledby="india-decision-memo-heading"
                >
                  <div className="india-decision-memo-head">
                    <div>
                      <span className="bento-tile-eyebrow">
                        <Target size={12} aria-hidden="true" /> Context, not a universal winner
                      </span>
                      <h4 id="india-decision-memo-heading">
                        Selected-product decision memo
                      </h4>
                      <p>
                        Choose the constraint that matters most. The selected priority and account
                        size stay in the shareable URL.
                      </p>
                    </div>
                    <label htmlFor="india-decision-priority">
                      <span>Decision priority</span>
                      <select
                        id="india-decision-priority"
                        value={decisionPriority}
                        onChange={event => commitDecisionPriority(
                          event.target.value as DecisionPriority,
                        )}
                      >
                        {DECISION_PRIORITIES.map(priority => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="india-decision-outcome" aria-live="polite">
                    <span>Outcome for this priority</span>
                    <strong>{decisionOutcome.title}</strong>
                    <p>{decisionOutcome.reason}</p>
                    <small>
                      <CircleAlert size={11} aria-hidden="true" />
                      {decisionOutcome.caveat}
                    </small>
                  </div>

                  <div className="india-decision-matrix-wrap">
                    <table className="india-decision-matrix">
                      <thead>
                        <tr>
                          <th scope="col">Decision factor</th>
                          {selectedRows.map(row => {
                            const key = shortlistKey(row)
                            return (
                              <th
                                key={key}
                                scope="col"
                                className={
                                  decisionOutcome.winnerKeys.includes(key)
                                    ? 'india-decision-matrix-winner'
                                    : undefined
                                }
                              >
                                <span>{row.firm.name}</span>
                                {row.product.name}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {decisionMatrixRows.map(metric => (
                          <tr key={metric.label}>
                            <th scope="row">{metric.label}</th>
                            {selectedRows.map(row => {
                              const key = shortlistKey(row)
                              return (
                                <td
                                  key={key}
                                  className={
                                    decisionOutcome.winnerKeys.includes(key)
                                      ? 'india-decision-matrix-winner'
                                      : undefined
                                  }
                                >
                                  {metric.valueFor(row)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <div className="india-shortlist-next-step">
                <span>
                  RBI “not found” is not RBI authorisation. Verify current checkout eligibility
                  before paying.
                </span>
                <div className="india-shortlist-next-actions">
                  {pricedPlannerNextRows.length ? pricedPlannerNextRows.map(row => {
                    const key = shortlistKey(row)
                    return (
                      <Link
                        key={key}
                        href={indiaPlannerHref(row, accountSize)}
                        onClick={() => track('challenge_inr_planner_open', {
                          surface: 'india',
                          product: key,
                        })}
                      >
                        Estimate {row.firm.name} {row.product.name} in INR
                        <ArrowRight size={11} aria-hidden="true" />
                      </Link>
                    )
                  }) : (
                    <Link
                      href="/best-prop-firms-in-india#india-checkout-planner-heading"
                      onClick={() => track('challenge_inr_planner_open', {
                        surface: 'india',
                        product: 'no-comparable-winner',
                      })}
                    >
                      Open the INR checkout planner <ArrowRight size={11} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
          <p className="sr-only" aria-live="polite">
            {copyState === 'copied'
              ? 'India shortlist link copied to clipboard.'
              : copyState === 'error'
                ? 'The India shortlist link could not be copied automatically.'
                : ''}
          </p>
        </section>

        {rows.length > 0 ? (
          <div style={{
            marginTop: '1rem',
            overflowX: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 14,
          }}>
            <table style={{ width: '100%', minWidth: 1240, borderCollapse: 'collapse', background: 'var(--bg2)' }}>
              <thead>
                <tr>
                  {['Shortlist', 'Firm & programme', 'Entry & tiers', 'Targets & loss', 'Timing', 'Trading rules', 'Evidence & action'].map(label => (
                    <th key={label} scope="col" style={{
                      padding: '0.8rem',
                      color: '#fff',
                      background: 'var(--bg3)',
                      borderBottom: '1px solid var(--border)',
                      textAlign: 'left',
                      fontSize: '0.72rem',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ firm, product }) => {
                  const key = `${firm.slug}:${product.slug}`
                  const actionHref = firm.isPartner
                    ? `/go/${firm.slug}?from=india-challenge-product-${product.slug}`
                    : firm.reviewUrl
                  return (
                    <tr id={`india-challenge-product-${firm.slug}-${product.slug}`} key={key}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 92 }}>
                        <button
                          type="button"
                          className={`challenge-shortlist-toggle${
                            shortlist.includes(key) ? ' challenge-shortlist-toggle--selected' : ''
                          }`}
                          onClick={() => toggleShortlist(key)}
                          disabled={!shortlist.includes(key) && shortlist.length >= MAX_SHORTLIST}
                          aria-pressed={shortlist.includes(key)}
                          aria-label={`${
                            shortlist.includes(key) ? 'Remove' : 'Add'
                          } ${firm.name} ${product.name} ${
                            shortlist.includes(key) ? 'from' : 'to'
                          } India shortlist`}
                        >
                          {shortlist.includes(key)
                            ? <Check size={12} aria-hidden="true" />
                            : <Plus size={12} aria-hidden="true" />}
                          {shortlist.includes(key)
                            ? `Selected ${shortlist.indexOf(key) + 1}`
                            : 'Add'}
                        </button>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '0.82rem' }}>{firm.name}</strong>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.78rem', marginTop: '0.22rem' }}>
                          {product.name}
                        </span>
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                          <span className="chip" style={{ display: 'inline-flex', fontSize: '0.66rem' }}>
                            {phasesLabel(product.phases)}
                          </span>
                          <span className="chip" style={{ display: 'inline-flex', fontSize: '0.66rem' }}>
                            {marketLabel(product.assetClass)}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <strong style={{
                          display: 'block',
                          color: accountSize === 'all'
                            ? product.entryPrice ? '#fff' : '#fcd34d'
                            : decisionMoneyLabel(product, 'entry', accountSize).startsWith('No ')
                              ? '#fcd34d'
                              : '#fff',
                          fontSize: '0.84rem',
                        }}>
                          {accountSize === 'all'
                            ? moneyLabel(product)
                            : decisionMoneyLabel(product, 'entry', accountSize)}
                        </strong>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          {accountRange(accountSizesForSelection(product.accountSizesUsd, accountSize))}
                          {' · '}
                          {accountSize === 'all'
                            ? `${product.accountSizesUsd.length} tier${product.accountSizesUsd.length === 1 ? '' : 's'}`
                            : 'selected tier'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <span style={{ display: 'block', color: '#fff', fontSize: '0.76rem', fontWeight: 800 }}>
                          Target {profitTargetLabel(product)}
                        </span>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                          Daily {pct(product.dailyLossPct)} · Max {pct(product.maxLossPct)}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.68rem', marginTop: '0.25rem' }}>
                          {drawdownLabel(product.drawdownType)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <span style={{ display: 'block', color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>
                          Min days: {product.minTradingDays ?? 'None published'}
                        </span>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.69rem', marginTop: '0.3rem', textTransform: 'capitalize' }}>
                          {payoutLabel(product)}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.68rem', marginTop: '0.25rem' }}>
                          Split {pct(product.profitSplitPct)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        {[
                          ['EA', product.rules.ea],
                          ['News', product.rules.news],
                          ['Weekend', product.rules.weekend],
                        ].map(([label, value]) => (
                          <span key={label as string} style={{
                            display: 'block',
                            color: ruleColor(value as RuleAvailability),
                            fontSize: '0.69rem',
                            marginBottom: '0.2rem',
                          }}>
                            {label as string}: {ruleLabel(value as RuleAvailability)}
                          </span>
                        ))}
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.67rem', marginTop: '0.25rem' }}>
                          Consistency {product.consistencyRulePct == null ? 'none published' : `${product.consistencyRulePct}%`}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.67rem' }}>
                          Captured {dateLabel(product.capturedAt)}
                        </span>
                        <ProductChangeSignals signals={product.changeSignals} compact />
                        <a
                          href={product.sourceUrl}
                          target="_blank"
                          rel="nofollow noopener"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--accent-light)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            marginTop: '0.35rem',
                          }}
                        >
                          First-party source <ExternalLink size={10} />
                        </a>
                        <div style={{ marginTop: '0.6rem' }}>
                          {firm.isPartner ? (
                            <Link
                              href={actionHref}
                              prefetch={false}
                              target="_blank"
                              rel="sponsored nofollow noopener"
                              className="btn-primary"
                              onClick={() => track('challenge_offer_open', {
                                surface: 'india',
                                product: key,
                              })}
                              style={{ padding: '0.48rem 0.62rem', fontSize: '0.68rem' }}
                            >
                              Check current offer <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <Link
                              href={actionHref}
                              className="btn-outline"
                              onClick={() => track('challenge_review_open', {
                                surface: 'india',
                                product: key,
                              })}
                              style={{ padding: '0.48rem 0.62rem', fontSize: '0.68rem' }}
                            >
                              Read review <ArrowRight size={11} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="post-sidebar-card" style={{ marginTop: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>No sourced product matches every filter</h3>
            <p style={{ margin: '0.55rem auto 0', color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 620 }}>
              Reset one filter rather than treating an unpublished or restricted rule as allowed.
            </p>
          </div>
        )}

        <p style={{ margin: '0.85rem 0 0', color: 'var(--muted)', fontSize: '0.7rem', lineHeight: 1.55 }}>
          “Unverified” is kept as unknown rather than converted to zero or “allowed.” Prices remain in the
          firm&apos;s published currency. A partner click records only the comparison filter labels.
        </p>
      </div>
    </section>
  )
}
