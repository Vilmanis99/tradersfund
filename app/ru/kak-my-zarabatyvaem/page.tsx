import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import InlineLinks from '@/components/InlineLinks'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import { jsonLd } from '@/lib/schema'
import { getAllFirms } from '@/lib/firms'
import { PARTNERSHIP_POLICY } from '@/lib/trustPages'
import { RU_DISCLOSURE, RU_DISCLOSURE_PATH, isRuDisclosureReady } from '@/lib/ruDisclosure'

export const revalidate = 3600

// Copy lives in content/data/ru-how-we-make-money.json. Until RU Writer's copy
// is published there, this route is a 404 and the RU footer links to the EN page.
export function generateMetadata(): Metadata {
  if (!isRuDisclosureReady()) return {}
  return {
    title: { absolute: RU_DISCLOSURE.title },
    description: RU_DISCLOSURE.description,
    alternates: { canonical: RU_DISCLOSURE_PATH, languages: getLanguageAlternates(RU_DISCLOSURE_PATH) },
    openGraph: { title: RU_DISCLOSURE.title, url: RU_DISCLOSURE_PATH, type: 'article', locale: 'ru_RU' },
  }
}

export default function RuHowWeMakeMoneyPage() {
  if (!isRuDisclosureReady()) notFound()
  const partners = getAllFirms()
    .filter(firm => Boolean(firm.affiliateUrl) && firm.affiliateStatus === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
  // Visible date and Article schema follow the route's editorial date, raised
  // to RU Writer's `updated` when that is later (same rule as the sitemap).
  const modified = russianRouteDateModified(RU_DISCLOSURE_PATH, RU_DISCLOSURE.updated)
  const [year, month, day] = modified.split('-')
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: RU_DISCLOSURE.title,
    description: RU_DISCLOSURE.description,
    url: `https://tradersfundhub.com${RU_DISCLOSURE_PATH}`,
    inLanguage: 'ru',
    dateModified: modified,
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    mainEntityOfPage: `https://tradersfundhub.com${RU_DISCLOSURE_PATH}`,
  }
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs locale="ru" items={[{ name: 'Главная', url: '/ru' }, { name: RU_DISCLOSURE.h1 }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="blog-hero-title">{RU_DISCLOSURE.h1}</h1>
          {RU_DISCLOSURE.lead && <p className="blog-hero-sub"><InlineLinks text={RU_DISCLOSURE.lead} /></p>}
          <p className="ru-source-line" data-ru-disclosure-updated={modified}>Обновлено <time dateTime={modified}>{`${day}.${month}.${year}`}</time>.</p>
        </div>
      </section>
      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="ru-how-we-make-money">
          <p data-partnership-policy>{PARTNERSHIP_POLICY.ru}</p>
          {RU_DISCLOSURE.partnersHeading && partners.length > 0 && (
            <>
              <h2>{RU_DISCLOSURE.partnersHeading}</h2>
              <ul data-affiliate-partners={partners.length}>
                {partners.map(firm => <li key={firm.name}>{firm.name}</li>)}
              </ul>
            </>
          )}
          {RU_DISCLOSURE.sections.map(section => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph}><InlineLinks text={paragraph} /></p>)}
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
