import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import FirmRulesPage from '@/components/FirmRulesPage'
import { getRulesPageModel, rulesLanguageAlternates } from '@/lib/rulesPages'

/** Shared metadata + page for the RU rules twins (app/ru/<slug>-pravila/page.tsx). */
export function ruRulesMetadata(slug: string): Metadata {
  const model = getRulesPageModel(slug)
  if (!model?.ru) return {}
  const firm = model.firm.name
  const title = `Правила ${firm} 2026: просадка, консистентность, новости, советники, выплаты`
  const description = `Правила ${firm} по официальным страницам фирмы: тип просадки, дневной и максимальный убыток, консистентность, новости, советники, выходные, доля прибыли и выплаты — с источниками и датами проверки.`
  const languages = rulesLanguageAlternates(model.ru.path)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: model.ru.path, ...(languages ? { languages } : {}) },
    robots: model.ru.indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: model.ru.path, type: 'article', locale: 'ru_RU' },
  }
}

export function RuRulesPage({ slug }: { slug: string }) {
  const model = getRulesPageModel(slug)
  if (!model?.ru) notFound()
  return <FirmRulesPage model={model} lang="ru" />
}
