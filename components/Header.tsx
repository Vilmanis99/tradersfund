import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import HeaderBrand from './HeaderBrand'
import HeaderNav from './HeaderNav'

// Re-export so existing call-sites that did `import { navLinks } from
// '@/components/Header'` still work. New code should import from
// '@/components/navLinks' directly.
export { navLinks } from './navLinks'
export type { NavLink } from './navLinks'

function computeFreshnessLabel(): string {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshFirmCount = firms.filter(firm => {
    const slug = firm.name.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const products = challenges.filter(challenge => challenge.firmSlug === slug)
    return products.length > 0 && products.every(challenge => isChallengeFresh(challenge))
  }).length
  return `${freshFirmCount}/${firms.length} source-checked`
}

export default function Header() {
  const dataStatus = computeFreshnessLabel()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <HeaderBrand />

        <HeaderNav dataStatus={dataStatus} />
      </div>
      <div className="site-header__aurora-line" aria-hidden="true" />
    </header>
  )
}
