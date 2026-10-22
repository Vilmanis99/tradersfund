import type { ComponentProps } from 'react'
import Link from './SafeLink'
import type { RussiaStatus } from '@/lib/russiaStatus'
import { RuAccessBadgeView } from './RuAccessBadgeView'

/** hideBadge: skip the badge where the surrounding table already has a Russia-status column. */
export type RuGoLinkViewProps = ComponentProps<typeof Link> & { firm: string; status: RussiaStatus; hideBadge?: boolean }

/**
 * Client-safe twin of RuGoLink (same markup): takes a Russia status resolved on
 * the server instead of calling russiaStatusFor, so client components never
 * import lib/russiaAvailability and never bundle content/data/firms.json.
 * Never prefetched by default: /go/ records a click and 302s to the partner.
 */
export function RuGoLinkView({ firm, status, hideBadge = false, prefetch = false, ...props }: RuGoLinkViewProps) {
  if (hideBadge) {
    return <Link {...props} prefetch={prefetch} data-russia-status={status} data-russia-badge="column" />
  }
  return (
    <>
      <Link {...props} prefetch={prefetch} data-russia-status={status} />
      {' '}
      <RuAccessBadgeView firm={firm} status={status} />
    </>
  )
}
