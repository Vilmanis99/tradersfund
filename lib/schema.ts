import { getChallengesByFirm } from './firms'
import type { Firm } from './firms'
import type { PostMeta } from './mdx'

const SITE = 'https://tradersfundhub.com'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * If the post is a firm review, return a rich schema graph (Review +
 * AggregateRating nested inside). Otherwise return a plain Article schema.
 */
export function postSchema(post: PostMeta, allFirms: Firm[]) {
  const postUrl = `${SITE}/blog/${post.slug}`
  const ogImage = `${postUrl}/opengraph-image`
  const firm = allFirms.find(f => f.reviewUrl === `/blog/${post.slug}`)

  const baseArticle = {
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: ogImage,
    datePublished: post.date,
    dateModified: post.modified || post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: SITE,
    },
    mainEntityOfPage: postUrl,
  }

  if (!firm) return { '@context': 'https://schema.org', ...baseArticle }

  // Build offers list from this firm's cheapest priced challenge per product.
  // Skips tiers with null prices to keep schema valid for Google rich results.
  const challenges = getChallengesByFirm(slugify(firm.name))
  const offers = challenges
    .map(c => {
      const cheapest = c.accountSizes
        .filter(t => t.priceUsd != null && t.priceUsd > 0)
        .sort((a, b) => a.priceUsd - b.priceUsd)[0]
      if (!cheapest) return null
      return {
        '@type': 'Offer',
        name: `${c.productName} — $${cheapest.sizeUsd.toLocaleString()} account`,
        price: cheapest.priceUsd.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: SITE + firm.reviewUrl,
      }
    })
    .filter(Boolean)

  const aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue: firm.score,
    bestRating: 10,
    worstRating: 0,
    ratingCount: 1,
  }

  // Product node captures the actual purchasable challenges + price range.
  // Nested under Review.itemReviewed so Google can render price-rich result.
  const product = {
    '@type': 'Product',
    name: firm.name,
    description: post.excerpt || `${firm.name} prop firm review`,
    brand: { '@type': 'Brand', name: firm.name },
    url: SITE + firm.reviewUrl,
    ...(firm.logo ? { image: SITE + firm.logo } : {}),
    aggregateRating,
    ...(offers.length > 0 ? { offers } : {}),
  }

  const review = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: product,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: firm.score,
      bestRating: 10,
      worstRating: 0,
    },
    author: { '@type': 'Person', name: post.author },
    datePublished: post.date,
    dateModified: post.modified || post.date,
    name: post.title,
    reviewBody: post.excerpt || post.title,
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: SITE,
    },
  }

  return review
}

/**
 * BreadcrumbList schema. Pass segments from root → current page.
 * e.g. [{ name: 'Blog', url: '/blog' }, { name: 'FTMO Review' }]
 */
export function breadcrumbSchema(segments: Array<{ name: string; url?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: segments.map((seg, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: seg.name,
      ...(seg.url ? { item: SITE + seg.url } : {}),
    })),
  }
}

/**
 * ItemList of firms for /prop-firms/[feature] pages. Each list item nests
 * an Organization (the firm) with an aggregateRating so Google can render
 * a rich "Top 10" carousel for the page.
 */
export function itemListSchema(firms: Firm[], featureLabel: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Prop Firms That Allow ${featureLabel}`,
    numberOfItems: firms.length,
    itemListElement: firms.map((firm, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Organization',
        name: firm.name,
        url: SITE + firm.reviewUrl,
        ...(firm.logo ? { logo: SITE + firm.logo } : {}),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: firm.score,
          bestRating: 10,
          worstRating: 0,
          ratingCount: 1,
        },
      },
    })),
  }
}

/**
 * FAQPage schema for the FAQ section of a feature/landing page.
 * Pair with rendered HTML FAQ blocks for both visible content and rich
 * results eligibility.
 */
export function faqPageSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/**
 * Two-firm comparison ItemList. Order matters: pass winner first so Google
 * can use the implied ranking in a "X vs Y" rich result.
 */
export function comparisonItemListSchema(
  firmA: Firm,
  firmB: Firm,
  matchupLabel: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: matchupLabel,
    numberOfItems: 2,
    itemListElement: [firmA, firmB].map((firm, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Organization',
        name: firm.name,
        url: SITE + firm.reviewUrl,
        ...(firm.logo ? { logo: SITE + firm.logo } : {}),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: firm.score,
          bestRating: 10,
          worstRating: 0,
          ratingCount: 1,
        },
      },
    })),
  }
}

/**
 * Organization schema — emit once on the home page (and inherited by virtue
 * of being the publisher of everything else). Establishes the brand entity
 * Google links every Article / Review / Person back to.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Traders Fund Hub',
    url: SITE,
    logo: `${SITE}/favicon.ico`,
    description:
      'Independent prop-firm reviews, comparisons, and rule-change alerts. Every claim traces to a primary source.',
    sameAs: [
      // Add socials as they go live.
    ],
  }
}

/**
 * WebSite schema with SearchAction — lights up the sitelinks search box in
 * Google SERPs, lets users search the site directly from the search results.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Traders Fund Hub',
    url: SITE,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Blog / CollectionPage schema for the /blog index. Lists every published
 * post as a `blogPost` entry so Google can render the collection rich result.
 */
export function blogIndexSchema(posts: PostMeta[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Traders Fund Hub — Reviews & Guides',
    url: `${SITE}/blog`,
    blogPost: posts.slice(0, 12).map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE}/blog/${p.slug}`,
      datePublished: p.date,
      dateModified: p.modified || p.date,
      author: p.author ? { '@type': 'Person', name: p.author } : undefined,
    })),
  }
}

/** Tiny helper to render a JSON-LD <script> without HTML-escape hazards. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
