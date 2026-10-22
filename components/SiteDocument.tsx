/**
 * The <html> document shared by every root layout: the English sections render
 * it with lang="en" (components/EnglishRootLayout.tsx) and app/ru/layout.tsx with
 * lang="ru", so the server HTML of every page carries its real language,
 * crawlers that skip JS included.
 */
import { Suspense } from 'react'
import { jsonLd, organizationSchema, websiteSchema } from '@/lib/schema'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import VercelObservability from '@/components/VercelObservability'
import TableOverflowCue from '@/components/TableOverflowCue'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getAllPosts } from '@/lib/mdx'
import { isNewsletterConfigured } from '@/lib/brevo'
import { buildOutboundRelationships } from '@/lib/outboundDestinations'

export default function SiteDocument({ lang, children }: { lang: 'en' | 'ru'; children: React.ReactNode }) {
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
    <html lang={lang} data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }} suppressHydrationWarning>
        {/* The server already renders the route's language (each locale has its
            own root layout); this keeps it aligned on any client-side transition. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.lang = window.location.pathname.startsWith('/ru') ? 'ru' : 'en';",
          }}
        />
        {/* RSS autodiscovery — hoisted to <head> by React. Placed here (not in
            metadata.alternates) so per-page canonical overrides can't drop it. */}
        <link rel="alternate" type="application/rss+xml" title="Traders Fund Hub — Reviews & Guides" href="/feed.xml" />
        {/* Site-wide entities: one Organization and one WebSite node, referenced by @id
            from Article/Review/WebPage schema on every page (EN and RU). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }} />
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
        <TableOverflowCue />
        <Suspense fallback={null}>
          <AnalyticsProvider
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}
            yandexMetricaId={process.env.NEXT_PUBLIC_YANDEX_METRICA_ID}
            yandexMetricaWebvisor={process.env.NEXT_PUBLIC_YANDEX_METRICA_WEBVISOR === 'true'}
            outboundRelationships={outboundRelationships}
          />
        </Suspense>
      </body>
    </html>
  )
}
