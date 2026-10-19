import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'

export type Crumb = { name: string; url?: string }
type BreadcrumbLd = ReturnType<typeof breadcrumbSchema>

const SITE = 'https://tradersfundhub.com'
const LABEL = { en: 'Breadcrumb', ru: 'Навигационная цепочка' } as const

function crumbsFromLd(ld: BreadcrumbLd): Crumb[] {
  return ld.itemListElement.map(entry => {
    const item = 'item' in entry ? (entry as { item?: string }).item : undefined
    return { name: entry.name, ...(item ? { url: item.startsWith(SITE) ? item.slice(SITE.length) || '/' : item } : {}) }
  })
}

/**
 * Visible breadcrumb trail plus its BreadcrumbList JSON-LD, from one source so
 * the markup and the schema cannot drift. Pass either `items` or an existing
 * breadcrumbSchema() object as `ld`; the JSON-LD is emitted exactly once here,
 * so callers must not also render their own BreadcrumbList script.
 */
export default function Breadcrumbs({
  items,
  ld,
  locale = 'en',
}: {
  items?: Crumb[]
  ld?: BreadcrumbLd
  locale?: 'en' | 'ru'
}) {
  const schema = ld ?? breadcrumbSchema(items ?? [])
  const crumbs = items ?? crumbsFromLd(schema)
  if (crumbs.length === 0) return null
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <nav aria-label={LABEL[locale]} className="tf-crumbs" data-breadcrumbs={locale}>
        <ol>
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            return (
              <li key={`${index}-${crumb.name}`}>
                {crumb.url && !last ? (
                  <Link href={crumb.url}>{crumb.name}</Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>{crumb.name}</span>
                )}
                {!last && <ChevronRight size={13} aria-hidden="true" className="tf-crumbs__sep" />}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
