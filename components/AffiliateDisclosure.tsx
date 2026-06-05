import Link from 'next/link'

/**
 * FTC §255 requires affiliate compensation disclosure to be "clear and
 * conspicuous." This banner sits directly under the H1 on monetized posts
 * (firm reviews and firm-comparison pages).
 */
export default function AffiliateDisclosure() {
  return (
    <p
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
      <strong style={{ color: 'var(--gold)' }}>Disclosure:</strong> We earn a
      commission if you sign up via links on this page — at no cost to you. Our
      reviews are independent and not influenced by partners.{' '}
      <Link href="/disclaimers" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
        Learn more
      </Link>.
    </p>
  )
}
