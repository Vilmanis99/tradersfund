/** Bounded, read-only HTML audit. Crawlability is not proof of AI citations.
 * npm run audit:geo -- --url http://127.0.0.1:3214 --out .preview/geo-local-crawl.json
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
const origin = new URL(value('--url') || 'http://127.0.0.1:3214')
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('Supply a public HTTP(S) origin without credentials.')
const pilot = JSON.parse(fs.readFileSync('content/data/geo-pilot.json', 'utf8'))
const pages = [...pilot.pages, ...(pilot.additionalPages ?? [])]
const requested = ['/robots.txt', '/sitemap.xml', ...pages.map(page => page.path)]
const results = await Promise.all(requested.map(async pathname => {
  const result = { path: pathname, checks: [], errors: [] }
  const check = (name, okay) => { result.checks.push({ name, passed: Boolean(okay) }); if (!okay) result.errors.push(name) }
  try {
    const response = await fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'TFH-GEO-Readiness-Audit/1.0' } })
    result.status = response.status
    check('HTTP 200', response.status === 200)
    const body = await response.text()
    check('No HTTP indexing prohibition', !/noindex|none/i.test(response.headers.get('x-robots-tag') || ''))
    if (pathname === '/robots.txt') {
      check('Wildcard allows public pages', /User-Agent:\s*\*[\s\S]*?Allow:\s*\//i.test(body) && !/^Disallow:\s*\/\s*$/im.test(body))
      check('API excluded', /^Disallow:\s*\/api\//im.test(body))
      check('Canonical sitemap declared', body.includes('https://tradersfundhub.com/sitemap.xml'))
    } else if (pathname === '/sitemap.xml') {
      for (const page of pages) check(`Sitemap includes ${page.path}`, body.includes(`https://tradersfundhub.com${page.path}</loc>`))
    } else {
      const page = pages.find(page => page.path === pathname)
      const schemas = [...body.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(match => JSON.parse(match[1]))
      const nodes = schemas.flatMap(schema => Array.isArray(schema) ? schema : schema['@graph'] ?? [schema])
      const types = nodes.flatMap(node => Array.isArray(node['@type']) ? node['@type'] : [node['@type']])
      const visible = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      check('Exactly one server-rendered H1', (visible.match(/<h1\b/gi) || []).length === 1)
      check('Canonical points to this page', new RegExp(`<link[^>]*rel="canonical"[^>]*href="https://tradersfundhub\\.com${pathname}"`).test(body))
      check('No page noindex', !/<meta[^>]*name="robots"[^>]*content="[^"]*(?:noindex|none)/i.test(body))
      for (const type of page.schemaTypes) check(`Visible content has ${type} description`, types.includes(type))
      check('Authored questions visible without JavaScript', /<h3\b|<summary\b/i.test(visible) && visible.includes('?'))
      const cards = visible.match(/data-review-product=/g) || []
      check('Expected product summaries are server-rendered', cards.length === page.productCards)
      if (page.productCards) {
        check('Product source dates visible', (visible.match(/Captured <time/g) || []).length === page.productCards)
        check('Methodology linked', visible.includes('href="/methodology"'))
        check('Product sources linked through /go', (visible.match(/href="\/go\/[^"?]+\?source=[^"&]+&amp;from=review-product-source"/g) || []).length === page.productCards)
      }
      const article = nodes.find(node => ['Review', 'Article'].includes(node['@type']))
      if (article) {
        check('Byline identity described', article.author?.name && article.author?.['@id'] && article.author?.url)
        check('Page identity is canonical', article.mainEntityOfPage === `https://tradersfundhub.com${pathname}`)
        if (page.productCards) check('Review cites first-party product sources', article.citation?.length > 0 && article.citation.every(citation => citation['@type'] === 'WebPage' && citation.url.startsWith('https://') && !citation.url.startsWith('https://tradersfundhub.com/')))
      }
    }
  } catch (error) { result.errors.push(`Fetch/parse: ${error.message}`) }
  return result
}))
const report = { observedAt: new Date().toISOString(), origin: origin.origin, scope: 'Public HTTP and server-rendered HTML only. Does not prove indexing, real crawler IP access or AI citations.', results }
const out = value('--out')
if (out) {
  const destination = path.resolve(out)
  const root = process.cwd()
  if (!destination.startsWith(root + path.sep)) throw new Error('Output must stay in the workspace.')
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n')
}
let errors = 0
for (const result of results) {
  errors += result.errors.length
  console.log(`${result.errors.length ? 'FAIL' : 'PASS'} ${result.path}: ${result.checks.filter(check => check.passed).length} checks${result.errors.length ? ' — ' + result.errors.join('; ') : ''}`)
}
console.log(`GEO HTML audit: ${errors} errors. AI visibility has not been measured.`)
process.exitCode = errors ? 1 : 0
