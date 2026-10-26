import { ruAccessDate } from './ruAccessLabel.ts'
import { russiaBasisDateFor } from './russiaAvailability'

/**
 * Prose helper for RU copy that names a firm whose russiaBasis is 'not-on-restricted-list' (EA rule 2026-10-23):
 * Russia is absent from the firm's published restricted list on the evidence date, nothing more.
 * Returns that date as DD.MM.YYYY from content/data/firms.json (russiaSourceCapturedAt), so copy such as
 * «России нет в её списке ограничений (на {date})» moves when Tracker re-checks.
 * Throws at build time if the firm loses that basis (positive evidence, restricted, unclear): the sentence would no
 * longer be true and must be rewritten, not silently rendered. Never pair it with «подтверждено» or «открыта для РФ».
 */
export function ruNotListedDate(slug: string): string {
  const iso = russiaBasisDateFor(slug)
  if (!iso) throw new Error(`ruNotListedDate(${slug}): firm has no russiaBasis 'not-on-restricted-list' in firms.json; rewrite the RU copy that uses it`)
  return ruAccessDate(iso)
}

/** One date for several such firms («23.10.2026»), or each distinct date joined («14.10.2026 / 23.10.2026»). */
export function ruNotListedDates(slugs: readonly string[]): string {
  return [...new Set(slugs.map(ruNotListedDate))].join(' / ')
}

