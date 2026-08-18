export type OutboundRelationship = 'affiliate' | 'official'

export interface OutboundFirmConfig {
  name: string
  affiliateUrl?: string | null
}

export interface ReviewedOutboundDestination {
  affiliateUrl: string | null
  officialUrl: string
}

/** Reviewed tools/platforms that are not represented in firms.json. */
export const REVIEWED_OUTBOUND_DESTINATIONS: Record<
  string,
  ReviewedOutboundDestination
> = {
  'traders-connect': { affiliateUrl: null, officialUrl: 'https://tradersconnect.com/' },
  zulutrade: { affiliateUrl: null, officialUrl: 'https://www.zulutrade.com/' },
  'fx-replay': { affiliateUrl: null, officialUrl: 'https://www.fxreplay.com/' },
  copyfx: { affiliateUrl: null, officialUrl: 'https://roboforex.com/copy-trading/copy-top-strategies/' },
  '3commas': { affiliateUrl: null, officialUrl: 'https://3commas.io/' },
}

export function outboundSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function buildOutboundRelationships(firms: readonly OutboundFirmConfig[]) {
  const relationships: Record<string, OutboundRelationship> = {}
  for (const firm of firms) {
    relationships[outboundSlug(firm.name)] = firm.affiliateUrl ? 'affiliate' : 'official'
  }
  for (const [slug, destination] of Object.entries(REVIEWED_OUTBOUND_DESTINATIONS)) {
    relationships[slug] = destination.affiliateUrl ? 'affiliate' : 'official'
  }
  return relationships
}
