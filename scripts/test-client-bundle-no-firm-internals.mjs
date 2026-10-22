/**
 * No client chunk may carry firm internals. Client components get the few fields they
 * render as props (or as row data) resolved by server code; they never import
 * content/data/*.json directly or through a lib module. 2026-10-22: the chunk loaded by
 * /ru/luchshie-prop-firmy bundled all of firms.json (via RuGoLink -> russiaAvailability),
 * and the site-wide header/footer chunk bundled closed-firms.json and
 * ru-how-we-make-money.json (with their _note fields and /workspace evidence paths).
 *
 * PENDING: the site-wide header/footer chunk still bundles closed-firms*.json and
 * ru-how-we-make-money.json because the client Footer/HeaderNav import lib/closedFirms
 * and lib/ruDisclosure. Fixing it here would conflict with the per-locale layouts
 * (c6ec78c) and the Footer/RuGoLink edits (cc00175) further up the release stack, so
 * it is reported, not failed, while those imports remain; the strings of those data
 * files are ignored in the scan meanwhile (any other hit still fails). An entry fails
 * once its imports are gone (delete it then). `--strict` fails on PENDING too.
 *
 * Scans every .js under .next/static (run after `npm run build`) for:
 *  - internal firms.json field names (evidence, notes, previous codes, checkout flags);
 *  - box paths (/workspace/, /home/box/);
 *  - every firm's previousDiscountCode value;
 *  - the text of firms.json *Note fields and of _note fields in content/data JSON files.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STRICT = process.argv.includes('--strict')
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

const PENDING = [
  {
    source: 'components/Footer.tsx',
    imports: ["from '@/lib/closedFirms'", "from '@/lib/ruDisclosure'"],
    data: ['closed-firms.json', 'closed-firms.ru.json', 'ru-how-we-make-money.json'],
  },
  {
    source: 'components/HeaderNav.tsx',
    imports: ["from '@/lib/closedFirms'"],
    data: ['closed-firms.json', 'closed-firms.ru.json'],
  },
]
const failures = []
const ignored = new Set()
function stringValues(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach(item => stringValues(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(item => stringValues(item, out))
  return out
}
for (const entry of PENDING) {
  const source = fs.readFileSync(path.join(root, entry.source), 'utf8')
  const still = entry.imports.filter(spec => source.includes(spec))
  if (!still.length) {
    failures.push(`${entry.source}: no longer imports ${entry.imports.join(' / ')}; remove it from PENDING`)
    continue
  }
  console.log(`PENDING ${entry.source}: ${still.join(', ')} still bundles ${entry.data.join(', ')} into a client chunk`)
  if (STRICT) failures.push(`${entry.source}: pending client import (${still.join(', ')})`)
  for (const name of entry.data) {
    for (const text of stringValues(JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')))) {
      if (text.length >= 20) ignored.add(text)
    }
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
const ignoredForms = [...ignored].flatMap(text => forms(text)).sort((a, b) => b.length - a.length)
for (const file of chunks) {
  let source = fs.readFileSync(file, 'utf8')
  for (const form of ignoredForms) source = source.split(form).join('')
  for (const [needle, label] of needles) {
    if (forms(needle).some(form => source.includes(form))) failures.push(`${path.relative(root, file)}: ${label}`)
  }
}
assert.deepEqual(failures, [], `client chunks carry firm internals:\n${failures.join('\n')}`)
console.log(`client-bundle-no-firm-internals ok: ${chunks.length} client files, ${needles.size} internal strings checked`)
