import { NextResponse } from 'next/server'
import { getAllFirms } from '@/lib/firms'
import { INDIA_EVIDENCE_BY_SLUG } from '@/lib/india'

/**
 * Affiliate redirect endpoint. Visiting /go/ftmo sends the user to the firm's
 * affiliate URL (when configured) or its first-party public website.
 *
 * Centralising redirects here means:
 *   • Affiliate URLs live in one place (firms.json) — no scattered hardcoded
 *     /go-ftmo etc. links in MDX content.
 *   • We can layer click tracking, geo-routing, or A/B logic in one spot.
 *   • Paid links carry `rel="sponsored"` on the calling anchor. Organic
 *     first-party links use nofollow/noopener without implying a partnership.
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

function campaignFrom(value: string | null) {
  const campaign = value ? slugify(value).slice(0, 64) : ''
  return campaign || 'unknown'
}

function isIndiaCampaign(placement: string) {
  return placement === 'best-prop-firms-in-india' ||
    placement.startsWith('india-matcher-') ||
    placement.startsWith('india-inr-planner-')
}

function recordAffiliateClick(firm: string, placement: string) {
  // Deliberately exclude IP, user-agent, referrer, and query-string data.
  // Hosting logs can aggregate this event while partner dashboards attribute
  // downstream conversions through the matching utm_campaign value.
  console.info(JSON.stringify({
    event: 'affiliate_click',
    firm,
    placement,
  }))
}

function recordOfficialClick(firm: string, placement: string) {
  console.info(JSON.stringify({
    event: 'official_site_click',
    firm,
    placement,
  }))
}

/**
 * Non-firm partners we review (trade copiers, backtesters, social-trading
 * platforms). They aren't in firms.json — that file is prop firms only — but
 * their articles still carry "Visit X" CTAs pointing at /go/<slug>.
 *
 * Affiliate URLs stay null until a deal is signed. The official URL remains
 * available so "Visit" always means leaving for the named product.
 */
const PARTNERS: Record<string, { affiliateUrl: string | null; officialUrl: string }> = {
  'traders-connect': { affiliateUrl: null, officialUrl: 'https://tradersconnect.com/' },
  zulutrade: { affiliateUrl: null, officialUrl: 'https://www.zulutrade.com/' },
  'fx-replay': { affiliateUrl: null, officialUrl: 'https://www.fxreplay.com/' },
  copyfx: { affiliateUrl: null, officialUrl: 'https://www.copyfx.com/' },
  '3commas': { affiliateUrl: null, officialUrl: 'https://3commas.io/' },
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
  const from = campaignFrom(url.searchParams.get('from'))

  if (!match) {
    // Reviewed tools/platforms that aren't prop firms (see PARTNERS above).
    const partner = PARTNERS[target]
    if (partner) {
      if (partner.affiliateUrl) {
        recordAffiliateClick(target, from)
        return NextResponse.redirect(decorateUtm(partner.affiliateUrl, from), 302)
      }
      recordOfficialClick(target, from)
      return NextResponse.redirect(partner.officialUrl, 302)
    }
    return NextResponse.redirect(new URL('/prop-firms', req.url), 307)
  }

  const indiaEvidence = INDIA_EVIDENCE_BY_SLUG[target]
  if (isIndiaCampaign(from) && indiaEvidence?.rbiAlert.status === 'named') {
    console.info(JSON.stringify({
      event: 'india_affiliate_click_blocked',
      firm: target,
      placement: from,
      reason: 'rbi_alert_list',
    }))
    const guide = new URL('/blog/are-prop-firms-legal-in-india', req.url)
    guide.searchParams.set('firm', target)
    return NextResponse.redirect(guide, 302)
  }

  // Affiliate links receive campaign attribution. Organic first-party links
  // do not receive affiliate UTMs, because that would mislabel the click.
  if (match.affiliateUrl) {
    const dest = decorateUtm(match.affiliateUrl, from)
    recordAffiliateClick(target, from)
    // 302 (temporary) because affiliate URLs can change; we don't want
    // intermediaries caching the redirect.
    return NextResponse.redirect(dest, 302)
  }

  recordOfficialClick(target, from)
  return NextResponse.redirect(match.officialUrl, 302)
}
