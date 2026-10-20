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

export function buildPickLines(a: Side, b: Side) {
  const lines: Record<'a' | 'b', string[]> = { a: [], b: [] }
  const sides = { a, b }
  const other = (key: 'a' | 'b') => (key === 'a' ? 'b' : 'a')

  const splitA = best(a.products, split, (x, y) => x > y), splitB = best(b.products, split, (x, y) => x > y)
  if (splitA && splitB && splitA.value !== splitB.value) {
    const key = splitA.value > splitB.value ? 'a' : 'b'
    const win = key === 'a' ? splitA : splitB, lose = key === 'a' ? splitB : splitA
    lines[key].push(`you want the higher base split: ${win.value}% on ${shortName(sides[key].firm, win.product)} (${sides[other(key)].firm.name} tops out at ${lose.value}%)`)
  }

  const payA = best(a.products, firstPayout, (x, y) => x < y), payB = best(b.products, firstPayout, (x, y) => x < y)
  if (payA && payB && payA.value !== payB.value) {
    const key = payA.value < payB.value ? 'a' : 'b'
    const win = key === 'a' ? payA : payB, lose = key === 'a' ? payB : payA
    lines[key].push(`you want an earlier first payout: day ${win.value} on ${shortName(sides[key].firm, win.product)} (${sides[other(key)].firm.name}: day ${lose.value})`)
  }

  const allStatic = (side: Side) => evaluations(side).length > 0 && evaluations(side).every(product => product.drawdownType === 'static')
  if (allStatic(a) !== allStatic(b)) {
    const key = allStatic(a) ? 'a' : 'b'
    const trailing = evaluations(sides[other(key)]).filter(product => product.drawdownType !== 'static')
    lines[key].push(`you want a static max loss on every evaluation (${sides[other(key)].firm.name} ${trailing.map(product => shortName(sides[other(key)].firm, product)).join(', ')} ${trailing.length === 1 ? 'trails' : 'trail'})`)
  }

  const cheapA = cheapest100k(a), cheapB = cheapest100k(b)
  if (cheapA && cheapB && cheapA.currency === cheapB.currency && cheapA.value !== cheapB.value) {
    const key = cheapA.value < cheapB.value ? 'a' : 'b'
    const win = key === 'a' ? cheapA : cheapB, lose = key === 'a' ? cheapB : cheapA
    lines[key].push(`you want the lower $100K fee: ${money(win.value, win.currency)} vs ${money(lose.value, lose.currency)}`)
  }

  if (a.products.length !== b.products.length) {
    const key = a.products.length > b.products.length ? 'a' : 'b'
    lines[key].push(`you want more paths to choose from: ${sides[key].products.length} captured products vs ${sides[other(key)].products.length}`)
  }

  for (const key of ['a', 'b'] as const) {
    const mine = sides[key].firm.platforms ?? [], theirs = new Set(sides[other(key)].firm.platforms ?? [])
    const only = mine.filter(platform => !theirs.has(platform))
    if (only.length) lines[key].push(`you trade on ${only.join(' or ')} (not listed by ${sides[other(key)].firm.name})`)
  }

  const yearA = Number(a.firm.founded), yearB = Number(b.firm.founded)
  if (yearA && yearB && yearA !== yearB) {
    const key = yearA < yearB ? 'a' : 'b'
    lines[key].push(`operating history matters to you: since ${sides[key].firm.founded} (${sides[other(key)].firm.name}: ${sides[other(key)].firm.founded})`)
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

export default function ComparePickVerdict({ a, b, checkedAt }: { a: Side; b: Side; checkedAt?: string | null }) {
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
