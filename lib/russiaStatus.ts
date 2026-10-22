import { firmSlug } from './firmSlug.ts'

/**
 * Pure Russia-status resolver shared by lib/russiaAvailability.ts (which feeds it
 * content/data/firms.json) and server-side row builders (which feed it
 * getAllFirms()). No data import here, so callers choose where firm data is read.
 */
export type RussiaStatus = 'available' | 'restricted' | 'unclear' | 'unverified'

/** Firms not in firms.json that are known to restrict Russia. */
const EXTRA_RESTRICTED: Record<string, RussiaStatus> = {
  the5ers: 'restricted',
  'the-5ers': 'restricted',
}

const ALIASES: Record<string, string> = {
  e8: 'e8-markets',
  apex: 'apex-trader-funding',
  lucid: 'lucid-trading',
  'funding-pips': 'fundingpips',
  brightfunded: 'bright-funded',
}

export type RussiaStatusFirm = { name: string; russiaStatus?: RussiaStatus }

export function russiaStatusesBySlug(firms: readonly RussiaStatusFirm[]): Record<string, RussiaStatus> {
  return Object.fromEntries(firms.map((firm) => [firmSlug(firm.name), firm.russiaStatus ?? 'unverified']))
}

export function resolveRussiaStatus(statusBySlug: Record<string, RussiaStatus>, slugOrName: string): RussiaStatus {
  const slug = firmSlug(slugOrName)
  const key = ALIASES[slug] ?? slug
  return EXTRA_RESTRICTED[key] ?? statusBySlug[key] ?? 'unverified'
}
