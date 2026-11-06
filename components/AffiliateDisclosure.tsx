import Link from 'next/link'
import { ruDisclosureHref } from '@/lib/ruDisclosure'

interface AffiliateDisclosureProps {
  /** Set on a single-firm review so the banner can state the exact relationship. */
  firmName?: string
  /** Defaults to true for mixed commercial pages that can contain eligible links. */
  hasAffiliate?: boolean
  /** Locale for the disclosure copy. Default keeps historical English output byte-identical. */
  lang?: 'en' | 'ru'
}

/**
 * FTC Section 255 requires affiliate compensation disclosure to be clear and
 * conspicuous. Single-firm reviews pass their exact relationship; comparison
 * and directory pages keep the mixed-page disclosure.
 *
 * RU wording (label + body + link text) is RU Writer via Code Reviewer
 * 2026-11-04; href comes from ruDisclosureHref() like the RU footer.
 */
export default function AffiliateDisclosure({
  firmName,
  hasAffiliate = true,
  lang = 'en',
}: AffiliateDisclosureProps = {}) {
  const relationship = hasAffiliate ? 'affiliate' : 'official'
  const style = {
    margin: '0 0 1.5rem',
    padding: '8px 12px',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    color: 'var(--muted)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
  } as const

  if (lang === 'ru') {
    // Approved RU mixed-page disclosure only covers affiliate pages for now.
    if (!hasAffiliate) return null
    return (
      <p
        data-affiliate-disclosure={relationship}
        data-affiliate-disclosure-lang="ru"
        style={style}
      >
        <strong style={{ color: 'var(--gold)' }}>Раскрытие информации:</strong>{' '}
        Часть ссылок на этой странице — партнёрские: если вы купите челлендж по такой ссылке, фирма может выплатить нам комиссию. Это не влияет на наши оценки, данные и порядок фирм.{' '}
        <Link href={ruDisclosureHref()} style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
          Как мы зарабатываем
        </Link>.
      </p>
    )
  }

  return (
    <p
      data-affiliate-disclosure={relationship}
      style={style}
    >
      <strong style={{ color: 'var(--gold)' }}>Disclosure:</strong>{' '}
      {hasAffiliate ? (
        <>
          We may earn a commission if you sign up via eligible links on this page,
          at no cost to you. Partnerships never change our scores; partner placements are labelled.{' '}
        </>
      ) : (
        <>
          Traders Fund Hub does not currently record an affiliate relationship with{' '}
          {firmName || 'this firm'}. Links to the firm open its official website without
          affiliate tracking. Our reviews remain independent.{' '}
        </>
      )}
      <Link href="/how-we-make-money" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
        How we make money
      </Link>.
    </p>
  )
}
