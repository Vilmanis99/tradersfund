import { readFileSync } from 'node:fs'
import {
  LOCALIZED_ROUTE_PAIRS,
  RU_CLOSED_FIRMS_PATH,
  RUSSIAN_ONLY_ROUTES,
} from './localizedRoutes.ts'

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
  return [
    ...LOCALIZED_ROUTE_PAIRS.map(pair => pair.ru),
    ...RUSSIAN_ONLY_ROUTES,
    // The RU closed-firms page is announced only while the closed list is published.
    ...(closedFirmsPublished() ? [RU_CLOSED_FIRMS_PATH] : []),
  ].map(path => `${normalizedOrigin}${path}`)
}
