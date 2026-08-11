import type { OutboundRelationship } from './outboundDestinations'

function safeCampaignPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

function setCampaign(href: string, campaign: string) {
  const url = new URL(href, 'https://tradersfundhub.com')
  url.searchParams.set('from', campaign)
  return `${url.pathname}${url.search}${url.hash}`
}

/** Decorate rendered article-body /go links without editing editorial source. */
export function decoratePostOutboundLinks(
  html: string,
  outboundRelationships: Readonly<Record<string, OutboundRelationship>>,
  routeSlug: string,
) {
  const campaign = `post-body-${safeCampaignPart(routeSlug)}`
  return html.replace(/<a\b[^>]*>/gi, tag => {
    const hrefMatch = tag.match(/\bhref=(["'])(\/go\/([^"'?/#]+)[^"']*)\1/i)
    if (!hrefMatch) return tag

    const rel = outboundRelationships[hrefMatch[3].toLowerCase()] === 'affiliate'
      ? 'sponsored nofollow noopener'
      : 'nofollow noopener'
    const href = setCampaign(hrefMatch[2], campaign)
    const cleanTag = tag
      .replace(hrefMatch[0], `href=${hrefMatch[1]}${href}${hrefMatch[1]}`)
      .replace(/\s+rel=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\s+target=(?:"[^"]*"|'[^']*')/i, '')
    return cleanTag.replace(/^<a\b/i, `<a rel="${rel}" target="_blank"`)
  })
}
