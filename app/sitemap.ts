import { MetadataRoute } from 'next'
import { getAllPosts, getAllPages, getAllCategories, getPostsByCategory } from '@/lib/mdx'
import { getAllChallenges, getAllFirms } from '@/lib/firms'
import { FEATURES } from '@/lib/features'
import { getAllCanonicalPairs, COMPARISON_EDITORIAL_DATE } from '@/lib/comparisons'
import { LANDINGS, buildLandingPayload } from '@/lib/landings'
import { buildIndiaMatcherFirms } from '@/lib/indiaMatcher'
import { AUTHORS } from '@/lib/authors'
import { getAllDeals } from '@/lib/deals'
import { INDIA_EVIDENCE } from '@/lib/india'
import { INDIA_MATCHUPS, indiaMatchupPath } from '@/lib/indiaMatchups'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { isSourceHoldReview, isSourceHoldFirm } from '@/lib/reviewStatus'
import {
  LOCALIZED_ROUTE_PAIRS,
  RUSSIAN_ONLY_ROUTES,
  getLocalizedRoutePair,
  russianRouteLastModified,
} from '@/lib/localizedRoutes'
import russianMarketEvidence from '@/content/data/russian-market-evidence.json'
import russianDiasporaEvidence from '@/content/data/russian-diaspora-evidence.json'
import russianCTraderEvidence from '@/content/data/russian-ctrader-evidence.json'
import russianFundedNextInstantEvidence from '@/content/data/russian-fundednext-instant-evidence.json'
import russianFundedNextMt5Evidence from '@/content/data/russian-fundednext-mt5-evidence.json'
import russianForexEvidence from '@/content/data/russian-forex-evidence.json'
import russianTeamTradersEvidence from '@/content/data/russian-teamtraders-evidence.json'

const BASE_URL = 'https://tradersfundhub.com'
const HOME_EDITORIAL_DATE = '2026-09-14'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const pages = getAllPages()
  const firms = getAllFirms()
  const challenges = getAllChallenges()

  // The most recent firm-data update — used as a defensible lastmod for
  // every route that's a function of `firms.json` (home, main-table,
  // /prop-firms hub, etc.). Avoids the "every deploy bumps every URL"
  // problem that makes Google deprioritise the sitemap.
  const firmsLastModified = firms
    .map(f => f.lastUpdated)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1) || new Date().toISOString()
  const firmsLastDate = new Date(firmsLastModified)

  // For each firm, the latest "lastUpdated" date keyed by slug — used to
  // lastmod compare/<a>-vs-<b> pages (the more recent of the two firms wins).
  const firmDateBySlug = new Map<string, Date>()
  firms.forEach(f => {
    if (f.lastUpdated) firmDateBySlug.set(slugify(f.name), new Date(f.lastUpdated))
  })

  // Latest post mtime for /blog list lastmod.
  const blogLastModified = posts
    .map(p => p.modified || p.date)
    .filter(Boolean)
    .sort()
    .at(-1) || new Date().toISOString()

  // Deals hub lastmod tracks the newest verified-deal date (a custom route,
  // so it must be listed here — it is neither an MDX page nor a LANDING).
  const dealsLastModified = getAllDeals()
    .map(d => d.verifiedOn)
    .filter(Boolean)
    .sort()
    .at(-1) || firmsLastModified
  const dealsLastDate = new Date(dealsLastModified)
  const indiaEvidenceLastModified = INDIA_EVIDENCE
    .map(entry => entry.capturedAt)
    .sort()
    .at(-1) || firmsLastModified
  const indiaEvidenceLastDate = new Date(indiaEvidenceLastModified)
  const challengeLastModified = [
    ...challenges.map(challenge => challenge.sourceCapturedAt),
    ...getChallengeWatchEntries().map(entry => entry.lastCheckedAt),
  ].sort().at(-1) || firmsLastModified
  const challengeLastDate = new Date(challengeLastModified)
  const challengeComparisonLastDate = new Date(Math.max(
    challengeLastDate.getTime(),
    firmsLastDate.getTime(),
  ))
  const indiaMatchupLastDate = new Date(Math.max(
    indiaEvidenceLastDate.getTime(),
    challengeComparisonLastDate.getTime(),
  ))
  const comparisonTemplateLastDate = new Date(COMPARISON_EDITORIAL_DATE)
  const comparisonHubLastDate = new Date(Math.max(challengeComparisonLastDate.getTime(), comparisonTemplateLastDate.getTime()))

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(Math.max(new Date(HOME_EDITORIAL_DATE).getTime(), challengeComparisonLastDate.getTime())), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(blogLastModified), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/prop-firm-discount-codes`, lastModified: dealsLastDate, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/best-prop-firms-in-india/compare`, lastModified: indiaMatchupLastDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/best-prop-firms-in-india/challenge-changes`, lastModified: indiaMatchupLastDate, changeFrequency: 'weekly', priority: 0.92 },
    { url: `${BASE_URL}/best-prop-firms-in-india/challenge-comparison`, lastModified: indiaMatchupLastDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/best-prop-firms-in-india/payout-methods`, lastModified: indiaEvidenceLastDate, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/prop-firm-challenges`, lastModified: challengeComparisonLastDate, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/prop-firm-challenge-changes`, lastModified: challengeLastDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/prop-firms`, lastModified: firmsLastDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/compare`, lastModified: comparisonHubLastDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: new Date('2026-01-01'), changeFrequency: 'yearly', priority: 0.4 },
  ]

  const featureRoutes: MetadataRoute.Sitemap = FEATURES.map(f => {
    const reviewedAt = new Date(`${f.lastReviewed}T00:00:00Z`)
    return {
      url: `${BASE_URL}/prop-firms/${f.slug}`,
      lastModified: new Date(Math.max(firmsLastDate.getTime(), reviewedAt.getTime())),
      changeFrequency: 'weekly',
      priority: 0.75,
    }
  })
  const indiaLanding = LANDINGS.find(landing => landing.slug === 'best-prop-firms-in-india')
  const indiaEligibleFirmSlugs = new Set(
    indiaLanding
      ? buildIndiaMatcherFirms(
          buildLandingPayload(indiaLanding).ranked.map(entry => entry.firm),
        ).map(firm => firm.slug)
      : [],
  )
  const indiaMatchupRoutes: MetadataRoute.Sitemap = Object.values(INDIA_MATCHUPS)
    .filter(matchup => matchup.firmSlugs.every(slug => indiaEligibleFirmSlugs.has(slug)))
    .map(matchup => ({
      url: `${BASE_URL}${indiaMatchupPath(matchup)}`,
      lastModified: indiaMatchupLastDate,
      changeFrequency: 'weekly' as const,
      priority: 0.88,
    }))

  // Long-tail landings: /best-prop-firms-in-uk, /cheapest-prop-firms, etc.
  // These are data-driven, so lastmod tracks firms.json freshness.
  const landingRoutes: MetadataRoute.Sitemap = LANDINGS.map(l => ({
    url: `${BASE_URL}/${l.slug}`,
    lastModified: firmsLastDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // E-E-A-T: bio pages are explicitly indexable so Google can attribute
  // YMYL content (prop-firm reviews) to a named person.
  const authorRoutes: MetadataRoute.Sitemap = AUTHORS.map(a => ({
    url: `${BASE_URL}/authors/${a.slug}`,
    lastModified: a.updatedAt ? new Date(a.updatedAt) : firmsLastDate,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // Preserve existing URLs; substantive template edits and the pair's own
  // source captures can update lastmod. Never use the current request date.
  const compareRoutes: MetadataRoute.Sitemap = getAllCanonicalPairs()
    .filter(p => {
      const [aSlug, bSlug] = p.matchup.split('-vs-')
      return !isSourceHoldFirm(aSlug) && !isSourceHoldFirm(bSlug)
    })
    .map(p => {
    const [aSlug, bSlug] = p.matchup.split('-vs-')
    const aDate = firmDateBySlug.get(aSlug)
    const bDate = firmDateBySlug.get(bSlug)
    const latest = aDate && bDate
      ? (aDate > bDate ? aDate : bDate)
      : (aDate || bDate || firmsLastDate)
    return {
      url: `${BASE_URL}/compare/${p.matchup}`,
      lastModified: new Date(Math.max(latest.getTime(), comparisonTemplateLastDate.getTime(),
        ...challenges.filter(product => [aSlug, bSlug].includes(product.firmSlug))
          .map(product => new Date(product.sourceCapturedAt).getTime()).filter(Number.isFinite))),
      changeFrequency: 'monthly',
      priority: 0.7,
    }
    })

  // Category archives are prerendered (app/category/[slug]) and Google is
  // already crawling them, but they were missing from the sitemap entirely —
  // so they were only discoverable via in-page links. lastmod tracks the
  // newest post in each category rather than a global date.
  const categoryRoutes: MetadataRoute.Sitemap = getAllCategories().map(cat => {
    const catPosts = getPostsByCategory(cat)
    const latest = catPosts
      .map(p => p.modified || p.date)
      .filter(Boolean)
      .sort()
      .at(-1) || blogLastModified
    return {
      url: `${BASE_URL}/category/${cat.toLowerCase().replace(/\s+/g, '-')}`,
      lastModified: new Date(latest),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }
  })

  const postRoutes: MetadataRoute.Sitemap = posts
    .filter(post => !isSourceHoldReview(post.slug))
    .map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.modified || post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
    }))

  // Keep in sync with RESERVED in app/[slug]/page.tsx and the staticRoutes above.
  // `home` is rendered as `/`, `blog`/`main-table`/`prop-firms` have dedicated
  // routes, `contact` is custom-handled in [slug]/page.tsx but still needs to
  // appear in the sitemap — added via staticRoutes instead to avoid double-emission.
  const SKIP = new Set([
    'home',
    'blog',
    'main-table',
    'prop-firms',
    'prop-firm-challenges',
    'prop-firm-challenge-changes',
    'compare',
    'contact',
    'ftmo-overview',
    'fundednext-overview',
    'fundingpips-overview',
    'e8-markets-overview',
  ])

  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter(p => !SKIP.has(p.slug))
    .map(page => ({
      url: `${BASE_URL}/${page.slug}`,
      lastModified: new Date(page.modified || page.date),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  const baseRoutes: MetadataRoute.Sitemap = [
    ...staticRoutes,
    ...featureRoutes,
    ...indiaMatchupRoutes,
    ...landingRoutes,
    ...authorRoutes,
    ...compareRoutes,
    ...categoryRoutes,
    ...postRoutes,
    ...pageRoutes,
  ]

  const fundedNextLastModified = firms.find(firm => firm.name === 'FundedNext')?.lastUpdated
  const russianChallengeLastModified = (...firmSlugs: string[]) => {
    const capturedAt = challenges
      .filter(challenge => firmSlugs.includes(challenge.firmSlug))
      .map(challenge => challenge.sourceCapturedAt)
      .sort()
      .at(-1)
    return new Date(capturedAt || challengeLastModified)
  }
  const russianDataLastModified = new Map<string, Date>([
    ['/ru', challengeComparisonLastDate],
    ['/ru/luchshie-prop-firmy', challengeComparisonLastDate],
    ['/ru/obzor-fundednext', new Date(fundedNextLastModified || challengeLastModified)],
    ['/ru/obzor-fundingpips', russianChallengeLastModified('fundingpips')],
    [
      '/ru/fundednext-vs-fundingpips',
      russianChallengeLastModified('fundednext', 'fundingpips'),
    ],
    ['/ru/prop-firmy-bez-chelendzha', russianChallengeLastModified('fundednext', 'fundingpips', 'tradeify', 'lucid-trading', 'alpha-capital', 'city-traders-imperium', 'maven', 'crypto-fund-trader', 'fxify')],
  ])
  const russianRoutes: MetadataRoute.Sitemap = LOCALIZED_ROUTE_PAIRS.map(pair => ({
    url: `${BASE_URL}${pair.ru}`,
    lastModified: russianRouteLastModified(
      pair.ru,
      russianDataLastModified.get(pair.ru),
    ),
    changeFrequency: 'weekly',
    priority: pair.ru === '/ru' ? 0.85 : 0.8,
  }))
  const russianOnlyRoutes: MetadataRoute.Sitemap = RUSSIAN_ONLY_ROUTES.map(path => {
    const evidenceLastModified = new Date(
      path === '/ru/dlya-russkoyazychnykh-treyderov'
        ? russianDiasporaEvidence.capturedAt
        : path === '/ru/forex-prop-firmy'
        ? russianForexEvidence.capturedAt
        : path === '/ru/prop-firmy-s-ctrader'
          ? russianCTraderEvidence.capturedAt
        : path === '/ru/fundednext-mt5'
          ? russianFundedNextMt5Evidence.capturedAt
        : path === '/ru/fundednext-stellar-instant'
          ? russianFundedNextInstantEvidence.capturedAt
        : path === '/ru/obzor-teamtraders'
          ? russianTeamTradersEvidence.capturedAt
          : russianMarketEvidence.capturedAt,
    )

    return {
      url: `${BASE_URL}${path}`,
      lastModified: russianRouteLastModified(
        path,
        russianDataLastModified.get(path) ?? evidenceLastModified,
      ),
      changeFrequency: 'monthly',
      priority: 0.78,
    }
  })

  // A few localized routes are also represented by an MDX page (for example
  // the Russian no-challenge guide). Keep one sitemap entry per URL and use
  // the newest defensible last-modified value when two sources overlap.
  const uniqueRoutes = new Map<string, MetadataRoute.Sitemap[number]>()
  for (const route of [...baseRoutes, ...russianRoutes, ...russianOnlyRoutes]) {
    const current = uniqueRoutes.get(route.url)
    if (!current) {
      uniqueRoutes.set(route.url, route)
      continue
    }

    const toTimestamp = (value: MetadataRoute.Sitemap[number]['lastModified']) => {
      if (!value) return 0
      if (value instanceof Date) return value.getTime()
      return new Date(value).getTime()
    }
    if (toTimestamp(route.lastModified) > toTimestamp(current.lastModified)) {
      uniqueRoutes.set(route.url, route)
    }
  }

  return [...uniqueRoutes.values()].map(route => {
    const pair = getLocalizedRoutePair(new URL(route.url).pathname)
    if (!pair) return route

    return {
      ...route,
      alternates: {
        languages: {
          en: `${BASE_URL}${pair.en}`,
          ru: `${BASE_URL}${pair.ru}`,
          'x-default': `${BASE_URL}${pair.en}`,
        },
      },
    }
  })
}
