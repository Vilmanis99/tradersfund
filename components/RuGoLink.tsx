import Link from 'next/link'
import type { ComponentProps } from 'react'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { RuAccessBadgeView } from './RuAccessBadgeView'

/** Russia-access badge driven by firms.json russiaStatus. Inline markup only. */
export function RuAccessBadge({ firm }: { firm: string }) {
  return <RuAccessBadgeView firm={firm} status={russiaStatusFor(firm)} />
}

/** hideBadge: skip the badge where the surrounding table already has a Russia-status column. */
type RuGoLinkProps = ComponentProps<typeof Link> & { firm: string; hideBadge?: boolean }

/**
 * Drop-in replacement for <Link href="/go/..."> on /ru pages. Every firm keeps
 * its sign-up CTA; a Russia-access badge (russiaStatus) is rendered next to it.
 */
export function RuGoLink({ firm, hideBadge = false, ...props }: RuGoLinkProps) {
  if (hideBadge) {
    return <Link {...props} data-russia-status={russiaStatusFor(firm)} data-russia-badge="column" />
  }
  return (
    <>
      <Link {...props} data-russia-status={russiaStatusFor(firm)} />
      {' '}
      <RuAccessBadge firm={firm} />
    </>
  )
}
