import type { Firm } from './firms'

export function firmPlatformSourceUrl(firm: Pick<Firm, 'platformEvidence' | 'officialUrl'>): string | null {
  if (!firm.platformEvidence) return null
  try {
    const source = new URL(firm.platformEvidence.sourceUrl)
    const officialHost = new URL(firm.officialUrl).hostname.replace(/^www\./, '')
    return source.protocol === 'https:' && !source.username && !source.password
      && (source.hostname === officialHost || source.hostname.endsWith(`.${officialHost}`)) ? source.href : null
  } catch { return null }
}

export function firmPlatformEvidenceStatus(firm: Pick<Firm, 'platformEvidence' | 'officialUrl'>, now = new Date()): 'uncaptured' | 'fresh' | 'recapture-required' {
  const evidence = firm.platformEvidence
  if (!evidence) return 'uncaptured'
  if (!firmPlatformSourceUrl(firm) || typeof evidence.sourceQuote !== 'string' || !evidence.sourceQuote.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(evidence.sourceCapturedAt)) return 'recapture-required'
  const captured = new Date(`${evidence.sourceCapturedAt}T00:00:00Z`)
  if (!Number.isFinite(captured.getTime()) || captured.toISOString().slice(0, 10) !== evidence.sourceCapturedAt) return 'recapture-required'
  const age = Math.floor((now.getTime() - captured.getTime()) / 86_400_000)
  return age >= 0 && age <= 30 ? 'fresh' : 'recapture-required'
}

/** Legacy lists remain explicitly unverified; a known stale capture cannot count as a current filter match. */
export function directoryPlatformNames(firm: Pick<Firm, 'platforms' | 'platformEvidence' | 'officialUrl'>, now = new Date()): string[] {
  return firmPlatformEvidenceStatus(firm, now) === 'recapture-required' ? [] : firm.platforms
}
