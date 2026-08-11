import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import NewsletterForm from './NewsletterForm'
import AnimatedNumber from './AnimatedNumber'
import { getAllFirms, getAllChallenges, isChallengeFresh } from '@/lib/firms'
import { getAllPosts } from '@/lib/mdx'
import { isNewsletterConfigured } from '@/lib/brevo'
import AnalyticsPreferencesButton from './AnalyticsPreferencesButton'

export default function Footer() {
  const newsletterEnabled = isNewsletterConfigured()
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const posts = getAllPosts()
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const pricedChallengeCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0) ||
      (tier.priceEur != null && tier.priceEur > 0)),
  ).length

  const latestCapture = challenges
    .map(challenge => challenge.sourceCapturedAt)
    .sort()
    .at(-1)
  const updatedLabel = latestCapture
    ? new Date(`${latestCapture}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
      })
    : 'Not available'

  const propFirmLinks = [
    { label: 'Best Prop Firms 2026', href: '/best-prop-firms-2026' },
    { label: 'Global Directory', href: '/prop-firms' },
    { label: 'Compare Challenges', href: '/prop-firm-challenges' },
    { label: 'Challenge Changes', href: '/prop-firm-challenge-changes' },
    { label: 'Best Firms in UK', href: '/best-prop-firms-in-uk' },
    { label: 'Best Firms in US', href: '/best-prop-firms-in-us' },
    { label: 'Best Firms in India', href: '/best-prop-firms-in-india' },
    { label: 'India Challenge Comparison', href: '/best-prop-firms-in-india/challenge-comparison' },
    { label: 'India Comparisons', href: '/best-prop-firms-in-india/compare' },
    { label: 'India Challenge Changes', href: '/best-prop-firms-in-india/challenge-changes' },
    { label: 'Cheapest Firms', href: '/cheapest-prop-firms' },
    { label: 'Discount Codes', href: '/prop-firm-discount-codes' },
    { label: 'Futures Firms', href: '/best-futures-prop-firms' },
    { label: 'Crypto Firms', href: '/best-crypto-prop-firms' },
    { label: 'Swing Trading Firms', href: '/best-swing-trading-prop-firms' },
    { label: 'How Challenges Work', href: '/how-prop-firm-challenges-work' },
  ]
  const reviewLinks = [
    { label: 'FTMO Review', href: '/blog/ftmo-review' },
    { label: 'FundedNext Review', href: '/blog/fundednext-review' },
    { label: 'FundingPips Review', href: '/blog/funding-pips-review' },
    { label: 'E8 Markets Review', href: '/blog/e8-markets-review' },
    { label: 'Alpha Capital Review', href: '/blog/alpha-capital-review' },
  ]
  const companyLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'How We Score Firms', href: '/methodology' },
    { label: 'Authors', href: '/authors' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Disclaimers', href: '/disclaimers' },
  ]

  return (
    <footer className="footer-aurora">
      <div className="aurora-orb aurora-orb--3 footer-orb" aria-hidden="true" />
      <div className="footer-accent-line" aria-hidden="true" />

      <div className="footer-shell">
        {/* Stats strip */}
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={firms.length} />
            </span>
            <span className="footer-stat-label">firms tracked</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={pricedChallengeCount} />
            </span>
            <span className="footer-stat-label">fresh priced products</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={posts.length} />
            </span>
            <span className="footer-stat-label">articles</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-label">Updated</span>
            <span className="footer-stat-num footer-stat-num--text">{updatedLabel}</span>
          </div>
        </div>

        <div className="footer-grid">
          {/* Brand + Newsletter — glass card */}
          <div className="footer-brand-card">
            <Link href="/" className="footer-brand">
              <div className="footer-brand-mark">
                <TrendingUp size={15} color="#fff" />
              </div>
              <span className="footer-brand-name">Traders Fund Hub</span>
            </Link>
            <p className="footer-brand-copy">
              Your trusted source for prop firm reviews, comparisons, and trading education.
            </p>
            {newsletterEnabled && (
              <>
                <p className="footer-brand-tagline">Get the weekly rule-change digest</p>
                <NewsletterForm placement="footer" />
              </>
            )}

          </div>

          {/* Prop Firms */}
          <div className="footer-col">
            <h4 className="footer-eyebrow">Prop Firms</h4>
            <ul className="footer-list">
              {propFirmLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Latest reviews — green-tint eyebrow with pulse dot */}
          <div className="footer-col">
            <h4 className="footer-eyebrow footer-eyebrow--live">
              <span className="hero-eyebrow-dot" aria-hidden="true" />
              Latest reviews
            </h4>
            <ul className="footer-list">
              {reviewLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4 className="footer-eyebrow">Company</h4>
            <ul className="footer-list">
              {companyLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-legal">
            <p className="footer-bottom-copyright">
              © {new Date().getFullYear()} Traders Fund Hub. All rights reserved.
            </p>
            {(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) && (
              <AnalyticsPreferencesButton />
            )}
          </div>
          <p className="footer-bottom-disclaimer">
            Disclaimer: Trading involves significant risk of loss. This site is for informational
            purposes only and does not constitute financial advice.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link href={href} className="footer-link">{label}</Link>
    </li>
  )
}
