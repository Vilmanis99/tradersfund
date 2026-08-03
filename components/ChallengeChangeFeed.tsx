'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  countFocusedProductsWithUpdates,
  EMPTY_CHALLENGE_CHANGE_FOCUS,
  focusChallengeChangeEntries,
  parseChallengeChangeFocus,
  type ChallengeChangeFocusState,
} from '@/lib/challengeChangeFocus'

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
  productKeys: string[]
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
type ChangeAction = 'source' | 'comparison' | 'review'

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

function sameFocusState(
  a: ChallengeChangeFocusState,
  b: ChallengeChangeFocusState,
) {
  return a.requested === b.requested
    && a.requestedCount === b.requestedCount
    && a.unavailableCount === b.unavailableCount
    && a.products.length === b.products.length
    && a.products.every((key, index) => key === b.products[index])
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
  validProductKeys,
}: {
  entries: ChallengeChangeCardData[]
  surface: ChangeSurface
  validProductKeys: string[]
}) {
  const [filter, setFilter] = useState<ChangeFilter>('all')
  const [query, setQuery] = useState('')
  const [focusState, setFocusState] = useState<ChallengeChangeFocusState>(
    EMPTY_CHALLENGE_CHANGE_FOCUS,
  )
  const committedSearchRef = useRef('')
  const explorationTrackedRef = useRef(false)
  const focusedLoadKeysRef = useRef(new Set<string>())
  const resultStatusRef = useRef<HTMLParagraphElement>(null)
  const validProductKeySet = useMemo(
    () => new Set(validProductKeys),
    [validProductKeys],
  )

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const next = parseChallengeChangeFocus(
        params.get('products'),
        params.has('products'),
        validProductKeySet,
      )
      setFocusState(current => sameFocusState(current, next) ? current : next)
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [validProductKeySet])

  const focusedProducts = focusState.products

  const focusedEntries = useMemo(
    () => focusChallengeChangeEntries(entries, focusState),
    [entries, focusState],
  )

  const matchingProductCount = useMemo(
    () => countFocusedProductsWithUpdates(focusedEntries, focusedProducts),
    [focusedEntries, focusedProducts],
  )

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return focusedEntries.filter(entry => entryMatches(entry, filter, normalizedQuery))
  }, [filter, focusedEntries, query])

  useEffect(() => {
    if (!focusedProducts.length) return
    const focusKey = [...focusedProducts].sort().join(',')
    if (focusedLoadKeysRef.current.has(focusKey)) return
    focusedLoadKeysRef.current.add(focusKey)
    track('challenge_change_shortlist_loaded', {
      product_count: focusedProducts.length,
      matching_update_count: focusedEntries.length,
    })
  }, [focusedEntries.length, focusedProducts])

  const clearFocusedProducts = () => {
    setFocusState(EMPTY_CHALLENGE_CHANGE_FOCUS)
    const url = new URL(window.location.href)
    url.searchParams.delete('products')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    window.requestAnimationFrame(() => resultStatusRef.current?.focus())
  }

  const trackChangeAction = (
    entry: ChallengeChangeCardData,
    action: ChangeAction,
    sourceIndex = 1,
  ) => {
    if (focusedProducts.length) {
      track('challenge_change_shortlist_action', {
        action,
        change_id: entry.id,
      })
      return
    }
    if (action === 'source') {
      track('challenge_change_source_open', {
        change_id: entry.id,
        source_index: sourceIndex,
      })
      return
    }
    track('challenge_change_next_step', {
      change_id: entry.id,
      action,
    })
  }

  const commitSearch = () => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return
    const searchKey = `${normalizedQuery}:${visible.length}`
    if (committedSearchRef.current === searchKey) return
    committedSearchRef.current = searchKey
    if (!explorationTrackedRef.current) {
      explorationTrackedRef.current = true
      track('challenge_change_explore', {
        method: 'search',
        filter,
      })
    }
  }

  return (
    <div data-change-surface={surface}>
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

        <div
          className="change-feed-filters"
          role="group"
          aria-label="Filter challenge changes"
        >
          {FILTERS.map(option => {
            const count = focusedEntries.filter(entry =>
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
                  setFilter(option.value)
                  if (!explorationTrackedRef.current) {
                    explorationTrackedRef.current = true
                    track('challenge_change_explore', {
                      method: 'filter',
                      filter: option.value,
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

      {focusState.requested && (
        <div className="change-feed-focus">
          <div>
            <strong>
              {focusedProducts.length
                ? 'Shortlist change check'
                : 'Shared shortlist is unavailable'}
            </strong>
            <span>
              {focusedProducts.length ? (
                <>
                  Filtering for {focusedProducts.length} recognized selected product{
                    focusedProducts.length === 1 ? '' : 's'
                  }.
                  {focusState.unavailableCount > 0 && (
                    <> {focusState.unavailableCount} shared product{
                      focusState.unavailableCount === 1 ? '' : 's'
                    } could not be recognized in the current comparison.</>
                  )}
                </>
              ) : focusState.requestedCount > 0 ? (
                <>This {focusState.requestedCount}-product shared shortlist has no product available in the current comparison, so unrelated updates are not shown.</>
              ) : (
                <>The shared product list is empty or malformed, so unrelated updates are not shown.</>
              )}
            </span>
          </div>
          <button type="button" className="btn-outline" onClick={clearFocusedProducts}>
            Remove shortlist focus
          </button>
        </div>
      )}

      <p
        ref={resultStatusRef}
        className="change-feed-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
      >
        {focusState.requested
          ? focusedProducts.length
            ? `${focusedEntries.length} dated update${focusedEntries.length === 1 ? '' : 's'} ${focusedEntries.length === 1 ? 'affects' : 'affect'} ${matchingProductCount} of ${focusState.requestedCount} selected product${focusState.requestedCount === 1 ? '' : 's'}; showing ${visible.length} after current filters.`
            : 'No current product from the shared shortlist could be recognized; showing 0 updates.'
          : `Showing ${visible.length} of ${entries.length} dated updates.`}
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
                    onClick={() => trackChangeAction(entry, 'source', index + 1)}
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
                    onClick={() => trackChangeAction(entry, 'comparison')}
                  >
                    {entry.comparisonLabel}
                    <ArrowRight size={11} aria-hidden="true" />
                  </Link>
                )}
                <Link
                  href={entry.reviewUrl}
                  data-analytics-ignore
                  onClick={() => trackChangeAction(entry, 'review')}
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
          {focusState.requested && !focusedProducts.length
            ? 'No unrelated updates are shown. Remove shortlist focus to browse the full ledger.'
            : focusedProducts.length > 0 && focusedEntries.length === 0
              ? `No current ledger entry maps to these ${focusedProducts.length} selected product${focusedProducts.length === 1 ? '' : 's'}. This does not prove their terms are unchanged; verify each product’s current first-party rules before checkout.`
              : 'No dated update matches that filter. Clear the search or choose another category.'}
        </div>
      )}
    </div>
  )
}
