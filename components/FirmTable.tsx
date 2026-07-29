'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Challenge, Firm } from '@/lib/firms'
import TrustpilotRating from './TrustpilotRating'
import { formatCapturedAt } from '@/lib/trustpilot'
import {
  Search,
  ArrowUpDown,
  ExternalLink,
  GitCompareArrows,
  Handshake,
  Tag,
} from 'lucide-react'

const ALL = 'All'
type PhaseFilter = typeof ALL | 'Instant' | '1-step' | '2-step' | '3-step'
type DrawdownFilter =
  | typeof ALL
  | 'static'
  | 'trailing'
  | 'eod-trailing'
  | 'balance-based'

type InitialFilters = {
  asset?: string
  size?: number
  phase?: string
  drawdown?: string
  news?: boolean
  ea?: boolean
  overnight?: boolean
  weekend?: boolean
}

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const PHASE_OPTIONS: PhaseFilter[] = [ALL, 'Instant', '1-step', '2-step', '3-step']
const DRAWDOWN_OPTIONS: DrawdownFilter[] = [
  ALL,
  'static',
  'trailing',
  'eod-trailing',
  'balance-based',
]
const SIZE_OPTIONS = [5_000, 10_000, 25_000, 50_000, 100_000, 200_000]

function phaseLabel(phases: Challenge['phases']): Exclude<PhaseFilter, typeof ALL> {
  if (phases === 0) return 'Instant'
  return `${phases}-step`
}

function initialPhase(value?: string): PhaseFilter {
  const normalized = value?.toLowerCase()
  if (normalized === 'instant' || normalized === '0') return 'Instant'
  if (normalized === 'one-step' || normalized === '1-step' || normalized === '1') return '1-step'
  if (normalized === 'two-step' || normalized === '2-step' || normalized === '2') return '2-step'
  if (normalized === 'three-step' || normalized === '3-step' || normalized === '3') return '3-step'
  return ALL
}

function initialDrawdown(value?: string): DrawdownFilter {
  return DRAWDOWN_OPTIONS.includes(value as DrawdownFilter)
    ? value as DrawdownFilter
    : ALL
}

function drawdownLabel(value: Exclude<DrawdownFilter, typeof ALL>) {
  if (value === 'eod-trailing') return 'EOD trailing'
  if (value === 'balance-based') return 'Balance based'
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function minimumPublishedEntry(products: Challenge[]) {
  const usd = products.flatMap(product =>
    product.accountSizes.flatMap(tier =>
      tier.priceUsd != null && tier.priceUsd > 0 ? [tier.priceUsd] : []),
  )
  const eur = products.flatMap(product =>
    product.accountSizes.flatMap(tier =>
      tier.priceEur != null && tier.priceEur > 0 ? [tier.priceEur] : []),
  )
  const parts = [
    usd.length ? `$${Math.min(...usd).toLocaleString('en-US')}` : null,
    eur.length ? `€${Math.min(...eur).toLocaleString('en-US')}` : null,
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(' / ') : 'Fee unverified'
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
  initialFilters = {},
}: {
  firms: Firm[]
  challenges?: Challenge[]
  initialFilters?: InitialFilters
}) {
  const [search, setSearch] = useState('')
  const [assetFilter, setAssetFilter] = useState(initialFilters.asset || ALL)
  const [platformFilter, setPlatformFilter] = useState(ALL)
  const [minScore, setMinScore] = useState(0)
  const [sizeFilter, setSizeFilter] = useState(initialFilters.size || 0)
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>(
    initialPhase(initialFilters.phase),
  )
  const [drawdownFilter, setDrawdownFilter] = useState<DrawdownFilter>(
    initialDrawdown(initialFilters.drawdown),
  )
  const [newsOnly, setNewsOnly] = useState(Boolean(initialFilters.news))
  const [eaOnly, setEaOnly] = useState(Boolean(initialFilters.ea))
  const [overnightOnly, setOvernightOnly] = useState(Boolean(initialFilters.overnight))
  const [weekendOnly, setWeekendOnly] = useState(Boolean(initialFilters.weekend))
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'founded' | 'profitSplitPct' | 'trustpilotScore'>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const allAssets = useMemo(() => {
    const s = new Set<string>()
    firms.forEach(f => f.assets?.forEach(a => s.add(a)))
    return [ALL, ...Array.from(s).sort()]
  }, [firms])

  const allPlatforms = useMemo(() => {
    const s = new Set<string>()
    firms.forEach(f => f.platforms?.forEach(p => s.add(p)))
    return [ALL, ...Array.from(s).sort()]
  }, [firms])

  const challengesByFirm = useMemo(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of challenges) {
      const products = grouped.get(challenge.firmSlug) || []
      products.push(challenge)
      grouped.set(challenge.firmSlug, products)
    }
    return grouped
  }, [challenges])

  const filtered = useMemo(() => {
    let list = [...firms]
    if (search) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    if (assetFilter !== ALL) list = list.filter(f => f.assets?.includes(assetFilter))
    if (platformFilter !== ALL) list = list.filter(f => f.platforms?.includes(platformFilter))
    if (minScore > 0) list = list.filter(f => f.score >= minScore)
    if (
      sizeFilter > 0 ||
      phaseFilter !== ALL ||
      drawdownFilter !== ALL ||
      newsOnly ||
      eaOnly ||
      overnightOnly ||
      weekendOnly
    ) {
      list = list.filter(firm => {
        const products = challengesByFirm.get(firmSlug(firm.name)) || []
        if (phaseFilter !== ALL) {
          const hasPhase = products.some(product => phaseLabel(product.phases) === phaseFilter)
          if (!hasPhase) return false
        }
        if (drawdownFilter !== ALL) {
          const hasDrawdown = products.some(product => product.drawdownType === drawdownFilter)
          if (!hasDrawdown) return false
        }
        if (sizeFilter > 0) {
          const hasSize = products.some(product => product.accountSizes.some(tier =>
            sizeFilter >= 200_000 ? tier.sizeUsd >= sizeFilter : tier.sizeUsd === sizeFilter))
          if (!hasSize) return false
        }
        if (newsOnly && !products.some(product => product.rules.news === true)) return false
        if (eaOnly && !products.some(product => product.rules.ea === true)) return false
        if (overnightOnly && !products.some(product => product.rules.overnight === true)) return false
        if (weekendOnly && !products.some(product => product.rules.weekend === true)) return false
        return true
      })
    }
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
      let av: string | number = a[sortBy] ?? (typeof a[sortBy] === 'number' ? -Infinity : '')
      let bv: string | number = b[sortBy] ?? (typeof b[sortBy] === 'number' ? -Infinity : '')
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [
    firms,
    search,
    assetFilter,
    platformFilter,
    minScore,
    sizeFilter,
    phaseFilter,
    drawdownFilter,
    newsOnly,
    eaOnly,
    overnightOnly,
    weekendOnly,
    challengesByFirm,
    sortBy,
    sortDir,
  ])

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function clearFilters() {
    setSearch('')
    setAssetFilter(ALL)
    setPlatformFilter(ALL)
    setMinScore(0)
    setSizeFilter(0)
    setPhaseFilter(ALL)
    setDrawdownFilter(ALL)
    setNewsOnly(false)
    setEaOnly(false)
    setOvernightOnly(false)
    setWeekendOnly(false)
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
  const presetLabels = [
    sizeFilter > 0 ? (sizeFilter >= 200_000 ? '$200K+ account' : `$${sizeFilter / 1000}K account`) : null,
    phaseFilter !== ALL ? phaseFilter : null,
    drawdownFilter !== ALL ? drawdownLabel(drawdownFilter) : null,
    newsOnly ? 'News allowed' : null,
    eaOnly ? 'EA allowed' : null,
    overnightOnly ? 'Overnight allowed' : null,
    weekendOnly ? 'Weekend allowed' : null,
  ].filter((label): label is string => Boolean(label))
  const compareHref = selectedSlugs.length === 2
    ? `/compare/${[...selectedSlugs].sort().join('-vs-')}`
    : null

  function toggleCompare(slug: string) {
    setSelectedSlugs(current =>
      current.includes(slug)
        ? current.filter(item => item !== slug)
        : current.length < 2
          ? [...current, slug]
          : current,
    )
  }

  // Per-row capture dates would be noise (they're captured in one pass), so
  // the freshest one is stated once beneath the table — the figures are a
  // dated snapshot, not a live feed.
  const trustpilotCaptured = useMemo(() => {
    const latest = firms
      .map(f => f.trustpilotCapturedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1)
    return formatCapturedAt(latest)
  }, [firms])

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input id="firm-search" type="text" aria-label="Search prop firms" placeholder="Search firms..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none' }} />
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
        {compareHref && (
          <Link href={compareHref} className="btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            Compare selected <GitCompareArrows size={12} />
          </Link>
        )}
      </div>

      {presetLabels.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: '0.85rem',
          color: '#94a3b8',
          fontSize: '0.8rem',
        }}>
          <span>Active preset:</span>
          {presetLabels.map(label => <span key={label} className="chip">{label}</span>)}
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: 8 }}>Assets:</span>
        {allAssets.map(a => (
          <button key={a} className={`filter-pill${assetFilter === a ? ' active' : ''}`}
            onClick={() => setAssetFilter(a)} style={{ marginRight: 4, marginBottom: 4 }}>
            {a === ALL ? 'All' : a}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: 8 }}>Evaluation:</span>
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
        <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: 8 }}>Platforms:</span>
        {allPlatforms.map(p => (
          <button key={p} className={`filter-pill${platformFilter === p ? ' active' : ''}`}
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
        <label htmlFor="directory-account-size" style={{ display: 'grid', gap: 4, color: '#64748b', fontSize: '0.76rem' }}>
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
              color: '#e2e8f0',
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
        <label htmlFor="directory-drawdown" style={{ display: 'grid', gap: 4, color: '#64748b', fontSize: '0.76rem' }}>
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
              color: '#e2e8f0',
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
          <span style={{ display: 'block', color: '#64748b', fontSize: '0.76rem', marginBottom: 4 }}>Trading rules</span>
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
        <label htmlFor="min-score" style={{ color: '#64748b', fontSize: '0.8rem' }}>Min Score:</label>
        <input id="min-score" type="range" className="range-slider" min={0} max={10} step={0.5} value={minScore}
          aria-valuetext={minScore > 0 ? `${minScore} or higher` : 'Any score'}
          onChange={e => setMinScore(Number(e.target.value))} style={{ maxWidth: 180 }} />
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem', minWidth: 32 }}>
          {minScore > 0 ? `${minScore}+` : 'Any'}
        </span>
        {hasFilters && (
          <button onClick={clearFilters} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>
            Clear All Filters
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1a3a2a, #1a2a30)', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Firm', col: 'name' as const },
                { label: 'Programs & entry', col: null },
                { label: 'Founded', col: 'founded' as const },
                { label: 'Assets', col: null },
                { label: 'Max Allocation', col: null },
                { label: 'Split', col: 'profitSplitPct' as const },
                { label: 'Platforms', col: null },
                { label: 'Score', col: 'score' as const },
                { label: 'Trustpilot', col: 'trustpilotScore' as const },
                { label: 'Review', col: null },
              ].map(({ label, col }) => {
                const isSorted = col && sortBy === col
                const ariaSort = isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                return (
                  <th key={label} aria-sort={ariaSort}
                    style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
              <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No firms found</td></tr>
            ) : filtered.map((firm, i) => {
              const isPartner = Boolean(firm.affiliateUrl)
              const slug = firmSlug(firm.name)
              const products = challengesByFirm.get(slug) || []
              const programs = [...new Set(products.map(product => phaseLabel(product.phases)))]
              const drawdowns = [...new Set(products.flatMap(product =>
                product.drawdownType ? [product.drawdownType] : []))]
              const latestProduct = [...products]
                .sort((a, b) => a.sourceCapturedAt.localeCompare(b.sourceCapturedAt))
                .at(-1)
              const isSelected = selectedSlugs.includes(slug)
              return (
              <tr key={firm.name} style={{
                borderBottom: '1px solid var(--border)',
                background: isPartner
                  ? 'linear-gradient(90deg, rgba(39,161,123,0.04), transparent 40%)'
                  : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'),
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(39,161,123,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = isPartner
                  ? 'linear-gradient(90deg, rgba(39,161,123,0.04), transparent 40%)'
                  : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'))}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {firm.logo ? (
                      <Image src={firm.logo} alt={firm.name + ' logo'} width={28} height={28} style={{ objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                        {firm.name.substring(0, 2)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{firm.name}</span>
                      {(isPartner || (firm.discountCode && firm.discountPct)) && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {isPartner && (
                            <span className="partner-pill" title="We have an affiliate partnership with this firm.">
                              <Handshake size={9} /> Partner
                            </span>
                          )}
                          {firm.discountCode && firm.discountPct && (
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
                    color: products.length ? '#fff' : '#fcd34d',
                    fontSize: '0.8rem',
                  }}>
                    {minimumPublishedEntry(products)}
                  </strong>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', marginTop: 3 }}>
                    {products.length} sourced product{products.length === 1 ? '' : 's'}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                    {programs.map(program => <span key={program} className="chip">{program}</span>)}
                  </span>
                  {drawdowns.length > 0 && (
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', marginTop: 5 }}>
                      {drawdowns
                        .map(value => drawdownLabel(value as Exclude<DrawdownFilter, typeof ALL>))
                        .join(' · ')}
                    </span>
                  )}
                  {latestProduct && (
                    <a
                      href={latestProduct.sourceUrl}
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
                      Source {captureDateLabel(latestProduct.sourceCapturedAt)}
                      <ExternalLink size={9} aria-hidden="true" />
                    </a>
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{firm.founded}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{firm.assets?.map(a => <span key={a} className="chip">{a}</span>)}</div>
                </td>
                <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 600 }}>{firm.maxAllocation}</td>
                <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {firm.profitSplitPct != null ? (
                    <span>
                      {firm.profitSplitPct}%
                      {firm.payoutFrequency && (
                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: 500, textTransform: 'capitalize', marginTop: 2 }}>
                          {firm.payoutFrequency.replace('-', ' ')}
                        </span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{firm.platforms?.map(p => <span key={p} className="chip" style={{ background: 'rgba(39,161,123,0.1)', color: '#5eead4', borderColor: 'rgba(39,161,123,0.2)' }}>{p}</span>)}</div>
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
                      color: isSelected ? 'var(--accent-light)' : '#94a3b8',
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
          <> · Trustpilot figures verified {trustpilotCaptured} — a dated snapshot, not a live feed</>
        )}
      </p>
    </div>
  )
}
