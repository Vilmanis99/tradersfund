import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import AuthorBio from '@/components/AuthorBio'
import ReportChangeCharts, { EN_REPORT_CHART_LABELS } from '@/components/ReportChangeCharts'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import {
  emptyPropFirmChangesStats,
  tryLoadPropFirmChangesCsv,
} from '@/lib/propFirmChangesReport'
import { getAuthorByName } from '@/lib/authors'
import { authorSchema, jsonLd } from '@/lib/schema'

export const revalidate = 3600

const PATH = '/reports/prop-firm-changes-october-2026'
const TITLE = 'Prop Firm Rules & Payout Changes — October 2026'
const H1 = 'Prop Firm Rules & Payout Changes — October 2026'
const DESCRIPTION =
  'October 2026 report: 56 verified prop-firm rule, payout, price and promo changes, each with a first-party source and a check date through 31 Oct, plus a CSV.'
const DATE_PUBLISHED = '2026-11-05'
const DATE_MODIFIED = '2026-11-05'
const CHECKED = '2026-11-01'
const CSV_HREF = '/reports/prop-firm-changes-october-2026.csv'
const AUTHOR_NAME = 'Tara Mohseni'
const BODY_PATH = join(process.cwd(), 'content/data/en-prop-firm-changes-october-2026.html')

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function generateMetadata(): Metadata {
  return {
    title: { absolute: `${TITLE} | TFH` },
    description: DESCRIPTION,
    alternates: {
      canonical: PATH,
      languages: getLanguageAlternates(PATH),
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: PATH,
      type: 'article',
      locale: 'en_US',
    },
  }
}

export default function EnPropFirmChangesOctober2026Page() {
  const chartStats = tryLoadPropFirmChangesCsv() ?? emptyPropFirmChangesStats()
  const bodyHtml = existsSync(BODY_PATH) ? readFileSync(BODY_PATH, 'utf8') : ''
  const author = getAuthorByName(AUTHOR_NAME)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'en',
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    author: authorSchema(AUTHOR_NAME),
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }

  return (
    <div data-en-report="prop-firm-changes-october-2026" data-en-report-cutoff="2026-10-31">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />

      <Breadcrumbs
        items={[
          { name: 'Home', url: '/' },
          { name: 'Prop firm changes — October 2026' },
        ]}
      />

      <section className="blog-hero">
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            Published {formatDate(DATE_PUBLISHED)} · Checked after cut-off {formatDate(CHECKED)}
          </div>
          <h1 className="blog-hero-title">{H1}</h1>
          <p className="blog-hero-sub">
            Editorial report on prop-firm rule, payout, price and promo changes observed in October 2026.
            Dated first-party facts only — no affiliate links and no calls to buy. CSV:{' '}
            <a href={CSV_HREF}>prop-firm-changes-october-2026.csv</a>
            {chartStats.totalRows > 0
              ? ` (${chartStats.totalRows} rows through cut-off 31.10.2026).`
              : ' (stacked by EN Writer).'}
          </p>
          <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            By {author ? <Link href={`/authors/${author.slug}`}>{AUTHOR_NAME}</Link> : AUTHOR_NAME}
          </p>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem' }}>
        {chartStats.totalRows > 0 ? (
          <div className="tf-trust" style={{ marginBottom: '1.5rem' }}>
            <ReportChangeCharts
              stats={chartStats}
              labels={EN_REPORT_CHART_LABELS}
              otherFirmsLabel="Other"
            />
          </div>
        ) : null}

        {bodyHtml ? (
          <article
            className="tf-trust post-prose"
            data-en-report-article="prop-firm-changes-october-2026"
            data-en-report-body="prop-firm-changes-october-2026"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <article
            className="tf-trust post-prose"
            data-en-report-article="prop-firm-changes-october-2026"
            data-en-report-body="prop-firm-changes-october-2026"
            data-en-report-stub="awaiting-writer-html"
          >
            <p>EN report body pending writer stack (content/data/en-prop-firm-changes-october-2026.html).</p>
          </article>
        )}

        <div className="tf-trust" style={{ marginTop: '2rem' }}>
          <h2 id="related-reading">Related reading</h2>
          <ul>
            <li>
              <Link href="/prop-firm-challenge-changes">Prop firm challenge changes ledger</Link>
            </li>
            <li>
              <Link href="/prop-firm-discount-codes">Prop firm discount codes</Link>
            </li>
            <li>
              <Link href="/blog/lucid-trading-review">Lucid Trading review</Link>
            </li>
            <li>
              <Link href="/blog/funding-pips-review">FundingPips review</Link>
            </li>
            <li>
              <Link href="/blog/hash-hedge-review">Hash Hedge review</Link>
            </li>
            <li>
              <Link href="/corrections">Corrections</Link>
            </li>
          </ul>
          <AuthorBio name={AUTHOR_NAME} />
        </div>
      </section>
    </div>
  )
}
