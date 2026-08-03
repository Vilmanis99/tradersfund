'use client'

import Link from 'next/link'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { track as trackVercel } from '@vercel/analytics'
import { OPEN_ANALYTICS_SETTINGS_EVENT } from './AnalyticsPreferencesButton'

const CONSENT_STORAGE_KEY = 'tfh_analytics_consent_v1'
const CONSENT_CHANGE_EVENT = 'tfh:analytics-consent-changed'
const SCROLL_THRESHOLDS = [25, 50, 75, 90] as const
const HIGH_INTENT_STAGES = new Set([
  'india_comparison',
  'challenge_comparison',
  'comparison_directory',
  'firm_review',
  'head_to_head',
])

type AnalyticsConsent = 'unknown' | 'granted' | 'denied'
type GtagCommand = 'config' | 'consent' | 'event' | 'js' | 'set'
type ClarityCommand = 'consent' | 'consentv2' | 'event' | 'set'
let memoryConsent: AnalyticsConsent = 'unknown'

type GtagFunction = (
  command: GtagCommand,
  target: string | Date,
  parameters?: Record<string, unknown>,
) => void

type ClarityFunction = {
  (command: ClarityCommand, ...parameters: unknown[]): void
  q?: unknown[][]
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFunction
    clarity?: ClarityFunction
  }
}

function validGaId(value?: string) {
  return value && /^G-[A-Z0-9]+$/i.test(value) ? value.toUpperCase() : undefined
}

function validClarityId(value?: string) {
  return value && /^[a-z0-9]+$/i.test(value) ? value.toLowerCase() : undefined
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || ((...args: Parameters<GtagFunction>) => {
    window.dataLayer?.push(args)
  })
}

function ensureClarity() {
  if (window.clarity) return
  const queued: unknown[][] = []
  const clarity: ClarityFunction = (...args: unknown[]) => {
    queued.push(args)
  }
  clarity.q = queued
  window.clarity = clarity
}

function setOptionalConsent(consent: Exclude<AnalyticsConsent, 'unknown'>) {
  const analyticsStorage = consent === 'granted' ? 'granted' : 'denied'

  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: analyticsStorage,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }

  if (window.clarity) {
    window.clarity('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: analyticsStorage,
    })
    if (consent === 'denied') window.clarity('consent', false)
  }
}

function journeyStage(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname === '/best-prop-firms-in-india') return 'india_hub'
  if (pathname.startsWith('/best-prop-firms-in-india/compare')) return 'india_comparison'
  if (pathname === '/best-prop-firms-in-india/challenge-comparison') return 'india_comparison'
  if (pathname.startsWith('/best-prop-firms-in-india/challenge-changes')) return 'india_updates'
  if (pathname === '/prop-firm-challenges') return 'challenge_comparison'
  if (pathname === '/prop-firms') return 'firm_directory'
  if (pathname === '/compare') return 'comparison_directory'
  if (pathname.includes('-vs-') || pathname.includes('/compare/')) return 'head_to_head'
  if (/^\/blog\/[^/]+-review\/?$/.test(pathname)) return 'firm_review'
  if (pathname.startsWith('/blog')) return 'editorial'
  return 'information'
}

function safeLabel(value: string | null, fallback = 'unknown') {
  if (!value) return fallback
  const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60)
  return sanitized || fallback
}

function sendClarityEvent(eventName: string) {
  window.clarity?.('event', eventName)
}

function readConsent(): AnalyticsConsent {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored === 'granted' || stored === 'denied' ? stored : memoryConsent
  } catch {
    return memoryConsent
  }
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(CONSENT_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(CONSENT_CHANGE_EVENT, onStoreChange)
  }
}

function subscribeToNothing() {
  return () => undefined
}

export default function AnalyticsProvider({
  gaMeasurementId: rawGaId,
  clarityProjectId: rawClarityId,
}: {
  gaMeasurementId?: string
  clarityProjectId?: string
}) {
  const pathname = usePathname() || '/'
  const gaMeasurementId = useMemo(() => validGaId(rawGaId), [rawGaId])
  const clarityProjectId = useMemo(() => validClarityId(rawClarityId), [rawClarityId])
  const hasOptionalAnalytics = Boolean(gaMeasurementId || clarityProjectId)
  const consent = useSyncExternalStore(subscribeToConsent, readConsent, () => 'unknown')
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gaReady, setGaReady] = useState(false)
  const [clarityReady, setClarityReady] = useState(false)
  const scrollDepths = useRef(new Set<number>())

  useEffect(() => {
    const openSettings = () => {
      if (hasOptionalAnalytics) setSettingsOpen(true)
    }
    window.addEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings)
    return () => window.removeEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings)
  }, [hasOptionalAnalytics])

  useEffect(() => {
    if (consent !== 'granted') return

    if (gaMeasurementId) {
      ensureGtag()
      window.gtag?.('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      })
      setOptionalConsent('granted')
    }

    if (clarityProjectId) {
      ensureClarity()
      setOptionalConsent('granted')
    }
  }, [clarityProjectId, consent, gaMeasurementId])

  useEffect(() => {
    if (consent !== 'granted') return
    const stage = journeyStage(pathname)

    if (gaMeasurementId && gaReady) {
      window.gtag?.('event', 'journey_view', {
        page_path: pathname,
        content_group: stage,
      })
    }

    if (clarityProjectId && clarityReady) {
      window.clarity?.('set', 'journey_stage', stage)
      window.clarity?.('set', 'page_path', pathname)
    }
  }, [clarityProjectId, clarityReady, consent, gaMeasurementId, gaReady, pathname])

  useEffect(() => {
    scrollDepths.current = new Set()
    const optionalAnalyticsGranted = consent === 'granted'
    const currentStage = journeyStage(pathname)

    const trackEvent = (name: string, parameters: Record<string, string | number> = {}) => {
      if (optionalAnalyticsGranted && gaMeasurementId && gaReady) {
        window.gtag?.('event', name, {
          ...parameters,
          page_path: pathname,
          content_group: currentStage,
          transport_type: 'beacon',
        })
      }
      if (optionalAnalyticsGranted && clarityProjectId && clarityReady) sendClarityEvent(name)
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.closest('[data-analytics-ignore]')) return

      const destination = new URL(anchor.href, window.location.origin)
      if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return
      if (destination.origin === window.location.origin && destination.pathname.startsWith('/go/')) {
        const firm = safeLabel(destination.pathname.split('/')[2])
        const placement = safeLabel(destination.searchParams.get('from'))
        trackVercel('affiliate_click', { firm, placement })
        trackEvent('affiliate_click', { firm, placement })
        return
      }

      if (destination.origin !== window.location.origin) {
        const destinationHost = destination.hostname.slice(0, 100)
        trackVercel('outbound_click', {
          destination_host: destinationHost,
          content_group: currentStage,
        })
        trackEvent('outbound_click', { destination_host: destinationHost })
        return
      }

      if (destination.pathname.toLowerCase().endsWith('.csv')) {
        const resourcePath = destination.pathname.slice(0, 100)
        trackVercel('resource_download', {
          resource_path: resourcePath,
          content_group: currentStage,
        })
        trackEvent('resource_download', { resource_path: resourcePath })
        return
      }

      if (destination.pathname !== pathname) {
        const destinationStage = journeyStage(destination.pathname)
        if (destinationStage !== currentStage && HIGH_INTENT_STAGES.has(destinationStage)) {
          trackVercel('journey_step', {
            from_stage: currentStage,
            to_stage: destinationStage,
          })
        }
        trackEvent('internal_navigation', {
          destination_path: destination.pathname.slice(0, 100),
        })
      }
    }

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100))
      for (const threshold of SCROLL_THRESHOLDS) {
        if (depth >= threshold && !scrollDepths.current.has(threshold)) {
          scrollDepths.current.add(threshold)
          if (threshold === 75) {
            trackVercel('deep_read', {
              content_group: currentStage,
              percent_scrolled: threshold,
            })
          }
          trackEvent('scroll_depth', { percent_scrolled: threshold })
        }
      }
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })
    const engagedTimer = optionalAnalyticsGranted
      ? window.setTimeout(() => trackEvent('engaged_30_seconds'), 30_000)
      : undefined

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      if (engagedTimer !== undefined) window.clearTimeout(engagedTimer)
    }
  }, [clarityProjectId, clarityReady, consent, gaMeasurementId, gaReady, pathname])

  const updateConsent = (nextConsent: Exclude<AnalyticsConsent, 'unknown'>) => {
    memoryConsent = nextConsent
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, nextConsent)
    } catch {
      // The consent still applies for this page view when storage is unavailable.
    }
    setOptionalConsent(nextConsent)
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
    setSettingsOpen(false)
    if (nextConsent === 'denied') {
      setGaReady(false)
      setClarityReady(false)
    }
  }

  const showConsentPanel = hydrated && hasOptionalAnalytics && (consent === 'unknown' || settingsOpen)

  return (
    <>
      {consent === 'granted' && gaMeasurementId && (
        <Script
          id="tfh-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
          onLoad={() => {
            ensureGtag()
            window.gtag?.('js', new Date())
            window.gtag?.('config', gaMeasurementId, {
              allow_google_signals: false,
              allow_ad_personalization_signals: false,
            })
            setOptionalConsent('granted')
            setGaReady(true)
          }}
        />
      )}

      {consent === 'granted' && clarityProjectId && (
        <Script
          id="tfh-microsoft-clarity"
          src={`https://www.clarity.ms/tag/${clarityProjectId}`}
          strategy="afterInteractive"
          onLoad={() => {
            ensureClarity()
            setOptionalConsent('granted')
            setClarityReady(true)
          }}
        />
      )}

      {showConsentPanel && (
        <section
          className="analytics-consent"
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-consent-title"
          data-analytics-ignore
        >
          <div className="analytics-consent-copy">
            <h2 id="analytics-consent-title">Optional analytics</h2>
            <p>
              Allow privacy-conscious journey analytics and heatmaps so we can improve comparisons.
              We never capture form contents. Basic anonymous traffic measurement remains active.
              {' '}<Link href="/privacy-policy">Privacy policy</Link>
            </p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" className="analytics-consent-reject" onClick={() => updateConsent('denied')}>
              Reject optional
            </button>
            <button type="button" className="analytics-consent-accept" onClick={() => updateConsent('granted')}>
              Accept analytics
            </button>
            {consent !== 'unknown' && (
              <button type="button" className="analytics-consent-cancel" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}
    </>
  )
}
