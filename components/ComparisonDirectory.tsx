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
}: {
  rows: ComparisonDirectoryRow[]
}) {
  const [query, setQuery] = useState('')
  const committedSearchRef = useRef('')
  const normalizedQuery = normalizeComparisonQuery(query)
  const visible = useMemo(
    () => filterComparisonRows(rows, query),
    [query, rows],
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
        <label className="comparison-directory-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search firm matchups</span>
          <input
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
            aria-controls="comparison-directory-results"
          />
          {query ? (
            <button type="button" onClick={clearSearch} aria-label="Clear matchup search">
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <p className="comparison-directory-count" aria-live="polite" data-comparison-result-count>
          {normalizedQuery
            ? `${visible.length} matching ${visible.length === 1 ? 'matchup' : 'matchups'}`
            : `${visible.length} additional data-driven matchups`}
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
          No matchup contains both names. Try one firm at a time or browse the{' '}
          <Link href="/prop-firms">full firm directory</Link>.
        </div>
      )}
    </div>
  )
}
