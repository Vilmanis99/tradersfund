import { Star, TriangleAlert, ExternalLink } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import {
  TRUSTPILOT_SCALE_MAX,
  TRUSTPILOT_SUPPRESSION_NOTICE,
  formatCapturedAt,
  formatReviewCount,
  getTrustpilotState,
  trustpilotSummary,
} from '@/lib/trustpilot'

/**
 * Cited Trustpilot figures. Two shapes over one state model:
 *
 *   <TrustpilotRating />  compact — table cells, card stat slots, badge rows
 *   <TrustpilotPanel />   block   — review pages and comparison pages
 *
 * Three states, three visibly different treatments (see lib/trustpilot.ts):
 *   rated       gold star + score/5 + review count
 *   suppressed  dashed amber warning chip — never a dash, never a blank
 *   uncaptured  muted "Not captured yet"
 *
 * No `use client` — pure presentation, so it renders inside both the server
 * review pages and the client-side <FirmTable>.
 *
 * Outbound links go straight to trustpilot.com with rel="noopener noreferrer"
 * and target="_blank". Trustpilot is a citation the reader should be able to
 * check, NOT an affiliate destination — it must never route through /go/.
 *
 * Deliberately emits no JSON-LD. Marking a third party's aggregate up as our
 * own AggregateRating breaches Google's structured-data policy.
 */

/* ── Compact ──────────────────────────────────────────────────────── */

export default function TrustpilotRating({
  firm,
  linked = false,
  label = false,
}: {
  firm: Firm
  /** Wrap the figure in a link to the Trustpilot profile so readers can verify. */
  linked?: boolean
  /** Name Trustpilot in the sub-line. Needed wherever no column header does it. */
  label?: boolean
}) {
  const state = getTrustpilotState(firm)
  const summary = trustpilotSummary(state, firm.name)

  if (state.kind === 'uncaptured') {
    return (
      <span className="tp tp--uncaptured" title={summary}>
        {label ? 'Trustpilot not captured yet' : 'Not captured yet'}
      </span>
    )
  }

  // Sub-line: never just a number. "4.8" alone is weaker than
  // "4.8 from 47,019 reviews", and a suppressed profile's review count is a
  // real, checkable fact worth showing.
  const meta = [
    label ? 'Trustpilot' : null,
    state.count != null ? `${formatReviewCount(state.count)} review${state.count === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ')

  const body =
    state.kind === 'rated' ? (
      <span className="tp tp--rated">
        <span className="tp-figure">
          <Star size={12} fill="currentColor" aria-hidden="true" />
          <b>{state.score.toFixed(1)}</b>
          <span className="tp-scale">/ {TRUSTPILOT_SCALE_MAX}</span>
        </span>
        {meta && <span className="tp-count">{meta}</span>}
      </span>
    ) : (
      <span className="tp tp--suppressed">
        <span className="tp-figure">
          <TriangleAlert size={12} aria-hidden="true" />
          <b>Rating suppressed</b>
        </span>
        {meta && <span className="tp-count">{meta}</span>}
      </span>
    )

  if (linked && state.url) {
    return (
      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tp-link"
        title={summary}
        aria-label={summary}
      >
        {body}
      </a>
    )
  }

  return <span title={summary}>{body}</span>
}

/* ── Block ────────────────────────────────────────────────────────── */

/**
 * Full treatment for review and comparison pages: state, review count, the
 * verbatim Trustpilot notice when suppressed, the capture date, and a link
 * out to the profile.
 */
export function TrustpilotPanel({ firm }: { firm: Firm }) {
  const state = getTrustpilotState(firm)
  const captured = state.kind !== 'uncaptured' ? formatCapturedAt(state.capturedAt) : null

  return (
    <div
      className={`tp-panel tp-panel--${state.kind}`}
      aria-label={`${firm.name} on Trustpilot`}
    >
      <div className="tp-panel-head">
        <span className="tp-panel-label">Trustpilot</span>
        {captured && <span className="tp-panel-date">Checked {captured}</span>}
      </div>

      {state.kind === 'rated' && (
        <p className="tp-panel-value">
          <Star size={16} fill="currentColor" aria-hidden="true" className="tp-panel-star" />
          <b>{state.score.toFixed(1)}</b>
          <span className="tp-scale">/ {TRUSTPILOT_SCALE_MAX}</span>
          {state.count != null && (
            <span className="tp-panel-from">from {formatReviewCount(state.count)} reviews</span>
          )}
        </p>
      )}

      {state.kind === 'suppressed' && (
        <>
          <p className="tp-panel-value tp-panel-value--warn">
            <TriangleAlert size={16} aria-hidden="true" />
            <b>Rating suppressed by Trustpilot</b>
          </p>
          <p className="tp-panel-note">
            Trustpilot&apos;s notice on this profile reads: &ldquo;{TRUSTPILOT_SUPPRESSION_NOTICE}&rdquo;
            {state.count != null && (
              <> The profile still carries {formatReviewCount(state.count)} reviews.</>
            )}
          </p>
        </>
      )}

      {state.kind === 'uncaptured' && (
        <p className="tp-panel-value tp-panel-value--muted">Not captured yet</p>
      )}

      {state.kind !== 'uncaptured' && state.url && (
        <a
          href={state.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tp-panel-link"
        >
          Check {firm.name} on Trustpilot <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
