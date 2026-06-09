import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { getAllFirms } from '@/lib/firms'
import HeaderNav from './HeaderNav'

// Re-export so existing call-sites that did `import { navLinks } from
// '@/components/Header'` still work. New code should import from
// '@/components/navLinks' directly.
export { navLinks } from './navLinks'
export type { NavLink } from './navLinks'

/**
 * Format an ISO date (YYYY-MM-DD) into a short human-readable label, e.g.
 * "Apr 24". Falls back gracefully if the input is missing or malformed.
 */
function formatShortDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Compute the most recent `lastUpdated` across all firms. This is the
 * heartbeat we surface in the header pill — it signals editorial freshness
 * without requiring a manual edit every release.
 */
function computeLastUpdated(): string {
  const firms = getAllFirms()
  const dates = firms
    .map(f => f.lastUpdated)
    .filter((d): d is string => Boolean(d))
    .sort()
  return dates.length ? dates[dates.length - 1] : ''
}

export default function Header() {
  const lastUpdated = formatShortDate(computeLastUpdated())

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="Traders Fund Hub home">
          <div className="site-header__logo" aria-hidden="true">
            <TrendingUp size={18} color="#fff" />
          </div>
          <span className="site-header__wordmark">
            Traders <span className="gradient-text--animated">Fund</span> Hub
          </span>
        </Link>

        <HeaderNav lastUpdated={lastUpdated} />
      </div>
      <div className="site-header__aurora-line" aria-hidden="true" />
    </header>
  )
}
