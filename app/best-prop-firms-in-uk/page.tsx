import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'
import { getLandingForRender } from '@/lib/landings'

const SLUG = 'best-prop-firms-in-uk'
export const revalidate = 3600

export function generateMetadata(): Metadata {
  const landing = getLandingForRender(SLUG)!
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: `/${SLUG}` },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      url: `/${SLUG}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: landing.metaTitle,
      description: landing.metaDescription,
    },
  }
}

export default function Page() {
  return <LandingPage landing={getLandingForRender(SLUG)!} />
}
