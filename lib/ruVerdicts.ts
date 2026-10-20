import fs from 'node:fs'
import path from 'node:path'
import { russiaStatusFor, type RussiaStatus } from '@/lib/russiaAvailability'
import { RU_ACCESS_BADGE } from '@/components/RuAccessBadgeView'

/**
 * RU Phase 2 verdict copy (content/data/ru-verdicts/<route slug>.json, rules in
 * the README there). Russia lines are resolved here from firms.json
 * russiaStatus only; there is no fallback or per-page status.
 */
type StatusLine = { list: 'best' | 'avoid'; text: string; altText?: string }
type ReviewFile = {
  route: string; type: 'review'; firm: string; firmInFirmsJson?: boolean; dataAsOf: string; dataExpires?: string
  verdict: string; best: string[]; avoid: string[]
  russiaAccess: { firm: string; alternatives?: string[]; byStatus: Record<RussiaStatus, StatusLine> }
}
type CompareFile = {
  route: string; type: 'comparison'; a: string; b: string; dataAsOf: string; dataExpires?: string
  verdict: string; picks: { a: string[]; b: string[] }
  russiaPick: {
    alternatives?: string[]
    oneOpen?: { text: string } | null
    neitherOpen?: { text: string; altText?: string } | null
    bothOpen?: { text: string } | null
  }
}

const DIR = path.join(process.cwd(), 'content/data/ru-verdicts')
const MAX_ITEMS = 4
const DAY = 24 * 60 * 60 * 1000

function read<T>(route: string): T | null {
  const slug = route.replace(/^\/ru\//, '')
  const file = path.join(DIR, `${slug}.json`)
  if (!/^[a-z0-9-]+$/.test(slug) || !fs.existsSync(file)) return null
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as T & { route?: string }
  return data.route === route ? data : null
}

/** Same 30-day rule as isChallengeFresh; dataExpires (when set) ends it earlier. */
export function ruVerdictFresh(entry: { dataAsOf: string; dataExpires?: string }, now = new Date()) {
  const asOf = Date.parse(`${entry.dataAsOf}T00:00:00Z`)
  if (!Number.isFinite(asOf)) return false
  const expires = entry.dataExpires ? Date.parse(`${entry.dataExpires}T23:59:59Z`) : asOf + 30 * DAY + DAY - 1
  return now.getTime() - asOf <= 30 * DAY + DAY - 1 && now.getTime() <= expires
}

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match))

/** First firm in the list (BrightFunded first by RU Writer's convention) whose status is 'available'. */
function openAlternative(alternatives: string[] | undefined, exclude: string[]) {
  return (alternatives ?? []).find(name => !exclude.includes(name) && russiaStatusFor(name) === 'available') ?? null
}

export type RuReviewVerdict = {
  firm: string; status: RussiaStatus; dataAsOf: string; verdict: string; best: string[]; avoid: string[]
}

export function getRuReviewVerdict(route: string, now = new Date()): RuReviewVerdict | null {
  const entry = read<ReviewFile>(route)
  if (!entry || entry.type !== 'review' || !ruVerdictFresh(entry, now)) return null
  const firm = entry.russiaAccess?.firm ?? entry.firm
  const status = russiaStatusFor(firm)
  const best = [...entry.best], avoid = [...entry.avoid]
  const line = entry.russiaAccess?.byStatus?.[status]
  if (line) {
    let text = fill(line.text, { firm, badge: RU_ACCESS_BADGE[status].label })
    const alt = line.altText ? openAlternative(entry.russiaAccess.alternatives, [firm]) : null
    if (line.altText && alt) text = `${text.replace(/[.;\s]*$/, '.')} ${fill(line.altText, { openAlternative: alt, altBadge: RU_ACCESS_BADGE.available.label })}`
    ;(line.list === 'best' ? best : avoid).unshift(text)
  }
  return { firm, status, dataAsOf: entry.dataAsOf, verdict: entry.verdict, best: best.slice(0, MAX_ITEMS), avoid: avoid.slice(0, MAX_ITEMS) }
}

export type RuCompareVerdict = {
  a: string; b: string; statusA: RussiaStatus; statusB: RussiaStatus; dataAsOf: string; verdict: string
  picks: { a: string[]; b: string[] }; note: string | null
}

export function getRuCompareVerdict(route: string, now = new Date()): RuCompareVerdict | null {
  const entry = read<CompareFile>(route)
  if (!entry || entry.type !== 'comparison' || !ruVerdictFresh(entry, now)) return null
  const statusA = russiaStatusFor(entry.a), statusB = russiaStatusFor(entry.b)
  const picks = { a: [...entry.picks.a], b: [...entry.picks.b] }
  let note: string | null = null
  const openA = statusA === 'available', openB = statusB === 'available'
  if (openA !== openB && entry.russiaPick?.oneOpen?.text) {
    const [open, other, so, st] = openA ? [entry.a, entry.b, statusA, statusB] : [entry.b, entry.a, statusB, statusA]
    picks[openA ? 'a' : 'b'].unshift(fill(entry.russiaPick.oneOpen.text, { open, other, openBadge: RU_ACCESS_BADGE[so].label, otherBadge: RU_ACCESS_BADGE[st].label }))
  } else if (!openA && !openB && entry.russiaPick?.neitherOpen?.text) {
    const values = { a: entry.a, b: entry.b, aBadge: RU_ACCESS_BADGE[statusA].label, bBadge: RU_ACCESS_BADGE[statusB].label, altBadge: RU_ACCESS_BADGE.available.label }
    note = fill(entry.russiaPick.neitherOpen.text, values)
    const alt = entry.russiaPick.neitherOpen.altText ? openAlternative(entry.russiaPick.alternatives, [entry.a, entry.b]) : null
    if (alt) note = `${note} ${fill(entry.russiaPick.neitherOpen.altText!, { ...values, openAlternative: alt })}`
  }
  return { a: entry.a, b: entry.b, statusA, statusB, dataAsOf: entry.dataAsOf, verdict: entry.verdict, picks: { a: picks.a.slice(0, MAX_ITEMS), b: picks.b.slice(0, MAX_ITEMS) }, note }
}
