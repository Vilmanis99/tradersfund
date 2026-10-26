import Link from 'next/link'
import { ArrowRight, Link2 } from 'lucide-react'
import { firmSlug } from '@/lib/firmSlug'
import { getFirmRelatedLinks } from '@/lib/firmRelatedLinks'

/**
 * Related links at the end of an EN firm review: the firm's rules page (only
 * when it is indexable), every vs page for the firm, and the best-for lists it
 * appears in. Each group is omitted when empty.
 */
export default function FirmRelatedLinks({ firmName, excludeHref }: { firmName: string; excludeHref?: string }) {
  const slug = firmSlug(firmName)
  const groups = getFirmRelatedLinks(slug, firmName)
  const vs = groups.vs.filter(link => link.href !== excludeHref)
  const bestFor = groups.bestFor.filter(link => link.href !== excludeHref)
  const rules = groups.rules && groups.rules.href !== excludeHref ? groups.rules : null
  if (!rules && vs.length === 0 && bestFor.length === 0) return null

  return (
    <section
      aria-labelledby={`related-${slug}`}
      className="firm-related-links"
      data-firm-related-links={slug}
      style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}
    >
      <div className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Link2 size={13} aria-hidden="true" /> Related</div>
      <h2 id={`related-${slug}`} className="section-title" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)' }}>
        More on {firmName}
      </h2>

      {rules && (
        <p data-related-group="rules" style={{ margin: '1rem 0' }}>
          <Link href={rules.href} className="section-link">
            {rules.label} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      )}

      {vs.length > 0 && (
        <div data-related-group="vs" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.6rem' }}>{firmName} head-to-head comparisons</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {vs.map(link => (
              <li key={link.href}>
                <Link href={link.href} className="chip" prefetch={false}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {bestFor.length > 0 && (
        <div data-related-group="best-for" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.6rem' }}>Lists that include {firmName}</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {bestFor.map(link => (
              <li key={link.href}>
                <Link href={link.href} className="chip" prefetch={false}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
