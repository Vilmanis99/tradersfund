/**
 * No client chunk may carry firm internals. Client components get the few fields they
 * render as props (or as row data) resolved by server code; they never import
 * content/data/*.json directly or through a lib module. 2026-10-22: the chunk loaded by
 * /ru/luchshie-prop-firmy bundled all of firms.json (via RuGoLink -> russiaAvailability),
 * and the site-wide header/footer chunk bundled closed-firms.json and
 * ru-how-we-make-money.json (with their _note fields and /workspace evidence paths).
 *
 * The site-wide client Footer and HeaderNav are enforced like every other client file:
 * components/SiteDocument.tsx and components/Header.tsx (server) resolve the closed-firms
 * flag/link and the RU disclosure link and pass them as props, so neither client component
 * imports lib/closedFirms or lib/ruDisclosure (each statically imports its JSON). This test
 * fails if either import comes back, and the text of the three data files is scanned for in
 * every client chunk below.
 *
 * Scans every .js under .next/static (run after `npm run build`) for:
 *  - internal firms.json field names (evidence, notes, previous codes, checkout flags);
 *  - box paths (/workspace/, /home/box/);
 *  - every firm's previousDiscountCode value;
 *  - the text of firms.json *Note fields and of _note fields in content/data JSON files;
 *  - every string of closed-firms.json, closed-firms.ru.json and ru-how-we-make-money.json.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const staticDir = path.join(root, '.next/static')
assert(fs.existsSync(staticDir), 'run `npm run build` first: .next/static is missing')

const firms = JSON.parse(fs.readFileSync(path.join(root, 'content/data/firms.json'), 'utf8'))

/**
 * Field names that exist only as internal data in firms.json; no client code reads them,
 * so a hit means the JSON itself was bundled. (platformEvidence and
 * discountCodeCheckoutVerified are read by the client FirmTable from its props, so their
 * names legitimately appear in code and are not listed.)
 */
const INTERNAL_FIELDS = [
  'discountCodeEvidence', 'discountCodeValidity', 'previousDiscountCode', 'previousDiscountCodeStatus',
  'discountCodeNote', 'russiaSourceNote', 'russiaNote', 'russiaSourceQuote',
  'payoutFrequencyNote', 'payoutMethodsNote', 'corporateNote', 'countriesRestrictedNote',
  'trustpilotSuppressedReason', 'assetsEvidence', 'freeTrialPlatformsQuote',
]
const needles = new Map()
for (const field of INTERNAL_FIELDS) needles.set(field, `firms.json field ${field}`)
needles.set('/workspace/', 'box path /workspace/')
needles.set('/home/box', 'box path /home/box')
for (const firm of firms) {
  if (firm.previousDiscountCode) needles.set(firm.previousDiscountCode, `${firm.name} previousDiscountCode`)
  for (const [key, value] of Object.entries(firm)) {
    if (/Note$/.test(key) && typeof value === 'string' && value.length >= 40) {
      needles.set(value.slice(0, 40), `${firm.name} ${key} text`)
    }
  }
}
// _note fields are editorial notes about a data file; none is page copy.
const dataDir = path.join(root, 'content/data')
for (const name of fs.readdirSync(dataDir).filter(file => file.endsWith('.json'))) {
  let data
  try { data = JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')) } catch { continue }
  if (data && !Array.isArray(data) && typeof data._note === 'string' && data._note.length >= 40) {
    needles.set(data._note.slice(0, 40), `${name} _note text`)
  }
}

// Site-wide client components must receive their data as props from the server layout.
const SERVER_ONLY_IMPORT = /^\s*import\b[^\n]*?from\s+['"][^'"]*(lib\/closedFirms|lib\/ruDisclosure|content\/data\/closed-firms|content\/data\/ru-how-we-make-money)[^'"]*['"]/m
const failures = []
for (const source of ['components/Footer.tsx', 'components/HeaderNav.tsx']) {
  const text = fs.readFileSync(path.join(root, source), 'utf8')
  assert(text.trimStart().startsWith("'use client'"), `${source} is expected to be a client component`)
  const hit = text.match(SERVER_ONLY_IMPORT)
  if (hit) failures.push(`${source}: client component imports ${hit[1]} (bundles closed-firms / disclosure JSON into every page)`)
}
function stringValues(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach(item => stringValues(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(item => stringValues(item, out))
  return out
}
// Strings from the data files only a server page may render (30+ chars: shorter ones are
// ordinary UI words that legitimately repeat in client code).
for (const name of ['closed-firms.json', 'closed-firms.ru.json', 'ru-how-we-make-money.json']) {
  for (const text of stringValues(JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')))) {
    if (text.length >= 30 && !/^https?:\/\//.test(text)) needles.set(text.slice(0, 60), `${name} text`)
  }
}

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return jsFiles(full)
    return entry.name.endsWith('.js') ? [full] : []
  })
}
const chunks = jsFiles(staticDir)
assert(chunks.length > 0, 'no client chunks found under .next/static')

// Next serialises string literals with JSON-style escapes; compare against the escaped form too.
const forms = needle => [...new Set([needle, JSON.stringify(needle).slice(1, -1), needle.replace(/\//g, '\\/')])]
for (const file of chunks) {
  let source = fs.readFileSync(file, 'utf8')
  for (const [needle, label] of needles) {
    if (forms(needle).some(form => source.includes(form))) failures.push(`${path.relative(root, file)}: ${label}`)
  }
}
assert.deepEqual(failures, [], `client chunks carry firm internals:\n${failures.join('\n')}`)
console.log(`client-bundle-no-firm-internals ok: ${chunks.length} client files, ${needles.size} internal strings checked`)
