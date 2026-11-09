// Explicit extensions keep this module executable from the Node test scripts.
import fs from 'node:fs'
import path from 'node:path'
import {
  getAllFirms,
  getChallengesByFirm,
  isChallengeFresh,
  type Challenge,
  type Firm,
} from './firms.ts'
import { firmSlug } from './firmSlug.ts'
import {
  BEST_FOR_FIELD_SPECS,
  BEST_FOR_MIN_DIFF_FIELDS,
  BEST_FOR_MIN_FIRMS,
  type BestForFieldKey,
  type BestForRankedFirm,
  countDifferingFields,
} from './bestFor.ts'
import { activePinIndex, type RankingRussiaStatus } from './russianRanking.ts'
import { loadVerdict, type Verdict } from './verdicts.ts'

/**
 * Evidence-only country pages (W46, 2026-11-09).
 *
 * Infrastructure for NEW country hubs. The UK / US / India hubs keep their own
 * static routes (app/best-prop-firms-in-uk|us|india) and data files and are
 * never emitted from here.
 *
 * Discovery (Tracker evidence contract, 2026-11-09): every
 * content/data/<slug>-access-evidence.json (same naming as the UK/US files)
 * plus the optional extra path content/data/country-access/<slug>.json. The
 * file name is the EN route slug (nigeria → /best-prop-firms-in-nigeria). A slug
 * with its own app/best-prop-firms-in-<slug> folder (today uk, us, india) is
 * skipped, so those hubs keep winning. Nothing in code lists countries, firms,
 * counts, names or copy facts.
 *
 * Schema = the UK allow-list shape (content/data/uk-access-evidence.json):
 *   { methodology, firms: [{ firmSlug, firmName, accessStatus, productSlugs,
 *     sourceUrl, sourceCapturedAt, evidenceLabel, evidenceSummary, decisionNote,
 *     sourcePublishedAt?, sourceQuote?, assetClass? }] }
 * Optional top-level metadata (Tracker, 2026-11-09), never required:
 * countryCode (ISO 3166-1 alpha-2, e.g. "AE"), name { en, ru }, ruSlug, ruInfix
 * ("v" default, "na" for «на Филиппинах»), methodologyRu. Unknown extras are
 * ignored. Visible names come only from name.en / name.ru: without name.en the
 * page renders an incomplete state and stays noindex (no slug-derived names).
 * An RU page exists only with ruSlug AND name.ru:
 * /ru/luchshie-prop-firmy-<ruInfix ?? 'v'>-<ruSlug>.
 *
 * A firm qualifies when accessStatus is 'policy-supported' (a current
 * first-party policy exists and the country is not among its named exclusions;
 * same meaning as the UK hub) or 'explicit' (the page names the country as
 * eligible; US file), its sourceCapturedAt is 0–30 days old at render time (UTC
 * day, same rule as lib/landings.ts), and EVERY mapped product is current
 * (isChallengeFresh) and still sold to new buyers (soldToNewBuyers !== false).
 * A partial mapping excludes the firm. Files are allow-lists: any other status
 * (or a missing/blank restriction list) never qualifies, and nothing is
 * inferred from notes.
 *
 * Index gate per language (noindex + out of the sitemap by default):
 *   1. ≥1 qualifying firm with first-party evidence ≤30 days old,
 *   2. a writer verdict content/verdicts/country/<slug>[.ru].md (lib/verdicts.ts),
 *   3. ≥BEST_FOR_MIN_DIFF_FIELDS differing fields across ≥BEST_FOR_MIN_FIRMS
 *      listed firms (same operating-plan quality gate as best-for pages).
 * Hreflang only when BOTH languages exist and both pass.
 */

export type CountryLang = 'en' | 'ru'

export const COUNTRY_ACCESS_DIR = 'content/data/country-access'
export const COUNTRY_EVIDENCE_MAX_AGE_DAYS = 30
export const COUNTRY_EN_PREFIX = '/best-prop-firms-in-'
export const COUNTRY_RU_PREFIX = '/ru/luchshie-prop-firmy-'
export const COUNTRY_RU_DEFAULT_INFIX = 'v'
export const COUNTRY_MIN_DIFF_FIELDS = BEST_FOR_MIN_DIFF_FIELDS
export const COUNTRY_MIN_FIRMS = BEST_FOR_MIN_FIRMS

/** Comparison fields shown on every country page (existing best-for field specs). */
export const COUNTRY_FIELDS: BestForFieldKey[] = [
  'profitSplitPct',
  'drawdownType',
  'maxLossPct',
  'dailyLossPct',
  'payoutFrequency',
  'payoutFirstDays',
  'minTradingDays',
  'maxTradingDays',
  'phases',
  'consistencyRule',
  'eaAllowed',
  'newsTradingAllowed',
  'platforms',
  'entryPriceUsd',
]

export const COUNTRY_QUALIFYING_STATUSES = ['policy-supported', 'explicit'] as const

export interface CountryFirmEvidence {
  firmSlug: string
  firmName: string
  accessStatus: string
  productSlugs: string[]
  sourceUrl: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  evidenceLabel: string
  evidenceSummary: string
  decisionNote: string
  sourceQuote?: string
  /** Product-line scope when one firm has several rows (e.g. 'cfd' vs 'futures'). */
  assetClass?: string
  /** Platform scope of this row's policy (US-file style), e.g. "Match-Trader only". */
  platformConstraint?: string
}

export interface CountryNames { en?: string; ru?: string }

/** UK allow-list shape plus optional country metadata. */
export interface CountryEvidenceFile {
  methodology: string
  firms: CountryFirmEvidence[]
  countryCode?: string
  name?: CountryNames
  ruSlug?: string
  ruInfix?: string
  methodologyRu?: string
}

export interface CountryDefinition {
  slug: string
  countryCode: string | null
  /** From name.en / name.ru only; en is null when the file has no name (page stays noindex). */
  names: { en: string | null; ru: string | null }
  /** Visible EN label: name.en, else the raw file slug (incomplete state, never indexable). */
  displayName: string
  enPath: string
  /** null unless the file sets ruSlug and a Russian name. */
  ruPath: string | null
  methodology: string
  methodologyRu: string | null
  firms: CountryFirmEvidence[]
  /** Repo-relative evidence file (sitemap lastmod source). */
  file: string
}

/** One qualifying evidence row and ONLY the products mapped to that row. */
export interface CountryEvidenceGroup {
  evidence: CountryFirmEvidence
  products: Challenge[]
}

/**
 * One card per firmSlug. A firm may have several qualifying rows (product lines
 * with different policies); each keeps its own products, source and scope.
 * `products` is the de-duplicated list of all group products, used only for the
 * rule-comparison cells and sitemap lastmod — never to attach one row's policy
 * to another row's products.
 */
export interface CountryRankedFirm extends BestForRankedFirm {
  groups: CountryEvidenceGroup[]
}

export interface CountryPageModel {
  country: CountryDefinition
  lang: CountryLang
  path: string
  twinPath: string | null
  ranked: CountryRankedFirm[]
  /** Evidence ROWS in the file that do not qualify right now (stale source, stale/unsold/missing product, other status). */
  excludedCount: number
  /** Unique listed firmSlugs (= ranked.length); drives every "N firms" figure. */
  firmCount: number
  differingFieldCount: number
  differingFields: BestForFieldKey[]
  fields: BestForFieldKey[]
  hasVerdict: boolean
  verdict: Verdict | null
  indexable: boolean
  reasons: string[]
  /** Newest first-party date behind the listed firms (YYYY-MM-DD), '' when none. */
  latestSourceDate: string
  h1: string
  metaTitle: string
  metaDescription: string
  methodology: string
}

/**
 * Content root for country evidence + verdicts. Tests point this at a temp
 * fixture tree via TFH_COUNTRY_CONTENT_ROOT; production always uses cwd.
 */
export function countryContentRoot(): string {
  return process.env.TFH_COUNTRY_CONTENT_ROOT || process.cwd()
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Same 30-day UTC-day rule as isAccessEvidenceFresh in lib/landings.ts (UK/US hubs). */
export function isCountryEvidenceFresh(sourceCapturedAt: string, now = new Date()): boolean {
  if (typeof sourceCapturedAt !== 'string' || !ISO_DATE_RE.test(sourceCapturedAt)) return false
  const captured = new Date(`${sourceCapturedAt}T00:00:00Z`)
  if (Number.isNaN(captured.getTime()) || captured.toISOString().slice(0, 10) !== sourceCapturedAt) return false
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const ageDays = Math.floor((todayUtc - captured.getTime()) / 86_400_000)
  return ageDays >= 0 && ageDays <= COUNTRY_EVIDENCE_MAX_AGE_DAYS
}

/**
 * Slugs that already have a dedicated page (static app folder, MDX page or a
 * post that next.config.ts would redirect) can never be served by the
 * template. Checked against the app/content tree, not a hard-coded list.
 */
function enSlugTaken(slug: string, appRoot: string): boolean {
  const segment = `best-prop-firms-in-${slug}`
  return fs.existsSync(path.join(appRoot, 'app', segment))
    || fs.existsSync(path.join(appRoot, 'content/pages', `${segment}.md`))
    || fs.existsSync(path.join(appRoot, 'content/posts', `${segment}.md`))
}

function ruSegmentTaken(segment: string, appRoot: string): boolean {
  return fs.existsSync(path.join(appRoot, 'app/ru', segment))
}

/** RU path segment: luchshie-prop-firmy-<ruInfix ?? 'v'>-<ruSlug>. */
export function countryRuSegment(ruSlug: string, ruInfix?: string | null): string {
  return `${COUNTRY_RU_PREFIX.slice('/ru/'.length)}${ruInfix || COUNTRY_RU_DEFAULT_INFIX}-${ruSlug}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const REQUIRED_FIRM_FIELDS = ['firmSlug', 'firmName', 'accessStatus', 'sourceUrl', 'sourceCapturedAt', 'evidenceLabel', 'evidenceSummary', 'decisionNote'] as const

/** Validation problems for one parsed evidence file; empty when valid. */
export function countryEvidenceProblems(data: unknown, fileSlug: string): string[] {
  const problems: string[] = []
  const file = data as Partial<CountryEvidenceFile> | null
  if (!file || typeof file !== 'object' || Array.isArray(file)) return ['file must be a JSON object']
  if (!SLUG_RE.test(fileSlug)) problems.push('file slug must be lowercase a-z0-9 words joined by "-"')
  if (file.countryCode !== undefined && (typeof file.countryCode !== 'string' || !/^[A-Z]{2}$/.test(file.countryCode))) {
    problems.push('countryCode, when present, must be ISO 3166-1 alpha-2 (e.g. "NG")')
  }
  if (file.ruSlug !== undefined && (typeof file.ruSlug !== 'string' || !SLUG_RE.test(file.ruSlug))) {
    problems.push('ruSlug, when present, must be lowercase a-z0-9 words joined by "-"')
  }
  if (file.ruInfix !== undefined && (typeof file.ruInfix !== 'string' || !/^[a-z]{1,4}$/.test(file.ruInfix))) {
    problems.push('ruInfix, when present, must be a short lowercase preposition such as "v" or "na"')
  }
  if (file.name !== undefined && (typeof file.name !== 'object' || file.name === null || Array.isArray(file.name))) {
    problems.push('name, when present, must be an object { en, ru }')
  }
  if (!isNonEmptyString(file.methodology)) problems.push('methodology is required')
  if (!Array.isArray(file.firms)) {
    problems.push('firms must be an array')
  } else {
    file.firms.forEach((firm, index) => {
      const row = firm as Partial<CountryFirmEvidence> | null
      for (const key of REQUIRED_FIRM_FIELDS) {
        if (!row || !isNonEmptyString(row[key])) problems.push(`firms[${index}].${key} is required`)
      }
      if (row && !/^https:\/\/\S+$/.test(String(row.sourceUrl ?? ''))) problems.push(`firms[${index}].sourceUrl must be an https URL`)
      if (row && !ISO_DATE_RE.test(String(row.sourceCapturedAt ?? ''))) problems.push(`firms[${index}].sourceCapturedAt must be YYYY-MM-DD`)
      if (!row || !Array.isArray(row.productSlugs) || row.productSlugs.length === 0 || !row.productSlugs.every(isNonEmptyString)) {
        problems.push(`firms[${index}].productSlugs must list at least one product slug`)
      }
    })
  }
  return problems
}

function trimmedOrNull(value: unknown): string | null {
  return isNonEmptyString(value) ? value.trim() : null
}

/** Candidate evidence files: content/data/<slug>-access-evidence.json, then content/data/country-access/<slug>.json. */
function countryEvidenceFiles(root: string): Array<{ slug: string; rel: string }> {
  const out: Array<{ slug: string; rel: string }> = []
  const dataDir = path.join(root, 'content/data')
  if (fs.existsSync(dataDir)) {
    for (const name of fs.readdirSync(dataDir).sort()) {
      const match = /^(.+)-access-evidence\.json$/.exec(name)
      if (match && fs.statSync(path.join(dataDir, name)).isFile()) out.push({ slug: match[1], rel: `content/data/${name}` })
    }
  }
  const extraDir = path.join(root, COUNTRY_ACCESS_DIR)
  if (fs.existsSync(extraDir)) {
    for (const name of fs.readdirSync(extraDir).sort()) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue
      out.push({ slug: name.replace(/\.json$/, ''), rel: `${COUNTRY_ACCESS_DIR}/${name}` })
    }
  }
  return out
}

/**
 * Every country the template serves. Slugs that already have a dedicated route
 * (uk, us, india today) are skipped BEFORE parsing, so their files are never
 * read or validated here. Invalid files fail loudly (like verdicts); the same
 * slug in both search paths is an error rather than a silent pick.
 */
export function listCountryDefinitions(root = countryContentRoot(), appRoot = process.cwd()): CountryDefinition[] {
  const out: CountryDefinition[] = []
  const seen = new Map<string, string>()
  for (const { slug, rel } of countryEvidenceFiles(root)) {
    if (enSlugTaken(slug, appRoot)) continue
    const data = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as CountryEvidenceFile
    // The <slug>-access-evidence.json glob also matches firm-level files with another
    // shape (e.g. russian-fundingpips-access-evidence.json). Only a top-level `firms`
    // allow-list makes a file country evidence; once it has one, it must be valid.
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('firms' in data)) continue
    const previous = seen.get(slug)
    if (previous) throw new Error(`Country evidence for "${slug}" exists twice: ${previous} and ${rel}`)
    seen.set(slug, rel)
    const problems = countryEvidenceProblems(data, slug)
    if (problems.length) throw new Error(`Invalid country evidence ${rel}: ${problems.join('; ')}`)
    const enName = trimmedOrNull(data.name?.en)
    const ruName = trimmedOrNull(data.name?.ru)
    const ruSegment = data.ruSlug ? countryRuSegment(data.ruSlug, data.ruInfix) : null
    const ruPath = ruSegment && ruName && !ruSegmentTaken(ruSegment, appRoot) ? `/ru/${ruSegment}` : null
    out.push({
      slug,
      countryCode: trimmedOrNull(data.countryCode),
      names: { en: enName, ru: ruName },
      displayName: enName ?? slug,
      enPath: `${COUNTRY_EN_PREFIX}${slug}`,
      ruPath,
      methodology: data.methodology.trim(),
      methodologyRu: trimmedOrNull(data.methodologyRu),
      firms: data.firms,
      file: rel,
    })
  }
  return out
}

export function getCountryBySlug(slug: string, root = countryContentRoot()): CountryDefinition | undefined {
  return listCountryDefinitions(root).find(country => country.slug === slug)
}

export function getCountryByRuSegment(segment: string, root = countryContentRoot()): CountryDefinition | undefined {
  return listCountryDefinitions(root).find(country => country.ruPath === `/ru/${segment}`)
}

/** EN [slug] params: `best-prop-firms-in-<slug>` for each discovered country. */
export function countryEnSegments(root = countryContentRoot()): string[] {
  return listCountryDefinitions(root).map(country => country.enPath.slice(1))
}

/** RU params: `luchshie-prop-firmy-v-<ruSlug>` for each country that configures one. */
export function countryRuSegments(root = countryContentRoot()): string[] {
  return listCountryDefinitions(root).flatMap(country => country.ruPath ? [country.ruPath.slice('/ru/'.length)] : [])
}

export function countrySlugFromEnSegment(segment: string, root = countryContentRoot()): string | undefined {
  if (!segment.startsWith('best-prop-firms-in-')) return undefined
  const slug = segment.slice('best-prop-firms-in-'.length)
  return getCountryBySlug(slug, root)?.slug
}

/** Mapped products, all-or-nothing (same rule as freshMappedProducts in lib/landings.ts) plus soldToNewBuyers. */
function currentMappedProducts(evidence: CountryFirmEvidence, now: Date): Challenge[] {
  const bySlug = new Map(getChallengesByFirm(evidence.firmSlug).map(product => [product.productSlug, product]))
  const products = evidence.productSlugs.flatMap(productSlug => {
    const product = bySlug.get(productSlug)
    return product && isChallengeFresh(product, now) && product.soldToNewBuyers !== false ? [product] : []
  })
  return products.length === evidence.productSlugs.length ? products : []
}

function russiaStatusOf(firm: Firm): RankingRussiaStatus {
  const status = firm.russiaStatus
  return status === 'available' || status === 'restricted' || status === 'unclear' || status === 'unverified'
    ? status
    : 'unverified'
}

export function joinNatural(values: string[], lang: CountryLang): string {
  if (values.length <= 1) return values[0] ?? ''
  const and = lang === 'ru' ? ' и ' : ' and '
  if (values.length === 2) return `${values[0]}${and}${values[1]}`
  return `${values.slice(0, -1).join(', ')},${and}${values.at(-1)}`
}

function rankCountry(country: CountryDefinition, lang: CountryLang, now: Date): { ranked: CountryRankedFirm[]; excludedCount: number } {
  const firmsBySlug = new Map(getAllFirms().map(firm => [firmSlug(firm.name), firm]))
  // Group qualifying rows by firmSlug in file order; never keep only the last row per firm.
  const groupsBySlug = new Map<string, CountryEvidenceGroup[]>()
  let excludedCount = 0
  for (const evidence of country.firms) {
    const firm = firmsBySlug.get(evidence.firmSlug)
    const products = firm
      && (COUNTRY_QUALIFYING_STATUSES as readonly string[]).includes(evidence.accessStatus)
      && isCountryEvidenceFresh(evidence.sourceCapturedAt, now)
      ? currentMappedProducts(evidence, now)
      : []
    if (!firm || !products.length) {
      excludedCount += 1
      continue
    }
    groupsBySlug.set(evidence.firmSlug, [...(groupsBySlug.get(evidence.firmSlug) ?? []), { evidence, products }])
  }

  const ranked: CountryRankedFirm[] = []
  for (const [slug, groups] of groupsBySlug) {
    const firm = firmsBySlug.get(slug)!
    const products = [...new Map(groups.flatMap(group => group.products).map(product => [product.productSlug, product])).values()]
    const fieldValues: Partial<Record<BestForFieldKey, string | null>> = {}
    for (const key of COUNTRY_FIELDS) fieldValues[key] = BEST_FOR_FIELD_SPECS[key].read(firm, products)
    const count = products.length
    const highlight = lang === 'ru'
      ? `Продуктов с актуальными данными: ${count}${groups.length > 1 ? ` (линеек с отдельной политикой: ${groups.length})` : ''}`
      : `${count} current ${count === 1 ? 'product' : 'products'}${groups.length > 1 ? ` across ${groups.length} separately sourced product lines` : ''}`
    ranked.push({
      firm,
      slug,
      products,
      highlight,
      russiaStatus: russiaStatusOf(firm),
      // RU sign-up CTA only where firms.json russiaStatus is 'available' (lib/russiaAvailability.ts).
      showRuSignupCta: lang === 'ru' && russiaStatusOf(firm) === 'available',
      fieldValues,
      sortKeys: [-firm.score],
      groups,
    })
  }

  // EN: editorial score descending (UK landing pattern), then name.
  const byScore = (a: CountryRankedFirm, b: CountryRankedFirm) =>
    b.firm.score - a.firm.score || a.firm.name.localeCompare(b.firm.name)
  ranked.sort(byScore)

  if (lang === 'ru') {
    // Existing RU order (lib/russianRanking.ts + lib/bestFor.ts rankBestFor): Russia-available
    // firms first with active pins (BrightFunded) ahead; FundedNext last among the rest.
    const statusFor = (slug: string): RankingRussiaStatus => ranked.find(row => row.slug === slug)?.russiaStatus ?? 'unverified'
    const pinRank = (pin: number) => (pin < 0 ? Number.POSITIVE_INFINITY : pin)
    ranked.sort((a, b) => {
      const aOpen = a.russiaStatus === 'available'
      const bOpen = b.russiaStatus === 'available'
      if (aOpen !== bOpen) return aOpen ? -1 : 1
      if (aOpen) {
        const pinCmp = pinRank(activePinIndex(a.slug, statusFor)) - pinRank(activePinIndex(b.slug, statusFor))
        if (pinCmp !== 0) return pinCmp
      } else {
        if (a.slug === 'fundednext' && b.slug !== 'fundednext') return 1
        if (b.slug === 'fundednext' && a.slug !== 'fundednext') return -1
      }
      return byScore(a, b)
    })
  }
  return { ranked, excludedCount }
}

function defaultCopy(country: CountryDefinition, lang: CountryLang, count: number) {
  if (lang === 'ru') {
    const ru = country.names.ru ?? country.displayName
    return {
      h1: `Проп-фирмы по стране: ${ru} — ${count} с актуальной политикой`,
      metaTitle: `Проп-фирмы, страна: ${ru} — ${count} по первоисточникам`,
      metaDescription: `Проп-фирмы, чья собственная политика на дату проверки не исключает страну «${ru}». Сравнение правил, выплат и платформ; только первоисточники не старше 30 дней.`,
    }
  }
  const name = country.displayName
  return {
    h1: `Prop Firms for Traders in ${name}: ${count} With a Current Country Policy`,
    metaTitle: `Prop Firms in ${name}: ${count} With a Current Policy`,
    metaDescription: `Prop firms whose own first-party policy does not exclude ${name} residents, compared on rules, payouts and platforms. Sources checked within 30 days.`,
  }
}

export function buildCountryPageModel(
  slug: string,
  lang: CountryLang,
  now = new Date(),
  /** Content root for evidence + verdicts; tests pass a temp fixture tree. */
  root = countryContentRoot(),
): CountryPageModel | null {
  const country = getCountryBySlug(slug, root)
  if (!country) return null
  const pagePath = lang === 'ru' ? country.ruPath : country.enPath
  if (!pagePath) return null

  const { ranked, excludedCount } = rankCountry(country, lang, now)
  const { count, fields } = countDifferingFields(ranked, COUNTRY_FIELDS)
  const verdict = loadVerdict('country', country.slug, lang, root)
  const reasons: string[] = []
  if (!country.names.en) reasons.push(`missing name.en in ${country.file}`)
  if (lang === 'ru' && !country.names.ru) reasons.push(`missing name.ru in ${country.file}`)
  if (!ranked.length) reasons.push(`no firm has first-party evidence ≤${COUNTRY_EVIDENCE_MAX_AGE_DAYS} days old with current mapped products`)
  if (ranked.length < COUNTRY_MIN_FIRMS) reasons.push(`need at least ${COUNTRY_MIN_FIRMS} listed firms (have ${ranked.length})`)
  if (count < COUNTRY_MIN_DIFF_FIELDS) reasons.push(`need ≥${COUNTRY_MIN_DIFF_FIELDS} differing fields (have ${count})`)
  if (!verdict) reasons.push(`missing writer verdict content/verdicts/country/${country.slug}${lang === 'ru' ? '.ru' : ''}.md`)

  const dates = ranked.flatMap(row => row.groups.flatMap(group => [group.evidence.sourceCapturedAt, ...group.products.map(product => product.sourceCapturedAt)])).filter(Boolean).sort()
  const copy = defaultCopy(country, lang, new Set(ranked.map(row => row.slug)).size)
  return {
    country,
    lang,
    path: pagePath,
    twinPath: lang === 'ru' ? country.enPath : country.ruPath,
    ranked,
    excludedCount,
    firmCount: new Set(ranked.map(row => row.slug)).size,
    differingFieldCount: count,
    differingFields: fields,
    fields: COUNTRY_FIELDS,
    hasVerdict: verdict != null,
    verdict,
    indexable: reasons.length === 0,
    reasons,
    latestSourceDate: dates.at(-1) ?? '',
    h1: verdict?.h1?.trim() || copy.h1,
    metaTitle: verdict?.title?.trim() || copy.metaTitle,
    metaDescription: verdict?.description?.trim() || copy.metaDescription,
    methodology: lang === 'ru' ? country.methodologyRu ?? '' : country.methodology,
  }
}

export function getCountryPageModels(now = new Date(), root = countryContentRoot()): CountryPageModel[] {
  return listCountryDefinitions(root).flatMap(country => (['en', 'ru'] as CountryLang[]).flatMap(lang => {
    const model = buildCountryPageModel(country.slug, lang, now, root)
    return model ? [model] : []
  }))
}

export function indexableCountryPaths(now = new Date(), root = countryContentRoot()): string[] {
  return getCountryPageModels(now, root).filter(model => model.indexable).map(model => model.path)
}

/** Every path the template can render (indexable or not). */
export function allCountryPaths(root = countryContentRoot()): string[] {
  return listCountryDefinitions(root).flatMap(country => [country.enPath, ...(country.ruPath ? [country.ruPath] : [])])
}

/** EN↔RU hreflang pair only when BOTH sides exist AND both are indexable. */
export function countryRoutePair(pathname: string, now = new Date(), root = countryContentRoot()): { en: string; ru: string } | undefined {
  const country = listCountryDefinitions(root).find(item => item.enPath === pathname || item.ruPath === pathname)
  if (!country?.ruPath) return undefined
  const en = buildCountryPageModel(country.slug, 'en', now, root)
  const ru = buildCountryPageModel(country.slug, 'ru', now, root)
  if (!en?.indexable || !ru?.indexable) return undefined
  return { en: en.path, ru: ru.path }
}
