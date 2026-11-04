/**
 * Consistency-rule calculator math and public preset types.
 *
 * Presets that cross into the client component must use these projected fields
 * only — never raw Challenge / consistencyBasis* keys (see lib/publicFirm.ts
 * and scripts/test-no-firm-internals-html.mjs).
 */

export type ConsistencyCalcBasis =
  | 'total-profit'
  | 'payout-cycle-profit'
  | 'profit-target'
  | 'per-trade'
  | 'per-position'
  | 'not-stated'

export type ConsistencyCalcKind = 'rule' | 'no-rule'

/** Minimal public preset passed as props to the client calculator. */
export type ConsistencyPreset = {
  id: string
  label: string
  kind: ConsistencyCalcKind
  /** Null when the product has no percentage to check (no-rule) or only a firm-level summary. */
  limitPct: number | null
  /**
   * Prefill for “Measured against”. `not-stated` when the capture left the
   * basis null — never coerce to total-profit or profit-target.
   */
  basis: ConsistencyCalcBasis
  /** `lte` = share ≤ limit; `lt` = share < limit (e.g. Apex “less than 50%”). */
  inequality: 'lte' | 'lt'
  /** Short stage / product note shown under the preset (public-safe). */
  stageNote?: string
  /** Shown when basis is not-stated; must not invent a denominator. */
  basisNote?: string
  /** Empty-state body for no-rule presets (HTML not allowed; plain text / markdown-ish). */
  emptyState?: string
  sourceUrl?: string
  sourceCapturedAt?: string
  firmName?: string
  reviewHref?: string
}

export type ConsistencyCalcInput = {
  bestDay: number
  applicable: number
  limitPct: number
  inequality?: 'lte' | 'lt'
}

export type ConsistencyCalcResult = {
  sharePct: number
  pass: boolean
  requiredApplicable: number
  extraNeeded: number
}

/** Best-day share formula. Returns null when inputs are not usable. */
export function calculateConsistencyShare(input: ConsistencyCalcInput): ConsistencyCalcResult | null {
  const { bestDay, applicable, limitPct, inequality = 'lte' } = input
  if (![bestDay, applicable, limitPct].every(n => Number.isFinite(n))) return null
  if (bestDay < 0 || applicable <= 0 || limitPct <= 0 || limitPct >= 100) return null
  const sharePct = (bestDay / applicable) * 100
  const pass = inequality === 'lt' ? sharePct < limitPct : sharePct <= limitPct
  const requiredApplicable = bestDay / (limitPct / 100)
  const extraNeeded = Math.max(0, requiredApplicable - applicable)
  return { sharePct, pass, requiredApplicable, extraNeeded }
}

/** Map a stored ConsistencyBasis (or null) to the calculator's public basis. */
export function basisFromChallenge(
  value: string | null | undefined,
): ConsistencyCalcBasis {
  if (value === 'total-profit') return 'total-profit'
  if (value === 'payout-cycle-profit') return 'payout-cycle-profit'
  if (value === 'profit-target') return 'profit-target'
  if (value === 'per-trade') return 'per-trade'
  if (value === 'per-position') return 'per-position'
  return 'not-stated'
}

export const BASIS_LABELS: Record<ConsistencyCalcBasis, string> = {
  'total-profit': 'Total net profit (cumulative; no payout reset stated)',
  'payout-cycle-profit': 'Profit in current payout / reward cycle (resets after payout)',
  'profit-target': 'Fixed profit target',
  'per-trade': 'Largest winning trade ÷ total profit',
  'per-position': 'Largest winning position ÷ total profit',
  'not-stated': 'Not stated by the firm',
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)
}

export function formatShare(n: number) {
  return `${n.toFixed(1)}%`
}
