import type { Metadata } from 'next'

/**
 * Site-wide metadata shared by both root layouts: app/(en)/layout.tsx (English,
 * <html lang="en">) and app/ru/layout.tsx (Russian, <html lang="ru">). Before
 * the split, /ru inherited exactly this object from the single root layout.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL('https://tradersfundhub.com'),
  title: {
    default: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    template: '%s | TFH',
  },
  description: 'Traders Fund Hub is your trusted source for in-depth prop firm reviews, comparisons, and trading education. Find the best prop firm for your needs.',
  keywords: 'prop firms, prop firm reviews, funded trading, FTMO, FundedNext, FundingPips, trading education',
  authors: [{ name: 'Traders Fund Hub' }],
  openGraph: {
    type: 'website',
    siteName: 'Traders Fund Hub',
    url: 'https://tradersfundhub.com',
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Allow full-size image previews (Google Discover + image-rich SERPs)
      // and uncapped text snippets.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}
