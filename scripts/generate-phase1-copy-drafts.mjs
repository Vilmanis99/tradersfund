/** Test article preparation against fixtures, every published source and actual page rendering. */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local?.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})
// Writes design/article-format Phase 1 copy drafts: every generated verdict line per page,
// with the data fields it reads, for EN Writer review. Usage:
//   node scripts/generate-phase1-copy-drafts.mjs [out.md]
const out = process.argv[2] ?? path.join(root, '..', 'tradersfundhub', 'design', 'phase1-copy-drafts.md')
try {
  const { getAllFirms, getAllChallenges, isChallengeFresh } = require(path.join(root, 'lib/firms.ts'))
  const { getPostBySlug } = require(path.join(root, 'lib/mdx.ts'))
  const { firstVerdictSentence } = require(path.join(root, 'lib/articleContent.ts'))
  const { getAllCanonicalPairs } = require(path.join(root, 'lib/comparisons.ts'))
  const { isSourceHoldFirm } = require(path.join(root, 'lib/reviewStatus.ts'))
  const { getReviewCopy, getCompareCopy } = require(path.join(root, 'lib/verdictCopy.ts'))
  const { firmSlug } = require(path.join(root, 'lib/firmSlug.ts'))
  const review = require(path.join(root, 'components/ReviewVerdictBox.tsx'))
  const compare = require(path.join(root, 'components/ComparePickVerdict.tsx'))
  const fresh = slug => getAllChallenges().filter(p => p.firmSlug === slug && isChallengeFresh(p))
  const firms = getAllFirms()
  const md = []
  const degraded = { reviews: [], compares: [] }
  const today = new Date().toISOString().slice(0, 10)
  md.push(`# Phase 1 verdict copy drafts`, '', `Generated ${today} by \`scripts/generate-phase1-copy-drafts.mjs\` on branch feat/article-format-phase1-rollout. Every line below is built from firms.json and the fresh challenge captures (\`content/data/challenges/*.json\`, 30-day freshness window). A line is left out when its rule does not apply; nothing is written as filler.`, '')
  md.push('## How to override copy (single file: `content/data/verdict-copy.json`)', '', 'Writer edits go in this one file; no code change is needed. A key that is absent uses the generated lines. Overrides replace the whole list for that block. Do not add figures that are not in firms.json or the challenge captures.', '', '```json', JSON.stringify({ reviews: { 'ftmo-review': { verdict: 'One sentence shown under the score (null hides the line)', bestFor: ['line 1', 'line 2'], notFor: ['line 1', 'line 2'] } }, compares: { 'ftmo-vs-fundednext': { pickA: ['line for the alphabetically first firm (FTMO)', '…up to 3'], pickB: ['line for the second firm (FundedNext)', '…up to 3'] } } }, null, 2), '```', '', '- `reviews.<post slug>`: `verdict` (string replaces it, `null` hides it; default is the first sentence of the review\'s own "Verdict" section, skipped when it only describes the article, e.g. "This … review covers…"), `bestFor` and `notFor` (arrays; 2 shown).', '- `compares.<canonical matchup slug>` (alphabetical, e.g. `ftmo-vs-fundednext`): `pickA` / `pickB` (arrays; 3 shown). A is the firm named first in the slug.', '- Status markers below: **override** = the page shows writer copy from the JSON; **generated** = the page shows the data-built line.', '')
  md.push('## Reviews', '')
  for (const firm of firms.filter(f => f.reviewUrl?.startsWith('/blog/'))) {
    const slug = firm.reviewUrl.slice('/blog/'.length)
    const post = getPostBySlug(slug)
    if (!post) continue
    const products = fresh(firmSlug(firm.name))
    const copy = getReviewCopy(slug)
    const fit = review.buildFitLines(firm, products)
    const facts = review.buildVerdictFacts(firm, products)
    const verdict = copy.verdict === undefined ? firstVerdictSentence(post.content) : copy.verdict
    md.push(`### ${firm.reviewUrl} (${firm.name})`, '')
    md.push(`- Partner status: ${firm.affiliateUrl ? 'affiliate link (rel sponsored nofollow noopener)' : 'no affiliate link (rel nofollow noopener)'} · fresh products: ${products.length}`)
    if (!products.length) {
      md.push('- **Verdict box hidden (stale-data guard):** no product capture inside the 30-day window. The page shows the firm card (score, Trustpilot, CTA) and the source recheck notice until Tracker recaptures.', '')
      degraded.reviews.push(`${firm.reviewUrl}: stale data (no fresh product captures); verdict box hidden, firm card shown`)
      continue
    }
    md.push(`- Verdict line (${copy.verdict ? 'override' : 'review Verdict section, first sentence'}): ${verdict ?? '_none found; hidden_'}`)
    const block = (label, gen, ov) => {
      if (ov?.length) { md.push(`- ${label} (override): ${ov.map(l => `"${l}"`).join(' · ')}`); return }
      if (!gen.length) { md.push(`- ${label}: _no rule applies; hidden_`); return }
      for (const line of gen) md.push(`- ${label} (generated): "${line.text}" — fields: ${line.fields.join(', ')}`)
    }
    block('Best for', fit.best, copy.bestFor)
    block('Not for', fit.avoid, copy.notFor)
    md.push(`- Key facts: ${facts.length ? facts.map(f => `${f.label} = ${f.value}`).join(' · ') : '_none_'}`, '')
    const missing = []
    if (!verdict) missing.push('no verdict sentence')
    if (!copy.bestFor?.length && !fit.best.length) missing.push('no best-for line')
    if (!copy.notFor?.length && !fit.avoid.length) missing.push('no not-for line')
    if (missing.length) degraded.reviews.push(`${firm.reviewUrl}: ${missing.join('; ')}`)
  }
  md.push('## Comparisons (indexable)', '')
  let compareCount = 0, holdCount = 0
  for (const pair of getAllCanonicalPairs()) {
    const [sa, sb] = [firmSlug(pair.firmA.name), firmSlug(pair.firmB.name)]
    if (isSourceHoldFirm(sa) || isSourceHoldFirm(sb)) { holdCount++; continue }
    compareCount++
    const a = { firm: pair.firmA, products: fresh(sa) }, b = { firm: pair.firmB, products: fresh(sb) }
    const copy = getCompareCopy(pair.matchup)
    const picks = compare.buildPickLines(a, b)
    const avail = compare.comparePickAvailable(a, b, copy)
    md.push(`### /compare/${pair.matchup}`, '')
    for (const [key, side, ov] of [['a', a, copy.pickA], ['b', b, copy.pickB]]) {
      const label = `Pick ${side.firm.name} if`
      if (ov?.length) md.push(`- ${label} (override): ${ov.map(l => `"${l}"`).join(' · ')}`)
      else if (!picks[key].length) md.push(`- ${label}: _no rule applies; hidden_`)
      else for (const line of picks[key]) md.push(`- ${label} (generated): "${line.text}" — fields: ${line.fields.join(', ')}`)
    }
    md.push(`- Key facts table: ${avail.hasFacts ? 'shown' : '_hidden (no product facts)_'}`, '')
    const missing = []
    if (!avail.any) missing.push('nothing data-backed: pick block hidden, original evidence block kept expanded')
    else {
      if (!avail.hasFacts) missing.push('key facts hidden')
      if (!copy.pickA?.length && !picks.a.length) missing.push(`no pick lines for ${pair.firmA.name}`)
      if (!copy.pickB?.length && !picks.b.length) missing.push(`no pick lines for ${pair.firmB.name}`)
    }
    if (missing.length) degraded.compares.push(`/compare/${pair.matchup}: ${missing.join('; ')}`)
  }
  md.push('## Degraded pages', '', `Reviews (${degraded.reviews.length}):`, ...degraded.reviews.map(l => `- ${l}`), '', `Comparisons (${degraded.compares.length} of ${compareCount} indexable; ${holdCount} source-hold pairs are noindex and not listed):`, ...degraded.compares.map(l => `- ${l}`), '')
  fs.writeFileSync(out, md.join('\n'))
  console.log(JSON.stringify({ out, reviews: md.filter(l => l.startsWith('### /blog/')).length, compares: compareCount, holdCount, degradedReviews: degraded.reviews.length, degradedCompares: degraded.compares.length }))
} finally { hooks.deregister() }
