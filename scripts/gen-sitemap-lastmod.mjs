#!/usr/bin/env node
/**
 * Writes content/data/sitemap-lastmod.json — stateful lastmod for sitemap sources and URLs.
 *
 * Why a committed manifest (not git at build time): Vercel builds from a shallow clone.
 *
 *   node scripts/gen-sitemap-lastmod.mjs          regenerate (full history only for migration)
 *   node scripts/gen-sitemap-lastmod.mjs --check  hashes only: fails if stale
 *
 * Stateful rules (hashVersion):
 *   - Each source stores {hash, changed, first}. Each URL stores {hash, lastmod}.
 *   - Same hashVersion + same hash → keep the stored date (idempotent on an unchanged tree).
 *   - Hash differs under the same version → set changed/lastmod to today (UTC). Content must
 *     be committed; the generator never invents dates from the clock for uncommitted trees.
 *   - hashVersion bump: re-hash content at the previous manifest commit with the new projection.
 *     If that equals the current hash, keep the old date and rewrite hash + version only.
 *     One-time bootstrap for known false-dated URLs: scripts/fixtures/lastmod-prod-seed-ii44.json
 *     (prod lastmods). Seed applies only when the URL's sources are unchanged under the new
 *     projection versus CONTENT_BASELINE (so real Thu-bundle edits still get today).
 *
 * Also writes lib/ruRouteLastmod.generated.ts for Russian dateModified / visible dates.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import {
  HASH_VERSION,
  MANIFEST_PATH,
  RU_ROUTES_PATH,
  currentHashes,
  hash,
  ruRoutesModule,
  sourceSpecs,
  urlContentHash,
  urlSourcesUnchanged,
} from './sitemap-lastmod-sources.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })
const utcDay = iso => new Date(iso).toISOString().slice(0, 10)
const todayUtc = () => new Date().toISOString().slice(0, 10)
const SEED_PATH = 'scripts/fixtures/lastmod-prod-seed-ii44.json'
/** Content tree the v2 manifest hashes were computed against (pre-Thu-bundle main). */
const CONTENT_BASELINE = 'ab52de49'
/** Chrome-only URLs (CR lastmod-classes-1030 Class B): tip vs main body unchanged aside from sitewide stamp; force provenance on hv5 migration so false 10-30 stamps roll back. */
const CHROME_ONLY_LASTMOD_ROLLBACK = new Set([
  '/best-crypto-prop-firms',
  '/best-futures-prop-firms',
  '/best-prop-firms-in-india',
  '/best-prop-firms-in-india/challenge-changes',
  '/best-prop-firms-in-india/compare',
  '/best-prop-firms-in-uk',
  '/cheapest-prop-firms',
  '/prop-firms/crypto-payouts',
  '/ru/fundednext-vs-bright-funded',
  '/ru/prop-firmy-bez-kyc',
  '/ru/vyplaty-prop-firm',
])

/**
 * Prod seed is a ONE-TIME hashVersion-migration bootstrap.
 * Returns true only while the on-disk manifest is still on an older hashVersion.
 * Once the manifest is already at HASH_VERSION, the seed must never rewrite lastmods.
 */
export function shouldApplyProdSeed(manifestHashVersion, hashVersion = HASH_VERSION) {
  return manifestHashVersion !== hashVersion
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { hashVersion: 0, sources: {}, urls: {} }
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  return {
    hashVersion: raw.hashVersion ?? 1,
    sources: raw.sources ?? {},
    urls: raw.urls ?? {},
  }
}

export function checkManifest() {
  const manifest = readManifest()
  const current = currentHashes()
  const problems = []
  if (manifest.hashVersion !== HASH_VERSION) problems.push(`hashVersion ${manifest.hashVersion} != ${HASH_VERSION}`)
  for (const [key, h] of current) {
    const entry = manifest.sources[key]
    if (!entry) problems.push(`missing ${key}`)
    else if (entry.hash !== h) problems.push(`stale ${key}`)
  }
  for (const key of Object.keys(manifest.sources)) if (!current.has(key)) problems.push(`removed ${key}`)
  return problems
}

/** Author UTC days of every commit that introduces/removes this blob. */
const blobAuthorDays = new Map()
function authorDaysForBlob(blob) {
  if (blobAuthorDays.has(blob)) return blobAuthorDays.get(blob)
  let days = []
  try {
    const out = git('log', '--all', '--format=%aI', `--find-object=${blob}`).trim()
    days = out ? out.split('\n').map(utcDay) : []
  } catch { /* empty */ }
  blobAuthorDays.set(blob, days)
  return days
}

function contentAuthoredDay(path, matchSha, matchAuthorDay, priorDifferingDay) {
  let blob
  try { blob = git('rev-parse', `${matchSha}:${path}`).trim() } catch { return matchAuthorDay }
  const candidates = authorDaysForBlob(blob).filter(day => {
    if (day > matchAuthorDay) return false
    // Allow author-day === priorDifferingDay: squash blobs are often first
    // authored on the prior tip's day and only land in a later merge commit.
    // Excluding equality forced obzor-fundingpips 10-28→10-29 blank stamps.
    if (priorDifferingDay && day < priorDifferingDay) return false
    return true
  })
  if (!candidates.length) return matchAuthorDay
  return candidates.sort()[0]
}

/** Earliest `changed` ever stored for this exact source hash across manifest history.
 * Cross-version hits can under-date after a projection bump; dateChangedSource refuses
 * any historical day on or before priorDifferingDay under the current walk. */
function earliestStoredChanged(key, tipHash) {
  let earliest = null
  let log
  try {
    log = git('log', '--all', '--format=%H', '--', MANIFEST_PATH).trim().split('\n').filter(Boolean)
  } catch { return null }
  for (const sha of log) {
    try {
      const m = JSON.parse(git('show', `${sha}:${MANIFEST_PATH}`))
      const e = m.sources?.[key]
      if (e?.hash === tipHash && e.changed) {
        if (!earliest || e.changed < earliest) earliest = e.changed
      }
    } catch { /* deleted in that commit */ }
  }
  return earliest
}

/** Project source hashes for one file at a git revision (new projection). */
function hashesAt(sha, spec) {
  try {
    const text = git('show', `${sha}:${spec.path}`)
    const out = new Map()
    for (const [key, value] of spec.project(text)) out.set(key, hash(value))
    return out
  } catch {
    return new Map()
  }
}

/**
 * Date a newly changed source via first-parent projection walk + find-object authorship.
 * Used only when the hash actually changed (or on migration for keys with no kept date).
 */
function dateChangedSource(spec, key, tipHash) {
  const historical = earliestStoredChanged(key, tipHash)
  const log = git('log', '--first-parent', '--format=%H %aI', 'HEAD', '--', spec.path).trim()
  if (!log) throw new Error(`${spec.path}: not committed yet; commit it, then regenerate`)
  const versions = log.split('\n').map(line => {
    const [sha, date] = line.split(' ')
    return { sha, day: utcDay(date), hashes: hashesAt(sha, spec) }
  })
  if (versions[0].hashes.get(key) !== tipHash) {
    throw new Error(`${key}: working tree differs from HEAD; commit ${spec.path}, then regenerate`)
  }
  let matchSha = null
  let matchDay = null
  let priorDifferingDay = null
  for (const version of versions) {
    if (version.hashes.get(key) === tipHash) {
      matchSha = version.sha
      matchDay = version.day
    } else {
      priorDifferingDay = version.day
      break
    }
  }
  const authored = contentAuthoredDay(spec.path, matchSha, matchDay, priorDifferingDay)
  const first = versions.filter(version => version.hashes.has(key)).at(-1).day
  // Cross-HV earliestStored can pre-date the current projection's first differing
  // commit (tradeday full/compare stuck on 10-26 while tip rows only match from
  // authored 10-27). Refuse historical days on or before priorDifferingDay.
  // Otherwise keep historical so squash-author days do not blank-stamp URL clusters
  // (challenge-watch 10-28→10-29 with unchanged URL hash).
  let changed = authored
  if (historical) {
    if (priorDifferingDay && historical <= priorDifferingDay) changed = authored
    else if (!authored || historical <= authored) changed = historical
    else changed = authored
  }
  return { changed, first }
}

function previousManifestCommit() {
  try {
    return git('log', '-1', '--format=%H', 'HEAD', '--', MANIFEST_PATH).trim() || null
  } catch { return null }
}

async function generate() {
  if (fs.existsSync('.git/shallow')) throw new Error('shallow clone: run `git fetch --unshallow` first')
  const manifest = readManifest()
  const current = currentHashes()
  const migrating = manifest.hashVersion !== HASH_VERSION
  const prevCommit = migrating ? previousManifestCommit() : null
  const today = todayUtc()
  const next = {}

  // Per-spec hashes at previous manifest commit (new projection) for migration.
  const prevBySpec = new Map()
  if (migrating && prevCommit) {
    for (const spec of sourceSpecs()) prevBySpec.set(spec.path, hashesAt(prevCommit, spec))
  }

  // Content baseline: tree the previous manifest's hashes described (pre-Thu-bundle main).
  // Under a new projection, re-hash that tree; matching tip hashes keep their stored dates.
  const baselineBySpec = new Map()
  let baselineSources = {}
  const baselineHashByKey = new Map()
  if (migrating) {
    try {
      // Prefer dates from the on-disk / previous-version manifest; fall back to 9d43f243.
      baselineSources = manifest.sources ?? {}
      try {
        const good = JSON.parse(git('show', `9d43f243:${MANIFEST_PATH}`))
        // Prefer older good dates when present (avoids locking 10-28 false bumps from v1).
        for (const [k, v] of Object.entries(good.sources ?? {})) {
          if (!baselineSources[k] || (v.changed && baselineSources[k].changed && v.changed < baselineSources[k].changed)) {
            baselineSources[k] = v
          }
        }
      } catch { /* optional */ }
      for (const spec of sourceSpecs()) {
        const atBase = hashesAt(CONTENT_BASELINE, spec)
        baselineBySpec.set(spec.path, atBase)
        for (const [k, h] of atBase) baselineHashByKey.set(k, h)
      }
    } catch { /* baseline missing on very old checkouts */ }
  }

  for (const spec of sourceSpecs()) {
    const keys = [...spec.project(fs.readFileSync(spec.path, 'utf8')).keys()]
    for (const key of keys) {
      const tipHash = current.get(key)
      const prev = manifest.sources[key]

      // Same hashVersion: keep entry when hash unchanged (idempotent).
      if (!migrating && prev?.hash === tipHash) {
        next[key] = prev
        continue
      }

      if (migrating) {
        const baseNewHash = baselineBySpec.get(spec.path)?.get(key)
        const baseEntry = baselineSources[key] ?? prev
        // Content unchanged since content baseline under the new projection.
        // Prefer the earlier of stored/baseline changed and provenance so a prior
        // projection's false over-date (e.g. consistencyRuleApplies on landing)
        // can roll back when the new hash function makes tip match baseline.
        if (baseNewHash === tipHash) {
          // Tip matches CONTENT_BASELINE under the new projection: date from the
          // current walk only. Do NOT min() with a prior-manifest changed day —
          // that kept cross-HV under-dates (e.g. tradeday full/compare stayed on
          // 10-26 while tip profitSplitTiers only match from 10-28). Over-dates
          // from the old projection already fall away because tip≡baseline makes
          // dateChangedSource see the older real body.
          const dated = dateChangedSource(spec, key, tipHash)
          next[key] = {
            hash: tipHash,
            changed: dated.changed,
            first: baseEntry?.first ?? prev?.first ?? dated.first,
          }
          continue
        }
        // Do NOT keep via previousManifestCommit re-hash when tip differs from
        // CONTENT_BASELINE. After lastmod is committed onto today's tree, that
        // commit already contains tip content, so prevNewHash===tipHash while
        // prev.changed still carries the old (ab52) tip's dates — the stale-
        // baseline failure mode from int/2026-10-29-lm.
        if (!baselineBySpec.size) {
          const prevNewHash = prevBySpec.get(spec.path)?.get(key)
          if (prevNewHash === tipHash && prev?.changed) {
            next[key] = { hash: tipHash, changed: prev.changed, first: prev.first }
            continue
          }
        }
      }

      // Real content change, new key, or migration off a false-dated hash: date via history.
      const dated = dateChangedSource(spec, key, tipHash)
      let changed = migrating ? dated.changed : (prev ? today : dated.changed)
      // New surface keys (challenges:landing / firm:landing) have no prior manifest
      // history, so dateChangedSource falls through to the tip blob's git author day.
      // Squashed daily releases often carry today's author date while the rendered
      // landing fields last changed with the sibling :full:/:en: tip — inherit that
      // earlier changed day when the sibling is already dated (full is projected
      // before landing in sourceSpecs order).
      if (migrating && !prev) {
        const sibling = key.includes(':landing:')
          ? key.replace(':landing:', key.startsWith('firm:') ? ':en:' : ':full:')
          : null
        const sibDay = sibling && next[sibling]?.changed
        if (sibDay && sibDay < changed) changed = sibDay
      }
      next[key] = {
        hash: tipHash,
        changed,
        first: prev?.first ?? dated.first,
      }
    }
  }

  const sources = Object.fromEntries(Object.keys(next).sort().map(key => [key, next[key]]))

  // Write sources first so sitemapLastmod / RU dates see the new hashes & dates.
  // ONE-TIME seed: only while migrating to a new hashVersion. Never when already current.
  if (!shouldApplyProdSeed(manifest.hashVersion) && migrating) {
    throw new Error('internal: migrating incongruent with shouldApplyProdSeed')
  }
  if (manifest.hashVersion === HASH_VERSION && migrating) {
    throw new Error('prod seed must not apply: manifest already at hashVersion ' + HASH_VERSION)
  }
  const seed = shouldApplyProdSeed(manifest.hashVersion) && fs.existsSync(SEED_PATH)
    ? JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')).dates ?? {}
    : {}
  if (Object.keys(seed).length && manifest.hashVersion === HASH_VERSION) {
    throw new Error('refusing to apply lastmod-prod-seed-ii44 while manifest hashVersion is already ' + HASH_VERSION)
  }

  const partial = {
    hashVersion: HASH_VERSION,
    _readme: 'Generated by scripts/gen-sitemap-lastmod.mjs. Do not edit by hand. ' +
      'Stateful: lastmod/changed moves only when the content hash changes under the same hashVersion. ' +
      'On hashVersion bump, content at the previous manifest commit is re-hashed; matching hashes keep their dates. ' +
      'Regenerate after committing content; npm run test:sitemap-lastmod fails when stale.',
    sources,
    // Empty urls so sitemapLastmod computes lastModified from sources+editorial only
    // (not the previous stateful URL dates). Gen decides keep/seed/bump below.
    urls: {},
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(partial, null, 2) + '\n')

  // URL layer via child process so sitemapLastmod sees the sources just written (no stale JSON).
  const hashByKey = new Map(Object.entries(sources).map(([k, v]) => [k, v.hash]))
  const entriesJson = execFileSync(process.execPath, ['scripts/sitemap-entries.mjs'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    env: process.env,
  })
  const entries = JSON.parse(entriesJson)
  const prevUrls = manifest.urls ?? {}
  const urls = {}
  let urlBumped = 0
  let urlSeeded = 0
  let urlKept = 0
  for (const entry of entries) {
    const pathname = new URL(entry.url).pathname.replace(/\/$/, '') || '/'
    const sourceKeys = entry.sources ?? []
    const editorial = entry.editorial ?? []
    const h = urlContentHash(sourceKeys, hashByKey, editorial)
    const prevU = prevUrls[pathname]
    let lastmod = entry.lastModified.slice(0, 10)

    if (!migrating && prevU?.hash === h) {
      lastmod = prevU.lastmod
      urlKept++
    } else if (migrating && CHROME_ONLY_LASTMOD_ROLLBACK.has(pathname)) {
      // Class B (chrome-only): only URLs allowed to move on this projection bump —
      // and only earlier (roll back false 10-30 tip stamps). Provenance / ii44 seed.
      const computed = entry.lastModified.slice(0, 10)
      if (seed[pathname]) {
        lastmod = [seed[pathname], computed].sort()[0]
        urlSeeded++
      } else {
        lastmod = computed
        urlKept++
      }
    } else if (migrating && prevU?.lastmod) {
      // Projection-only migration must not false-bump. Visible content vs cac6 is
      // unchanged for non-B URLs; keep the previous stateful lastmod (cac6/prod).
      // Real content edits are committed first; a later non-migrating regen stamps today.
      lastmod = prevU.lastmod
      urlKept++
    } else if (
      migrating
      && sourceKeys.length > 0
      && urlSourcesUnchanged(sourceKeys, hashByKey, baselineHashByKey)
    ) {
      // New URL (no prev) matching CONTENT_BASELINE under the new projection.
      if (seed[pathname]) {
        const published = entry.published ?? seed[pathname]
        lastmod = [seed[pathname], published].sort().at(-1)
        urlSeeded++
      } else {
        lastmod = entry.lastModified.slice(0, 10)
        urlKept++
      }
    } else if (!migrating && prevU && prevU.hash !== h) {
      lastmod = today
      urlBumped++
    } else if (migrating) {
      // Truly new URL with no prev state.
      lastmod = entry.lastModified.slice(0, 10)
      urlBumped++
    }

    // ii44 URLs still computing to the false squash day while content matches
    // CONTENT_BASELINE are corrected above via the seed / min(prev, computed) keep
    // path. Do NOT rewrite tip≠baseline URLs whose provenance is a real 2026-10-28
    // authorship (FundingPips etc.) to today — that created false newest-date bumps.

    urls[pathname] = { hash: h, lastmod }
  }

  const out = {
    hashVersion: HASH_VERSION,
    _readme: partial._readme,
    sources,
    urls: Object.fromEntries(Object.keys(urls).sort().map(k => [k, urls[k]])),
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(out, null, 2) + '\n')

  // RU page dates must match sitemap URL lastmods (test:sitemap-lastmod). Prefer url map.
  const { requireTs } = await import('./sitemap-entries.mjs')
  const ruDates = requireTs('lib/russianRouteLastmod.ts').expectedRussianRouteLastmods()
  for (const path of Object.keys(ruDates)) {
    if (urls[path]?.lastmod) ruDates[path] = urls[path].lastmod
  }
  fs.writeFileSync(RU_ROUTES_PATH, ruRoutesModule(ruDates))

  const srcChanged = Object.keys(sources).filter(key => manifest.sources[key]?.hash !== sources[key].hash).length
  console.log(
    `sitemap-lastmod: hashVersion=${HASH_VERSION} sources=${Object.keys(sources).length} ` +
    `(${srcChanged} hash moves) urls=${Object.keys(urls).length} ` +
    `(seeded ${urlSeeded}, kept ${urlKept}, bumped ${urlBumped}) migrating=${migrating}`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const problems = checkManifest()
    if (problems.length) {
      console.error(`sitemap-lastmod manifest is out of date (${problems.length}):\n  ${problems.slice(0, 20).join('\n  ')}\n` +
        'Commit the content change, then run: node scripts/gen-sitemap-lastmod.mjs')
      process.exit(1)
    }
    console.log('sitemap-lastmod manifest up to date')
  } else {
    await generate()
  }
}
