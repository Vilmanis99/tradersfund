import MobileStickyCTA from './MobileStickyCTA'
import { getAllFirms } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { compareRussianRanking } from '@/lib/russianRanking'

/**
 * Sticky mobile sign-up bar for /ru reviews and comparisons (spec C13/C2 mobile).
 * Takes the page's firms (slugs or names); only firms in firms.json get a bar,
 * so Era Trade, KasCapital, PropLive and TeamTraders (no CTA yet) render nothing.
 * With two firms the existing RU ranking decides which one the bar shows:
 * active pin (BrightFunded while open to Russia), then russiaStatus, score, name.
 */
export default function RuMobileStickyCTA({ firms, from }: { firms: string[]; from: string }) {
  const all = getAllFirms()
  const candidates = firms
    .map(key => all.find(firm => firmSlug(firm.name) === key || firm.name === key))
    .filter((firm): firm is NonNullable<typeof firm> => Boolean(firm))
    .map(firm => ({ firm, slug: firmSlug(firm.name) }))
  if (!candidates.length) return null
  const [top] = [...candidates].sort((a, b) => compareRussianRanking(
    { slug: a.slug, name: a.firm.name, score: a.firm.score },
    { slug: b.slug, name: b.firm.name, score: b.firm.score },
    slug => russiaStatusFor(slug),
  ))
  return (
    <MobileStickyCTA
      locale="ru"
      name={top.firm.name}
      logo={top.firm.logo}
      score={top.firm.score}
      affiliateUrl={top.firm.affiliateUrl || undefined}
      affiliateSlug={top.slug}
      russiaStatus={russiaStatusFor(top.slug)}
      from={from}
    />
  )
}
