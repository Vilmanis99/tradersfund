#!/usr/bin/env node
/**
 * RU access badge lastmod sources: badge UI files are tracked, and every /ru page
 * that imports RuAccessBadge / RuGoLink / RuVerdict / RuAllReviews attaches them.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { sourceSpecs, RU_ACCESS_BADGE_UI_FILES } from './sitemap-lastmod-sources.mjs'

const root = process.cwd()
const require = createRequire(import.meta.url)

for (const file of RU_ACCESS_BADGE_UI_FILES) {
  assert(fs.existsSync(file), `badge UI file missing: ${file}`)
}
const tracked = new Set(sourceSpecs().map(s => s.path))
for (const file of RU_ACCESS_BADGE_UI_FILES) {
  assert(tracked.has(file), `sourceSpecs must track ${file}`)
}

const { requireTs } = await import('./sitemap-entries.mjs')
const {
  RU_ACCESS_BADGE_SOURCES,
  ruPageRendersAccessBadge,
  russianRouteSources,
  fileSource,
} = requireTs('lib/sitemapLastmod.ts')

assert.equal(RU_ACCESS_BADGE_SOURCES.length, RU_ACCESS_BADGE_UI_FILES.length)
for (const file of RU_ACCESS_BADGE_UI_FILES) {
  assert(RU_ACCESS_BADGE_SOURCES.includes(fileSource(file)), `RU_ACCESS_BADGE_SOURCES missing file:${file}`)
}

const badgeImportRe =
  /RuAccessBadge(?:View)?|from ['"]@\/components\/RuGoLink['"]|from ['"]@\/components\/RuVerdict['"]|from ['"]@\/components\/RuAllReviews['"]/

function listRuPageRoutes() {
  const out = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        // route groups — still walk
      }
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === 'page.tsx') {
        const rel = path.relative(path.join(root, 'app/ru'), path.dirname(full)).split(path.sep).join('/')
        // Skip Next.js route-group fallback catch-alls from the sitemap set
        if (rel.includes('(')) continue
        out.push(rel === '' ? '/ru' : `/ru/${rel}`)
      }
    }
  }
  walk(path.join(root, 'app/ru'))
  return out.sort()
}

const routes = listRuPageRoutes()
const expectedYes = []
const expectedNo = []
for (const route of routes) {
  const segment = route.replace(/^\/ru\/?/, '')
  const pageFile = segment
    ? path.join(root, 'app/ru', segment, 'page.tsx')
    : path.join(root, 'app/ru/page.tsx')
  const text = fs.readFileSync(pageFile, 'utf8')
  if (badgeImportRe.test(text)) expectedYes.push(route)
  else expectedNo.push(route)
}

assert(expectedYes.length >= 20, `expected ≥20 badge-rendering RU pages, got ${expectedYes.length}`)
for (const route of expectedYes) {
  assert.equal(ruPageRendersAccessBadge(route), true, `${route} should detect badge import`)
}
for (const route of expectedNo) {
  assert.equal(ruPageRendersAccessBadge(route), false, `${route} should not detect badge import`)
}

// After a regen the badge keys exist in the manifest; before regen they may not.
// Attach check: when keys are present, russianRouteSources must include them for badge pages.
const manifest = JSON.parse(fs.readFileSync('content/data/sitemap-lastmod.json', 'utf8'))
const badgeKeysPresent = RU_ACCESS_BADGE_SOURCES.every(key => key in (manifest.sources ?? {}))
if (badgeKeysPresent) {
  for (const route of expectedYes) {
    const sources = russianRouteSources(route)
    for (const key of RU_ACCESS_BADGE_SOURCES) {
      assert(sources.includes(key), `${route} missing ${key} in russianRouteSources`)
    }
  }
  for (const route of expectedNo) {
    const sources = russianRouteSources(route)
    for (const key of RU_ACCESS_BADGE_SOURCES) {
      assert(!sources.includes(key), `${route} must not attach ${key}`)
    }
  }
  console.log(`ru-access-badge-lastmod-sources: ${expectedYes.length} badge routes attach, ${expectedNo.length} skip (manifest keys present)`)
} else {
  console.log(`ru-access-badge-lastmod-sources: ${expectedYes.length} badge routes detected, ${expectedNo.length} skip (manifest keys not regenerated yet — code path only)`)
}
