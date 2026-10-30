'use client'
import { promotableDiscount } from '@/lib/discountDisplay'
import { firmSlug } from '@/lib/firmSlug'
import { useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FirmLogo from './FirmLogo'
import type { PublicChallenge as Challenge, PublicFirm as Firm } from '@/lib/publicFirm'
import TrustpilotRating from './TrustpilotRating'
import { formatCapturedAt } from '@/lib/trustpilot'
import { directoryPlatformNames, firmPlatformEvidenceStatus, firmPlatformSourceUrl } from '@/lib/firmPlatforms'
import { DIRECTORY_DEFAULTS, DIRECTORY_PHASES, DIRECTORY_DRAWDOWNS, DIRECTORY_SIZES, parseDirectoryQuery, writeDirectoryQuery, matchingDirectoryProducts, hasProductFilters, directorySplit, type DirectoryState } from '@/lib/firmDirectory'
import {
  Search,
  ArrowUpDown,
  ExternalLink,
  GitCompareArrows,
  Handshake,
  Tag,
} from 'lucide-react'

const ALL = 'All'
type PhaseFilter = DirectoryState['phase']
type DrawdownFilter = DirectoryState['drawdown']


const PHASE_OPTIONS = DIRECTORY_PHASES
const DRAWDOWN_OPTIONS = DIRECTORY_DRAWDOWNS
const SIZE_OPTIONS = DIRECTORY_SIZES

function platformNames(firm: Firm) {
  return [...new Set(directoryPlatformNames(firm).map(name => {
    if (name.toLowerCase() === 'dxtrade') return 'DXTrade'
    if (name === 'Match-Trade') return 'Match-Trader'
    return name
  }))]
}

function phaseLabel(phases: Challenge['phases']): Exclude<PhaseFilter, typeof ALL> {
  if (phases === 0) return 'Instant'
  return `${phases}-step`
}

function drawdownLabel(value: Exclude<DrawdownFilter, typeof ALL>) {
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance based'
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function minimumPublishedEntry(products: Challenge[]) {
  const groups = new Map<string, number[]>()
  for (const product of products) {
    for (const tier of product.accountSizes) {
      for (const [symbol, price] of [['$', tier.priceUsd], ['€', tier.priceEur]] as const) {
        if (price == null || price <= 0) continue
        const key = `${symbol}|${product.pricingModel === 'monthly-subscription' ? '/month' : product.pricingModel === 'split-payment' ? ' upfront' : ''}`
        groups.set(key, [...(groups.get(key) || []), price])
      }
    }
  }
  const parts = [...groups].map(([key, prices]) => {
    const [symbol, suffix] = key.split('|')
    return `${symbol}${Math.min(...prices).toLocaleString('en-US')}${suffix}`
  })
  return parts.length ? `From ${parts.join(' / ')}` : 'Fee unverified'
}

function captureDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FirmTable({
  firms,
  challenges = [],
  unlistedComparePairs,
}: {
  firms: Firm[]
  challenges?: Challenge[]
  /** Canonical pairs with no /compare page; "Compare selected" is hidden for them. */
  unlistedComparePairs?: string[]
}) {
  const query = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const allAssets = useMemo(() => {
    const s = new Set<string>()
    firms.forEach(f => f.assets?.forEach(a => s.add(a)))
    return [ALL, ...Array.from(s).sort()]
  }, [firms])

  const allPlatforms = useMemo(() => {
    const s = new Set<string>()
    firms.forEach(f => platformNames(f).forEach(p => s.add(p)))
    return [ALL, ...Array.from(s).sort()]
  }, [firms])

  const state = parseDirectoryQuery(query, { assets: allAssets, platforms: allPlatforms, slugs: firms.map(firm => firmSlug(firm.name)) })
  const { q: search, asset: assetFilter, platform: platformFilter, score: minScore, size: sizeFilter,
    phase: phaseFilter, drawdown: drawdownFilter, news: newsOnly, ea: eaOnly,
    overnight: overnightOnly, weekend: weekendOnly, selected: selectedSlugs, sort: sortBy, direction: sortDir } = state
  function updateState(patch: Partial<DirectoryState>, replace = false) {
    const next = writeDirectoryQuery(window.location.search, { ...state, ...patch })
    const href = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    if (href === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    if (replace) window.history.replaceState(null, '', href)
    else window.history.pushState(null, '', href)
  }
  const setSearch = (q: string) => updateState({ q }, true)
  const setAssetFilter = (asset: string) => updateState({ asset })
  const setPlatformFilter = (platform: string) => updateState({ platform })
  const setMinScore = (score: number) => updateState({ score }, true)
  const setSizeFilter = (size: number) => updateState({ size })
  const setPhaseFilter = (phase: PhaseFilter) => updateState({ phase })
  const setDrawdownFilter = (drawdown: DrawdownFilter) => updateState({ drawdown })
  const setNewsOnly = (news: boolean) => updateState({ news })
  const setEaOnly = (ea: boolean) => updateState({ ea })
  const setOvernightOnly = (overnight: boolean) => updateState({ overnight })
  const setWeekendOnly = (weekend: boolean) => updateState({ weekend })
  const setSelectedSlugs = (selected: string[]) => updateState({ selected })

  const challengesByFirm = useMemo(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of challenges) {
      const products = grouped.get(challenge.firmSlug) || []
      products.push(challenge)
      grouped.set(challenge.firmSlug, products)
    }
    return grouped
  }, [challenges])

  const matchingByFirm = new Map([...challengesByFirm].map(([slug, products]) =>
    [slug, matchingDirectoryProducts(products, state)]))
  const productFiltered = hasProductFilters(state)

  const filtered = (() => {
    let list = [...firms]
    const query = search.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (query) list = list.filter(f => f.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(query))
    if (assetFilter !== ALL) list = list.filter(f => f.assets?.includes(assetFilter))
    if (platformFilter !== ALL) list = list.filter(f => platformNames(f).includes(platformFilter))
    if (minScore > 0) list = list.filter(f => f.score >= minScore)
    if (productFiltered) list = list.filter(firm => (matchingByFirm.get(firmSlug(firm.name)) || []).length > 0)
    list.sort((a, b) => {
      // Firms with no numeric Trustpilot score always sort last, whichever
      // direction is active. A suppressed rating and an uncaptured one are
      // both "no number" — neither means the firm scored zero, so neither
      // should be ranked as the worst.
      if (sortBy === 'trustpilotScore') {
        const at = a.trustpilotScore ?? null
        const bt = b.trustpilotScore ?? null
        if (at == null || bt == null) return at == null && bt == null ? 0 : at == null ? 1 : -1
        return sortDir === 'asc' ? at - bt : bt - at
      }
      if (sortBy === 'profitSplitPct') {
        const at = directorySplit(matchingByFirm.get(firmSlug(a.name)) || []).min
        const bt = directorySplit(matchingByFirm.get(firmSlug(b.name)) || []).min
        if (at == null || bt == null) return at == null && bt == null ? 0 : at == null ? 1 : -1
        return sortDir === 'asc' ? at - bt : bt - at
      }
      let av: string | number = a[sortBy] ?? (typeof a[sortBy] === 'number' ? -Infinity : '')
      let bv: string | number = b[sortBy] ?? (typeof b[sortBy] === 'number' ? -Infinity : '')
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  })()

  function toggleSort(col: typeof sortBy) {
    updateState({ sort: col, direction: sortBy === col && sortDir === 'desc' ? 'asc' : 'desc' })
  }

  function clearFilters() {
    updateState({ ...DIRECTORY_DEFAULTS, selected: selectedSlugs, sort: sortBy, direction: sortDir })
  }

  const hasFilters = Boolean(
    search ||
    assetFilter !== ALL ||
    platformFilter !== ALL ||
    minScore > 0 ||
    sizeFilter > 0 ||
    phaseFilter !== ALL ||
    drawdownFilter !== ALL ||
    newsOnly ||
    eaOnly ||
    overnightOnly ||
    weekendOnly,
  )
  const activeFilters = [
    { active: Boolean(search), label: `Search: ${search}`, clear: () => setSearch('') },
    { active: assetFilter !== ALL, label: assetFilter, clear: () => setAssetFilter(ALL) },
    { active: platformFilter !== ALL, label: platformFilter, clear: () => setPlatformFilter(ALL) },
    { active: minScore > 0, label: `Score ${minScore}+`, clear: () => setMinScore(0) },
    { active: sizeFilter > 0, label: sizeFilter >= 200_000 ? '$200K+ account' : `$${sizeFilter / 1000}K account`, clear: () => setSizeFilter(0) },
    { active: phaseFilter !== ALL, label: phaseFilter, clear: () => setPhaseFilter(ALL) },
    { active: drawdownFilter !== ALL, label: drawdownFilter === ALL ? '' : drawdownLabel(drawdownFilter), clear: () => setDrawdownFilter(ALL) },
    { active: newsOnly, label: 'News allowed', clear: () => setNewsOnly(false) },
    { active: eaOnly, label: 'EA allowed', clear: () => setEaOnly(false) },
    { active: overnightOnly, label: 'Overnight allowed', clear: () => setOvernightOnly(false) },
    { active: weekendOnly, label: 'Weekend allowed', clear: () => setWeekendOnly(false) },
  ].filter(filter => filter.active)
  const selectedMatchup = selectedSlugs.length === 2 ? [...selectedSlugs].sort().join('-vs-') : null
  const compareHref = selectedMatchup && !unlistedComparePairs?.includes(selectedMatchup)
    ? `/compare/${selectedMatchup}`
    : null
  const selectedFirms = firms.filter(firm => selectedSlugs.includes(firmSlug(firm.name)))

  function toggleCompare(slug: string) {
    setSelectedSlugs(selectedSlugs.includes(slug) ? selectedSlugs.filter(item => item !== slug)
      : selectedSlugs.length < 2 ? [...selectedSlugs, slug] : selectedSlugs)
  }

  // Checks span several dates; the newest one must not imply every firm was rechecked.
  const trustpilotCaptured = useMemo(() => {
    const dates = firms
      .map(f => f.trustpilotCapturedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
    if (!dates.length) return null
    const first = formatCapturedAt(dates[0])
    const last = formatCapturedAt(dates.at(-1))
    return first === last ? first : `${first} – ${last}`
  }, [firms])

  return (
    <div className="firm-directory">
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input id="firm-search" type="text" aria-label="Search prop firms" placeholder="Search firms..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} />
        </div>
      </div>

      <div
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.8rem',
          flexWrap: 'wrap',
          padding: '0.8rem 0.9rem',
          marginBottom: '1rem',
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg3)',
        }}
      >
        <span style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 700 }}>
          <GitCompareArrows size={13} style={{ marginRight: 6, verticalAlign: '-2px', color: 'var(--accent-light)' }} />
          {selectedSlugs.length === 0
            ? 'Select 2 firms in the table for a direct comparison'
            : selectedSlugs.length === 1
              ? '1 firm selected — choose one more'
              : '2 firms selected — comparison ready'}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedFirms.map(firm => (
            <button key={firm.name} type="button" className="filter-pill active"
              onClick={() => toggleCompare(firmSlug(firm.name))}
              aria-label={`Remove ${firm.name} from comparison`}>
              {firm.name} ×
            </button>
          ))}
          {selectedSlugs.length > 0 && <button type="button" className="filter-pill" onClick={() => setSelectedSlugs([])}>Clear selection</button>}
          {compareHref && (
            <Link href={compareHref} className="btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
              Compare selected <GitCompareArrows size={12} />
            </Link>
          )}
        </div>
      </div>

      <div className="directory-filter-toolbar">
        <span role="status">{filtered.length} of {firms.length} firms</span>
        <button type="button" className="filter-pill directory-filter-toggle" aria-expanded={filtersOpen} aria-controls="directory-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
          {filtersOpen ? 'Hide filters' : 'Show filters'}{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
        </button>
        {hasFilters && <button type="button" className="filter-pill" onClick={clearFilters}>Reset filters</button>}
      </div>
      {activeFilters.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: '0.85rem',
          color: 'var(--muted)',
          fontSize: '0.8rem',
        }}>
          <span>Active filters:</span>
          {activeFilters.map(filter => <button type="button" key={filter.label} className="filter-pill active" onClick={filter.clear} aria-label={`Remove ${filter.label} filter`}>{filter.label} ×</button>)}
        </div>
      )}

      <div id="directory-filters" className={`directory-filters${filtersOpen ? ' directory-filters--open' : ''}`}>
      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginRight: 8 }}>Assets:</span>
        {allAssets.map(a => (
          <button key={a} type="button" aria-pressed={assetFilter === a} className={`filter-pill${assetFilter === a ? ' active' : ''}`}
            onClick={() => setAssetFilter(a)} style={{ marginRight: 4, marginBottom: 4 }}>
            {a === ALL ? 'All' : a}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginRight: 8 }}>Evaluation:</span>
        {PHASE_OPTIONS.map(phase => (
          <button
            key={phase}
            type="button"
            className={`filter-pill${phaseFilter === phase ? ' active' : ''}`}
            aria-pressed={phaseFilter === phase}
            onClick={() => setPhaseFilter(phase)}
            style={{ marginRight: 4, marginBottom: 4 }}
          >
            {phase === ALL ? 'All' : phase}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginRight: 8 }}>Platforms:</span>
        {allPlatforms.map(p => (
          <button key={p} type="button" aria-pressed={platformFilter === p} className={`filter-pill${platformFilter === p ? ' active' : ''}`}
            onClick={() => setPlatformFilter(p)} style={{ marginRight: 4, marginBottom: 4 }}>
            {p === ALL ? 'All' : p}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'end',
        gap: '0.8rem',
        flexWrap: 'wrap',
        marginBottom: '0.9rem',
      }}>
        <label htmlFor="directory-account-size" style={{ display: 'grid', gap: 4, color: 'var(--muted)', fontSize: '0.76rem' }}>
          Account size
          <select
            id="directory-account-size"
            value={sizeFilter}
            onChange={event => setSizeFilter(Number(event.target.value))}
            style={{
              minHeight: 38,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--bg3)',
              color: 'var(--text)',
              padding: '0 0.7rem',
              fontWeight: 700,
            }}
          >
            <option value={0}>Any size</option>
            {SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size >= 200_000 ? '$200K+' : `$${size / 1000}K`}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="directory-drawdown" style={{ display: 'grid', gap: 4, color: 'var(--muted)', fontSize: '0.76rem' }}>
          Drawdown
          <select
            id="directory-drawdown"
            value={drawdownFilter}
            onChange={event => setDrawdownFilter(event.target.value as DrawdownFilter)}
            style={{
              minHeight: 38,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--bg3)',
              color: 'var(--text)',
              padding: '0 0.7rem',
              fontWeight: 700,
            }}
          >
            {DRAWDOWN_OPTIONS.map(value => (
              <option key={value} value={value}>
                {value === ALL ? 'Any method' : drawdownLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.76rem', marginBottom: 4 }}>Trading rules</span>
          {[
            ['News', newsOnly, setNewsOnly],
            ['EA', eaOnly, setEaOnly],
            ['Overnight', overnightOnly, setOvernightOnly],
            ['Weekend', weekendOnly, setWeekendOnly],
          ].map(([label, active, setter]) => (
            <button
              key={label as string}
              type="button"
              className={`filter-pill${active ? ' active' : ''}`}
              aria-pressed={active as boolean}
              onClick={() => (setter as (value: boolean) => void)(!(active as boolean))}
              style={{ marginRight: 4, marginBottom: 4 }}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label htmlFor="min-score" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Min Score:</label>
        <input id="min-score" type="range" className="range-slider" min={0} max={10} step={0.5} value={minScore}
          aria-valuetext={minScore > 0 ? `${minScore} or higher` : 'Any score'}
          onChange={e => setMinScore(Number(e.target.value))} style={{ maxWidth: 180 }} />
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem', minWidth: 32 }}>
          {minScore > 0 ? `${minScore}+` : 'Any'}
        </span>
        {hasFilters && (
          <button onClick={clearFilters} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
            Clear All Filters
          </button>
        )}
      </div>
      <button type="button" className="btn-primary directory-filter-done" onClick={() => { setFiltersOpen(false); requestAnimationFrame(() => resultsRef.current?.focus()) }}>Show {filtered.length} {filtered.length === 1 ? 'firm' : 'firms'}</button>
      </div>

      <p id="directory-table-help" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
        Scroll the table sideways to see all terms and review links. Firm names stay visible.
      </p>
      <div ref={resultsRef} className="firm-directory-table" tabIndex={0} role="region" aria-label="Prop firm directory comparison table" aria-describedby="directory-table-help" style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Firm', col: 'name' as const },
                { label: 'Programs & entry', col: null },
                { label: 'Founded', col: 'founded' as const },
                { label: 'Firm assets', col: null },
                { label: 'Firm max allocation', col: null },
                { label: 'Split', col: 'profitSplitPct' as const },
                { label: 'Firm platforms', col: null },
                { label: 'Score', col: 'score' as const },
                { label: 'Trustpilot', col: 'trustpilotScore' as const },
                { label: 'Review', col: null },
              ].map(({ label, col }) => {
                const isSorted = col && sortBy === col
                const ariaSort = isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                return (
                  <th key={label} aria-sort={ariaSort}
                    style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {col ? (
                      <button type="button" onClick={() => toggleSort(col)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                        {label}
                        <ArrowUpDown size={12} style={{ opacity: isSorted ? 1 : 0.4 }} aria-hidden="true" />
                      </button>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{label}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                <p>No firms match these filters. Try fewer filters or a different name.</p>
                <button type="button" className="btn-outline" onClick={clearFilters}>Reset filters</button>
              </td></tr>
            ) : filtered.map((firm, i) => {
              const isPartner = Boolean(firm.affiliateUrl)
              const slug = firmSlug(firm.name)
              const products = matchingByFirm.get(slug) || []
              const split = directorySplit(products)
              const payouts = [...new Set(products.flatMap(product => product.payoutFrequency ? [product.payoutFrequency] : []))]
              const programs = [...new Set(products.map(product => phaseLabel(product.phases)))]
              const drawdowns = [...new Set(products.flatMap(product =>
                product.drawdownType ? [product.drawdownType] : []))]
              const oldestProduct = [...products]
                .sort((a, b) => a.sourceCapturedAt.localeCompare(b.sourceCapturedAt))
                .at(0)
              const isSelected = selectedSlugs.includes(slug)
              return (
              <tr key={firm.name} style={{
                borderBottom: '1px solid var(--border)',
                background: isPartner
                  ? 'linear-gradient(90deg, rgba(39,161,123,0.04), transparent 40%)'
                  : (i % 2 === 0 ? 'transparent' : 'rgba(32, 51, 55, 0.01)'),
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(39,161,123,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = isPartner
                  ? 'linear-gradient(90deg, rgba(39,161,123,0.04), transparent 40%)'
                  : (i % 2 === 0 ? 'transparent' : 'rgba(32, 51, 55, 0.01)'))}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FirmLogo name={firm.name} src={firm.logo} size={36} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{firm.name}</span>
                      {(isPartner || promotableDiscount(firm)) && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {isPartner && (
                            <span className="partner-pill" title="We have an affiliate partnership with this firm.">
                              <Handshake size={9} /> Partner
                            </span>
                          )}
                          {promotableDiscount(firm) && (
                            <span className="discount-pill" title={`Use code ${firm.discountCode} for ${firm.discountPct}% off.`}>
                              <Tag size={9} /> {firm.discountPct}% off
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', minWidth: 170 }}>
                  <strong style={{
                    display: 'block',
                    color: products.length ? 'var(--text)' : 'var(--gold)',
                    fontSize: '0.8rem',
                  }}>
                    {minimumPublishedEntry(products)}
                  </strong>
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', marginTop: 3 }}>
                    {products.length} {productFiltered ? 'matching' : 'sourced'} product{products.length === 1 ? '' : 's'}
                  </span>
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', marginTop: 3 }}>
                    {sizeFilter > 0 ? (sizeFilter >= 200_000 ? '$200K+ accounts' : `$${sizeFilter / 1000}K accounts`) : 'Any account size'} · entry fee
                    {products.some(product => product.pricingModel === 'monthly-subscription') && ' · includes monthly plans'}
                    {products.some(product => product.pricingModel === 'split-payment' || (product.activationFeeUsd || 0) > 0 || product.accountSizes.some(tier => (tier.payLaterUsd || 0) > 0 || (tier.activationFeeUsd || 0) > 0)) && ' · additional fees may apply'}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                    {programs.map(program => <span key={program} className="chip">{program}</span>)}
                  </span>
                  {drawdowns.length > 0 && (
                    <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.68rem', marginTop: 5 }}>
                      {drawdowns
                        .map(value => drawdownLabel(value as Exclude<DrawdownFilter, typeof ALL>))
                        .join(' · ')}
                    </span>
                  )}
                  {oldestProduct && (
                    <a
                      href={oldestProduct.sourceUrl}
                      target="_blank"
                      rel="nofollow noopener"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        color: 'var(--accent-light)',
                        fontSize: '0.67rem',
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      Source {captureDateLabel(oldestProduct.sourceCapturedAt)}
                      <ExternalLink size={9} aria-hidden="true" />
                    </a>
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{firm.founded}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{firm.assets?.map(a => <span key={a} className="chip">{a}</span>)}</div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 600 }}>{firm.maxAllocation}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {split.min != null ? (
                    <span>
                      {split.min === split.max ? `${split.min}%` : `${split.min}–${split.max}%`}
                      {split.hasUnknown && <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.72rem' }}>Some splits unverified</span>}
                    </span>
                  ) : 'Split unverified'}
                  {payouts.length > 0 && <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 500, textTransform: 'capitalize', marginTop: 2 }}>{payouts.map(value => value.replace('-', ' ')).join(' / ')}</span>}
                  {products.some(product => product.payoutFrequency == null) && <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 500 }}>Some payout timing unverified</span>}
                </td>
                <td style={{ padding: '12px 16px', minWidth: 230 }} data-firm-platforms={slug} data-platform-source-status={firmPlatformEvidenceStatus(firm)}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{platformNames(firm).map(p => <span key={p} className="chip" style={{ fontSize: '0.875rem', background: 'rgba(39,161,123,0.1)', color: 'var(--accent)', borderColor: 'rgba(39,161,123,0.2)' }}>{p}</span>)}</div>
                  <details style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                    <summary>{firmPlatformEvidenceStatus(firm) === 'fresh'
                      ? 'Platform source and scope'
                      : firmPlatformEvidenceStatus(firm) === 'recapture-required'
                        ? 'Platforms need rechecking'
                        : 'Unverified platform list'}</summary>
                    <p style={{ margin: '0.5rem 0 0' }}>
                    {firm.platformEvidence ? <>
                      {firmPlatformEvidenceStatus(firm) === 'fresh' ? 'Platform-only check: ' : 'Platform list needs rechecking. Last recorded date: '}
                      {firmPlatformSourceUrl(firm) ? <a href={firmPlatformSourceUrl(firm)!} target="_blank" rel="nofollow noopener">{firm.platformEvidence.sourceCapturedAt || 'unverified date'}</a> : 'source unavailable'}.
                    </> : 'Platform list not separately source-checked.'}
                    {' '}Firm-level list, not confirmation for every programme or country.
                    </p>
                    {firm.platformEvidence && <p>{firm.platformNote}</p>}
                  </details>
                </td>
                <td style={{ padding: '12px 16px' }}><span className="score-badge">★ {firm.score}</span></td>
                {/* Cited Trustpilot figure — links straight to the profile so
                    readers can verify. Never routed through /go/: this is a
                    citation, not an affiliate destination. */}
                <td style={{ padding: '12px 16px' }}><TrustpilotRating firm={firm} linked /></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      color: isSelected ? 'var(--accent-light)' : 'var(--muted)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: selectedSlugs.length >= 2 && !isSelected ? 'not-allowed' : 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={selectedSlugs.length >= 2 && !isSelected}
                        onChange={() => toggleCompare(slug)}
                        aria-label={`Select ${firm.name} for comparison`}
                      />
                      Compare
                    </label>
                    {firm.affiliateUrl ? (
                      <Link
                        href={`/go/${slug}?from=prop-firms-directory`}
                        prefetch={false}
                        rel="sponsored nofollow noopener"
                        target="_blank"
                        className="btn-primary btn-glow"
                        style={{ fontSize: '0.78rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Visit <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    ) : null}
                    {firm.reviewUrl && (
                      <Link
                        href={firm.reviewUrl}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: 'var(--accent-light)', fontSize: '0.78rem',
                          textDecoration: 'none', fontWeight: 600,
                          padding: '6px 12px', borderRadius: 10,
                          border: '1px solid rgba(39,161,123,0.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.75rem' }}>
        Showing {filtered.length} of {firms.length} firms
        {trustpilotCaptured && (
          <> · Trustpilot checks: {trustpilotCaptured} — dated snapshots, not a live feed</>
        )}
      </p>
    </div>
  )
}
