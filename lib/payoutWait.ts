import type { Challenge } from '@/lib/firms'

/**
 * Reader-facing first-payout wait for a product. Uses business days only where
 * the product notes say "<n> business day(s)"; 0 means no minimum wait.
 */
export function payoutWait(product: Pick<Challenge, 'payoutFirstDays' | 'notes'>): { short: string; phrase: string } | null {
  const days = product.payoutFirstDays
  if (days == null) return null
  if (days === 0) return { short: 'No minimum wait', phrase: 'no minimum wait' }
  const business = (product.notes ?? []).some(note => new RegExp(`\\b${days}[- ]business[- ]days?\\b`, 'i').test(note))
  return business
    ? { short: `${days} business days`, phrase: `after ${days} business days` }
    : { short: `Day ${days}`, phrase: `from day ${days}` }
}
