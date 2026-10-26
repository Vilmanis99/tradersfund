import { firmSlug } from './firmSlug.ts'
import { getAllCanonicalPairs } from './comparisons.ts'
import { FEATURES, getFirmsForFeature } from './features.ts'
import { isSourceHoldFirm } from './reviewStatus.ts'
import { indexableRulesHref, indexableRuRulesHref } from './rulesPages.ts'

/**
 * Related links for a firm's review page: its rules page (only when indexable),
 * every vs page it appears in, and every "best for" list that includes it.
 */
export interface RelatedLink { href: string; label: string }

export interface BestForList {
  href: string
  label: string
  /** Firm slugs that appear in the list. */
  firmSlugs: string[]
}

/**
 * Best-for list providers. Each returns the lists it publishes with the firms
 * that appear in them. The /prop-firms/<feature> pages are the lists we have
 * today; the planned best-for template registers its own provider here and
 * every review picks the links up without further changes.
 */
export type BestForProvider = { id: string; lang: 'en' | 'ru'; lists: () => BestForList[] }

export const BEST_FOR_PROVIDERS: BestForProvider[] = [
  {
    id: 'feature-pages',
    lang: 'en',
    lists: () => FEATURES.map(feature => ({
      href: `/prop-firms/${feature.slug}`,
      label: `Best prop firms: ${feature.label}`,
      firmSlugs: getFirmsForFeature(feature.slug).map(firm => firmSlug(firm.name)),
    })),
  },
]

export function getBestForListsForFirm(slug: string, lang: 'en' | 'ru' = 'en'): RelatedLink[] {
  return BEST_FOR_PROVIDERS
    .filter(provider => provider.lang === lang)
    .flatMap(provider => provider.lists())
    .filter(list => list.firmSlugs.includes(slug))
    .map(list => ({ href: list.href, label: list.label }))
}

/** Every discoverable /compare page for the firm (same set as the sitemap). */
export function getVsLinksForFirm(slug: string): RelatedLink[] {
  return getAllCanonicalPairs()
    .filter(pair => {
      const [a, b] = pair.matchup.split('-vs-')
      return (a === slug || b === slug) && !isSourceHoldFirm(a) && !isSourceHoldFirm(b)
    })
    .map(pair => {
      const other = firmSlug(pair.firmA.name) === slug ? pair.firmB : pair.firmA
      const self = other === pair.firmA ? pair.firmB : pair.firmA
      return { href: `/compare/${pair.matchup}`, label: `${self.name} vs ${other.name}` }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

export interface FirmRelatedLinkGroups {
  rules: RelatedLink | null
  vs: RelatedLink[]
  bestFor: RelatedLink[]
}

export function getFirmRelatedLinks(slug: string, firmName: string, now = new Date()): FirmRelatedLinkGroups {
  const rulesHref = indexableRulesHref(slug, now)
  return {
    rules: rulesHref ? { href: rulesHref, label: `${firmName} rules: drawdown, consistency, news, EAs and payouts` } : null,
    vs: getVsLinksForFirm(slug),
    bestFor: getBestForListsForFirm(slug, 'en'),
  }
}

/**
 * RU review variant. RU reviews already link every registered RU vs page that
 * names the firm (scripts/audit-ru-links.mjs) and carry the curated
 * «Похожие материалы» block, so this adds only what they lack: the RU rules
 * page once it is indexable, and RU best-for lists once a provider exists.
 * `exclude` drops hrefs the page already shows (the audit forbids repeats).
 */
export function getRuFirmRelatedLinks(slug: string, exclude: readonly string[] = [], now = new Date()): RelatedLink[] {
  const links: RelatedLink[] = []
  const rules = indexableRuRulesHref(slug, now)
  if (rules) links.push({ href: rules, label: 'Правила по пунктам: просадка, консистентность, новости, советники, выплаты' })
  links.push(...getBestForListsForFirm(slug, 'ru'))
  return links.filter(link => !exclude.includes(link.href))
}
