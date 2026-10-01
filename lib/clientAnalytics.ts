'use client'

import { track as trackVercel } from '@vercel/analytics'
import { campaignAttribution, contentLocale, journeyStage } from './analyticsTaxonomy'

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
  if (typeof window === 'undefined') {
    trackVercel(name, properties)
    return
  }
  const pathname = window.location.pathname
  const attributedProperties = {
    ...properties,
    ...campaignAttribution(window.location.search),
    content_group: journeyStage(pathname),
    locale: contentLocale(pathname),
  }
  trackVercel(name, attributedProperties)
  window.queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent<SiteAnalyticsEventDetail>(SITE_ANALYTICS_EVENT, {
      detail: { name, properties: attributedProperties },
    }))
  })
}
