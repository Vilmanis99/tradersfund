import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getAllPosts, getAllCategories } from '@/lib/mdx'
import {
  getAllFirms,
  getAllChallenges,
  computeTrueCost,
  isChallengeFresh,
  minimumCostToFundedUsd,
} from '@/lib/firms'
import { organizationSchema, websiteSchema, jsonLd } from '@/lib/schema'
import BlogCard from '@/components/BlogCard'
import NewsletterForm from '@/components/NewsletterForm'
import Hero3D from '@/components/Hero3D'
import AnimatedNumber from '@/components/AnimatedNumber'
import TiltCard from '@/components/TiltCard'
import FeaturedFirmSpotlight from '@/components/FeaturedFirmSpotlight'
import { isNewsletterConfigured } from '@/lib/brevo'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import {
  ArrowRight, ArrowUpRight, TrendingUp, Star, DollarSign, Zap, Percent,
  ShieldCheck, Sparkles, Crown, Flame, Clock, Calculator, Newspaper, Bot, CalendarDays,
  Handshake, Tag, ExternalLink, Scale, FileCheck2, BellRing, MapPin,
} from 'lucide-react'

const firmSlug = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const fmtMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`

export const metadata: Metadata = {
  title: 'Best Prop Firm Reviews & Comparisons',
  description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. Every firm reviewed against the same rubric.',
  alternates: { canonical: '/', languages: getLanguageAlternates('/') },
  openGraph: {
    title: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    description: 'Independent prop-firm reviews, side-by-side comparisons, and rule-change alerts. Same rubric, every firm.',
    url: '/',
    type: 'website',
  },
}

export default function Home() {
  const newsletterEnabled = isNewsletterConfigured()
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const changeWatchCount = getChallengeWatchEntries().length
  const posts = getAllPosts().slice(0, 6)
  const categories = getAllCategories()
  const challengesByFirm = new Map(
    firms.map(firm => {
      const slug = firmSlug(firm.name)
      return [slug, challenges.filter(challenge => challenge.firmSlug === slug)]
    }),
  )
  const freshChallenges = challenges.filter(challenge => isChallengeFresh(challenge))
  const freshFirmSlugs = new Set(
    [...challengesByFirm.entries()]
      .filter(([, firmChallenges]) =>
        firmChallenges.length > 0 && firmChallenges.every(challenge => isChallengeFresh(challenge)))
      .map(([slug]) => slug),
  )
  const freshFirmCount = freshFirmSlugs.size
  const pricedChallengeCount = freshChallenges.filter(challenge =>
    challenge.accountSizes.some(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0) ||
      (tier.priceEur != null && tier.priceEur > 0)),
  ).length

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
    .filter(f => f.affiliateUrl && freshFirmSlugs.has(firmSlug(f.name)))
    .sort((a, b) => {
      const aDisc = a.discountPct ? 1 : 0
      const bDisc = b.discountPct ? 1 : 0
      if (aDisc !== bDisc) return bDisc - aDisc
      return (b.score ?? 0) - (a.score ?? 0)
    })

  // ── Headline affiliate spotlight ───────────────────────────────
  // FundedNext is the featured commercial partner. Its premium placement is
  // separate from the score-sorted leaderboard, and the visible product facts
  // are derived from the same freshness-gated challenge records used below.
  const featuredFirmSlug = 'fundednext'
  const featuredFirm = firms.find(f =>
    firmSlug(f.name) === featuredFirmSlug && freshFirmSlugs.has(featuredFirmSlug))
  const featuredChallenges = freshChallenges.filter(
    challenge => challenge.firmSlug === featuredFirmSlug,
  )
  const featuredPricedTiers = featuredChallenges.flatMap(challenge =>
    challenge.accountSizes.flatMap(tier => tier.priceUsd == null ? [] : [{
      challenge,
      tier,
      priceUsd: tier.priceUsd,
    }]),
  )
  const featuredEntryTier = [...featuredPricedTiers]
    .sort((a, b) => a.priceUsd - b.priceUsd)[0]
  const featuredEvaluationCount = featuredChallenges.filter(
    challenge => challenge.phases > 0,
  ).length
  const featuredStaticEvaluationCount = featuredChallenges.filter(
    challenge => challenge.phases > 0 && challenge.drawdownType === 'static',
  ).length
  const featuredInstantChallenge = featuredChallenges.find(
    challenge => challenge.phases === 0,
  )
  const featuredPitch = featuredInstantChallenge
    ? `FundedNext currently publishes ${featuredEvaluationCount} evaluation paths plus ${featuredInstantChallenge.productName}. Compare phase count, loss limits, payout timing, and final checkout cost before choosing.`
    : `FundedNext currently publishes ${featuredEvaluationCount} source-checked evaluation paths. Compare phase count, loss limits, payout timing, and final checkout cost before choosing.`
  const featuredBullets = [
    `${featuredChallenges.length} source-checked products and ${featuredPricedTiers.length} priced account tiers`,
    ...(featuredEntryTier ? [
      `Published entry price from $${featuredEntryTier.priceUsd.toFixed(2)} for the ${fmtMoney(featuredEntryTier.tier.sizeUsd)} ${featuredEntryTier.challenge.productName}`,
    ] : []),
    ...(featuredInstantChallenge?.maxLossPct != null ? [
      `${featuredStaticEvaluationCount} static-drawdown evaluations; ${featuredInstantChallenge.maxLossPct}% trailing maximum loss on ${featuredInstantChallenge.productName}`,
    ] : []),
    ...(featuredFirm ? [
      `${featuredFirm.platforms.join(', ')} listed in the current firm profile`,
    ] : []),
  ]

  const pricedTiers = freshChallenges
    .flatMap(c => c.accountSizes
      .map(t => ({
        ...t,
        challenge: c,
        minimumCostUsd: minimumCostToFundedUsd(c, t),
      })))
    .filter((entry): entry is typeof entry & { minimumCostUsd: number } =>
      entry.minimumCostUsd != null)
  const cheapestChallenge = [...pricedTiers]
    .sort((a, b) => a.minimumCostUsd - b.minimumCostUsd)[0]
  const cheapestFirm = cheapestChallenge
    ? firms.find(f => firmSlug(f.name) === cheapestChallenge.challenge.firmSlug)
    : undefined

  const bestSplitChallenge = freshChallenges
    .filter(challenge => challenge.profitSplitPct != null)
    .sort((a, b) => (b.profitSplitPct ?? 0) - (a.profitSplitPct ?? 0))[0]
  const bestSplitFirm = bestSplitChallenge
    ? firms.find(f => firmSlug(f.name) === bestSplitChallenge.firmSlug)
    : undefined

  const onDemandFirmSlugs = new Set(
    freshChallenges
      .filter(challenge => challenge.payoutFrequency === 'on-demand')
      .map(challenge => challenge.firmSlug),
  )
  const onDemandFirms = firms.filter(f => onDemandFirmSlugs.has(firmSlug(f.name)))
  const fastestPayout = onDemandFirms
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

  // ── True-cost demo using the cheapest entry ────────────────────
  const demoChallenge = pricedTiers
    .filter(entry => entry.challenge.profitSplitPct != null)
    .sort((a, b) => {
      const aHasCostLayer = a.minimumCostUsd > (a.priceUsd ?? 0) ? 1 : 0
      const bHasCostLayer = b.minimumCostUsd > (b.priceUsd ?? 0) ? 1 : 0
      if (aHasCostLayer !== bHasCostLayer) return bHasCostLayer - aHasCostLayer
      return a.minimumCostUsd - b.minimumCostUsd
    })[0]
  const demoFirm = demoChallenge
    ? firms.find(f => firmSlug(f.name) === demoChallenge.challenge.firmSlug)
    : undefined
  const demoCost = demoChallenge
    ? computeTrueCost({
        priceUsd: demoChallenge.minimumCostUsd,
        sizeUsd: demoChallenge.sizeUsd,
        profitSplitPct: demoChallenge.challenge.profitSplitPct!,
        dailyLossPct:
          demoChallenge.dailyLossUsd != null && demoChallenge.sizeUsd > 0
            ? (demoChallenge.dailyLossUsd / demoChallenge.sizeUsd) * 100
            : demoChallenge.challenge.dailyLossPct,
        maxLossPct: demoChallenge.challenge.maxLossPct,
        maxLossUsd: demoChallenge.maxLossUsd,
      })
    : null

  const lastUpdated = challenges
    .map(challenge => challenge.sourceCapturedAt)
    .sort()
    .at(-1)

  // ── Picker presets (link straight into the main filter page) ───
  const assetPresets = [
    { label: 'Forex', href: '/prop-firms?asset=Forex' },
    { label: 'Crypto', href: '/prop-firms?asset=Crypto' },
    { label: 'Futures', href: '/prop-firms?asset=Futures' },
    { label: 'Indices', href: '/prop-firms?asset=Indices' },
  ]
  const sizePresets = [
    { label: '$10K', href: '/prop-firms?size=10000' },
    { label: '$50K', href: '/prop-firms?size=50000' },
    { label: '$100K', href: '/prop-firms?size=100000' },
    { label: '$200K+', href: '/prop-firms?size=200000' },
  ]
  const stylePresets = [
    { label: 'News trader', href: '/prop-firms?news=allowed' },
    { label: 'EA / algo', href: '/prop-firms?ea=allowed' },
    { label: 'Overnight hold', href: '/prop-firms?overnight=allowed' },
    { label: 'Weekend hold', href: '/prop-firms?weekend=allowed' },
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
            <Link href="/prop-firm-challenges" className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Live · <AnimatedNumber value={firms.length} duration={1100} /> firms ·{' '}
              <AnimatedNumber value={freshChallenges.length} duration={1400} /> fresh products
              <ArrowRight size={12} />
            </Link>

            <h1 className="hero-title">
              Choose a prop firm by the <span className="gradient-text gradient-text--animated">rules</span>
              <br />— not the account-size headline.
            </h1>

            <p className="hero-sub">
              Most challenge and funded stages are simulated. Compare source-dated
              prices, drawdown, payout eligibility, and trading restrictions at product
              level — plus a stricter evidence screen for India.
            </p>

            <div className="hero-cta-row">
              <Link href="/prop-firm-challenges" className="btn-primary hero-cta-primary btn-glow">
                Compare {freshChallenges.length} challenge products <ArrowRight size={16} />
              </Link>
              <Link href="/best-prop-firms-in-india" className="btn-outline">
                Open the India decision hub
              </Link>
            </div>

            {newsletterEnabled && (
              <div className="hero-newsletter">
                <span className="hero-newsletter-label">Weekly rule-change digest</span>
                <NewsletterForm placement="home-hero" />
              </div>
            )}
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

      <section className="decision-strip" aria-label="Evidence-first prop-firm decision tools">
        <div className="home-shell">
          <div className="decision-strip-grid">
            <Link href="/prop-firm-challenges" className="decision-strip-card">
              <span className="decision-strip-icon"><Scale size={17} aria-hidden="true" /></span>
              <span className="decision-strip-copy">
                <strong>{freshChallenges.length} product-level rows</strong>
                <span>Filter, shortlist, and share 2–4 exact products</span>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/methodology" className="decision-strip-card">
              <span className="decision-strip-icon"><FileCheck2 size={17} aria-hidden="true" /></span>
              <span className="decision-strip-copy">
                <strong>First-party sources expire</strong>
                <span>Every product leaves the table after 30 days</span>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/prop-firm-challenge-changes" className="decision-strip-card">
              <span className="decision-strip-icon"><BellRing size={17} aria-hidden="true" /></span>
              <span className="decision-strip-copy">
                <strong>{changeWatchCount} dated change notes</strong>
                <span>Verified changes and unresolved source conflicts</span>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/best-prop-firms-in-india/challenge-comparison" className="decision-strip-card">
              <span className="decision-strip-icon"><MapPin size={17} aria-hidden="true" /></span>
              <span className="decision-strip-copy">
                <strong>India challenge comparison</strong>
                <span>RBI screen, product rules, KYC, and payout evidence</span>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
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
                  })} · {freshFirmCount}/{firms.length} firm datasets fresh
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
                    <DollarSign size={12} /> Lowest minimum cost
                  </span>
                  <div className="kpi-number">
                    <AnimatedNumber value={cheapestChallenge.minimumCostUsd} prefix="$" decimals={0} />
                  </div>
                  <p className="bento-tile-body">
                    {cheapestFirm.name} · {fmtMoney(cheapestChallenge.sizeUsd)} {cheapestChallenge.challenge.productName} · minimum to funded
                  </p>
                  <span className="bento-pick-meta" style={{ marginTop: 'auto', color: 'var(--accent-light)' }}>
                    See challenge <ArrowUpRight size={12} />
                  </span>
                </Link>
              </TiltCard>
            )}

            {/* Best split */}
            {bestSplitChallenge && bestSplitFirm && (
              <TiltCard className="bento-tile bento-tile--kpi" max={6}>
                <Link href={bestSplitFirm.reviewUrl} className="bento-tile-link">
                  <span className="bento-tile-eyebrow">
                    <Percent size={12} /> Highest published split
                  </span>
                  <div className="kpi-number">
                    <AnimatedNumber value={bestSplitChallenge.profitSplitPct!} suffix="%" />
                  </div>
                  <p className="bento-tile-body">
                    {bestSplitFirm.name} publishes the highest current funded-stage split.
                    Eligibility and scaling rules still apply.
                  </p>
                  <span className="bento-pick-meta" style={{ marginTop: 'auto', color: 'var(--accent-light)' }}>
                    Review {bestSplitFirm.name} <ArrowUpRight size={12} />
                  </span>
                </Link>
              </TiltCard>
            )}

            {/* Fastest payout */}
            {fastestPayout && (
              <TiltCard className="bento-tile bento-tile--kpi" max={6}>
                <Link href={fastestPayout.reviewUrl} className="bento-tile-link">
                  <span className="bento-tile-eyebrow">
                    <Zap size={12} /> On-demand payout schedule
                  </span>
                  <div className="kpi-number kpi-number--text">On-demand</div>
                  <p className="bento-tile-body">
                    {fastestPayout.name} publishes on-demand requests. Profit, KYC, and
                    eligibility rules still apply.
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
                  <div className="stat-cell-value"><AnimatedNumber value={pricedChallengeCount} /></div>
                  <div className="stat-cell-label">Fresh priced products</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value"><AnimatedNumber value={onDemandFirms.length} /></div>
                  <div className="stat-cell-label">On-demand payouts</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-cell-value">
                    <ShieldCheck size={20} style={{ color: 'var(--accent-light)' }} />
                  </div>
                  <div className="stat-cell-label">Source-dated product data</div>
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
          eyebrow={`Commercial partner · ${featuredChallenges.length} plan types`}
          pitch={featuredPitch}
          bullets={featuredBullets}
          fromParam="home-fundednext-spotlight"
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
                  Commercial partners
                </h2>
                <p className="section-sub-text">
                  We have commercial relationships with{' '}
                  <AnimatedNumber value={partnerFirms.length} duration={800} />
                  {' '}firms below. Affiliate relationships never change editorial scores; available discount codes appear on the card.
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
                            Commercial partner · editorial score independent
                          </span>
                        </div>
                      )}

                      <div className="partner-card-actions">
                        <Link
                          href={`/go/${slug}?from=home-partners`}
                          prefetch={false}
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
            <Link href="/prop-firms" className="section-link">
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
                      prefetch={false}
                      rel="sponsored nofollow noopener"
                      target="_blank"
                      className="btn-primary btn-glow leader-cta"
                    >
                      View plans <ArrowUpRight size={14} />
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
              <Link href="/prop-firms" className="btn-primary">
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
      {demoChallenge && demoCost && demoFirm && (
        <section className="home-section home-section--alt">
          <div className="home-shell">
            <div className="truecost-card">
              <div className="truecost-copy">
                <span className="bento-tile-eyebrow">
                  <Calculator size={12} /> Source-dated fee-recovery model
                </span>
                <h2 className="truecost-title">
                  A ${demoChallenge.priceUsd?.toFixed(0)} checkout can mean{' '}
                  <span className="gradient-text">${demoChallenge.minimumCostUsd.toFixed(0)} to reach funded.</span>
                </h2>
                <p className="truecost-text">
                  For priced challenges with a verified base split, this calculates
                  the gross account profit whose trader share equals the minimum
                  captured cost. The loss-room ratio is descriptive; it does not
                  predict refunds, retries, payouts, or the odds of passing.
                </p>
                <Link href="/true-cost-of-prop-firm-challenges" className="btn-outline">
                  Understand the model <ArrowRight size={16} />
                </Link>
              </div>

              <div className="truecost-stats">
                <div className="truecost-stat">
                  <div className="truecost-stat-label">Minimum cost to funded</div>
                  <div className="truecost-stat-value">
                    <AnimatedNumber value={demoChallenge.minimumCostUsd} prefix="$" />
                  </div>
                </div>
                <div className="truecost-stat truecost-stat--accent">
                  <div className="truecost-stat-label">Fee-recovery profit</div>
                  <div className="truecost-stat-value">
                    <AnimatedNumber value={demoCost.breakEvenProfit} prefix="$" />
                  </div>
                  <div className="truecost-stat-hint">at {demoChallenge.challenge.profitSplitPct}% split</div>
                </div>
                {demoCost.rMultiple != null && (
                  <div className="truecost-stat">
                    <div className="truecost-stat-label">Cost / loss-room ratio</div>
                    <div className="truecost-stat-value">
                      <AnimatedNumber value={demoCost.rMultiple} suffix="×" decimals={2} />
                    </div>
                    <div className="truecost-stat-hint">
                      Fee-recovery profit ÷ starting max-loss amount
                    </div>
                  </div>
                )}
                {demoCost.dayCount != null && (
                  <div className="truecost-stat">
                    <div className="truecost-stat-label">Standardized growth days</div>
                    <div className="truecost-stat-value">
                      <AnimatedNumber value={demoCost.dayCount} />
                    </div>
                    <div className="truecost-stat-hint">At assumed 1% compounded growth; not a forecast</div>
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
            <span className="marquee-head-text">Tracked firms · source dates shown</span>
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
              Compare every fresh product in one table. Filter by fee, funded-cost
              floor, drawdown, payout schedule, and trading rule before you pay.
            </p>
            <div className="cta-final-row">
              <Link href="/prop-firm-challenges" className="btn-primary cta-final-primary">
                Compare {freshChallenges.length} products <ArrowRight size={18} />
              </Link>
              <Link href="/compare" className="btn-outline">
                Compare two firms head-to-head
              </Link>
            </div>
            <p className="cta-final-foot">
              <CalendarDays size={12} /> {freshFirmCount}/{firms.length} firm datasets fresh
              {lastUpdated && ` · latest capture ${lastUpdated}`}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
