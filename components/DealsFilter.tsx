'use client'

import { useState } from 'react'
import DealCard, { type DealCardData } from './DealCard'

const MARKETS = ['All', 'Forex', 'Futures', 'Crypto'] as const
type Market = (typeof MARKETS)[number]

/**
 * Client-side market filter for the deals grid. Receives already-flattened,
 * serializable rows from the server page (never the `fs`-backed Firm type) and
 * toggles which cards show — no network round-trip, no full reload.
 */
export default function DealsFilter({ rows }: { rows: DealCardData[] }) {
  const [market, setMarket] = useState<Market>('All')

  const visible =
    market === 'All' ? rows : rows.filter(r => r.markets.includes(market))

  return (
    <div>
      <div className="deals-filter" role="tablist" aria-label="Filter deals by market">
        {MARKETS.map(m => {
          const count = m === 'All' ? rows.length : rows.filter(r => r.markets.includes(m)).length
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={market === m}
              onClick={() => setMarket(m)}
              className={`deals-filter-btn${market === m ? ' deals-filter-btn--active' : ''}`}
            >
              {m} <span className="deals-filter-count">{count}</span>
            </button>
          )
        })}
      </div>

      <p className="deals-count" aria-live="polite">
        Showing {visible.length} {visible.length === 1 ? 'firm' : 'firms'}
        {market !== 'All' ? ` for ${market}` : ''}.
      </p>

      <div className="deals-grid">
        {visible.map(r => (
          <DealCard key={r.firmSlug} deal={r} />
        ))}
      </div>
    </div>
  )
}
