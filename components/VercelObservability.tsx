'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

function redactUrl<T extends { url: string }>(event: T): T {
  try {
    const url = new URL(event.url, window.location.origin)
    url.search = ''
    url.hash = ''
    return { ...event, url: url.toString() }
  } catch {
    return event
  }
}

export default function VercelObservability() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => redactUrl(event)} />
      <SpeedInsights beforeSend={event => redactUrl(event)} />
    </>
  )
}
