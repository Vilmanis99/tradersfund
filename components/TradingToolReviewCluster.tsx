import Link from 'next/link'
import { ArrowRight, CalendarClock, GitCompareArrows, ShieldCheck } from 'lucide-react'
import type { PostMeta } from '@/lib/mdx'
import {
  getTradingToolReview,
  type TradingToolReviewConfig,
} from '@/lib/tradingToolReviews'

function formatEditorialDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function TradingToolReviewStatus({ post }: { post: PostMeta }) {
  const tool = getTradingToolReview(post.slug)
  if (!tool) return null
  const editorialDate = post.modified || post.date

  return (
    <aside
      aria-label={`${tool.name} review freshness`}
      data-tool-review-status={post.slug}
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.1rem',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
        borderRadius: 12,
      }}
    >
      <strong style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fff' }}>
        <CalendarClock size={15} aria-hidden="true" /> Editorial snapshot ·{' '}
        {formatEditorialDate(editorialDate)}
      </strong>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0.45rem 0 0' }}>
        Pricing, integrations and feature availability may have changed since this review date.
        Treat the article as a dated evaluation and verify the official service before paying or
        connecting a trading account.
      </p>
    </aside>
  )
}

export default function TradingToolReviewCluster({
  current,
  reviews,
}: {
  current: PostMeta
  reviews: Array<TradingToolReviewConfig & { post: PostMeta }>
}) {
  const currentTool = getTradingToolReview(current.slug)
  if (!currentTool || !reviews.length) return null

  return (
    <section
      aria-label="Related trading tool reviews"
      data-tool-review-cluster={current.slug}
      style={{ marginTop: '2.5rem' }}
    >
      <span className="section-kicker">
        <GitCompareArrows size={13} aria-hidden="true" /> Workflow comparisons
      </span>
      <h2 className="section-title" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.6rem)' }}>
        Compare tools by the job they perform
      </h2>
      <p className="section-sub" style={{ maxWidth: 720 }}>
        {currentTool.name} is grouped with four existing workflow-tool reviews, but these products
        are not interchangeable. Use the job label first, then check each article&apos;s editorial date.
      </p>

      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '0.75rem',
          listStyle: 'none',
          padding: 0,
          margin: '1rem 0 0',
        }}
      >
        {reviews.map(review => {
          const editorialDate = review.post.modified || review.post.date
          return (
            <li key={review.slug}>
              <Link
                href={`/blog/${review.slug}`}
                data-tool-review-link={review.slug}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100%',
                  gap: '0.5rem',
                  padding: '1rem',
                  color: '#fff',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  textDecoration: 'none',
                }}
              >
                <span className="bento-tile-eyebrow">
                  <ShieldCheck size={11} aria-hidden="true" /> {review.useCase}
                </span>
                <strong>{review.name} review</strong>
                <small style={{ color: 'var(--muted)', marginTop: 'auto' }}>
                  Editorial update: {formatEditorialDate(editorialDate)}
                </small>
                <span className="section-link">
                  Read dated review <ArrowRight size={13} aria-hidden="true" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
