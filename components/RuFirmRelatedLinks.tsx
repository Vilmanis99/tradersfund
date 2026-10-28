import Link from '@/components/SafeLink'
import { getRuFirmRelatedLinks } from '@/lib/firmRelatedLinks'
import { RU_RELATED, type RuMapPath } from '@/lib/ruRelatedLinks'

/**
 * Related links on a RU review that the page does not already carry: the RU
 * rules page once indexable (and therefore registered) and RU best-for lists
 * once a provider exists (lib/firmRelatedLinks.ts). Renders nothing until then.
 * Hrefs already in the page's RU_RELATED map are skipped, because
 * scripts/audit-ru-links.mjs forbids repeating them.
 */
export default function RuFirmRelatedLinks({ firm, path }: { firm: string; path: string }) {
  const mapped = (RU_RELATED[path as RuMapPath] ?? []).map(link => link.href)
  const links = getRuFirmRelatedLinks(firm, mapped)
  if (links.length === 0) return null
  return (
    <section className="ru-section" aria-labelledby={`ru-firm-related-${firm}`} data-ru-firm-related={firm}>
      <div className="ru-shell ru-content">
        <h2 id={`ru-firm-related-${firm}`}>Правила и подборки</h2>
        <ul>
          {links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
        </ul>
      </div>
    </section>
  )
}
