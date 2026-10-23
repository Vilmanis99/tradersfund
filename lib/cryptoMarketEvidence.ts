/**
 * Typed reader for content/data/crypto-market-evidence.json. Every consumer
 * imports from here instead of the raw JSON: a JSON import infers its types
 * from the current contents, so an empty `watch` list becomes never[] and
 * breaks type-checking in every reader (2026-10-21, 32d050e).
 */
import rawCryptoMarketEvidence from '@/content/data/crypto-market-evidence.json'

export interface CryptoSourceRef {
  sourceUrl: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  sourceQuote?: string
}

/** Per-firm BTC/ETH tradability detail. null = the source does not state it either way. */
export interface CryptoBtcEthEvidence extends CryptoSourceRef {
  btcTradable: boolean | null
  ethTradable: boolean | null
  btcSymbol: string | null
  ethSymbol: string | null
  cryptoSymbols?: string[]
  cryptoSymbolCount?: number
  platforms?: string[]
  leverage?: string
  note?: string
  openGaps?: string[]
  leverageSource?: CryptoSourceRef & { note?: string }
  platformSource?: CryptoSourceRef
  supportingSources?: Array<CryptoSourceRef & { note?: string }>
  productSources?: Array<CryptoSourceRef & { productSlug: string; note?: string }>
}

export interface CryptoMarketEvidence {
  firmSlug: string
  firmName: string
  marketModel: 'crypto-native' | 'multi-asset-cfd'
  productSlugs: string[]
  sourceUrl: string
  sourcePublishedAt?: string
  sourceCapturedAt: string
  sourceQuote?: string
  evidence: string
  evidenceRu?: string
  scopeNote: string
  scopeNoteRu?: string
  productScope?: CryptoSourceRef
  payoutMethods?: CryptoSourceRef
  btcEthEvidence?: CryptoBtcEthEvidence
}

export interface CryptoMarketWatch {
  firmSlug: string
  firmName: string
  status: 'product-capture-needed' | 'market-and-product-refresh-needed'
  sourceUrl: string
  sourceCapturedAt: string
  evidence: string
  nextStep: string
  nextStepRu?: string
}

export interface CryptoPayoutAlternative {
  firmSlug?: string
  firmName?: string
  sourceUrl: string
  sourceCapturedAt: string
  [key: string]: unknown
}

export interface CryptoMarketEvidenceFile {
  methodology: string
  ranked: CryptoMarketEvidence[]
  payoutAlternative: CryptoPayoutAlternative
  watch: CryptoMarketWatch[]
}

/** Same object as the JSON module (tests mutate and restore it in place). */
export const cryptoMarketEvidence = rawCryptoMarketEvidence as unknown as CryptoMarketEvidenceFile
