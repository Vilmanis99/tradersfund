'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import FirmLogo from './FirmLogo'
import useCopyCode from './useCopyCode'
import { Star, ArrowRight, Tag, Check } from 'lucide-react'

/** Hydration flag has no external source to subscribe to — never notifies. */
const subscribeNoop = () => () => {}

/**
 * Plain-JSON props mirror the subset of `Firm` this bar needs. We deliberately
 * avoid importing the Firm type from `@/lib/firms` because that module reads
 * the filesystem at boot — bundling it in a client component breaks the build.
 */
export interface MobileStickyCTAProps {
  name: string
  logo: string
  score: number
  affiliateUrl?: string
  affiliateSlug: string
  discountCode?: string
  discountPct?: number
}

/**
 * Bottom-anchored conversion bar for mobile firm-review readers. Slides up
 * after the article H1 scrolls out of view, hides again when it comes back.
 * IntersectionObserver targets the FIRST <h1> on the page — which on a blog
 * review is the article title. We fall back gracefully (visible always) if
 * no h1 is found, but that shouldn't happen on review pages.
 */
export default function MobileStickyCTA(props: MobileStickyCTAProps) {
  const { name, logo, score, affiliateUrl, affiliateSlug, discountCode, discountPct } = props

  const [visible, setVisible] = useState(false)
  const { copied, failed, copy } = useCopyCode(discountCode || '')

  // Avoid SSR/CSR mismatch — only render after hydration so the matchMedia +
  // IO checks have run on the client. useSyncExternalStore gives us that
  // without a setState-in-effect (which would cascade an extra render on
  // every review page): the server snapshot is false, the client's is true.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const h1 = document.querySelector('h1')
    if (!h1) {
      // No hero to track — show immediately on mobile so the bar still works.
      // Deferred a frame so the update lands outside the effect body.
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide while the H1 is at all visible; show once it has scrolled past.
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(h1)
    return () => observer.disconnect()
  }, [])

  if (!mounted) return null

  const hasAffiliate = Boolean(affiliateUrl)
  const ctaHref = `/go/${affiliateSlug}?from=mobile-sticky`
  const ctaLabel = hasAffiliate ? 'View plans' : 'Official site'

  return (
    <div
      className={`mobile-cta-bar ${visible ? 'mobile-cta-bar--visible' : ''}`}
      role="complementary"
      aria-label={`${name} quick actions`}
    >
      {discountCode && discountPct && (
        <button
          type="button"
          onClick={copy}
          className="mobile-cta-bar-discount"
          aria-label={`Copy discount code ${discountCode} to clipboard`}
        >
          {copied ? (
            <>
              <Check size={11} aria-hidden="true" />
              Copied {discountCode}!
            </>
          ) : (
            <>
              <Tag size={11} aria-hidden="true" />
              {discountPct}% off · tap code
            </>
          )}
        </button>
      )}
      {failed && <p role="status" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: 8 }}>Couldn’t copy. Copy manually: <code style={{ userSelect: 'all' }}>{discountCode}</code></p>}

      <div className="mobile-cta-bar-row">
        <div className="mobile-cta-bar-firm">
          <FirmLogo name={name} src={logo} size={28} />
          <div className="mobile-cta-bar-meta">
            <strong className="mobile-cta-bar-name">{name}</strong>
            <span className="mobile-cta-bar-score">
              <Star size={10} aria-hidden="true" /> {score}
            </span>
          </div>
        </div>

        <a
          href={ctaHref}
          target="_blank"
          rel={hasAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
          className="mobile-cta-bar-cta"
        >
          {ctaLabel}
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
