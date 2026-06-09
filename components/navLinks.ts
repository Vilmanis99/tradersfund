/**
 * Primary site navigation definition. Lives in its own module (not in
 * Header.tsx) so the client-side HeaderNav can import these without
 * dragging the server-only `lib/firms` graph (and its `fs` import) into
 * the browser bundle.
 */
export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Blog', href: '/blog' },
  {
    label: 'Prop Firms',
    href: '/main-table',
    children: [
      { label: 'Main Directory', href: '/main-table' },
      { label: 'Compare Firms', href: '/compare' },
      { label: 'Filter by Feature', href: '/prop-firms' },
      { label: 'Best in UK', href: '/best-prop-firms-in-uk' },
      { label: 'Best in US', href: '/best-prop-firms-in-us' },
      { label: 'Cheapest Firms', href: '/cheapest-prop-firms' },
      { label: 'Futures Firms', href: '/best-futures-prop-firms' },
      { label: 'Instant Funding', href: '/best-instant-funding-prop-firms' },
    ],
  },
  {
    label: 'Learn',
    href: '/how-prop-firm-challenges-work',
    children: [
      { label: 'How Challenges Work', href: '/how-prop-firm-challenges-work' },
      { label: 'True Cost Math', href: '/true-cost-of-prop-firm-challenges' },
      { label: 'What is a Prop Firm?', href: '/blog/what-is-a-prop-firm' },
    ],
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

export type NavLink = (typeof navLinks)[number]
