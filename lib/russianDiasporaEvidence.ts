import fs from 'fs'
import path from 'path'

export type RussianDiasporaCountryStatus =
  | 'not-named'
  | 'restricted'
  | 'product-specific'
  | 'conflict'

type CountryOverride = {
  status: Exclude<RussianDiasporaCountryStatus, 'not-named' | 'restricted'>
  noteRu: string
}

type DiasporaCountry = {
  key: string
  labelRu: string
  sourceName: string
}

type DiasporaFirmEvidence = {
  slug: 'fundednext' | 'bright-funded'
  name: string
  generalProductRu: string
  restrictedJurisdictions: string[]
  defaultNotNamedNoteRu: string
  restrictedNoteRu: string
  overrides: Record<string, CountryOverride>
  sources: { labelRu: string; url: string }[]
}

export type RussianDiasporaEvidence = {
  capturedAt: string
  scopeRu: string
  countries: DiasporaCountry[]
  firms: DiasporaFirmEvidence[]
}

export type RussianDiasporaCountryCheck = {
  firmSlug: DiasporaFirmEvidence['slug']
  firmName: string
  status: RussianDiasporaCountryStatus
  noteRu: string
}

export type RussianDiasporaCountryRow = DiasporaCountry & {
  checks: RussianDiasporaCountryCheck[]
}

export const russianDiasporaEvidence = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'content/data/russian-diaspora-evidence.json'),
  'utf8',
)) as RussianDiasporaEvidence

export function getRussianDiasporaCountryRows(): RussianDiasporaCountryRow[] {
  return russianDiasporaEvidence.countries.map(country => ({
    ...country,
    checks: russianDiasporaEvidence.firms.map(firm => {
      const override = firm.overrides[country.key]
      const restricted = firm.restrictedJurisdictions.includes(country.sourceName)
      return {
        firmSlug: firm.slug,
        firmName: firm.name,
        status: override?.status ?? (restricted ? 'restricted' : 'not-named'),
        noteRu: override?.noteRu
          ?? (restricted ? firm.restrictedNoteRu : firm.defaultNotNamedNoteRu),
      }
    }),
  }))
}
