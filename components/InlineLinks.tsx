import Link from '@/components/SafeLink'
import { Fragment, type ReactNode } from 'react'

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g

/**
 * Renders plain copy with markdown-style links: [text](/path) becomes a
 * SafeLink (never prefetches /go/), [text](https://...) an external link. Anything else, including
 * raw HTML, stays plain text (no dangerouslySetInnerHTML).
 */
export default function InlineLinks({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match
    const index = match.index ?? 0
    const internal = href.startsWith('/') && !href.startsWith('//')
    const external = href.startsWith('https://')
    if (!internal && !external) continue
    if (index > last) parts.push(text.slice(last, index))
    parts.push(internal
      ? <Link key={index} href={href}>{label}</Link>
      : <a key={index} href={href} rel="nofollow noopener" target="_blank">{label}</a>)
    last = index + whole.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)}</>
}
