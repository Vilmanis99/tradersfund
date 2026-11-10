import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CountryRoutePage, countryMetadata } from '@/lib/countryRoute'
import { getCountryByRuSegment } from '@/lib/countryPages'

// Unknown /ru/* URLs land here so they render app/ru/not-found.tsx (Russian
// copy, lang="ru" from app/ru/layout.tsx) with HTTP 404. Real Russian routes
// are static segments and always win over this catch-all. The (fallback) route
// group keeps this file out of scans of app/ru/<slug>/page.tsx.
// Render per request so arbitrary unknown /ru/* paths never enter the ISR cache.
export const dynamic = 'force-dynamic'

// Evidence-only RU country pages (lib/countryPages.ts): a single segment equal to
// luchshie-prop-firmy-<ruInfix|v>-<ruSlug> from a country evidence file renders the
// country template (noindex until its gate passes); everything else still 404s.
interface Props { params: Promise<{ missing: string[] }> }

function countryFor(missing: string[]) {
  return missing.length === 1 ? getCountryByRuSegment(missing[0]) : undefined
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = countryFor((await params).missing)
  return country ? countryMetadata(country.slug, 'ru') : {}
}

export default async function RussianMissingPage({ params }: Props) {
  const country = countryFor((await params).missing)
  if (!country) notFound()
  return CountryRoutePage(country.slug, 'ru')
}
