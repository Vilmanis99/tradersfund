import rawEvidence from '@/content/data/india-evidence.json'

export type IndiaEvidenceStatus = 'verified' | 'partial' | 'unknown'
export type IndiaPayoutRail = 'bank' | 'card' | 'crypto' | 'rise' | 'skrill' | 'wise'
export type IndiaRbiAlertStatus = 'named' | 'not-found'

export interface IndiaEvidenceField {
  status: IndiaEvidenceStatus
  summary: string
  sourceUrls: string[]
}

export interface IndiaRbiAlertEvidence {
  status: IndiaRbiAlertStatus
  sourceListUpdatedAt: string
  summary: string
  sourceUrl: string
}

export interface IndiaProductEligibility {
  mode: 'limited'
  includedProductSlugs: string[]
  accountSizeCapsUsd: Record<string, number>
  summary: string
  sourceUrls: string[]
}

export interface IndiaFirmEvidence {
  firmSlug: string
  firmName: string
  capturedAt: string
  restrictedJurisdictions: string[]
  restrictionListComplete: boolean
  payoutRails: IndiaPayoutRail[]
  productEligibility?: IndiaProductEligibility
  rbiAlert: IndiaRbiAlertEvidence
  country: IndiaEvidenceField
  checkout: IndiaEvidenceField
  kyc: IndiaEvidenceField
  payout: IndiaEvidenceField
  fees: IndiaEvidenceField
  currency: IndiaEvidenceField
  unresolved: string
}

const VALID_STATUSES = new Set<IndiaEvidenceStatus>(['verified', 'partial', 'unknown'])
const VALID_PAYOUT_RAILS = new Set<IndiaPayoutRail>([
  'bank',
  'card',
  'crypto',
  'rise',
  'skrill',
  'wise',
])
const VALID_RBI_ALERT_STATUSES = new Set<IndiaRbiAlertStatus>(['named', 'not-found'])
const REQUIRED_FIELDS = ['country', 'checkout', 'kyc', 'payout', 'fees', 'currency'] as const

function validateEvidence(value: unknown): asserts value is IndiaFirmEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('India evidence must be a non-empty array.')
  }

  const slugs = new Set<string>()
  for (const entry of value as IndiaFirmEvidence[]) {
    if (!entry.firmSlug || !entry.firmName || !entry.capturedAt || !entry.unresolved) {
      throw new Error('Each India evidence entry needs a firm, capture date, and unresolved note.')
    }
    if (slugs.has(entry.firmSlug)) {
      throw new Error(`Duplicate India evidence for ${entry.firmSlug}.`)
    }
    slugs.add(entry.firmSlug)

    if (
      !Array.isArray(entry.restrictedJurisdictions) ||
      entry.restrictedJurisdictions.length === 0 ||
      entry.restrictedJurisdictions.some(country => !country) ||
      entry.restrictedJurisdictions.some(country => country.toLowerCase() === 'india') ||
      new Set(entry.restrictedJurisdictions.map(country => country.toLowerCase())).size !==
        entry.restrictedJurisdictions.length
    ) {
      throw new Error(`Invalid restricted-jurisdiction evidence for ${entry.firmSlug}.`)
    }
    if (typeof entry.restrictionListComplete !== 'boolean') {
      throw new Error(`Missing restriction-list completeness for ${entry.firmSlug}.`)
    }

    if (
      !Array.isArray(entry.payoutRails) ||
      entry.payoutRails.length === 0 ||
      entry.payoutRails.some(rail => !VALID_PAYOUT_RAILS.has(rail)) ||
      new Set(entry.payoutRails).size !== entry.payoutRails.length
    ) {
      throw new Error(`Invalid payout-rail evidence for ${entry.firmSlug}.`)
    }

    if (entry.productEligibility) {
      const limit = entry.productEligibility
      if (
        limit.mode !== 'limited' ||
        !Array.isArray(limit.includedProductSlugs) ||
        limit.includedProductSlugs.length === 0 ||
        limit.includedProductSlugs.some(slug => !slug) ||
        new Set(limit.includedProductSlugs).size !== limit.includedProductSlugs.length ||
        !limit.summary ||
        !Array.isArray(limit.sourceUrls) ||
        limit.sourceUrls.length === 0 ||
        limit.sourceUrls.some(url => !url.startsWith('https://'))
      ) {
        throw new Error(`Invalid India product-eligibility evidence for ${entry.firmSlug}.`)
      }
      for (const [productSlug, cap] of Object.entries(limit.accountSizeCapsUsd)) {
        if (
          !limit.includedProductSlugs.includes(productSlug) ||
          !Number.isFinite(cap) ||
          cap <= 0
        ) {
          throw new Error(`Invalid India account-size cap for ${entry.firmSlug}.${productSlug}.`)
        }
      }
    }

    if (
      !entry.rbiAlert ||
      !VALID_RBI_ALERT_STATUSES.has(entry.rbiAlert.status) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.rbiAlert.sourceListUpdatedAt) ||
      !entry.rbiAlert.summary ||
      !entry.rbiAlert.sourceUrl.startsWith('https://')
    ) {
      throw new Error(`Invalid RBI Alert List evidence for ${entry.firmSlug}.`)
    }

    for (const fieldName of REQUIRED_FIELDS) {
      const field = entry[fieldName]
      if (!field || !VALID_STATUSES.has(field.status) || !field.summary) {
        throw new Error(`Invalid ${fieldName} evidence for ${entry.firmSlug}.`)
      }
      if (field.status !== 'unknown' && field.sourceUrls.length === 0) {
        throw new Error(`${entry.firmSlug}.${fieldName} needs at least one first-party source.`)
      }
    }
  }
}

validateEvidence(rawEvidence)

export const INDIA_EVIDENCE: IndiaFirmEvidence[] = rawEvidence

export const INDIA_EVIDENCE_BY_SLUG: Record<string, IndiaFirmEvidence> =
  Object.fromEntries(INDIA_EVIDENCE.map(entry => [entry.firmSlug, entry]))

export function passesIndiaRegulatoryCountryGate(entry: IndiaFirmEvidence) {
  return entry.rbiAlert.status !== 'named' && entry.country.status === 'verified'
}

export function passesIndiaProductGate(entry: IndiaFirmEvidence, productSlug: string) {
  return !entry.productEligibility ||
    entry.productEligibility.includedProductSlugs.includes(productSlug)
}

export function indiaAccountSizeCapUsd(
  entry: IndiaFirmEvidence,
  productSlug: string,
): number | null {
  return entry.productEligibility?.accountSizeCapsUsd[productSlug] ?? null
}

export function indiaEvidenceScore(entry: IndiaFirmEvidence) {
  const weight: Record<IndiaEvidenceStatus, number> = {
    verified: 2,
    partial: 1,
    unknown: 0,
  }

  return REQUIRED_FIELDS.reduce((score, fieldName) => score + weight[entry[fieldName].status], 0)
}
