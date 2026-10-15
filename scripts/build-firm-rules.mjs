// Derives firm-level `rules` (typed FirmRules) in firms.json from the latest
// fresh (<=30 days) challenge capture per firm. Values come from the live
// challenges/<slug>.json products; evidence from that capture's fieldEvidence.
// A field without fresh evidence is left null. Usage: node scripts/build-firm-rules.mjs [--today YYYY-MM-DD]
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const arg = process.argv.indexOf('--today')
const TODAY = arg > 0 ? process.argv[arg + 1] : new Date().toISOString().slice(0, 10)
const MAX_AGE = 30
const SKIP = new Set(['apex-trader-funding']) // geo-blocked; left as is
const slugOf = n => ({ brightfunded: 'bright-funded' })[n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')] ?? n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const age = d => (Date.parse(TODAY) - Date.parse(d)) / 864e5

const FIELDS = {
  drawdownType: { get: p => p.drawdownType ?? null, keys: ['drawdownType'] },
  dailyLossPct: { get: p => p.dailyLossPct ?? null, keys: ['dailyLossPct'] },
  maxLossPct: { get: p => p.maxLossPct ?? null, keys: ['maxLossPct'] },
  consistencyPct: { get: p => p.consistencyRulePct ?? null, keys: ['consistencyRulePct'] },
  profitSplitPct: { get: p => p.profitSplitPct ?? null, keys: ['profitSplitPct'] },
  payoutFrequency: { get: p => p.payoutFrequency ?? null, keys: ['payoutFrequencyQuote', 'payoutFrequency'] },
  newsTrading: { get: p => p.rules?.news ?? null, keys: ['rules.news', 'news'] },
  weekendHolding: { get: p => p.rules?.weekend ?? null, keys: ['rules.weekend', 'weekend', 'weekendOvernight'] },
}
const fmt = v => v === true ? 'allowed' : v === false ? 'not allowed' : typeof v === 'number' ? `${v}%` : String(v)

const caps = {}
for (const f of fs.readdirSync(path.join(ROOT, 'content/data/challenges/_captures'))) {
  const m = f.match(/^(.*)-(\d{4}-\d{2}-\d{2})\.json$/); if (!m) continue
  if (!caps[m[1]] || m[2] > caps[m[1]].date) caps[m[1]] = { date: m[2], file: `content/data/challenges/_captures/${f}` }
}

const firmsPath = path.join(ROOT, 'content/data/firms.json')
const firms = JSON.parse(fs.readFileSync(firmsPath, 'utf8'))
for (const firm of firms) {
  const slug = slugOf(firm.name)
  if (SKIP.has(slug)) continue
  const cap = caps[slug]
  const livePath = path.join(ROOT, `content/data/challenges/${slug}.json`)
  if (!cap || !fs.existsSync(livePath) || age(cap.date) > MAX_AGE) continue
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'))
  const products = Array.isArray(live) ? live : live.products
  const capData = JSON.parse(fs.readFileSync(path.join(ROOT, cap.file), 'utf8'))
  const capBySlug = Object.fromEntries(capData.products.map(p => [p.productSlug, p]))
  const prevPlatforms = firm.rules?.platforms
  const rules = { capturedAt: cap.date, captureFile: cap.file }
  for (const [field, spec] of Object.entries(FIELDS)) {
    const byProduct = Object.fromEntries(products.map(p => [p.productSlug, spec.get(p)]))
    const evidence = []
    const seen = new Set()
    for (const p of products) {
      const fe = capBySlug[p.productSlug]?.fieldEvidence ?? {}
      const key = spec.keys.find(k => fe[k] != null)
      if (!key) continue
      const raw = fe[key]
      const ev = typeof raw === 'string'
        ? { sourceUrl: p.sourceUrl, quote: raw, quoteKind: 'capture-note' }
        : { sourceUrl: raw.sourceUrl ?? p.sourceUrl, quote: raw.quote, quoteKind: 'verbatim' }
      if (!ev.sourceUrl || !ev.quote) continue
      const k = ev.sourceUrl + '|' + ev.quote
      if (seen.has(k)) continue
      seen.add(k); evidence.push({ ...ev, capturedAt: cap.date, captureFile: cap.file, productSlug: p.productSlug })
    }
    const vals = Object.values(byProduct)
    const known = vals.filter(v => v !== null)
    if (!evidence.length || !known.length) { rules[field] = { value: null, summary: null, byProduct: null, evidence: [] }; continue }
    const uniform = vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0]))
    let summary
    if (uniform) summary = fmt(vals[0])
    else {
      const groups = new Map()
      for (const p of products) { const v = byProduct[p.productSlug]; const g = v === null ? 'not stated' : fmt(v); groups.set(g, [...(groups.get(g) ?? []), p.productName]) }
      summary = 'Product-specific: ' + [...groups].map(([g, names]) => `${g} on ${names.join(', ')}`).join('; ')
    }
    rules[field] = { value: uniform ? vals[0] : null, summary, byProduct, evidence: evidence.slice(0, 4) }
  }
  rules.platforms = prevPlatforms ?? { value: null, summary: null, byProduct: null, evidence: [] }
  firm.rules = rules
}
fs.writeFileSync(firmsPath, JSON.stringify(firms, null, 2) + '\n')
console.log('rules written for', firms.filter(f => f.rules).length, 'firms')
