import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface GuideItem { href: string; label: string; title: string; description: string; data?: Record<string, string> }

/** Three numbered guide cards plus an optional compact link list. */
export default function Guides({ id, title, items, more, links, data, linksData }: {
  id: string; title: string; items: GuideItem[]; more?: ReactNode
  links?: Array<{ href: string; title: string; description: string }>; data?: Record<string, string>; linksData?: Record<string, string>
}) {
  return (
    <section className="th-section" aria-labelledby={id}>
      <div className="th-wrap" {...data}>
        <div className="th-section__head"><h2 id={id}>{title}</h2>{more}</div>
        <div className="th-guides">
          {items.map((guide, index) => (
            <Link key={guide.href} href={guide.href} className="th-guide" {...guide.data}>
              <span className="th-guide__label">{String(index + 1).padStart(2, '0')} · {guide.label}</span>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <ArrowRight size={20} aria-hidden="true" className="th-guide__arrow" />
            </Link>
          ))}
        </div>
        {links?.length ? (
          <div className="th-guide-links" {...linksData}>
            {links.map(link => (
              <Link key={link.href} href={link.href}><span><strong>{link.title}</strong><span>{link.description}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
