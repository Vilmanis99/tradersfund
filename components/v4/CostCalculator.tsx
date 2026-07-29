'use client'

/**
 * Interactive challenge-cost calculator for the v4 home page.
 *
 * Renders an Apple-style slider across the chosen challenge's
 * accountSizes[]. Each tier change kicks off a 380ms ease-out
 * interpolation between previous and target values (no jumpy snap).
 * Numbers animate frame-by-frame via requestAnimationFrame.
 *
 * Uses computeTrueCost() from lib/firms — verdict is derived from
 * the resulting R-multiple per the rubric in lib/firms.ts.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Challenge, ChallengeAccountSize } from '@/lib/firms'
import { computeTrueCost, minimumCostToFundedUsd } from '@/lib/firms'
import { TrendingUp, DollarSign, Target, CalendarClock } from 'lucide-react'

type Props = {
  challenge: Challenge
  firmName: string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function useAnimatedNumber(target: number, durationMs = 380) {
  const [value, setValue] = useState(target)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === value) return
    fromRef.current = value
    startRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setValue(target)
      return
    }

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / durationMs)
      const eased = easeOutCubic(t)
      setValue(fromRef.current + (target - fromRef.current) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

const fmtUsd = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`
const fmtBigUsd = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `$${Math.round(n)}`
}

function verdict(r: number | null): { label: string; cls: string } {
  if (r == null) return { label: 'Unknown math', cls: 'v4-verdict-mid' }
  if (r < 0.3) return { label: 'Favourable', cls: 'v4-verdict-good' }
  if (r < 0.8) return { label: 'Workable', cls: 'v4-verdict-mid' }
  return { label: 'Math against you', cls: 'v4-verdict-bad' }
}

export default function CostCalculator({ challenge, firmName }: Props) {
  // Only show tiers that have a known price — interactive math needs $.
  const tiers: ChallengeAccountSize[] = useMemo(
    () => challenge.accountSizes.filter(t => t.priceUsd != null && t.priceUsd > 0),
    [challenge.accountSizes],
  )

  // Slider index — drag through tiers; rAF-interpolated values keep numbers fluid.
  const [idx, setIdx] = useState(0)

  // NOTE: every hook below must run unconditionally. The empty-tier early
  // return lives *after* the hook block — bailing out before it changed the
  // hook count between renders (a challenge whose prices land later would
  // crash with "rendered more hooks than during the previous render").
  const tier: ChallengeAccountSize | undefined = tiers[Math.min(idx, tiers.length - 1)]
  const tierCost = tier ? (minimumCostToFundedUsd(challenge, tier) ?? 0) : 0

  const cost = useMemo(
    () =>
      computeTrueCost({
        priceUsd: tierCost,
        sizeUsd: tier?.sizeUsd ?? 0,
        profitSplitPct: challenge.profitSplitPct ?? 0,
        dailyLossPct:
          tier?.dailyLossUsd != null && tier.sizeUsd > 0
            ? (tier.dailyLossUsd / tier.sizeUsd) * 100
            : challenge.dailyLossPct,
        maxLossPct: challenge.maxLossPct,
        maxLossUsd: tier?.maxLossUsd,
      }),
    [tier, tierCost, challenge.profitSplitPct, challenge.dailyLossPct, challenge.maxLossPct],
  )

  const animFee = useAnimatedNumber(tierCost)
  const animSize = useAnimatedNumber(tier?.sizeUsd ?? 0)
  const animBreakEven = useAnimatedNumber(cost.breakEvenProfit)
  const animR = useAnimatedNumber(cost.rMultiple ?? 0)
  const animDays = useAnimatedNumber(cost.dayCount ?? 0)

  // Fallback: a profit split is required for break-even math.
  if (!tier || challenge.profitSplitPct == null) {
    return (
      <div className="v4-glass v4-glass-strong" style={{ padding: '2rem', color: 'var(--muted)' }}>
        Calculator unavailable — a priced tier and verified profit split are required.
      </div>
    )
  }

  const v = verdict(cost.rMultiple)
  const feeHint = challenge.pricingModel === 'monthly-subscription'
    ? 'First billing cycle + activation floor'
    : challenge.pricingModel === 'split-payment'
      ? 'Includes required after-pass payment'
      : tier?.activationFeeUsd || challenge.activationFeeUsd
        ? 'Includes required activation fee'
        : tier.refundable === true
          ? 'Refundable on first payout'
          : tier.refundable === false
            ? 'Non-refundable'
            : 'Refund status not verified'

  return (
    <div className="v4-glass v4-glass-strong" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="v4-eyebrow" style={{ display: 'block', marginBottom: '0.5rem' }}>Live cost model</span>
          <h3 style={{ margin: 0, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', letterSpacing: '-0.03em', color: '#fff', fontWeight: 800 }}>
            {firmName} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>· {challenge.productName}</span>
          </h3>
        </div>
        <span className={`v4-pill ${v.cls}`} style={{ border: '1px solid currentColor' }}>
          <Target size={14} aria-hidden /> {v.label}
        </span>
      </div>

      {/* Slider */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem', letterSpacing: '0.02em' }}>Account size</span>
          <span className="v4-bignum" style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)' }}>{fmtBigUsd(animSize)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={tiers.length - 1}
          step={1}
          value={idx}
          onChange={e => setIdx(Number(e.target.value))}
          className="v4-slider"
          aria-label={`Choose account size — currently ${fmtBigUsd(animSize)}`}
          aria-valuemin={0}
          aria-valuemax={tiers.length - 1}
          aria-valuenow={idx}
          aria-valuetext={fmtBigUsd(tier.sizeUsd)}
          style={{
            // dynamic fill on track for webkit via background-size trick
            background: `linear-gradient(to right, transparent, transparent)`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {tiers.map((t, i) => (
            <button
              key={t.sizeUsd}
              onClick={() => setIdx(i)}
              aria-label={`Jump to ${fmtBigUsd(t.sizeUsd)}`}
              style={{
                minHeight: 44, minWidth: 44,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.25rem 0.5rem',
                background: 'transparent', border: 'none',
                color: i === idx ? 'var(--accent2)' : 'var(--muted)',
                fontWeight: i === idx ? 700 : 500,
                cursor: 'pointer',
                transition: 'color 250ms cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {fmtBigUsd(t.sizeUsd)}
            </button>
          ))}
        </div>
      </div>

      {/* Metric grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <Metric
          icon={<DollarSign size={16} aria-hidden />}
          label="Minimum cost to funded"
          value={fmtUsd(animFee)}
          hint={feeHint}
        />
        <Metric
          icon={<TrendingUp size={16} aria-hidden />}
          label="Break-even profit"
          value={fmtUsd(animBreakEven)}
          hint={`at ${challenge.profitSplitPct}% split`}
        />
        <Metric
          icon={<Target size={16} aria-hidden />}
          label="R-multiple"
          value={cost.rMultiple == null ? '—' : animR.toFixed(2)}
          hint={
            cost.rMultiple == null
              ? 'Need max-loss %'
              : cost.rMultiple < 0.3
                ? 'Risk room > target'
                : cost.rMultiple < 0.8
                  ? 'Tight but tradeable'
                  : 'Target > risk room'
          }
        />
        <Metric
          icon={<CalendarClock size={16} aria-hidden />}
          label="Days to break even"
          value={cost.dayCount == null ? '—' : Math.round(animDays).toString()}
          hint={cost.dayCount == null ? 'Need daily-loss %' : 'at 1%/day disciplined'}
        />
      </div>
    </div>
  )
}

function Metric({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 18,
        padding: '1rem 1.1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent2)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        {icon}
        {label}
      </div>
      <div className="v4-bignum" style={{ marginTop: '0.45rem', fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{hint}</div>
    </div>
  )
}
