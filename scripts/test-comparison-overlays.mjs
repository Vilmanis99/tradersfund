// Hand-written comparison overlays (lib/comparisons.ts) may only state firm-level facts that
// content/data/firms.json carries: platforms, founding years, allocation amounts and the FXIFY EA
// rule. The overlays are off (COMPARISON_OVERLAYS_ENABLED) but must stay correct for a re-enable.
import assert from 'node:assert/strict'
import { COMPARISON_OVERLAYS, parseMatchup, findFirmBySlug, fundedNextNewsCreditSentence, sizeFees } from '../lib/comparisons.ts'
import { getAllFirms, getChallengesByFirm } from '../lib/firms.ts'

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

// FundedNext 40% news-profit credit: sourced in firms.json rules.newsTrading (help articles
// 10701447 and 11641410), scoped to funded and Instant accounts, never the challenge phase.
const newsEvidence = findFirmBySlug('fundednext').rules.newsTrading.evidence
const newsSentence = fundedNextNewsCreditSentence(newsEvidence)
const fundedQuote = newsEvidence.find(item => /% of the profit from these profitable trade/.test(item.quote))
assert(fundedQuote, 'fixture: firms.json carries the FundedNext funded-account news-profit quote')
const newsPct = fundedQuote.quote.match(/(\d+)%/)[1]
assert(newsSentence.includes(`only ${newsPct}% of the profit`), 'news credit percentage comes from the recorded quote')
assert(/^On funded Stellar 1-Step, 2-Step and Lite accounts and on Stellar Instant/.test(newsSentence), 'news credit is scoped to funded and Instant accounts')
assert(newsSentence.includes('challenge accounts are not subject to this rule'), 'news credit says challenge accounts are exempt')
for (const drop of [/Challenge Accounts are not subject/, /applies only to Stellar 1-Step/, /Only \d+% of the profit from trades placed during this window/, /% of the profit from these profitable trade/]) {
  assert.equal(fundedNextNewsCreditSentence(newsEvidence.filter(item => !drop.test(item.quote))), '', `news credit is dropped without the ${drop} quote`)
}
assert.equal(fundedNextNewsCreditSentence(newsEvidence.map(item => /Only \d+%/.test(item.quote) ? { ...item, quote: item.quote.replace(/\d+%/, '50%') } : item)), '', 'news credit is dropped when the two articles disagree')
let newsOverlays = 0
for (const [slug, overlay] of Object.entries(COMPARISON_OVERLAYS)) {
  const text = textOf(overlay)
  for (const sentence of text.split(/(?<=\.)\s+/).filter(sentence => /\b\d+% of the profit\b|news-profit|news credit/i.test(sentence))) {
    assert(slug.includes('fundednext'), `${slug}: news-profit credit appears only on FundedNext matchups`)
    assert.equal(sentence, newsSentence, `${slug}: news-profit wording is the sourced, scoped sentence`)
  }
  if (text.includes(newsSentence)) newsOverlays++
}
assert.equal(newsOverlays, 3, 'news credit is restored on ftmo-vs-fundednext, fundednext-vs-fundingpips and fundednext-vs-fxify')

// Apex vs Topstep cost copy follows the 2026-10-22 capture: priced $100K paths from data,
// Standard paths named as unpriced, no superseded $199 + $59 claim.
{
  const text = textOf(COMPARISON_OVERLAYS['apex-trader-funding-vs-topstep'])
  const { priced, unpriced } = sizeFees('apex-trader-funding', 100000)
  const fmt = value => `$${value.toLocaleString('en-US')}`
  for (const item of priced) assert(text.includes(`${fmt(item.total)} for ${item.name}`), `Apex $100K ${item.name} fee ${fmt(item.total)} comes from data`)
  for (const item of unpriced) assert(text.includes(item.name), `Apex ${item.name} is named as unpriced`)
  const apexNull = getChallengesByFirm('apex-trader-funding').filter(product => product.accountSizes.every(tier => tier.priceUsd == null))
  assert.deepEqual(unpriced.map(item => item.name), apexNull.map(product => product.productName), 'fixture: unpriced Apex products are the all-null ones')
  assert.doesNotMatch(text, /\$199|\$59 activation|\$0 activation|no \$100K list fee|prices were not captured|NaN|undefined/, 'no superseded or empty Apex price claim')
  for (const item of sizeFees('topstep', 100000).priced) assert(text.includes(`${fmt(item.priceUsd)} a month`), `Topstep $100K ${item.name} monthly fee from data`)
}

console.log(`Comparison overlays: ${checked} overlays checked against firms.json platforms, founding years, allocations and FXIFY EA rule.`)
