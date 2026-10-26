import type { RussiaStatus } from './russiaStatus.ts'

/**
 * Why a neutral badge is shown (data: firms.json russiaBasis / firms-pending.json russiaBasis).
 * 'not-on-restricted-list': the firm publishes a restricted-country list and Russia is not on it (BrightFunded, CFT).
 * 'no-published-country-list': the firm publishes no country list at all (TeamTraders, EA 2026-10-26).
 */
export type RuAccessBasis = 'not-on-restricted-list' | 'no-published-country-list'

export type RuAccessBadgeInfo = { modifier: 'open' | 'neutral' | 'closed' | 'unclear'; label: string; basis?: RuAccessBasis }

/** The neutral label per basis. To change a wording, edit its one line here; the date suffix is added by ruBasisLabel. */
export const RU_BASIS_LABEL: Record<RuAccessBasis, string> = {
  'not-on-restricted-list': 'нет в списке ограничений',
  'no-published-country-list': 'ограничений по странам не опубликовано',
}

/**
 * Status labels. 'available' here means positive evidence that Russia is accepted. A firm that is 'available' only
 * because Russia is absent from its restricted list gets the neutral label from ruAccessBadge() instead.
 * Never «подтверждено».
 */
export const RU_ACCESS_BADGE: Record<RussiaStatus, RuAccessBadgeInfo> = {
  available: { modifier: 'open', label: 'Открыта для РФ' },
  restricted: { modifier: 'closed', label: 'Недоступно для РФ' },
  unclear: { modifier: 'unclear', label: 'РФ: неясно' },
  unverified: { modifier: 'unclear', label: 'РФ: не проверено' },
}

/** YYYY-MM-DD -> DD.MM.YYYY */
export function ruAccessDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/**
 * «нет в списке ограничений (на DD.MM.YYYY)»: Russia is absent from the firm's restricted list on that date.
 * Without a recorded date (pending firm with no russiaSourceCapturedAt) the label is «нет в списке ограничений»: no date is invented.
 */
export function ruBasisLabel(basis: RuAccessBasis, iso: string | null): string {
  return iso ? `${RU_BASIS_LABEL[basis]} (на ${ruAccessDate(iso)})` : RU_BASIS_LABEL[basis]
}

export function ruNotListedLabel(iso: string | null): string {
  return ruBasisLabel('not-on-restricted-list', iso)
}

/**
 * A firm that is only in content/data/firms-pending.json with russiaStatus 'available' (EA 2026-10-26, e.g. TeamTraders).
 * Its status stays 'unverified' for ranking, counters and CTA gating; only the badge changes to the neutral basis label.
 * date: the pending entry's russiaSourceCapturedAt (YYYY-MM-DD) or null when it has none.
 * basis: the entry's russiaBasis; 'no-published-country-list' renders «ограничений по странам не опубликовано (на …)»,
 * anything else the list-absence label «нет в списке ограничений (на …)».
 */
export type RuPendingNotListed = { date: string | null; basis: RuAccessBasis }

/**
 * The single label rule: status plus the 'not-on-restricted-list' evidence date (russiaBasis in data).
 * basisDate only matters for 'available'; it never changes status, sorting or CTAs.
 * pendingNotListed (pending 'available', resolved to status 'unverified') gets the same neutral label, never «Открыта для РФ».
 */
export function ruAccessBadge(status: RussiaStatus, basisDate?: string | null, pendingNotListed?: RuPendingNotListed | null): RuAccessBadgeInfo {
  if (status === 'available' && basisDate) return { modifier: 'neutral', label: ruNotListedLabel(basisDate), basis: 'not-on-restricted-list' }
  if (pendingNotListed && status === 'unverified') {
    return { modifier: 'neutral', label: ruBasisLabel(pendingNotListed.basis, pendingNotListed.date), basis: pendingNotListed.basis }
  }
  return RU_ACCESS_BADGE[status]
}
