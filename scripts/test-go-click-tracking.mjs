// Local check that /go still redirects with click tracking in place.
// Usage: npx next start -p 3214 &  node scripts/test-go-click-tracking.mjs http://127.0.0.1:3214
import assert from 'node:assert/strict'

const base = process.argv[2] ?? 'http://127.0.0.1:3214'
const cases = [
  { path: '/go/bright-funded?from=home-comparison-table', headers: { referer: `${base}/` }, host: 'brightfunded.com' },
  { path: '/go/fundednext?from=ru-home-hero-fundednext', headers: { referer: `${base}/ru/luchshie-prop-firmy?x=1#y` }, host: 'fundednext.com' },
  { path: '/go/ftmo?from=post-body-ftmo-review', headers: {}, host: 'ftmo.com' },
  { path: '/go/fundingpips', headers: { referer: 'not a url' }, host: 'fundingpips.com' },
  { path: '/go/fundingpips?from=x', headers: { referer: 'https://evil.example/path' }, host: 'fundingpips.com' },
]
for (const { path, headers, host } of cases) {
  const started = Date.now()
  const res = await fetch(base + path, { redirect: 'manual', headers })
  const location = res.headers.get('location') ?? ''
  assert.equal(res.status, 302, `${path}: 302 redirect`)
  assert(new URL(location).hostname.endsWith(host), `${path}: redirects to ${host} (got ${location})`)
  assert.equal(res.headers.get('set-cookie'), null, `${path}: no cookie set`)
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow')
  console.log(`ok ${path} -> ${location} (${Date.now() - started} ms)`)
}
const unknown = await fetch(base + '/go/not-a-firm', { redirect: 'manual' })
assert.equal(unknown.status, 307, 'unknown firm still falls back to /prop-firms')
console.log('go click tracking redirect checks passed')
