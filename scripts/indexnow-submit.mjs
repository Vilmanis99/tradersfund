/**
 * Post-deploy IndexNow ping (Bing, Yandex, Seznam, Naver via api.indexnow.org).
 *
 *   node scripts/indexnow-submit.mjs --changed <base-sha>   # URLs whose source changed since <base-sha>
 *   node scripts/indexnow-submit.mjs --all                  # every URL in the production sitemap
 *   add --dry-run to print the payload without sending
 *
 * Safety: verifies the hosted key file and only submits URLs that are present in
 * the live production sitemap. The key is public by design (IndexNow protocol);
 * no secret is needed. Wired to .github/workflows/indexnow.yml (template: docs/indexnow-workflow.yml) (runs after a
 * successful Vercel production deployment).
 */
import { execFileSync } from 'node:child_process'
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, INDEXNOW_KEY_PATH } from '../lib/indexNow.ts'

const ORIGIN = 'https://tradersfundhub.com'
const UA = { 'user-agent': 'TradersFundHubIndexNow/1.0' }
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const changedFrom = args.includes('--changed') ? args[args.indexOf('--changed') + 1] : null
if (!changedFrom && !args.includes('--all')) throw new Error('Pass --changed <base-sha> or --all')

const sitemapRes = await fetch(`${ORIGIN}/sitemap.xml`, { headers: UA, signal: AbortSignal.timeout(20_000) })
if (!sitemapRes.ok) throw new Error(`Production sitemap HTTP ${sitemapRes.status}`)
const sitemapUrls = [...(await sitemapRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const inSitemap = new Set(sitemapUrls)

/** Map changed source files to public URLs; null means "can affect many pages" (submit the whole sitemap). */
function urlsForFile(file) {
  let m
  if ((m = file.match(/^app\/(.*)\/page\.(tsx|ts|mdx)$/)) || file === 'app/page.tsx') {
    const route = file === 'app/page.tsx' ? '' : m[1]
    if (route.includes('[')) return null // dynamic template: many URLs
    return [`${ORIGIN}/${route.replace(/\([^)]*\)\/?/g, '')}`.replace(/\/$/, '') || ORIGIN]
  }
  if ((m = file.match(/^content\/posts\/(.+)\.mdx?$/))) return [`${ORIGIN}/blog/${m[1]}`]
  if (/^(content\/data\/|components\/|lib\/|app\/.*layout\.tsx$|app\/sitemap\.ts$)/.test(file)) return null
  return []
}

let urlList
if (changedFrom) {
  const files = execFileSync('git', ['diff', '--name-only', changedFrom, 'HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const mapped = files.map(urlsForFile)
  urlList = mapped.some(v => v === null) ? sitemapUrls : [...new Set(mapped.flat())]
  console.log(`${files.length} changed file(s) → ${mapped.some(v => v === null) ? 'shared code/data changed: whole sitemap' : `${urlList.length} URL(s)`}`)
} else {
  urlList = sitemapUrls
}
urlList = urlList.map(u => (u === `${ORIGIN}/` ? ORIGIN : u)).filter(u => inSitemap.has(u) || inSitemap.has(`${u}/`))
urlList.push(`${ORIGIN}/sitemap.xml`)
urlList = [...new Set(urlList)].slice(0, 10_000)

const payload = { host: new URL(ORIGIN).hostname, key: INDEXNOW_KEY, keyLocation: `${ORIGIN}${INDEXNOW_KEY_PATH}`, urlList }
if (urlList.length <= 1) { console.log('No public URLs changed; nothing to submit.'); process.exit(0) }
if (dryRun) { console.log(JSON.stringify({ ...payload, urlList: urlList.slice(0, 20), total: urlList.length }, null, 2)); process.exit(0) }

const keyRes = await fetch(payload.keyLocation, { headers: UA, signal: AbortSignal.timeout(15_000) })
if (!keyRes.ok || (await keyRes.text()).trim() !== INDEXNOW_KEY) throw new Error(`Hosted IndexNow key check failed (HTTP ${keyRes.status})`)

const res = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8', ...UA },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30_000),
})
const body = (await res.text()).trim()
if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow HTTP ${res.status}: ${body.slice(0, 300)}`)
console.log(`IndexNow accepted ${urlList.length} URL(s) (HTTP ${res.status}).`)
