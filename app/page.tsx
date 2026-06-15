import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getAllPosts, getAllCategories } from '@/lib/mdx'
import { getAllFirms, getAllChallenges, computeTrueCost } from '@/lib/firms'
import { organizationSchema, websiteSchema, jsonLd } from '@/lib/schema'
import BlogCard from '@/components/BlogCard'
import NewsletterForm from '@/components/NewsletterForm'
import Hero3D from '@/components/Hero3D'
import AnimatedNumber from '@/components/AnimatedNumber'
import TiltCard from '@/components/TiltCard'
import FeaturedFirmSpotlight from '@/components/FeaturedFirmSpotlight'
import {
  ArrowRight, ArrowUpRight, TrendingUp, Star, DollarSign, Zap, Percent,
  ShieldCheck, Sparkles, Crown, Flame, Clock, Calculator, Newspaper, Bot, CalendarDays,
  Handshake, Tag, ExternalLink,
} from 'lucide-react'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const fmtMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`

export const metadata: Metadata = {
  title: 'Best Prop Firm Reviews & Comparisons',
  description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. 14 firms reviewed against the same rubric — no marketing fluff.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. Same rubric, every firm.',
    url: '/',
    type: 'website',
  },
}

export default function Home() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const posts = getAllPosts().slice(0, 6)
  const categories = getAllCategories()

  // ── Superlatives across the dataset ────────────────────────────
  const ranked = [...firms].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const topFirm = ranked[0]
  const top5 = ranked.slice(0, 5)

  // ── Trader-vetted partners (firms we have affiliate deals with) ──
  // Surface these prominently above the score leaderboard. Order is
  // (a) deals with discount codes first (extra value to the user),
  //     then (b) by our editorial score. The score leaderboard below
  //     stays purely score-sorted — rankings are not for sale.
  const partnerFirms = firms
    .filter(f => f.affiliateUrl)
    .sort((a, b) => {
      const aDisc = a.discountPct ? 1 : 0
      const bDisc = b.discountPct ? 1 : 0
      if (aDisc !== bDisc) return bDisc - aDisc
      return (b.score ?? 0) - (a.score ?? 0)
    })

  // ── Headline affiliate spotlight ───────────────────────────────
  // Bright Funded is our featured "start here" partner. Promoted via
  // prominence (featured slot + discount), NOT by rigging its score — the
  // leaderboard below stays purely score-sorted. Pitch/bullets are sourced
  // facts only; we deliberately avoid the split number while firms.json (80%)
  // and the challenge file (100%) disagree — reconcile before quoting it.
  const featuredFirm = firms.find(f => f.name === 'Bright Funded')

  const cheapestChallenge = challenges
    .flatMap(c => c.accountSizes
      .filter(t => t.priceUsd != null && t.priceUsd > 0)
      .map(t => ({ ...t, challenge: c })))
    .sort((a, b) => a.priceUsd - b.priceUsd)[0]
  const cheapestFirm = cheapestChallenge
    ? firms.find(f => firmSlug(f.name) === cheapestChallenge.challenge.firmSlug)
    : undefined

  const bestSplit = [...firms]
    .filter(f => f.profitSplitPct != null)
    .sort((a, b) => (b.profitSplitPct ?? 0) - (a.profitSplitPct ?? 0))[0]

  const onDemandFirms = firms.filter(f => f.payoutFrequency === 'on-demand')
  const fastestPayout = onDemandFirms
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

  // ── True-cost demo using the cheapest entry ────────────────────
  const demoChallenge = cheapestChallenge
  const demoCost = demoChallenge
    ? computeTrueCost({
        priceUsd: demoChallenge.priceUsd!,
        sizeUsd: demoChallenge.sizeUsd,
        profitSplitPct: demoChallenge.challenge.profitSplitPct,
        dailyLossPct: demoChallenge.challenge.dailyLossPct,
        maxLossPct: demoChallenge.challenge.maxLossPct,
      })
    : null

  const lastUpdated = firms
    .map(f => f.lastUpdated)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)

  const totalChallenges = challenges.length

  // ── Picker presets (link straight into the main filter page) ───
  const assetPresets = [
    { label: 'Forex', href: '/main-table?asset=Forex' },
    { label: 'Crypto', href: '/main-table?asset=Crypto' },
    { label: 'Futures', href: '/main-table?asset=Futures' },
    { label: 'Indices', href: '/main-table?asset=Indices' },
  ]
  const sizePresets = [
    { label: '$10K', href: '/main-table?size=10000' },
    { label: '$50K', href: '/main-table?size=50000' },
    { label: '$100K', href: '/main-table?size=100000' },
    { label: '$200K+', href: '/main-table?size=200000' },
  ]
  const stylePresets = [
    { label: 'News trader', href: '/main-table?news=allowed' },
    { label: 'EA / algo', href: '/main-table?ea=allowed' },
    { label: 'Overnight hold', href: '/main-table?overnight=allowed' },
    { label: 'Weekend hold', href: '/main-table?weekend=allowed' },
  ]

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }} />

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="hero-aurora">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-orb aurora-orb--3" aria-hidden />
        <div className="aurora-grid" aria-hidden />
        <div className="aurora-noise" aria-hidden />

        <div className="hero-shell hero-shell--split">
          <div className="hero-copy">
            <Link href="/main-table" className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Live · <AnimatedNumber value={firms.length} duration={1100} /> firms ·{' '}
              <AnimatedNumber value={totalChallenges} duration={1400} /> challenges priced
              <ArrowRight size={12} />
            </Link>

            <h1 className="hero-title">
              Trade <span className="gradient-text gradient-text--animated">other people&apos;s money</span>
              <br />— find the firm that won&apos;t trap you.
            </h1>

            <p className="hero-sub">
              Every prop firm reviewed against the same rubric. Real prices, real
              drawdown rules, real payout proofs — no marketing fluff, no buried
              fine print.
            </p>

            <div className="hero-cta-row">
              <Link href="/main-table" className="btn-primary hero-cta-primary btn-glow">
                Compare all {firms.length} firms <ArrowRight size={16} />
              </Link>
              <Link href="/blog" className="btn-outline">
                Read the reviews
              </Link>
            </div>

            <div className="hero-newsletter">
              <span className="hero-newsletter-label">Weekly rule-change digest</span>
              <NewsletterForm />
            </div>
          </div>

          <div className="hero-3d-wrap">
            <Hero3D firms={top5.map(f => ({
              name: f.name,
              logo: f.logo,
              score: f.score,
              profitSplitPct: f.profitSplitPct,
              payoutFrequency: f.payoutFrequency,
              reviewUrl: f.reviewUrl,
            }))} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ BENTO KPI ═══════════════════════════════ */}
      <section className="home-section">
        <div className="home-shell">
          <div className="section-head">
            <h2 className="section-title">The shortlist, by the numbers</h2>
            <span className="section-sub">
              {lastUpdated && (
                <>
                  <Clock size={13} /> Updated{' '}
                  {new Date(lastUpdated).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </>
              )}
            </span>
          </div>

          <div className="bento-grid">
            {/* HERO TILE: Top rated */}
            {topFirm && (
              <TiltCard className="bento-tile bento-tile--hero" max={5}>
                <Link href={topFirm.reviewUrl} className="bento-tile-link bento-tile-link--col">
                  <div>
                    <span className="bento-tile-eyebrow">
                      <Crown size={12} /> Editor&apos;s pick · highest score
                    </span>
                    <div className="hero-tile-firm">
                      <div className="hero-tile-logo">
                        {topFirm.logo ? (
                          <Image src={topFirm.logo} alt="" width={56} height={56} style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                        ) : (
                          <span className="logo-fallback">{topFirm.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="hero-tile-name">{topFirm.name}</div>
                        <div className="hero-tile-meta">Founded {topFirm.founded} · max {topFirm.maxAllocation}</div>
                      </div>
                    </div>
                    <p className="bento-tile-body" style={{ marginTop: '1rem' }}>
                      Highest overall score across our rubric — conditions,
                      support, payouts and platform combined.
                    </p>
                  </div>

                  <div className="hero-tile-foot">
                    <div className="hero-tile-score">
                      <Star size={14} fill="currentColor" />
                      <AnimatedNumber value={topFirm.score} decimals={1} duration={1600} />
                      <span className="hero-tile-score-of">/ 10</span>
                    </div>
                    <span className="hero-tile-link">
                      Read review <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              </TiltCard>
            )}

            {/* Cheapest entry */}
            {cheapestChallenge && cheapestFirm && (
              <TiltCard className="bento-tile bento-tile--kpi" max={6}>
                <Link href={cheapestFirm.reviewUrl} className="bento-tile-link">
                  <span className="bento-tile-eyebrow">
                    <DollarSign size={12} /> Cheapest entry
                  </span>
                  <div className="kpi-number">
                    <AnimatedNumber value={cheapestChallenge.priceUsd!} prefix="$" decimals={0} />
                  </div>
                  <p className="bento-tile-body">
                    {cheapestFirm.name} · {fmtMoney(cheapestChallenge.sizeUsd)} {cheapestChallenge.challenge.productName}
                  </p>
                  <span className="bento-pick-meta" style={{ marginTop: 'auto', color: 'var(--accent-light)' }}>
                    See challenge <ArrowUpRight size={12} />
                  </span>
                </Link>
              </TiltCard>
            )}

            {/* Best split */}
            {bestSplit && (
              <TiltCard className="bento-tile bento-tile--kpi" max={6}>
                <Link href={bestSplit.reviewUrl} className="bento-tile-link">
                  <span className="bento-tile-eyebrow">
                    <Percent size={12} /> Best profit split
                  </span>
                  <div className="kpi-number">
                    <AnimatedNumber value={bestSplit.profitSplitPct!} suffix="%" />
                  </div>
                  <p className="bento-tile-body">
                    {bestSplit.name} keeps the most in your pocket — verified on the
                    current funded-account spec.
                  </p>
                  <span className="bento-pick-meta" style={{ marginTop: 'auto', color: 'var(--accent-light)' }}>
                    Review {bestSplit.name} <ArrowUpRight size={12} />
                  </span>
                </Link>
              </TiltCard>
            )}

            {/* Fastest payout */}
            {fastestPayout && (
              <TiltCard className="bento-tile bento-tile--kpi" max={6}>
                <Link href={fastestPayout.reviewUrl} className="bento-tile-link">
                  <span className="bento-tile-eyebrow">
                    <Zap size={12} /> Fastest payouts
                  </span>
                  <div className="kpi-number kpi-number--text">On-demand</div>
                  <p className="bento-tile-body">
                    {fastestPayout.name} pays whenever you ask — no fixed cycle to wait for.
                  </p>
                  <span className="bento-pick-meta" style={{ marginTop: 'auto', color: 'var(--accent-light)' }}>
                    How it works <ArrowUpRight size={12} />
                  </span>
                </Link>
              </TiltCard>
            )}

            {/* Verified count tile */}
            <div className="bento-tile bento-tile--wide bento-tile--stat">
              <div className="stat-row">
                <div className="stat-cell">
                  <div className="stat-cell-value"><AnimatedNumber value={firms.length} /></div>
                  <div className="stat-cell-label">Firms reviewed</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value"><AnimatedNumber value={totalChallenges} /></div>
                  <div className="stat-cell-label">Challenges priced</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value"><AnimatedNumber value={onDemandFirms.length} /></div>
                  <div className="stat-cell-label">On-demand payouts</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value">
                    <ShieldCheck size={20} style={{ color: 'var(--accent-light)' }} />
                  </div>
                  <div className="stat-cell-label">Independent · ad-free reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ HEADLINE AFFILIATE SPOTLIGHT ═══════════════════════════════ */}
      {featuredFirm && (
        <FeaturedFirmSpotlight
          firm={featuredFirm}
          eyebrow="Start here · best for beginners"
          pitch="New to funded trading? Bright Funded is the lowest-risk way to test the model — small entry sizes, forgiving static drawdown, and a standing 10% discount that cuts the cost of a first attempt."
          bullets={[
            'Entry account sizes from $5,000 — start small while you prove a strategy',
            'Static drawdown (5% daily / 10% max) — the forgiving variant, not trailing',
            'MT5 and browser-based TradeLocker — no desktop install required',
            'Standing 10% discount with our code, applied at checkout',
          ]}
          fromParam="home-spotlight"
        />
      )}

      {/* ═══════════════════════════════ TRADER-VETTED PARTNERS ═══════════════════════════════ */}
      {partnerFirms.length > 0 && (
        <section className="home-section">
          <div className="home-shell">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  <Handshake size={20} style={{ color: 'var(--accent-light)' }} />
                  Trader-vetted partners
                </h2>
                <p className="section-sub-text">
                  We&apos;ve trialled, payout-verified, and partner with{' '}
                  <AnimatedNumber value={partnerFirms.length} duration={800} />
                  {' '}firms below. Direct sign-up links — and where we&apos;ve negotiated a discount, the code is right on the card.
                </p>
              </div>
              <Link href="/methodology" className="section-link">
                How we vet <ArrowRight size={14} />
              </Link>
            </div>

            <div className="partner-rail">
              {partnerFirms.map(f => {
                const slug = firmSlug(f.name)
                return (
                  <TiltCard key={f.name} className="partner-card" max={6}>
                    <div className="partner-card-inner">
                      <div className="partner-card-glow" aria-hidden />

                      <div className="partner-card-head">
                        <div className="partner-card-logo">
                          {f.logo ? (
                            <Image src={f.logo} alt="" width={48} height={48} style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                          ) : (
                            <span className="logo-fallback">{f.name.charAt(0)}</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="partner-card-name">{f.name}</div>
                          <div className="partner-card-score">
                            <Star size={11} fill="currentColor" /> {f.score.toFixed(1)} · {f.profitSplitPct ?? '—'}% split
                          </div>
                        </div>
                      </div>

                      {f.discountCode && f.discountPct ? (
                        <div className="partner-discount">
                          <Tag size={12} />
                          <div>
                            <div className="partner-discount-amount">
                              {f.discountPct}% off
                            </div>
                            <div className="partner-discount-code">
                              code <code>{f.discountCode}</code>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="partner-discount partner-discount--empty">
                          <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                            Verified payouts · partner pricing
                          </span>
                        </div>
                      )}

                      <div className="partner-card-actions">
                        <Link
                          href={`/go/${slug}?from=home-partners`}
                          rel="sponsored nofollow noopener"
                          target="_blank"
                          className="btn-primary btn-glow partner-card-cta"
                        >
                          Get started <ExternalLink size={13} />
                        </Link>
                        <Link href={f.reviewUrl} className="partner-card-review">
                          Read review →
                        </Link>
                      </div>
                    </div>
                  </TiltCard>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ LEADERBOARD ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Flame size={20} style={{ color: 'var(--accent-light)' }} />
                The top 5 — ranked, no fluff
              </h2>
              <p className="section-sub-text">
                Scored on conditions, support, payouts and platform. Same rubric for every firm.
              </p>
            </div>
            <Link href="/main-table" className="section-link">
              See full table <ArrowRight size={14} />
            </Link>
          </div>

          <ol className="leaderboard">
            {top5.map((f, i) => {
              const isPartner = Boolean(f.affiliateUrl)
              return (
              <li key={f.name} className={`leader-row${isPartner ? ' leader-row--partner' : ''}`}>
                <span className="leader-rank">{String(i + 1).padStart(2, '0')}</span>
                <div className="leader-logo">
                  {f.logo ? (
                    <Image src={f.logo} alt="" width={48} height={48} style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (
                    <span className="logo-fallback">{f.name.charAt(0)}</span>
                  )}
                </div>
                <div className="leader-body">
                  <div className="leader-name">
                    {f.name}
                    {isPartner && (
                      <span className="partner-pill" title="We have an affiliate partnership with this firm.">
                        <Handshake size={10} /> Partner
                      </span>
                    )}
                    {f.discountCode && f.discountPct && (
                      <span className="discount-pill" title={`Use code ${f.discountCode} for ${f.discountPct}% off.`}>
                        <Tag size={10} /> {f.discountPct}% off
                      </span>
                    )}
                  </div>
                  <div className="leader-meta">
                    <span>{f.assets?.slice(0, 3).join(' · ')}</span>
                    <span className="leader-meta-dot">•</span>
                    <span>Max {f.maxAllocation}</span>
                  </div>
                </div>
                <div className="leader-stats">
                  <div className="leader-stat">
                    <div className="leader-stat-label">Score</div>
                    <div className="leader-stat-value leader-stat-value--score">
                      <Star size={12} fill="currentColor" /> {f.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="leader-stat">
                    <div className="leader-stat-label">Split</div>
                    <div className="leader-stat-value">{f.profitSplitPct ?? '—'}%</div>
                  </div>
                  <div className="leader-stat leader-stat--hide-sm">
                    <div className="leader-stat-label">Payouts</div>
                    <div className="leader-stat-value leader-stat-value--small">
                      {f.payoutFrequency ?? '—'}
                    </div>
                  </div>
                </div>
                <div className="leader-actions">
                  {isPartner ? (
                    <Link
                      href={`/go/${firmSlug(f.name)}?from=home-leaderboard`}
                      rel="sponsored nofollow noopener"
                      target="_blank"
                      className="btn-primary btn-glow leader-cta"
                    >
                      Get funded <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <Link href={f.reviewUrl} className="btn-outline leader-cta">
                      Review <ArrowRight size={14} />
                    </Link>
                  )}
                  <Link href={f.reviewUrl} className="leader-secondary">
                    Deep dive →
                  </Link>
                </div>
              </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ═══════════════════════════════ PICKER ═══════════════════════════════ */}
      <section className="home-section">
        <div className="home-shell">
          <div className="picker-card">
            <div className="picker-header">
              <span className="bento-tile-eyebrow">
                <Sparkles size={12} /> Find your firm
              </span>
              <h2 className="picker-title">Pick your <span className="gradient-text">style</span>, see your matches.</h2>
              <p className="picker-sub">
                Three taps narrows the list to firms that actually fit how you trade.
              </p>
            </div>

            <div className="picker-row">
              <div className="picker-row-label">I trade</div>
              <div className="picker-pills">
                {assetPresets.map(p => (
                  <Link key={p.label} href={p.href} className="picker-pill">{p.label}</Link>
                ))}
              </div>
            </div>

            <div className="picker-row">
              <div className="picker-row-label">Account size</div>
              <div className="picker-pills">
                {sizePresets.map(p => (
                  <Link key={p.label} href={p.href} className="picker-pill">{p.label}</Link>
                ))}
              </div>
            </div>

            <div className="picker-row">
              <div className="picker-row-label">Style</div>
              <div className="picker-pills">
                {stylePresets.map(p => (
                  <Link key={p.label} href={p.href} className="picker-pill">{p.label}</Link>
                ))}
              </div>
            </div>

            <div className="picker-foot">
              <Link href="/main-table" className="btn-primary">
                Browse all firms <ArrowRight size={16} />
              </Link>
              <span className="picker-foot-note">
                Or compare any two side-by-side from <Link href="/compare" className="picker-foot-link">/compare</Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ TRUE-COST DEMO ═══════════════════════════════ */}
      {demoChallenge && demoCost && cheapestFirm && (
        <section className="home-section home-section--alt">
          <div className="home-shell">
            <div className="truecost-card">
              <div className="truecost-copy">
                <span className="bento-tile-eyebrow">
                  <Calculator size={12} /> The True-Cost calculator
                </span>
                <h2 className="truecost-title">
                  A $59 challenge doesn&apos;t mean it costs <span className="gradient-text">$59.</span>
                </h2>
                <p className="truecost-text">
                  We compute the real economics for every challenge: what you have
                  to <em>actually</em> earn before the fee pays itself back, and
                  how that compares against the firm&apos;s max drawdown. Lower
                  R-multiple = better odds.
                </p>
                <Link href={cheapestFirm.reviewUrl} className="btn-outline">
                  See full breakdown for {cheapestFirm.name} <ArrowRight size={16} />
                </Link>
              </div>

              <div className="truecost-stats">
                <div className="truecost-stat">
                  <div className="truecost-stat-label">Listed fee</div>
                  <div className="truecost-stat-value">
                    <AnimatedNumber value={demoChallenge.priceUsd!} prefix="$" />
                  </div>
                </div>
                <div className="truecost-stat truecost-stat--accent">
                  <div className="truecost-stat-label">Break-even profit</div>
                  <div className="truecost-stat-value">
                    <AnimatedNumber value={demoCost.breakEvenProfit} prefix="$" />
                  </div>
                  <div className="truecost-stat-hint">at {demoChallenge.challenge.profitSplitPct}% split</div>
                </div>
                {demoCost.rMultiple != null && (
                  <div className="truecost-stat">
                    <div className="truecost-stat-label">R-multiple</div>
                    <div className="truecost-stat-value">
                      <AnimatedNumber value={demoCost.rMultiple} suffix="×" decimals={2} />
                    </div>
                    <div className="truecost-stat-hint">
                      {demoCost.rMultiple < 0.5 ? 'Favourable' : demoCost.rMultiple < 1 ? 'Workable' : 'Math against you'}
                    </div>
                  </div>
                )}
                {demoCost.dayCount != null && (
                  <div className="truecost-stat">
                    <div className="truecost-stat-label">Days to break even</div>
                    <div className="truecost-stat-value">
                      ~<AnimatedNumber value={demoCost.dayCount} />
                    </div>
                    <div className="truecost-stat-hint">at +1% / day</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ CATEGORIES + LATEST ═══════════════════════════════ */}
      <section className="home-section">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Newspaper size={20} style={{ color: 'var(--accent-light)' }} />
                Fresh from the desk
              </h2>
              <p className="section-sub-text">
                Reviews, rule-change alerts, and trading-style breakdowns.
              </p>
            </div>
            <Link href="/blog" className="section-link">
              All articles <ArrowRight size={14} />
            </Link>
          </div>

          {categories.length > 0 && (
            <div className="cat-rail">
              {categories.slice(0, 10).map(c => (
                <Link
                  key={c}
                  href={`/category/${c.toLowerCase().replace(/\s+/g, '-')}`}
                  className="cat-pill"
                >
                  {c}
                </Link>
              ))}
            </div>
          )}

          <div className="post-grid">
            {posts.map(post => <BlogCard key={post.slug} post={post} />)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ LOGO MARQUEE ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="marquee-head">
            <Bot size={14} style={{ color: 'var(--muted)' }} />
            <span className="marquee-head-text">Tracked firms · updated continuously</span>
          </div>
          <div className="marquee" aria-hidden>
            <div className="marquee-track">
              {[...firms, ...firms].map((f, i) => (
                <div key={`${f.name}-${i}`} className="marquee-item" title={f.name}>
                  {f.logo ? (
                    <Image src={f.logo} alt="" width={36} height={36} style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                  ) : (
                    <span className="marquee-item-mark">{f.name.charAt(0)}</span>
                  )}
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA FINALE ═══════════════════════════════ */}
      <section className="home-section home-section--cta">
        <div className="home-shell">
          <div className="cta-final">
            <span className="bento-tile-eyebrow">
              <TrendingUp size={12} /> Stop guessing
            </span>
            <h2 className="cta-final-title">
              Your prop firm shouldn&apos;t be a <span className="gradient-text">surprise.</span>
            </h2>
            <p className="cta-final-sub">
              Compare every major firm in one table. Filter by rule, payout
              speed, instrument, and account size — see the answers before you
              swipe the card.
            </p>
            <div className="cta-final-row">
              <Link href="/main-table" className="btn-primary cta-final-primary">
                Open the comparison table <ArrowRight size={18} />
              </Link>
              <Link href="/compare" className="btn-outline">
                Compare two firms head-to-head
              </Link>
            </div>
            <p className="cta-final-foot">
              <CalendarDays size={12} /> {lastUpdated && `Data last verified ${lastUpdated}`}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
