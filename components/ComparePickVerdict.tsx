import Link from 'next/link'
import { consistencyFields, consistencyRulePhrase, scopedConsistencyRules } from '@/lib/consistencyScope'
import { ExternalLink } from 'lucide-react'
import { firmSlug } from '@/lib/firmSlug'
import type { Challenge, Firm } from '@/lib/firms'
import { payoutWait } from '@/lib/payoutWait'
import { possessive } from '@/lib/possessive'

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

export type SourcedLine = { text: string; fields: string[] }

export { possessive }

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

/** Product notes that mention another payout route make a single-cadence claim unsafe. */
function hasAlternativePayout(product: Challenge) {
  return (product.notes ?? []).some(note => /on-?demand|alternative|payout option|reward option/i.test(note))
}

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
  const lines: Record<'a' | 'b', SourcedLine[]> = { a: [], b: [] }
  const other = (key: 'a' | 'b') => (key === 'a' ? 'b' : 'a') as 'a' | 'b'
  const add = (key: 'a' | 'b', text: string, fields: string[]) => { lines[key].push({ text, fields }) }

  for (const key of ['a', 'b'] as const) {
    const me = sides[key], them = sides[other(key)]
    const myEvals = evaluations(me), theirEvals = evaluations(them)

    // No "on demand vs fixed cadence" line: the captures do not record every
    // alternative payout option (e.g. FundedNext's On-Demand choice on 2-Step),
    // so a cadence contrast could be half true.

    // Higher split from day one.
    const top = best(myEvals, split, (x, y) => x > y)
    const theirSplits = theirEvals.map(split).filter((v): v is number => v != null)
    if (top && theirSplits.length === theirEvals.length && theirSplits.length && theirSplits.every(v => v < top.value)) {
      const same = theirSplits.every(v => v === theirSplits[0])
      add(key, same
        ? `you want a ${top.value}% split from day one: ${displayName(me.firm, top.product)} pays ${top.value}%; every ${them.firm.name} challenge starts at ${theirSplits[0]}%`
        : `you want a ${top.value}% split from day one: ${displayName(me.firm, top.product)} pays ${top.value}%; ${them.firm.name} challenges start at ${Math.max(...theirSplits)}% or less`, [`${top.product.productSlug}.profitSplitPct`, `${them.firm.name} evaluations[].profitSplitPct`])
    }

    // Overnight and weekend holding, product by product.
    const allows = (side: Side, rule: 'overnight' | 'weekend') => side.products.length > 0 && side.products.every(product => product.rules?.[rule] === true)
    const restricts = (side: Side, rule: 'overnight' | 'weekend') => side.products.length > 0 && side.products.every(product => product.rules?.[rule] === 'restricted' || product.rules?.[rule] === false)
    if (allows(me, 'overnight') && allows(me, 'weekend') && restricts(them, 'overnight') && restricts(them, 'weekend')) {
      add(key, `you hold trades overnight or over the weekend: ${me.firm.name} allows both; ${them.firm.name} restricts both`, ['challenges[].rules.overnight', 'challenges[].rules.weekend (both firms, every product)'])
    }

    // Weekly payouts.
    const weekly = myEvals.find(product => product.payoutFrequency === 'weekly' && firstPayout(product) != null && !hasAlternativePayout(product))
    const theirFirst = best(theirEvals, firstPayout, (x, y) => x < y)
    if (weekly && theirFirst && !theirEvals.some(product => product.payoutFrequency === 'weekly')) {
      add(key, `you want weekly payouts: ${displayName(me.firm, weekly)} pays weekly, with the first claim ${payoutWait(weekly)!.phrase}; ${possessive(them.firm.name)} first claim is ${payoutWait(theirFirst.product)!.phrase.replace(/^from /, '')}`, [`${weekly.productSlug}.payoutFrequency`, `${weekly.productSlug}.payoutFirstDays`, `${theirFirst.product.productSlug}.payoutFirstDays`])
    }

    // One-step with a fixed floor (drawdown from the product files).
    const myOne = myEvals.find(product => product.phases === 1 && product.drawdownType === 'static' && product.maxLossPct != null)
    const theirOne = theirEvals.find(product => product.phases === 1 && product.drawdownType && product.drawdownType !== 'static')
    if (myOne && theirOne) {
      add(key, `you want a one-step with a fixed floor: ${possessive(displayName(me.firm, myOne))} ${myOne.maxLossPct}% max loss is static; ${displayName(them.firm, theirOne)} ${TRAIL[theirOne.drawdownType!] ?? 'is not static'}`, [`${myOne.productSlug}.drawdownType`, `${myOne.productSlug}.maxLossPct`, `${theirOne.productSlug}.drawdownType`])
    }

    // Consistency: only when this side has an evaluation explicitly recorded
    // without a rule and every evaluation on the other side has a scoped rule.
    const ruleFree = myEvals.find(product => product.consistencyRuleApplies === false)
    const theirRules = theirEvals.map(product => ({ product, rules: scopedConsistencyRules(product) }))
    if (ruleFree && theirRules.length && theirRules.every(entry => entry.rules.length)) {
      const shown = theirRules.slice(0, 2).map(entry => `${shortName(them.firm, entry.product)}: ${entry.rules.map(consistencyRulePhrase).join(', ')}`)
      add(key, `you'd rather avoid a consistency rule: ${displayName(me.firm, ruleFree)} records none; ${shown.join('; ')}${theirRules.length > 2 ? '; and others' : ''}`, [`${ruleFree.productSlug}.consistencyRuleApplies`, ...theirRules.flatMap(entry => consistencyFields(entry.product))])
    }

    // Scale: published maximum allocation; TradingView-style platform fallback.
    const mine = allocation(me.firm), theirs = allocation(them.firm)
    if (mine && theirs && mine > theirs) {
      add(key, `you plan to scale: ${me.firm.name} lists a ${me.firm.maxAllocation} maximum allocation vs ${possessive(them.firm.name)} ${them.firm.maxAllocation}`, ['firms.json maxAllocation (both firms)'])
    }
    {
      const only = (me.firm.platforms ?? []).filter(platform => !(them.firm.platforms ?? []).includes(platform))
      if (only.length) add(key, `you trade on ${only.join(' or ')}: ${me.firm.name} supports ${only.length === 1 ? 'it' : 'them'}; ${them.firm.name} lists ${(them.firm.platforms ?? []).join(', ')}`, ['firms.json platforms (both firms)'])
    }
  }
  // Further data-only line, used when the templates above do not fill three slots.
  const cheapA = cheapest100k(a), cheapB = cheapest100k(b)
  if (cheapA && cheapB && cheapA.currency === cheapB.currency && cheapA.value !== cheapB.value) {
    const key = cheapA.value < cheapB.value ? 'a' : 'b'
    const win = key === 'a' ? cheapA : cheapB, lose = key === 'a' ? cheapB : cheapA
    add(key, `you want the lower $100K fee: ${money(win.value, win.currency)} for ${displayName(sides[key].firm, win.product)} vs ${money(lose.value, lose.currency)} for ${displayName(sides[other(key)].firm, lose.product)}`, [`${win.product.productSlug}.accountSizes[100000].price`, `${lose.product.productSlug}.accountSizes[100000].price`])
  }
  // Weak differentiators (product count, founding year) only for a side that
  // has nothing better; product counts include variants and say little.
  if (a.products.length !== b.products.length) {
    const key = a.products.length > b.products.length ? 'a' : 'b'
    if (!lines[key].length) add(key, `you want more paths to choose from: ${sides[key].products.length} captured products vs ${sides[other(key)].products.length}`, ['challenges/*.json product count (fresh captures)'])
  }
  const yearA = Number(a.firm.founded), yearB = Number(b.firm.founded)
  if (yearA && yearB && yearA !== yearB) {
    const key = yearA < yearB ? 'a' : 'b'
    if (!lines[key].length) add(key, `operating history matters to you: since ${sides[key].firm.founded} (${sides[other(key)].firm.name}: ${sides[other(key)].firm.founded})`, ['firms.json founded (both firms)'])
  }
  return { a: lines.a.slice(0, 3), b: lines.b.slice(0, 3) }
}

/** Earliest first-payout wait across products, including "No minimum wait" for day 0. */
function earliestWait(side: Side) {
  const top = best(side.products, product => product.payoutFirstDays, (x, y) => x < y)
  const wait = top && payoutWait(top.product)
  return wait ? `${wait.short} (${shortName(side.firm, top.product)})` : null
}

const PRODUCT_FACTS = new Set(['Lowest $100K fee', 'Base split', 'Max loss', 'Earliest first payout'])

export function buildSideFacts(side: Side) {
  const cheap = cheapest100k(side)
  return [
    { label: 'Our score', value: `${side.firm.score}/10` },
    { label: 'Lowest $100K fee', value: cheap ? `${money(cheap.value, cheap.currency)} (${shortName(side.firm, cheap.product)})` : null },
    { label: 'Base split', value: range(side.products.map(split).filter((v): v is number => v != null)) },
    { label: 'Max loss', value: range(side.products.map(product => product.maxLossPct).filter((v): v is number => v != null)) },
    { label: 'Earliest first payout', value: earliestWait(side) },
    { label: 'Platforms', value: side.firm.platforms?.length ? side.firm.platforms.join(' · ') : null },
  ]
}

type PickOverride = { pickA?: string[]; pickB?: string[] }
const cleanLines = (lines: string[]) => lines.map(line => line.trim()).filter(line => line && !/^(tbd|todo|n\/a|-+|…|\.\.\.)$/i.test(line))

/**
 * Lines shown on each side. A writer list in verdict-copy.json wins even when
 * it is empty (the writer found nothing honest to say); otherwise the data
 * templates. Stale-data guard: when either firm has no capture inside the
 * freshness window, nothing is shown, so no claim rests on old data.
 */
export function resolvePicks(a: Side, b: Side, override?: PickOverride) {
  if (!a.products.length || !b.products.length) return { a: [] as string[], b: [] as string[], source: { a: 'stale', b: 'stale' }, stale: true }
  const generated = buildPickLines(a, b)
  const pick = (writer: string[] | undefined, built: SourcedLine[]) => writer ? cleanLines(writer).slice(0, 3) : built.map(line => line.text)
  return {
    a: pick(override?.pickA, generated.a),
    b: pick(override?.pickB, generated.b),
    source: { a: override?.pickA ? 'override' : 'generated', b: override?.pickB ? 'override' : 'generated' },
    stale: false,
  }
}

/** Whether the pick block renders: it needs fresh data on both sides and at least one pick line. */
export function comparePickAvailable(a: Side, b: Side, override?: PickOverride) {
  const picks = resolvePicks(a, b, override)
  const hasPicks = picks.a.length + picks.b.length > 0
  const factsA = buildSideFacts(a), factsB = buildSideFacts(b)
  const hasFacts = !picks.stale && factsA.some((fact, index) => PRODUCT_FACTS.has(fact.label) && (fact.value || factsB[index].value))
  // Both sides thin (no lines at all): hide the whole block rather than show a bare table.
  return { hasPicks, hasFacts, stale: picks.stale, any: hasPicks }
}

export default function ComparePickVerdict({ a, b, checkedAt, campaign, override, wip = false }: { a: Side; b: Side; checkedAt?: string | null; campaign: string; override?: PickOverride; wip?: boolean }) {
  const picks = resolvePicks(a, b, override)
  const factsA = buildSideFacts(a), factsB = buildSideFacts(b)
  const rows = factsA.map((fact, index) => ({ label: fact.label, a: fact.value, b: factsB[index].value })).filter(row => row.a || row.b)
  // Score and platforms alone are not a comparison; show the table only with product facts.
  const showFacts = rows.some(row => PRODUCT_FACTS.has(row.label))
  if (picks.stale || (!picks.a.length && !picks.b.length)) return null
  const currencies = new Set([cheapest100k(a)?.currency, cheapest100k(b)?.currency].filter(Boolean))
  return (
    <section className="compare-pick" aria-labelledby="compare-pick-title" data-compare-pick-verdict>
      {wip && <span className="review-verdict__wip">Preview, work in progress</span>}
      <h2 id="compare-pick-title" className="compare-pick__title">{a.firm.name} vs {b.firm.name}: which to pick</h2>
      {checkedAt && <p className="compare-pick__checked">Built from product captures checked {checkedAt}</p>}
      <div className="compare-pick__cols">
        {(['a', 'b'] as const).map(key => {
          const side = key === 'a' ? a : b
          return (
            <div key={key} className="compare-pick__col">
              <p className="compare-pick__h">{picks[key].length ? `Pick ${side.firm.name} if…` : side.firm.name}</p>
              {picks[key].length > 0 && <ul>{picks[key].map(line => <li key={line}>{line}</li>)}</ul>}
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
                <span>{side.firm.affiliateUrl ? 'Partner link · we may earn a commission' : 'Official site · no affiliate deal'}</span>
              </div>
            </div>
          )
        })}
      </div>
      {showFacts && <div className="compare-pick__facts-wrap">
        <table className="compare-pick__facts">
          <caption className="cm-caption">Key facts side by side</caption>
          <thead><tr><th scope="col"><span className="cm-caption">Fact</span></th><th scope="col">{a.firm.name}</th><th scope="col">{b.firm.name}</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label}><th scope="row">{row.label}</th><td>{row.a ?? '—'}</td><td>{row.b ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>}
      {currencies.size > 1 && <p className="compare-pick__note">Fees are in different currencies (EUR and USD), so they are shown as published and not ranked against each other.</p>}
    </section>
  )
}
