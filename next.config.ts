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
