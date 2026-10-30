import { getAllChallenges, getAllFirms } from '@/lib/firms'
import { buildChallengeComparisonRows } from '@/lib/challengeComparisonData'
import { priceBreakdownLabel, tierPriceParts, tierTotalPrice } from '@/lib/challengeComparison'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { outboundSlug } from '@/lib/outboundDestinations'
import { russiaBasisDateFor, russiaStatusForProduct, type RussiaStatus } from '@/lib/russiaAvailability'
import { getAllDeals } from '@/lib/deals'
import type { ComparisonRow } from './types'

/** Preferred comparison size. Falls back to the closest published tier. */
const TABLE_SIZE = 50000
/** First-party brand spellings used on Russian pages (see test-russian-expiry). */
const RU_DISPLAY_NAME: Record<string, string> = { 'bright-funded': 'BrightFunded' }
const RU_ORDER: Record<RussiaStatus, number> = { available: 0, unclear: 1, unverified: 1, restricted: 2 }

/**
 * One row per firm: the cheapest source-fresh programme at the table size.
 * Everything comes from firms.json and content/data/challenges; nothing is estimated.
 */
export function getHomeComparisonRows(locale: 'en' | 'ru', now = new Date()): ComparisonRow[] {
  const firms = getAllFirms()
  const rows = buildChallengeComparisonRows(getAllChallenges(), firms, getChallengeWatchEntries(), now, locale)
  const best = new Map<string, ComparisonRow>()
  const bestTotal = new Map<string, number>()
  for (const row of rows) {
    const tier = row.product.tiers.find(t => t.sizeUsd === TABLE_SIZE)
    if (!tier) continue
    const price = tier.priceUsd ?? tier.priceEur
    if (price == null || price <= 0) continue
    const currency = tier.priceUsd != null ? 'USD' : 'EUR'
    // "Cheapest" means price plus mandatory after-pass and activation fees.
    const total = tierTotalPrice(tier, currency)
    if (total == null) continue
    const firm = firms.find(f => outboundSlug(f.name) === row.firm.slug)
    const currentTotal = bestTotal.get(row.firm.slug)
    if (currentTotal != null && currentTotal <= total) continue
    bestTotal.set(row.firm.slug, total)
    const parts = currency === 'USD' ? tierPriceParts(tier) : null
    best.set(row.firm.slug, {
      firmSlug: row.firm.slug,
      firmName: (locale === 'ru' ? RU_DISPLAY_NAME[row.firm.slug] : undefined) ?? row.firm.name,
      logo: row.firm.logo,
      reviewUrl: row.firm.reviewUrl,
      score: row.firm.score,
      trustpilot: firm && !firm.trustpilotRatingSuppressed ? firm.trustpilotScore ?? null : null,
      product: row.product.name,
      splitProductKey: `${row.firm.slug}:${row.product.slug}`,
      phases: row.product.phases,
      assetClass: row.product.assetClass,
      price,
      currency,
      priceBreakdown: parts
        ? priceBreakdownLabel(parts, locale, value => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value))
        : null,
      pricingModel: row.product.pricingModel,
      profitTarget: row.product.profitTargets?.phase1 ?? null,
      dailyLossPct: row.product.dailyLossPct,
      maxLossPct: row.product.maxLossPct,
      profitSplitPct: row.product.profitSplitPct,
      ...(row.product.splitTierRows?.length ? { splitTierRows: row.product.splitTierRows } : {}),
      payoutFrequency: row.product.payoutFrequency,
      checkedOn: row.product.capturedAt,
      goHref: firm?.affiliateUrl ? `/go/${row.firm.slug}` : null,
      officialUrl: firm?.affiliateUrl ? null : firm?.officialUrl ?? null,
      russiaStatus: locale === 'ru' ? russiaStatusForProduct(row.firm.slug, row.product.assetClass) : null,
      russiaBasisDate: locale === 'ru' ? russiaBasisDateFor(row.firm.slug) : null,
    })
  }
  return [...best.values()].sort((a, b) =>
    (locale === 'ru' ? RU_ORDER[a.russiaStatus!] - RU_ORDER[b.russiaStatus!] : 0) || b.score - a.score)
}

export function getHomeCounters(now = new Date()) {
  const firms = getAllFirms()
  const rows = buildChallengeComparisonRows(getAllChallenges(), firms, getChallengeWatchEntries(), now)
  const dates = rows.map(row => row.product.capturedAt).sort()
  return { firms: firms.length, freshProducts: rows.length, latestCheck: dates.at(-1) ?? null }
}

/** A typeable code only when deals.json has a current, verified checkout code. Never invented. */
export function getVerifiedCode(firmSlug: string, now = new Date()): { code: string; pct?: number; amountLabel: string } | null {
  const deal = getAllDeals(now).find(d => d.firmSlug === firmSlug && d.mechanism === 'checkout-code' && d.code)
  return deal ? { code: deal.code!, pct: deal.pct, amountLabel: deal.amountLabel } : null
}
