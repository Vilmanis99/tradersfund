import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/go/'] },
    sitemap: 'https://tradersfundhub.com/sitemap.xml',
  }
}
