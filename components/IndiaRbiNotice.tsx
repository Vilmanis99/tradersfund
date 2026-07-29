import Link from 'next/link'
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import type { IndiaFirmEvidence } from '@/lib/india'

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function IndiaRbiNotice({ evidence }: { evidence: IndiaFirmEvidence[] }) {
  const named = evidence.filter(entry => entry.rbiAlert.status === 'named')
  if (!named.length) return null

  const sourceUrl = named[0].rbiAlert.sourceUrl
  const listDate = named[0].rbiAlert.sourceListUpdatedAt

  return (
    <section className="home-section" aria-labelledby="india-rbi-notice-heading" style={{ paddingTop: '1rem' }}>
      <div className="home-shell">
        <div
          className="post-sidebar-card"
          style={{
            padding: 'clamp(1.15rem, 3vw, 1.6rem)',
            borderColor: 'rgba(248, 113, 113, 0.38)',
            background: 'linear-gradient(145deg, rgba(127,29,29,0.16), rgba(15,23,42,0.78))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
            <span
              aria-hidden
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
                color: '#fca5a5',
                background: 'rgba(239,68,68,0.14)',
                border: '1px solid rgba(248,113,113,0.3)',
              }}
            >
              <ShieldAlert size={20} />
            </span>
            <div>
              <span className="bento-tile-eyebrow" style={{ color: '#fca5a5' }}>
                <AlertTriangle size={12} /> India eligibility gate
              </span>
              <h2
                id="india-rbi-notice-heading"
                style={{
                  margin: '0.45rem 0 0',
                  color: '#fff',
                  fontSize: 'clamp(1.15rem, 2.4vw, 1.45rem)',
                  lineHeight: 1.3,
                }}
              >
                RBI Alert List firms are excluded from this ranking
              </h2>
              <p style={{ margin: '0.65rem 0 0', color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.65 }}>
                <strong style={{ color: '#fff' }}>{named.map(entry => entry.firmName).join(' and ')}</strong>
                {' '}are named on the RBI Alert List dated {formatDate(listDate)}. We therefore remove them
                from India recommendations, the rules matcher, the INR planner, and India partner CTAs.
              </p>
              <p style={{ margin: '0.65rem 0 0', color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.65 }}>
                RBI says the list covers entities not authorised to deal in forex under FEMA or operate a
                forex electronic trading platform. The list is non-exhaustive, so a firm not appearing on
                it is not automatically authorised. This screening is not a legal opinion about every
                simulated-account contract.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem 1rem', marginTop: '0.9rem' }}>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--accent-light)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  Open the official RBI list <ExternalLink size={12} />
                </a>
                <Link
                  href="/blog/are-prop-firms-legal-in-india"
                  style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 800 }}
                >
                  Read the India legal-risk guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
