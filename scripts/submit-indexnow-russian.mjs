/**
 * Notify IndexNow participants about the existing Russian acquisition pages.
 * Run only after a material Russian-page deployment; this is deliberately not
 * wired into every build or deploy.
 *
 * Usage:
 *   npm run indexnow:russian -- --dry-run
 *   npm run indexnow:russian
 */

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  getRussianIndexNowUrls,
} from '../lib/indexNow.ts'

const ORIGIN = 'https://tradersfundhub.com'
const args = new Set(process.argv.slice(2))
const unknownArgs = [...args].filter(value => value !== '--dry-run')
if (unknownArgs.length) {
  throw new Error(`Unknown option(s): ${unknownArgs.join(', ')}`)
}

const urlList = getRussianIndexNowUrls(ORIGIN)
const payload = {
  host: new URL(ORIGIN).hostname,
  key: INDEXNOW_KEY,
  keyLocation: `${ORIGIN}${INDEXNOW_KEY_PATH}`,
  urlList,
}

if (urlList.length !== 26 || new Set(urlList).size !== urlList.length) {
  throw new Error(`Russian IndexNow inventory must contain 26 unique URLs; received ${urlList.length}`)
}
if (urlList.some(url => {
  const parsed = new URL(url)
  return parsed.origin !== ORIGIN || (parsed.pathname !== '/ru' && !parsed.pathname.startsWith('/ru/'))
})) {
  throw new Error('Russian IndexNow inventory contains an off-origin or non-Russian URL')
}

if (args.has('--dry-run')) {
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

const keyResponse = await fetch(payload.keyLocation, {
  headers: { 'user-agent': 'TradersFundHubIndexNow/1.0' },
  signal: AbortSignal.timeout(15_000),
})
const deployedKey = (await keyResponse.text()).trim()
if (!keyResponse.ok || deployedKey !== INDEXNOW_KEY) {
  throw new Error(
    `Production IndexNow key verification failed: HTTP ${keyResponse.status}, matching key ${deployedKey === INDEXNOW_KEY}`,
  )
}

const sitemapResponse = await fetch(`${ORIGIN}/sitemap.xml`, {
  headers: { 'user-agent': 'TradersFundHubIndexNow/1.0' },
  signal: AbortSignal.timeout(15_000),
})
const sitemap = await sitemapResponse.text()
if (!sitemapResponse.ok) {
  throw new Error(`Production sitemap verification failed: HTTP ${sitemapResponse.status}`)
}
const missingUrls = urlList.filter(url => !sitemap.includes(`<loc>${url}</loc>`))
if (missingUrls.length) {
  throw new Error(`Production sitemap is missing ${missingUrls.length} Russian IndexNow URL(s)`)
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'TradersFundHubIndexNow/1.0',
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30_000),
})
const responseBody = (await response.text()).trim()
if (response.status !== 200 && response.status !== 202) {
  throw new Error(
    `IndexNow rejected the ${urlList.length}-URL batch: HTTP ${response.status}${responseBody ? `: ${responseBody.slice(0, 300)}` : ''}`,
  )
}

console.log(
  `IndexNow accepted ${urlList.length} Russian URLs (HTTP ${response.status}${response.status === 202 ? ', key validation pending' : ''}).`,
)
