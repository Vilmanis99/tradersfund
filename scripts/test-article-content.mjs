/** Test article preparation against fixtures, every published source and actual page rendering. */
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

try {
  const { prepareArticleContent } = require(path.join(root, 'lib/articleContent.ts'))
  const Toc = require(path.join(root, 'components/TableOfContents.tsx')).default
  const fixture = '<div id="fees"></div><h2 class="rule">Fees</h2><h2 id="custom">Terms <em>&amp; rules</em></h2><h2>Fees</h2><h2 id="fees-2">Reserved</h2><h2 id="custom">Duplicate</h2><h2>Просадка</h2><h2>Multi\nline &#38; rules</h2><h2></h2><!-- <h2>Not a section</h2> -->'
  const prepared = prepareArticleContent(fixture)
  assert.deepEqual(prepared.headings.map(h => h.id), ['fees-3', 'custom', 'fees-4', 'fees-2', 'custom-2', 'просадка', 'multi-line-38-rules'])
  assert.equal(prepared.headings[1].text, 'Terms & rules', 'entity decoding avoids exposing HTML entities in the contents')
  assert.equal(prepared.headings.at(-1).text, 'Multi line & rules')
  assert(prepared.html.includes('<h2 class="rule" id="fees-3">'))
  assert.equal((prepared.html.match(/id="custom"/g) ?? []).length, 1)
  assert(prepared.html.includes('<!-- <h2>Not a section</h2> -->'), 'comments are not rewritten or promoted to navigation')
  const tocHtml = renderToStaticMarkup(React.createElement(Toc, { headings: prepared.headings }))
  assert(tocHtml.includes('aria-label="On this page"'))
  for (const heading of prepared.headings) assert(tocHtml.includes(`href="#${heading.id}"`), 'contents uses the actual prepared anchor')
  assert.equal(renderToStaticMarkup(React.createElement(Toc, { headings: prepared.headings.slice(0, 2) })), '', 'short articles do not get an unnecessary contents block')

  const table = '<table style="font-size:0.8rem"><caption>Verified fees</caption><tr><th>Fee</th><td>$123.45 &amp; EUR</td></tr></table>'
  const tables = html => [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(match => match[0])
  const enhancedTable = prepareArticleContent(`<h2>Costs &amp; fees</h2>${table}${table}`)
  assert.deepEqual(tables(enhancedTable.html), [table, table], 'table cells, captions, figures and source markup remain byte-identical')
  assert.equal((enhancedTable.html.match(/class="article-table-scroll" tabindex="0" role="region"/g) ?? []).length, 2)
  assert(enhancedTable.html.includes('Table 2: Costs &amp; fees. Scroll horizontally to see all columns.'))

  const { getAllPostData } = require(path.join(root, 'lib/mdx.ts'))
  const posts = getAllPostData()
  let tableCount = 0
  for (const post of posts) {
    const result = prepareArticleContent(post.content)
    assert.deepEqual(tables(result.html), tables(post.content), `${post.slug}: all original table content is preserved`)
    const headingTags = [...result.html.matchAll(/<h2\b([^>]*)>/gi)]
    const ids = headingTags.flatMap(match => [...match[1].matchAll(/\sid="([^"]+)"/g)].map(id => id[1]))
    assert.equal(new Set(ids).size, ids.length, `${post.slug}: no duplicate heading anchors`)
    for (const tag of headingTags) assert((tag[1].match(/\sid=/gi) ?? []).length <= 1, `${post.slug}: each heading has at most one id attribute`)
    const originalAnchors = [...post.content.matchAll(/<h2\b[^>]*\sid="([^"]+)"/gi)].map(match => match[1])
    for (const id of new Set(originalAnchors)) assert(ids.includes(id), `${post.slug}: authored deep links remain valid`)
    const count = tables(post.content).length
    assert.equal((result.html.match(/class="article-table-scroll"/g) ?? []).length, count, `${post.slug}: every table has a focusable scroll container`)
    tableCount += count
  }

  const BlogPage = require(path.join(root, 'app/blog/[slug]/page.tsx')).default
  const nonReview = posts.find(post => !post.slug.includes('review') && post.author === 'Edris Derakhshi' && prepareArticleContent(post.content).headings.length >= 3)
  assert(nonReview, 'published non-review fixture available')
  for (const slug of ['fundednext-review', 'crypto-fund-trader-review', nonReview.slug]) {
    const html = renderToStaticMarkup(await BlogPage({ params: Promise.resolve({ slug }) }))
    const post = posts.find(candidate => candidate.slug === slug)
    const prepared = prepareArticleContent(post.content)
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
    assert(html.includes('class="prose post-prose"'))
    assert(html.includes('href="/authors/edris-derakhshi"'), 'existing author profile is reachable')
    assert(html.includes('href="/prop-firm-challenges"'), 'article sidebar leads to working programme comparison')
    for (const heading of prepared.headings) assert(html.includes(`href="#${heading.id}"`), 'actual page wires the prepared navigation')
    assert.equal((html.match(/class="article-table-scroll"/g) ?? []).length, tables(post.content).length)
    if (slug === 'fundednext-review') assert(html.includes('/go/fundednext?from=review-cta') && html.includes('sponsored nofollow noopener'), 'partner attribution and disclosure remain in the actual review')
  }
  const staleReviewHtml = renderToStaticMarkup(await BlogPage({ params: Promise.resolve({ slug: 'the-funded-trader-review' }) }))
  assert(staleReviewHtml.includes('data-review-source-status="recapture-required"'), 'stale firm review shows a source recheck warning')
  const freshReviewHtml = renderToStaticMarkup(await BlogPage({ params: Promise.resolve({ slug: 'fundednext-review' }) }))
  assert(!freshReviewHtml.includes('data-review-source-status="recapture-required"'), 'fresh partner review does not show a stale warning')
  const css = fs.readFileSync(path.join(root, 'app/light-platform.css'), 'utf8')
  assert(css.includes('font-size: 1.125rem') && css.includes('html .post-prose > :is(p, ul, ol, h2, h3, h4, blockquote) { max-width: 68ch; }'))
  assert(css.includes('.article-table-scroll { max-width: 100%; overflow-x: auto;'))
  assert(css.includes('html .article-toc a, html .ru-review-toc a { display: inline-flex; align-items: center; min-height: 44px;'))
  console.log(`Article reading checks passed: ${posts.length} published sources, ${tableCount} unchanged tables, anchor and freshness fixtures. Browser layout is not asserted.`)
} finally { hooks.deregister() }
