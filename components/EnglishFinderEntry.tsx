'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_FINDER_FILTERS, challengeKey, filterChallengeRows, finderTier, finderAccountSizes, resolveFinderSize, type ChallengeFinderFilters, type GlobalChallengeRow } from '@/lib/challengeComparison'

const programmes = { all: 'all', '0': 'instant', '1': 'one-step', '2': 'two-step', '3': 'three-step' } as const

export default function EnglishFinderEntry({ rows }: { rows: GlobalChallengeRow[] }) {
  const sizes = finderAccountSizes(rows)
  const [requestedSize, setSize] = useState(resolveFinderSize(sizes))
  const [phases, setPhases] = useState<ChallengeFinderFilters['phases']>('all')
  const size = resolveFinderSize(sizes, requestedSize)
  if (size === undefined) return <p>No programmes have current source checks. <Link href="/prop-firm-challenges">Open the comparison and source notes</Link>.</p>
  const matching = filterChallengeRows(rows, { ...DEFAULT_FINDER_FILTERS, size, phases })
  const represented = new Set<string>()
  const preview = matching.filter(row => {
    if (represented.has(row.firm.slug)) return false
    represented.add(row.firm.slug)
    return true
  }).slice(0, 3)
  const fee = (row: GlobalChallengeRow) => {
    const tier = finderTier(row, size)!
    const amounts = ([['USD', tier.priceUsd], ['EUR', tier.priceEur]] as const).flatMap(([currency, value]) =>
      value != null && value > 0 ? [new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)] : [])
    return amounts.length ? amounts.join(' / ') : 'Price not verified'
  }
  return <form action="/prop-firm-challenges" method="get" className="home-finder-form home-finder-form--preview" data-english-home-finder="programme-entry">
    <div className="home-finder-controls">
      <label htmlFor="home-size">Account size in USD<select id="home-size" name="size" value={size} onChange={event => setSize(Number(event.target.value))}>{sizes.map(value => <option key={value} value={value}>{value.toLocaleString('en-US')} USD</option>)}</select></label>
      <label htmlFor="home-program">Evaluation stages<select id="home-program" name="program" value={programmes[phases]} onChange={event => setPhases((Object.keys(programmes) as Array<keyof typeof programmes>).find(key => programmes[key] === event.target.value) ?? 'all')}>
        <option value="all">All programmes</option><option value="instant">No evaluation</option><option value="one-step">1 step</option><option value="two-step">2 steps</option><option value="three-step">3 steps</option>
      </select></label>
    </div>
    <div className="home-finder-results" aria-live="polite" aria-atomic="true">
      <p className="home-finder-count" data-english-home-result-count={matching.length}>{matching.length ? `${matching.length} programmes match` : 'No source-checked programmes match these requirements'}</p>
      {preview.length > 0 && <ul>{preview.map(row => <li key={challengeKey(row)} data-english-home-preview-product={challengeKey(row)}>
        <Link href={`/prop-firm-challenges?${new URLSearchParams({ size: String(size), program: programmes[phases], shortlist: challengeKey(row) })}#challenge-shortlist-heading`}>
          <span><strong>{row.firm.name}</strong><span>{row.product.name}</span><small>{row.product.assetClass === 'prediction-markets' ? 'Prediction markets' : row.product.assetClass.toUpperCase()} · Checked {row.product.capturedAt}</small></span>
          <span className="home-finder-fee"><strong>{fee(row)}</strong><small>{row.product.pricingModel === 'monthly-subscription' ? 'per month; extras excluded' : row.product.pricingModel === 'split-payment' ? 'initial payment' : 'base fee'}</small></span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </li>)}</ul>}
    </div>
    {preview.length > 0 && <p className="home-finder-note">Alphabetical examples, one programme per firm—not a ranking. Markets and billing models differ; currencies are not converted.</p>}
    <button className="btn-primary" type="submit">Compare programmes <ArrowRight size={16} aria-hidden="true" /></button>
  </form>
}
