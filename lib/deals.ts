import fs from 'fs'
import path from 'path'

/**
 * A discount / offer for a prop firm, shown on /prop-firm-discount-codes.
 *
 * The honesty model is the whole point of this file:
 *   • We publish a typeable `code` ONLY when it's a real coupon we've confirmed
 *     works. When a saving is applied automatically via our affiliate link
 *     (no coupon to type), we leave `code` empty and say so in `note`.
 *   • `verifiedOn` is the date we last checked the offer. It is rendered on the
 *     page, so freshness is always *stated*, never implied.
 *   • Expired offers and offers not rechecked within 30 days are dropped by
 *     getAllDeals(), so an old promotion is never presented as current.
 *
 * Owner workflow: this is the single file to edit. Add a verified deal to
 * content/data/deals.json and it appears on the hub on the next build — no
 * code change. That is the growth lever for catching up to competitors who
 * list dozens of deals.
 */
export interface Deal {
  /** slugify(firm.name) — joins to a Firm via getAllFirms(). */
  firmSlug: string
  /**
   * 'partner' = we have an affiliate relationship (the outbound click earns).
   * 'listed'  = no partnership; shown for completeness, links to our review.
   * The authoritative earn signal is still the firm's `affiliateUrl` (that is
   * what /go redirects on); this documents intent and lets a listed firm carry
   * a verified code too.
   */
  status: 'partner' | 'listed'
  /** A real, typeable checkout coupon. Omit when the saving is link-applied. */
  code?: string
  /** Discount as an integer % (e.g. 10). */
  pct?: number
  /** Human label always shown: "10% off", "Up to 30% off", "Free reset". */
  amountLabel: string
  /** What the offer covers: "All challenges", "1-Step only", "First order". */
  scope?: string
  /** ISO date (YYYY-MM-DD) we last confirmed it. Drives the "checked {date}" pill. */
  verifiedOn: string
  /** ISO date the offer ends. Strictly-past = dropped by getAllDeals(). */
  expiresOn?: string
  /** Short house-voice caveat (e.g. "First order only — doesn't stack with add-ons"). */
  note?: string
}

const DEALS_PATH = path.join(process.cwd(), 'content/data/deals.json')

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * True only for a valid, non-future check performed within the last 30 days.
 */
export function isDealFresh(deal: Pick<Deal, 'verifiedOn'>, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deal.verifiedOn)) return false
  const verified = new Date(`${deal.verifiedOn}T00:00:00Z`)
  if (Number.isNaN(verified.getTime())) return false
  const ageDays = Math.floor((now.getTime() - verified.getTime()) / 86_400_000)
  return ageDays >= 0 && ageDays <= 30
}

/** Return only non-expired offers whose verification is still fresh. */
export function getAllDeals(now = new Date()): Deal[] {
  if (!fs.existsSync(DEALS_PATH)) return []
  const raw = fs.readFileSync(DEALS_PATH, 'utf-8')
  const deals = JSON.parse(raw) as Deal[]
  const today = now.toISOString().slice(0, 10)
  return deals.filter(deal =>
    isDealFresh(deal, now) &&
    (!deal.expiresOn || deal.expiresOn >= today),
  )
}

/** Non-expired deals for a single firm (slugified name). */
export function getDealsByFirm(firmSlug: string): Deal[] {
  return getAllDeals().filter(d => d.firmSlug === firmSlug)
}

/**
 * Order deals for display: a verified code first, then partners, then by the
 * firm's editorial score (desc). Drops deals whose firm no longer exists in
 * firms.json (defensive — a deleted firm shouldn't 500 the page).
 */
export function rankDeals(
  deals: Deal[],
  firms: Array<{ name: string; score: number }>,
): Deal[] {
  const scoreBySlug = new Map(firms.map(f => [slugify(f.name), f.score]))
  return deals
    .filter(d => scoreBySlug.has(d.firmSlug))
    .sort((a, b) => {
      const code = (a.code ? 1 : 0) - (b.code ? 1 : 0)
      if (code) return -code
      const partner =
        (a.status === 'partner' ? 1 : 0) - (b.status === 'partner' ? 1 : 0)
      if (partner) return -partner
      return (scoreBySlug.get(b.firmSlug) ?? 0) - (scoreBySlug.get(a.firmSlug) ?? 0)
    })
}
