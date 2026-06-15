import { MetadataRoute } from 'next'
import { getAllPosts, getAllPages } from '@/lib/mdx'
import { getAllFirms } from '@/lib/firms'
import { FEATURES } from '@/lib/features'
import { getAllCanonicalPairs } from '@/lib/comparisons'
import { LANDINGS } from '@/lib/landings'
import { AUTHORS } from '@/lib/authors'
import { getAllDeals } from '@/lib/deals'

const BASE_URL = 'https://tradersfundhub.com'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const pages = getAllPages()
  const firms = getAllFirms()

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

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: firmsLastDate, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(blogLastModified), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/main-table`, lastModified: firmsLastDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/prop-firm-discount-codes`, lastModified: dealsLastDate, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/prop-firms`, lastModified: firmsLastDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/compare`, lastModified: firmsLastDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: new Date('2026-01-01'), changeFrequency: 'yearly', priority: 0.4 },
  ]

  const featureRoutes: MetadataRoute.Sitemap = FEATURES.map(f => ({
    url: `${BASE_URL}/prop-firms/${f.slug}`,
    lastModified: firmsLastDate,
    changeFrequency: 'weekly',
    priority: 0.75,
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
    lastModified: firmsLastDate,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // Per-comparison: lastmod = max(firmA.lastUpdated, firmB.lastUpdated).
  // Means we only bump the URL when the underlying data changed.
  const compareRoutes: MetadataRoute.Sitemap = getAllCanonicalPairs().map(p => {
    const [aSlug, bSlug] = p.matchup.split('-vs-')
    const aDate = firmDateBySlug.get(aSlug)
    const bDate = firmDateBySlug.get(bSlug)
    const latest = aDate && bDate
      ? (aDate > bDate ? aDate : bDate)
      : (aDate || bDate || firmsLastDate)
    return {
      url: `${BASE_URL}/compare/${p.matchup}`,
      lastModified: latest,
      changeFrequency: 'monthly',
      priority: 0.7,
    }
  })

  const postRoutes: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.modified || post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Keep in sync with RESERVED in app/[slug]/page.tsx and the staticRoutes above.
  // `home` is rendered as `/`, `blog`/`main-table`/`prop-firms` have dedicated
  // routes, `contact` is custom-handled in [slug]/page.tsx but still needs to
  // appear in the sitemap — added via staticRoutes instead to avoid double-emission.
  const SKIP = new Set(['home', 'blog', 'main-table', 'prop-firms', 'compare', 'contact'])

  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter(p => !SKIP.has(p.slug))
    .map(page => ({
      url: `${BASE_URL}/${page.slug}`,
      lastModified: new Date(page.date),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [
    ...staticRoutes,
    ...featureRoutes,
    ...landingRoutes,
    ...authorRoutes,
    ...compareRoutes,
    ...postRoutes,
    ...pageRoutes,
  ]
}
