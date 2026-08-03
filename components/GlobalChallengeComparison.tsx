'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  Link2,
  Plus,
  RefreshCw,
  Scale,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import ProductChangeSignals from '@/components/ProductChangeSignals'
import type { ChallengeProductSignal } from '@/lib/challengeWatch'
import type {
  ChallengeProfitTargets,
  ChallengeRules,
  DrawdownType,
  PayoutFrequency,
  RuleAvailability,
} from '@/lib/firms'

export interface GlobalChallengeTier {
  sizeUsd: number
  priceUsd: number | null
  priceEur: number | null
  costToFundedUsd: number | null
  costToFundedEur: number | null
  dailyLossUsd: number | null
  maxLossUsd: number | null
}

export interface GlobalChallengeRow {
  firm: {
    slug: string
    name: string
    logo: string
    reviewUrl: string
    isPartner: boolean
    score: number
  }
  product: {
    name: string
    slug: string
    phases: 0 | 1 | 2 | 3
    tiers: GlobalChallengeTier[]
    pricingModel: 'one-off' | 'monthly-subscription' | 'split-payment'
    profitTargets: ChallengeProfitTargets | null
    dailyLossPct: number | null
    maxLossPct: number | null
    drawdownType: DrawdownType | null
    minTradingDays: number | null
    maxTradingDays: number | null
    consistencyRulePct: number | null
    profitSplitPct: number | null
    payoutFirstDays: number | null
    payoutFrequency: PayoutFrequency | null
    rules: ChallengeRules
    assetClass: 'cfd' | 'futures' | 'crypto' | 'prediction-markets'
    sourceUrl: string
    capturedAt: string
    changeSignals: ChallengeProductSignal[]
  }
}

type ProgramFilter = 'all' | 'instant' | 'one-step' | 'two-step' | 'three-step'
type MarketFilter = 'all' | GlobalChallengeRow['product']['assetClass']
type PricingFilter = 'all' | GlobalChallengeRow['product']['pricingModel']
type DrawdownFilter = 'all' | DrawdownType
type StyleFilter = 'all' | 'ea' | 'news' | 'swing'
type SortKey =
  | 'score'
  | 'entry-price'
  | 'funded-floor'
  | 'first-payout'
  | 'profit-split'
  | 'newest'
type DecisionPriority =
  | 'entry-cost'
  | 'funded-cost'
  | 'payout-speed'
  | 'max-loss'
  | 'profit-split'

interface DecisionOutcome {
  title: string
  reason: string
  caveat: string
  winnerKeys: string[]
}

const INITIAL_ROWS = 25
const MAX_SHORTLIST = 4
const DECISION_PRIORITIES: Array<{ value: DecisionPriority; label: string }> = [
  { value: 'entry-cost', label: 'Lowest entry at selected size' },
  { value: 'funded-cost', label: 'Lowest funded cost at selected size' },
  { value: 'payout-speed', label: 'Earliest payout request' },
  { value: 'max-loss', label: 'Largest stated max-loss room' },
  { value: 'profit-split', label: 'Highest stated profit split' },
]

const FIELD_STYLE = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: '#fff',
  padding: '0 0.8rem',
  fontSize: '0.82rem',
  fontWeight: 700,
} as const

function phasesLabel(phases: GlobalChallengeRow['product']['phases']) {
  if (phases === 0) return 'Instant'
  if (phases === 1) return '1-step'
  return `${phases}-step`
}

function programMatches(product: GlobalChallengeRow['product'], filter: ProgramFilter) {
  if (filter === 'instant') return product.phases === 0
  if (filter === 'one-step') return product.phases === 1
  if (filter === 'two-step') return product.phases === 2
  if (filter === 'three-step') return product.phases === 3
  return true
}

function styleMatches(product: GlobalChallengeRow['product'], filter: StyleFilter) {
  if (filter === 'ea') return product.rules.ea === true
  if (filter === 'news') return product.rules.news === true
  if (filter === 'swing') {
    return product.rules.overnight === true && product.rules.weekend === true
  }
  return true
}

function marketLabel(value: GlobalChallengeRow['product']['assetClass']) {
  if (value === 'prediction-markets') return 'Prediction markets'
  return value.toUpperCase()
}

function pricingLabel(value: GlobalChallengeRow['product']['pricingModel']) {
  if (value === 'monthly-subscription') return 'Monthly subscription'
  if (value === 'split-payment') return 'Split payment'
  return 'One-time fee'
}

function drawdownLabel(value: DrawdownType | null) {
  if (!value) return 'Unverified'
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance based'
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function compactMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function compactAccountSize(value: number) {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`
  if (value >= 1_000) return `$${value / 1_000}K`
  return `$${value}`
}

function accountRange(tiers: GlobalChallengeTier[]) {
  const sizes = tiers.map(tier => tier.sizeUsd).sort((a, b) => a - b)
  if (!sizes.length) return 'No tiers'
  if (sizes.length === 1) return compactAccountSize(sizes[0])
  return `${compactAccountSize(sizes[0])}–${compactAccountSize(sizes.at(-1)!)}`
}

function numberRange(values: number[], currency: 'USD' | 'EUR') {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const first = compactMoney(sorted[0], currency)
  const last = compactMoney(sorted.at(-1)!, currency)
  return first === last ? first : `${first}–${last}`
}

function priceRange(tiers: GlobalChallengeTier[]) {
  const usd = numberRange(
    tiers.flatMap(tier => tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : []),
    'USD',
  )
  const eur = numberRange(
    tiers.flatMap(tier => tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : []),
    'EUR',
  )
  return [usd, eur].filter((value): value is string => Boolean(value)).join(' / ') || 'Unverified'
}

function tiersForSize(tiers: GlobalChallengeTier[], accountSize: string) {
  return accountSize === 'all'
    ? tiers
    : tiers.filter(tier => tier.sizeUsd === Number(accountSize))
}

function fundedFloorLabel(
  product: GlobalChallengeRow['product'],
  tiers = product.tiers,
) {
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

function pricedTierLabel(tiers: GlobalChallengeTier[]) {
  const count = tiers.filter(tier =>
    (tier.priceUsd != null && tier.priceUsd > 0)
    || (tier.priceEur != null && tier.priceEur > 0)).length
  return `${count}/${tiers.length} priced`
}

function profitTargetLabel(product: GlobalChallengeRow['product']) {
  if (product.phases === 0) return 'No evaluation'
  if (!product.profitTargets) return 'Unverified'
  const targets = [
    product.profitTargets.phase1,
    product.profitTargets.phase2,
    product.profitTargets.phase3,
  ].filter((value): value is number => value != null)
  return targets.length ? targets.map(value => `${value}%`).join(' → ') : 'Unverified'
}

function percentageOrTierDollars(
  percentage: number | null,
  tiers: GlobalChallengeTier[],
  field: 'dailyLossUsd' | 'maxLossUsd',
) {
  if (percentage != null) return `${percentage}%`
  const dollars = tiers.flatMap(tier =>
    tier[field] != null && tier[field]! > 0 ? [tier[field]!] : [],
  )
  const range = numberRange(dollars, 'USD')
  return range ? `${range} by tier` : 'Unverified'
}

function payoutLabel(product: GlobalChallengeRow['product']) {
  const first = product.payoutFirstDays == null
    ? 'First request unverified'
    : product.payoutFirstDays === 0
      ? 'On request'
      : `First request day ${product.payoutFirstDays}`
  const frequency = product.payoutFrequency
    ? product.payoutFrequency.replace('-', ' ')
    : 'frequency unverified'
  return `${first} · ${frequency}`
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
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

function minimumTierValue(
  product: GlobalChallengeRow['product'],
  field: 'priceUsd' | 'costToFundedUsd',
  accountSize: number | null = null,
) {
  const tiers = accountSize == null
    ? product.tiers
    : product.tiers.filter(tier => tier.sizeUsd === accountSize)
  const values = tiers.flatMap(tier =>
    tier[field] != null && tier[field]! > 0 ? [tier[field]!] : [],
  )
  return values.length ? Math.min(...values) : null
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

function shortlistKey(row: GlobalChallengeRow) {
  return `${row.firm.slug}:${row.product.slug}`
}

function shortlistChangeHref(rows: GlobalChallengeRow[]) {
  const params = new URLSearchParams({
    products: rows.map(shortlistKey).join(','),
  })
  return `/prop-firm-challenge-changes?${params.toString()}#change-ledger`
}

function parseDecisionPriority(value: string | null): DecisionPriority {
  return DECISION_PRIORITIES.some(priority => priority.value === value)
    ? value as DecisionPriority
    : 'entry-cost'
}

function decisionMoney(
  row: GlobalChallengeRow,
  field: 'entry' | 'funded',
  accountSize: string,
) {
  const tiers = accountSize === 'all'
    ? row.product.tiers
    : row.product.tiers.filter(tier => tier.sizeUsd === Number(accountSize))
  const usdField = field === 'entry' ? 'priceUsd' : 'costToFundedUsd'
  const eurField = field === 'entry' ? 'priceEur' : 'costToFundedEur'
  const usd = tiers.flatMap(tier =>
    tier[usdField] != null && tier[usdField]! > 0 ? [tier[usdField]!] : [])
  const eur = tiers.flatMap(tier =>
    tier[eurField] != null && tier[eurField]! > 0 ? [tier[eurField]!] : [])
  if (usd.length && !eur.length) return { value: Math.min(...usd), currency: 'USD' as const }
  if (eur.length && !usd.length) return { value: Math.min(...eur), currency: 'EUR' as const }
  return null
}

function decisionMoneyLabel(
  row: GlobalChallengeRow,
  field: 'entry' | 'funded',
  accountSize: string,
) {
  const money = decisionMoney(row, field, accountSize)
  if (money) return compactMoney(money.value, money.currency)
  return accountSize === 'all'
    ? 'No comparable published value'
    : `No verified ${compactAccountSize(Number(accountSize))} value`
}

function numericWinners(
  rows: GlobalChallengeRow[],
  valueFor: (row: GlobalChallengeRow) => number | null,
  direction: 'lowest' | 'highest',
) {
  const known = rows.flatMap(row => {
    const value = valueFor(row)
    return value == null ? [] : [{ row, value }]
  })
  if (known.length !== rows.length || !known.length) return null
  const best = direction === 'lowest'
    ? Math.min(...known.map(entry => entry.value))
    : Math.max(...known.map(entry => entry.value))
  return {
    value: best,
    winners: known.filter(entry => entry.value === best).map(entry => entry.row),
  }
}

function winnerTitle(rows: GlobalChallengeRow[]) {
  return rows.map(row => `${row.firm.name} ${row.product.name}`).join(' and ')
}

function decisionOutcome(
  rows: GlobalChallengeRow[],
  priority: DecisionPriority,
  accountSize: string,
): DecisionOutcome {
  const sizeLabel = accountSize === 'all'
    ? 'each product\'s lowest published tier'
    : `${compactAccountSize(Number(accountSize))} tiers`
  const noWinner = (
    title: string,
    reason: string,
    caveat: string,
  ): DecisionOutcome => ({ title, reason, caveat, winnerKeys: [] })

  if (priority === 'entry-cost' || priority === 'funded-cost') {
    const field = priority === 'entry-cost' ? 'entry' : 'funded'
    if (accountSize === 'all') {
      return noWinner(
        'Choose one shared account size',
        'Minimum fees can belong to different account sizes, so they are not an apples-to-apples cost comparison.',
        'Use the account-size filter, then the memo can compare the same published tier across every selected product.',
      )
    }
    const values = rows.map(row => ({ row, money: decisionMoney(row, field, accountSize) }))
    if (values.some(entry => !entry.money)) {
      return noWinner(
        priority === 'entry-cost' ? 'No defensible entry-fee winner' : 'No complete funded-cost winner',
        `At least 1 selected product lacks a comparable ${field === 'entry' ? 'entry fee' : 'cost-to-funded figure'} for ${sizeLabel}.`,
        'An unpublished value is unknown, not free. Verify the exact product and tier at checkout.',
      )
    }
    const currencies = new Set(values.map(entry => entry.money!.currency))
    if (currencies.size !== 1) {
      return noWinner(
        'Published currencies differ',
        'The selected products cannot be ranked without introducing a temporary exchange rate.',
        'Compare the final card or payment-provider total in one currency immediately before purchase.',
      )
    }
    const best = Math.min(...values.map(entry => entry.money!.value))
    const winners = values.filter(entry => entry.money!.value === best).map(entry => entry.row)
    const currency = values[0].money!.currency
    return {
      title: `${winnerTitle(winners)} ${winners.length === 1 ? 'has' : 'share'} the lowest ${field === 'entry' ? 'published entry' : 'funded-cost floor'}`,
      reason: `${compactMoney(best, currency)} is lowest across ${sizeLabel}.`,
      caveat: field === 'entry'
        ? accountSize === 'all'
          ? 'Minimum fees may represent different account sizes; a low fee does not offset stricter drawdown, reset, consistency, or payout rules.'
          : 'A low fee does not offset stricter drawdown, reset, consistency, or payout rules.'
        : accountSize === 'all'
          ? 'Minimum floors may represent different account sizes and exclude later rebills, resets, taxes, and payment fees.'
          : 'The floor assumes a first-cycle pass and excludes later rebills, resets, taxes, and payment fees.',
      winnerKeys: winners.map(shortlistKey),
    }
  }

  if (priority === 'payout-speed') {
    const result = numericWinners(rows, row => row.product.payoutFirstDays, 'lowest')
    if (!result) {
      return noWinner(
        'First-payout timing is incomplete',
        'At least 1 selected product has no verified first-request day.',
        'Unknown timing must not be interpreted as immediate payout access.',
      )
    }
    return {
      title: `${winnerTitle(result.winners)} ${result.winners.length === 1 ? 'allows' : 'allow'} the earliest stated request`,
      reason: result.value === 0 ? 'The published rule says on request.' : `The first published request point is day ${result.value}.`,
      caveat: 'Request timing is not receipt timing; profit buffers, consistency, KYC, and payout-rail checks still apply.',
      winnerKeys: result.winners.map(shortlistKey),
    }
  }

  if (priority === 'max-loss') {
    const drawdownTypes = new Set(rows.map(row => row.product.drawdownType))
    if (drawdownTypes.has(null) || drawdownTypes.size !== 1) {
      return noWinner(
        'Drawdown methods differ',
        'A percentage cap is not enough to rank static, balance-based, trailing, and EOD-trailing limits together.',
        'Choose products with the same drawdown method, then compare the percentage and exact calculation rule.',
      )
    }
    const result = numericWinners(rows, row => row.product.maxLossPct, 'highest')
    if (!result) {
      return noWinner(
        'Max-loss formats are not fully comparable',
        'At least 1 selected product lacks a percentage max-loss value.',
        'Dollar and percentage loss caps must not be ranked as if they were the same measure.',
      )
    }
    return {
      title: `${winnerTitle(result.winners)} ${result.winners.length === 1 ? 'has' : 'share'} the largest stated percentage cap`,
      reason: `${result.value}% is the largest published maximum-loss percentage in this shortlist.`,
      caveat: 'Static, balance-based, trailing, and EOD-trailing drawdown can behave very differently despite the headline percentage.',
      winnerKeys: result.winners.map(shortlistKey),
    }
  }

  const result = numericWinners(rows, row => row.product.profitSplitPct, 'highest')
  if (!result) {
    return noWinner(
      'Profit-split comparison is incomplete',
      'At least 1 selected product has no verified starting split.',
      'Do not substitute a promotional maximum split for an unpublished starting split.',
    )
  }
  return {
    title: `${winnerTitle(result.winners)} ${result.winners.length === 1 ? 'has' : 'share'} the highest stated starting split`,
    reason: `${result.value}% is the highest verified starting split across the selected products.`,
    caveat: 'A higher split does not show payout eligibility, frequency, buffer requirements, or successful receipt.',
    winnerKeys: result.winners.map(shortlistKey),
  }
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
      <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 800 }}>
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={event => {
          onChange(event.target.value)
          track('challenge_filter_used', {
            surface: 'global',
            filter: `${id.replace('global-challenge-', '')}:${event.target.value}`,
          })
        }}
        style={FIELD_STYLE}
      >
        {children}
      </select>
    </label>
  )
}

export default function GlobalChallengeComparison({ rows: initialRows }: { rows: GlobalChallengeRow[] }) {
  const firms = useMemo(
    () => [...new Map(initialRows.map(row => [row.firm.slug, row.firm])).values()]
      .sort((a, b) => a.name.localeCompare(b.name)),
    [initialRows],
  )
  const accountSizes = useMemo(
    () => [...new Set(initialRows.flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))]
      .sort((a, b) => a - b),
    [initialRows],
  )
  const rowByShortlistKey = useMemo(
    () => new Map(initialRows.map(row => [shortlistKey(row), row])),
    [initialRows],
  )
  const validShortlistKeys = useMemo(
    () => new Set(rowByShortlistKey.keys()),
    [rowByShortlistKey],
  )

  const [search, setSearch] = useState('')
  const [firmSlug, setFirmSlug] = useState('all')
  const [program, setProgram] = useState<ProgramFilter>('all')
  const [market, setMarket] = useState<MarketFilter>('all')
  const [pricing, setPricing] = useState<PricingFilter>('all')
  const [drawdown, setDrawdown] = useState<DrawdownFilter>('all')
  const [style, setStyle] = useState<StyleFilter>('all')
  const [accountSize, setAccountSize] = useState('all')
  const [sort, setSort] = useState<SortKey>('score')
  const [showAll, setShowAll] = useState(false)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [decisionPriority, setDecisionPriority] = useState<DecisionPriority>('entry-cost')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const decisionViewRef = useRef('')

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const next = parseShortlist(params.get('shortlist'), validShortlistKeys)
      const size = params.get('size')
      setShortlist(current => sameKeys(current, next) ? current : next)
      setDecisionPriority(parseDecisionPriority(params.get('priority')))
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
      .filter((row): row is GlobalChallengeRow => Boolean(row)),
    [rowByShortlistKey, shortlist],
  )
  const selectedDecisionOutcome = useMemo(
    () => selectedRows.length >= 2
      ? decisionOutcome(selectedRows, decisionPriority, accountSize)
      : null,
    [accountSize, decisionPriority, selectedRows],
  )

  useEffect(() => {
    if (selectedRows.length < 2) return
    const viewKey = `${selectedRows.map(shortlistKey).join(',')}:${decisionPriority}:${accountSize}`
    if (decisionViewRef.current === viewKey) return
    decisionViewRef.current = viewKey
    track('challenge_decision_viewed', {
      surface: 'global',
      priority: decisionPriority,
      account_size: accountSize,
      shortlist_count: selectedRows.length,
      winner_count: selectedDecisionOutcome?.winnerKeys.length ?? 0,
    })
  }, [accountSize, decisionPriority, selectedDecisionOutcome, selectedRows])

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
      setDecisionPriority('entry-cost')
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const commitDecisionPriority = (priority: DecisionPriority) => {
    setDecisionPriority(priority)
    setCopyState('idle')
    const url = new URL(window.location.href)
    url.searchParams.set('priority', priority)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    track('challenge_priority_used', { surface: 'global', priority })
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
      track('challenge_shortlist_remove', { surface: 'global', product: key })
      return
    }
    if (shortlist.length < MAX_SHORTLIST) {
      commitShortlist([...shortlist, key])
      track('challenge_shortlist_add', { surface: 'global', product: key })
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
        surface: 'global',
        count: selectedRows.length,
      })
    } catch {
      setCopyState('error')
    }
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
    copyResetRef.current = setTimeout(() => setCopyState('idle'), 2400)
  }

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const selectedSize = accountSize === 'all' ? null : Number(accountSize)
    return [...initialRows]
      .filter(row =>
        !needle
        || row.firm.name.toLowerCase().includes(needle)
        || row.product.name.toLowerCase().includes(needle),
      )
      .filter(row => firmSlug === 'all' || row.firm.slug === firmSlug)
      .filter(row => programMatches(row.product, program))
      .filter(row => market === 'all' || row.product.assetClass === market)
      .filter(row => pricing === 'all' || row.product.pricingModel === pricing)
      .filter(row => drawdown === 'all' || row.product.drawdownType === drawdown)
      .filter(row => styleMatches(row.product, style))
      .filter(row =>
        selectedSize == null || row.product.tiers.some(tier => tier.sizeUsd === selectedSize),
      )
      .sort((a, b) => {
        if (sort === 'entry-price') {
          return compareNullable(
            minimumTierValue(a.product, 'priceUsd', selectedSize),
            minimumTierValue(b.product, 'priceUsd', selectedSize),
            'asc',
          ) || a.product.name.localeCompare(b.product.name)
        }
        if (sort === 'funded-floor') {
          return compareNullable(
            minimumTierValue(a.product, 'costToFundedUsd', selectedSize),
            minimumTierValue(b.product, 'costToFundedUsd', selectedSize),
            'asc',
          ) || a.product.name.localeCompare(b.product.name)
        }
        if (sort === 'first-payout') {
          return compareNullable(a.product.payoutFirstDays, b.product.payoutFirstDays, 'asc')
            || a.product.name.localeCompare(b.product.name)
        }
        if (sort === 'profit-split') {
          return compareNullable(a.product.profitSplitPct, b.product.profitSplitPct, 'desc')
            || a.product.name.localeCompare(b.product.name)
        }
        if (sort === 'newest') {
          return b.product.capturedAt.localeCompare(a.product.capturedAt)
            || a.product.name.localeCompare(b.product.name)
        }
        return b.firm.score - a.firm.score
          || a.firm.name.localeCompare(b.firm.name)
          || a.product.name.localeCompare(b.product.name)
      })
  }, [
    accountSize,
    drawdown,
    firmSlug,
    initialRows,
    market,
    pricing,
    program,
    search,
    sort,
    style,
  ])

  const reset = () => {
    setSearch('')
    setFirmSlug('all')
    setProgram('all')
    setMarket('all')
    setPricing('all')
    setDrawdown('all')
    setStyle('all')
    setAccountSize('all')
    setSort('score')
    setShowAll(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('size')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    track('challenge_filters_reset', { surface: 'global', matching_products: rows.length })
  }

  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_ROWS)
  const selectedSizeLabel = accountSize === 'all'
    ? 'Minimum published entry'
    : `${compactAccountSize(Number(accountSize))} published entry`
  const fundedSizeLabel = accountSize === 'all'
    ? 'Minimum funded-cost floor'
    : `${compactAccountSize(Number(accountSize))} funded-cost floor`
  const decisionMatrixRows = [
    {
      label: selectedSizeLabel,
      valueFor: (row: GlobalChallengeRow) => decisionMoneyLabel(row, 'entry', accountSize),
    },
    {
      label: fundedSizeLabel,
      valueFor: (row: GlobalChallengeRow) => decisionMoneyLabel(row, 'funded', accountSize),
    },
    {
      label: 'Evaluation',
      valueFor: (row: GlobalChallengeRow) => (
        `${phasesLabel(row.product.phases)} · ${profitTargetLabel(row.product)}`
      ),
    },
    {
      label: 'Maximum loss',
      valueFor: (row: GlobalChallengeRow) => percentageOrTierDollars(
        row.product.maxLossPct,
        row.product.tiers,
        'maxLossUsd',
      ),
    },
    {
      label: 'Drawdown method',
      valueFor: (row: GlobalChallengeRow) => drawdownLabel(row.product.drawdownType),
    },
    {
      label: 'First payout request',
      valueFor: (row: GlobalChallengeRow) => payoutLabel(row.product),
    },
    {
      label: 'Starting profit split',
      valueFor: (row: GlobalChallengeRow) => (
        row.product.profitSplitPct == null ? 'Unverified' : `${row.product.profitSplitPct}%`
      ),
    },
    {
      label: 'Trading rules',
      valueFor: (row: GlobalChallengeRow) => (
        `EA ${ruleLabel(row.product.rules.ea)} · News ${ruleLabel(row.product.rules.news)} · `
        + `Overnight ${ruleLabel(row.product.rules.overnight)} · Weekend ${ruleLabel(row.product.rules.weekend)}`
      ),
    },
    {
      label: 'Dated change signal',
      valueFor: (row: GlobalChallengeRow) => (
        row.product.changeSignals.length
          ? `${row.product.changeSignals.length} · ${
            row.product.changeSignals.some(signal => signal.status === 'watch')
              ? 'Open watch'
              : 'Verified change'
          }`
          : 'No current product signal'
      ),
    },
    {
      label: 'Source captured',
      valueFor: (row: GlobalChallengeRow) => dateLabel(row.product.capturedAt),
    },
  ]

  return (
    <section className="home-section home-section--alt" aria-labelledby="global-challenge-table-heading">
      <div style={{ maxWidth: 1480, margin: '0 auto', padding: '0 1.5rem' }}>
        <div className="section-head">
          <div>
            <h2 id="global-challenge-table-heading" className="section-title">
              <Scale size={18} style={{ color: 'var(--accent-light)' }} />
              Compare challenge products
            </h2>
            <p className="section-sub-text">
              One row per product, with costs and rules kept separate. Dated change signals
              appear on the exact affected products.
            </p>
          </div>
          <span className="section-sub">
            <SlidersHorizontal size={13} /> Affiliate status contributes 0 ranking points
          </span>
        </div>

        <div className="post-sidebar-card" style={{ padding: '1.15rem' }}>
          <label htmlFor="global-challenge-search" style={{ display: 'grid', gap: '0.4rem', marginBottom: '0.8rem' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 800 }}>
              Search firm or product
            </span>
            <span style={{ position: 'relative', display: 'block', maxWidth: 480 }}>
              <Search
                size={14}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                }}
              />
              <input
                id="global-challenge-search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search Topstep, one-step, instant..."
                style={{ ...FIELD_STYLE, paddingLeft: '2.25rem' }}
              />
            </span>
          </label>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.8rem',
          }}>
            <FilterField id="global-challenge-firm" label="Firm" value={firmSlug} onChange={setFirmSlug}>
              <option value="all">All firms</option>
              {firms.map(firm => <option key={firm.slug} value={firm.slug}>{firm.name}</option>)}
            </FilterField>
            <FilterField
              id="global-challenge-program"
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
              id="global-challenge-market"
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
              id="global-challenge-pricing"
              label="Billing"
              value={pricing}
              onChange={value => setPricing(value as PricingFilter)}
            >
              <option value="all">Any billing</option>
              <option value="one-off">One-time fee</option>
              <option value="monthly-subscription">Monthly subscription</option>
              <option value="split-payment">Split payment</option>
            </FilterField>
            <FilterField
              id="global-challenge-style"
              label="Trading style"
              value={style}
              onChange={value => setStyle(value as StyleFilter)}
            >
              <option value="all">Any style</option>
              <option value="ea">EA allowed</option>
              <option value="news">News allowed</option>
              <option value="swing">Overnight + weekend</option>
            </FilterField>
            <FilterField
              id="global-challenge-drawdown"
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
              id="global-challenge-size"
              label="Account size"
              value={accountSize}
              onChange={commitAccountSize}
            >
              <option value="all">Any size</option>
              {accountSizes.map(size => (
                <option key={size} value={size}>{compactAccountSize(size)}</option>
              ))}
            </FilterField>
            <FilterField
              id="global-challenge-sort"
              label="Sort"
              value={sort}
              onChange={value => setSort(value as SortKey)}
            >
              <option value="score">Editorial score</option>
              <option value="entry-price">Lowest verified USD entry</option>
              <option value="funded-floor">Lowest USD funded floor</option>
              <option value="first-payout">Earliest first payout</option>
              <option value="profit-split">Highest stated split</option>
              <option value="newest">Newest source capture</option>
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
              Showing {visibleRows.length} of {rows.length} matching products
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
          className={`challenge-shortlist${selectedRows.length ? ' challenge-shortlist--active' : ''}`}
          aria-labelledby="challenge-shortlist-heading"
        >
          <div className="challenge-shortlist-head">
            <div>
              <span className="bento-tile-eyebrow">
                <Link2 size={12} aria-hidden="true" /> Shareable product shortlist
              </span>
              <h3 id="challenge-shortlist-heading">
                Compare 2–{MAX_SHORTLIST} exact challenge products
              </h3>
              <p>
                Selection stays in the URL. No account, cookie, or saved profile is required.
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
              {selectedRows.length > 0 && (
                <Link
                  href={shortlistChangeHref(selectedRows)}
                  prefetch={false}
                  className="btn-outline"
                  data-analytics-ignore
                  aria-label={`Check ${selectedRows.length} shortlisted product${selectedRows.length === 1 ? '' : 's'} for dated changes`}
                  onClick={() => track('challenge_change_shortlist_open', {
                    product_count: selectedRows.length,
                  })}
                >
                  <BellRing size={13} aria-hidden="true" /> Check changes
                </Link>
              )}
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
                Use <strong>Add</strong> in the first table column. Pick products from the
                same firm or different firms—the comparison remains visible when filters change.
              </span>
            </div>
          ) : (
            <>
              {selectedRows.length === 1 && (
                <p className="challenge-shortlist-prompt" role="status">
                  Select 1 more product to create the side-by-side comparison.
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
                          <dd>{accountRange(tiersForSize(product.tiers, accountSize))}</dd>
                        </div>
                        <div>
                          <dt>Published entry</dt>
                          <dd>{priceRange(tiersForSize(product.tiers, accountSize))}</dd>
                        </div>
                        <div>
                          <dt>Funded-cost floor</dt>
                          <dd>{fundedFloorLabel(
                            product,
                            tiersForSize(product.tiers, accountSize),
                          )}</dd>
                        </div>
                        <div>
                          <dt>Evaluation</dt>
                          <dd>{phasesLabel(product.phases)} · {profitTargetLabel(product)}</dd>
                        </div>
                        <div>
                          <dt>Loss limits</dt>
                          <dd>
                            {percentageOrTierDollars(product.dailyLossPct, product.tiers, 'dailyLossUsd')} daily
                            {' · '}
                            {percentageOrTierDollars(product.maxLossPct, product.tiers, 'maxLossUsd')} maximum
                          </dd>
                        </div>
                        <div>
                          <dt>Drawdown</dt>
                          <dd>{drawdownLabel(product.drawdownType)}</dd>
                        </div>
                        <div>
                          <dt>Payout</dt>
                          <dd>{payoutLabel(product)}</dd>
                        </div>
                        <div>
                          <dt>Profit split</dt>
                          <dd>{product.profitSplitPct == null ? 'Unverified' : `${product.profitSplitPct}%`}</dd>
                        </div>
                      </dl>

                      <div className="challenge-shortlist-rules" aria-label={`${firm.name} ${product.name} trading rules`}>
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

                      <div className="challenge-shortlist-card-foot">
                        <span>Captured {dateLabel(product.capturedAt)}</span>
                        <a href={product.sourceUrl} target="_blank" rel="nofollow noopener">
                          Source <ExternalLink size={10} aria-hidden="true" />
                        </a>
                        <Link
                          href={firm.reviewUrl}
                          onClick={() => track('challenge_review_open', {
                            surface: 'global',
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
              {selectedRows.length >= 2 && selectedDecisionOutcome && (
                <section
                  className="india-decision-memo"
                  aria-labelledby="global-decision-memo-heading"
                >
                  <div className="india-decision-memo-head">
                    <div>
                      <span className="bento-tile-eyebrow">
                        <Target size={12} aria-hidden="true" /> Context, not a universal winner
                      </span>
                      <h4 id="global-decision-memo-heading">
                        Selected-product decision memo
                      </h4>
                      <p>
                        Choose the constraint that matters most. The selected priority and account
                        size stay in the shareable URL.
                      </p>
                    </div>
                    <label htmlFor="global-decision-priority">
                      <span>Decision priority</span>
                      <select
                        id="global-decision-priority"
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
                    <strong>{selectedDecisionOutcome.title}</strong>
                    <p>{selectedDecisionOutcome.reason}</p>
                    <small>
                      <CircleAlert size={11} aria-hidden="true" />
                      {selectedDecisionOutcome.caveat}
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
                                  selectedDecisionOutcome.winnerKeys.includes(key)
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
                                    selectedDecisionOutcome.winnerKeys.includes(key)
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
            </>
          )}
          <p className="sr-only" aria-live="polite">
            {copyState === 'copied'
              ? 'Shortlist link copied to clipboard.'
              : copyState === 'error'
                ? 'The shortlist link could not be copied automatically.'
                : ''}
          </p>
        </section>

        {rows.length > 0 ? (
          <>
            <div style={{
              marginTop: '1rem',
              overflowX: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <table style={{
                width: '100%',
                minWidth: 1510,
                borderCollapse: 'collapse',
                background: 'var(--bg2)',
              }}>
                <thead>
                  <tr>
                    {[
                      'Shortlist',
                      'Firm & challenge',
                      'Size & price',
                      'Evaluation',
                      'Loss limits',
                      'Payout',
                      'Trading rules',
                      'Evidence & action',
                    ].map(label => (
                      <th key={label} scope="col" style={{
                        padding: '0.8rem',
                        color: '#fff',
                        background: 'var(--bg3)',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        fontSize: '0.7rem',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                      }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ firm, product }) => (
                    <tr key={`${firm.slug}-${product.slug}`}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 92 }}>
                        <button
                          type="button"
                          className={`challenge-shortlist-toggle${
                            shortlist.includes(`${firm.slug}:${product.slug}`)
                              ? ' challenge-shortlist-toggle--selected'
                              : ''
                          }`}
                          onClick={() => toggleShortlist(`${firm.slug}:${product.slug}`)}
                          disabled={
                            !shortlist.includes(`${firm.slug}:${product.slug}`)
                            && shortlist.length >= MAX_SHORTLIST
                          }
                          aria-pressed={shortlist.includes(`${firm.slug}:${product.slug}`)}
                          aria-label={`${
                            shortlist.includes(`${firm.slug}:${product.slug}`) ? 'Remove' : 'Add'
                          } ${firm.name} ${product.name} ${
                            shortlist.includes(`${firm.slug}:${product.slug}`) ? 'from' : 'to'
                          } shortlist`}
                        >
                          {shortlist.includes(`${firm.slug}:${product.slug}`)
                            ? <Check size={12} aria-hidden="true" />
                            : <Plus size={12} aria-hidden="true" />}
                          {shortlist.includes(`${firm.slug}:${product.slug}`)
                            ? `Selected ${shortlist.indexOf(`${firm.slug}:${product.slug}`) + 1}`
                            : 'Add'}
                        </button>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 205 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          {firm.logo ? (
                            <Image
                              src={firm.logo}
                              alt=""
                              width={30}
                              height={30}
                              style={{
                                objectFit: 'contain',
                                borderRadius: 7,
                                border: '1px solid var(--border)',
                              }}
                            />
                          ) : null}
                          <span>
                            <strong style={{ display: 'block', color: '#fff', fontSize: '0.8rem' }}>
                              {firm.name}
                            </strong>
                            <span style={{ color: 'var(--gold)', fontSize: '0.67rem', fontWeight: 800 }}>
                              Editorial {firm.score}/10
                            </span>
                          </span>
                        </span>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.78rem', marginTop: '0.55rem', fontWeight: 700 }}>
                          {product.name}
                        </span>
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.45rem' }}>
                          <span className="chip" style={{ display: 'inline-flex', fontSize: '0.64rem' }}>
                            {phasesLabel(product.phases)}
                          </span>
                          <span className="chip" style={{ display: 'inline-flex', fontSize: '0.64rem' }}>
                            {marketLabel(product.assetClass)}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 205 }}>
                        <strong style={{ display: 'block', color: priceRange(tiersForSize(product.tiers, accountSize)) === 'Unverified' ? '#fcd34d' : '#fff', fontSize: '0.8rem' }}>
                          {priceRange(tiersForSize(product.tiers, accountSize))}
                        </strong>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.68rem', marginTop: '0.3rem' }}>
                          {accountRange(tiersForSize(product.tiers, accountSize))}
                          {' · '}
                          {pricedTierLabel(tiersForSize(product.tiers, accountSize))}
                        </span>
                        <span style={{ display: 'block', color: 'var(--accent-light)', fontSize: '0.68rem', marginTop: '0.35rem', fontWeight: 800 }}>
                          {fundedFloorLabel(product, tiersForSize(product.tiers, accountSize))}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.65rem', marginTop: '0.25rem' }}>
                          {pricingLabel(product.pricingModel)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 170 }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '0.75rem' }}>
                          Target {profitTargetLabel(product)}
                        </strong>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.68rem', marginTop: '0.35rem' }}>
                          Minimum days: {product.minTradingDays ?? 'None'}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.66rem', marginTop: '0.25rem' }}>
                          Maximum days: {product.maxTradingDays ?? 'Unlimited'}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.66rem', marginTop: '0.25rem' }}>
                          Consistency {product.consistencyRulePct == null ? 'none published' : `${product.consistencyRulePct}%`}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 190 }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '0.72rem' }}>
                          Daily {percentageOrTierDollars(product.dailyLossPct, product.tiers, 'dailyLossUsd')}
                        </strong>
                        <span style={{ display: 'block', color: 'var(--text)', fontSize: '0.7rem', marginTop: '0.35rem' }}>
                          Maximum {percentageOrTierDollars(product.maxLossPct, product.tiers, 'maxLossUsd')}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.67rem', marginTop: '0.3rem' }}>
                          {drawdownLabel(product.drawdownType)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 175 }}>
                        <span style={{ display: 'block', color: '#fff', fontSize: '0.7rem', fontWeight: 800, textTransform: 'capitalize' }}>
                          {payoutLabel(product)}
                        </span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.68rem', marginTop: '0.35rem' }}>
                          Profit split {product.profitSplitPct == null ? 'unverified' : `${product.profitSplitPct}%`}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 150 }}>
                        {[
                          ['EA', product.rules.ea],
                          ['News', product.rules.news],
                          ['Overnight', product.rules.overnight],
                          ['Weekend', product.rules.weekend],
                        ].map(([label, value]) => (
                          <span key={label as string} style={{
                            display: 'block',
                            color: ruleColor(value as RuleAvailability),
                            fontSize: '0.68rem',
                            marginBottom: '0.2rem',
                          }}>
                            {label as string}: {ruleLabel(value as RuleAvailability)}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 175 }}>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.66rem' }}>
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
                        <div style={{ marginTop: '0.65rem' }}>
                          {firm.isPartner ? (
                            <Link
                              href={`/go/${firm.slug}?from=challenge-product-${product.slug}`}
                              prefetch={false}
                              target="_blank"
                              rel="sponsored nofollow noopener"
                              className="btn-primary"
                              onClick={() => track('challenge_offer_open', {
                                surface: 'global',
                                product: `${firm.slug}:${product.slug}`,
                              })}
                              style={{ padding: '0.48rem 0.62rem', fontSize: '0.68rem' }}
                            >
                              Check current offer <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <Link
                              href={firm.reviewUrl}
                              onClick={() => track('challenge_review_open', {
                                surface: 'global',
                                product: `${firm.slug}:${product.slug}`,
                              })}
                              className="btn-outline"
                              style={{ padding: '0.48rem 0.62rem', fontSize: '0.68rem' }}
                            >
                              Read review <ArrowRight size={11} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > INITIAL_ROWS && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAll(value => !value)}
                >
                  {showAll ? `Show first ${INITIAL_ROWS}` : `Show all ${rows.length} products`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="post-sidebar-card" style={{ marginTop: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>No sourced product matches every filter</h3>
            <p style={{ margin: '0.55rem auto 0', color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 620 }}>
              Reset one filter rather than treating an unpublished rule or fee as a match.
            </p>
          </div>
        )}

        <details className="challenge-product-index">
          <summary>Browse all {initialRows.length} source-dated challenge products</summary>
          <p>
            This complete index is rendered with the page. Filters above remain the fastest way to
            compare fees and rules; the list below keeps every tracked product discoverable.
          </p>
          <ul>
            {initialRows.map(({ firm, product }) => {
              const key = `${firm.slug}:${product.slug}`
              return (
                <li id={`challenge-product-${firm.slug}-${product.slug}`} key={key}>
                  <span>
                    <strong>{firm.name}</strong>
                    {product.name}
                  </span>
                  <span>
                    {phasesLabel(product.phases)} · {marketLabel(product.assetClass)} · captured{' '}
                    {dateLabel(product.capturedAt)}
                  </span>
                  <span>
                    <Link
                      href={firm.reviewUrl}
                      onClick={() => track('challenge_review_open', {
                        surface: 'global-index',
                        product: key,
                      })}
                    >
                      Review
                    </Link>
                    <a href={product.sourceUrl} target="_blank" rel="nofollow noopener">
                      Source <ExternalLink size={9} aria-hidden="true" />
                    </a>
                  </span>
                </li>
              )
            })}
          </ul>
        </details>

        <p style={{ margin: '0.85rem 0 0', color: 'var(--muted)', fontSize: '0.7rem', lineHeight: 1.55 }}>
          “Unverified” stays unknown rather than becoming zero, unlimited or allowed. EUR prices remain in EUR.
          Monthly funded-cost figures assume a first-cycle pass and exclude later rebills or resets.
        </p>
      </div>
    </section>
  )
}
