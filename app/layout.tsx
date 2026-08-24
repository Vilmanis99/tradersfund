import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import VercelObservability from '@/components/VercelObservability'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getAllPosts } from '@/lib/mdx'
import { isNewsletterConfigured } from '@/lib/brevo'
import { buildOutboundRelationships } from '@/lib/outboundDestinations'

export const metadata: Metadata = {
  metadataBase: new URL('https://tradersfundhub.com'),
  title: {
    default: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    template: '%s | TFH',
  },
  description: 'Traders Fund Hub is your trusted source for in-depth prop firm reviews, comparisons, and trading education. Find the best prop firm for your needs.',
  keywords: 'prop firms, prop firm reviews, funded trading, FTMO, FundedNext, FundingPips, trading education',
  authors: [{ name: 'Traders Fund Hub' }],
  openGraph: {
    type: 'website',
    siteName: 'Traders Fund Hub',
    url: 'https://tradersfundhub.com',
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Allow full-size image previews (Google Discover + image-rich SERPs)
      // and uncapped text snippets.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const outboundRelationships = buildOutboundRelationships(getAllFirms())
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const pricedChallengeCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0) ||
      (tier.priceEur != null && tier.priceEur > 0)),
  ).length
  const latestCapture = challenges.map(challenge => challenge.sourceCapturedAt).sort().at(-1)
  const posts = getAllPosts()

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }} suppressHydrationWarning>
        {/* RSS autodiscovery — hoisted to <head> by React. Placed here (not in
            metadata.alternates) so per-page canonical overrides can't drop it. */}
        <link rel="alternate" type="application/rss+xml" title="Traders Fund Hub — Reviews & Guides" href="/feed.xml" />
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer
          firmCount={firms.length}
          pricedChallengeCount={pricedChallengeCount}
          articleCount={posts.length}
          latestCapture={latestCapture}
          newsletterEnabled={isNewsletterConfigured()}
        />
        <VercelObservability />
        <Suspense fallback={null}>
          <AnalyticsProvider
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}
            outboundRelationships={outboundRelationships}
          />
        </Suspense>
      </body>
    </html>
  )
}
