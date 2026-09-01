'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Tag, Check } from 'lucide-react'
import { trackSiteEvent } from '@/lib/clientAnalytics'

/**
 * Tappable discount-code pill. Copies the raw code to the clipboard and shows
 * a brief "Copied!" confirmation. Extracted as a client subcomponent so the
 * server-rendered FirmCtaCard can stay a server component.
 */
export default function CopyableCodePill({
  code,
  pct,
  locale = 'en',
  analyticsFirm,
  analyticsPlacement,
  analyticsOfferType,
}: {
  code: string
  pct: number
  locale?: 'en' | 'ru'
  analyticsFirm?: string
  analyticsPlacement?: string
  analyticsOfferType?: 'public_checkout' | 'partner_support'
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const labels = locale === 'ru'
    ? { copy: `Скопировать код скидки ${code}`, copied: 'Скопировано', offer: `${pct}% скидка — код ${code}` }
    : { copy: `Copy discount code ${code}`, copied: 'Copied!', offer: `${pct}% off — code ${code}` }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        // Legacy fallback for non-secure contexts.
        const el = document.createElement('textarea')
        el.value = code
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      if (analyticsFirm && analyticsPlacement && analyticsOfferType) {
        // The code itself is deliberately excluded: the event measures intent
        // without sending a personal partner code to analytics providers.
        trackSiteEvent('discount_code_copied', {
          firm: analyticsFirm,
          placement: analyticsPlacement,
          offer_type: analyticsOfferType,
          discount_pct: pct,
        })
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently ignore — pill stays in its prior state.
    }
  }, [analyticsFirm, analyticsOfferType, analyticsPlacement, code, pct])

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={labels.copy}
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 999,
        background: copied ? 'rgba(39,161,123,0.18)' : 'rgba(245,158,11,0.15)',
        border: `1px solid ${copied ? 'rgba(39,161,123,0.45)' : 'rgba(245,158,11,0.35)'}`,
        color: copied ? 'var(--accent-light)' : 'var(--gold)',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
        fontFamily: 'inherit',
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--accent2)'
        e.currentTarget.style.outlineOffset = '2px'
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none'
      }}
    >
      {copied ? (
        <>
          <Check size={11} aria-hidden="true" />
          {labels.copied}
        </>
      ) : (
        <>
          <Tag size={11} aria-hidden="true" />
          {labels.offer}
        </>
      )}
    </button>
  )
}
