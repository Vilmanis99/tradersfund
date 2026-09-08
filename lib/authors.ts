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
  /** Substantive biography update, independent of firm-price capture dates. */
  updatedAt?: string
  /** Public evidence for biography claims, not evidence of trading performance. */
  references?: Array<{ label: string; url: string }>
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
    role: 'Author',
    initials: 'ED',
    short:
      'Edris writes prop-firm reviews and trading guides for Traders Fund Hub, covering programme costs, drawdown rules and payout conditions.',
    long: `Edris is an author at Traders Fund Hub. His articles cover prop-firm programmes, challenge costs, trading rules and the conditions attached to payouts.

TradingRage identifies Edris Derakhshi as its founder. CryptoPotato has also published market analysis credited to him; examples and biography sources are linked below.

The site's methodology explains how published programme terms are compared. A source-based review does not, by itself, establish that its author purchased an account, passed an evaluation or received a payout from the firm.`,
    updatedAt: '2026-09-08',
    references: [
      { label: 'TradingRage: about the site and its founder', url: 'https://tradingrage.com/about' },
      { label: 'CryptoPotato: market analysis credited to Edris Derakhshi', url: 'https://cryptopotato.com/whats-next-for-eth-after-10-weekly-decline-ethereum-price-analysis/' },
    ],
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
