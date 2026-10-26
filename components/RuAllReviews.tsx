import Link from '@/components/SafeLink'
import { RU_ACCESS_BADGE, RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { russiaBasisDateFor, russiaPendingNotListedFor, russiaStatusFor } from '@/lib/russiaAvailability'
import { ruAllReviews } from '@/lib/ruRelatedLinks'

/**
 * «Все обзоры»: every registered /ru/obzor-* route, sorted by firms.json
 * russiaStatus (lib/ruRelatedLinks.ts ruAllReviews). A new RU review appears
 * on /ru, promokody and otzyvy as soon as its route is registered.
 */
function reviewCount(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'обзор' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'обзора' : 'обзоров'
  return `${n} ${word}`
}

export default function RuAllReviews({ marker, sectionClassName = 'ru-section', wrapClassName = 'ru-shell ru-content' }: { marker: string; sectionClassName?: string; wrapClassName?: string }) {
  const reviews = ruAllReviews(russiaStatusFor)
  const global = reviews.filter(item => !item.local)
  const local = reviews.filter(item => item.local)
  const headingId = `ru-all-reviews-${marker}`
  const list = (items: typeof reviews) => (
    <ul className="ru-all-reviews-list">
      {items.map(item => (
        <li key={item.path} data-ru-review={item.path}>
          <Link href={item.path}>Обзор {item.name}</Link>
          {item.local ? null : <RuAccessBadgeView firm={item.firm} status={item.status} basisDate={russiaBasisDateFor(item.firm)} pendingNotListed={russiaPendingNotListedFor(item.firm)} hint={false} />}
        </li>
      ))}
    </ul>
  )
  return (
    <section className={sectionClassName} aria-labelledby={headingId} data-ru-all-reviews={marker} data-ru-all-reviews-count={reviews.length}>
      <div className={wrapClassName}>
        <h2 id={headingId}>Все обзоры на русском</h2>
        <p className="ru-muted ru-all-reviews-note">{reviewCount(reviews.length)}. Отметка у названия — итог нашей проверки условий фирмы («{RU_ACCESS_BADGE.available.label}» — есть прямое подтверждение доступа из России; «нет в списке ограничений (на дату)» — Россия не названа в списке ограничений фирмы на дату проверки; «ограничений по странам не опубликовано (на дату)» — фирма не публикует список стран на дату проверки; «{RU_ACCESS_BADGE.restricted.label}» и т. д.). Она не заменяет проверку вашего гражданства, резидентства и способа оплаты.</p>
        {global.length > 0 ? <><h3 className="ru-all-reviews-group">Международные проп-фирмы</h3>{list(global)}</> : null}
        {local.length > 0 ? <><h3 className="ru-all-reviews-group">Российские проп-компании</h3>{list(local)}</> : null}
      </div>
    </section>
  )
}
