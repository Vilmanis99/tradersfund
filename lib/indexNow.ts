import {
  LOCALIZED_ROUTE_PAIRS,
  RUSSIAN_ONLY_ROUTES,
} from './localizedRoutes.ts'

export const INDEXNOW_KEY = 'efe7141439424e2eb37e4faaff858975'
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export function getRussianIndexNowUrls(origin = 'https://tradersfundhub.com') {
  const normalizedOrigin = origin.replace(/\/$/, '')
  return [
    ...LOCALIZED_ROUTE_PAIRS.map(pair => pair.ru),
    ...RUSSIAN_ONLY_ROUTES,
  ].map(path => `${normalizedOrigin}${path}`)
}
