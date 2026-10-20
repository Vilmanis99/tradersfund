/** Consistency scope fields: optional, validated, and the only way a generated line names a consistency rule. */
import assert from 'node:assert/strict'
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

const scope = require(path.join(root, 'lib/consistencyScope.ts'))
const review = require(path.join(root, 'components/ReviewVerdictBox.tsx'))
const compare = require(path.join(root, 'components/ComparePickVerdict.tsx'))
const dir = path.join(root, 'content/data/challenges')

// 1. Existing data (no scope fields yet) still validates and names no rule.
let products = 0
for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
  for (const product of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))) {
    products++
    assert.deepEqual(scope.consistencyFieldProblems(product, `${file}:${product.productSlug}`), [], `${file}:${product.productSlug} validates`)
    if (product.consistencyScope === undefined && product.consistencyRules === undefined) {
      assert.deepEqual(scope.scopedConsistencyRules(product), [], `${product.productSlug}: no scope, no rule line`)
    }
  }
}
assert.ok(products > 50, 'read the challenge captures')

// 2. Validation of the new fields.
const base = { productSlug: 'one-step', productName: '1-Step', consistencyRulePct: 50, sourceUrl: 'https://example.com/rules' }
assert.deepEqual(scope.consistencyFieldProblems({ ...base, consistencyScope: 'evaluation' }), [])
assert.match(scope.consistencyFieldProblems({ ...base, consistencyScope: 'payout' }).join(), /consistencyScope must be one of/)
assert.match(scope.consistencyFieldProblems({ ...base, consistencyRules: [{ percent: 0, scope: 'funded', sourceUrl: 'https://x.test' }] }).join(), /percent must be above 0/)
assert.match(scope.consistencyFieldProblems({ ...base, consistencyRules: [{ percent: 35, scope: 'funded' }] }).join(), /sourceUrl must be an http/)
assert.match(scope.consistencyFieldProblems({ ...base, consistencyRuleApplies: false, consistencyRules: [{ percent: 35, scope: 'funded', sourceUrl: 'https://x.test' }] }).join(), /cannot also list/)

// 3. Wording and precedence.
assert.equal(scope.consistencyRulePhrase({ percent: 50, scope: 'evaluation', sourceUrl: 'https://x.test' }), '50% consistency rule during evaluation')
assert.equal(scope.consistencyRulePhrase({ percent: 35, scope: 'funded', appliesTo: 'On-Demand payouts', sourceUrl: 'https://x.test' }), '35% consistency rule on On-Demand payouts')
assert.deepEqual(scope.scopedConsistencyRules(base), [], 'a bare consistencyRulePct stays silent')
assert.deepEqual(scope.scopedConsistencyRules({ ...base, consistencyScope: 'evaluation' }).map(rule => rule.percent), [50])
assert.deepEqual(scope.scopedConsistencyRules({ ...base, consistencyScope: 'evaluation', consistencyRules: [{ percent: 35, scope: 'funded', appliesTo: 'On-Demand payouts', sourceUrl: 'https://x.test' }] }).map(rule => rule.percent), [35], 'consistencyRules wins')

// 4. Templates: silent without scope, scoped wording with it.
const firm = { name: 'Example Firm', platforms: ['MT5'], score: 8 }
const product = (extra) => ({ firmSlug: 'example-firm', productName: 'Example Firm 1-Step', productSlug: 'one-step', phases: 1, accountSizes: [{ sizeUsd: 100000, priceUsd: 500, refundable: null }], profitTargets: { phase1: 10 }, dailyLossPct: 3, maxLossPct: 6, drawdownType: 'trailing', minTradingDays: 0, maxTradingDays: null, profitSplitPct: 80, payoutFirstDays: 14, payoutFrequency: 'bi-weekly', rules: { news: true, weekend: true, overnight: true, ea: true, copyTrading: true }, assetClass: 'futures', sourceUrl: 'https://example.com/rules', sourceCapturedAt: '2026-10-19', consistencyRulePct: 50, ...extra })
const fitText = (p) => review.buildFitLines(firm, [p]).avoid.map(line => line.text).join(' | ')
assert.doesNotMatch(fitText(product({})), /consisten/i, 'review: unscoped rule is silent')
assert.match(fitText(product({ consistencyScope: 'evaluation' })), /Traders who dislike consistency rules: 1-Step has a 50% consistency rule during evaluation/)
assert.match(fitText(product({ consistencyRules: [{ percent: 35, scope: 'funded', appliesTo: 'On-Demand payouts', sourceUrl: 'https://x.test' }] })), /35% consistency rule on On-Demand payouts/)

const other = { name: 'Other Firm', platforms: ['MT5'], score: 7 }
const free = { ...product({ consistencyRulePct: null, consistencyRuleApplies: false }), firmSlug: 'other-firm', productName: 'Other Firm Swing', productSlug: 'swing' }
const pick = (p) => compare.buildPickLines({ firm: other, products: [free] }, { firm, products: [p] }).a.map(line => line.text).join(' | ')
assert.doesNotMatch(pick(product({})), /consisten/i, 'compare: unscoped rule is silent')
assert.match(pick(product({ consistencyScope: 'evaluation' })), /you'd rather avoid a consistency rule: Other Firm Swing records none; 1-Step: 50% consistency rule during evaluation/)

// 5. Possessives.
assert.equal(compare.possessive('E8 Markets'), "E8 Markets'")
assert.equal(compare.possessive('FundingPips'), "FundingPips'")
assert.equal(compare.possessive('FTMO'), "FTMO's")

hooks.deregister?.()
console.log(`consistency scope: ${products} products validate; templates silent without scope`)
