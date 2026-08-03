import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import VercelObservability from '@/components/VercelObservability'

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
        <Footer />
        <VercelObservability />
        <Suspense fallback={null}>
          <AnalyticsProvider
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}
          />
        </Suspense>
      </body>
    </html>
  )
}
