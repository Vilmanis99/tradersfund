/**
 * Server builder: projects challenge / firm data into public calculator presets.
 * Import only from Server Components / Node tests — never from 'use client' modules.
 * (No `server-only` import: several Node unit tests transpile app/blog/[slug]/page.tsx
 * without a server-only stub; the client calculator never imports this file.)
 * Never pass raw Challenge objects to the client component.
 */
import { getAllChallenges, getAllFirms, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { firmSlug } from '@/lib/firmSlug'
import {
  basisFromChallenge,
  type ConsistencyPreset,
} from '@/lib/consistencyCalculator'

const DAY = 86_400_000

function isBasisFresh(checkedAt: string | undefined, now: Date = new Date(), maxAgeDays = 30) {
  if (!checkedAt || !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) return false
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) now = new Date()
  const captured = new Date(`${checkedAt}T00:00:00Z`)
  if (!Number.isFinite(captured.getTime()) || captured.toISOString().slice(0, 10) !== checkedAt) return false
  const ageDays = Math.floor((now.getTime() - captured.getTime()) / DAY)
  // Allow a small future skew (timezone / build-clock lag vs Tracker's calendar checkedAt).
  // Without this, a build whose wall clock is still on yesterday rejects today's fresh captures.
  return ageDays >= -2 && ageDays <= maxAgeDays
}

function findFirm(firms: Firm[], slug: string) {
  return firms.find(firm => firmSlug(firm.name) === slug)
}

function findProduct(challenges: Challenge[], slug: string, productSlug: string) {
  return challenges.find(c => c.firmSlug === slug && c.productSlug === productSlug)
}

function rulePreset(opts: {
  id: string
  label: string
  product: Challenge
  firm: Firm
  limitPct: number
  stageNote?: string
  inequality?: 'lte' | 'lt'
  now: Date
}): ConsistencyPreset | null {
  const { product, firm, now } = opts
  if (!isChallengeFresh(product, now)) return null
  const checkedAt = product.consistencyBasisCheckedAt ?? product.sourceCapturedAt
  // Require a fresh basis check whenever the field has been researched (null or set).
  if ('consistencyBasis' in product) {
    if (!isBasisFresh(product.consistencyBasisCheckedAt ?? product.sourceCapturedAt, now)) return null
  }
  const basis = basisFromChallenge(product.consistencyBasis)
  return {
    id: opts.id,
    label: opts.label,
    kind: 'rule',
    limitPct: opts.limitPct,
    basis,
    inequality: opts.inequality ?? 'lte',
    stageNote: opts.stageNote,
    basisNote: basis === 'not-stated'
      ? (product.consistencyBasisNote
        ? 'This product’s help page does not state a single profit base clearly enough for us to prefill one.'
        : 'This product’s help page does not state a single profit base clearly enough for us to prefill one.')
      : undefined,
    sourceUrl: product.consistencyBasisSourceUrl ?? product.sourceUrl,
    sourceCapturedAt: checkedAt,
    firmName: firm.name,
    reviewHref: firm.reviewUrl,
  }
}

/**
 * Curated presets for the in-article calculator (BrightFunded first).
 * LucidFlex + LucidDaily evaluation presets included. Apex PA 50% limit comes from firms.json
 * `consistencyRule` (Tracker-maintained); challenge products have null eval %.
 */
export function buildConsistencyCalculatorPresets(now = new Date()): {
  presets: ConsistencyPreset[]
  defaultPreset: string
  gaps: string[]
} {
  const challenges = getAllChallenges()
  const firms = getAllFirms()
  const presets: ConsistencyPreset[] = []
  const gaps: string[] = []

  // ── BrightFunded: no structured consistencyRuleApplies:false; all pct null ──
  const bf = findFirm(firms, 'bright-funded')
  const bfProducts = challenges.filter(c => c.firmSlug === 'bright-funded' && isChallengeFresh(c, now))
  if (bf && bfProducts.length > 0 && bfProducts.every(p => p.consistencyRulePct == null && !p.consistencyRules?.length)) {
    if (bf.consistencyRule == null && bfProducts.every(p => p.consistencyRuleApplies !== false)) {
      gaps.push(
        'BrightFunded: challenge JSON has null consistencyRulePct on all fresh products but lacks consistencyRuleApplies:false (and firms.json consistencyRule is null). Showing as no-rule from null percentages + empty-state; Tracker should set consistencyRuleApplies:false once the help-centre “not currently enforce” sentence is attached to the capture.',
      )
    }
    const latest = [...bfProducts].sort((a, b) => b.sourceCapturedAt.localeCompare(a.sourceCapturedAt))[0]
    presets.push({
      id: 'bright-funded-no-rule',
      label: 'BrightFunded (all captured plans) — no consistency rule',
      kind: 'no-rule',
      limitPct: null,
      basis: 'not-stated',
      inequality: 'lte',
      emptyState:
        'BrightFunded’s help centre says it does “not currently enforce” a consistency rule (checked 2026-10-20). There is no best-day % to calculate. Drawdown, news, and payout clocks still apply — read the BrightFunded review before you pay.',
      sourceUrl: 'https://help.brightfunded.com/en/articles/12577176-does-brightfunded-have-a-consistency-rule',
      sourceCapturedAt: latest.sourceCapturedAt,
      firmName: bf.name,
      reviewHref: bf.reviewUrl,
    })
  } else {
    gaps.push('BrightFunded: no fresh challenge products available for a no-rule preset.')
  }

  // ── FTMO 1-Step ──
  const ftmo = findFirm(firms, 'ftmo')
  const ftmo1 = findProduct(challenges, 'ftmo', 'ftmo-challenge-1-step')
  if (ftmo && ftmo1 && ftmo1.consistencyRulePct != null) {
    const built = rulePreset({
      id: 'ftmo-1-step',
      label: 'FTMO Challenge: 1-Step · 50% · both stages (orders from 12 Oct 2026)',
      product: ftmo1,
      firm: ftmo,
      limitPct: ftmo1.consistencyRulePct,
      now,
      stageNote:
        'Orders from 12 Oct 2026 use total profit (closed P&L, losses included). Legacy Best Day Rule for older accounts uses Positive Days’ Profit — use Custom with that base, not this preset.',
    })
    if (built) presets.push(built)
    else gaps.push('FTMO 1-Step: product present but failed freshness/basis checks.')
  } else {
    gaps.push('FTMO 1-Step: missing product or consistencyRulePct on main.')
  }

  // ── FundingPips 2-Step Standard ──
  const fp = findFirm(firms, 'fundingpips')
  const fpStd = findProduct(challenges, 'fundingpips', '2-step-standard')
  if (fp && fpStd && fpStd.consistencyRulePct != null) {
    const built = rulePreset({
      id: 'fundingpips-2-step-standard',
      label: 'FundingPips 2-Step Standard · 35% · On-Demand payouts',
      product: fpStd,
      firm: fp,
      limitPct: fpStd.consistencyRulePct,
      now,
      stageNote: fpStd.consistencyRules?.[0]?.appliesTo
        ? `Applies to ${fpStd.consistencyRules[0].appliesTo}.`
        : 'Funded On-Demand payouts; resets after each reward.',
    })
    if (built) presets.push(built)
    else gaps.push('FundingPips 2-Step Standard: failed freshness/basis checks.')
  } else {
    gaps.push('FundingPips 2-Step Standard: missing product or consistencyRulePct.')
  }

  // ── Topstep Combine (Standard Path) — basis null ──
  const topstep = findFirm(firms, 'topstep')
  const combine = findProduct(challenges, 'topstep', 'trading-combine-standard-path')
  if (topstep && combine && combine.consistencyRulePct != null) {
    const built = rulePreset({
      id: 'topstep-combine',
      label: 'Topstep Trading Combine · 55% evaluation',
      product: combine,
      firm: topstep,
      limitPct: combine.consistencyRulePct,
      now,
      stageNote:
        'Evaluation 55%. A secondary 40% XFA Consistency payout path on the same help article resets after payout; that path is separate from this 55% preset, so the profit base is left empty rather than guessed.',
    })
    if (built) presets.push(built)
    else gaps.push('Topstep Combine: failed freshness/basis checks.')
  } else {
    gaps.push('Topstep Combine: missing product or consistencyRulePct.')
  }


  // ── LucidFlex + LucidDaily evaluations (40% standard; 50% paid add-on) ──
  const lucid = findFirm(firms, 'lucid-trading')
  const lucidFlex = findProduct(challenges, 'lucid-trading', 'lucidflex')
  if (lucid && lucidFlex && lucidFlex.consistencyRulePct != null) {
    const built = rulePreset({
      id: 'lucid-flex',
      label: 'LucidFlex evaluation · 40% standard (50% paid add-on)',
      product: lucidFlex,
      firm: lucid,
      limitPct: lucidFlex.consistencyRulePct,
      now,
      stageNote:
        'Evaluation only. 50% is a paid checkout add-on on the same product. Funded LucidFlex accounts have no consistency rule in the captured evaluation articles.',
    })
    if (built) presets.push(built)
    else gaps.push('LucidFlex: failed freshness/basis checks.')
  } else {
    gaps.push('LucidFlex: missing product or consistencyRulePct.')
  }

  const lucidDaily = findProduct(challenges, 'lucid-trading', 'luciddaily-dll-on-intraday')
    ?? findProduct(challenges, 'lucid-trading', 'luciddaily-dll-on-eod')
  if (lucid && lucidDaily && lucidDaily.consistencyRulePct != null) {
    const built = rulePreset({
      id: 'lucid-daily',
      label: 'LucidDaily evaluation · 40% standard (50% paid add-on)',
      product: lucidDaily,
      firm: lucid,
      limitPct: lucidDaily.consistencyRulePct,
      now,
      stageNote:
        'Evaluation only (Customization article is the standard-price source; overview may still list 50%). 50% is a paid checkout add-on. Funded LucidDaily accounts have no consistency rule in the captured evaluation articles.',
    })
    if (built) presets.push(built)
    else gaps.push('LucidDaily: failed freshness/basis checks.')
  } else {
    gaps.push('LucidDaily: missing product or consistencyRulePct.')
  }

  // ── Apex: firm.consistencyRule states no-eval + 50% PA; challenge eval % usually null ──
  // Prefill Measured against from structured PA rows (consistencyBasis + 50% funded).
  // Inequality `lt` stays in the preset (not stored in challenge data). Fallback not-stated
  // only when no fresh product carries a basis yet.
  const apex = findFirm(firms, 'apex-trader-funding')
  const apexProducts = challenges.filter(c => c.firmSlug === 'apex-trader-funding' && isChallengeFresh(c, now))
  if (apex && apex.consistencyRule && /50\s*%/.test(apex.consistencyRule) && apexProducts.length > 0) {
    const latest = [...apexProducts].sort((a, b) => b.sourceCapturedAt.localeCompare(a.sourceCapturedAt))[0]
    const structuredPa = apexProducts.find(
      p =>
        p.consistencyRulePct === 50
        && p.consistencyBasis != null
        && isBasisFresh(p.consistencyBasisCheckedAt ?? p.sourceCapturedAt, now),
    )
    const apexStageNote =
      'Evaluation: no consistency rule. Performance Account payouts: largest profitable day must be less than 50% of net profit since the last payout request (or inception). Breaking it blocks the payout request; it does not fail the account. Legacy PAs from before 1 Mar 2026 used 30% — note only, not this preset.'
    const apexStructuredBasisNote =
      'Apex measures your largest profitable day against net profit since your last payout request (or since the account opened), and the count resets after an approved payout.'
    const apexFallbackBasisNote =
      'Apex’s help page names the PA profit base as net profit since the last payout request (or since account inception). Choose “Profit in current payout / reward cycle” if that matches your dashboard, or confirm on the live help page.'
    if (structuredPa) {
      const built = rulePreset({
        id: 'apex-pa-payout',
        label: 'Apex Trader Funding · no evaluation rule; 50% at Performance Account payout',
        product: structuredPa,
        firm: apex,
        limitPct: structuredPa.consistencyRulePct!,
        now,
        inequality: 'lt',
        stageNote: apexStageNote,
      })
      if (built) {
        // rulePreset omits basisNote when a basis is set; Apex still needs the reset explanation.
        built.basisNote = apexStructuredBasisNote
        presets.push(built)
      } else {
        gaps.push('Apex PA 50%: structured product present but failed freshness/basis checks.')
      }
    } else {
      gaps.push(
        'Apex PA 50%: firm field states no evaluation rule and 50% at Performance Account payouts; challenge products still have null eval % / null consistencyBasis. Basis left not-stated until Tracker stores a structured PA consistencyBasis (then this preset prefills automatically).',
      )
      presets.push({
        id: 'apex-pa-payout',
        label: 'Apex Trader Funding · no evaluation rule; 50% at Performance Account payout',
        kind: 'rule',
        limitPct: 50,
        basis: 'not-stated',
        inequality: 'lt',
        stageNote: apexStageNote,
        basisNote: apexFallbackBasisNote,
        sourceUrl: 'https://apextraderfunding.com/help-center/additional-helpful-items/50-consistency-requirement/',
        // Fallback path only: use latest product capture; do not invent a newer checked date.
        sourceCapturedAt: latest.sourceCapturedAt,
        firmName: apex.name,
        reviewHref: apex.reviewUrl,
      })
    }
  } else {
    gaps.push('Apex: missing firm.consistencyRule with 50% or no fresh challenge products.')
  }

  const defaultPreset =
    presets.find(p => p.id === 'ftmo-1-step')?.id
    ?? presets.find(p => p.kind === 'rule')?.id
    ?? presets[0]?.id
    ?? 'custom'

  return { presets, defaultPreset, gaps }
}
