import fs from 'node:fs'
import path from 'node:path'
import { ruAccessBadgeFor, russiaBasisDateFor, russiaPendingNotListedFor, russiaStatusFor, type RussiaStatus } from '@/lib/russiaAvailability'
import { RU_ACCESS_BADGE } from '@/components/RuAccessBadgeView'
import { getChallengesByFirm, isChallengeFresh } from '@/lib/firms'
import type { RuPendingNotListed } from '@/lib/ruAccessLabel'

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


/**
 * Data guards for figures RU Writer quotes as prose. A sentence that contains
 * `contains` renders only while `holds()` is true for the current data;
 * otherwise that sentence is dropped, so no hard-coded number ships against
 * contradicting data. (bright-funded-vs-crypto-fund-trader: the 100K range
 * "$619–660" and the product list hold only while Ascend is not on sale,
 * Tracker data/article-slots-2026-10-20 @ 1dc16ef.)
 */
const RU_COPY_GUARDS: Array<{ route: string; contains: string; holds: () => boolean }> = [
  {
    route: '/ru/bright-funded-vs-crypto-fund-trader',
    contains: '$619–660',
    holds: () => {
      const prices = getChallengesByFirm('crypto-fund-trader')
        .filter(product => isChallengeFresh(product) && !/break/i.test(product.productName))
        .map(product => product.accountSizes.find(tier => tier.sizeUsd === 100000)?.priceUsd)
        .filter((value): value is number => value != null)
      return prices.length > 0 && Math.min(...prices) === 619 && Math.max(...prices) === 660
    },
  },
]

function guarded(route: string, text: string) {
  const guards = RU_COPY_GUARDS.filter(guard => guard.route === route && text.includes(guard.contains) && !guard.holds())
  if (!guards.length) return text
  return text.split(/(?<=[.!?])\s+(?=[A-ZА-ЯЁ])/).filter(sentence => !guards.some(guard => sentence.includes(guard.contains))).join(' ')
}

export type RuReviewVerdict = {
  firm: string; status: RussiaStatus; basisDate: string | null; pendingNotListed: RuPendingNotListed | null; dataAsOf: string; verdict: string; best: string[]; avoid: string[]
}

export function getRuReviewVerdict(route: string, now = new Date()): RuReviewVerdict | null {
  const entry = read<ReviewFile>(route)
  if (!entry || entry.type !== 'review' || !ruVerdictFresh(entry, now)) return null
  const firm = entry.russiaAccess?.firm ?? entry.firm
  const status = russiaStatusFor(firm)
  const best = [...entry.best], avoid = [...entry.avoid]
  const line = entry.russiaAccess?.byStatus?.[status]
  if (line) {
    // Labels come from the central rule (status + russiaBasis): «нет в списке ограничений (на …)» for list-absence firms.
    let text = fill(line.text, { firm, badge: ruAccessBadgeFor(firm).label })
    const alt = line.altText ? openAlternative(entry.russiaAccess.alternatives, [firm]) : null
    if (line.altText && alt) text = `${text.replace(/[.;\s]*$/, '.')} ${fill(line.altText, { openAlternative: alt, altBadge: ruAccessBadgeFor(alt).label })}`
    ;(line.list === 'best' ? best : avoid).unshift(text)
  }
  return { firm, status, basisDate: russiaBasisDateFor(firm), pendingNotListed: russiaPendingNotListedFor(firm), dataAsOf: entry.dataAsOf, verdict: entry.verdict, best: best.slice(0, MAX_ITEMS), avoid: avoid.slice(0, MAX_ITEMS) }
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
    const [open, other] = openA ? [entry.a, entry.b] : [entry.b, entry.a]
    picks[openA ? 'a' : 'b'].unshift(fill(entry.russiaPick.oneOpen.text, { open, other, openBadge: ruAccessBadgeFor(open).label, otherBadge: ruAccessBadgeFor(other).label }))
  } else if (!openA && !openB && entry.russiaPick?.neitherOpen?.text) {
    const alt = openAlternative(entry.russiaPick.alternatives, [entry.a, entry.b])
    const values = { a: entry.a, b: entry.b, aBadge: ruAccessBadgeFor(entry.a).label, bBadge: ruAccessBadgeFor(entry.b).label, altBadge: alt ? ruAccessBadgeFor(alt).label : RU_ACCESS_BADGE.available.label }
    note = fill(entry.russiaPick.neitherOpen.text, values)
    if (alt && entry.russiaPick.neitherOpen.altText) note = `${note} ${fill(entry.russiaPick.neitherOpen.altText, { ...values, openAlternative: alt })}`
  }
  return { a: entry.a, b: entry.b, statusA, statusB, dataAsOf: entry.dataAsOf, verdict: guarded(route, entry.verdict), picks: { a: picks.a.filter(line => guarded(route, line) === line).slice(0, MAX_ITEMS), b: picks.b.filter(line => guarded(route, line) === line).slice(0, MAX_ITEMS) }, note }
}
