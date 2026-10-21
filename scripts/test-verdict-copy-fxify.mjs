// Guards the FXIFY lines in content/data/verdict-copy.json against
// content/data/challenges/fxify.json: refund, EA, news, weekend and overnight counts, the named
// refundable / non-refundable products, and the Lightning Challenge name.
// verdict-copy.json is static writer copy, so when the data moves this test
// fails and names the line to rewrite. Node 22.
import { readFileSync } from 'node:fs'

const products = JSON.parse(readFileSync('content/data/challenges/fxify.json', 'utf8'))
const copy = JSON.parse(readFileSync('content/data/verdict-copy.json', 'utf8'))
const failures = []
const fail = msg => failures.push(msg)

const total = products.length
const refundOf = p => {
  const flags = new Set(p.accountSizes.map(t => t.refundable === true))
  if (flags.size !== 1) fail(`fxify.json: ${p.productName} mixes refundable and non-refundable tiers; the copy cannot state one answer`)
  return flags.has(true)
}
const refundable = products.filter(refundOf).map(p => p.productName)
const nonRefundable = products.filter(p => !refundable.includes(p.productName)).map(p => p.productName)
const count = (rule, value) => products.filter(p => p.rules?.[rule] === value).length
const phaseProducts = products.filter(p => /\bPhase\b/.test(p.productName))
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x))
const namedList = text => text.split(/,\s*|\s+and\s+|\s+or\s+/).map(s => s.trim()).filter(Boolean)

const lines = []
for (const [slug, e] of Object.entries(copy.reviews ?? {})) for (const k of ['bestFor', 'notFor']) (e[k] ?? []).forEach(l => lines.push([`reviews.${slug}.${k}`, l]))
for (const [slug, e] of Object.entries(copy.compares ?? {})) for (const k of ['pickA', 'pickB']) (e[k] ?? []).forEach(l => lines.push([`compares.${slug}.${k}`, l]))
const fxifyLines = lines.filter(([where, l]) => /fxify/.test(where) || /FXIFY/.test(l))

let checked = 0
for (const [where, line] of fxifyLines) {
  const at = `${where}: "${line}"`
  // "N of M FXIFY products are refundable"
  for (const m of line.matchAll(/(\d+) of (\d+) FXIFY products are refundable/g)) {
    checked++
    if (Number(m[1]) !== refundable.length || Number(m[2]) !== total) fail(`${at} says ${m[1]} of ${m[2]}; data has ${refundable.length} of ${total} refundable (${refundable.join(', ')})`)
  }
  // "FXIFY allows them|it [with pre-approval] on N of its M products" for EAs, news, weekend or overnight holding
  for (const m of line.matchAll(/FXIFY allows (them|it)( with pre-approval)? on (\d+) of its (\d+) products/g)) {
    checked++
    const rule = /\bEAs\b/.test(line) ? 'ea' : /\bnews\b/.test(line) ? 'news' : /weekend/.test(line) ? 'weekend' : /overnight/.test(line) ? 'overnight' : null
    if (!rule) { fail(`${at}: cannot tell which rule this count refers to`); continue }
    const value = m[2] ? 'restricted' : true
    const n = count(rule, value)
    if (Number(m[3]) !== n || Number(m[4]) !== total) fail(`${at}: data has ${rule} ${JSON.stringify(value)} on ${n} of ${total} products`)
  }
  if (/FXIFY Lightning(?! Challenge)/.test(line)) { checked++; fail(`${at}: use the data name "Lightning Challenge"`) }
  if (!where.startsWith('reviews.fxify-review.')) continue
  // Review box lines name products explicitly or by the phase-challenge group.
  let m
  if ((m = line.match(/^Fee refunds: (.+)$/))) { checked++; if (!sameSet(namedList(m[1]), refundable)) fail(`${at}: data refundable set is ${refundable.join(', ')}`) }
  if ((m = line.match(/^Refund seekers on (.+): none$/))) { checked++; const named = namedList(m[1]).map(n => n === 'Instant Funding' ? ['Instant Funding Standard', 'Instant Funding Lite'] : [n]).flat(); if (!named.every(n => nonRefundable.includes(n))) fail(`${at}: non-refundable in data: ${nonRefundable.join(', ')}`) }
  if (/phase challenges and Lightning are refundable/.test(line)) { checked++; if (!sameSet([...phaseProducts.map(p => p.productName), 'Lightning Challenge'], refundable)) fail(`${at}: data refundable set is ${refundable.join(', ')}`) }
  if (/Instant Funding .*not refundable/.test(line)) { checked++; const inst = products.filter(p => /^Instant Funding/.test(p.productName)); if (inst.some(p => refundable.includes(p.productName))) fail(`${at}: an Instant Funding product is refundable in data`) }
  if ((m = line.match(/all (\d+) phase challenges allow (both|news)/))) {
    checked++
    if (Number(m[1]) !== phaseProducts.length) fail(`${at}: data has ${phaseProducts.length} phase challenges`)
    const rules = m[2] === 'both' ? ['ea', 'news'] : ['news']
    for (const r of rules) if (!phaseProducts.every(p => p.rules?.[r] === true)) fail(`${at}: not every phase challenge has ${r}: true`)
  }
  if (/EAs need pre-approval/.test(line)) { checked++; if (!phaseProducts.every(p => p.rules?.ea === 'restricted')) fail(`${at}: phase challenges are not ea: "restricted" in data`) }
}

if (checked === 0) fail('no FXIFY claim lines found in verdict-copy.json; the patterns above are out of date')
if (failures.length) {
  console.error(`FAIL test-verdict-copy-fxify: ${failures.length} problem(s)\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`ok test-verdict-copy-fxify: ${checked} FXIFY claims match fxify.json (${refundable.length} of ${total} refundable: ${refundable.join(', ')}; ea true on ${count('ea', true)}, restricted on ${count('ea', 'restricted')})`)
