'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X } from 'lucide-react'
import { trackSiteEvent } from '@/lib/clientAnalytics'
import {
  filterComparisonRows,
  normalizeComparisonQuery,
  type ComparisonDirectoryRow,
} from '@/lib/comparisonDirectory'

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ComparisonDirectory({
  rows,
  pendingRows = [],
}: {
  rows: ComparisonDirectoryRow[]
  pendingRows?: ComparisonDirectoryRow[]
}) {
  const [query, setQuery] = useState('')
  const committedSearchRef = useRef('')
  const normalizedQuery = normalizeComparisonQuery(query)
  const visible = useMemo(
    () => filterComparisonRows(rows, query),
    [query, rows],
  )
  const pending = useMemo(
    () => filterComparisonRows(pendingRows, query),
    [query, pendingRows],
  )

  const commitSearch = () => {
    if (!normalizedQuery) return
    const key = `${normalizedQuery}:${visible.length}`
    if (committedSearchRef.current === key) return
    committedSearchRef.current = key
    trackSiteEvent('comparison_directory_search', {
      query_length: normalizedQuery.length,
      result_count: visible.length,
    })
  }

  const clearSearch = () => {
    setQuery('')
    committedSearchRef.current = ''
  }

  return (
    <div data-comparison-directory>
      <div className="comparison-directory-tools">
        <div className="comparison-directory-search">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="comparison-matchup-search">Search firm matchups</label>
          <input
            id="comparison-matchup-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onBlur={commitSearch}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitSearch()
              }
            }}
            placeholder="Search 2 firms, for example FTMO FundedNext"
            aria-controls={pendingRows.length ? 'comparison-directory-results comparison-pending-results' : 'comparison-directory-results'}
          />
          {query ? (
            <button type="button" onClick={clearSearch} aria-label="Clear matchup search">
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="comparison-directory-count" aria-live="polite" data-comparison-result-count>
          {normalizedQuery
            ? `${visible.length} matching ${visible.length === 1 ? 'matchup' : 'matchups'}`
            : `${visible.length} additional data-driven matchups`}
          {pending.length ? ` · ${pending.length} awaiting source checks below` : ''}
        </p>
      </div>

      {visible.length ? (
        <div className="feature-hub-grid" id="comparison-directory-results">
          {visible.map(row => (
            <Link
              key={row.matchup}
              href={`/compare/${row.matchup}`}
              className={`feature-hub-tile comparison-directory-tile${
                row.editorial ? ' feature-hub-tile-featured' : ''
              }`}
              data-comparison-matchup={row.matchup}
              data-product-count={row.productCount}
              data-source-count={row.sourceCount}
              data-evidence-date={row.evidenceDate ?? undefined}
              data-editorial={row.editorial ? 'true' : undefined}
            >
              {row.editorial ? (
                <span className="feature-hub-tile-badge">Editorial</span>
              ) : null}
              <div>
                <div className="feature-hub-tile-label">
                  {row.firmAName} vs {row.firmBName}
                </div>
                <div className="feature-hub-tile-count">
                  {row.productCount} current {row.productCount === 1 ? 'product' : 'products'}
                  {' · '}{row.sourceCount} first-party {row.sourceCount === 1 ? 'page' : 'pages'}
                </div>
                {row.evidenceDate ? (
                  <div className="comparison-directory-date">
                    Latest evidence <time dateTime={row.evidenceDate}>{dateLabel(row.evidenceDate)}</time>
                  </div>
                ) : null}
              </div>
              <div className="feature-hub-tile-cta">
                Compare products <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="comparison-directory-empty" id="comparison-directory-results" role="status">
          {rows.length ? 'No current matchup matches this search. Try one firm at a time or browse the ' : 'No two-sided matchups currently pass the source checks. Browse the '}
          <Link href="/prop-firms">full firm directory</Link>.
        </div>
      )}
      {pendingRows.length > 0 && (
        <details className="cm-sources" id="comparison-pending-results" key={normalizedQuery ? 'search' : 'browse'} open={normalizedQuery ? true : undefined}>
          <summary>Awaiting source checks ({pending.length})</summary>
          <p>These existing pages need new product evidence for one or both firms. They are not included in the current matchup count. This does not mean the firms have closed.</p>
          {pending.length ? (
            <ul>
              {pending.map(row => (
                <li key={row.matchup}>
                  <Link href={`/compare/${row.matchup}`} data-pending-matchup={row.matchup}>
                    {row.firmAName} vs {row.firmBName}
                  </Link>
                  <span>Source recheck required</span>
                </li>
              ))}
            </ul>
          ) : <p>No awaiting-check pages match this search.</p>}
        </details>
      )}
    </div>
  )
}
