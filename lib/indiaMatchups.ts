import type { Metadata } from 'next'

export interface IndiaMatchupConfig {
  slug: string
  title: string
  firmSlugs: readonly [string, string]
  expectedProductCount: number
  metaTitle: string
  metaDescription: string
  heroDescription: string
  hubQuestion: string
  hubSummary: string
  decisionTags: readonly string[]
  representativeProducts: readonly [string, string]
  defaultPriority:
    | 'entry-cost'
    | 'funded-cost'
    | 'payout-speed'
    | 'loss-room'
    | 'ea'
    | 'swing'
    | 'evidence'
}

export const INDIA_MATCHUPS: Record<string, IndiaMatchupConfig> = {
  'fundingpips-vs-bright-funded': {
    slug: 'fundingpips-vs-bright-funded',
    title: 'FundingPips vs Bright Funded',
    firmSlugs: ['fundingpips', 'bright-funded'],
    expectedProductCount: 8,
    metaTitle: 'FundingPips vs Bright Funded India (2026)',
    metaDescription:
      'Compare FundingPips and Bright Funded for India: RBI screening, KYC, payout rails, challenge costs, drawdown and source-dated product rules.',
    heroDescription:
      'Compare country access, RBI screening, KYC, payout rails and exact challenge rules without turning 2 different firms into a single unsupported winner.',
    hubQuestion:
      'Faster verified request rules or more published payout rails?',
    hubSummary:
      'Compare product breadth, request timing and rule-change risk against Bank and Crypto rails plus EUR checkout evidence.',
    decisionTags: ['Crypto vs Bank + Crypto', 'USD unknown vs EUR', 'Rule-change watch'],
    representativeProducts: ['2-step-standard', 'bright-funded-1-step'],
    defaultPriority: 'payout-speed',
  },
  'fundingpips-vs-fxify': {
    slug: 'fundingpips-vs-fxify',
    title: 'FundingPips vs FXIFY',
    firmSlugs: ['fundingpips', 'fxify'],
    expectedProductCount: 13,
    metaTitle: 'FundingPips vs FXIFY India (2026)',
    metaDescription:
      'Compare FundingPips and FXIFY for India: RBI screening, KYC, payout rails, challenge costs, drawdown and source-dated product rules.',
    heroDescription:
      'Compare country access, RBI screening, dual-verification requirements, payout rails and exact challenge rules without hiding unknown prices or payout timing.',
    hubQuestion:
      'Crypto payouts and restricted EA rules or Rise payouts and wider EA coverage?',
    hubSummary:
      'Compare Crypto and Rise payout evidence, EA rule coverage and the difference between unknown and published USD challenge prices.',
    decisionTags: ['Crypto vs Rise', 'Unknown price vs USD', 'EA rule coverage'],
    representativeProducts: ['2-step-pro', 'two-phase-classic'],
    defaultPriority: 'evidence',
  },
  'bright-funded-vs-fxify': {
    slug: 'bright-funded-vs-fxify',
    title: 'Bright Funded vs FXIFY',
    firmSlugs: ['bright-funded', 'fxify'],
    expectedProductCount: 11,
    metaTitle: 'Bright Funded vs FXIFY India (2026)',
    metaDescription:
      'Compare Bright Funded and FXIFY for India: RBI screening, KYC, payout rails, EUR versus USD costs and 11 source-dated product-rule records.',
    heroDescription:
      'Compare a smaller EUR-priced lineup with Bank and Crypto payout evidence against a wider USD-priced lineup using Rise, without converting currencies or filling evidence gaps.',
    hubQuestion:
      'Bank and Crypto rails or more products with wider EA coverage?',
    hubSummary:
      'Compare 3 Bright Funded paths with 8 FXIFY paths across payout evidence, KYC, pricing currency, EA rules and published request timing.',
    decisionTags: ['Bank + Crypto vs Rise', '3 products vs 8', 'EUR vs USD'],
    representativeProducts: ['bright-funded-1-step', 'two-phase-classic'],
    defaultPriority: 'evidence',
  },
}

export function indiaMatchupPath(config: IndiaMatchupConfig) {
  return `/best-prop-firms-in-india/${config.slug}`
}

export function indiaMatchupMetadata(config: IndiaMatchupConfig): Metadata {
  const path = indiaMatchupPath(config)
  return {
    title: { absolute: config.metaTitle },
    description: config.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${config.title} for India`,
      description:
        'An India-specific matchup using dated country, KYC, payout and product-rule evidence.',
      url: path,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${config.title} India`,
      description:
        `Compare ${config.expectedProductCount} India-screened products by cost, payout timing, risk rules and evidence strength.`,
    },
  }
}

export function getIndiaMatchupConfig(slug: string) {
  const config = INDIA_MATCHUPS[slug]
  if (!config) throw new Error(`Unknown India matchup: ${slug}`)
  return config
}
