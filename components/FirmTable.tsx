'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Firm } from '@/lib/firms'
import { Search, ArrowUpDown, ExternalLink, Handshake, Tag } from 'lucide-react'

const ALL = 'All'

export default function FirmTable({ firms }: { firms: Firm[] }) {
  const [search, setSearch] = useState('')
  const [assetFilter, setAssetFilter] = useState(ALL)
  const [platformFilter, setPlatformFilter] = useState(ALL)
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'founded' | 'profitSplitPct'>('score')
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

  const filtered = useMemo(() => {
    let list = [...firms]
    if (search) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    if (assetFilter !== ALL) list = list.filter(f => f.assets?.includes(assetFilter))
    if (platformFilter !== ALL) list = list.filter(f => f.platforms?.includes(platformFilter))
    if (minScore > 0) list = list.filter(f => f.score >= minScore)
    list.sort((a, b) => {
      let av: string | number = a[sortBy] ?? (typeof a[sortBy] === 'number' ? -Infinity : '')
      let bv: string | number = b[sortBy] ?? (typeof b[sortBy] === 'number' ? -Infinity : '')
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [firms, search, assetFilter, platformFilter, minScore, sortBy, sortDir])

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function clearFilters() {
    setSearch(''); setAssetFilter(ALL); setPlatformFilter(ALL); setMinScore(0)
  }

  const hasFilters = search || assetFilter !== ALL || platformFilter !== ALL || minScore > 0

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Search firms..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none' }} />
        </div>
      </div>

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
        <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: 8 }}>Platforms:</span>
        {allPlatforms.map(p => (
          <button key={p} className={`filter-pill${platformFilter === p ? ' active' : ''}`}
            onClick={() => setPlatformFilter(p)} style={{ marginRight: 4, marginBottom: 4 }}>
            {p === ALL ? 'All' : p}
          </button>
        ))}
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
                { label: 'Founded', col: 'founded' as const },
                { label: 'Assets', col: null },
                { label: 'Max Allocation', col: null },
                { label: 'Split', col: 'profitSplitPct' as const },
                { label: 'Platforms', col: null },
                { label: 'Score', col: 'score' as const },
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
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No firms found</td></tr>
            ) : filtered.map((firm, i) => {
              const isPartner = Boolean(firm.affiliateUrl)
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
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {firm.affiliateUrl ? (
                      <Link
                        href={`/go/${firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}?from=main-table`}
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
      <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.75rem' }}>Showing {filtered.length} of {firms.length} firms</p>
    </div>
  )
}
