'use client'

import { track as trackVercel } from '@vercel/analytics'

export const SITE_ANALYTICS_EVENT = 'tfh:site-analytics-event'

export type SiteEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>

export interface SiteAnalyticsEventDetail {
  name: string
  properties: SiteEventProperties
}

export function trackSiteEvent(
  name: string,
  properties: SiteEventProperties = {},
) {
  trackVercel(name, properties)
  if (typeof window === 'undefined') return
  window.queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent<SiteAnalyticsEventDetail>(SITE_ANALYTICS_EVENT, {
      detail: { name, properties },
    }))
  })
}
