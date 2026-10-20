import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { firmSlug } from '@/lib/firmSlug'
import type { Challenge, Firm } from '@/lib/firms'

/**
 * Phase 1 preview of the generated compare verdict (design/article-format-spec.md §3.3, C9).
 * "Pick A if / Pick B if" lines are derived only from current challenge captures
 * and firms.json; nothing is hand-written, so the copy cannot go stale.
 */

type Side = { firm: Firm; products: Challenge[] }

function shortName(firm: Firm, product: Challenge) {
  const escaped = firm.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return product.productName.replace(new RegExp(`^${escaped}\\s*(?:Challenge:?\\s*)?`, 'i'), '').trim() || product.productName
}

const money = (value: number, currency: '$' | '€') => `${currency}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function cheapest100k(side: Side) {
  const rows = side.products.flatMap(product => product.accountSizes
    .filter(size => size.sizeUsd === 100000)
    .map(size => size.priceUsd != null
      ? { product, value: size.priceUsd, currency: '$' as const }
      : size.priceEur != null ? { product, value: size.priceEur, currency: '€' as const } : null)
    .filter(<T,>(row: T | null): row is T => row != null))
  return rows.sort((a, b) => a.value - b.value)[0] ?? null
}

function best<T>(products: Challenge[], value: (product: Challenge) => T | null, better: (a: T, b: T) => boolean) {
  let top: { product: Challenge; value: T } | null = null
  for (const product of products) {
    const v = value(product)
    if (v == null) continue
    if (!top || better(v, top.value)) top = { product, value: v }
  }
  return top
}

const split = (product: Challenge) => product.profitSplitPct
// 0 days marks a growth-based gate (instant products), not a day-0 payout.
const firstPayout = (product: Challenge) => product.payoutFirstDays != null && product.payoutFirstDays > 0 ? product.payoutFirstDays : null
const evaluations = (side: Side) => side.products.filter(product => product.phases > 0)

function range(values: number[], suffix = '%') {
  if (!values.length) return null
  const lo = Math.min(...values), hi = Math.max(...values)
  return lo === hi ? `${lo}${suffix}` : `${lo}–${hi}${suffix}`
}

function displayName(firm: Firm, product: Challenge) {
  return product.productName.toLowerCase().startsWith(firm.name.toLowerCase()) ? `${firm.name} ${shortName(firm, product)}` : product.productName
}

const CADENCE: Record<string, string> = { weekly: 'weekly', 'bi-weekly': 'every 14 days', monthly: 'monthly', 'on-demand': 'on demand' }
const TRAIL: Record<string, string> = { 'eod-trailing': 'trails at end of day', trailing: 'trails', 'balance-based': 'is balance-based' }

function allocation(firm: Firm) {
  const n = Number(String(firm.maxAllocation ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * "Pick A if / Pick B if" lines. EN Writer's copy is the template; each line is
 * emitted only when the current captures support it, with every number read
 * from the data. No cross-currency price comparisons.
 */
export function buildPickLines(a: Side, b: Side) {
  const sides = { a, b }
  const lines: Record<'a' | 'b', string[]> = { a: [], b: [] }
  const other = (key: 'a' | 'b') => (key === 'a' ? 'b' : 'a') as 'a' | 'b'

  for (const key of ['a', 'b'] as const) {
    const me = sides[key], them = sides[other(key)]
    const myEvals = evaluations(me), theirEvals = evaluations(them)

    // Rewards on demand vs a fixed cadence on the same number of phases.
    const onDemand = myEvals.find(product => product.payoutFrequency === 'on-demand' && firstPayout(product) != null)
    const peer = onDemand && theirEvals.find(product => product.phases === onDemand.phases && product.payoutFrequency && product.payoutFrequency !== 'on-demand' && firstPayout(product) != null)
    if (onDemand && peer) {
      lines[key].push(`you want rewards on demand: claim from day ${firstPayout(onDemand)}; ${displayName(them.firm, peer)} waits ${firstPayout(peer)} days, then pays ${CADENCE[peer.payoutFrequency!]}`)
    }

    // Higher split from day one.
    const top = best(myEvals, split, (x, y) => x > y)
    const theirSplits = theirEvals.map(split).filter((v): v is number => v != null)
    if (top && theirSplits.length === theirEvals.length && theirSplits.length && theirSplits.every(v => v < top.value)) {
      const same = theirSplits.every(v => v === theirSplits[0])
      lines[key].push(same
        ? `you want a ${top.value}% split from day one: ${displayName(me.firm, top.product)} pays ${top.value}%; every ${them.firm.name} challenge starts at ${theirSplits[0]}%`
        : `you want a ${top.value}% split from day one: ${displayName(me.firm, top.product)} pays ${top.value}%; ${them.firm.name} challenges start at ${Math.max(...theirSplits)}% or less`)
    }

    // Overnight and weekend holding, product by product.
    const allows = (side: Side, rule: 'overnight' | 'weekend') => side.products.length > 0 && side.products.every(product => product.rules?.[rule] === true)
    const restricts = (side: Side, rule: 'overnight' | 'weekend') => side.products.length > 0 && side.products.every(product => product.rules?.[rule] === 'restricted' || product.rules?.[rule] === false)
    if (allows(me, 'overnight') && allows(me, 'weekend') && restricts(them, 'overnight') && restricts(them, 'weekend')) {
      lines[key].push(`you hold trades overnight or over the weekend: ${me.firm.name} allows both; ${them.firm.name} restricts both`)
    }

    // Weekly payouts.
    const weekly = myEvals.find(product => product.payoutFrequency === 'weekly' && firstPayout(product) != null)
    const theirFirst = best(theirEvals, firstPayout, (x, y) => x < y)
    if (weekly && theirFirst && !theirEvals.some(product => product.payoutFrequency === 'weekly')) {
      lines[key].push(`you want weekly payouts: ${displayName(me.firm, weekly)} pays weekly, with the first claim from day ${firstPayout(weekly)}; ${them.firm.name}'s first claim is day ${theirFirst.value}`)
    }

    // One-step with a fixed floor (drawdown from the product files).
    const myOne = myEvals.find(product => product.phases === 1 && product.drawdownType === 'static' && product.maxLossPct != null)
    const theirOne = theirEvals.find(product => product.phases === 1 && product.drawdownType && product.drawdownType !== 'static')
    if (myOne && theirOne) {
      lines[key].push(`you want a one-step with a fixed floor: ${displayName(me.firm, myOne)}'s ${myOne.maxLossPct}% max loss is static; ${displayName(them.firm, theirOne)} ${TRAIL[theirOne.drawdownType!] ?? 'is not static'}`)
    }

    // Scale: published maximum allocation; TradingView-style platform fallback.
    const mine = allocation(me.firm), theirs = allocation(them.firm)
    if (mine && theirs && mine > theirs) {
      lines[key].push(`you plan to scale: ${me.firm.name} lists a ${me.firm.maxAllocation} maximum allocation vs ${them.firm.name}'s ${them.firm.maxAllocation}`)
    } else if (!mine || !theirs) {
      const only = (me.firm.platforms ?? []).filter(platform => !(them.firm.platforms ?? []).includes(platform))
      if (only.length) lines[key].push(`you trade on ${only.join(' or ')}: ${me.firm.name} supports it; ${them.firm.name} lists ${(them.firm.platforms ?? []).join(', ')}`)
    }
  }
  return { a: lines.a.slice(0, 3), b: lines.b.slice(0, 3) }
}

export function buildSideFacts(side: Side) {
  const cheap = cheapest100k(side)
  const pay = best(side.products, firstPayout, (x, y) => x < y)
  return [
    { label: 'Our score', value: `${side.firm.score}/10` },
    { label: 'Lowest $100K fee', value: cheap ? `${money(cheap.value, cheap.currency)} (${shortName(side.firm, cheap.product)})` : null },
    { label: 'Base split', value: range(side.products.map(split).filter((v): v is number => v != null)) },
    { label: 'Max loss', value: range(side.products.map(product => product.maxLossPct).filter((v): v is number => v != null)) },
    { label: 'Earliest first payout', value: pay ? `Day ${pay.value} (${shortName(side.firm, pay.product)})` : null },
    { label: 'Platforms', value: side.firm.platforms?.length ? side.firm.platforms.join(' · ') : null },
  ]
}

export default function ComparePickVerdict({ a, b, checkedAt, campaign }: { a: Side; b: Side; checkedAt?: string | null; campaign: string }) {
  const picks = buildPickLines(a, b)
  const factsA = buildSideFacts(a), factsB = buildSideFacts(b)
  const rows = factsA.map((fact, index) => ({ label: fact.label, a: fact.value, b: factsB[index].value })).filter(row => row.a || row.b)
  const currencies = new Set([cheapest100k(a)?.currency, cheapest100k(b)?.currency].filter(Boolean))
  return (
    <section className="compare-pick" aria-labelledby="compare-pick-title" data-compare-pick-verdict>
      <span className="review-verdict__wip">Preview, work in progress</span>
      <h2 id="compare-pick-title" className="compare-pick__title">{a.firm.name} vs {b.firm.name}: which to pick</h2>
      {checkedAt && <p className="compare-pick__checked">Built from product captures checked {checkedAt}</p>}
      <div className="compare-pick__cols">
        {(['a', 'b'] as const).map(key => {
          const side = key === 'a' ? a : b
          return (
            <div key={key} className="compare-pick__col">
              <p className="compare-pick__h">Pick {side.firm.name} if…</p>
              {picks[key].length
                ? <ul>{picks[key].map(line => <li key={line}>{line}</li>)}</ul>
                : <p className="compare-pick__none">No captured field favours {side.firm.name} on its own.</p>}
              <div className="compare-pick__cta">
                <Link
                  href={`/go/${firmSlug(side.firm.name)}?from=compare-${campaign}`}
                  prefetch={false}
                  rel={side.firm.affiliateUrl ? 'sponsored nofollow noopener' : 'nofollow noopener'}
                  target="_blank"
                  className="btn-primary"
                  data-pick-cta={firmSlug(side.firm.name)}
                >
                  Visit {side.firm.name} <ExternalLink size={13} aria-hidden="true" />
                </Link>
                <span>{side.firm.affiliateUrl ? 'Partner link' : 'Official site · no affiliate deal'}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="compare-pick__facts-wrap">
        <table className="compare-pick__facts">
          <caption className="cm-caption">Key facts side by side</caption>
          <thead><tr><th scope="col"><span className="cm-caption">Fact</span></th><th scope="col">{a.firm.name}</th><th scope="col">{b.firm.name}</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label}><th scope="row">{row.label}</th><td>{row.a ?? '—'}</td><td>{row.b ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {currencies.size > 1 && <p className="compare-pick__note">Fees are in different currencies (EUR and USD), so they are shown as published and not ranked against each other.</p>}
    </section>
  )
}
