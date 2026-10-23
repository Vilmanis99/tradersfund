/**
 * Regenerate the static share cards whose numbers come from content/data/challenge-watch.json:
 *   app/prop-firm-challenge-changes/opengraph-image.png (+ .alt.txt, SOCIAL_CARD_* constants)
 *   app/best-prop-firms-in-india/challenge-changes/opengraph-image.png (+ .alt.txt, SOCIAL_CARD_* constants)
 * Counts are computed with the same lib functions the pages use; the pages throw at render time
 * if their constants drift, so run this (npm run gen:share-cards) after any watch-status change.
 * --check only reports drift and exits 1 without writing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'gen:server-only', shortCircuit: true }
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
    if (url === 'gen:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

const checkOnly = process.argv.includes('--check')
const { getChallengeWatchEntries } = require(path.join(root, 'lib/challengeWatch.ts'))
const { buildIndiaMatcherFirms } = require(path.join(root, 'lib/indiaMatcher.ts'))
const { buildLandingPayload, getLandingBySlug } = require(path.join(root, 'lib/landings.ts'))

const all = getChallengeWatchEntries()
const count = entries => ({
  entries: entries.length,
  firms: new Set(entries.map(entry => entry.firmSlug)).size,
  verified: entries.filter(entry => entry.status === 'verified').length,
  watches: entries.filter(entry => entry.status === 'watch').length,
})
const global = count(all)

// Same selection as app/best-prop-firms-in-india/challenge-changes/page.tsx.
const landing = getLandingBySlug('best-prop-firms-in-india')
const indiaFirms = buildIndiaMatcherFirms(buildLandingPayload(landing).ranked.map(entry => entry.firm))
const firmBySlug = new Map(indiaFirms.map(firm => [firm.slug, firm]))
const indiaEntries = all.flatMap(entry => {
  const firm = firmBySlug.get(entry.firmSlug)
  const products = firm ? firm.products.filter(product => entry.productSlugs.includes(product.slug)) : []
  return products.length ? [{ ...entry, productKeys: products.map(product => `${firm.slug}:${product.slug}`) }] : []
})
const india = { ...count(indiaEntries), products: new Set(indiaEntries.flatMap(entry => entry.productKeys)).size }

const cards = [
  {
    dir: 'app/prop-firm-challenge-changes',
    constants: { ENTRY: global.entries, FIRM: global.firms, VERIFIED: global.verified, WATCH: global.watches },
    alt: `Prop-firm challenge changes: ${global.entries} dated updates, ${global.verified} verified changes and ${global.watches} open watches.`,
    svg: card({
      kicker: 'TRADERS FUND HUB', title: ['Prop-firm challenge', 'changes, tracked.'],
      subtitle: 'First-party rules, product moves and open watches',
      stats: [[global.entries, 'DATED UPDATES'], [global.verified, 'VERIFIED'], [global.watches, 'OPEN WATCHES']],
      footer: 'tradersfundhub.com/prop-firm-challenge-changes',
    }),
  },
  {
    dir: 'app/best-prop-firms-in-india/challenge-changes',
    constants: { ENTRY: india.entries, FIRM: india.firms, PRODUCT: india.products, VERIFIED: india.verified, WATCH: india.watches },
    alt: `India Challenge Changes — ${india.entries} updates across ${india.products} products and ${india.firms} firms, separated into ${india.verified} verified changes and ${india.watches} open watches.`,
    svg: card({
      kicker: 'TRADERS FUND HUB · INDIA', title: ['India challenge changes,', 'with source evidence.'],
      subtitle: `${india.entries} dated updates across ${india.products} products and ${india.firms} screened firms`,
      stats: [[india.entries, 'DATED UPDATES'], [india.verified, 'VERIFIED'], [india.watches, 'OPEN WATCHES']],
      footer: 'India country and RBI screening; first-party sources and open watches',
    }),
  },
]

function card({ kicker, title, subtitle, stats, footer }) {
  const x = [120, 640, 1160]
  return `<svg width="1800" height="945" viewBox="0 0 1800 945" xmlns="http://www.w3.org/2000/svg">
  <rect width="1800" height="945" fill="#f5faf9"/>
  <rect width="28" height="945" fill="#15948f"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="120" y="170" font-size="36" font-weight="700" letter-spacing="9" fill="#15948f">${kicker}</text>
    <text x="120" y="290" font-size="76" font-weight="700" fill="#142e39">${title[0]}</text>
    <text x="120" y="380" font-size="76" font-weight="700" fill="#142e39">${title[1]}</text>
    <text x="120" y="455" font-size="30" fill="#58727d">${subtitle}</text>
    <line x1="120" y1="535" x2="1680" y2="535" stroke="#cfe2e2" stroke-width="3"/>
${stats.map(([value, label], index) => `    <text x="${x[index]}" y="650" font-size="92" font-weight="700" fill="#15948f">${value}</text>
    <text x="${x[index]}" y="700" font-size="28" fill="#58727d">${label}</text>`).join('\n')}
    <text x="120" y="855" font-size="28" fill="#58727d">${footer}</text>
  </g>
</svg>`
}

let drift = 0
for (const item of cards) {
  const pageFile = path.join(root, item.dir, 'page.tsx')
  let page = fs.readFileSync(pageFile, 'utf8')
  for (const [name, value] of Object.entries(item.constants)) {
    const pattern = new RegExp(`(const SOCIAL_CARD_${name}_COUNT = )\\d+`)
    if (!pattern.test(page)) throw new Error(`${item.dir}: SOCIAL_CARD_${name}_COUNT is missing`)
    if (page.match(pattern)[0] !== `const SOCIAL_CARD_${name}_COUNT = ${value}`) drift++
    page = page.replace(pattern, `$1${value}`)
  }
  const altFile = path.join(root, item.dir, 'opengraph-image.alt.txt')
  const oldAlt = fs.existsSync(altFile) ? fs.readFileSync(altFile, 'utf8').trim() : ''
  if (oldAlt !== item.alt) drift++
  const summary = `${item.dir}: ${JSON.stringify(item.constants)}`
  if (checkOnly) { console.log(summary); continue }
  fs.writeFileSync(pageFile, page)
  fs.writeFileSync(altFile, `${item.alt}\n`)
  await sharp(Buffer.from(item.svg)).png({ compressionLevel: 9 }).toFile(path.join(root, item.dir, 'opengraph-image.png'))
  console.log(`Generated ${summary}`)
}
if (checkOnly && drift) {
  console.error(`${drift} share-card value(s) are out of date; run npm run gen:share-cards`)
  process.exit(1)
}
