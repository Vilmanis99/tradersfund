/**
 * Prints the /best-prop-firms-in-india snapshot counts as JSON, computed with the same lib
 * functions components/LandingPage.tsx uses (buildLandingPayload + buildIndiaMatcherFirms),
 * so release-crawl.mjs never hard-codes a firm or product total:
 *   { qualifying, tracked, products, changes }
 * qualifying = firms passing every India gate (LandingPage `count`), tracked = firms.json length
 * (LandingPage `allFirms.length`), products = indiaProducts.length, changes = indiaChangeCount.
 * Loader hooks are the ones scripts/gen-share-cards.mjs uses ('@/' alias, TS transpile, server-only stub).
 * Runs as a child process so the hooks never touch the crawl's own ESM imports.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'india:server-only', shortCircuit: true }
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
    if (url === 'india:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const { buildIndiaMatcherFirms } = require(path.join(root, 'lib/indiaMatcher.ts'))
const { buildLandingPayload, getLandingBySlug } = require(path.join(root, 'lib/landings.ts'))

export function indiaLandingCounts() {
  const landing = getLandingBySlug('best-prop-firms-in-india')
  if (!landing) throw new Error('landing best-prop-firms-in-india not found')
  // Same expressions as components/LandingPage.tsx.
  const { ranked, count, allFirms } = buildLandingPayload(landing)
  const indiaProducts = buildIndiaMatcherFirms(ranked.map(item => item.firm)).flatMap(firm => firm.products)
  const changes = new Set(indiaProducts.flatMap(product => product.changeSignals.map(signal => signal.id))).size
  return { qualifying: count, tracked: allFirms.length, products: indiaProducts.length, changes }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(indiaLandingCounts())}\n`)
}
