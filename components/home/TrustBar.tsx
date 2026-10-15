import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

export interface TrustItem { label: ReactNode; href?: string; hrefLang?: string; data?: Record<string, string> }

/** Compact strip of trust signals under the hero. Scrolls sideways on small screens. */
export default function TrustBar({ items, label, data }: { items: TrustItem[]; label: string; data?: Record<string, string> }) {
  return (
    <div className="th-trust" role="region" aria-label={label} {...data}>
      <ul className="th-wrap th-trust__list">
        {items.map((item, index) => (
          <li key={index} {...item.data}>
            <Check size={16} aria-hidden="true" />
            {item.href ? <Link href={item.href} hrefLang={item.hrefLang}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
