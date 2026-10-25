import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import ClosedFirmsList, { formatClosedFirmsDate } from '@/components/closed/ClosedFirmsList'
import {
  CLOSED_FIRMS_CAPTURED_AT,
  CLOSED_FIRMS_PUBLISHED,
  closedFirmsLanguageAlternates,
  getClosedFirmViews,
} from '@/lib/closedFirms'

const PATH = '/prop-firms/closed'

export const metadata: Metadata = {
  title: 'Closed Prop Firms: Shutdown Notices and Sources',
  description:
    'Prop firms that have closed or gone offline, with the date, the firm’s own notice where one exists, an archived source copy, and who reported press-only claims.',
  alternates: { canonical: PATH, languages: closedFirmsLanguageAlternates() },
  robots: CLOSED_FIRMS_PUBLISHED ? undefined : { index: false, follow: true },
  openGraph: { title: 'Closed Prop Firms', url: PATH, type: 'article' },
}

export default function ClosedFirmsPage() {
  const closed = getClosedFirmViews('en', 'closed')
  const offline = getClosedFirmViews('en', 'offline')
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Prop Firms', url: '/prop-firms' }, { name: 'Closed firms' }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>Sources checked {formatClosedFirmsDate(CLOSED_FIRMS_CAPTURED_AT, 'en')}</div>
          <h1 className="blog-hero-title">Closed prop firms</h1>
          <p className="blog-hero-sub">
            Firms that have shut down or gone offline, with the date, what the firm said, and an archived copy of the source.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="closed-firms" data-closed-count={closed.length} data-offline-count={offline.length}>
          <p>
            We list a firm as closed when the firm itself, a regulator or a court says so. Where the only source is a trade-press report,
            the entry says &ldquo;Reported by&rdquo; and links to that report. Firms that have been in trouble but are trading or relaunching are not on this list.
          </p>
          <ClosedFirmsList locale="en" closed={closed} offline={offline} asOf={CLOSED_FIRMS_CAPTURED_AT} />
          <h2>Still trading?</h2>
          <p>
            Compare the firms we track in the <Link href="/prop-firms">prop firm directory</Link>. If a firm on this list is back or the
            record is wrong, tell us through the <Link href="/contact">contact page</Link> and we will log the fix in our{' '}
            <Link href="/corrections">corrections log</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
