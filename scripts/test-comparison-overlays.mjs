// Hand-written comparison overlays (lib/comparisons.ts) may only state firm-level facts that
// content/data/firms.json carries: platforms, founding years, allocation amounts and the FXIFY EA
// rule. The overlays are off (COMPARISON_OVERLAYS_ENABLED) but must stay correct for a re-enable.
import assert from 'node:assert/strict'
import { COMPARISON_OVERLAYS, parseMatchup, findFirmBySlug } from '../lib/comparisons.ts'
import { getAllFirms } from '../lib/firms.ts'

const PLATFORMS = [...new Set(getAllFirms().flatMap(firm => firm.platforms ?? []))]
const textOf = overlay => [overlay.h1, overlay.metaDescription, overlay.tlDr, overlay.whenToPickA, overlay.whenToPickB,
  ...overlay.verdictByCategory.map(call => `${call.category} ${call.reason}`), ...overlay.faqs.map(faq => `${faq.q} ${faq.a}`)].join('\n')
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let checked = 0
for (const [slug, overlay] of Object.entries(COMPARISON_OVERLAYS)) {
  const pair = parseMatchup(slug)
  const firms = [findFirmBySlug(pair.a), findFirmBySlug(pair.b)]
  assert(firms.every(Boolean), `${slug}: both firms exist`)
  const text = textOf(overlay)
  const listed = new Set(firms.flatMap(firm => (firm.platforms ?? []).map(name => name.toLowerCase())))
  for (const platform of PLATFORMS) {
    if (new RegExp(`(^|[^A-Za-z])${escape(platform)}([^A-Za-z]|$)`, 'i').test(text)) {
      assert(listed.has(platform.toLowerCase()), `${slug}: mentions ${platform}, which neither firm lists in firms.json`)
    }
  }
  for (const match of text.matchAll(/([A-Z][A-Za-z ]+?) (?:was )?founded in (\d{4})/g)) {
    const firm = firms.find(item => match[1].trim().endsWith(item.name) || item.name.endsWith(match[1].trim()))
    if (firm) assert.equal(match[2], String(firm.founded), `${slug}: ${firm.name} founding year`)
  }
  for (const match of text.matchAll(/\$(\d{1,3}(?:,\d{3}){2,})/g)) {
    const amounts = firms.map(firm => (firm.maxAllocation ?? '').match(/\$[\d,]+/)?.[0])
    assert(amounts.includes(`$${match[1]}`), `${slug}: $${match[1]} matches a firms.json maxAllocation (${amounts.join(' / ')})`)
  }
  if (firms.some(firm => firm.name === 'FXIFY') && /\bEAs?\b/.test(text)) {
    assert(/pre-approval/.test(text) && /DXTrade/.test(text), `${slug}: FXIFY EAs are allowed only with pre-approval and not on DXTrade`)
  }
  if (firms.some(firm => firm.name === 'FTMO')) {
    assert.equal(findFirmBySlug('ftmo').drawdownType ?? null, null, 'fixture: FTMO has no firm-level drawdown type')
    assert.doesNotMatch(text, /FTMO (?:uses|has|runs) (?:forgiving )?static drawdown/, `${slug}: FTMO is not described as static firm-wide`)
  }
  assert(overlay.reviewedAt && overlay.challengeReviewedAt, `${slug}: carries both review dates`)
  checked++
}
console.log(`Comparison overlays: ${checked} overlays checked against firms.json platforms, founding years, allocations and FXIFY EA rule.`)
