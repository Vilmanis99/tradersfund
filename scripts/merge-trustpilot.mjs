/**
 * Merge captured Trustpilot figures into content/data/firms.json.
 *
 * Dry-run by default; pass --write to apply.
 *
 *   node scripts/merge-trustpilot.mjs
 *   node scripts/merge-trustpilot.mjs --write
 *
 * Distinguishes three states, which the Firm schema keeps separate on
 * purpose:
 *   • a real score            → trustpilotScore / trustpilotCount set
 *   • rating suppressed by    → trustpilotRatingSuppressed: true, score null
 *     Trustpilot for a
 *     guidelines breach
 *   • not yet captured        → everything stays null
 *
 * Collapsing the middle case into the third would erase the most useful
 * thing we know about those firms.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIRMS = path.join(ROOT, 'content/data/firms.json')
const CAPTURE_DIR =
  'C:\\Users\\karli\\AppData\\Local\\Temp\\claude\\c--Users-karli-Documents-tradersfundhub\\ad1b1ea0-c880-4ba2-bd38-24775b14f844\\scratchpad'

const write = process.argv.includes('--write')
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const SUPPRESSED_RE = /breach of (our|their) guidelines|rating is unavailable|suppress/i

const batches = fs
  .readdirSync(CAPTURE_DIR)
  .filter(f => /^trustpilot-batch\d+\.json$/.test(f))
  .sort()

if (!batches.length) {
  console.log('no trustpilot-batch*.json captures found')
  process.exit(0)
}

const captures = batches.flatMap(f =>
  JSON.parse(fs.readFileSync(path.join(CAPTURE_DIR, f), 'utf-8'))
)
console.log(`read ${captures.length} entries from ${batches.join(', ')}\n`)

const firms = JSON.parse(fs.readFileSync(FIRMS, 'utf-8'))
let applied = 0
const unmatched = []

for (const cap of captures) {
  const capName = norm(cap.firm)
  // Capture names carry the legal suffix our firms.json omits ("Alpha
  // Capital Group" vs "Alpha Capital"), so accept a prefix match either way.
  const firm = firms.find(f => {
    const n = norm(f.name)
    return n === capName || capName.startsWith(n) || n.startsWith(capName)
  })
  if (!firm) {
    unmatched.push(cap.firm)
    continue
  }

  const suppressed =
    cap.trustpilotScore == null && SUPPRESSED_RE.test(`${cap.notes ?? ''} ${cap.evidence ?? ''}`)

  if (cap.trustpilotScore == null && !suppressed) {
    console.log(`~ ${firm.name}: no score and no suppression evidence — leaving untouched`)
    continue
  }

  const before = `${firm.trustpilotScore ?? '—'}/${firm.trustpilotCount ?? '—'}`
  firm.trustpilotScore = cap.trustpilotScore ?? null
  firm.trustpilotCount = cap.trustpilotCount ?? null
  if (cap.trustpilotUrl) firm.trustpilotUrl = cap.trustpilotUrl
  if (suppressed) firm.trustpilotRatingSuppressed = true
  else delete firm.trustpilotRatingSuppressed
  firm.trustpilotCapturedAt = cap.capturedAt ?? '2026-07-27'

  applied++
  console.log(
    `✓ ${firm.name.padEnd(24)} ${before} → ` +
      (suppressed
        ? 'RATING SUPPRESSED by Trustpilot (guidelines breach)'
        : `${firm.trustpilotScore} / ${firm.trustpilotCount?.toLocaleString('en-US')} reviews`)
  )
}

if (unmatched.length) console.log(`\n! no firms.json match for: ${unmatched.join(', ')}`)

if (write) {
  fs.writeFileSync(FIRMS, JSON.stringify(firms, null, 2) + '\n')
  console.log(`\nwrote ${path.relative(ROOT, FIRMS)} (${applied} firm(s) updated)`)
} else {
  console.log(`\n${applied} firm(s) would be updated. Dry run — pass --write to apply.`)
}
