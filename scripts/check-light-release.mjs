/** Release-wide light stylesheet coverage. Browser QA is still required for layout,
 * computed styles, gradient/image contrast and interactive states. No analytics calls. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const root = css.match(/:root\s*\{([^}]+)\}/)?.[1] || ''
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(m => [m[1], m[2]]))
const luminance = hex => hex.slice(1).match(/../g).map(n => Number.parseInt(n, 16) / 255)
  .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
  .reduce((total, n, i) => total + n * [0.2126, 0.7152, 0.0722][i], 0)
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
assert(root.includes('color-scheme: light'), 'Browser-native controls use the light scheme')
for (const text of ['text', 'muted', 'accent', 'accent2', 'gold', 'danger', 'info', 'violet']) {
  for (const surface of ['bg', 'bg2', 'bg3', 'accent-soft']) {
    assert(contrast(tokens[text], tokens[surface]) >= 4.5, `${text} on ${surface}: normal-text AA contrast`)
  }
}
for (const surface of ['bg', 'bg2', 'bg3']) {
  assert(contrast(tokens['control-border'], tokens[surface]) >= 3, `Control edge on ${surface}: non-text AA contrast`)
}
assert(contrast(tokens['on-accent'], tokens.accent) >= 4.5, 'Primary button contrast')
const lightCss = readFileSync(new URL('../app/light-platform.css', import.meta.url), 'utf8')
assert(lightCss.includes('color: #fff') && lightCss.includes('!important'), 'Legacy article text compatibility retained')
assert(lightCss.includes('html .ru-content .btn-primary'), 'Russian prose links cannot override button text')
for (const file of ['components/GlobalChallengeComparison.tsx', 'components/IndiaChallengeComparison.tsx', 'app/prop-firm-challenges/page.tsx']) {
  const component = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.doesNotMatch(component, /return ['"]#(?:6ee7b7|93c5fd|fcd34d|fca5a5)['"]/i, `${file}: rule helpers use accessible theme colours`)
}
assert(readFileSync(new URL('../app/loading.tsx', import.meta.url), 'utf8').includes('min(300px, 100%)'), 'Loading cards also fit narrow phones')

const base = new URL(process.argv[2] || 'http://127.0.0.1:3214')
async function get(pathname) {
  const response = await fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(30000) })
  return { status: response.status, text: await response.text() }
}
const sitemap = await get('/sitemap.xml')
assert.equal(sitemap.status, 200)
const paths = [...new Set([...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname))]
assert(paths.includes('/ru/obzor-fundednext') && paths.includes('/blog/fundednext-review'))
const styles = new Map()
const coverage = new Map()
async function checkPage(pathname) {
  const page = await get(pathname)
  assert.equal(page.status, 200, `${pathname}: published page responds`)
  assert(page.text.includes('data-theme="light"'), `${pathname}: shared light root`)
  const hrefs = [...page.text.matchAll(/<link\b[^>]*>/g)].map(m => m[0])
    .filter(link => link.includes('rel="stylesheet"')).map(link => link.match(/href="([^"]+)"/)?.[1]).filter(Boolean)
  assert(hrefs.length, `${pathname}: server-rendered stylesheet links`)
  for (const href of hrefs) if (!styles.has(href)) styles.set(href, get(href))
  coverage.set(pathname, hrefs)
}
let cursor = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < paths.length) await checkPage(paths[cursor++])
}))
const lightAssets = new Set()
for (const [href, pending] of styles) {
  const result = await pending
  assert.equal(result.status, 200, `${href}: compiled stylesheet responds`)
  if (result.text.includes('.home-finder-panel') && result.text.includes('.ru-content .btn-primary')) lightAssets.add(href)
}
for (const [pathname, hrefs] of coverage) assert(hrefs.some(href => lightAssets.has(href)), `${pathname}: receives the compiled platform treatment`)
const missing = await get('/light-theme-qa-missing-page')
assert.equal(missing.status, 404, 'Not-found route remains a real 404')
assert(missing.text.includes('data-theme="light"'), 'Not-found page shares the theme')
console.log(`Light release passed: semantic palette contrast, ${paths.length} sitemap pages with HTTP 200 and compiled light styling, plus the 404 template. Browser layout/interaction checks are separate.`)
