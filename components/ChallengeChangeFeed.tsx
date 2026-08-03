'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  MapPinCheck,
  Search,
} from 'lucide-react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'

export type ChallengeChangeKind =
  | 'lineup-change'
  | 'price-watch'
  | 'rule-change'
  | 'source-conflict'

export interface ChallengeChangeCardData {
  id: string
  firmSlug: string
  firmName: string
  kind: ChallengeChangeKind
  status: 'verified' | 'watch'
  observedAt: string
  lastCheckedAt: string
  effectiveAt?: string
  title: string
  summary: string
  traderImpact: string
  sourceUrls: string[]
  reviewUrl: string
  indiaScreened: boolean
  productNames?: string[]
  comparisonUrl?: string
  comparisonLabel?: string
}

const FILTERS = [
  { value: 'all', label: 'All updates' },
  { value: 'verified', label: 'Verified' },
  { value: 'watch', label: 'Open watches' },
  { value: 'price-watch', label: 'Price watches' },
  { value: 'rule-change', label: 'Rule changes' },
  { value: 'lineup-change', label: 'Lineup changes' },
  { value: 'source-conflict', label: 'Source conflicts' },
] as const

type ChangeFilter = (typeof FILTERS)[number]['value']
type ChangeSurface = 'global' | 'india'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

function kindLabel(kind: ChallengeChangeKind) {
  if (kind === 'lineup-change') return 'Lineup change'
  if (kind === 'price-watch') return 'Price watch'
  if (kind === 'rule-change') return 'Rule change'
  return 'Source conflict'
}

function entryMatches(
  entry: ChallengeChangeCardData,
  filter: ChangeFilter,
  normalizedQuery: string,
) {
  const matchesFilter =
    filter === 'all' ||
    (filter === 'verified'
      ? entry.status === 'verified'
      : filter === 'watch'
        ? entry.status === 'watch'
        : entry.kind === filter)
  const matchesQuery =
    !normalizedQuery ||
    [
      entry.firmName,
      entry.title,
      entry.summary,
      entry.traderImpact,
      ...(entry.productNames || []),
    ].some(value => value.toLowerCase().includes(normalizedQuery))
  return matchesFilter && matchesQuery
}

export default function ChallengeChangeFeed({
  entries,
  surface,
}: {
  entries: ChallengeChangeCardData[]
  surface: ChangeSurface
}) {
  const [filter, setFilter] = useState<ChangeFilter>('all')
  const [query, setQuery] = useState('')
  const committedSearchRef = useRef('')
  const explorationTrackedRef = useRef(false)

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return entries.filter(entry => entryMatches(entry, filter, normalizedQuery))
  }, [entries, filter, query])

  const commitSearch = () => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return
    const searchKey = `${normalizedQuery}:${visible.length}`
    if (committedSearchRef.current === searchKey) return
    committedSearchRef.current = searchKey
    if (!explorationTrackedRef.current) {
      explorationTrackedRef.current = true
      track('challenge_change_explore', {
        surface,
        method: 'search',
        filter,
        result_count: visible.length,
      })
    }
  }

  return (
    <div>
      <div className="change-feed-tools">
        <label className="change-feed-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search challenge changes</span>
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
            placeholder="Search firm, rule or change"
          />
        </label>

        <div className="change-feed-filters" aria-label="Filter challenge changes">
          {FILTERS.map(option => {
            const count = entries.filter(entry =>
              entryMatches(entry, option.value, query.trim().toLowerCase()),
            ).length
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                className={`change-feed-filter${
                  filter === option.value ? ' change-feed-filter--active' : ''
                }`}
                onClick={() => {
                  if (filter === option.value) return
                  const resultCount = entries.filter(entry => entryMatches(
                    entry,
                    option.value,
                    query.trim().toLowerCase(),
                  )).length
                  setFilter(option.value)
                  if (!explorationTrackedRef.current) {
                    explorationTrackedRef.current = true
                    track('challenge_change_explore', {
                      surface,
                      method: 'filter',
                      filter: option.value,
                      result_count: resultCount,
                    })
                  }
                }}
              >
                {option.label}
                <span>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="change-feed-count" aria-live="polite">
        Showing {visible.length} of {entries.length} dated updates.
      </p>

      {visible.length > 0 ? (
        <div className="change-feed-grid">
          {visible.map(entry => (
            <article
              key={entry.id}
              id={entry.id}
              className={`change-feed-card change-feed-card--${entry.kind}`}
            >
              <div className="change-feed-card-head">
                <div>
                  <div className="change-feed-badges">
                    <span className={`change-feed-badge change-feed-badge--${entry.status}`}>
                      {entry.status === 'verified' ? (
                        <BadgeCheck size={12} aria-hidden="true" />
                      ) : (
                        <CircleAlert size={12} aria-hidden="true" />
                      )}
                      {entry.status === 'verified' ? 'Verified change' : 'Watch'}
                    </span>
                    <span className="change-feed-kind">{kindLabel(entry.kind)}</span>
                    {entry.indiaScreened && (
                      <span className="change-feed-india">
                        <MapPinCheck size={11} aria-hidden="true" />
                        India-screened firm
                      </span>
                    )}
                  </div>
                  <p className="change-feed-firm">{entry.firmName}</p>
                  <h2>{entry.title}</h2>
                </div>
                <div className="change-feed-date">
                  <span>Observed {dateLabel(entry.observedAt)}</span>
                  <span>Last checked {dateLabel(entry.lastCheckedAt)}</span>
                  {entry.effectiveAt && (
                    <span>Effective {dateLabel(entry.effectiveAt)}</span>
                  )}
                </div>
              </div>

              <p className="change-feed-summary">{entry.summary}</p>

              {entry.productNames && entry.productNames.length > 0 && (
                <div className="change-feed-products" aria-label="Affected current products">
                  <strong>Affected products</strong>
                  <div>
                    {entry.productNames.map(productName => (
                      <span key={productName}>{productName}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="change-feed-impact">
                <strong>What this means for traders</strong>
                <p>{entry.traderImpact}</p>
              </div>

              <div className="change-feed-links">
                {entry.sourceUrls.map((sourceUrl, index) => (
                  <a
                    key={sourceUrl}
                    href={sourceUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    data-analytics-ignore
                    onClick={() => track('challenge_change_source_open', {
                      surface,
                      change_id: entry.id,
                      firm: entry.firmSlug,
                      kind: entry.kind,
                      status: entry.status,
                      source_index: index + 1,
                    })}
                  >
                    First-party source
                    {entry.sourceUrls.length > 1 ? ` ${index + 1}` : ''}
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                ))}
                {entry.comparisonUrl && entry.comparisonLabel && (
                  <Link
                    href={entry.comparisonUrl}
                    data-analytics-ignore
                    onClick={() => track('challenge_change_next_step', {
                      surface,
                      change_id: entry.id,
                      firm: entry.firmSlug,
                      kind: entry.kind,
                      status: entry.status,
                      action: 'comparison',
                      affected_product_count: entry.productNames?.length ?? 0,
                    })}
                  >
                    {entry.comparisonLabel}
                    <ArrowRight size={11} aria-hidden="true" />
                  </Link>
                )}
                <Link
                  href={entry.reviewUrl}
                  data-analytics-ignore
                  onClick={() => track('challenge_change_next_step', {
                    surface,
                    change_id: entry.id,
                    firm: entry.firmSlug,
                    kind: entry.kind,
                    status: entry.status,
                    action: 'review',
                    affected_product_count: entry.productNames?.length ?? 0,
                  })}
                >
                  Read {entry.firmName} review
                  <ArrowRight size={11} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="change-feed-empty">
          <CircleAlert size={18} aria-hidden="true" />
          No dated update matches that filter. Clear the search or choose another category.
        </div>
      )}
    </div>
  )
}
