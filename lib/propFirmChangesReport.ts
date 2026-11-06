/**
 * Build-time helpers for the October prop-firm changes report charts.
 * Figures come only from public/reports/prop-firm-changes-october-2026.csv.
 *
 * Status resolution (LIVE vs PENDING vs OBSERVATION), most specific first:
 *  1. Explicit CSV `status` column when present (preferred; shipped CSV has it).
 *  2. Fallback only when that column is absent/blank for a row:
 *     change-log match (reports/october-2026-change-log.md), then free-text
 *     PENDING|OBSERVATION in `new`, then September → september_footnote /
 *     other October → live.
 *
 * Charts count LIVE/verified October rows only. PENDING, OBSERVATION and the
 * September footnote are listed under the charts as not counted.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export const PROP_FIRM_CHANGES_CSV_REL =
  'public/reports/prop-firm-changes-october-2026.csv' as const

export const PROP_FIRM_CHANGES_CHANGE_LOG_REL =
  'reports/october-2026-change-log.md' as const

export type ChangeCategory =
  | 'rules'
  | 'price'
  | 'promo'
  | 'russia_access'
  | 'restricted_list'
  | 'status'

/** Publication / verification status used for chart inclusion. */
export type ChangePublishStatus =
  | 'live'
  | 'pending'
  | 'observation'
  | 'september_footnote'

export type PropFirmChangeRow = {
  date: string
  firm: string
  changeType: string
  old: string
  new: string
  sourceUrl: string
  checkedDate: string
  /** Raw CSV status cell when the optional column exists. */
  csvStatus: string | null
  category: ChangeCategory
  /** Free-text marker detected in `new`. */
  textMarker: 'pending' | 'observation' | null
  /** Resolved status after CSV column / change-log / free-text. */
  status: ChangePublishStatus
  /** How status was derived (for tests / debugging). */
  statusMethod: string
  /** Matched change-log entry number, when any. */
  changeLogNum: number | null
  isOctober: boolean
  /** Included in chart aggregates. */
  countedInCharts: boolean
}

export type NamedCount = { key: string; count: number }

export type PropFirmChangesReportStats = {
  csvPath: string
  changeLogPath: string | null
  rows: PropFirmChangeRow[]
  totalRows: number
  octoberRows: PropFirmChangeRow[]
  octoberCount: number
  /** LIVE October rows — what the charts count. */
  liveOctoberRows: PropFirmChangeRow[]
  liveOctoberCount: number
  pendingRows: PropFirmChangeRow[]
  observationRows: PropFirmChangeRow[]
  septemberFootnoteRows: PropFirmChangeRow[]
  septemberFootnoteCount: number
  /** Rows excluded from charts (pending + observation + september). */
  notCountedRows: PropFirmChangeRow[]
  byCategory: NamedCount[]
  byFirm: NamedCount[]
  byDay: NamedCount[]
  statusMatchSummary: string
}

const PRICE_TYPES = new Set([
  'price',
  'price_list',
  'price_plan_update',
  'price_lineup',
  'promo_price',
  'homepage_banner',
  'new_program_summer_plan',
])

const TYPE_HINTS: Record<string, string[]> = {
  promo_code: ['promo', 'code', 'discount'],
  russia_access: ['russia', 'russiastatus', 'access'],
  restricted_country_list: ['restricted', 'country'],
  status: ['status', 'offline', 'delisted'],
  homepage_banner: ['homepage', 'banner', 'headline'],
  new_program_summer_plan: ['summer'],
  terms_update: ['terms'],
  stage1_performance_bonus: ['stage', 'bonus', 'performance', 'first-stage'],
  stage1_bonus_once_per_challenge: ['once', 'challenge', 'bonus'],
  consistency_luciddaily: ['luciddaily', 'consistency'],
  consistency_lucidflex: ['lucidflex', 'consistency'],
  consistency: ['consistency'],
  min_trading_days: ['minimum', 'trading', 'days'],
  reward_timing: ['reward', 'performance'],
  reward_cycles: ['reward', 'cycle'],
  split_cycle: ['split', 'cycle'],
  fee_refund: ['refund', 'fee'],
  payouts: ['payout'],
  payout_methods: ['payout', 'method'],
  max_allocation: ['allocation'],
  funded_drawdown_after_withdrawal: ['drawdown', 'withdrawal'],
  weekend_overnight_holding: ['weekend', 'overnight', 'holding'],
  price_list: ['price', 'list'],
  price_plan_update: ['pricing', 'plan'],
  price_lineup: ['line-up', 'lineup', 'instant'],
  promo_price: ['promo', 'discount'],
  price: ['price'],
}

export function categorizeChangeType(changeType: string): ChangeCategory {
  if (changeType === 'promo_code') return 'promo'
  if (PRICE_TYPES.has(changeType)) return 'price'
  if (changeType === 'russia_access') return 'russia_access'
  if (changeType === 'restricted_country_list') return 'restricted_list'
  if (changeType === 'status') return 'status'
  return 'rules'
}

export function detectTextMarker(newValue: string): 'pending' | 'observation' | null {
  if (/PENDING/i.test(newValue)) return 'pending'
  if (/OBSERVATION/i.test(newValue)) return 'observation'
  return null
}

/** Normalize a CSV/change-log status token into ChangePublishStatus, or null. */
export function normalizePublishStatus(raw: string | null | undefined): ChangePublishStatus | null {
  if (!raw) return null
  const t = raw.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (/^(live|verified)\b/.test(t) || t === 'on site' || t === 'на сайте') return 'live'
  if (/^pending\b/.test(t) || t.includes('awaiting') || t.includes('ожидает')) return 'pending'
  if (/^observation\b/.test(t) || t.includes('наблюдение')) return 'observation'
  if (/^september/.test(t) || t.includes('footnote')) return 'september_footnote'
  return null
}

/** Minimal RFC4180-ish CSV parse (handles quoted fields with commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')
  while (i < src.length) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some(cell => cell.length > 0) || rows.length === 0) rows.push(row)
      row = []
      i += 1
      continue
    }
    field += ch
    i += 1
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function countBy(keys: string[]): NamedCount[] {
  const map = new Map<string, number>()
  for (const key of keys) map.set(key, (map.get(key) ?? 0) + 1)
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function normFirm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function firmsMatch(a: string, b: string): boolean {
  const na = normFirm(a)
  const nb = normFirm(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

const CODE_RE = /\b([A-Z]{2,}[A-Z0-9]{2,})\b/g

function promoCodes(text: string): Set<string> {
  return new Set([...(text.match(CODE_RE) ?? [])])
}

function wordTokens(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []))
}

export type ChangeLogEntry = {
  num: number
  title: string
  firm: string
  status: ChangePublishStatus
  observed: string
  checked: string
  change: string
  source: string
}

/** Parse Tracker/EA october-2026-change-log.md `### N. … **Status:** **LIVE|PENDING|OBSERVATION**` entries. */
export function parseChangeLog(markdown: string): ChangeLogEntry[] {
  const parts = markdown.split(/\n(?=### \d+\. )/)
  const entries: ChangeLogEntry[] = []
  for (const part of parts) {
    const head = part.match(/^### (\d+)\. ([^\n]+)/)
    if (!head) continue
    const statusRaw = part.match(/\*\*Status:\*\*\s*\*\*(LIVE|PENDING|OBSERVATION)\*\*/i)
    if (!statusRaw) continue
    const status = normalizePublishStatus(statusRaw[1])
    if (!status || status === 'september_footnote') continue
    const observed = part.match(/\*\*Observed:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
    const checked = part.match(/\*\*Checked:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
    const change = part.match(/\*\*Change:\*\*\s*([^\n]+)/)?.[1] ?? ''
    const source = part.match(/\*\*Source:\*\*\s*([^\n]+)/)?.[1] ?? ''
    const title = head[2].trim()
    const firm = title.split(/\s+—\s+/)[0]?.trim() || title
    entries.push({
      num: Number(head[1]),
      title,
      firm,
      status,
      observed,
      checked,
      change,
      source,
    })
  }
  return entries
}

function scoreChangeLogMatch(
  row: {
    date: string
    firm: string
    changeType: string
    old: string
    new: string
    sourceUrl: string
    checkedDate: string
  },
  entry: ChangeLogEntry,
): number {
  if (!firmsMatch(row.firm, entry.firm)) return 0
  let score = 0
  if (entry.observed && entry.observed === row.date) score += 5
  if (entry.checked && entry.checked === row.checkedDate) score += 1
  if (row.sourceUrl && entry.source) {
    const a = row.sourceUrl.replace(/\/$/, '').toLowerCase()
    const b = entry.source.replace(/\/$/, '').toLowerCase().split(/\s+/)[0]
    if (a && b && (a === b || a.startsWith(b) || b.startsWith(a))) score += 3
  }
  const rowCodes = promoCodes(`${row.new} ${row.old}`)
  const entryCodes = promoCodes(`${entry.title} ${entry.change}`)
  let sharedCodes = 0
  for (const code of rowCodes) if (entryCodes.has(code)) sharedCodes += 1
  if (sharedCodes) score += 4 + sharedCodes
  const rowWords = wordTokens(`${row.new} ${row.changeType} ${row.old}`)
  const entryWords = wordTokens(`${entry.title} ${entry.change}`)
  let shared = 0
  for (const w of rowWords) if (entryWords.has(w)) shared += 1
  if (shared >= 2) score += 2
  if (shared >= 4) score += 1
  const hints = TYPE_HINTS[row.changeType] ?? []
  const hay = `${entry.title} ${entry.change}`.toLowerCase()
  if (hints.some(h => hay.includes(h))) score += 2
  // Strong boost when change_type tokens appear in the title (once-per-challenge vs first-stage).
  const typeBits = row.changeType.toLowerCase().split('_').filter(b => b.length > 3)
  if (typeBits.length && typeBits.every(b => hay.includes(b) || entryWords.has(b))) score += 3
  return score
}

const SEVERITY: Record<ChangePublishStatus, number> = {
  pending: 0,
  observation: 1,
  live: 2,
  september_footnote: 3,
}

export function resolveRowStatus(
  row: {
    date: string
    firm: string
    changeType: string
    old: string
    new: string
    sourceUrl: string
    checkedDate: string
    csvStatus: string | null
  },
  changeLog: ChangeLogEntry[],
): { status: ChangePublishStatus; method: string; changeLogNum: number | null } {
  // 1) Explicit CSV status column
  const fromCsv = normalizePublishStatus(row.csvStatus)
  if (fromCsv) {
    return {
      status: fromCsv,
      method: `csv-status-column:${row.csvStatus}`,
      changeLogNum: null,
    }
  }

  const textMarker = detectTextMarker(row.new)
  const scored = changeLog
    .map(entry => ({ entry, score: scoreChangeLogMatch(row, entry) }))
    .filter(x => x.score >= 5)
    .sort((a, b) => b.score - a.score || a.entry.num - b.entry.num)

  if (scored.length) {
    const sameDate = scored.filter(x => x.entry.observed === row.date)
    const pool = sameDate.length ? sameDate : scored

    if (textMarker) {
      const want: ChangePublishStatus = textMarker
      const twin = scored.find(x => x.entry.status === want)
      if (twin) {
        return {
          status: want,
          method: `changelog+freetext(${want}) via #${twin.entry.num}`,
          changeLogNum: twin.entry.num,
        }
      }
      // Free-text on the shipped CSV row wins over a LIVE change-log start row.
      return {
        status: want,
        method: `freetext-override(${want}) over changelog #${pool[0].entry.num} ${pool[0].entry.status}`,
        changeLogNum: pool[0].entry.num,
      }
    }

    const best = pool[0].score
    const top = pool.filter(x => x.score === best)
    top.sort((a, b) => SEVERITY[a.entry.status] - SEVERITY[b.entry.status])
    const chosen = top[0].entry
    return {
      status: chosen.status,
      method: `changelog #${chosen.num} score=${best}`,
      changeLogNum: chosen.num,
    }
  }

  // 3) Free-text only
  if (textMarker) {
    return {
      status: textMarker,
      method: `freetext-only(${textMarker})`,
      changeLogNum: null,
    }
  }

  // 4) Date defaults
  if (row.date.startsWith('2026-09')) {
    return { status: 'september_footnote', method: 'date-september', changeLogNum: null }
  }
  return { status: 'live', method: 'default-october-live', changeLogNum: null }
}

export function resolveChangeLogPath(root = process.cwd()): string | null {
  const candidates = [
    join(root, PROP_FIRM_CHANGES_CHANGE_LOG_REL),
    join(root, 'content/data/october-2026-change-log.md'),
    '/workspace/tradersfundhub/reports/october-2026-change-log.md',
  ]
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return null
}

export function loadPropFirmChangesCsv(
  root = process.cwd(),
): PropFirmChangesReportStats {
  const csvPath = join(root, PROP_FIRM_CHANGES_CSV_REL)
  const raw = readFileSync(csvPath, 'utf8')
  const grid = parseCsv(raw)
  if (grid.length < 2) {
    throw new Error(`${PROP_FIRM_CHANGES_CSV_REL}: expected header + rows`)
  }
  const header = grid[0].map(h => h.trim())
  const idx = (name: string) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`${PROP_FIRM_CHANGES_CSV_REL}: missing column ${name}`)
    return i
  }
  const iDate = idx('date')
  const iFirm = idx('firm')
  const iType = idx('change_type')
  const iOld = idx('old')
  const iNew = idx('new')
  const iUrl = idx('source_url')
  const iChecked = idx('checked_date')
  const iStatus = header.findIndex(h => h.toLowerCase() === 'status')
  const hasStatusColumn = iStatus >= 0

  // Change-log is a fallback when the CSV status column is missing entirely.
  // With an explicit status column (current CSV), skip parsing it at build time.
  const changeLogPath = hasStatusColumn ? null : resolveChangeLogPath(root)
  const changeLog = changeLogPath
    ? parseChangeLog(readFileSync(changeLogPath, 'utf8'))
    : []

  const rows: PropFirmChangeRow[] = []
  for (const cells of grid.slice(1)) {
    if (cells.every(c => !c.trim())) continue
    const date = (cells[iDate] ?? '').trim()
    const firm = (cells[iFirm] ?? '').trim()
    const changeType = (cells[iType] ?? '').trim()
    const old = cells[iOld] ?? ''
    const newValue = cells[iNew] ?? ''
    if (!date || !firm || !changeType) continue
    const csvStatus =
      iStatus >= 0 ? String(cells[iStatus] ?? '').trim() || null : null
    const resolved = resolveRowStatus(
      {
        date,
        firm,
        changeType,
        old,
        new: newValue,
        sourceUrl: cells[iUrl] ?? '',
        checkedDate: (cells[iChecked] ?? '').trim(),
        csvStatus,
      },
      changeLog,
    )
    const status = resolved.status
    rows.push({
      date,
      firm,
      changeType,
      old,
      new: newValue,
      sourceUrl: cells[iUrl] ?? '',
      checkedDate: (cells[iChecked] ?? '').trim(),
      csvStatus,
      category: categorizeChangeType(changeType),
      textMarker: detectTextMarker(newValue),
      status,
      statusMethod: resolved.method,
      changeLogNum: resolved.changeLogNum,
      isOctober: date.startsWith('2026-10'),
      countedInCharts: status === 'live' && date.startsWith('2026-10'),
    })
  }

  const octoberRows = rows.filter(r => r.isOctober)
  const liveOctoberRows = rows.filter(r => r.countedInCharts)
  const pendingRows = rows.filter(r => r.status === 'pending')
  const observationRows = rows.filter(r => r.status === 'observation')
  const septemberFootnoteRows = rows.filter(r => r.status === 'september_footnote')
  const notCountedRows = rows.filter(r => !r.countedInCharts)

  const byCategoryOrder: ChangeCategory[] = [
    'rules',
    'promo',
    'price',
    'russia_access',
    'restricted_list',
    'status',
  ]
  const catCounts = countBy(liveOctoberRows.map(r => r.category))
  const byCategory = byCategoryOrder
    .map(key => ({ key, count: catCounts.find(c => c.key === key)?.count ?? 0 }))
    .filter(c => c.count > 0)

  const methods = new Map<string, number>()
  for (const row of rows) {
    let bucket = 'other'
    if (row.statusMethod.startsWith('csv-status-column')) bucket = 'csv-status-column'
    else if (row.statusMethod.startsWith('changelog+freetext')) bucket = 'changelog+freetext'
    else if (row.statusMethod.startsWith('freetext-override')) bucket = 'freetext-override'
    else if (row.statusMethod.startsWith('changelog #')) bucket = 'changelog'
    else if (row.statusMethod.startsWith('freetext-only')) bucket = 'freetext-only'
    else if (row.statusMethod.startsWith('date-')) bucket = 'date-default'
    else if (row.statusMethod === 'default-october-live') bucket = 'default-october-live'
    methods.set(bucket, (methods.get(bucket) ?? 0) + 1)
  }
  const statusMatchSummary = [
    hasStatusColumn
      ? 'change-log=skipped (CSV status column present)'
      : changeLogPath
        ? `change-log=${changeLogPath} entries=${changeLog.length}`
        : 'change-log=missing (free-text / defaults only)',
    ...[...methods.entries()].map(([k, n]) => `${k}:${n}`),
  ].join('; ')

  return {
    csvPath,
    changeLogPath,
    rows,
    totalRows: rows.length,
    octoberRows,
    octoberCount: octoberRows.length,
    liveOctoberRows,
    liveOctoberCount: liveOctoberRows.length,
    pendingRows,
    observationRows,
    septemberFootnoteRows,
    septemberFootnoteCount: septemberFootnoteRows.length,
    notCountedRows,
    byCategory,
    byFirm: countBy(liveOctoberRows.map(r => r.firm)),
    byDay: countBy(liveOctoberRows.map(r => r.date)).sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    statusMatchSummary,
  }
}

/** Empty stats used when the CSV is not stacked yet (infra-only builds). */
export function emptyPropFirmChangesStats(root = process.cwd()): PropFirmChangesReportStats {
  return {
    csvPath: join(root, PROP_FIRM_CHANGES_CSV_REL),
    changeLogPath: null,
    rows: [],
    totalRows: 0,
    octoberRows: [],
    octoberCount: 0,
    liveOctoberRows: [],
    liveOctoberCount: 0,
    pendingRows: [],
    observationRows: [],
    septemberFootnoteRows: [],
    septemberFootnoteCount: 0,
    notCountedRows: [],
    byCategory: [],
    byFirm: [],
    byDay: [],
    statusMatchSummary: 'csv=missing (infra stub)',
  }
}

/** Load CSV stats, or null when the writer CSV is not on this tree yet. */
export function tryLoadPropFirmChangesCsv(
  root = process.cwd(),
): PropFirmChangesReportStats | null {
  const csvPath = join(root, PROP_FIRM_CHANGES_CSV_REL)
  if (!existsSync(csvPath)) return null
  return loadPropFirmChangesCsv(root)
}
