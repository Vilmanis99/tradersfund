import type { ReactNode } from 'react'
import Link from '@/components/SafeLink'
import { russianPublishedHref } from '@/lib/localizedRoutes'

/**
 * Internal link to a Russian page that may not be released yet. It renders as
 * plain text until the route is registered in RUSSIAN_ROUTE_EDITORIAL_DATES
 * (lib/localizedRoutes.ts), so a new page's PR switches on its own inlinks and
 * no 404 links ship before it merges.
 */
export default function RuPendingLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const published = russianPublishedHref(href)
  return published ? <Link href={published} className={className}>{children}</Link> : <>{children}</>
}

/** "Ещё по теме" line listing only the released pages; renders nothing until one is registered. */
export function RuRelatedLinks({ items, marker }: { items: Array<{ href: string; label: string }>; marker: string }) {
  const published = items.filter(item => russianPublishedHref(item.href))
  if (published.length === 0) return null
  return (
    <p className="ru-source-line" data-russian-related={marker}>
      Ещё по теме:{' '}
      {published.map((item, index) => (
        <span key={item.href}>{index > 0 ? ' · ' : null}<Link href={item.href}>{item.label}</Link></span>
      ))}
    </p>
  )
}
