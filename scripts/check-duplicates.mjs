#!/usr/bin/env node
// Flags new/changed pages (vs a base ref, default origin/main) that share >THRESHOLD
// of their text with any other page. Text = markdown/TSX with frontmatter, code,
// markup and JSX expressions stripped; similarity = word 5-shingle Jaccard and
// containment (share of the changed page's shingles found in the other page).
// Usage: node scripts/check-duplicates.mjs [--base origin/main] [--threshold 0.7] [--all]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const base = opt('--base', 'origin/main')
const threshold = Number(opt('--threshold', '0.7'))
const SHINGLE = 5
// Pages below this are thin template wrappers (text comes from shared components/data);
// they are reported as 'too short' instead of compared.
const MIN_SHINGLES = 50

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, test, out)
    else if (test(p)) out.push(p)
  }
  return out
}
const pages = [
  ...walk('content/posts', p => p.endsWith('.md')),
  ...walk('content/pages', p => p.endsWith('.md')),
  ...walk('app', p => /(^|\/)page\.tsx$/.test(p)),
]

function toText(file) {
  let s = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.md')) {
    s = s.replace(/^---[\s\S]*?\n---\n/, '')
  } else {
    s = s.replace(/^\s*import[^\n]*$/gm, '')
    // keep string literals and JSX text; drop code-ish tokens
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*$/gm, ' ')
    s = s.replace(/\{[^{}]*\}/g, ' ')
  }
  s = s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
  s = s.replace(/https?:\/\/\S+/g, ' ')
  return s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(w => w.length > 1)
}
function shingles(words) {
  const set = new Set()
  for (let i = 0; i + SHINGLE <= words.length; i++) set.add(words.slice(i, i + SHINGLE).join(' '))
  return set
}

let changed
if (args.includes('--all')) changed = pages
else {
  // committed + uncommitted + untracked changes since the merge-base with the base ref
  const mb = execFileSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).trim()
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', mb], { encoding: 'utf8' })
    + execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
  const set = new Set(out.split('\n').filter(Boolean))
  changed = pages.filter(p => set.has(p))
}

const sh = new Map(pages.map(p => [p, shingles(toText(p))]))
let flagged = 0
const rows = []
for (const a of changed) {
  const A = sh.get(a)
  if (A.size < MIN_SHINGLES) { rows.push({ page: a, shingles: A.size, best: null, note: 'too short to compare' }); continue }
  let best = { other: null, jaccard: 0, containment: 0 }
  for (const b of pages) {
    if (b === a) continue
    const B = sh.get(b)
    if (B.size < MIN_SHINGLES) continue
    let inter = 0
    const [small, large] = A.size <= B.size ? [A, B] : [B, A]
    for (const x of small) if (large.has(x)) inter++
    const jaccard = inter / (A.size + B.size - inter)
    const containment = inter / A.size
    if (Math.max(jaccard, containment) > Math.max(best.jaccard, best.containment)) best = { other: b, jaccard, containment }
  }
  const score = Math.max(best.jaccard, best.containment)
  const flag = score > threshold
  if (flag) flagged++
  rows.push({ page: a, shingles: A.size, best: best.other, jaccard: +best.jaccard.toFixed(3), containment: +best.containment.toFixed(3), flag })
}
for (const r of rows) {
  console.log(`${r.flag ? 'FLAG' : 'ok  '}  ${r.page}  (${r.shingles} shingles)  closest: ${r.best ?? '—'}  jaccard=${r.jaccard ?? '—'} containment=${r.containment ?? '—'}${r.note ? '  ' + r.note : ''}`)
}
console.log(`\n${changed.length} changed page(s) checked against ${pages.length} pages; threshold ${threshold}; ${flagged} flagged.`)
process.exit(flagged ? 1 : 0)
