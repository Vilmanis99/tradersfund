import { getAllPosts } from '@/lib/mdx'

const SITE = 'https://tradersfundhub.com'

// Prerender at build time — the feed only changes when content changes.
export const dynamic = 'force-static'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc822(date: string): string {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? new Date(0).toUTCString() : d.toUTCString()
}

export async function GET() {
  const posts = getAllPosts()
  const updated = posts[0]?.date ? toRfc822(posts[0].date) : new Date(0).toUTCString()

  const items = posts
    .map(p => {
      const url = `${SITE}/blog/${p.slug}`
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${toRfc822(p.date)}</pubDate>
      ${p.author ? `<dc:creator>${escapeXml(p.author)}</dc:creator>` : ''}
      ${p.categories?.map(c => `<category>${escapeXml(c)}</category>`).join('\n      ') || ''}
      <description>${escapeXml(p.excerpt || p.title)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Traders Fund Hub — Reviews &amp; Guides</title>
    <link>${SITE}/blog</link>
    <description>Independent prop-firm reviews, comparisons, and rule-change alerts.</description>
    <language>en</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
