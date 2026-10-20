import data from '../content/data/named-experts.json'

export interface NamedExpert {
  authorSlug: string
  displayName: string
  role: string
  bio: string
  credentials: string[]
  photoUrl: string | null
  /** Date of the person's written consent to publication (YYYY-MM-DD). */
  consentConfirmedAt: string | null
}

const EXPERTS = data.experts as NamedExpert[]

/**
 * Publication gate. A named-expert block renders only when the person has
 * supplied a name and bio and their consent is recorded. Anything missing
 * means the block, the name and the photo stay off every page.
 */
export function isPublishableExpert(expert: NamedExpert | undefined): expert is NamedExpert {
  return Boolean(
    expert &&
    expert.displayName.trim() &&
    expert.bio.trim() &&
    expert.consentConfirmedAt && /^\d{4}-\d{2}-\d{2}$/.test(expert.consentConfirmedAt),
  )
}

export function getPublishableExpert(authorSlug: string): NamedExpert | undefined {
  const expert = EXPERTS.find(entry => entry.authorSlug === authorSlug)
  return isPublishableExpert(expert) ? expert : undefined
}

export function getPublishableExperts(): NamedExpert[] {
  return EXPERTS.filter(isPublishableExpert)
}

