import Link from 'next/link'
import { BadgeCheck, CircleAlert, ExternalLink } from 'lucide-react'
import type {
  ChallengeProductSignal,
  ChallengeWatchKind,
} from '@/lib/challengeWatch'

function kindLabel(kind: ChallengeWatchKind) {
  if (kind === 'lineup-change') return 'Product lineup'
  if (kind === 'price-watch') return 'Price watch'
  if (kind === 'rule-change') return 'Rule change'
  return 'Source conflict'
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ProductChangeSignals({
  signals,
  compact = false,
  detailsPath = '/prop-firm-challenge-changes',
}: {
  signals: ChallengeProductSignal[]
  compact?: boolean
  detailsPath?: string
}) {
  if (!signals.length) return null

  return (
    <div
      className={`product-change-signals${compact ? ' product-change-signals--compact' : ''}`}
      aria-label={`${signals.length} dated challenge change ${
        signals.length === 1 ? 'signal' : 'signals'
      }`}
    >
      {signals.map(signal => {
        const isWatch = signal.status === 'watch'
        const Icon = isWatch ? CircleAlert : BadgeCheck
        return (
          <article
            key={signal.id}
            className={`product-change-signal product-change-signal--${signal.status}`}
          >
            <div className="product-change-signal-head">
              <Icon size={12} aria-hidden="true" />
              <strong>{kindLabel(signal.kind)}</strong>
              <span>{isWatch ? 'Open watch' : 'Verified'}</span>
            </div>
            <p>{signal.title}</p>
            {!compact && <small>{signal.traderImpact}</small>}
            <footer>
              <span>Checked {dateLabel(signal.lastCheckedAt)}</span>
              <a href={signal.sourceUrl} target="_blank" rel="nofollow noopener">
                Source <ExternalLink size={9} aria-hidden="true" />
              </a>
              <Link href={`${detailsPath}#${signal.id}`}>
                Details
              </Link>
            </footer>
          </article>
        )
      })}
    </div>
  )
}
