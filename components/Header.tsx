import { firmSlug } from '@/lib/firmSlug'
import { getAllChallenges, getAllFirms } from '@/lib/firms'
import HeaderBrand from './HeaderBrand'
import HeaderNav from './HeaderNav'
import { isProductSetFresh } from '@/lib/reviewFreshness'
import { CLOSED_FIRMS_PUBLISHED } from '@/lib/closedFirms'

// Re-export so existing call-sites that did `import { navLinks } from
// '@/components/Header'` still work. New code should import from
// '@/components/navLinks' directly.
export { navLinks } from './navLinks'
export type { NavLink } from './navLinks'

function computeFreshnessLabel(): string {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshFirmCount = firms.filter(firm => {
    const slug = firmSlug(firm.name.replace(/&/g, 'and'))
    const products = challenges.filter(challenge => challenge.firmSlug === slug)
    return isProductSetFresh(products)
  }).length
  return `${freshFirmCount}/${firms.length} source-checked`
}

export default function Header() {
  const dataStatus = computeFreshnessLabel()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <HeaderBrand />

        <HeaderNav dataStatus={dataStatus} closedFirmsPublished={CLOSED_FIRMS_PUBLISHED} />
      </div>
      <div className="site-header__aurora-line" aria-hidden="true" />
    </header>
  )
}
