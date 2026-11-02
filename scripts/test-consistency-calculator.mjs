/** Unit tests for consistency calculator math and basis handling. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'test:server-only', shortCircuit: true }
    if (specifier === 'next/link') return { url: 'test:next-link', shortCircuit: true }
    const local = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:')
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : null
    if (local && local.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'test:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url === 'test:next-link') {
      return {
        format: 'commonjs',
        shortCircuit: true,
        source: 'const React = require("react"); module.exports = ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children)',
      }
    }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return {
        format: 'commonjs',
        shortCircuit: true,
        source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
          fileName: fileURLToPath(url),
          compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
        }).outputText,
      }
    }
    return nextLoad(url, context)
  },
})

const {
  calculateConsistencyShare,
  basisFromChallenge,
  formatShare,
} = require(path.join(root, 'lib/consistencyCalculator.ts'))
const { splitArticleDiagrams } = require(path.join(root, 'lib/articleContent.ts'))
const ConsistencyCalculator = require(path.join(root, 'components/ConsistencyCalculator.tsx')).default
const { buildConsistencyCalculatorPresets } = require(path.join(root, 'lib/consistencyCalculatorPresets.ts'))
const { getAllChallenges } = require(path.join(root, 'lib/firms.ts'))

/** Noon UTC the day after the newest challenge basis/source check date — survives Tracker refreshes. */
function presetTestNow() {
  const dates = getAllChallenges()
    .flatMap(c => [c.consistencyBasisCheckedAt, c.sourceCapturedAt])
    .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  const max = dates.sort().at(-1) || '2026-11-02'
  const [y, m, d] = max.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0))
}

// FTMO worked example from EN Writer copy: 2400/3600 at 50% → 66.7%, need 1200 more
const ftmo = calculateConsistencyShare({ bestDay: 2400, applicable: 3600, limitPct: 50 })
assert.ok(ftmo)
assert.equal(formatShare(ftmo.sharePct), '66.7%')
assert.equal(ftmo.pass, false)
assert.equal(ftmo.requiredApplicable, 4800)
assert.equal(ftmo.extraNeeded, 1200)

// Pass case
const pass = calculateConsistencyShare({ bestDay: 1000, applicable: 4000, limitPct: 30 })
assert.ok(pass)
assert.equal(pass.pass, true)
assert.equal(pass.extraNeeded, 0)

// Strict less-than (Apex style): exactly 50% fails
const apexEdge = calculateConsistencyShare({ bestDay: 500, applicable: 1000, limitPct: 50, inequality: 'lt' })
assert.ok(apexEdge)
assert.equal(apexEdge.pass, false)
const apexPass = calculateConsistencyShare({ bestDay: 499, applicable: 1000, limitPct: 50, inequality: 'lt' })
assert.ok(apexPass)
assert.equal(apexPass.pass, true)

// Invalid inputs
assert.equal(calculateConsistencyShare({ bestDay: 100, applicable: 0, limitPct: 50 }), null)
assert.equal(calculateConsistencyShare({ bestDay: -1, applicable: 100, limitPct: 50 }), null)
assert.equal(calculateConsistencyShare({ bestDay: 100, applicable: 100, limitPct: 0 }), null)

// Basis mapping: null never becomes total-profit
assert.equal(basisFromChallenge(null), 'not-stated')
assert.equal(basisFromChallenge(undefined), 'not-stated')
assert.equal(basisFromChallenge('total-profit'), 'total-profit')
assert.equal(basisFromChallenge('payout-cycle-profit'), 'payout-cycle-profit')
assert.equal(basisFromChallenge('profit-target'), 'profit-target')

// Slot registration
const segments = splitArticleDiagrams('<p>x</p><div data-article-diagram="consistency-calculator"></div><p>y</p>')
assert.deepEqual(segments.map(s => s.kind), ['html', 'diagram', 'html'])
assert.equal(segments[1].name, 'consistency-calculator')

const post = fs.readFileSync(path.join(root, 'content/posts/what-is-prop-firm-consistency-rule.md'), 'utf8')
assert.match(post, /data-article-diagram="consistency-calculator"/)
assert.match(post, /^title: "What Is the Prop Firm Consistency Rule\? Formulas and Examples \(2026\)"$/m)
assert.doesNotMatch(post, /Prop Firm Consistency Rule Calculator \(\+ How the Rule Works\)/)

// Presets from live data (BrightFunded first; no "Tracker" in labels).
// Clock is derived from challenge check dates so a Tracker refresh with a newer
// consistencyBasisCheckedAt cannot make isBasisFresh reject presets (ageDays < 0).
const { presets, defaultPreset, gaps } = buildConsistencyCalculatorPresets(presetTestNow())
assert.ok(presets.length >= 3, `expected curated presets, got ${presets.length}`)
assert.equal(presets[0].id, 'bright-funded-no-rule')
assert.ok(presets.some(p => p.id === 'ftmo-1-step'))
assert.ok(presets.some(p => p.id === 'fundingpips-2-step-standard'))
assert.ok(presets.some(p => p.id === 'topstep-combine'))
assert.ok(presets.some(p => p.id === 'apex-pa-payout'))
assert.ok(presets.some(p => p.id === 'lucid-flex'))
assert.ok(presets.some(p => p.id === 'lucid-daily'))
for (const p of presets) {
  assert.doesNotMatch(JSON.stringify(p), /Tracker/i)
  assert.doesNotMatch(JSON.stringify(p), /consistencyBasis/)
  assert.doesNotMatch(JSON.stringify(p), /"notes":/)
}
const lucidFlex = presets.find(p => p.id === 'lucid-flex')
assert.equal(lucidFlex.limitPct, 40)
assert.equal(lucidFlex.basis, 'total-profit')
const lucidDaily = presets.find(p => p.id === 'lucid-daily')
assert.equal(lucidDaily.limitPct, 40)
assert.equal(lucidDaily.basis, 'total-profit')

const topstep = presets.find(p => p.id === 'topstep-combine')
assert.equal(topstep.basis, 'not-stated')
const ftmoPreset = presets.find(p => p.id === 'ftmo-1-step')
assert.equal(ftmoPreset.basis, 'total-profit')
assert.equal(ftmoPreset.limitPct, 50)
const apex = presets.find(p => p.id === 'apex-pa-payout')
assert.equal(apex.limitPct, 50)
assert.equal(apex.inequality, 'lt')
assert.equal(apex.basis, 'not-stated') // until Tracker stores PA consistencyBasis*
assert.match(apex.basisNote || '', /Apex.s help page names the PA profit base/)
assert.doesNotMatch(apex.basisNote || '', /challenge basis fields|primary basis fields|Tracker|firms\.json|consistencyBasis/)
const topstepNote = presets.find(p => p.id === 'topstep-combine')
assert.match(topstepNote.stageNote || '', /left empty rather than guessed/)
assert.doesNotMatch(topstepNote.stageNote || '', /primary basis fields|challenge basis fields|Tracker|consistencyBasis/)
assert.doesNotMatch(lucidFlex.basisNote || '', /does not state a single profit base/)
assert.doesNotMatch(lucidDaily.basisNote || '', /does not state a single profit base/)
assert.equal(lucidFlex.basisNote, undefined)
assert.equal(lucidDaily.basisNote, undefined)
assert.ok(gaps.some(g => /Apex PA 50%/.test(g)))
assert.equal(defaultPreset, 'ftmo-1-step')

// No internal jargon in any rendered preset string passed to the client
for (const p of presets) {
  const blob = JSON.stringify(p)
  assert.doesNotMatch(blob, /primary basis fields|challenge basis fields|firms\.json|consistencyBasisCheckedAt|consistencyRulePct/)
}

// Client component renders without firm-internal keys
const html = renderToStaticMarkup(React.createElement(ConsistencyCalculator, {
  presets,
  defaultPreset,
}))
assert.match(html, /data-article-diagram-rendered="consistency-calculator"/)
assert.match(html, /aria-live="polite"/)
assert.doesNotMatch(html, /consistencyBasis|previousDiscountCode|"notes":|\/workspace\//)
assert.doesNotMatch(html, /Tracker/)

console.log(`test:consistency-calculator ok (${presets.length} presets, ${gaps.length} data gaps noted)`)
