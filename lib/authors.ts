/**
 * Author registry — used by AuthorBio (post pages) and /authors/[slug] (bio
 * page). Adding an author here lights up bylines and gives them a real
 * landing page; missing authors fall back to initials + a generic blurb in
 * AuthorBio.
 *
 * E-E-A-T: every byline links to its bio page, every bio names what the
 * person does, what they've published, and where to find them. Google's
 * quality-rater handbook treats this as a trust signal for YMYL content
 * (which prop-firm reviews are — they involve money decisions).
 */

export interface Author {
  slug: string
  name: string
  role: string
  initials: string
  /** One-line under the byline. */
  short: string
  /** Long-form, multi-paragraph bio. Plain text — split on blank lines. */
  long: string
  links?: {
    linkedin?: string
    twitter?: string
    website?: string
  }
}

export const AUTHORS: Author[] = [
  {
    slug: 'edris-derakhshi',
    name: 'Edris Derakhshi',
    role: 'Founder & Lead Editor',
    initials: 'ED',
    short:
      'Edris is the founder of Traders Fund Hub. Funded trader since 2020, market analyst published on CryptoQuant and CryptoPotato.',
    long: `Edris founded Traders Fund Hub after five years of trading funded accounts across forex, indices, and crypto. He built the site because the prop-firm category was dominated by review pages that read like firm press releases — long on hype, short on the numbers that determine whether a trader actually keeps any of their profit.

Before TFH, Edris ran TradingRage, a market-analysis content agency, and wrote regularly for CryptoQuant and CryptoPotato on derivatives markets, on-chain flows, and trader psychology. He has personally funded with FTMO, FundedNext, FundingPips, and Topstep, and verifies every payout cycle we publish.

His editorial principle: if a number on a review can't be traced to a primary source, it doesn't go in the review.`,
    links: {
      linkedin: 'https://www.linkedin.com/in/edris-derakhshi',
      twitter: 'https://x.com/TradingRage',
      website: 'https://tradingrage.com',
    },
  },
  {
    slug: 'tara-mohseni',
    name: 'Tara Mohseni',
    role: 'Content Writer & SEO',
    initials: 'TM',
    short:
      'Tara writes the educational guides and SEO content. Started in crypto, joined a forex broker, now full-time at TFH.',
    long: `Tara joined Traders Fund Hub in 2024 as the lead writer on educational and how-to content. Her brief: take the messy edge cases of prop-firm rules — consistency penalties, news-window haircuts, daily-drawdown traps — and turn them into guides a brand-new funded trader can actually use.

She started her career writing for a crypto exchange in 2020, moved to a retail forex broker, and has been writing finance content full-time since 2022. Her work focuses on the bridge between trading mechanics and the rule structures prop firms layer on top.

If you spot a guide on TFH that's unclear or out of date, Tara is the person who'll fix it.`,
    links: {
      linkedin: 'https://www.linkedin.com/in/tara-mohseni-35231b233',
    },
  },
]

export function getAuthorByName(name: string): Author | undefined {
  return AUTHORS.find(a => a.name === name)
}

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find(a => a.slug === slug)
}
