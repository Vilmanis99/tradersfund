import NextLink from 'next/link'
import type { ComponentProps } from 'react'

type SafeLinkProps = ComponentProps<typeof NextLink>

/**
 * Preserve normal Next.js prefetching for editorial navigation, but never
 * prefetch a /go/ Route Handler. Affiliate redirects record a server event
 * and leave the site, so they must execute only after a deliberate click.
 */
export default function SafeLink({ href, prefetch, ...props }: SafeLinkProps) {
  const pathname = typeof href === 'string' ? href : href.pathname
  const isOutboundRedirect = pathname?.startsWith('/go/') ?? false

  return (
    <NextLink
      {...props}
      href={href}
      prefetch={isOutboundRedirect ? false : prefetch}
    />
  )
}
