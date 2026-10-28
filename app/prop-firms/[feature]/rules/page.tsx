import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import FirmRulesPage from '@/components/FirmRulesPage'
import { getRulesPageModel, getRulesPageModels, rulesLanguageAlternates } from '@/lib/rulesPages'

// `feature` is the firm slug here: Next requires one param name per segment
// level, and /prop-firms/[feature] already owns it.
interface Props { params: Promise<{ feature: string }> }

// Firms without a rules block in firms.json are real 404s.
export const dynamicParams = false
// Freshness (≤30 days) and therefore robots/sitemap state are re-evaluated hourly.
export const revalidate = 3600

export async function generateStaticParams() {
  return getRulesPageModels().map(model => ({ feature: model.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature: slug } = await params
  const model = getRulesPageModel(slug)
  if (!model) return {}
  const firm = model.firm.name
  // Keep titles within 60 characters for long firm names.
  const title = [
    `${firm} Rules 2026: Drawdown, Consistency, News & EAs`,
    `${firm} Rules 2026: Drawdown, News & Payouts`,
    `${firm} Rules 2026`,
  ].find(candidate => candidate.length <= 60) ?? `${firm} Rules 2026`
  const description = `${firm} rules from its own pages: drawdown, daily and max loss, consistency, news, EAs, weekend holding, split and payouts, with sources.`
  const languages = rulesLanguageAlternates(model.en.path)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: model.en.path, ...(languages ? { languages } : {}) },
    robots: model.en.indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: model.en.path, type: 'article' },
  }
}

export default async function FirmRulesRoute({ params }: Props) {
  const { feature: slug } = await params
  const model = getRulesPageModel(slug)
  if (!model) notFound()
  return <FirmRulesPage model={model} lang="en" />
}
