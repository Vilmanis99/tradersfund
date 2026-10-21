// Local check that /go still redirects with click tracking in place.
// Usage: npx next start -p 3214 &  node scripts/test-go-click-tracking.mjs http://127.0.0.1:3214
// Event payload check: start the server with VERCEL_WEB_ANALYTICS_ENDPOINT=http://127.0.0.1:3299/ev
// and pass --sink 3299; the test then captures go_click events and checks sanitising and privacy.
import assert from 'node:assert/strict'
import http from 'node:http'

const sinkArg = process.argv.indexOf('--sink')
const sinkPort = sinkArg > 0 ? Number(process.argv[sinkArg + 1]) : null
const events = []
const sink = sinkPort ? http.createServer((req, res) => {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => { events.push({ headers: req.headers, body: JSON.parse(body) }); res.end('ok') })
}).listen(sinkPort, '127.0.0.1') : null

const base = process.argv.slice(2).find(arg => arg.startsWith('http')) ?? 'http://127.0.0.1:3214'
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

if (sink) {
  const long = `${'a'.repeat(70)}`
  await fetch(`${base}/go/ftmo?from=${encodeURIComponent('Ru-Home Hero<script>|x_y')}`, { redirect: 'manual', headers: { referer: `${base}/ru/obzor-ftmo`, 'user-agent': 'SECRET-UA', 'x-forwarded-for': '9.9.9.9', cookie: 'a=b' } })
  await fetch(`${base}/go/ftmo?from=${long}`, { redirect: 'manual' })
  await new Promise(resolve => setTimeout(resolve, 1500))
  const clicks = events.filter(event => event.body.en === 'go_click')
  assert(clicks.length >= 2, `captured go_click events (${clicks.length})`)
  for (const { headers, body } of clicks) {
    assert(/^[a-z0-9\-_|]{1,64}$/.test(body.ed.placement), `placement sanitised: ${body.ed.placement}`)
    assert(body.o.startsWith('https://tradersfundhub.com'), `canonical page URL: ${body.o}`)
    for (const value of [headers['user-agent'], headers['x-vercel-ip'], headers.cookie]) assert(!value || value === 'undefined', 'no UA, IP or cookie forwarded')
  }
  const sanitised = clicks.find(click => click.body.ed.source_path === '/ru/obzor-ftmo')
  assert.equal(sanitised?.body.ed.placement, 'ru-home-hero-script-x-y')
  assert.equal(sanitised.body.o, 'https://tradersfundhub.com/ru/obzor-ftmo')
  assert(clicks.some(click => click.body.ed.placement === 'a'.repeat(64)), 'placement capped at 64 chars')
  console.log('go_click event payload checks passed')
  sink.close()
}
