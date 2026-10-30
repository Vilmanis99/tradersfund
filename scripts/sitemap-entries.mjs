/**
 * Loads app/sitemap.ts outside Next (same loader hooks as scripts/gen-share-cards.mjs:
 * '@/' alias, TS transpile, server-only stub) and prints its entries as JSON:
 * [{ url, lastModified (ISO), languages, published, sources }]. Used by test:sitemap-lastmod.
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
    if (specifier === 'server-only') return { url: 'sitemap:server-only', shortCircuit: true }
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
    if (url === 'sitemap:server-only') return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return { format: 'commonjs', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
        fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})

/** require() a repo TS module through the hooks above (fresh process state per call site). */
export function requireTs(relativePath) {
  return require(path.join(root, relativePath))
}

export function sitemapEntries() {
  const sitemap = require(path.join(root, 'app/sitemap.ts')).default
  const { getSitemapProvenance } = require(path.join(root, 'lib/sitemapLastmod.ts'))
  const entries = sitemap()
  const provenance = getSitemapProvenance()
  return entries.map(entry => ({
    url: entry.url,
    lastModified: entry.lastModified instanceof Date ? entry.lastModified.toISOString() : String(entry.lastModified),
    languages: entry.alternates?.languages ?? null,
    published: provenance.get(entry.url)?.published ?? null,
    sources: provenance.get(entry.url)?.sources ?? null,
    editorial: provenance.get(entry.url)?.editorial ?? null,
  }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(sitemapEntries(), null, 1)}\n`)
}
