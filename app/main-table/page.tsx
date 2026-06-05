import { getAllFirms, getAllChallenges } from '@/lib/firms'
import { itemListSchema, breadcrumbSchema, jsonLd } from '@/lib/schema'
import FirmTable from '@/components/FirmTable'
import AnimatedNumber from '@/components/AnimatedNumber'
import { Database, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prop Firm Directory',
  description: 'Compare all major prop trading firms side by side. Filter by assets, platform, score, profit split, and payout speed.',
  alternates: { canonical: '/main-table' },
  openGraph: {
    title: 'Prop Firm Directory — Compare Every Firm Side by Side',
    description: 'Filter by asset, platform, score, split, and payout speed across 14+ prop firms.',
    url: '/main-table',
    type: 'website',
  },
}

export default function MainTablePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()

  const lastUpdated = firms
    .map(f => f.lastUpdated)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)
  const onDemand = firms.filter(f => f.payoutFrequency === 'on-demand').length

  // Sort by score for the rich-result list so Google sees the "Top X" ordering.
  const rankedForSchema = [...firms].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const itemLd = itemListSchema(rankedForSchema, 'Every Prop Firm — Ranked Directory')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firm Directory' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            <AnimatedNumber value={firms.length} duration={1100} /> firms ·{' '}
            <AnimatedNumber value={challenges.length} duration={1400} /> challenges priced
            {lastUpdated && (
              <>
                {' '}·{' '}
                <Clock size={12} style={{ marginLeft: 2 }} />
                {' '}{new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </>
            )}
          </div>

          <h1 className="blog-hero-title">
            Every prop firm in{' '}
            <span className="gradient-text gradient-text--animated">one table.</span>
          </h1>

          <p className="blog-hero-sub">
            Sort and filter by what actually matters: asset class, platform,
            profit split, drawdown rule, payout frequency. Click any row to
            read the full review.
          </p>

          {/* Tiny stat strip — three load-bearing numbers from the data */}
          <div style={{
            display: 'flex', gap: '1.5rem', marginTop: '1.75rem',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber value={firms.length} />
              </div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 600 }}>
                Firms tracked
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber value={challenges.length} />
              </div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 600 }}>
                Products priced
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-light)', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber value={onDemand} />
              </div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 600 }}>
                On-demand payouts
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ TABLE ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
          <div className="section-head">
            <h2 className="section-title">
              <Database size={18} style={{ color: 'var(--accent-light)' }} />
              The directory
            </h2>
            <span className="section-sub">
              Click column headers to sort
            </span>
          </div>
          <FirmTable firms={firms} />
        </div>
      </section>
    </div>
  )
}
