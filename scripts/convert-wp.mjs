/**
 * Convert WordPress XML export to MDX content files for Next.js
 *
 * Usage: node scripts/convert-wp.mjs
 */
import fs from 'fs'
import path from 'path'

const XML_PATH = path.join(process.cwd(), '..', 'tradersfundhub.WordPress.2026-03-23.xml')
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')
const PAGES_DIR = path.join(process.cwd(), 'content', 'pages')
const DATA_DIR = path.join(process.cwd(), 'content', 'data')

// Ensure directories exist
;[POSTS_DIR, PAGES_DIR, DATA_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }))

const xml = fs.readFileSync(XML_PATH, 'utf-8')

// ── Helper: extract CDATA value ──
function cdata(str) {
  const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return m ? m[1] : str
}

// ── Helper: clean HTML to simpler HTML for prose rendering ──
// postSlugs (optional Set<string>): if provided, rewrites bare post links
// like href="/ftmo-review" → href="/blog/ftmo-review".
function cleanHtml(html, { postSlugs } = {}) {
  if (!html) return ''

  let h = html
    // Remove WordPress Gutenberg block comments (including self-closing /-->)
    .replace(/<!--\s*\/?wp:[\w/-]+(?:\s+\{[^}]*\})?\s*\/?-->/g, '')
    // Remove empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    // Remove inline SVGs (decorative)
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    // Remove Elementor-specific markup
    .replace(/<div class="elementor[\s\S]*?<\/div>/g, '')
    // Remove WPForms shortcodes
    .replace(/\[wpforms[^\]]*\]/g, '<p><em>Contact form — please email us directly.</em></p>')
    // Remove other shortcodes
    .replace(/\[\/?[a-z_]+[^\]]*\]/gi, '')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    // Convert WordPress image paths to local paths — handles src, srcset,
    // and any other attribute since /wp-content/uploads/ is WP-specific.
    .replace(/https?:\/\/tradersfundhub\.com\/wp-content\/uploads\//g, '/images/wp/')
    .replace(/\/wp-content\/uploads\//g, '/images/wp/')
    // Convert internal links from WordPress domain to relative
    .replace(/https?:\/\/tradersfundhub\.com\//g, '/')
    // Fix double-encoded entities
    .replace(/&amp;/g, '&')

  // Rewrite bare post slug links to their new /blog/:slug location.
  if (postSlugs && postSlugs.size) {
    h = h.replace(/href="\/([a-z0-9][a-z0-9-]*)"/g, (match, slug) =>
      postSlugs.has(slug) ? `href="/blog/${slug}"` : match
    )
  }

  // Strip WordPress colors that clash with the dark theme.
  h = sanitizeInlineStyles(h)

  return h.trim()
}

// Remove specific hardcoded WP colors that break the dark theme and
// collapse any style attributes left empty after removal.
function sanitizeInlineStyles(html) {
  return html
    // Light-gray separators leak everywhere and render as bright lines on dark.
    .replace(/border-bottom:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border-bottom: 1px solid var(--border);')
    .replace(/border-top:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border-top: 1px solid var(--border);')
    .replace(/border:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border: 1px solid var(--border);')
    // Near-black that doesn't match our bg token; let inherit win.
    .replace(/background-color:\s*#131313\s*;?/gi, '')
    .replace(/color:\s*#131313\s*;?/gi, '')
    // Collapse "style=" with only whitespace/semicolons left.
    .replace(/\s+style="\s*;?\s*"/g, '')
}

// ── Parse all <item> blocks ──
const items = xml.split('<item>').slice(1).map(block => {
  const get = (tag) => {
    const re = new RegExp(`<${tag}>(.*?)</${tag}>`, 's')
    const m = block.match(re)
    return m ? m[1].trim() : ''
  }

  // Extract fields using CDATA-aware patterns
  const title = cdata(get('title'))
  const slug = cdata(block.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')
  const postType = cdata(block.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')
  const status = cdata(block.match(/<wp:status><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')
  const pubDate = get('pubDate') || ''
  const postDate = cdata(block.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')
  const postModified = cdata(block.match(/<wp:post_modified><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')
  const creator = cdata(block.match(/<dc:creator><!\[CDATA\[(.*?)\]\]>/)?.[1] || '')

  // Content
  const contentMatch = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
  const content = contentMatch ? contentMatch[1] : ''

  // Excerpt
  const excerptMatch = block.match(/<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/)
  const excerpt = excerptMatch ? excerptMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  // Categories and tags
  const categories = []
  const tags = []
  const catMatches = block.matchAll(/<category domain="(category|post_tag)"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g)
  for (const m of catMatches) {
    if (m[1] === 'category' && m[2] !== 'Uncategorized') categories.push(m[2])
    if (m[1] === 'post_tag') tags.push(m[2])
  }

  return { title, slug, postType, status, pubDate, postDate, postModified, creator, content, excerpt, categories, tags }
})

// ── Author map ──
const authorMap = {
  tradingrage: 'Edris Derakhshi',
  Tara: 'Tara Mohseni',
}
function resolveAuthor(creator) {
  return authorMap[creator] || creator
}

// ── Generate blog post MDX files ──
const posts = items.filter(i => i.postType === 'post' && i.status === 'publish' && i.slug)
console.log(`\nFound ${posts.length} published posts`)

// Build slug set first so cleanHtml can rewrite bare /slug → /blog/slug links.
const postSlugs = new Set(posts.map(p => p.slug))

let postCount = 0
for (const post of posts) {
  const cleanedContent = cleanHtml(post.content, { postSlugs })
  if (!cleanedContent && !post.title) continue

  const frontmatter = [
    '---',
    `title: "${post.title.replace(/"/g, '\\"')}"`,
    `slug: "${post.slug}"`,
    `date: "${post.postDate}"`,
    `modified: "${post.postModified}"`,
    `author: "${resolveAuthor(post.creator)}"`,
    `excerpt: "${(post.excerpt || '').replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 300)}"`,
    `categories: [${post.categories.map(c => `"${c}"`).join(', ')}]`,
    `tags: [${post.tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`,
    `type: "post"`,
    '---',
  ].join('\n')

  const mdxContent = `${frontmatter}\n\n${cleanedContent}\n`
  fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.md`), mdxContent)
  postCount++
  console.log(`  ✓ ${post.slug}`)
}
console.log(`Wrote ${postCount} post files`)

// ── Generate page MDX files ──
const pages = items.filter(i => i.postType === 'page' && i.status === 'publish' && i.slug)
console.log(`\nFound ${pages.length} published pages`)

// Skip pages that are handled by dedicated routes or have no useful content
const SKIP_PAGES = ['blog', 'home']

let pageCount = 0
for (const page of pages) {
  if (SKIP_PAGES.includes(page.slug)) {
    console.log(`  ⊘ ${page.slug} (skipped - handled by route)`)
    continue
  }

  const cleanedContent = cleanHtml(page.content, { postSlugs })

  const frontmatter = [
    '---',
    `title: "${page.title.replace(/"/g, '\\"')}"`,
    `slug: "${page.slug}"`,
    `date: "${page.postDate}"`,
    `description: "${(page.excerpt || page.title).replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 200)}"`,
    `type: "page"`,
    '---',
  ].join('\n')

  const mdxContent = `${frontmatter}\n\n${cleanedContent}\n`
  fs.writeFileSync(path.join(PAGES_DIR, `${page.slug}.md`), mdxContent)
  pageCount++
  console.log(`  ✓ ${page.slug}`)
}
console.log(`Wrote ${pageCount} page files`)

// ── Generate firms.json ──
// Extract firm data from known review posts
const firmData = [
  { name: 'FTMO', founded: '2015', assets: ['Forex', 'Crypto', 'Indices', 'Commodities', 'Stocks'], maxAllocation: '$2,000,000', platforms: ['MT4', 'MT5', 'cTrader', 'DXTrade'], score: 9.2, logo: '', reviewUrl: '/blog/ftmo-review' },
  { name: 'FundedNext', founded: '2022', assets: ['Forex', 'Crypto', 'Indices', 'Commodities'], maxAllocation: '$4,000,000', platforms: ['MT4', 'MT5'], score: 8.8, logo: '', reviewUrl: '/blog/fundednext-review' },
  { name: 'FundingPips', founded: '2022', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$2,000,000', platforms: ['MT5', 'cTrader', 'DXTrade'], score: 8.7, logo: '', reviewUrl: '/blog/funding-pips-review' },
  { name: 'E8 Markets', founded: '2021', assets: ['Forex', 'Crypto', 'Indices', 'Commodities'], maxAllocation: '$1,000,000', platforms: ['MT5'], score: 8.3, logo: '', reviewUrl: '/blog/e8-markets-review' },
  { name: 'Alpha Capital', founded: '2023', assets: ['Forex', 'Indices', 'Crypto', 'Commodities'], maxAllocation: '$2,000,000', platforms: ['MT5', 'cTrader'], score: 8.0, logo: '', reviewUrl: '/blog/alpha-capital-review' },
  { name: 'Bright Funded', founded: '2023', assets: ['Forex', 'Indices', 'Commodities'], maxAllocation: '$400,000', platforms: ['MT5', 'TradeLocker'], score: 7.8, logo: '', reviewUrl: '/blog/bright-funded-prop-firm' },
  { name: 'OFP Funding', founded: '2022', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$5,000,000', platforms: ['MT4', 'MT5'], score: 7.5, logo: '', reviewUrl: '/blog/ofp-funding-review' },
  { name: 'Maven', founded: '2023', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$800,000', platforms: ['MT5', 'TradeLocker'], score: 7.6, logo: '', reviewUrl: '/blog/maven-prop-firm-review' },
  { name: 'FXIFY', founded: '2022', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$4,000,000', platforms: ['MT4', 'MT5'], score: 8.1, logo: '', reviewUrl: '/blog/fxify-review' },
  { name: 'Crypto Fund Trader', founded: '2023', assets: ['Crypto', 'Forex', 'Indices'], maxAllocation: '$600,000', platforms: ['MT5', 'cTrader'], score: 7.4, logo: '', reviewUrl: '/blog/crypto-fund-trader-review' },
  { name: 'Topstep', founded: '2012', assets: ['Futures'], maxAllocation: '$500,000', platforms: ['NinjaTrader', 'Quantower', 'TradingView'], score: 8.5, logo: '', reviewUrl: '/blog/topstep-review' },
  { name: 'My Funded Futures', founded: '2023', assets: ['Futures'], maxAllocation: '$600,000', platforms: ['NinjaTrader', 'Tradovate', 'TradingView'], score: 8.2, logo: '', reviewUrl: '/blog/my-funded-futures' },
  { name: 'City Traders Imperium', founded: '2018', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$2,000,000', platforms: ['MT5', 'cTrader'], score: 7.9, logo: '', reviewUrl: '/blog/city-traders-imperium-review' },
  { name: 'The Funded Trader', founded: '2021', assets: ['Forex', 'Indices', 'Commodities', 'Crypto'], maxAllocation: '$1,500,000', platforms: ['MT4', 'MT5', 'cTrader'], score: 7.7, logo: '', reviewUrl: '/blog/the-funded-trader-review' },
]

fs.writeFileSync(path.join(DATA_DIR, 'firms.json'), JSON.stringify(firmData, null, 2))
console.log(`\nWrote firms.json with ${firmData.length} firms`)

console.log('\n✅ Conversion complete!')
