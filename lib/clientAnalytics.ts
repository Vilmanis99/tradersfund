'use client'

import { track as trackVercel } from '@vercel/analytics'
import { contentLocale, createCampaignAttributionTracker, journeyStage } from './analyticsTaxonomy'
import { createAiReferralTracker } from './aiReferral'

const rememberCampaignAttribution = createCampaignAttributionTracker()
const rememberAiReferral = createAiReferralTracker()

export function currentCampaignAttribution() {
  if (typeof window === 'undefined') return {}
  return {
    ...rememberCampaignAttribution(window.location.search),
    ...rememberAiReferral(typeof document === 'undefined' ? '' : document.referrer, window.location.search),
  }
}

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
    ...currentCampaignAttribution(),
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
