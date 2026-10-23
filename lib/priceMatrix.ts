import type { Challenge, ChallengeAccountSize } from '@/lib/firms'

/**
 * Price matrix data (design/article-format-spec.md §4 C5): one row per account
 * size, one column per product, each cell the firm's own published fee for
 * that exact tier. Nothing is converted: USD stays USD and EUR stays EUR
 * (AGENTS.md "never invent numbers"). Callers pass only products that passed
 * their own freshness gate; this module never decides freshness.
 */

export type PriceMatrixLocale = 'en' | 'ru'

export type PriceMatrixCell =
  | { kind: 'missing' }
  | { kind: 'unpublished' }
  | {
    kind: 'price'
    currency: 'USD' | 'EUR'
    amount: number
    monthly: boolean
    activationUsd: number | null
    payLaterUsd: number | null
    refundable: boolean | null
  }

export type PriceMatrixColumn = {
  product: Challenge
  label: string
  capturedAt: string
  /** Refund status shared by every priced tier of the product, or null when it differs/is not stated. */
  refundable: boolean | null
  refundUniform: boolean
}

export type PriceMatrixData = {
  sizes: number[]
  columns: PriceMatrixColumn[]
  rows: Array<{ sizeUsd: number; cells: PriceMatrixCell[] }>
  /** Number of priced cells: equals the number of priced tiers in the input. */
  pricedCount: number
  capturedDates: string[]
}

export function tierCell(product: Challenge, tier: ChallengeAccountSize | undefined): PriceMatrixCell {
  if (!tier) return { kind: 'missing' }
  const usd = tier.priceUsd != null && Number.isFinite(tier.priceUsd) && tier.priceUsd > 0 ? tier.priceUsd : null
  const eur = tier.priceEur != null && Number.isFinite(tier.priceEur) && tier.priceEur > 0 ? tier.priceEur : null
  if (usd == null && eur == null) return { kind: 'unpublished' }
  const activation = tier.activationFeeUsd ?? product.activationFeeUsd ?? null
  return {
    kind: 'price',
    currency: usd != null ? 'USD' : 'EUR',
    amount: (usd ?? eur)!,
    monthly: product.pricingModel === 'monthly-subscription',
    activationUsd: activation != null && activation > 0 ? activation : null,
    payLaterUsd: tier.payLaterUsd != null && tier.payLaterUsd > 0 ? tier.payLaterUsd : null,
    refundable: tier.refundable ?? null,
  }
}

/** Strip the firm name from a product name so column headers stay short. */
export function shortProductName(firmName: string, productName: string) {
  const escaped = firmName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return productName.replace(new RegExp(`^${escaped}\\s*(?:Challenge:?\\s*)?`, 'i'), '').trim() || productName
}

export function buildPriceMatrix(products: Challenge[], firmName: string): PriceMatrixData {
  const priced = products.filter(product => product.accountSizes.some(tier => tierCell(product, tier).kind === 'price'))
  const sizes = [...new Set(priced.flatMap(product => product.accountSizes.map(tier => tier.sizeUsd)))].sort((a, b) => a - b)
  const columns = priced.map(product => {
    const statuses = product.accountSizes
      .map(tier => tierCell(product, tier))
      .flatMap(cell => cell.kind === 'price' ? [cell.refundable] : [])
    const distinct = new Set(statuses)
    const refundUniform = distinct.size === 1
    return {
      product,
      label: shortProductName(firmName, product.productName),
      capturedAt: product.sourceCapturedAt,
      refundable: refundUniform ? statuses[0] : null,
      refundUniform,
    }
  })
  const rows = sizes
    .map(sizeUsd => ({ sizeUsd, cells: priced.map(product => tierCell(product, product.accountSizes.find(tier => tier.sizeUsd === sizeUsd))) }))
    // A size that no product prices adds nothing a reader can act on.
    .filter(row => row.cells.some(cell => cell.kind === 'price'))
  const pricedCount = rows.reduce((total, row) => total + row.cells.filter(cell => cell.kind === 'price').length, 0)
  return {
    sizes: rows.map(row => row.sizeUsd),
    columns,
    rows,
    pricedCount,
    capturedDates: [...new Set(priced.map(product => product.sourceCapturedAt))].sort(),
  }
}

export function formatMatrixDate(iso: string, locale: PriceMatrixLocale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const date = new Date(`${iso}T00:00:00Z`)
  return locale === 'ru'
    ? date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatMatrixMoney(amount: number, currency: 'USD' | 'EUR') {
  const digits = Number.isInteger(amount) ? 0 : 2
  const text = amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 })
  return `${currency === 'USD' ? '$' : '€'}${text}`
}

export function formatMatrixSize(sizeUsd: number) {
  return sizeUsd >= 1000 && sizeUsd % 1000 === 0 ? `$${sizeUsd / 1000}K` : `$${sizeUsd.toLocaleString('en-US')}`
}
