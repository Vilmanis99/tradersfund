import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import type { Firm } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import { indexableRulesHref } from '@/lib/rulesPages'

/**
 * On a vs page: links to each firm's rules page, only when that page is
 * indexable (complete, sourced, fresh). Renders nothing when neither is.
 */
export default function CompareRulesLinks({ firmA, firmB }: { firmA: Firm; firmB: Firm }) {
  const links = [firmA, firmB]
    .map(firm => ({ name: firm.name, href: indexableRulesHref(firmSlug(firm.name)) }))
    .filter((link): link is { name: string; href: string } => Boolean(link.href))
  if (!links.length) return null
  return (
    <section aria-label="Full rules pages" data-compare-rules-links style={{ marginTop: '2.5rem' }}>
      <div className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><ScrollText size={13} aria-hidden="true" /> Full rules, with sources</div>
      <div className="firm-related-links" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
        {links.map(link => (
          <Link key={link.href} href={link.href} className="chip">{link.name} rules</Link>
        ))}
      </div>
    </section>
  )
}
