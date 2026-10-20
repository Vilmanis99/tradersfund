import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { getAllFirms } from '@/lib/firms'
import { PARTNERSHIP_POLICY } from '@/lib/trustPages'
import { RU_DISCLOSURE, RU_DISCLOSURE_PATH, isRuDisclosureReady } from '@/lib/ruDisclosure'

export const revalidate = 3600

// Copy lives in content/data/ru-how-we-make-money.json. Until RU Writer's copy
// is published there, this route is a 404 and the RU footer links to the EN page.
export function generateMetadata(): Metadata {
  if (!isRuDisclosureReady()) return {}
  return {
    title: RU_DISCLOSURE.title,
    description: RU_DISCLOSURE.description,
    alternates: { canonical: RU_DISCLOSURE_PATH, languages: { en: '/how-we-make-money', ru: RU_DISCLOSURE_PATH } },
    openGraph: { title: RU_DISCLOSURE.title, url: RU_DISCLOSURE_PATH, type: 'article', locale: 'ru_RU' },
  }
}

export default function RuHowWeMakeMoneyPage() {
  if (!isRuDisclosureReady()) notFound()
  const partners = getAllFirms()
    .filter(firm => Boolean(firm.affiliateUrl) && firm.affiliateStatus === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Главная', url: '/ru' }, { name: RU_DISCLOSURE.h1 }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="blog-hero-title">{RU_DISCLOSURE.h1}</h1>
          {RU_DISCLOSURE.lead && <p className="blog-hero-sub">{RU_DISCLOSURE.lead}</p>}
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
              {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
