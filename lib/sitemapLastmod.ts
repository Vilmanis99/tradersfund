import manifest from '@/content/data/sitemap-lastmod.json'
import { firmSlug } from '@/lib/firmSlug'

/**
 * Sitemap lastmod from content/data/sitemap-lastmod.json (scripts/gen-sitemap-lastmod.mjs).
 *
 * Prefer the stateful per-URL entry when its composite hash still matches this URL's
 * current source hashes + editorial dates. Otherwise fall back to max(editorial, source
 * changed dates). Capture / re-check dates and the clock are never used.
 */
type SourceEntry = { hash: string; changed: string | null; first: string }
type UrlEntry = { hash: string; lastmod: string }
const MANIFEST = manifest as {
  hashVersion?: number
  sources: Record<string, SourceEntry>
  urls?: Record<string, UrlEntry>
}
const SOURCES = MANIFEST.sources
const URLS = MANIFEST.urls ?? {}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
type DateLike = string | Date | null | undefined
/** YYYY-MM-DD; frontmatter dates may arrive as Date objects (unquoted YAML dates). */
function day(value: DateLike): string | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  const text = String(value).trim().slice(0, 10)
  return ISO_DAY.test(text) ? text : null
}

export function sourceChanged(key: string): string | null {
  return day(SOURCES[key]?.changed)
}

export function sourceFirst(key: string): string | null {
  return day(SOURCES[key]?.first)
}

export type FirmSurface = 'en' | 'ru' | 'compare' | 'listing'
/** Source keys for one firm on one surface: its firms.json entry and its challenge file. */
export function firmSources(nameOrSlug: string, surface: FirmSurface): string[] {
  const slug = firmSlug(nameOrSlug)
  if (surface === 'listing') {
    return [`firm:listing:${slug}`, `challenges:full:${slug}`]
  }
  return [`firm:${surface}:${slug}`, `challenges:${surface === 'compare' ? 'compare' : 'full'}:${slug}`]
}

export function fileSource(path: string): string {
  return `file:${path}`
}

/** Split-tier UI files — attach to pages that render displaySplitTiers / SplitTiersDisclosure. */
export const SPLIT_TIER_SOURCES = [
  fileSource('lib/profitSplitDisplay.ts'),
  fileSource('components/SplitTiersDisclosure.tsx'),
] as const

export type LastmodProvenance = {
  published: string
  lastmod: string
  sources: string[]
  editorial: string[]
}

const provenance = new Map<string, LastmodProvenance>()

export function getSitemapProvenance(): Map<string, LastmodProvenance> {
  return provenance
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, '') || '/'
  } catch {
    return url.replace(/\/$/, '') || '/'
  }
}


/**
 * Newest of the editorial dates and the manifest change dates of `sources`, never earlier than
 * `published`. When the stateful URL entry's hash still matches, that lastmod wins (idempotent).
 */
export function sitemapLastmod(
  url: string,
  published: DateLike,
  sources: string[],
  editorial: DateLike[] = [],
): Date {
  const floor = day(published) ?? [...editorial.map(day), ...sources.map(sourceFirst)].filter(Boolean).sort()[0]
  if (!floor) throw new Error(`sitemap: no published or editorial date for ${url}`)
  const editorialDays = editorial.map(day).filter((d): d is string => Boolean(d))
  const knownSources = sources.filter(key => key in SOURCES)
  const candidates = [floor, ...editorialDays, ...knownSources.map(sourceChanged)].filter((d): d is string => Boolean(d))
  let lastmod = candidates.sort().at(-1)!

  // Stateful URL entry (written by gen). Trusted when present; --check / regen keep it fresh.
  const path = pathnameOf(url)
  const stored = URLS[path]
  if (stored?.lastmod) lastmod = stored.lastmod

  const previous = provenance.get(url)
  if (!previous || previous.lastmod <= lastmod) {
    provenance.set(url, { published: floor, lastmod, sources: knownSources, editorial: editorialDays })
  }
  return new Date(`${lastmod}T00:00:00Z`)
}

/* ── Russian routes ───────────────────────────────────────────────────── */
const RU_PARTNERS = ['fundednext', 'bright-funded', 'fundingpips']
const RU_ROUTE_SOURCES: Record<string, { firms?: string[] | 'all'; files?: string[] }> = {
  '/ru': { firms: 'all' },
  '/ru/luchshie-prop-firmy': { firms: 'all', files: ['ru-ranking.json'] },
  '/ru/luchshie-kripto-prop-firmy': { files: ['crypto-market-evidence.json', 'russian-market-evidence.json'] },
  '/ru/promokody-prop-firm': { firms: RU_PARTNERS, files: ['deals.json'] },
  '/ru/vyplaty-prop-firm': { firms: RU_PARTNERS, files: ['russian-market-evidence.json'] },
  '/ru/prop-firmy-bez-kyc': { firms: RU_PARTNERS, files: ['russian-market-evidence.json'] },
  '/ru/otzyvy-prop-firm': { firms: ['fundednext', 'bright-funded'], files: ['russian-market-evidence.json'] },
  '/ru/fundednext-vs-bright-funded': {
    files: ['russian-market-evidence.json', 'russian-fundednext-review-evidence.json', 'russian-bright-funded-evidence.json'],
  },
  '/ru/obzor-bright-funded': { files: ['russian-bright-funded-evidence.json', 'russian-bright-offer-observation.json'] },
  '/ru/obzor-fundednext': { files: ['russian-fundednext-review-evidence.json'] },
  '/ru/obzor-fundingpips': { files: ['russian-fundingpips-access-evidence.json'] },
  '/ru/obzor-teamtraders': { files: ['russian-teamtraders-evidence.json'] },
  '/ru/kak-my-zarabatyvaem': { files: ['ru-how-we-make-money.json'] },
  '/ru/dlya-russkoyazychnykh-treyderov': { files: ['russian-diaspora-evidence.json'] },
  '/ru/forex-prop-firmy': { files: ['russian-forex-evidence.json'] },
  '/ru/prop-firmy-s-ctrader': { files: ['russian-ctrader-evidence.json'] },
  '/ru/fundednext-mt5': { firms: ['fundednext'], files: ['russian-fundednext-mt5-evidence.json'] },
  '/ru/fundednext-stellar-instant': { firms: ['fundednext'], files: ['russian-fundednext-instant-evidence.json'] },
  '/ru/ftmo-dlya-rossiyan': { firms: ['ftmo'] },
  '/ru/zakrytye-prop-firmy': { files: ['closed-firms.json', 'closed-firms.ru.json'] },
}
const RU_FIRM_SLUGS = new Set(
  Object.keys(SOURCES).filter(key => key.startsWith('firm:ru:')).map(key => key.slice('firm:ru:'.length)),
)

export function russianRouteSources(path: string): string[] {
  const segment = path.slice('/ru'.length).replace(/^\//, '')
  const spec = RU_ROUTE_SOURCES[path] ?? {}
  const pairMatch = /^(.+)-vs-(.+)$/.exec(segment)
  const firmMatch = /^obzor-(.+)$|^(.+)-pravila$/.exec(segment)
  const shownFirms = spec.firms === 'all'
    ? [...RU_FIRM_SLUGS]
    : [
        ...(spec.firms ?? []),
        ...(pairMatch ? [pairMatch[1], pairMatch[2]] : []),
        ...(firmMatch ? [firmMatch[1] ?? firmMatch[2]] : []),
      ]
  const files = [
    `app/ru/${segment ? `${segment}/` : ''}page.tsx`,
    `content/data/ru-verdicts/${segment}.json`,
    ...(firmMatch?.[2] ? [`content/verdicts/rules/${firmMatch[2]}.ru.md`] : []),
    ...(spec.files ?? []).map(name => `content/data/${name}`),
  ]
  return [
    ...files.map(fileSource).filter(key => key in SOURCES),
    ...[...new Set(shownFirms)].filter(slug => RU_FIRM_SLUGS.has(slug)).flatMap(slug => firmSources(slug, 'ru')),
  ]
}

export function russianRouteLastmodDay(path: string, editorialDate: string, extraEditorial: DateLike[] = []): string {
  const stored = URLS[path]?.lastmod
  if (stored) return stored
  const candidates = [editorialDate, ...extraEditorial.map(day), ...russianRouteSources(path).map(sourceChanged)]
  return candidates.filter((d): d is string => Boolean(d)).sort().at(-1)!
}

export function computeRussianRouteLastmods(
  editorialDates: Record<string, string>,
  extraEditorial: Record<string, DateLike[]> = {},
): Record<string, string> {
  return Object.fromEntries(Object.keys(editorialDates).sort().map(path => [
    path,
    russianRouteLastmodDay(path, editorialDates[path], extraEditorial[path] ?? []),
  ]))
}
