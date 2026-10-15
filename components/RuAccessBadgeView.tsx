import Link from 'next/link'
import type { RussiaStatus } from '@/lib/russiaAvailability'

export const RU_ACCESS_BADGE: Record<RussiaStatus, { modifier: 'open' | 'closed' | 'unclear'; label: string }> = {
  available: { modifier: 'open', label: 'Открыта для РФ' },
  restricted: { modifier: 'closed', label: 'Недоступно для РФ' },
  unclear: { modifier: 'unclear', label: 'РФ: неясно' },
  unverified: { modifier: 'unclear', label: 'РФ: не проверено' },
}

/** Presentational Russia-access badge. Takes a resolved status so client components need no firm data. */
export function RuAccessBadgeView({ firm, status, hint = true }: { firm: string; status: RussiaStatus; hint?: boolean }) {
  const badge = RU_ACCESS_BADGE[status]
  return (
    <span className="ru-access">
      <span className={`ru-badge ru-badge--${badge.modifier}`} data-russia-status={status} data-russia-firm={firm}>{badge.label}</span>
      {hint && status === 'restricted' ? (
        <>{' '}<Link href="/ru/dlya-russkoyazychnykh-treyderov" prefetch={false} className="ru-access-hint">альтернативы</Link></>
      ) : null}
    </span>
  )
}
