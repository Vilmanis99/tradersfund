import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import { getAllFirms } from '@/lib/firms'
import {
  INDIA_EVIDENCE,
  passesIndiaRegulatoryCountryGate,
  type IndiaPayoutRail,
} from '@/lib/india'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

const PATH = '/best-prop-firms-in-india/payout-methods'

export const metadata: Metadata = {
  title: { absolute: 'India Prop Firm Payout Methods (2026)' },
  description:
    'Compare published prop-firm payout methods for Indian traders, including bank transfer, Wise, Rise and crypto, with dated sources, fees and verification gaps.',
  alternates: { canonical: PATH },
  openGraph: {
    title: 'Prop Firm Payout Methods in India (2026)',
    description:
      'A source-checked comparison of Bank, Wise, Rise and Crypto payout routes for Indian prop-firm traders.',
    url: PATH,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prop Firm Payout Methods in India (2026)',
    description:
      'Compare published payout rails, fee disclosures and Indian verification gaps.',
  },
}

const RAILS: Record<IndiaPayoutRail, { label: string; description: string }> = {
  bank: {
    label: 'Bank transfer',
    description: 'The firm publishes a wire, SWIFT or bank-transfer route.',
  },
  wise: {
    label: 'Wise',
    description: 'The firm explicitly names Wise as a payout method.',
  },
  rise: {
    label: 'Rise',
    description: 'The firm routes payouts through the Rise provider.',
  },
  crypto: {
    label: 'Crypto',
    description: 'The firm publishes a crypto or stablecoin route.',
  },
  card: {
    label: 'Card payout',
    description: 'The firm publishes a card-based withdrawal route.',
  },
  skrill: {
    label: 'Skrill',
    description: 'The firm explicitly publishes Skrill withdrawals.',
  },
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? 'No screened firm'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function sourceDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RailPills({ rails }: { rails: IndiaPayoutRail[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {rails.map(rail => (
        <span key={rail} className="chip" style={{ fontSize: '0.72rem' }}>
          {RAILS[rail].label}
        </span>
      ))}
    </div>
  )
}

function EvidenceStatus() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.55rem',
      borderRadius: 999,
      color: '#fcd34d',
      background: 'rgba(245, 158, 11, 0.12)',
      fontSize: '0.68rem',
      fontWeight: 800,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }}>
      <CircleAlert size={11} />
      Indian receipt unverified
    </span>
  )
}

export default function Page() {
  const eligible = INDIA_EVIDENCE.filter(passesIndiaRegulatoryCountryGate)
  const excluded = INDIA_EVIDENCE.filter(entry => entry.rbiAlert.status === 'named')
  const firmsBySlug = new Map(
    getAllFirms().map(firm => [
      firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      firm,
    ]),
  )
  const capturedAt = INDIA_EVIDENCE.map(entry => entry.capturedAt).sort().at(-1)!
  const publishedRails = (Object.keys(RAILS) as IndiaPayoutRail[])
    .map(rail => ({
      rail,
      firms: eligible.filter(entry => entry.payoutRails.includes(rail)),
    }))
    .filter(group => group.firms.length > 0)

  const namesFor = (rail: IndiaPayoutRail) =>
    eligible.filter(entry => entry.payoutRails.includes(rail)).map(entry => entry.firmName)

  const faqs = [
    {
      q: 'Which screened prop firms publish bank-transfer payouts for Indian traders?',
      a: `${joinNames(namesFor('bank'))} publish a bank-transfer route. This is first-party method evidence, not proof that a specific Indian bank account will receive a payout.`,
    },
    {
      q: 'Which screened prop firm publishes Wise payouts?',
      a: `${joinNames(namesFor('wise'))} explicitly publishes Wise. Indian-profile availability, provider fees and INR conversion remain unverified.`,
    },
    {
      q: 'Which screened prop firms use Rise?',
      a: `${joinNames(namesFor('rise'))} publish Rise as a payout route. The trader must still pass the firm and provider identity checks.`,
    },
    {
      q: 'Does a published crypto payout make the transaction legal in India?',
      a: 'No. A payout method is an operational fact, not a FEMA, tax or regulatory conclusion. Review the contract and payment trail with qualified Indian advisers.',
    },
    {
      q: 'Does inclusion mean a prop firm is authorised by RBI?',
      a: 'No. Firms named on the RBI Alert List are excluded, but RBI says its list is non-exhaustive and absence must not be treated as authorisation.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Best Prop Firms in India', url: '/best-prop-firms-in-india' },
    { name: 'India Payout Methods' },
  ])
  const faq = faqPageSchema(faqs)

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            {eligible.length} screened firms · evidence updated {sourceDate(capturedAt)}
          </div>
          <h1 className="blog-hero-title">
            Prop Firm Payout Methods in India <span className="gradient-text">(2026)</span>
          </h1>
          <p className="blog-hero-sub">
            Compare Bank, Wise, Rise and Crypto routes using dated first-party sources.
            A published rail is not proof of Indian delivery, RBI authorisation, or a tax classification.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1.4rem' }}>
            <Link href="/best-prop-firms-in-india" className="btn-primary btn-glow">
              Compare India-screened firms <ArrowRight size={15} />
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
              Compare challenge rules
            </Link>
            <Link href="/blog/are-prop-firms-legal-in-india" className="btn-outline">
              Read the RBI &amp; FEMA guide
            </Link>
            <Link href="/blog/prop-firm-payout-tax-india" className="btn-outline">
              Build a payout tax record
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '2rem', paddingBottom: 0 }}>
        <div className="home-shell">
          <AffiliateDisclosure />
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: '1.5rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <WalletCards size={18} style={{ color: 'var(--accent-light)' }} />
                Published payout routes
              </h2>
              <p className="section-sub-text">
                Only rails stated on a firm&apos;s own public page are counted. Provider availability can still vary by profile.
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))',
            gap: '0.9rem',
          }}>
            {publishedRails.map(({ rail, firms }) => (
              <article key={rail} className="post-sidebar-card" style={{ padding: '1.25rem' }}>
                <span className="bento-tile-eyebrow">
                  <Banknote size={12} /> {firms.length} firm{firms.length === 1 ? '' : 's'}
                </span>
                <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.55rem 0 0.45rem' }}>
                  {RAILS[rail].label}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>
                  {RAILS[rail].description}
                </p>
                <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.55, margin: '0.8rem 0 0' }}>
                  {joinNames(firms.map(entry => entry.firmName))}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="payout-evidence-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="payout-evidence-heading" className="section-title">
                <FileCheck2 size={18} style={{ color: 'var(--accent-light)' }} />
                Firm-by-firm payout evidence
              </h2>
              <p className="section-sub-text">
                “Published” describes the general route. Every row still carries an Indian delivery gap until a redacted receipt is verified.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {eligible.map(entry => {
              const firm = firmsBySlug.get(entry.firmSlug)
              return (
                <article key={entry.firmSlug} className="post-sidebar-card" style={{ padding: '1.35rem' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                  }}>
                    <div>
                      <h3 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 0.55rem' }}>
                        {entry.firmName}
                      </h3>
                      <RailPills rails={entry.payoutRails} />
                    </div>
                    <EvidenceStatus />
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '0.9rem',
                    marginTop: '1.1rem',
                  }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.76rem' }}>Published payout policy</strong>
                      <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0.35rem 0 0' }}>
                        {entry.payout.summary}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.76rem' }}>Fee evidence</strong>
                      <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0.35rem 0 0' }}>
                        {entry.fees.summary}
                      </p>
                    </div>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.76rem' }}>India availability signal</strong>
                      <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0.35rem 0 0' }}>
                        {entry.country.summary}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.9rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: '0.7rem',
                  }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.5 }}>
                      Captured {sourceDate(entry.capturedAt)} · Open gap: {entry.unresolved}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {entry.payout.sourceUrls.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="nofollow noopener"
                          style={{ color: 'var(--accent-light)', fontSize: '0.74rem', fontWeight: 700 }}
                        >
                          Payout source{entry.payout.sourceUrls.length > 1 ? ` ${index + 1}` : ''}{' '}
                          <ExternalLink size={10} />
                        </a>
                      ))}
                      {firm && (
                        <Link href={firm.reviewUrl} style={{ color: '#fff', fontSize: '0.74rem', fontWeight: 700 }}>
                          Read review <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="rbi-excluded-heading">
        <div className="home-shell">
          <div className="post-sidebar-card" style={{
            padding: '1.4rem',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            background: 'rgba(127, 29, 29, 0.12)',
          }}>
            <span className="bento-tile-eyebrow" style={{ color: '#fca5a5' }}>
              <ShieldCheck size={12} /> Regulatory exclusion
            </span>
            <h2 id="rbi-excluded-heading" style={{
              color: '#fff',
              fontSize: '1.18rem',
              margin: '0.55rem 0 0.65rem',
            }}>
              {excluded.length} tracked firms are not presented as India payout options
            </h2>
            <p style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>
              {joinNames(excluded.map(entry => entry.firmName))} appear on the RBI Alert List and are excluded from
              this comparison. RBI also says the list is non-exhaustive, so an absent name is not treated as authorised.
            </p>
            <a
              href={INDIA_EVIDENCE[0].rbiAlert.sourceUrl}
              target="_blank"
              rel="nofollow noopener"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: '#fca5a5',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginTop: '0.8rem',
              }}
            >
              Open the RBI Alert List <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="payout-checklist-heading">
        <div className="home-shell" style={{ maxWidth: 920 }}>
          <div className="section-head">
            <div>
              <h2 id="payout-checklist-heading" className="section-title">Before choosing a payout route</h2>
              <p className="section-sub-text">Four checks that matter more than the provider logo.</p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.9rem',
          }}>
            {[
              ['1. Confirm profile availability', 'Ask which rail appears after KYC for an Indian resident. A general help-centre list can include methods unavailable to your profile.'],
              ['2. Get every fee in writing', 'Check the firm, provider, correspondent-bank and INR conversion charges before choosing the route.'],
              ['3. Match every identity', 'Use the same legal name across the firm, KYC provider, payment account and receiving bank or wallet.'],
              ['4. Preserve the document trail', 'Keep the contract, payout approval, provider statement, transaction ID, FX rate and bank credit advice for your adviser.'],
            ].map(([title, body]) => (
              <article key={title} className="post-sidebar-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.98rem', margin: '0 0 0.55rem' }}>{title}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.65, margin: 0 }}>{body}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/blog/prop-firm-payout-tax-india" className="btn-outline">
              Download the 24-column India payout ledger <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-payout-faq-heading">
        <div className="home-shell" style={{ maxWidth: 900 }}>
          <div className="section-head">
            <div>
              <h2 id="india-payout-faq-heading" className="section-title">India payout FAQ</h2>
              <p className="section-sub-text">Short answers tied to the same evidence model as the comparison.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {faqs.map(item => (
              <article key={item.q} className="post-sidebar-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ color: '#fff', fontSize: '0.98rem', margin: '0 0 0.5rem' }}>{item.q}</h3>
                <p style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 620 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.45rem, 3vw, 2rem)' }}>
              Match the payout route to the trading rules
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.92rem' }}>
              Use the India matcher to filter the same screened firms by strategy, programme, drawdown and payout rail.
            </p>
            <div className="cta-final-row">
              <Link href="/best-prop-firms-in-india#india-matcher-heading" className="btn-primary btn-glow">
                Open the India matcher <ArrowRight size={15} />
              </Link>
              <Link href="/best-prop-firms-in-india/challenge-comparison" className="btn-outline">
                Compare product rules
              </Link>
              <Link href="/blog/are-prop-firms-legal-in-india" className="btn-outline">
                Review legal questions
              </Link>
              <Link href="/blog/prop-firm-payout-tax-india" className="btn-outline">
                Prepare payout records
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
