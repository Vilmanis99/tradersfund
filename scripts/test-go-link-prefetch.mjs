/**
 * /go/<firm> is a Route Handler that records a click and 302s to the partner.
 * A prefetched next/link would hit it on view and create fake clicks, so every
 * Link whose href can point at /go/ must have prefetch={false}, or go through
 * SafeLink / RuGoLink (which force it off), or be a plain <a>.
 *
 * Scans every .tsx under app/ and components/ with the TypeScript parser.
 * An href "can point at /go/" when its source text contains "/go/" or calls a
 * known /go/ href builder (GO_HREF_HINTS).
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = new URL('..', import.meta.url).pathname
const SAFE_WRAPPERS = { 'components/SafeLink': 'SafeLink', 'components/RuGoLink': 'RuGoLink' }
const GO_HREF_HINTS = [/\/go\//, /\bgoHref\b/, /\bgoPath\b/, /\bgoLink\b/, /\bgoUrl\b/, /\bctaHref\b/, /\boutboundHref\b/, /\baffiliateHref\b/]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.tsx')) out.push(full)
  }
  return out
}

const failures = []
let checked = 0
for (const file of [...walk(join(root, 'app')), ...walk(join(root, 'components'))]) {
  const rel = relative(root, file)
  if (rel === 'components/SafeLink.tsx') continue
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const nextLinkNames = new Set()
  const ruGoNames = new Set()
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue
    const from = stmt.moduleSpecifier.text
    const clause = stmt.importClause
    if (from === 'next/link' && clause.name) nextLinkNames.add(clause.name.text)
    if (/components\/RuGoLink$|\.\/RuGoLink$/.test(from) && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) if ((el.propertyName ?? el.name).text === 'RuGoLink') ruGoNames.add(el.name.text)
    }
  }
  if (rel === 'components/RuGoLink.tsx') {
    // The wrapper itself must not use next/link directly.
    assert.equal(nextLinkNames.size, 0, 'RuGoLink renders through SafeLink, not next/link')
  }
  if (!nextLinkNames.size) continue
  const visit = node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source)
      if (nextLinkNames.has(tag)) {
        const attrs = node.attributes.properties
        const href = attrs.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'href')
        const spread = attrs.some(attr => ts.isJsxSpreadAttribute(attr))
        const hrefText = href?.initializer?.getText(source) ?? ''
        if (GO_HREF_HINTS.some(re => re.test(hrefText)) || (spread && !href)) {
          checked++
          const prefetch = attrs.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'prefetch')
          if (prefetch?.initializer?.getText(source) !== '{false}') {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
            failures.push(`${rel}:${line + 1} <${tag} href=${hrefText || '{...spread}'}> lacks prefetch={false}`)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

assert.deepEqual(failures, [], `next/link to /go/ must not prefetch:\n${failures.join('\n')}`)
console.log(`go link prefetch: ok (${checked} next/link elements with a /go/ href all set prefetch={false}; SafeLink/RuGoLink force it)`)
