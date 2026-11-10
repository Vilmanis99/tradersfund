import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CountryPage from '@/components/CountryPage'
import { buildCountryPageModel, countryRoutePair, type CountryLang } from '@/lib/countryPages'

/** Same render-time re-check as best-for / UK hub: the 30-day gate re-evaluates hourly. */
export const COUNTRY_REVALIDATE = 3600

export function countryMetadata(slug: string, lang: CountryLang): Metadata {
  const model = buildCountryPageModel(slug, lang)
  if (!model) return { robots: { index: false, follow: false } }
  const pair = countryRoutePair(model.path)
  return {
    title: { absolute: model.metaTitle },
    description: model.metaDescription,
    alternates: {
      canonical: model.path,
      ...(pair ? { languages: { en: pair.en, ru: pair.ru, 'x-default': pair.en } } : {}),
    },
    // noindex by default: only fresh evidence + verdict + ≥5 differing fields lift it.
    robots: model.indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: model.metaTitle,
      description: model.metaDescription,
      url: model.path,
      type: 'article',
    },
  }
}

export function CountryRoutePage(slug: string, lang: CountryLang) {
  const model = buildCountryPageModel(slug, lang)
  if (!model) notFound()
  return <CountryPage model={model} />
}
