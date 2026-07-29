import Link from 'next/link'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import {
  indiaEvidenceScore,
  type IndiaEvidenceField,
  type IndiaFirmEvidence,
  type IndiaEvidenceStatus,
  type IndiaRbiAlertEvidence,
} from '@/lib/india'
import type { Firm } from '@/lib/firms'

const STATUS: Record<IndiaEvidenceStatus, { label: string; color: string; background: string }> = {
  verified: {
    label: 'Captured',
    color: '#86efac',
    background: 'rgba(34, 197, 94, 0.12)',
  },
  partial: {
    label: 'India test needed',
    color: '#fcd34d',
    background: 'rgba(245, 158, 11, 0.12)',
  },
  unknown: {
    label: 'Unknown',
    color: '#cbd5e1',
    background: 'rgba(148, 163, 184, 0.12)',
  },
}

function SourceLinks({ field }: { field: IndiaEvidenceField }) {
  if (!field.sourceUrls.length) return null

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
      {field.sourceUrls.map((url, index) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="nofollow noopener"
          style={{ color: 'var(--accent-light)', fontSize: '0.72rem', fontWeight: 700 }}
        >
          Source{field.sourceUrls.length > 1 ? ` ${index + 1}` : ''} <ExternalLink size={10} />
        </a>
      ))}
    </span>
  )
}

function EvidenceCell({ field }: { field: IndiaEvidenceField }) {
  const status = STATUS[field.status]
  return (
    <td style={{ minWidth: 210, padding: '1rem', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
      <span
        style={{
          display: 'inline-flex',
          padding: '0.2rem 0.5rem',
          borderRadius: 999,
          color: status.color,
          background: status.background,
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}
      >
        {status.label}
      </span>
      <p style={{ margin: '0.55rem 0 0', color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.55 }}>
        {field.summary}
      </p>
      <SourceLinks field={field} />
    </td>
  )
}

function RbiAlertCell({ alert }: { alert: IndiaRbiAlertEvidence }) {
  const named = alert.status === 'named'
  return (
    <td style={{ minWidth: 230, padding: '1rem', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
      <span
        style={{
          display: 'inline-flex',
          padding: '0.2rem 0.5rem',
          borderRadius: 999,
          color: named ? '#fca5a5' : '#fcd34d',
          background: named ? 'rgba(239, 68, 68, 0.13)' : 'rgba(245, 158, 11, 0.12)',
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}
      >
        {named ? 'Named by RBI' : 'Not found ≠ authorised'}
      </span>
      <p style={{ margin: '0.55rem 0 0', color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.55 }}>
        {alert.summary}
      </p>
      <a
        href={alert.sourceUrl}
        target="_blank"
        rel="nofollow noopener"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginTop: '0.45rem',
          color: 'var(--accent-light)',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        RBI source <ExternalLink size={10} />
      </a>
    </td>
  )
}

export default function IndiaEvidenceMatrix({
  evidence,
  firms,
}: {
  evidence: IndiaFirmEvidence[]
  firms: Firm[]
}) {
  const reviewUrls = new Map(firms.map(firm => [firm.name, firm.reviewUrl]))

  return (
    <section className="home-section home-section--alt" aria-labelledby="india-evidence-heading">
      <div className="home-shell">
        <div className="section-head">
          <div>
            <h2 id="india-evidence-heading" className="section-title">
              <ShieldCheck size={18} style={{ color: 'var(--accent-light)' }} />
              India evidence matrix
            </h2>
            <p className="section-sub-text">
              “Captured” means a first-party page supports the statement. “India test needed” means the
              general method is published, but a successful Indian checkout or payout is not independently verified.
              RBI status is a separate eligibility gate.
            </p>
          </div>
        </div>

        <div
          className="post-sidebar-card"
          style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <table style={{ width: '100%', minWidth: 1490, borderCollapse: 'collapse' }}>
            <caption className="hidden-caption">
              RBI Alert List, country, checkout, KYC, payout, fee, and currency evidence by prop firm
            </caption>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={{ minWidth: 170, padding: '0.9rem 1rem', textAlign: 'left' }}>Firm</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>RBI Alert List</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Country signal</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Checkout</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>KYC</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Payout</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Fees</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'left' }}>Currency</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map(entry => (
                <tr key={entry.firmSlug}>
                  <td style={{ padding: '1rem', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                    <Link
                      href={reviewUrls.get(entry.firmName) ?? '/prop-firms'}
                      style={{ color: '#fff', fontWeight: 800, textDecoration: 'none' }}
                    >
                      {entry.firmName}
                    </Link>
                    <div style={{ marginTop: '0.4rem', color: 'var(--accent-light)', fontSize: '0.75rem', fontWeight: 700 }}>
                      Evidence {indiaEvidenceScore(entry)}/12
                    </div>
                    <div style={{ marginTop: '0.4rem', color: 'var(--muted)', fontSize: '0.72rem' }}>
                      Captured {new Date(entry.capturedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div style={{ marginTop: '0.4rem', color: 'var(--muted)', fontSize: '0.72rem' }}>
                      {entry.restrictionListComplete
                        ? `${entry.restrictedJurisdictions.length} named restrictions captured`
                        : `${entry.restrictedJurisdictions.length} named restrictions; dynamic checks also apply`}
                    </div>
                    <p style={{ margin: '0.7rem 0 0', color: 'var(--muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                      Open gap: {entry.unresolved}
                    </p>
                  </td>
                  <RbiAlertCell alert={entry.rbiAlert} />
                  <EvidenceCell field={entry.country} />
                  <EvidenceCell field={entry.checkout} />
                  <EvidenceCell field={entry.kyc} />
                  <EvidenceCell field={entry.payout} />
                  <EvidenceCell field={entry.fees} />
                  <EvidenceCell field={entry.currency} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
