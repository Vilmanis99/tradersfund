// Derives firm-level `rules` (typed FirmRules) in firms.json from the latest
// fresh (<=30 days) challenge capture per firm. Values come from the live
// challenges/<slug>.json products; evidence from that capture's fieldEvidence.
// Fresh official reads in content/data/firm-rules/_captures/firm-rules-<date>.json
// (<=30 days) add verbatim evidence and may override value/byProduct/summary.
// USD loss limits (futures) come from accountSizes[].dailyLossUsd/maxLossUsd.
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
const usdBySize = key => p => {
  const o = Object.fromEntries((p.accountSizes ?? []).filter(a => a[key] != null).map(a => [String(a.sizeUsd), a[key]]))
  return Object.keys(o).length ? o : null
}
FIELDS.dailyLossUsd = { get: usdBySize('dailyLossUsd'), keys: ['dailyLossUsd'] }
FIELDS.maxLossUsd = { get: usdBySize('maxLossUsd'), keys: ['maxLossUsd'] }
const money = n => '$' + n.toLocaleString('en-US')
const fmtUsd = o => Object.entries(o).map(([k, v]) => `${money(v)} (${Number(k) / 1000}K)`).join(' / ')
const fmt = v => v && typeof v === 'object' && !Array.isArray(v) ? fmtUsd(v) : v === true ? 'allowed' : v === false ? 'not allowed' : typeof v === 'number' ? `${v}%` : String(v)

const caps = {}
for (const f of fs.readdirSync(path.join(ROOT, 'content/data/challenges/_captures'))) {
  const m = f.match(/^(.*)-(\d{4}-\d{2}-\d{2})\.json$/); if (!m) continue
  // Daily recheck / access-only captures carry no per-product evidence; rules
  // keep pointing at the latest full product capture.
  if (!Array.isArray(JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/challenges/_captures', f), 'utf8')).products)) continue
  if (!caps[m[1]] || m[2] > caps[m[1]].date) caps[m[1]] = { date: m[2], file: `content/data/challenges/_captures/${f}` }
}

const rulesCapDir = path.join(ROOT, 'content/data/firm-rules/_captures')
// All fresh firm-rules captures (<=30 days) are merged oldest→newest; a newer file
// replaces a field for a firm. Each field remembers which file/date it came from.
const freshFiles = []
for (const f of fs.existsSync(rulesCapDir) ? fs.readdirSync(rulesCapDir) : []) {
  const m = f.match(/^firm-rules-(\d{4}-\d{2}-\d{2})\.json$/); if (!m || age(m[1]) > MAX_AGE) continue
  freshFiles.push({ date: m[1], file: `content/data/firm-rules/_captures/${f}` })
}
freshFiles.sort((a, b) => a.date.localeCompare(b.date))
const freshData = {}
for (const ff of freshFiles) {
  const firmsIn = JSON.parse(fs.readFileSync(path.join(ROOT, ff.file), 'utf8')).firms
  for (const [slug, fields] of Object.entries(firmsIn)) {
    freshData[slug] ??= {}
    for (const [field, ov] of Object.entries(fields)) freshData[slug][field] = { ...ov, _src: ff }
  }
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
    const ov = freshData[slug]?.[field]
    if (ov) {
      const fe = ov.evidence.map(e => ({ sourceUrl: e.sourceUrl, quote: e.quote, quoteKind: 'verbatim', capturedAt: ov._src.date, captureFile: ov._src.file, productSlug: null }))
      // fresh verbatim reads replace older paraphrased capture notes for this field
      const keep = evidence.filter(e => e.quoteKind === 'verbatim')
      evidence.splice(0, evidence.length, ...fe, ...keep)
      if ('byProduct' in ov) { for (const k of Object.keys(byProduct)) delete byProduct[k]; Object.assign(byProduct, ov.byProduct ?? {}) }
      if ('value' in ov && !('byProduct' in ov)) for (const k of Object.keys(byProduct)) byProduct[k] = ov.value
    }
    const vals = Object.values(byProduct)
    const known = vals.filter(v => v !== null)
    if (ov?.summary && evidence.length) {
      const uni = known.length > 0 && vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0]))
      rules[field] = { value: 'value' in ov ? ov.value : uni ? vals[0] : null, summary: ov.summary, ...(ov.note ? { note: ov.note } : {}), byProduct: Object.keys(byProduct).length && ov.byProduct !== null ? byProduct : null, evidence: evidence.slice(0, 6) }
      continue
    }
    if (!evidence.length || !known.length) { rules[field] = { value: null, summary: null, byProduct: null, evidence: [] }; continue }
    const note = ov?.note
    const uniform = vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0]))
    let summary
    if (uniform) summary = fmt(vals[0])
    else {
      const groups = new Map()
      for (const p of products) { const v = byProduct[p.productSlug]; const g = v === null ? 'not stated' : fmt(v); groups.set(g, [...(groups.get(g) ?? []), p.productName]) }
      summary = 'Product-specific: ' + [...groups].map(([g, names]) => `${g} on ${names.join(', ')}`).join('; ')
    }
    rules[field] = { value: uniform ? vals[0] : null, summary, ...(note ? { note } : {}), byProduct, evidence: evidence.slice(0, 6) }
  }
  const pov = freshData[slug]?.platforms
  rules.platforms = pov
    ? { value: pov.value, summary: pov.value.join(', '), byProduct: null, evidence: pov.evidence.map(e => ({ sourceUrl: e.sourceUrl, quote: e.quote, quoteKind: 'verbatim', capturedAt: pov._src.date, captureFile: pov._src.file, productSlug: null })) }
    : prevPlatforms ?? { value: null, summary: null, byProduct: null, evidence: [] }
  const hasUsd = rules.dailyLossUsd.summary || rules.maxLossUsd.summary
  rules.lossLimitUnit = rules.maxLossPct.summary || rules.dailyLossPct.summary ? (hasUsd ? 'mixed' : 'pct') : hasUsd ? 'usd' : null
  if (freshData[slug]) rules.freshReadFile = Object.values(freshData[slug]).map(o => o._src.file).sort().at(-1)
  // Top-level firm.platforms is derived from the evidence-backed rules field so both places agree.
  if (Array.isArray(rules.platforms.value) && rules.platforms.value.length) firm.platforms = [...rules.platforms.value]
  firm.rules = rules
}
fs.writeFileSync(firmsPath, JSON.stringify(firms, null, 2) + '\n')
console.log('rules written for', firms.filter(f => f.rules).length, 'firms')
