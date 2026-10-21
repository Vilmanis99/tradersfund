import copy from '@/content/data/verdict-copy.json'
import { getChallengesByFirm, isChallengeFresh, type Challenge } from '@/lib/firms'

/** Writer overrides for generated verdict copy; see content/data/verdict-copy.json. */
type ReviewCopy = { verdict?: string | null; bestFor?: string[]; notFor?: string[] }
type CompareCopy = { pickA?: string[]; pickB?: string[] }

const data = copy as { reviews?: Record<string, ReviewCopy>; compares?: Record<string, CompareCopy> }

/**
 * Data tokens, so prices that change render from the captures rather than
 * being frozen in copy:
 *   {{price:<firm>/<productSlug>@<sizeUsd>}}  priceUsd of that tier
 *   {{lowest:<firm>@<sizeUsd>}}               lowest priceUsd at that size across fresh products
 * An optional |month suffix appends "/month". "(promo)" is added while the
 * product notes mark the price as promotional only. A token that cannot be
 * resolved from fresh data drops the whole line (no stale figure, no gap).
 */
const PROMO = /PROMOTIONAL PRICE ONLY/i
const LIST = /PRICE = LIST PRICE/i
const isPromo = (product: Challenge) => (product.notes ?? []).some(note => PROMO.test(note)) && !(product.notes ?? []).some(note => LIST.test(note))
const usd = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function resolveToken(kind: string, ref: string, unit: string | undefined) {
  const m = ref.match(/^([a-z0-9-]+)(?:\/([a-z0-9-]+))?@(\d+)$/)
  if (!m) return null
  const [, firm, productSlug, size] = m
  const rows = getChallengesByFirm(firm)
    .filter(product => isChallengeFresh(product) && (kind === 'lowest' || product.productSlug === productSlug))
    .flatMap(product => product.accountSizes.filter(tier => tier.sizeUsd === Number(size) && tier.priceUsd != null && tier.priceUsd > 0).map(tier => ({ product, price: tier.priceUsd as number })))
    .sort((x, y) => x.price - y.price)
  if (kind !== 'price' && kind !== 'lowest') return null
  const row = rows[0]
  if (!row) return null
  return `${usd(row.price)}${unit === 'month' ? '/month' : ''}${isPromo(row.product) ? ' (promo)' : ''}`
}

export function resolveCopyLine(line: string): string | null {
  let failed = false
  const out = line.replace(/\{\{(\w+):([^}|]+)(?:\|(\w+))?\}\}/g, (_, kind: string, ref: string, unit?: string) => {
    const value = resolveToken(kind, ref, unit)
    if (value == null) failed = true
    return value ?? ''
  })
  return failed ? null : out
}

const lines = (value: unknown) => Array.isArray(value)
  ? value.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).map(resolveCopyLine).filter((line): line is string => line != null)
  : undefined

export function getReviewCopy(slug: string): ReviewCopy {
  const entry = data.reviews?.[slug] ?? {}
  return {
    // null hides the verdict line; a string replaces it; absent uses the review's own sentence.
    verdict: entry.verdict === null ? null : typeof entry.verdict === 'string' && entry.verdict.trim() ? entry.verdict.trim() : undefined,
    bestFor: lines(entry.bestFor),
    notFor: lines(entry.notFor),
  }
}

export function getCompareCopy(matchup: string): CompareCopy {
  const entry = data.compares?.[matchup] ?? {}
  // An empty list is kept: the writer found no honest line for that side, so it stays hidden.
  return { pickA: lines(entry.pickA), pickB: lines(entry.pickB) }
}
