import Link from '@/components/SafeLink'
import { ArrowRight } from 'lucide-react'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { russianPublishedHref } from '@/lib/localizedRoutes'
import { ruPublishedLinks, ruReviewFirmFor } from '@/lib/ruRelatedLinks'

function kindLabel(href: string): string {
  if (href.startsWith('/ru/obzor-')) return 'Обзор'
  if (href.includes('-vs-')) return 'Сравнение'
  return 'Руководство'
}

/**
 * «Похожие материалы»: the `related` slot of lib/ruRelatedLinks.ts at the end
 * of a RU review or comparison. Only registered routes render; review targets
 * carry the Russia badge from firms.json russiaStatus.
 */
export default function RuRelatedBlock({ path }: { path: string }) {
  const links = ruPublishedLinks(path, 'related').filter(link => russianPublishedHref(link.href))
  if (links.length === 0) return null
  return (
    <section className="ru-section" aria-labelledby="ru-related-heading" data-ru-related-block={path}>
      <div className="ru-shell ru-content">
        <h2 id="ru-related-heading">Похожие материалы</h2>
        <ul className="ru-related-grid">
          {links.map(link => {
            const review = ruReviewFirmFor(link.href)
            return (
              <li key={link.href} className="ru-related-card" data-ru-slot="related">
                <span className="ru-related-kind">{kindLabel(link.href)}</span>
                <Link href={link.href} className="ru-related-link">{link.anchor} <ArrowRight size={14} aria-hidden="true" /></Link>
                {review && !review.local ? <RuAccessBadgeView firm={review.firm} status={russiaStatusFor(review.firm)} hint={false} /> : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
