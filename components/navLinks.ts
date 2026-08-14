/**
 * Primary site navigation definition. Lives in its own module (not in
 * Header.tsx) so the client-side HeaderNav can import these without
 * dragging the server-only `lib/firms` graph (and its `fs` import) into
 * the browser bundle.
 */
export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'India', href: '/best-prop-firms-in-india' },
  {
    label: 'Prop Firms',
    href: '/prop-firms',
    children: [
      { label: 'Best Prop Firms 2026', href: '/best-prop-firms-2026' },
      { label: 'Global Directory', href: '/prop-firms' },
      { label: 'Compare Challenges', href: '/prop-firm-challenges' },
      { label: 'Challenge Changes', href: '/prop-firm-challenge-changes' },
      { label: 'Compare Firms', href: '/compare' },
      { label: 'Discount Codes', href: '/prop-firm-discount-codes' },
      { label: 'Filter by Feature', href: '/prop-firms#focused-rule-lists' },
      { label: 'India Comparisons', href: '/best-prop-firms-in-india/compare' },
      { label: 'India Challenge Changes', href: '/best-prop-firms-in-india/challenge-changes' },
      { label: 'India Challenge Rules', href: '/best-prop-firms-in-india/challenge-comparison' },
      { label: 'India Payout Methods', href: '/best-prop-firms-in-india/payout-methods' },
      { label: 'Best in UK', href: '/best-prop-firms-in-uk' },
      { label: 'Best in US', href: '/best-prop-firms-in-us' },
      { label: 'Cheapest Firms', href: '/cheapest-prop-firms' },
      { label: 'Futures Firms', href: '/best-futures-prop-firms' },
      { label: 'Crypto Firms', href: '/best-crypto-prop-firms' },
      { label: 'Swing Trading', href: '/best-swing-trading-prop-firms' },
      { label: 'Instant Funding', href: '/best-instant-funding-prop-firms' },
    ],
  },
  {
    label: 'Learn',
    href: '/how-prop-firm-challenges-work',
    children: [
      { label: 'How to Pass a Challenge', href: '/how-to-pass-a-prop-firm-challenge' },
      { label: 'How Challenges Work', href: '/how-prop-firm-challenges-work' },
      { label: 'True Cost Math', href: '/true-cost-of-prop-firm-challenges' },
      { label: 'What is a Prop Firm?', href: '/blog/what-is-a-prop-firm' },
    ],
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

export type NavLink = (typeof navLinks)[number]
