import Link from 'next/link'
import type { ComponentProps } from 'react'
import { isHiddenOnRussianPages, RUSSIA_ALTERNATIVES } from '@/lib/russiaAvailability'

/**
 * Block shown on /ru pages instead of a sign-up CTA for firms that restrict
 * Russia (or whose status is unclear). Uses only <span> elements so it is
 * valid inside paragraphs, list items and action rows.
 */
export function RuRestrictedAlternatives({ firm }: { firm?: string }) {
  return (
    <span className="ru-restricted-alternatives" data-russia-restricted={firm ?? 'unknown'} role="note">
      <strong>Недоступно в РФ — альтернативы:</strong>{' '}
      {RUSSIA_ALTERNATIVES.map((alt, index) => (
        <span key={alt.name}>
          {index > 0 ? ', ' : ''}
          {alt.external ? (
            <a href={alt.href} target="_blank" rel="nofollow noopener noreferrer">{alt.name}</a>
          ) : (
            <Link href={alt.href} prefetch={false} rel={alt.sponsored ? 'sponsored nofollow noopener' : undefined}>{alt.name}</Link>
          )}
        </span>
      ))}
    </span>
  )
}

type RuGoLinkProps = ComponentProps<typeof Link> & { firm: string }

/** Drop-in replacement for <Link href="/go/..."> on /ru pages. */
export function RuGoLink({ firm, ...props }: RuGoLinkProps) {
  if (isHiddenOnRussianPages(firm)) return <RuRestrictedAlternatives firm={firm} />
  return <Link {...props} />
}
