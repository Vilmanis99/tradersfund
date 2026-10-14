import Link from 'next/link'
import type { ComponentProps } from 'react'
import { russiaStatusFor, type RussiaStatus } from '@/lib/russiaAvailability'

const BADGE: Record<RussiaStatus, { modifier: 'open' | 'closed' | 'unclear'; label: string }> = {
  available: { modifier: 'open', label: 'Открыта для РФ' },
  restricted: { modifier: 'closed', label: 'Недоступно для РФ' },
  unclear: { modifier: 'unclear', label: 'Доступ для РФ не ясен' },
  unverified: { modifier: 'unclear', label: 'Доступ для РФ не проверен' },
}

/** Russia-access badge driven by firms.json russiaStatus. Inline markup only. */
export function RuAccessBadge({ firm }: { firm: string }) {
  const status = russiaStatusFor(firm)
  const badge = BADGE[status]
  return (
    <span className="ru-access">
      <span className={`ru-badge ru-badge--${badge.modifier}`} data-russia-status={status} data-russia-firm={firm}>{badge.label}</span>
      {status === 'restricted' ? (
        <>{' '}<Link href="/ru/dlya-russkoyazychnykh-treyderov" prefetch={false} className="ru-access-hint">альтернативы</Link></>
      ) : null}
    </span>
  )
}

type RuGoLinkProps = ComponentProps<typeof Link> & { firm: string }

/**
 * Drop-in replacement for <Link href="/go/..."> on /ru pages. Every firm keeps
 * its sign-up CTA; a Russia-access badge (russiaStatus) is rendered next to it.
 */
export function RuGoLink({ firm, ...props }: RuGoLinkProps) {
  return (
    <>
      <Link {...props} data-russia-status={russiaStatusFor(firm)} />
      {' '}
      <RuAccessBadge firm={firm} />
    </>
  )
}
