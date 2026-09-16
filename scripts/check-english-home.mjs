/** Read-only HTTP checks; no browser automation or affiliate requests. */
import assert from 'node:assert/strict'
import { localPreviewUrl } from './local-preview-url.mjs'

const base = new URL(localPreviewUrl(process.argv.slice(2).find(arg => !arg.startsWith('--'))))
const development = process.argv.includes('--dev')
if (development) assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), '--dev is localhost-only')
const timeout = development ? 60000 : 20000
async function get(pathname) {
  const response = await fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(timeout) })
  const html = await response.text()
  assert.equal(response.status, 200, `${pathname}: HTTP status`)
  // App Router can stream the completed page after </main>, replacing a
  // suspense fallback. Inspect actual HTML elements, not serialized RSC text.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  assert(/<main\b/.test(markup), `${pathname}: main landmark`)
  assert.equal((markup.match(/<h1\b/g) || []).length, 1, `${pathname}: one rendered H1 (a streamed error can still return HTTP 200)`)
  return { html, markup }
}

const { html, markup } = await get('/')
const homeStart = markup.indexOf('data-english-home-layout="focused"')
assert(homeStart >= 0, 'focused home is actually rendered')
const mainEnd = markup.indexOf('</main>', homeStart)
const main = markup.slice(homeStart, mainEnd < 0 ? undefined : mainEnd)
assert(html.includes('lang="en"'), 'English document language')
assert(/<link\b[^>]*rel="canonical"[^>]*href="https:\/\/tradersfundhub\.com\/?"/.test(html), 'production self-canonical survives local preview')
assert(main.includes('data-english-home-guides="selected-three"'), 'curated guides are rendered')
const partners = [...main.matchAll(/data-english-home-partner="([^"]+)"/g)].map(match => match[1])
assert.deepEqual(partners, ['fundednext', 'bright-funded'])
const paths = [...new Set([...main.matchAll(/(?:href|action)="(\/[^"]*)"/g)]
  .map(match => new URL(match[1].replaceAll('&amp;', '&'), base).pathname)
  .filter(pathname => !pathname.startsWith('/go/')))]
assert(paths.includes('/blog/bright-funded-prop-firm'), 'follow the actual Bright Funded review, not a guessed slug')
assert(paths.includes('/prop-firm-challenges'), 'the comparison form destination is checked too')
assert(paths.includes('/true-cost-of-prop-firm-challenges'), 'cost guide remains discoverable')
console.log('PASS / — focused home, metadata and two disclosed partners')
const errors = []
for (const pathname of paths) {
  try {
    await get(pathname)
    console.log(`PASS ${pathname}`)
  } catch (error) {
    errors.push(`${pathname}: ${error.message}`)
    console.error(`FAIL ${errors.at(-1)}`)
  }
}
if (errors.length) process.exitCode = 1
else console.log(`English homepage and ${paths.length} linked pages render successfully; no affiliate links were requested.`)
