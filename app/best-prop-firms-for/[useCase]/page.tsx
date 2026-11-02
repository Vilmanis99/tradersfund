import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BestForPage from '@/components/BestForPage'
import {
  BEST_FOR_USE_CASES,
  buildBestForPageModel,
  bestForRoutePair,
} from '@/lib/bestFor'

export const dynamicParams = false
export const revalidate = 3600

interface Props { params: Promise<{ useCase: string }> }

export function generateStaticParams() {
  return BEST_FOR_USE_CASES.map(useCase => ({ useCase: useCase.enSlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { useCase: slug } = await params
  const model = buildBestForPageModel(slug, 'en')
  if (!model) return {}
  const path = model.path
  const pair = bestForRoutePair(path)
  return {
    title: { absolute: model.useCase.metaTitle.en },
    description: model.useCase.metaDescription.en,
    alternates: {
      canonical: path,
      ...(pair ? { languages: { en: pair.en, ru: pair.ru, 'x-default': pair.en } } : {}),
    },
    robots: model.indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: model.useCase.metaTitle.en,
      description: model.useCase.metaDescription.en,
      url: path,
      type: 'article',
    },
  }
}

export default async function Page({ params }: Props) {
  const { useCase: slug } = await params
  const model = buildBestForPageModel(slug, 'en')
  if (!model) notFound()
  return <BestForPage model={model} />
}
