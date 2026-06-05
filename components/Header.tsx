import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import HeaderNav from './HeaderNav'

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

export default function Header() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(20, 20, 26, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 64 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 'auto' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#fff" aria-hidden="true" />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
            Traders <span className="gradient-text">Fund Hub</span>
          </span>
        </Link>

        <HeaderNav />
      </div>
    </header>
  )
}
