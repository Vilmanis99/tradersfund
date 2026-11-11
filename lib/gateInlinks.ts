/**
 * Footer (and other chrome) inlinks for template country pages and best-for
 * pages. Lists are built from the same index gates as the sitemap
 * (`getCountryPageModels` / `getBestForPageModels`): a noindex page is never
 * linked. EN callers receive only EN hrefs; RU callers receive RU hrefs only
 * when that language's gate passes.
 */
import { BEST_FOR_USE_CASES, getBestForPageModels } from './bestFor.ts'
import { getCountryPageModels } from './countryPages.ts'

export type GateInlink = { label: string; href: string }

export function indexableCountryNavLinks(
  lang: 'en' | 'ru',
  now = new Date(),
  root?: string,
): GateInlink[] {
  return getCountryPageModels(now, root)
    .filter(model => model.lang === lang && model.indexable)
    .sort((a, b) => a.country.slug.localeCompare(b.country.slug))
    .map(model => ({
      label: (lang === 'ru' ? model.country.names.ru : model.country.names.en) || model.country.displayName,
      href: model.path,
    }))
}

export function indexableBestForNavLinks(
  lang: 'en' | 'ru',
  now = new Date(),
  verdictRoot = process.cwd(),
): GateInlink[] {
  const order = new Map(BEST_FOR_USE_CASES.map((useCase, index) => [useCase.id, index]))
  return getBestForPageModels(now, verdictRoot)
    .filter(model => model.lang === lang && model.indexable)
    .sort((a, b) => (order.get(a.useCase.id) ?? 0) - (order.get(b.useCase.id) ?? 0))
    .map(model => ({
      label: model.useCase.label[lang],
      href: model.path,
    }))
}
