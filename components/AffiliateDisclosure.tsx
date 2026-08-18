import Link from 'next/link'

interface AffiliateDisclosureProps {
  /** Set on a single-firm review so the banner can state the exact relationship. */
  firmName?: string
  /** Defaults to true for mixed commercial pages that can contain eligible links. */
  hasAffiliate?: boolean
}

/**
 * FTC Section 255 requires affiliate compensation disclosure to be clear and
 * conspicuous. Single-firm reviews pass their exact relationship; comparison
 * and directory pages keep the mixed-page disclosure.
 */
export default function AffiliateDisclosure({
  firmName,
  hasAffiliate = true,
}: AffiliateDisclosureProps = {}) {
  const relationship = hasAffiliate ? 'affiliate' : 'official'

  return (
    <p
      data-affiliate-disclosure={relationship}
      style={{
        margin: '0 0 1.5rem',
        padding: '8px 12px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: 8,
        color: 'var(--muted)',
        fontSize: '0.78rem',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--gold)' }}>Disclosure:</strong>{' '}
      {hasAffiliate ? (
        <>
          We may earn a commission if you sign up via eligible links on this page,
          at no cost to you. Our reviews are independent and not influenced by partners.{' '}
        </>
      ) : (
        <>
          Traders Fund Hub does not currently record an affiliate relationship with{' '}
          {firmName || 'this firm'}. Links to the firm open its official website without
          affiliate tracking. Our reviews remain independent.{' '}
        </>
      )}
      <Link href="/disclaimers" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
        Learn more
      </Link>.
    </p>
  )
}
