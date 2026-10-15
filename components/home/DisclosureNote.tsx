import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/** One-line disclosure; full text stays in the DOM (crawlable) behind a native disclosure. */
export default function DisclosureNote({ summary, children, data }: { summary: ReactNode; children?: ReactNode; data?: Record<string, string> }) {
  if (!children) return <p className="th-disclosure" {...data}><Info size={14} aria-hidden="true" /> {summary}</p>
  return (
    <details className="th-disclosure" {...data}>
      <summary><Info size={14} aria-hidden="true" /> {summary}</summary>
      <div className="th-disclosure__body">{children}</div>
    </details>
  )
}
