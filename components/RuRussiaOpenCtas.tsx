import { ArrowRight } from 'lucide-react'
import { getAllFirms } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { goLinkRel, russiaStatusFor } from '@/lib/russiaAvailability'
import { compareRussianRanking } from '@/lib/russianRanking'
import { RuGoLink } from './RuGoLink'

/**
 * "Live in Russia?" CTA strip for /ru pages that list Russia-restricted or unclear firms first.
 * Shows only the given firms whose firms.json russiaStatus is 'available', in RU ranking order
 * (active pin first), so the page's first sign-up CTAs go to firms that do not restrict Russia.
 * Renders nothing when none of the firms is open.
 */
export default function RuRussiaOpenCtas({ firms, from, context }: { firms: string[]; from: string; context: string }) {
  const records = getAllFirms()
  const open = firms
    .filter(slug => russiaStatusFor(slug) === 'available')
    .flatMap(slug => {
      const firm = records.find(record => outboundSlug(record.name) === slug)
      return firm ? [{ slug, name: slug === 'bright-funded' ? 'BrightFunded' : firm.name, score: firm.score }] : []
    })
    .sort((a, b) => compareRussianRanking(a, b, russiaStatusFor))
  if (!open.length) return null
  return (
    <div className="ru-notice" data-ru-russia-open-ctas={open.map(item => item.slug).join(',')}>
      <strong>Если вы живёте в России.</strong>{' '}
      {context} Россию в ограничениях не называют: {open.map(item => item.name).join(', ')}. Это не подтверждает доступ для вашего профиля: проверьте условия до оплаты.
      <div className="ru-actions">
        {open.map((item, index) => (
          <RuGoLink key={item.slug} firm={item.slug} href={`/go/${item.slug}?from=${from}-${item.slug}`} rel={goLinkRel(item.slug)} className={index === 0 ? 'btn-primary' : 'btn-outline'}>
            Проверить {item.name} <ArrowRight size={14} aria-hidden="true" />
          </RuGoLink>
        ))}
      </div>
    </div>
  )
}
