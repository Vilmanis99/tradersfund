import Link from 'next/link'
import { ArrowRight, FileCheck2, ShieldCheck, Swords } from 'lucide-react'
import { firmSlug } from '@/lib/comparisons'
import {
  INDIA_MATCHUPS,
  getIndiaMatchupsForFirm,
  indiaMatchupPath,
} from '@/lib/indiaMatchups'

export default function IndiaMatchupLinks({
  firmName,
  heading,
  description,
}: {
  firmName?: string
  heading?: string
  description?: string
}) {
  const currentFirmSlug = firmName ? firmSlug(firmName) : null
  const matchups = currentFirmSlug
    ? getIndiaMatchupsForFirm(currentFirmSlug)
    : Object.values(INDIA_MATCHUPS)

  if (!matchups.length) return null

  const resolvedHeading = heading
    ?? (firmName ? `Compare ${firmName} for India` : 'Open a curated India head-to-head')
  const resolvedDescription = description
    ?? (firmName
      ? `These India-specific matchups pair ${firmName} with another screened firm using current country, KYC, payout and product-rule evidence.`
      : 'Move from the full product table to a pair-specific decision with India eligibility, KYC, payout and product-rule evidence attached.')

  const content = (
    <>
      <div className="section-head" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)' }}>
            <Swords size={17} aria-hidden="true" />
            {resolvedHeading}
          </h2>
          <p className="section-sub-text">{resolvedDescription}</p>
        </div>
        <span className="section-sub">
          <ShieldCheck size={12} aria-hidden="true" /> Affiliate status contributes 0 points
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '0.8rem',
      }}>
        {matchups.map(matchup => {
          const href = indiaMatchupPath(matchup)
          return (
            <article
              key={matchup.slug}
              className="post-sidebar-card"
              data-india-matchup-card={matchup.slug}
              style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column' }}
            >
              <span className="bento-tile-eyebrow">
                <FileCheck2 size={11} aria-hidden="true" />
                {matchup.expectedProductCount} source-dated products
              </span>
              <h3 style={{ color: '#fff', fontSize: '0.98rem', margin: '0.55rem 0 0' }}>
                {matchup.title} for India
              </h3>
              <p style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1.6, margin: '0.5rem 0' }}>
                {matchup.hubQuestion}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.8rem' }}>
                {matchup.decisionTags.map(tag => (
                  <span key={tag} className="chip" style={{ fontSize: '0.66rem' }}>{tag}</span>
                ))}
              </div>
              <Link
                href={href}
                className="btn-outline"
                data-india-matchup-link={href}
                style={{ marginTop: 'auto', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                Compare {matchup.title} for India <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </article>
          )
        })}
      </div>

      {firmName && (
        <div style={{ marginTop: '0.85rem' }}>
          <Link href="/best-prop-firms-in-india/compare" className="post-sidebar-link">
            Browse all curated India comparisons <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  )

  if (firmName) {
    return (
      <section
        aria-label={`${firmName} comparisons for India`}
        data-india-matchup-cluster={currentFirmSlug ?? undefined}
        style={{
          marginTop: '2.5rem',
          padding: '1.5rem',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
        }}
      >
        {content}
      </section>
    )
  }

  return (
    <section
      className="home-section home-section--alt"
      data-india-matchup-cluster="all"
      aria-label="Curated prop firm comparisons for India"
      style={{ paddingTop: '2rem', paddingBottom: '2rem' }}
    >
      <div className="home-shell">{content}</div>
    </section>
  )
}
