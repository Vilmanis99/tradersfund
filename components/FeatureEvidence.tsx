import Link from 'next/link'
import { BadgeCheck, CircleAlert, CircleSlash, ExternalLink, HelpCircle, TriangleAlert } from 'lucide-react'
import type {
  FeatureEvidence as Evidence,
  FeatureFirmEvidence,
  ProductVerdict,
} from '@/lib/featureEvidence'

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const VERDICT_LABEL: Record<ProductVerdict, string> = {
  allows: 'Qualifies',
  conditional: 'Conditional',
  blocks: 'Does not',
  unverified: 'Unpublished',
}

function countLabel(row: FeatureFirmEvidence): string {
  const parts = [`${row.allowCount} of ${row.products.length} qualify`]
  if (row.conditionalCount) parts.push(`${row.conditionalCount} conditional`)
  if (row.blockCount) parts.push(`${row.blockCount} do not qualify`)
  if (row.unverifiedCount) parts.push(`${row.unverifiedCount} unpublished`)
  return parts.join(' · ')
}

/** Every bucket renders the product, dated source and exact verdict. */
function EvidenceCards({ rows }: { rows: FeatureFirmEvidence[] }) {
  return (
    <div className="fe-cards">
      {rows.map(row => (
        <article key={row.slug} className={`fe-card fe-card--${row.level}`}>
          <header>
            <Link href={row.firm.reviewUrl}>{row.firm.name}</Link>
            <span>{countLabel(row)}</span>
          </header>
          <ul>
            {row.products.map(product => (
              <li key={product.productSlug} className={`fe-v fe-v--${product.verdict}`}>
                <span className="fe-v-tag">{VERDICT_LABEL[product.verdict]}</span>
                <span className="fe-v-name">{product.productName}</span>
                {product.detail && <span className="fe-v-detail">{product.detail}</span>}
                <span className="fe-v-source">
                  <a
                    href={product.sourceUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    aria-label={`${row.firm.name} ${product.productName} first-party source`}
                  >
                    First-party source <ExternalLink size={10} aria-hidden="true" />
                  </a>
                  <time dateTime={product.capturedAt}>
                    Captured {dateLabel(product.capturedAt)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

export default function FeatureEvidence({
  evidence,
  summary,
  label,
}: {
  evidence: Evidence
  summary: string
  label: string
}) {
  if (!evidence.productLevel) return null

  return (
    <section className="fe" aria-label="Product-level evidence">
      <h2 className="fe-h2">Which products actually qualify</h2>
      <p className="fe-summary">{summary}</p>
      <p className="fe-sub">
        Firms sell several challenge products and their rules diverge between
        them. Every verdict below is read from that product&apos;s own captured
        terms, not from a single firm-wide setting.
      </p>

      {/* The finding that a firm-level list structurally cannot show. */}
      {evidence.partial.length > 0 && (
        <>
          <h3 className="fe-h3 fe-h3--warn">
            <TriangleAlert size={16} aria-hidden="true" />
            Qualifies on some products only — check before you buy
          </h3>
          <EvidenceCards rows={evidence.partial} />
        </>
      )}

      {evidence.full.length > 0 && (
        <>
          <h3 className="fe-h3 fe-h3--ok">
            <BadgeCheck size={16} aria-hidden="true" />
            Every captured product qualifies
          </h3>
          <EvidenceCards rows={evidence.full} />
        </>
      )}

      {evidence.conditional.length > 0 && (
        <>
          <h3 className="fe-h3">
            <CircleAlert size={16} aria-hidden="true" />
            No outright qualifier; some products are conditional
          </h3>
          <p className="fe-note">
            Conditional is not the same as unrestricted. Each card shows the
            exact mix because another product at the same firm may block the
            feature or leave it unpublished.
          </p>
          <EvidenceCards rows={evidence.conditional} />
        </>
      )}

      {evidence.excluded.length > 0 && (
        <>
          <h3 className="fe-h3">
            <CircleSlash size={16} aria-hidden="true" />
            No captured product is verified to qualify
          </h3>
          <EvidenceCards rows={evidence.excluded} />
        </>
      )}

      {evidence.unverified.length > 0 && (
        <>
          <h3 className="fe-h3">
            <HelpCircle size={16} aria-hidden="true" />
            No published rule we could capture
          </h3>
          <p className="fe-note">
            These firms say nothing about {label.toLowerCase()} on their own
            public pages. We leave them unrated rather than infer a rule from a
            competitor&apos;s summary — an absent rule is not the same as a
            permissive one.
          </p>
          <EvidenceCards rows={evidence.unverified} />
        </>
      )}

      {evidence.latestCapture && (
        <p className="fe-stamp">
          Product terms last captured {dateLabel(evidence.latestCapture)}. Products
          older than 30 days are dropped until recaptured, so a missing product
          means stale data rather than a discontinued plan. Every source is
          linked beside its product; use the{' '}
          <Link href="/prop-firm-challenges">challenge comparison</Link>{' '}
          to compare price, risk and payout terms.
        </p>
      )}
    </section>
  )
}
