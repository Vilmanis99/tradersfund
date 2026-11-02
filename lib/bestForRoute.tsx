import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BestForPage from '@/components/BestForPage'
import {
  buildBestForPageModel,
  bestForRoutePair,
  type BestForLang,
  type BestForUseCaseId,
} from '@/lib/bestFor'

export const BEST_FOR_REVALIDATE = 3600

export function bestForMetadata(useCaseId: BestForUseCaseId, lang: BestForLang): Metadata {
  const model = buildBestForPageModel(useCaseId, lang)
  if (!model) return { robots: { index: false, follow: false } }
  const pair = bestForRoutePair(model.path)
  return {
    title: { absolute: model.metaTitle },
    description: model.metaDescription,
    alternates: {
      canonical: model.path,
      ...(pair ? { languages: { en: pair.en, ru: pair.ru, 'x-default': pair.en } } : {}),
    },
    robots: model.indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: model.metaTitle,
      description: model.metaDescription,
      url: model.path,
      type: 'article',
    },
  }
}

export function BestForRoutePage(useCaseId: BestForUseCaseId, lang: BestForLang) {
  const model = buildBestForPageModel(useCaseId, lang)
  if (!model) notFound()
  return <BestForPage model={model} />
}
