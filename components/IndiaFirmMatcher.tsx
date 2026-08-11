'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import type {
  IndiaMatcherFirm,
  IndiaMatcherProduct,
} from '@/lib/indiaMatcher'
import type { IndiaPayoutRail } from '@/lib/india'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import {
  DEFAULT_INDIA_MATCHER_FILTERS,
  indiaMatcherResultProperties,
  indiaMatcherStateKey,
  type IndiaMatcherChangedControl,
  type IndiaMatcherDrawdown as Drawdown,
  type IndiaMatcherFilters as MatcherFilters,
  type IndiaMatcherPayout as Payout,
  type IndiaMatcherProgram as Program,
  type IndiaMatcherStrategy as Strategy,
} from '@/lib/indiaMatcherAnalytics'

interface MatcherResult extends IndiaMatcherFirm {
  matchingProducts: IndiaMatcherProduct[]
}

const FIELD_STYLE = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: '#fff',
  padding: '0 0.8rem',
  fontSize: '0.88rem',
  fontWeight: 700,
} as const

function matchesProgram(product: IndiaMatcherProduct, program: Program) {
  if (program === 'instant') return product.phases === 0
  if (program === 'one-step') return product.phases === 1
  if (program === 'multi-step') return product.phases >= 2
  return true
}

function matchesDrawdown(product: IndiaMatcherProduct, drawdown: Drawdown) {
  if (drawdown === 'static') return product.drawdownType === 'static'
  if (drawdown === 'trailing') {
    return product.drawdownType === 'trailing' || product.drawdownType === 'eod-trailing'
  }
  return true
}

function matchesStrategy(product: IndiaMatcherProduct, strategy: Strategy) {
  if (strategy === 'ea') return product.allows.ea
  if (strategy === 'news') return product.allows.news
  if (strategy === 'swing') return product.allows.weekend && product.allows.overnight
  return true
}

function matcherResults(firms: IndiaMatcherFirm[], filters: MatcherFilters) {
  return firms
    .filter(firm => filters.payout === 'any' || firm.payoutRails.includes(filters.payout))
    .map(firm => ({
      ...firm,
      matchingProducts: firm.products.filter(product =>
        matchesStrategy(product, filters.strategy) &&
        matchesProgram(product, filters.program) &&
        matchesDrawdown(product, filters.drawdown)),
    }))
    .filter(firm => firm.matchingProducts.length > 0)
    .sort((a, b) =>
      b.evidenceScore - a.evidenceScore ||
      b.matchingProducts.length - a.matchingProducts.length ||
      b.editorialScore - a.editorialScore)
}

function entryLabel(products: IndiaMatcherProduct[]) {
  const usd = products
    .map(product => product.entryPrice)
    .filter(price => price?.currency === 'USD')
    .map(price => price!.amount)
  const eur = products
    .map(product => product.entryPrice)
    .filter(price => price?.currency === 'EUR')
    .map(price => price!.amount)

  const labels: string[] = []
  if (usd.length) {
    labels.push(`$${Math.min(...usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`)
  }
  if (eur.length) {
    labels.push(`€${Math.min(...eur).toLocaleString('en-US', { maximumFractionDigits: 2 })}`)
  }
  return labels.length ? labels.join(' / ') : 'Unverified'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function railLabel(rail: IndiaPayoutRail) {
  if (rail === 'rise') return 'Rise'
  if (rail === 'bank') return 'Bank'
  if (rail === 'card') return 'Card payout'
  if (rail === 'skrill') return 'Skrill'
  if (rail === 'wise') return 'Wise'
  return 'Crypto'
}

function MatcherSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: '0.45rem' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 800 }}>
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value as T)}
        style={FIELD_STYLE}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function IndiaFirmMatcher({ firms }: { firms: IndiaMatcherFirm[] }) {
  const [strategy, setStrategy] = useState<Strategy>('manual')
  const [program, setProgram] = useState<Program>('any')
  const [drawdown, setDrawdown] = useState<Drawdown>('any')
  const [payout, setPayout] = useState<Payout>('any')
  const startedRef = useRef(false)
  const lastResultKeyRef = useRef('')

  const results = useMemo<MatcherResult[]>(() => {
    return matcherResults(firms, { strategy, program, drawdown, payout })
  }, [drawdown, firms, payout, program, strategy])

  const trackMatcherState = (
    changedControl: IndiaMatcherChangedControl,
    nextFilters: MatcherFilters,
  ) => {
    const nextResults = matcherResults(firms, nextFilters)
    const matchingProducts = nextResults.reduce(
      (count, firm) => count + firm.matchingProducts.length,
      0,
    )
    if (!startedRef.current) {
      startedRef.current = true
      track('challenge_matcher_started', { surface: 'india' })
    }
    const resultKey = indiaMatcherStateKey(nextFilters)
    if (lastResultKeyRef.current === resultKey) return
    lastResultKeyRef.current = resultKey
    track('challenge_matcher_result', indiaMatcherResultProperties(
      nextFilters,
      changedControl,
      nextResults.length,
      matchingProducts,
    ))
  }

  const changeStrategy = (next: Strategy) => {
    trackMatcherState('strategy', { strategy: next, program, drawdown, payout })
    setStrategy(next)
  }

  const changeProgram = (next: Program) => {
    trackMatcherState('program', { strategy, program: next, drawdown, payout })
    setProgram(next)
  }

  const changeDrawdown = (next: Drawdown) => {
    trackMatcherState('drawdown', { strategy, program, drawdown: next, payout })
    setDrawdown(next)
  }

  const changePayout = (next: Payout) => {
    trackMatcherState('payout', { strategy, program, drawdown, payout: next })
    setPayout(next)
  }

  const reset = () => {
    const changed = strategy !== 'manual' || program !== 'any' || drawdown !== 'any' || payout !== 'any'
    if (!changed) return
    setStrategy('manual')
    setProgram('any')
    setDrawdown('any')
    setPayout('any')
    trackMatcherState('reset', DEFAULT_INDIA_MATCHER_FILTERS)
  }
  const campaign = 'india-matcher-result'

  return (
    <section className="home-section" aria-labelledby="india-matcher-heading">
      <div className="home-shell">
        <div className="section-head">
          <div>
            <h2 id="india-matcher-heading" className="section-title">
              <SlidersHorizontal size={18} style={{ color: 'var(--accent-light)' }} />
              Find your India-screened fit
            </h2>
            <p className="section-sub-text">
              Match against product-level rules captured from first-party pages. Restricted or unknown
              rules never count as allowed.
            </p>
          </div>
          <span className="section-sub">
            No identity or account data collected
          </span>
        </div>

        <div className="post-sidebar-card" style={{ padding: '1.35rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '0.9rem',
          }}>
            <MatcherSelect
              id="india-match-strategy"
              label="Trading style"
              value={strategy}
              onChange={changeStrategy}
              options={[
                { value: 'manual', label: 'Manual intraday' },
                { value: 'ea', label: 'EA / algorithm' },
                { value: 'news', label: 'News trading' },
                { value: 'swing', label: 'Swing / weekend holding' },
              ]}
            />
            <MatcherSelect
              id="india-match-program"
              label="Program format"
              value={program}
              onChange={changeProgram}
              options={[
                { value: 'any', label: 'Any format' },
                { value: 'instant', label: 'Instant funding' },
                { value: 'one-step', label: 'One-step' },
                { value: 'multi-step', label: 'Two or three-step' },
              ]}
            />
            <MatcherSelect
              id="india-match-drawdown"
              label="Drawdown preference"
              value={drawdown}
              onChange={changeDrawdown}
              options={[
                { value: 'any', label: 'Any verified model' },
                { value: 'static', label: 'Static only' },
                { value: 'trailing', label: 'Trailing / EOD trailing' },
              ]}
            />
            <MatcherSelect
              id="india-match-payout"
              label="Required payout rail"
              value={payout}
              onChange={changePayout}
              options={[
                { value: 'any', label: 'Any published rail' },
                { value: 'bank', label: 'Bank transfer' },
                { value: 'card', label: 'Card payout' },
                { value: 'crypto', label: 'Crypto' },
                { value: 'rise', label: 'Rise' },
                { value: 'skrill', label: 'Skrill' },
                { value: 'wise', label: 'Wise' },
              ]}
            />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '1rem',
          }}>
            <p
              aria-live="polite"
              style={{ margin: 0, color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.5 }}
            >
              <strong style={{ color: '#fff' }}>{results.length}</strong> firm{results.length === 1 ? '' : 's'} and{' '}
              <strong style={{ color: '#fff' }}>
                {results.reduce((count, firm) => count + firm.matchingProducts.length, 0)}
              </strong>{' '}
              products match every selected requirement.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 0,
                background: 'transparent',
                color: 'var(--accent-light)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} /> Reset
            </button>
          </div>
        </div>

        {results.length ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(285px, 1fr))',
            gap: '1rem',
            marginTop: '1rem',
          }}>
            {results.map((firm, index) => (
              <article
                key={firm.slug}
                className="post-sidebar-card"
                style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div className="leader-logo" style={{ flex: '0 0 auto' }}>
                    <Image
                      src={firm.logo}
                      alt=""
                      width={44}
                      height={44}
                      style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      color: index === 0 ? 'var(--accent-light)' : 'var(--muted)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {index === 0 ? 'Best rules fit' : `Match ${index + 1}`}
                    </div>
                    <h3 style={{ margin: '0.18rem 0 0', color: '#fff', fontSize: '1.05rem' }}>
                      {firm.name}
                    </h3>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '0.55rem',
                  marginTop: '1rem',
                }}>
                  <div style={{ padding: '0.7rem', borderRadius: 10, background: 'var(--bg3)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 800 }}>
                      Evidence
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 900 }}>
                      {firm.evidenceScore}/12
                    </div>
                  </div>
                  <div style={{ padding: '0.7rem', borderRadius: 10, background: 'var(--bg3)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 800 }}>
                      Entry from
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 900 }}>
                      {entryLabel(firm.matchingProducts)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.9rem' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 800 }}>
                    Matching products
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                    {firm.matchingProducts.slice(0, 4).map(product => (
                      <span key={product.slug} className="chip" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle2 size={10} /> {product.name}
                      </span>
                    ))}
                    {firm.matchingProducts.length > 4 && (
                      <span className="chip" style={{ fontSize: '0.7rem' }}>
                        +{firm.matchingProducts.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '0.9rem' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 800 }}>
                    Published payout rails
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                    {firm.payoutRails.map(rail => (
                      <span key={rail} className="chip" style={{ fontSize: '0.7rem' }}>
                        {railLabel(rail)}
                      </span>
                    ))}
                  </div>
                </div>

                <p style={{
                  margin: '0.9rem 0 0',
                  color: 'var(--text)',
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                }}>
                  {firm.countrySummary}
                </p>
                <p style={{
                  margin: '0.65rem 0 0',
                  color: 'var(--muted)',
                  fontSize: '0.75rem',
                  lineHeight: 1.55,
                }}>
                  <strong style={{ color: 'var(--text)' }}>Open gap:</strong> {firm.unresolved}
                </p>
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.7rem',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>
                    Captured {formatDate(firm.evidenceCapturedAt)}
                  </span>
                  {firm.isPartner ? (
                    <Link
                      href={`/go/${firm.slug}?from=${campaign}`}
                      prefetch={false}
                      target="_blank"
                      rel="sponsored nofollow noopener"
                      className="btn-primary"
                      style={{ fontSize: '0.76rem', padding: '0.55rem 0.8rem' }}
                    >
                      Check current offer <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <Link
                      href={firm.reviewUrl}
                      className="btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.55rem 0.8rem' }}
                    >
                      Read review <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="post-sidebar-card" style={{ marginTop: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>No fully verified rule match</h3>
            <p style={{ margin: '0.55rem auto 0', color: 'var(--muted)', fontSize: '0.84rem', maxWidth: 620 }}>
              We will not turn a restricted or unpublished rule into a recommendation. Remove one requirement
              or ask the firm for written confirmation before paying.
            </p>
          </div>
        )}

        <p style={{ margin: '0.85rem 0 0', color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.5 }}>
          This is a strict rules-and-rail match, not regulatory advice or guaranteed Indian checkout, KYC,
          or payout acceptance. Prices remain in the firm&apos;s published currency. Partner links record only
          the matcher placement; aggregate filter use is measured with closed labels and result counts.
        </p>
      </div>
    </section>
  )
}
