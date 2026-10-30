import { MetadataRoute } from 'next'
import { getAllPosts, getAllPages, getAllCategories, getPostsByCategory } from '@/lib/mdx'
import { getAllFirms } from '@/lib/firms'
import { FEATURES, getFirmsForFeature } from '@/lib/features'
import { getAllCanonicalPairs, COMPARISON_EDITORIAL_DATE } from '@/lib/comparisons'
import { LANDINGS, buildLandingPayload } from '@/lib/landings'
import { buildIndiaMatcherFirms } from '@/lib/indiaMatcher'
import { AUTHORS } from '@/lib/authors'
import { INDIA_MATCHUPS, indiaMatchupPath } from '@/lib/indiaMatchups'
import { latestCorrectionDate } from '@/lib/corrections'
import { HOW_WE_MAKE_MONEY_UPDATED } from '@/lib/trustPages'
import { CLOSED_FIRMS_PUBLISHED, closedFirmsRoutePair } from '@/lib/closedFirms'
import { isSourceHoldReview, isSourceHoldFirm } from '@/lib/reviewStatus'
import {
  LOCALIZED_ROUTE_PAIRS,
  RUSSIAN_ROUTE_EDITORIAL_DATES,
  RUSSIAN_ONLY_ROUTES,
  RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES,
  RU_CLOSED_FIRMS_EDITORIAL_DATE,
  RU_CLOSED_FIRMS_PATH,
  getLocalizedRoutePair,
} from '@/lib/localizedRoutes'
import { publishedRussianPlannedRoutes } from '@/lib/russianPlannedRoutes'
import { getRulesPageModels, rulesRoutePair } from '@/lib/rulesPages'
import { RUSSIAN_ROUTE_EXTRA_EDITORIAL } from '@/lib/russianRouteLastmod'
import { fileSource, firmSources, firmListingOnlySources, landingFirmChallengeSources, russianRouteSources as russianSources, sitemapLastmod, SPLIT_TIER_SOURCES } from '@/lib/sitemapLastmod'

const BASE_URL = 'https://tradersfundhub.com'
const HOME_EDITORIAL_DATE = '2026-09-14'
const CONTACT_EDITORIAL_DATE = '2026-01-01'
const data = (name: string) => fileSource(`content/data/${name}`)

/**
 * lastmod per URL = newest real change among the sources that render it (lib/sitemapLastmod.ts):
 * editorial dates written by people plus the commit dates where the rendered data last changed
 * (content/data/sitemap-lastmod.json). Capture/re-check dates and the clock are never used.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const pages = getAllPages()
  const firms = getAllFirms()
  const firmSlugs = firms.map(firm => firm.name)
  const allFirms = (surface: 'en' | 'ru' | 'compare' | 'listing') => firmSlugs.flatMap(name => firmSources(name, surface))
  const lm = sitemapLastmod

  // Review posts also render their firm's data and the writer's verdict copy.
  const reviewFirmBySlug = new Map<string, string>()
  for (const firm of firms) {
    const match = /^\/blog\/([^/?#]+)/.exec(firm.reviewUrl ?? '')
    if (match) reviewFirmBySlug.set(match[1], firm.name)
  }
  // Posts: the writer's frontmatter `modified` (else `date`) dates the article itself; the file's
  // git date is used only when the frontmatter has no `modified`.
  const postSources = (slug: string, hasModified: boolean) => {
    const firm = reviewFirmBySlug.get(slug)
    return [
      ...(hasModified ? [] : [fileSource(`content/posts/${slug}.md`)]),
      ...(firm ? [...firmSources(firm, 'en'), `copy:reviews:${slug}`] : []),
    ]
  }
  const postRouteList = posts.filter(post => !isSourceHoldReview(post.slug))
  const postLastmod = new Map(postRouteList.map(post => [
    post.slug,
    lm(`${BASE_URL}/blog/${post.slug}`, post.date, postSources(post.slug, Boolean(post.modified)), [post.modified]),
  ]))
  const newest = (dates: Date[]) => dates.map(d => d.toISOString().slice(0, 10)).sort().at(-1)
  const oldestPostDate = posts.map(post => post.date).filter(Boolean).sort()[0]

  const indiaLanding = LANDINGS.find(landing => landing.slug === 'best-prop-firms-in-india')
  const indiaFirms = indiaLanding
    ? buildIndiaMatcherFirms(buildLandingPayload(indiaLanding).ranked.map(entry => entry.firm))
    : []
  const indiaEligibleFirmSlugs = new Set(indiaFirms.map(firm => firm.slug))
  const indiaSources = [data('india-evidence.json'), ...[...indiaEligibleFirmSlugs].flatMap(slug => firmSources(slug, 'landing'))]
  const indiaCompareSources = [data('india-evidence.json'), ...[...indiaEligibleFirmSlugs].flatMap(slug => firmSources(slug, 'compare'))]

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: lm(BASE_URL, HOME_EDITORIAL_DATE, [...allFirms('en'), ...SPLIT_TIER_SOURCES]), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified: lm(`${BASE_URL}/blog`, oldestPostDate, [], [newest([...postLastmod.values()])]), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/prop-firm-discount-codes`, lastModified: lm(`${BASE_URL}/prop-firm-discount-codes`, null, [data('deals.json')]), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/best-prop-firms-in-india/compare`, lastModified: lm(`${BASE_URL}/best-prop-firms-in-india/compare`, null, indiaSources), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/best-prop-firms-in-india/challenge-changes`, lastModified: lm(`${BASE_URL}/best-prop-firms-in-india/challenge-changes`, null, [...indiaSources, data('challenge-watch.json')]), changeFrequency: 'weekly', priority: 0.92 },
    { url: `${BASE_URL}/best-prop-firms-in-india/challenge-comparison`, lastModified: lm(`${BASE_URL}/best-prop-firms-in-india/challenge-comparison`, null, indiaCompareSources), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/best-prop-firms-in-india/payout-methods`, lastModified: lm(`${BASE_URL}/best-prop-firms-in-india/payout-methods`, null, [data('india-evidence.json')]), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/prop-firm-challenges`, lastModified: lm(`${BASE_URL}/prop-firm-challenges`, null, [...allFirms('en'), ...SPLIT_TIER_SOURCES]), changeFrequency: 'weekly', priority: 0.95 },
    { url: `${BASE_URL}/prop-firm-challenge-changes`, lastModified: lm(`${BASE_URL}/prop-firm-challenge-changes`, null, [data('challenge-watch.json')]), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/prop-firms`, lastModified: lm(`${BASE_URL}/prop-firms`, null, allFirms('en')), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/compare`, lastModified: lm(`${BASE_URL}/compare`, COMPARISON_EDITORIAL_DATE, [...allFirms('compare'), ...SPLIT_TIER_SOURCES]), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: lm(`${BASE_URL}/contact`, CONTACT_EDITORIAL_DATE, []), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/how-we-make-money`, lastModified: lm(`${BASE_URL}/how-we-make-money`, HOW_WE_MAKE_MONEY_UPDATED, []), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/corrections`, lastModified: lm(`${BASE_URL}/corrections`, HOW_WE_MAKE_MONEY_UPDATED, [data('corrections.json')], [latestCorrectionDate()]), changeFrequency: 'weekly', priority: 0.5 },
    // /prop-firms/closed joins the sitemap only once content/data/closed-firms.json is published.
    ...(CLOSED_FIRMS_PUBLISHED
      ? [{ url: `${BASE_URL}/prop-firms/closed`, lastModified: lm(`${BASE_URL}/prop-firms/closed`, null, [data('closed-firms.json')]), changeFrequency: 'monthly' as const, priority: 0.5 }]
      : []),
  ]

  // Listing surface: rule flags only (no Trustpilot). Split-tier UI dates pages that render tiers.
  const featureRoutes: MetadataRoute.Sitemap = FEATURES.map(f => {
    const featureSources = f.slug === 'crypto-payouts'
      ? getFirmsForFeature(f.slug).flatMap(firm => firmListingOnlySources(firm.name))
      : [...allFirms('listing'), ...SPLIT_TIER_SOURCES]
    return {
      url: `${BASE_URL}/prop-firms/${f.slug}`,
      lastModified: lm(
        `${BASE_URL}/prop-firms/${f.slug}`,
        null,
        featureSources,
        [f.lastReviewed],
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }
  })
  const indiaMatchupRoutes: MetadataRoute.Sitemap = Object.values(INDIA_MATCHUPS)
    .filter(matchup => matchup.firmSlugs.every(slug => indiaEligibleFirmSlugs.has(slug)))
    .map(matchup => ({
      url: `${BASE_URL}${indiaMatchupPath(matchup)}`,
      lastModified: lm(
        `${BASE_URL}${indiaMatchupPath(matchup)}`,
        null,
        [data('india-evidence.json'), ...matchup.firmSlugs.flatMap(slug => firmSources(slug, 'compare'))],
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.88,
    }))

  // Long-tail landings: the firms each one ranks, plus its own evidence file.
  const LANDING_EVIDENCE: Record<string, string> = {
    'best-prop-firms-in-uk': 'uk-access-evidence.json',
    'best-prop-firms-in-us': 'us-access-evidence.json',
    'best-crypto-prop-firms': 'crypto-market-evidence.json',
    'best-prop-firms-in-india': 'india-evidence.json',
  }
  const landingRoutes: MetadataRoute.Sitemap = LANDINGS.map(l => {
    const ranked = buildLandingPayload(l).ranked
    const firmChallengeSources = [
      ...new Set(
        ranked.flatMap(entry =>
          landingFirmChallengeSources(entry.firm.name, entry.lastmodProductSlugs),
        ),
      ),
    ]
    const evidence = LANDING_EVIDENCE[l.slug]
    return {
      url: `${BASE_URL}/${l.slug}`,
      lastModified: lm(
        `${BASE_URL}/${l.slug}`,
        null,
        [...firmChallengeSources, ...(evidence ? [data(evidence)] : [])],
        [l.lastReviewed],
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  // Bio pages: the registry's own updatedAt (lib/authors.ts has no data file to date).
  const authorRoutes: MetadataRoute.Sitemap = AUTHORS.map(a => ({
    url: `${BASE_URL}/authors/${a.slug}`,
    lastModified: lm(`${BASE_URL}/authors/${a.slug}`, a.updatedAt ?? HOME_EDITORIAL_DATE, []),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // A pair page changes when the template's editorial date, either firm's compare-visible data
  // or the pair's writer copy changes; other firms' releases leave it alone.
  const compareRoutes: MetadataRoute.Sitemap = getAllCanonicalPairs()
    .filter(p => {
      const [aSlug, bSlug] = p.matchup.split('-vs-')
      return !isSourceHoldFirm(aSlug) && !isSourceHoldFirm(bSlug)
    })
    .map(p => {
      const [aSlug, bSlug] = p.matchup.split('-vs-')
      return {
        url: `${BASE_URL}/compare/${p.matchup}`,
        lastModified: lm(
          `${BASE_URL}/compare/${p.matchup}`,
          COMPARISON_EDITORIAL_DATE,
          [...firmSources(aSlug, 'compare'), ...firmSources(bSlug, 'compare'), `copy:compares:${p.matchup}`],
        ),
        changeFrequency: 'monthly',
        priority: 0.7,
      }
    })

  // Category archives: normally the newest post lastmod in the category.
  // /category/prop-firms is special-cased: BlogCard prints title, excerpt and published
  // date only, so inheriting each post's sitemap lastmod (firm data / body edits)
  // over-dated it when OFP's modified bumped while the listing cards stayed identical.
  const categoryRoutes: MetadataRoute.Sitemap = getAllCategories().map(cat => {
    const catPosts = getPostsByCategory(cat)
    const catUrl = `${BASE_URL}/category/${cat.toLowerCase().replace(/\s+/g, '-')}`
    const propFirmsListing = cat.toLowerCase().replace(/\s+/g, '-') === 'prop-firms'
    const editorial = propFirmsListing
      ? [newest(catPosts.map(p => p.date).filter(Boolean).map(d => new Date(`${String(d).slice(0, 10)}T00:00:00Z`)))]
      : [newest(catPosts.flatMap(p => postLastmod.get(p.slug) ?? []))]
    return {
      url: catUrl,
      lastModified: lm(
        catUrl,
        catPosts.map(p => p.date).filter(Boolean).sort()[0],
        [],
        editorial,
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }
  })

  const postRoutes: MetadataRoute.Sitemap = postRouteList.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: postLastmod.get(post.slug)!,
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
      lastModified: lm(`${BASE_URL}/${page.slug}`, page.date, page.modified ? [] : [fileSource(`content/pages/${page.slug}.md`)], [page.modified]),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  // Rules pages (lib/rulesPages.ts): only data-complete, sourced and fresh pages are listed.
  const rulesModels = getRulesPageModels()
  const rulesRoutes: MetadataRoute.Sitemap = rulesModels
    .filter(model => model.en.indexable)
    .map(model => ({
      url: `${BASE_URL}${model.en.path}`,
      lastModified: lm(
        `${BASE_URL}${model.en.path}`,
        null,
        [...firmSources(model.slug, 'en'), fileSource(`content/verdicts/rules/${model.slug}.md`)],
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  const nonIndexableRulesPaths = new Set(rulesModels.flatMap(model => [
    ...(model.en.indexable ? [] : [model.en.path]),
    // Template twins and hand-written RU rules pages alike (hand-written ones are also in RUSSIAN_ONLY_ROUTES).
    ...(model.ru && !model.ru.indexable ? [model.ru.path] : []),
  ]))

  const baseRoutes: MetadataRoute.Sitemap = [
    ...staticRoutes,
    ...rulesRoutes,
    ...featureRoutes,
    ...indiaMatchupRoutes,
    ...landingRoutes,
    ...authorRoutes,
    ...compareRoutes,
    ...categoryRoutes,
    ...postRoutes,
    ...pageRoutes,
  ]

  const russianEditorial = (path: string) => RUSSIAN_ROUTE_EXTRA_EDITORIAL[path] ?? []
  const russianRoutes: MetadataRoute.Sitemap = LOCALIZED_ROUTE_PAIRS.map(pair => ({
    url: `${BASE_URL}${pair.ru}`,
    lastModified: lm(`${BASE_URL}${pair.ru}`, RUSSIAN_ROUTE_EDITORIAL_DATES[pair.ru], russianSources(pair.ru), russianEditorial(pair.ru)),
    changeFrequency: 'weekly',
    priority: pair.ru === '/ru' ? 0.85 : 0.8,
  }))
  const russianOnlyRoutes: MetadataRoute.Sitemap = RUSSIAN_ONLY_ROUTES.map(path => ({
    url: `${BASE_URL}${path}`,
    lastModified: lm(`${BASE_URL}${path}`, RUSSIAN_ROUTE_EDITORIAL_DATES[path], russianSources(path), russianEditorial(path)),
    changeFrequency: 'monthly',
    priority: 0.78,
  }))

  // A few localized routes are also represented by an MDX page (for example
  // the Russian no-challenge guide). Keep one sitemap entry per URL and use
  // the newest defensible last-modified value when two sources overlap.
  // Planned RU routes (lib/localizedRoutes.ts) enter the sitemap only once
  // their page file exists, so reserved slugs never publish an empty URL.
  const russianPlannedRoutes: MetadataRoute.Sitemap = publishedRussianPlannedRoutes().flatMap(path => {
    const editorialDate = RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES[path]
    return editorialDate ? [{
      url: `${BASE_URL}${path}`,
      lastModified: lm(`${BASE_URL}${path}`, editorialDate, russianSources(path)),
      changeFrequency: 'monthly' as const,
      priority: 0.78,
    }] : []
  })

  // RU closed-firms page: same publish flag as /prop-firms/closed (lib/closedFirms.ts).
  const russianClosedFirmsRoutes: MetadataRoute.Sitemap = CLOSED_FIRMS_PUBLISHED
    ? [{
        url: `${BASE_URL}${RU_CLOSED_FIRMS_PATH}`,
        lastModified: lm(
          `${BASE_URL}${RU_CLOSED_FIRMS_PATH}`,
          RU_CLOSED_FIRMS_EDITORIAL_DATE,
          russianSources(RU_CLOSED_FIRMS_PATH),
        ),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }]
    : []

  const uniqueRoutes = new Map<string, MetadataRoute.Sitemap[number]>()
  for (const route of [...baseRoutes, ...russianRoutes, ...russianOnlyRoutes, ...russianPlannedRoutes, ...russianClosedFirmsRoutes]) {
    // A noindex rules page never enters the sitemap, even if its RU path gets registered early.
    if (nonIndexableRulesPaths.has(new URL(route.url).pathname)) continue
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
    const pathname = new URL(route.url).pathname
    const routePair = getLocalizedRoutePair(pathname) ?? closedFirmsRoutePair(pathname) ?? rulesRoutePair(pathname)
    if (!routePair) return route
    // The home page canonical renders without a trailing slash, so its alternates must too.
    const pair = { en: routePair.en === '/' ? '' : routePair.en, ru: routePair.ru }

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
