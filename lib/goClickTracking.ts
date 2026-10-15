import { after } from 'next/server'
import { track } from '@vercel/analytics/server'
import { campaignLocale } from '@/lib/analyticsTaxonomy'

/**
 * Privacy-friendly /go click logging (docs/click-tracking.md).
 *
 * Records only: firm slug, click kind, placement (?from=), source page path
 * and language. No cookies, IP addresses, user agents, query strings or other
 * personal data are read or forwarded: Vercel's server track() receives a
 * synthetic header set containing just the source page URL (no user-agent,
 * x-forwarded-for or cookie), so the event cannot be tied to a visitor.
 *
 * Fail-open: everything runs after the redirect response is sent (next/server
 * `after`) and every error is swallowed. Tracking can never block a redirect.
 */
export type GoClickKind = 'affiliate' | 'official' | 'source'

const SITE_ORIGIN = 'https://tradersfundhub.com'

/** Same-site referer path only (no query/hash); null for external or missing referers. */
export function sourcePathFromReferer(referer: string | null, requestUrl: string, requestHost?: string | null): string | null {
  if (!referer) return null
  try {
    const ref = new URL(referer)
    const req = new URL(requestUrl)
    const sameSite = ref.host === req.host || ref.host === requestHost || ref.hostname.replace(/^www\./, '') === 'tradersfundhub.com'
    return sameSite ? ref.pathname.slice(0, 200) : null
  } catch {
    return null
  }
}

export function goClickLanguage(placement: string, sourcePath: string | null): 'en' | 'ru' | 'unknown' {
  if (sourcePath) return sourcePath === '/ru' || sourcePath.startsWith('/ru/') ? 'ru' : 'en'
  return campaignLocale(placement)
}

/** Placement label for analytics: max 64 chars of [a-z0-9-_|]; anything else is dropped. */
export function sanitizePlacement(value: string | null | undefined): string {
  const cleaned = (value ?? '').toLowerCase().replace(/[^a-z0-9\-_|]/g, '').slice(0, 64)
  return cleaned || 'unknown'
}

export function buildGoClickEvent(req: Request, firm: string, kind: GoClickKind, placement: string) {
  const sourcePath = sourcePathFromReferer(req.headers.get('referer'), req.url, req.headers.get('host'))
  return {
    firm,
    kind,
    placement: sanitizePlacement(placement),
    source_path: sourcePath ?? 'unknown',
    lang: goClickLanguage(sanitizePlacement(placement), sourcePath),
  }
}

/** Sends the go_click custom event to Vercel Web Analytics after the redirect is sent. Never throws. */
export function trackGoClick(req: Request, firm: string, kind: GoClickKind, placement: string): void {
  try {
    const event = buildGoClickEvent(req, firm, kind, placement)
    after(async () => {
      try {
        const page = event.source_path === 'unknown' ? SITE_ORIGIN : `${SITE_ORIGIN}${event.source_path}`
        await track('go_click', event, { headers: { referer: page } })
      } catch {
        // fail-open
      }
    })
  } catch {
    // fail-open: outside a request scope (e.g. scripts calling GET directly) or any tracking error
  }
}
