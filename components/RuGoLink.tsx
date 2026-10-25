import Link from './SafeLink'
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
 * Never prefetched: /go/ records a click and 302s to the partner, so a prefetch
 * on view would be a fake click (SafeLink also forces this for /go/ hrefs).
 */
export function RuGoLink({ firm, hideBadge = false, prefetch = false, ...props }: RuGoLinkProps) {
  if (hideBadge) {
    return <Link {...props} prefetch={prefetch} data-russia-status={russiaStatusFor(firm)} data-russia-badge="column" />
  }
  return (
    <>
      <Link {...props} prefetch={prefetch} data-russia-status={russiaStatusFor(firm)} />
      {' '}
      <RuAccessBadge firm={firm} />
    </>
  )
}
