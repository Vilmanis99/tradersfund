import { readFileSync } from 'node:fs'
import {
  LOCALIZED_ROUTE_PAIRS,
  RU_CLOSED_FIRMS_PATH,
  RUSSIAN_ONLY_ROUTES,
} from './localizedRoutes.ts'
import { gatedRuRulesHandwrittenPaths } from './rulesPages.ts'
import { indexableBestForPaths } from './bestFor.ts'

export const INDEXNOW_KEY = 'efe7141439424e2eb37e4faaff858975'
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** Same flag as lib/closedFirms.ts (read from disk: this module runs in plain Node scripts). */
function closedFirmsPublished(): boolean {
  try {
    const raw = readFileSync(new URL('../content/data/closed-firms.json', import.meta.url), 'utf8')
    return JSON.parse(raw).published === true
  } catch {
    return false
  }
}

export function getRussianIndexNowUrls(origin = 'https://tradersfundhub.com') {
  const normalizedOrigin = origin.replace(/\/$/, '')
  // A hand-written RU rules page held noindex by the rules gate is not announced (lib/rulesPages.ts).
  const gated = new Set(gatedRuRulesHandwrittenPaths())
  // Best-for RU pages join the sitemap only when the index gate passes (app/sitemap.ts).
  // Announce the same set — do not register them in LOCALIZED_ROUTE_PAIRS, which would
  // force hreflang even when one language fails the gate (lib/bestFor.ts).
  const indexableRuBestFor = indexableBestForPaths().filter(path => path.startsWith('/ru/'))
  return [
    ...LOCALIZED_ROUTE_PAIRS.map(pair => pair.ru),
    ...RUSSIAN_ONLY_ROUTES.filter(path => !gated.has(path)),
    // The RU closed-firms page is announced only while the closed list is published.
    ...(closedFirmsPublished() ? [RU_CLOSED_FIRMS_PATH] : []),
    ...indexableRuBestFor,
  ].map(path => `${normalizedOrigin}${path}`)
}
