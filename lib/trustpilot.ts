import type { Firm } from './firms'

/* ── Trustpilot presentation model ────────────────────────────────
 *
 * Trustpilot figures are *cited third-party data*, not our rating. Three
 * states exist in `firms.json` and all three must stay distinguishable in
 * the UI (see AGENTS.md — "Data model"):
 *
 *   rated       → Trustpilot publishes an aggregate score for the firm.
 *   suppressed  → `trustpilotRatingSuppressed: true`. Trustpilot itself
 *                 pulled the aggregate for a guidelines breach. This is a
 *                 finding, not a gap: it is more informative than any
 *                 number, and any score quoted for these firms elsewhere is
 *                 stale or invented. Never render it as a blank or a dash.
 *   uncaptured  → we have not captured the figure yet. Honest absence.
 *
 * Suppressed firms often still have a public review *count* (Maven 5,151;
 * Crypto Fund Trader 1,140) — surface it, because "1,140 reviews, no
 * published score" is a sharper fact than "no data".
 *
 * NOTE: these figures must never be emitted as schema.org AggregateRating
 * or Review markup. Marking up a third party's aggregate as our own is a
 * Google structured-data policy violation and a manual-action risk. They
 * are content, and content only.
 */

/** Trustpilot's own wording on a suppressed profile. Quoted verbatim, never paraphrased. */
export const TRUSTPILOT_SUPPRESSION_NOTICE =
  "This company's rating is unavailable due to a breach of our guidelines."

/** Trustpilot scores are out of 5 — our own editorial `score` is out of 10. */
export const TRUSTPILOT_SCALE_MAX = 5

export type TrustpilotState =
  | { kind: 'rated'; score: number; count: number | null; url?: string; capturedAt?: string }
  | { kind: 'suppressed'; count: number | null; url?: string; capturedAt?: string }
  | { kind: 'uncaptured' }

/**
 * Collapse the four raw `Firm` fields into one discriminated state so every
 * surface renders the same three cases the same way.
 *
 * Suppression wins over a score: if Trustpilot has pulled the aggregate, a
 * leftover number in the data file is stale by definition.
 */
export function getTrustpilotState(firm: Firm): TrustpilotState {
  const count = firm.trustpilotCount ?? null
  const url = firm.trustpilotUrl
  const capturedAt = firm.trustpilotCapturedAt

  if (firm.trustpilotRatingSuppressed) {
    return { kind: 'suppressed', count, url, capturedAt }
  }
  if (typeof firm.trustpilotScore === 'number') {
    return { kind: 'rated', score: firm.trustpilotScore, count, url, capturedAt }
  }
  return { kind: 'uncaptured' }
}

/** 47019 → "47,019". */
export function formatReviewCount(n: number): string {
  return n.toLocaleString('en-US')
}

/** "2026-07-27" → "27 Jul 2026". Returns the raw string if it isn't a date. */
export function formatCapturedAt(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * One-line plain-text summary. Used for `title`/`aria-label` on the compact
 * variants so screen-reader and hover users get the full fact, not "4.8".
 */
export function trustpilotSummary(state: TrustpilotState, firmName: string): string {
  const reviews = state.kind !== 'uncaptured' && state.count != null
    ? `${formatReviewCount(state.count)} reviews`
    : null
  const dated = state.kind !== 'uncaptured' && state.capturedAt
    ? ` (checked ${formatCapturedAt(state.capturedAt)})`
    : ''

  switch (state.kind) {
    case 'rated':
      return reviews
        ? `${firmName} scores ${state.score} out of ${TRUSTPILOT_SCALE_MAX} on Trustpilot from ${reviews}${dated}.`
        : `${firmName} scores ${state.score} out of ${TRUSTPILOT_SCALE_MAX} on Trustpilot${dated}.`
    case 'suppressed':
      return reviews
        ? `Trustpilot has suppressed ${firmName}'s aggregate rating for a guidelines breach. The profile still carries ${reviews}${dated}.`
        : `Trustpilot has suppressed ${firmName}'s aggregate rating for a guidelines breach${dated}.`
    case 'uncaptured':
      return `We have not captured a Trustpilot figure for ${firmName} yet.`
  }
}
