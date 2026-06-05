import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'
import { getLandingBySlug } from '@/lib/landings'

const SLUG = 'best-futures-prop-firms'
const landing = getLandingBySlug(SLUG)!

export const metadata: Metadata = {
  title: landing.metaTitle,
  description: landing.metaDescription,
  alternates: { canonical: `/${SLUG}` },
  openGraph: {
    title: landing.metaTitle,
    description: landing.metaDescription,
    url: `/${SLUG}`,
    type: 'article',
  },
  twitter: { card: 'summary_large_image', title: landing.metaTitle, description: landing.metaDescription },
}

export default function Page() {
  return <LandingPage landing={landing} />
}
