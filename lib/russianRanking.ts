import config from '../content/data/ru-ranking.json'

export type RankingRussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

/** Editorial pins from content/data/ru-ranking.json, in order. */
export const RU_RANKING_PINS: readonly string[] = config.pinnedFirst

/** Status-first order shared with the /ru home table (components/home/homeData.ts). */
export const RUSSIA_STATUS_ORDER: Record<RankingRussiaStatus, number> = {
  available: 0, unclear: 1, unverified: 1, restricted: 2,
}

export interface RankableFirm {
  slug: string
  name: string
  score: number
}

/** Index of an active pin, or -1. A pin is active only while the firm is open to Russia. */
export function activePinIndex(
  slug: string,
  statusFor: (slug: string) => RankingRussiaStatus,
  pins: readonly string[] = RU_RANKING_PINS,
): number {
  const index = pins.indexOf(slug)
  return index >= 0 && statusFor(slug) === 'available' ? index : -1
}

/**
 * Order for the /ru ranking hub: active pins first (in config order), then
 * Russia access status, then score, then name.
 */
export function compareRussianRanking(
  a: RankableFirm,
  b: RankableFirm,
  statusFor: (slug: string) => RankingRussiaStatus,
  pins: readonly string[] = RU_RANKING_PINS,
): number {
  const pinA = activePinIndex(a.slug, statusFor, pins)
  const pinB = activePinIndex(b.slug, statusFor, pins)
  const pinRank = (pin: number) => (pin < 0 ? Number.POSITIVE_INFINITY : pin)
  return (pinRank(pinA) - pinRank(pinB) || 0)
    || RUSSIA_STATUS_ORDER[statusFor(a.slug)] - RUSSIA_STATUS_ORDER[statusFor(b.slug)]
    || b.score - a.score
    || a.name.localeCompare(b.name)
}
