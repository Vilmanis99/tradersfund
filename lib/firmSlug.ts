/**
 * Stable URL/data slug for a firm display name.
 *
 * Slugs are derived from firms.json names across the site. When a firm's
 * display name changes (e.g. "Bright Funded" -> "BrightFunded", the official
 * one-word brand), its slug must not change: /go links, review URLs,
 * challenge files and analytics all key on it.
 */
const LEGACY_SLUGS: Record<string, string> = {
  brightfunded: 'bright-funded',
}

export function firmSlug(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return LEGACY_SLUGS[slug] ?? slug
}
