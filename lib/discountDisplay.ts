import type { Firm } from '@/lib/firms'

type DiscountFields = Pick<Firm, 'discountCode' | 'discountPct' | 'discountCodeCheckoutVerified'>

/**
 * The public code that may be promoted as "N% off · code" (pills, sticky CTA,
 * spotlight, OG cards). A code whose discount was never confirmed at checkout
 * (`discountCodeCheckoutVerified: false`) is not promoted; surfaces that show
 * it at all must label it unverified (see `unverifiedDiscount`).
 */
export function promotableDiscount(firm: DiscountFields): { code: string; pct: number } | null {
  if (!firm.discountCode || !firm.discountPct) return null
  if (firm.discountCodeCheckoutVerified === false) return null
  return { code: firm.discountCode, pct: firm.discountPct }
}

/** An advertised code we have seen but not confirmed at checkout. */
export function unverifiedDiscount(firm: DiscountFields): { code: string; pct: number | null } | null {
  if (!firm.discountCode || firm.discountCodeCheckoutVerified !== false) return null
  return { code: firm.discountCode, pct: firm.discountPct ?? null }
}
