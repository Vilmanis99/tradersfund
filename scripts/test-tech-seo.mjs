#!/usr/bin/env node
// Tech SEO guards (2026-10-20): mixed-case /ru redirects, compare indexing,
// and the consent-gated Yandex Metrica slot. Static checks; no server needed.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')
const { russianLowercasePath } = await import(path.join(root, 'lib/russianPathCase.ts'))

// 1. Lowercase redirect target for mixed-case Russian paths, never a loop.
for (const [input, expected] of [
  ['/RU/obzor-ftmo', '/ru/obzor-ftmo'],
  ['/Ru/luchshie-prop-firmy', '/ru/luchshie-prop-firmy'],
  ['/rU', '/ru'],
  ['/ru/OBZOR-FTMO', '/ru/obzor-ftmo'],
  ['/ru/obzor-ftmo', null],
  ['/ru', null],
  ['/ru/%D0%BF', null],
  ['/go/FTMO', null],
  ['/blog/FTMO-review', null],
  ['/RUS/x', null],
]) {
  const actual = russianLowercasePath(input)
  assert.equal(actual, expected, `${input} -> ${expected}`)
  if (actual) assert.equal(russianLowercasePath(actual), null, `${actual} is a fixed point`)
}
const proxy = read('proxy.ts')
assert(proxy.includes('NextResponse.redirect(url, 308)'), 'mixed-case /ru is a permanent 308')
assert(!/matcher:[^\n]*go/.test(proxy), 'the proxy never matches /go/')

// 2. Compare pages: no change. Robots stay as on main (noindex only for a
// source-hold firm) and the sitemap keeps listing every indexable pair;
// scripts/audit-sitemap.mjs enforces that parity against a running build.
// Data freshness does not affect compare indexing (decision 2026-10-20).
assert(!/hasData[^\n]*robots|robots[^\n]*hasData/.test(read('app/compare/[matchup]/page.tsx')), 'compare robots do not depend on data freshness')

// 3. Yandex Metrica: env-driven, consent-gated, Russian pages only, Webvisor off by default.
const provider = read('components/AnalyticsProvider.tsx')
const layoutSources = ['app/layout.tsx', 'app/(en)/layout.tsx', 'app/ru/layout.tsx', 'components/SiteDocument.tsx']
  .map(file => { try { return read(file) } catch { return '' } }).join('\n')
assert(layoutSources.includes('process.env.NEXT_PUBLIC_YANDEX_METRICA_ID'), 'counter ID comes from the env')
assert(provider.includes("consent === 'granted' && yandexMetricaActive && ("), 'tag.js renders only after consent')
assert(provider.includes("Boolean(yandexMetricaId) && pageLocale === 'ru'"), 'Metrica is limited to Russian pages and needs a valid ID')
assert(provider.includes('yandexMetricaWebvisor = false'), 'Webvisor is off by default')
assert(provider.includes('webvisor: yandexMetricaWebvisor'), 'Webvisor follows the explicit flag')

console.log('Tech SEO guards passed: /ru lowercase redirects, compare robots unchanged, Yandex Metrica gate.')
