import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { correctionCommitUrl, getCorrections } from '@/lib/corrections'

const PATH = '/corrections'

export const metadata: Metadata = {
  title: 'Corrections Log',
  description:
    'Every factual error we have corrected on Traders Fund Hub: the date, the page, what was wrong, the firm source we fixed it from and the commit.',
  alternates: { canonical: PATH },
  openGraph: { title: 'Corrections Log', url: PATH, type: 'article' },
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function CorrectionsPage() {
  const corrections = getCorrections()
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Corrections log' }]} />
      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          {corrections[0] && (
            <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>Latest correction {formatDate(corrections[0].date)}</div>
          )}
          <h1 className="blog-hero-title">Corrections log</h1>
          <p className="blog-hero-sub">
            When we get a fact wrong, we fix the page and record the fix here: what we said, what the firm’s own source says, and the commit that changed it.
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="tf-trust" data-trust-page="corrections" data-corrections-count={corrections.length}>
          <p>
            This log covers errors in what we published. A firm changing its own prices or rules is not a correction; those changes go in the{' '}
            <Link href="/prop-firm-challenge-changes">challenge change watch</Link>.
          </p>
          {corrections.length === 0 && <p>No corrections have been recorded yet.</p>}
          {corrections.map(entry => (
            <article key={entry.id} id={entry.id} className="tf-correction" data-correction={entry.id}>
              <h3><time dateTime={entry.date}>{formatDate(entry.date)}</time></h3>
              <dl>
                <dt>Page</dt>
                <dd>
                  {entry.pages.map((page, index) => (
                    <span key={page.path}>{index > 0 && ', '}<Link href={page.path}>{page.label}</Link></span>
                  ))}
                </dd>
                <dt>What was wrong</dt>
                <dd>{entry.wasWrong}</dd>
                <dt>Correction</dt>
                <dd>{entry.correction}</dd>
                <dt>Source</dt>
                <dd>
                  {entry.sources.map((url, index) => (
                    <span key={url}>{index > 0 && ' · '}<a href={url} rel="nofollow noopener" target="_blank">{new URL(url).hostname.replace(/^www\./, '')}{new URL(url).pathname === '/' ? '' : new URL(url).pathname}</a></span>
                  ))}
                </dd>
                <dt>Change</dt>
                <dd><a href={correctionCommitUrl(entry)} rel="nofollow noopener" target="_blank">Commit {entry.commit}</a></dd>
              </dl>
            </article>
          ))}
          <h2>Report an error</h2>
          <p>
            Found something wrong? Send the page and the firm’s source through the <Link href="/contact">contact page</Link>. We check it against the firm’s own published terms, fix it, and add it here. Read how we verify data in our <Link href="/methodology">methodology</Link>.
          </p>
        </div>
      </section>
    </div>
  )
}
