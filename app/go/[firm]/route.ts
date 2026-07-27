import { NextResponse } from 'next/server'
import { getAllFirms } from '@/lib/firms'

/**
 * Affiliate redirect endpoint. Visiting /go/ftmo sends the user to the firm's
 * affiliate URL (when configured) or the firm's review page (fallback).
 *
 * Centralising redirects here means:
 *   • Affiliate URLs live in one place (firms.json) — no scattered hardcoded
 *     /go-ftmo etc. links in MDX content.
 *   • We can layer click tracking, geo-routing, or A/B logic in one spot.
 *   • Outgoing links carry `rel="sponsored"` semantics via the redirect (and
 *     the caller still adds `rel="sponsored nofollow"` on the anchor).
 *
 * Matching is on a slug derived from the firm name: lowercased, alphanumerics
 * only. So /go/ftmo, /go/fundednext, /go/funding-pips, /go/topstep, etc.
 *
 * UTM tagging: every outbound affiliate URL is decorated with
 *   utm_source=tradersfundhub
 *   utm_medium=affiliate
 *   utm_campaign=<from-param or 'unknown'>
 * The caller passes ?from=<placement> (e.g. ?from=home-leaderboard,
 * ?from=main-table, ?from=review-cta, ?from=compare) so partner dashboards
 * show which placement drives conversions.
 */

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Non-firm partners we review (trade copiers, backtesters, social-trading
 * platforms). They aren't in firms.json — that file is prop firms only — but
 * their articles still carry "Visit X" CTAs pointing at /go/<slug>.
 *
 * Until an affiliate deal is signed, `affiliateUrl` stays null and the click
 * lands on our own review instead of a dead end. Add the partner URL here the
 * day the deal goes live; nothing else needs to change.
 */
const PARTNERS: Record<string, { affiliateUrl: string | null; fallback: string }> = {
  'traders-connect': { affiliateUrl: null, fallback: '/blog/traders-connect-trade-copier' },
  zulutrade: { affiliateUrl: null, fallback: '/blog/zulutrade-review' },
  'fx-replay': { affiliateUrl: null, fallback: '/blog/fx-replay-review' },
  copyfx: { affiliateUrl: null, fallback: '/blog/copyfx-review' },
  '3commas': { affiliateUrl: null, fallback: '/blog/3commas-review' },
}

function decorateUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url)
    // Don't clobber existing UTM params the firm pre-baked into its affiliate URL.
    if (!u.searchParams.has('utm_source')) {
      u.searchParams.set('utm_source', 'tradersfundhub')
    }
    if (!u.searchParams.has('utm_medium')) {
      u.searchParams.set('utm_medium', 'affiliate')
    }
    if (!u.searchParams.has('utm_campaign')) {
      u.searchParams.set('utm_campaign', campaign)
    }
    return u.toString()
  } catch {
    // Bad URL — return original so a malformed firm entry doesn't 500 the
    // user's click. The fallback in GET() catches review-page strings.
    return url
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ firm: string }> }
) {
  const { firm } = await params
  const target = slugify(firm)
  const match = getAllFirms().find(f => slugify(f.name) === target)
  const url = new URL(req.url)
  const from = url.searchParams.get('from') || 'unknown'

  if (!match) {
    // Reviewed tools/platforms that aren't prop firms (see PARTNERS above).
    const partner = PARTNERS[target]
    if (partner) {
      return partner.affiliateUrl
        ? NextResponse.redirect(decorateUtm(partner.affiliateUrl, from), 302)
        : NextResponse.redirect(new URL(partner.fallback, req.url), 302)
    }
    return NextResponse.redirect(new URL('/main-table', req.url), 307)
  }

  // If an affiliate URL exists, decorate it with UTMs. Otherwise the fallback
  // is the internal review page — no UTM (would be noise).
  if (match.affiliateUrl) {
    const dest = decorateUtm(match.affiliateUrl, from)
    // 302 (temporary) because affiliate URLs can change; we don't want
    // intermediaries caching the redirect.
    return NextResponse.redirect(dest, 302)
  }

  return NextResponse.redirect(new URL(match.reviewUrl, req.url), 302)
}
