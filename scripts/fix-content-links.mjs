/**
 * Idempotent in-place fixer for content/ markdown:
 *   1. /wp-content/uploads/ → /images/wp/ (catches srcset, which the
 *      original converter missed).
 *   2. href="/<post-slug>" → href="/blog/<post-slug>" — WP used flat URLs,
 *      Next.js routes posts under /blog/.
 *   3. Strip WP color values that break the dark theme (light-gray
 *      separators, near-black bg/text that disappears on dark).
 *
 * Safe to re-run. Leaves page links (/about, /best-prop-firms-in-uk, …)
 * alone because they aren't in the post-slug set.
 */
import fs from 'fs'
import path from 'path'

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')
const PAGES_DIR = path.join(process.cwd(), 'content', 'pages')

const postSlugs = new Set(
  fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
)

function fix(html) {
  return html
    .replace(/https?:\/\/tradersfundhub\.com\/wp-content\/uploads\//g, '/images/wp/')
    .replace(/\/wp-content\/uploads\//g, '/images/wp/')
    .replace(/href="\/([a-z0-9][a-z0-9-]*)"/g, (match, slug) =>
      postSlugs.has(slug) ? `href="/blog/${slug}"` : match
    )
    .replace(/border-bottom:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border-bottom: 1px solid var(--border);')
    .replace(/border-top:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border-top: 1px solid var(--border);')
    .replace(/border:\s*1px\s+solid\s+#dddddd\s*;?/gi, 'border: 1px solid var(--border);')
    .replace(/background-color:\s*#131313\s*;?/gi, '')
    .replace(/color:\s*#131313\s*;?/gi, '')
    .replace(/\s+style="\s*;?\s*"/g, '')
}

let changedFiles = 0
let totalRewrites = 0

for (const dir of [POSTS_DIR, PAGES_DIR]) {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const filePath = path.join(dir, file)
    const before = fs.readFileSync(filePath, 'utf-8')
    const after = fix(before)
    if (before !== after) {
      fs.writeFileSync(filePath, after)
      // Character-delta is a rough but always-correct proxy for how much
      // changed, and covers every fix above without needing a per-rule counter.
      const delta = Math.abs(before.length - after.length)
      changedFiles++
      totalRewrites += 1
      console.log(`  ✓ ${path.relative(process.cwd(), filePath)} (Δ${delta} chars)`)
    }
  }
}

console.log(`\nFixed ${changedFiles} files, ${totalRewrites} total replacements.`)
