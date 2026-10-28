import Link from 'next/link'
import type { RussiaStatus } from '@/lib/russiaAvailability'
import { ruAccessBadge, type RuPendingNotListed } from '@/lib/ruAccessLabel'

export { RU_ACCESS_BADGE, RU_BASIS_LABEL, ruAccessBadge, ruAccessDate, ruBasisLabel, ruNotListedLabel, type RuAccessBadgeInfo, type RuAccessBasis, type RuPendingNotListed } from '@/lib/ruAccessLabel'

/**
 * Presentational Russia-access badge. Takes a resolved status (and the basis date, if any) so client components
 * need no firm data: only the status string and a date cross the client boundary.
 * pendingNotListed: pending 'available' firm (status 'unverified') -> neutral label for its basis (lib/ruAccessLabel.ts RU_BASIS_LABEL).
 */
export function RuAccessBadgeView({ firm, status, basisDate = null, pendingNotListed = null, hint = true }: { firm: string; status: RussiaStatus; basisDate?: string | null; pendingNotListed?: RuPendingNotListed | null; hint?: boolean }) {
  const badge = ruAccessBadge(status, basisDate, pendingNotListed)
  const pending = badge.modifier === 'neutral' && status !== 'available'
  return (
    <span className="ru-access">
      <span className={`ru-badge ru-badge--${badge.modifier}`} data-russia-status={status} data-russia-firm={firm} data-russia-basis={badge.modifier === 'neutral' ? badge.basis ?? 'not-on-restricted-list' : undefined} data-russia-pending={pending ? 'available' : undefined}>{badge.label}</span>
      {hint && status === 'restricted' ? (
        <>{' '}<Link href="/ru/dlya-russkoyazychnykh-treyderov" prefetch={false} className="ru-access-hint">альтернативы</Link></>
      ) : null}
    </span>
  )
}
