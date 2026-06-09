'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ArrowRight, Tag, Check } from 'lucide-react'

/**
 * Plain-JSON props mirror the subset of `Firm` this bar needs. We deliberately
 * avoid importing the Firm type from `@/lib/firms` because that module reads
 * the filesystem at boot — bundling it in a client component breaks the build.
 */
export interface MobileStickyCTAProps {
  name: string
  logo: string
  score: number
  reviewUrl: string
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
  const { name, logo, score, reviewUrl, affiliateUrl, affiliateSlug, discountCode, discountPct } = props

  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Avoid SSR/CSR mismatch — only render after mount so the matchMedia + IO
  // checks have run on the client.
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const h1 = document.querySelector('h1')
    if (!h1) {
      // No hero to track — show immediately on mobile so the bar still works.
      setVisible(true)
      return
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

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  const handleCopyCode = useCallback(async () => {
    if (!discountCode) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(discountCode)
      } else {
        const el = document.createElement('textarea')
        el.value = discountCode
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }, [discountCode])

  if (!mounted) return null

  const hasAffiliate = Boolean(affiliateUrl)
  const ctaHref = hasAffiliate ? `/go/${affiliateSlug}?from=mobile-sticky` : reviewUrl
  const ctaLabel = hasAffiliate ? 'Get funded' : 'Read review'

  return (
    <div
      className={`mobile-cta-bar ${visible ? 'mobile-cta-bar--visible' : ''}`}
      role="complementary"
      aria-label={`${name} quick actions`}
    >
      {discountCode && discountPct && (
        <button
          type="button"
          onClick={handleCopyCode}
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

      <div className="mobile-cta-bar-row">
        <div className="mobile-cta-bar-firm">
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={24}
              height={24}
              className="mobile-cta-bar-logo"
            />
          ) : (
            <div className="mobile-cta-bar-logo mobile-cta-bar-logo--placeholder" aria-hidden="true">
              {name.substring(0, 1).toUpperCase()}
            </div>
          )}
          <div className="mobile-cta-bar-meta">
            <strong className="mobile-cta-bar-name">{name}</strong>
            <span className="mobile-cta-bar-score">
              <Star size={10} aria-hidden="true" /> {score}
            </span>
          </div>
        </div>

        {hasAffiliate ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="mobile-cta-bar-cta"
          >
            {ctaLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        ) : (
          <Link href={ctaHref} className="mobile-cta-bar-cta">
            {ctaLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}
