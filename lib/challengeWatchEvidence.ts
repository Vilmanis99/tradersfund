import type { ChallengeWatchEntry } from './challengeWatch'

type CapturedProduct = { sourceCapturedAt: string }
type EvidenceDocument = { firmSlug?: string; [key: string]: unknown }

/** Keep full-product captures strict; separately date rule checks and unresolved conflicts. */
export function validateWatchCaptureProvenance(
  entry: ChallengeWatchEntry,
  products: CapturedProduct[],
  readEvidence: (file: string) => EvidenceDocument,
): string[] {
  if (entry.ruleEvidenceRefs === undefined && entry.sourceConflictEvidenceRefs === undefined) {
    return products.some(product => product.sourceCapturedAt !== entry.lastCheckedAt)
      ? ['lastCheckedAt does not match every affected product capture'] : []
  }
  const errors: string[] = []
  const conflict = entry.sourceConflictEvidenceRefs !== undefined
  const refs = conflict ? entry.sourceConflictEvidenceRefs : entry.ruleEvidenceRefs
  const mode = conflict ? 'conflict' : 'rule'
  if (conflict && (!Array.isArray(entry.productSlugs) || !entry.productSlugs.length)) return ['conflict requires affected product slugs']
  if (conflict && entry.ruleEvidenceRefs !== undefined) errors.push('cannot combine rule and conflict evidence')
  if (conflict && (entry.kind !== 'source-conflict' || entry.status !== 'watch')) {
    errors.push('independent conflict evidence is only valid for unresolved source-conflict watches')
  }
  const sourceUrls = Array.isArray(entry.sourceUrls) ? entry.sourceUrls : []
  if (!sourceUrls.length) errors.push(`${mode} watch requires first-party source URLs`)
  if (!['rule-change', 'source-conflict'].includes(entry.kind)) {
    errors.push('rule evidence cannot replace a price or lineup capture')
  }
  if (!Array.isArray(refs) || !refs.length) {
    return [...errors, `${mode} evidence refs must contain supporting evidence sections`]
  }
  const supportedUrls = new Set<string>()
  const productSources = new Map<string, Set<string>>()
  const seen = new Set<string>()
  for (const ref of refs) {
    // Only flat JSON files inside content/data; never resolve arbitrary paths.
    if (!ref || !/^[a-z0-9][a-z0-9-]*\.json$/.test(ref.file)
      || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(ref.section)) {
      errors.push(`invalid ${mode} evidence file or section`)
      continue
    }
    const key = `${ref.file}#${ref.section}`
    if (seen.has(key)) errors.push(`duplicate ${mode} evidence: ${key}`)
    seen.add(key)
    try {
      const document = readEvidence(ref.file)
      if (document.firmSlug !== entry.firmSlug) errors.push(`${key}: evidence belongs to a different or unspecified firm`)
      const section = document[ref.section]
      if (!section || typeof section !== 'object' || Array.isArray(section)) {
        errors.push(`${key}: missing evidence section`)
        continue
      }
      const source = section as { sourceUrl?: string; sourceCapturedAt?: string }
      if (source.sourceCapturedAt !== entry.lastCheckedAt) errors.push(`${key}: ${mode} capture must match lastCheckedAt`)
      if (!source.sourceUrl || !sourceUrls.includes(source.sourceUrl)) {
        errors.push(`${key}: ${mode} source must be cited by the watch entry`)
      } else supportedUrls.add(source.sourceUrl)
      if (conflict) {
        const observation = section as { productSlugs?: unknown; quote?: unknown }
        if (typeof observation.quote !== 'string' || !observation.quote.trim()) errors.push(`${key}: conflict requires a source quote`)
        if (!Array.isArray(observation.productSlugs) || !observation.productSlugs.length
          || observation.productSlugs.some(slug => typeof slug !== 'string' || !entry.productSlugs.includes(slug))) {
          errors.push(`${key}: conflict product scope must match affected products`)
        } else {
          for (const slug of observation.productSlugs as string[]) {
            const urls = productSources.get(slug) ?? new Set<string>()
            if (source.sourceUrl && sourceUrls.includes(source.sourceUrl)) urls.add(source.sourceUrl)
            productSources.set(slug, urls)
          }
        }
      }
    } catch {
      errors.push(`${key}: evidence document cannot be read`)
    }
  }
  for (const url of sourceUrls) {
    if (!supportedUrls.has(url)) errors.push(`watch source lacks dated ${mode} evidence: ${url}`)
  }
  if (conflict) for (const slug of entry.productSlugs) {
    if ((productSources.get(slug)?.size ?? 0) < 2) errors.push(`${slug}: conflict requires observations from at least two cited sources`)
  }
  return errors
}
