'use client'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import NewsletterForm from './NewsletterForm'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', marginTop: 'auto', padding: '3rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Brand + Newsletter */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: '1rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg, #27a17b, #2dd4bf)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} color="#fff" />
              </div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Traders Fund Hub</span>
            </Link>
            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1rem' }}>
              Your trusted source for prop firm reviews, comparisons, and trading education.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>Join the TFH family</p>
            <NewsletterForm />
          </div>

          {/* Prop Firms */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Prop Firms</h4>
            {[
              { label: 'Main Directory', href: '/main-table' },
              { label: 'Best Firms in UK', href: '/best-prop-firms-in-uk' },
              { label: 'Best Firms in US', href: '/best-prop-firms-in-us' },
              { label: 'Cheapest Firms', href: '/cheapest-prop-firms' },
              { label: 'Futures Firms', href: '/best-futures-prop-firms' },
            ].map(l => <FooterLink key={l.href} {...l} />)}
          </div>

          {/* Reviews */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Top Reviews</h4>
            {[
              { label: 'FTMO Review', href: '/blog/ftmo-review' },
              { label: 'FundedNext Review', href: '/blog/fundednext-review' },
              { label: 'FundingPips Review', href: '/blog/funding-pips-review' },
              { label: 'E8 Markets Review', href: '/blog/e8-markets-review' },
              { label: 'Alpha Capital Review', href: '/blog/alpha-capital-review' },
            ].map(l => <FooterLink key={l.href} {...l} />)}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Company</h4>
            {[
              { label: 'About Us', href: '/about' },
              { label: 'How We Score Firms', href: '/methodology' },
              { label: 'Authors', href: '/authors' },
              { label: 'Blog', href: '/blog' },
              { label: 'Contact', href: '/contact' },
              { label: 'Privacy Policy', href: '/privacy-policy' },
              { label: 'Disclaimers', href: '/disclaimers' },
            ].map(l => <FooterLink key={l.href} {...l} />)}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#475569', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} Traders Fund Hub. All rights reserved.
          </p>
          <p style={{ color: '#475569', fontSize: '0.75rem', maxWidth: 500 }}>
            Disclaimer: Trading involves significant risk of loss. This site is for informational purposes only and does not constitute financial advice.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.4rem', transition: 'color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
      onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
      {label}
    </Link>
  )
}
