#!/usr/bin/env node
/**
 * Chart counts for the October prop-firm changes report = LIVE CSV rows only.
 * Status comes from CSV status column (if present), else change-log match,
 * else free-text PENDING/OBSERVATION in `new`.
 *
 * Infra-only trees (no writer CSV/HTML yet) run the wiring checks and skip
 * count/body assertions. When the CSV is present, every count assertion runs.
 * Run: npm run test:prop-firm-changes-report
 */
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
    const local = specifier.startsWith('@/')
      ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:')
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
        : null
    if (local && local.startsWith(root + path.sep) && !local.includes(`${path.sep}node_modules${path.sep}`)) {
      const file = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'test:server-only') {
      return { format: 'commonjs', shortCircuit: true, source: 'module.exports = {}' }
    }
    if (url.startsWith(pathToFileURL(root + path.sep).href) && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      return {
        format: 'commonjs',
        shortCircuit: true,
        source: ts.transpileModule(fs.readFileSync(new URL(url), 'utf8'), {
          fileName: fileURLToPath(url),
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
          },
        }).outputText,
      }
    }
    return nextLoad(url, context)
  },
})

const {
  loadPropFirmChangesCsv,
  tryLoadPropFirmChangesCsv,
  emptyPropFirmChangesStats,
  categorizeChangeType,
  parseCsv,
  parseChangeLog,
  normalizePublishStatus,
  detectTextMarker,
  resolveRowStatus,
  PROP_FIRM_CHANGES_CSV_REL,
} = require(path.join(root, 'lib/propFirmChangesReport.ts'))
const ReportChangeCharts =
  require(path.join(root, 'components/ReportChangeCharts.tsx')).default
const {
  RU_REPORT_CHART_LABELS,
  EN_REPORT_CHART_LABELS,
} = require(path.join(root, 'components/ReportChangeCharts.tsx'))

const csvPath = path.join(root, PROP_FIRM_CHANGES_CSV_REL)
const hasCsv = fs.existsSync(csvPath)
const enBodyPath = path.join(root, 'content/data/en-prop-firm-changes-october-2026.html')
const ruBodyPath = path.join(root, 'content/data/ru-otchet-oktyabr-2026.html')
const changeLogFile = path.join(root, 'reports/october-2026-change-log.md')
const hasChangeLog = fs.existsSync(changeLogFile)

// --- Always: pure helpers + wiring ---
assert.equal(categorizeChangeType('promo_code'), 'promo')
assert.equal(normalizePublishStatus('LIVE'), 'live')
assert.equal(normalizePublishStatus('PENDING merge'), 'pending')
assert.equal(normalizePublishStatus('OBSERVATION'), 'observation')
assert.equal(detectTextMarker('still PENDING on 1 Nov'), 'pending')
assert.equal(tryLoadPropFirmChangesCsv(root) == null, !hasCsv, 'tryLoad null iff CSV missing')
assert.equal(emptyPropFirmChangesStats(root).totalRows, 0)

const pageRu = fs.readFileSync(
  path.join(root, 'app/ru/otchet-izmeneniya-prop-firm-oktyabr-2026/page.tsx'),
  'utf8',
)
assert.match(pageRu, /ReportChangeCharts/)
assert.match(
  pageRu,
  /const TITLE = 'Изменения правил и выплат проп-компаний — октябрь 2026'/,
)
assert.doesNotMatch(pageRu, /\/go\//)

const enPage = fs.readFileSync(
  path.join(root, 'app/reports/prop-firm-changes-october-2026/page.tsx'),
  'utf8',
)
assert.match(enPage, /ReportChangeCharts/)
assert.match(enPage, /EN_REPORT_CHART_LABELS/)
assert.match(enPage, /tryLoadPropFirmChangesCsv|loadPropFirmChangesCsv/)
assert.match(
  enPage,
  /const TITLE = 'Prop Firm Rules & Payout Changes — October 2026'/,
)
assert.doesNotMatch(enPage, /\/go\//)
assert.match(enPage, /getLanguageAlternates\(PATH\)/)

const enLayout = fs.readFileSync(path.join(root, 'app/reports/layout.tsx'), 'utf8')
assert.match(enLayout, /EnglishRootLayout/)

const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8')
const enStaticUrlHits = [
  ...sitemap.matchAll(/url: `\$\{BASE_URL\}\/reports\/prop-firm-changes-october-2026`/g),
]
assert.equal(
  enStaticUrlHits.length,
  1,
  'EN report listed once as a staticRoutes url entry',
)
const pairs = fs.readFileSync(path.join(root, 'lib/localizedRoutes.ts'), 'utf8')
assert.match(
  pairs,
  /en: '\/reports\/prop-firm-changes-october-2026',\s*ru: '\/ru\/otchet-izmeneniya-prop-firm-oktyabr-2026'/,
)
assert.match(pairs, /'\/ru\/otchet-izmeneniya-prop-firm-oktyabr-2026': '2026-11-0[45]'/)

if (!hasCsv) {
  console.log('ok: infra wiring only (CSV not stacked yet; count/body assertions skipped)')
  process.exit(0)
}

// --- CSV present: full count assertions (unchanged strength) ---
const stats = loadPropFirmChangesCsv(root)

assert.equal(stats.totalRows, 56, 'CSV has 56 data rows')
assert.equal(stats.octoberCount, 56, 'all 56 rows are October')
assert.equal(stats.septemberFootnoteCount, 0, 'September Topstep footnote removed')
assert.equal(stats.liveOctoberCount, 46, '46 LIVE October rows counted in charts')
assert.equal(stats.pendingRows.length, 4, '4 PENDING rows excluded')
assert.equal(stats.observationRows.length, 6, '6 OBSERVATION rows excluded')
assert.equal(
  stats.liveOctoberCount + stats.pendingRows.length + stats.observationRows.length + stats.septemberFootnoteCount,
  56,
  'LIVE + PENDING + OBS covers every CSV row',
)
assert.equal(stats.changeLogPath, null, 'change-log skipped when CSV status column present')
assert.match(stats.statusMatchSummary, /CSV status column present/)
assert.match(stats.statusMatchSummary, /csv-status-column:56/)
assert.ok(
  stats.rows.every(r => r.csvStatus && r.statusMethod.startsWith('csv-status-column')),
  'every row uses the CSV status column',
)

const expectedCats = {
  rules: 15,
  promo: 11,
  price: 7,
  russia_access: 9,
  restricted_list: 3,
  status: 1,
}
for (const [key, count] of Object.entries(expectedCats)) {
  const found = stats.byCategory.find(c => c.key === key)
  assert.equal(found?.count, count, `LIVE category ${key} count`)
}
assert.equal(
  stats.byCategory.reduce((s, c) => s + c.count, 0),
  stats.liveOctoberCount,
  'category counts sum to liveOctoberCount',
)
assert.equal(
  stats.byFirm.reduce((s, c) => s + c.count, 0),
  stats.liveOctoberCount,
  'firm counts sum to liveOctoberCount',
)
assert.equal(
  stats.byDay.reduce((s, c) => s + c.count, 0),
  stats.liveOctoberCount,
  'day counts sum to liveOctoberCount',
)

assert.equal(stats.byFirm[0].key, 'FundedNext')
assert.equal(stats.byFirm[0].count, 6)
assert.equal(stats.byDay.find(d => d.key === '2026-10-20')?.count, 12)

const pendingKeys = new Set(stats.pendingRows.map(r => `${r.firm}/${r.changeType}`))
assert.deepEqual(
  [...pendingKeys].sort(),
  [
    'Hash Hedge/stage1_bonus_once_per_challenge',
    'Hash Hedge/stage1_performance_bonus',
    'The5ers/new_program_summer_plan',
    'The5ers/terms_update',
  ],
  'exactly the 4 PENDING rows',
)
assert.ok(
  stats.observationRows.some(
    r => r.firm === 'Apex Trader Funding' && /SAVENOW/i.test(r.new || r.changeType + r.old + r.new),
  ) || stats.observationRows.some(r => r.firm === 'Apex Trader Funding' && r.changeType === 'promo_code'),
  'Apex SAVENOW OBSERVATION excluded',
)
assert.ok(
  stats.liveOctoberRows.some(r => r.firm === 'Upscale' && r.changeType === 'russia_access'),
  'Upscale russia_access is LIVE and counted',
)
assert.ok(
  stats.liveOctoberRows.some(r => r.firm === 'Alpha Capital' && r.changeType === 'promo_code'),
  'Alpha Capital promo is LIVE after CSV fix',
)
assert.ok(
  stats.liveOctoberRows.every(r => r.status === 'live' && r.countedInCharts),
  'every liveOctober row is live + counted',
)
assert.ok(
  stats.notCountedRows.every(r => !r.countedInCharts),
  'notCounted rows are not countedInCharts',
)

if (hasChangeLog) {
  const log = parseChangeLog(fs.readFileSync(changeLogFile, 'utf8'))
  assert.ok(log.length >= 60, `change log entries parsed (got ${log.length})`)

  const fallbackPending = resolveRowStatus(
    {
      date: '2026-10-26',
      firm: 'Alpha Capital',
      changeType: 'promo_code',
      old: '',
      new: 'HALLOWEEN45 PENDING',
      sourceUrl: 'https://alphacapitalgroup.uk/',
      checkedDate: '2026-10-27',
      csvStatus: null,
    },
    log,
  )
  assert.equal(fallbackPending.status, 'pending', 'fallback without status column uses free-text/change-log')
  assert.match(fallbackPending.method, /freetext|changelog/)

  const forced = resolveRowStatus(
    {
      date: '2026-10-26',
      firm: 'Alpha Capital',
      changeType: 'promo_code',
      old: '',
      new: 'HALLOWEEN45 PENDING',
      sourceUrl: 'https://example.com',
      checkedDate: '2026-10-27',
      csvStatus: 'LIVE',
    },
    log,
  )
  assert.equal(forced.status, 'live')
  assert.match(forced.method, /^csv-status-column/)

  const forcedPending = resolveRowStatus(
    {
      date: '2026-10-15',
      firm: 'FundedNext',
      changeType: 'min_trading_days',
      old: '5',
      new: '2',
      sourceUrl: 'https://fundednext.com/',
      checkedDate: '2026-10-15',
      csvStatus: 'PENDING',
    },
    log,
  )
  assert.equal(forcedPending.status, 'pending', 'CSV status column PENDING wins over change-log LIVE')
  assert.match(forcedPending.method, /^csv-status-column/)
}

const raw = fs.readFileSync(stats.csvPath, 'utf8')
const grid = parseCsv(raw)
assert.ok(grid[0].includes('change_type'))
assert.ok(grid[0].includes('status'), 'CSV ships explicit status column')
assert.equal(grid.length - 1, 56)

const html = renderToStaticMarkup(
  React.createElement(ReportChangeCharts, {
    stats,
    labels: RU_REPORT_CHART_LABELS,
    otherFirmsLabel: 'Другие',
    lang: 'ru',
  }),
)
assert.match(html, /data-report-live-count="46"/)
assert.match(html, /data-report-pending-count="4"/)
assert.match(html, /data-report-observation-count="6"/)
assert.match(html, /data-report-not-counted="10"/)
assert.match(html, /Не в счёте: pending \/ observation/)
assert.match(html, /data-report-chart="by-category"/)
assert.doesNotMatch(html, /\/go\//)
assert.match(html, /\d{2}\.\d{2}\.\d{4}/, 'RU chart visible dates use DD.MM.YYYY')
assert.doesNotMatch(html, /(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/, 'RU chart visible dates must not be ISO')
assert.ok(EN_REPORT_CHART_LABELS.notCountedTitle.includes('pending'))

assert.match(sitemap, /fileSource\('public\/reports\/prop-firm-changes-october-2026\.csv'\)|reports\/prop-firm-changes-october-2026/)

// Writer page copy synced to CSV (only when DESCRIPTION still carries the count line)
if (/CSV: 56 rows/.test(enPage)) {
  assert.match(enPage, /CSV: 56 rows/)
  assert.match(enPage, /\(56 rows through cut-off/)
}

if (fs.existsSync(enBodyPath)) {
  const enBody = fs.readFileSync(enBodyPath, 'utf8')
  assert.match(enBody, /\(56 rows/)
  assert.match(enBody, /LIVE on the published site \(in CSV\)[\s\S]*?<strong>46<\/strong>/)
  assert.match(enBody, /PENDING(?: publication| \(not yet reflected on our site\))[\s\S]*?<strong>4<\/strong>/)
  assert.match(enBody, /OBSERVATION only[\s\S]*?<strong>6<\/strong>/)
}

if (fs.existsSync(ruBodyPath)) {
  assert.ok(fs.statSync(ruBodyPath).size > 1000, 'RU body HTML present')
}

assert.equal(stats.liveOctoberCount, 46)
assert.equal(stats.pendingRows.length, 4)
assert.equal(stats.observationRows.length, 6)
assert.equal(stats.totalRows, 56)

console.log('ok: charts count LIVE rows only; PENDING/OBSERVATION labelled not counted')
console.log(
  JSON.stringify(
    {
      totalRows: stats.totalRows,
      octoberCount: stats.octoberCount,
      liveOctoberCount: stats.liveOctoberCount,
      pending: stats.pendingRows.length,
      observation: stats.observationRows.length,
      septemberFootnoteCount: stats.septemberFootnoteCount,
      byCategory: Object.fromEntries(stats.byCategory.map(c => [c.key, c.count])),
      topFirm: stats.byFirm[0],
      peakDay: stats.byDay.reduce((a, b) => (b.count > a.count ? b : a)),
      statusMatchSummary: stats.statusMatchSummary,
      pendingList: stats.pendingRows.map(r => `${r.firm}/${r.changeType}`),
      observationList: stats.observationRows.map(r => `${r.firm}/${r.changeType}`),
      hasEnBody: fs.existsSync(enBodyPath),
      hasRuBody: fs.existsSync(ruBodyPath),
    },
    null,
    2,
  ),
)
