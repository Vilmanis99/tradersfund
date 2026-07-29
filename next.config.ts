import type { NextConfig } from 'next'
import { getAllPosts, getAllPages } from './lib/mdx'

/**
 * WordPress legacy: every blog post used to live at the site root
 * (`tradersfundhub.com/fx-replay-review`). The Next.js redesign moved
 * them all under `/blog/<slug>`. Without 301s, Google's indexed entries
 * 404 and we lose every long-tail ranking we built up.
 *
 * Strategy: for every post whose slug doesn't collide with an explicit
 * Next.js route or a `content/pages/` slug, emit a permanent (308 ≈ 301)
 * redirect from `/<slug>` to `/blog/<slug>`.
 */
async function postRedirects() {
  const posts = getAllPosts()
  const pageSlugs = new Set(getAllPages().map(p => p.slug))

  // Reserved = anything Next.js renders directly at a top-level path. If a
  // post slug collides with one of these, the redirect would steal the
  // dedicated route — explicitly exclude.
  const reservedSlugs = new Set([
    'blog', 'main-table', 'prop-firms', 'compare', 'go', 'api',
    'authors', 'category',
    'best-prop-firms-in-uk',
    'best-prop-firms-in-us',
    'cheapest-prop-firms',
    'best-instant-funding-prop-firms',
    'best-futures-prop-firms',
  ])

  return posts
    .filter(p => !pageSlugs.has(p.slug) && !reservedSlugs.has(p.slug))
    .map(p => ({
      source: `/${p.slug}`,
      destination: `/blog/${p.slug}`,
      permanent: true,
    }))
}

/**
 * WordPress legacy archive URLs Google still has indexed. These pattern
 * routes have no Next.js equivalent and were 404ing (or soft-404ing). Send
 * them to the nearest sensible target with a permanent (308 ≈ 301) redirect
 * so their accumulated link equity flows somewhere useful instead of dying.
 */
function legacyRedirects() {
  return [
    // The default *.vercel.app domain serves the same production build — a
    // duplicate-content host. Send it to the canonical apex domain. (Safe:
    // requests on tradersfundhub.com don't match the host condition, and
    // Vercel doesn't edge-redirect the .vercel.app domain itself.)
    {
      source: '/:path*',
      has: [{ type: 'host' as const, value: 'tradersfund.vercel.app' }],
      destination: 'https://tradersfundhub.com/:path*',
      permanent: true,
    },
    // Same duplicate-host problem on www. Search Console (2026-07-27, last
    // 90d) shows BOTH hosts indexed for the same content — e.g.
    // www.../blog/e8-markets-review at 386 impressions alongside
    // /blog/e8-markets-review at 93 — which splits ranking signals across
    // two URLs for every page on the site. metadataBase already points
    // canonicals at the apex, but a canonical is a hint; a 308 is not.
    // Apex requests don't match the host condition, so this can't loop.
    {
      source: '/:path*',
      has: [{ type: 'host' as const, value: 'www.tradersfundhub.com' }],
      destination: 'https://tradersfundhub.com/:path*',
      permanent: true,
    },
    // WordPress-era affiliate links used a hyphen (/go-ftmo); the Next.js
    // route is a path segment (/go/ftmo). Every legacy link was hard-404ing —
    // including the "Visit X" CTA buttons still embedded in migrated MDX and
    // any external backlink pointing at them. Slug spellings differ between
    // the two schemes (go-e8markets vs the firms.json slug e8-markets), so
    // map them explicitly rather than with a wildcard.
    { source: '/go-ftmo', destination: '/go/ftmo', permanent: true },
    { source: '/go-fundingpips', destination: '/go/fundingpips', permanent: true },
    { source: '/go-fundednext', destination: '/go/fundednext', permanent: true },
    { source: '/go-e8markets', destination: '/go/e8-markets', permanent: true },
    { source: '/go-brightfunded', destination: '/go/bright-funded', permanent: true },
    { source: '/go-tradersconnect', destination: '/go/traders-connect', permanent: true },
    { source: '/go-zulutrade', destination: '/go/zulutrade', permanent: true },
    { source: '/go-fxreplay', destination: '/go/fx-replay', permanent: true },
    { source: '/go-copyfx', destination: '/go/copyfx', permanent: true },
    { source: '/go-3commas', destination: '/go/3commas', permanent: true },
    // Consolidate the old implementation-shaped directory URL into the
    // canonical comparison product. Next preserves unmatched query filters.
    { source: '/main-table', destination: '/prop-firms', permanent: true },
    // Retire four duplicated WordPress overview pages in favour of the
    // current Reviews v2 articles. Config redirects return a real 308 at the
    // HTTP layer; a render-time redirect on a prerendered page degrades to a
    // 200 response with a meta refresh.
    { source: '/ftmo-overview', destination: '/blog/ftmo-review', permanent: true },
    { source: '/fundednext-overview', destination: '/blog/fundednext-review', permanent: true },
    { source: '/fundingpips-overview', destination: '/blog/funding-pips-review', permanent: true },
    { source: '/e8-markets-overview', destination: '/blog/e8-markets-review', permanent: true },
    // Old RSS feed → the real feed route handler (app/feed.xml/route.ts).
    { source: '/feed', destination: '/feed.xml', permanent: true },
    { source: '/comments/feed', destination: '/feed.xml', permanent: true },
    // WP author/tag archives → closest live hub.
    { source: '/author/:slug*', destination: '/authors', permanent: true },
    { source: '/tag/:slug*', destination: '/blog', permanent: true },
    // WP blog pagination (/page/2, /page/3 …) → blog index.
    { source: '/page/:n*', destination: '/blog', permanent: true },
    // WP category pagination (/category/prop-firms/page/2 …) → the category
    // page itself. Google still crawls these (visible in Search Console) and
    // they were 404ing.
    { source: '/category/:slug/page/:n*', destination: '/category/:slug', permanent: true },
  ]
}

const nextConfig: NextConfig = {
  async redirects() {
    return [...(await postRedirects()), ...legacyRedirects()]
  },
}

export default nextConfig
