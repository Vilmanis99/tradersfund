/**
 * Split tiers on display surfaces (fix/split-tiers-display-2026-10-27).
 * Run: npm run test:split-tiers-display [-- http://127.0.0.1:PORT]
 *
 * 1. Unit: lib/profitSplitDisplay renders a tiered product as a range derived
 *    from the tiers that apply before Funded Live ("50–80% (tiered)",
 *    RU «50–80% (по уровням)»), a flat product as "80%", unpublished as null.
 *    Funded Live tiers appear only with stage 'all'.
 * 2. Live (needs a running server): no display surface renders a flat split for
 *    a product with tiers. Pages: /, /ru, /prop-firm-challenges,
 *    /prop-firms/high-profit-split, /best-prop-firms-in-india/challenge-comparison,
 *    the rules page of each firm with tiered products (TradeDay has no RU twin), and every
 *    /compare/* page in the sitemap that names a tiered firm.
 *    a) Every data-split-product element for a tiered product must say
 *       data-split-display="tiered" and contain the range.
 *    b) In the visible text after each tiered product's name (up to the next
 *       product name, max 600 chars), its lowest tier must not appear as a bare
 *       split ("50% split", "Split 50%", "Profit split 50%", «Доля 50%») unless
 *       it is the range ("50–80%") or annotated "(lowest tier)". Cost maths
 *       keep profitSplitPct and say so.
 */
import assert from 'node:assert/strict'
import { getAllChallenges, getAllFirms } from '../lib/firms.ts'
import { firmSlug } from '../lib/firmSlug.ts'
import { applicableSplitTiers, hasTieredSplit, profitSplitText, profitSplitValue } from '../lib/profitSplitDisplay.ts'

// ---- 1. unit
const tiers = [
  { traderPct: 50, appliesTo: 'Funded Sim, below $4,000 current profit' },
  { traderPct: 80, appliesTo: 'Funded Sim, above $4,000 current profit' },
  { traderPct: 90, appliesTo: 'Funded Live' },
]
assert.equal(profitSplitText({ profitSplitPct: 50, profitSplitTiers: tiers }, 'en'), '50–80% (tiered)')
assert.equal(profitSplitText({ profitSplitPct: 50, profitSplitTiers: tiers }, 'ru'), '50–80% (по уровням)')
assert.equal(profitSplitText({ profitSplitPct: 50, profitSplitTiers: tiers }, 'en', 'all'), '50–90% (tiered)')
assert.equal(profitSplitText({ profitSplitPct: 80 }, 'en'), '80%')
assert.equal(profitSplitText({ profitSplitPct: 80, profitSplitTiers: [] }, 'ru'), '80%')
assert.equal(profitSplitText({ profitSplitPct: null }, 'en'), null)
assert.equal(profitSplitText({ profitSplitPct: 90, profitSplitTiers: [{ traderPct: 90, appliesTo: 'Funded Live' }] }, 'en'), '90%', 'a lone Funded Live tier is not a range')
assert.equal(applicableSplitTiers({ profitSplitPct: 50, profitSplitTiers: tiers }).length, 2)
assert.equal(profitSplitValue({ profitSplitPct: 50, profitSplitTiers: tiers }), '50–80%')

const firms = new Map(getAllFirms().map(f => [firmSlug(f.name), f]))
const challenges = getAllChallenges()
const tiered = challenges.filter(c => hasTieredSplit(c))
assert.ok(tiered.length > 0, 'expected at least one tiered product in the data (TradeDay Quick Pay)')
for (const c of tiered) {
  const text = profitSplitText(c, 'en')
  assert.match(text, /^\d+–\d+% \(tiered\)$/, `${c.firmSlug}/${c.productSlug}`)
  assert.ok(text.startsWith(`${Math.min(...applicableSplitTiers(c).map(t => t.traderPct))}–`), `${c.productSlug}: range starts at the lowest applicable tier`)
}
console.log(`unit: ${tiered.length} tiered product(s): ${tiered.map(c => `${c.firmSlug}/${c.productSlug} → ${profitSplitText(c)}`).join('; ')}`)

// ---- 2. live
const base = (process.argv[2] || process.env.BASE_URL || '').replace(/\/$/, '')
if (!base) { console.log('no server URL given: live checks skipped'); process.exit(0) }

const tieredFirms = [...new Set(tiered.map(c => c.firmSlug))]
const firmNames = tieredFirms.map(s => firms.get(s)?.name).filter(Boolean)
assert.equal(firmNames.length, tieredFirms.length, 'every tiered firm resolves to a firms.json name')
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
const comparePaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)
  .filter(p => /^\/(ru\/)?compare\//.test(p) && tieredFirms.some(s => p.includes(s)))
const rulesPaths = tieredFirms.flatMap(s => [`/prop-firms/${s}/rules`])
const pages = ['/', '/ru', '/prop-firm-challenges', '/prop-firms/high-profit-split', '/best-prop-firms-in-india/challenge-comparison', ...rulesPaths, ...comparePaths]

const allNames = [...new Set(challenges.map(c => c.productName))].sort((a, b) => b.length - a.length)
const strip = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ')
// Hand-written verdict-copy overrides (content/data/verdict-copy.json) state the day-1 payout split,
// which is the 50% tier and accurate; reported to the content owner rather than rewritten here.
const ALLOWED = [/pays from day 1 at a \d+% split/]

const problems = []
let attrChecked = 0, windowsChecked = 0
for (const path of pages) {
  const res = await fetch(`${base}${path}`)
  if (res.status === 404 && rulesPaths.includes(path)) continue
  if (res.status !== 200) { problems.push(`${path}: HTTP ${res.status}`); continue }
  const html = await res.text()
  for (const c of tiered) {
    const key = `${c.firmSlug}:${c.productSlug}`
    for (const m of html.matchAll(new RegExp(`<[^>]*data-split-product="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</`, 'g'))) {
      attrChecked++
      if (!/data-split-display="tiered"/.test(m[0])) problems.push(`${path}: ${key} marked flat`)
      if (!strip(m[1]).includes(profitSplitValue(c))) problems.push(`${path}: ${key} shows "${strip(m[1]).trim()}" not ${profitSplitValue(c)}`)
    }
  }
  let text = strip(html)
  for (const re of ALLOWED) text = text.replace(new RegExp(re.source, 'g'), ' [allowed copy] ')
  for (const c of tiered) {
    const pct = c.profitSplitPct
    const flat = new RegExp(`(?<![–\\d-])${pct}\\s?% split(?! \\(lowest tier\\)| \\(the lowest tier)|(?:Profit split|Split|Доля трейдера|Доля)\\s*${pct}\\s?%(?!\\s*[–-]\\s*\\d)`, 'i')
    let from = 0
    while ((from = text.indexOf(c.productName, from)) !== -1) {
      const start = from + c.productName.length
      let end = Math.min(text.length, start + 600)
      for (const name of allNames) {
        if (name === c.productName || c.productName.includes(name)) continue
        const i = text.indexOf(name, start)
        if (i !== -1 && i < end) end = i
      }
      const own = text.indexOf(c.productName, start)
      if (own !== -1 && own < end) end = own
      const windowText = text.slice(start, end)
      windowsChecked++
      const hit = windowText.match(flat)
      if (hit && firmNames.some(n => text.slice(Math.max(0, from - 200), end).includes(n))) {
        problems.push(`${path}: ${c.firmSlug}/${c.productSlug} near "…${windowText.slice(Math.max(0, hit.index - 60), hit.index + 40).trim()}…"`)
      }
      from = start
    }
  }
}
console.log(`live: ${pages.length} pages (${comparePaths.length} compare), ${attrChecked} data-split elements, ${windowsChecked} product-name windows`)
if (attrChecked === 0) problems.push('no data-split-product elements found for tiered products')
if (problems.length) { console.error(`${problems.length} flat split rendering(s):\n  ${[...new Set(problems)].join('\n  ')}`); process.exit(1) }
console.log('OK: no surface renders a flat split for a tiered product')
