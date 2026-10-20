import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import {
  CLOSED_FIRMS_CAPTURED_AT,
  CLOSED_FIRMS_PUBLISHED,
  getClosedFirms,
  type ClosedFirm,
} from '@/lib/closedFirms'

const PATH = '/prop-firms/closed'

export const metadata: Metadata = {
  title: 'Closed Prop Firms: Shutdown Notices and Sources',
  description:
    'Prop firms that have closed or gone offline, with the date, the firm’s own notice where one exists, and an archived copy of each source.',
  alternates: { canonical: PATH },
  robots: CLOSED_FIRMS_PUBLISHED ? undefined : { index: false, follow: true },
  openGraph: { title: 'Closed Prop Firms', url: PATH, type: 'article' },
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function FirmEntry({ firm }: { firm: ClosedFirm }) {
  return (
    <article id={firm.slug} className="tf-correction" data-closed-firm={firm.slug} data-section={firm.section}>
      <h3>{firm.name}</h3>
      <dl>
        <dt>Status</dt>
        <dd>{firm.status}</dd>
        <dt>Date</dt>
        <dd><time dateTime={firm.date}>{firm.dateLabel}</time></dd>
        <dt>{firm.quoteLabel ?? (firm.quoteBasis === 'primary' ? 'What the firm said' : 'Reported wording')}</dt>
        <dd>
          <q>{firm.quote}</q>
          {firm.quoteBasis === 'secondary' && firm.quoteVia && (
            <> (quoted by <a href={firm.quoteVia} rel="nofollow noopener" target="_blank">{hostOf(firm.quoteVia)}</a>; not from the firm’s own page)</>
          )}
        </dd>
        <dt>Source</dt>
        <dd>
          <a href={firm.primarySource} rel="nofollow noopener" target="_blank">{hostOf(firm.primarySource)}</a>
          {firm.archivedSource && (
            <> · <a href={firm.archivedSource} rel="nofollow noopener" target="_blank">archived copy</a></>
          )}
        </dd>
        {firm.note && (<><dt>Note</dt><dd>{firm.note}</dd></>)}
      </dl>
    </article>
  )
}

export default function ClosedFirmsPage() {
  const closed = getClosedFirms('closed')
  const offline = getClosedFirms('offline')
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Prop Firms', url: '/prop-firms' }, { name: 'Closed firms' }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>Sources checked {formatDate(CLOSED_FIRMS_CAPTURED_AT)}</div>
          <h1 className="blog-hero-title">Closed prop firms</h1>
          <p className="blog-hero-sub">
            Firms that have shut down or gone offline, with the date, what the firm said, and an archived copy of the source.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="closed-firms" data-closed-count={closed.length} data-offline-count={offline.length}>
          <p>
            A firm is listed as closed only when it, a regulator or a court says so. Where we only have a trade-press report, the entry says so.
            Firms that have been in trouble but are trading or relaunching are not on this list.
          </p>
          <h2>Closed</h2>
          {closed.map(firm => <FirmEntry key={firm.slug} firm={firm} />)}
          {offline.length > 0 && (
            <>
              <h2>Offline, no official statement</h2>
              <p>The official sites are down, but the firm has not announced a closure.</p>
              {offline.map(firm => <FirmEntry key={firm.slug} firm={firm} />)}
            </>
          )}
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
