---
title: "How Prop Firm Challenges Work: The 5-Stage Lifecycle (2026)"
slug: "how-prop-firm-challenges-work"
date: "2026-05-20 12:00:00"
description: "From buying the challenge to your first payout — the five stages every funded trader goes through, with real numbers from FTMO, FundedNext, FXIFY, and Topstep."
type: "page"
---

<p style="color: var(--muted); max-width: 700px; margin-bottom: 2rem; font-size: 1.05rem; line-height: 1.65;">Every prop firm challenge follows the same five-stage lifecycle. The numbers and rules differ — but the structure is the same across FTMO, FundedNext, FXIFY, Topstep, and every other firm worth considering. This page walks the lifecycle end-to-end with live 2026 numbers, so you can evaluate any challenge against the same mental model.</p>

<div class="key-takeaways">
  <div class="title">The five stages</div>
  <ol>
    <li><strong>Buy the challenge</strong> — pay a refundable fee, pick an account size, accept the rules.</li>
    <li><strong>Phase 1 evaluation</strong> — hit a profit target (typically 8–10%) without breaching daily or max drawdown.</li>
    <li><strong>Phase 2 verification</strong> — repeat at a lower target (typically 5%), proving consistency.</li>
    <li><strong>Funded account</strong> — trade real-economic-impact account, get paid your share of profits.</li>
    <li><strong>First payout + scaling</strong> — claim the fee refund, take your share, unlock higher tiers.</li>
  </ol>
  <p style="margin-top: 1rem; margin-bottom: 0;">1-step challenges fold stages 2 and 3 into one. Instant funding skips evaluation entirely (stages 2 and 3) and goes straight to a funded account. Every variant is a permutation of the same five stages.</p>
</div>

<h2>Stage 1 — Buying the challenge</h2>

<p>You pick a firm, an account size, and a challenge type, then pay a one-time fee. The fee is <strong>refundable with your first payout</strong> on standard evaluation products — you get it back when you start being paid. On <strong>instant funding</strong> products (FundedNext Stellar Instant, FXIFY Instant, OFP Funding), the fee is typically not refundable.</p>

<p><strong>What the firm asks of you upfront:</strong></p>

<ul class="wp-block-list">
  <li>Email + basic identity. KYC (full identity verification with passport / ID upload) is usually deferred until you reach payout, not at signup.</li>
  <li>Choice of trading platform — typically MT4, MT5, cTrader, or DXTrade. Once chosen on most firms it can be changed for new attempts but not mid-challenge.</li>
  <li>Choice of standard vs swing account (FTMO specifically) — swing variants allow overnight and weekend holding but at different leverage tiers.</li>
</ul>

<p><strong>Real 2026 examples from our verified data</strong> (<a href="/blog/ftmo-review">FTMO</a>, <a href="/blog/fundednext-review">FundedNext</a>, <a href="/blog/fxify-review">FXIFY</a>):</p>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Sample challenge fees at $100K account size</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Firm</th><th style="padding: 8px 12px; text-align: left;">Product</th><th style="padding: 8px 12px; text-align: left;">$100K fee (USD)</th><th style="padding: 8px 12px; text-align: left;">Refundable?</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FundedNext</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Stellar 2-Step</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$549.99</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Yes, on first payout</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FXIFY</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">One-Phase (promo applied)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">~$330 (with ~40% promo)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Yes</td></tr>
    <tr><td style="padding: 8px 12px;">FundedNext</td><td style="padding: 8px 12px;">Stellar Instant ($10K)</td><td style="padding: 8px 12px;">$299.99</td><td style="padding: 8px 12px;"><strong>No</strong></td></tr>
  </tbody>
</table>

<h2>Stage 2 — Phase 1 evaluation</h2>

<p>You trade with a simulated account loaded with the notional balance you bought (e.g. $100,000). The firm watches three things: did you hit the profit target, did you blow the daily drawdown, did you blow the max drawdown.</p>

<p><strong>Profit target</strong>: typically 8–10% on Phase 1. On FundedNext Stellar 2-Step at $100K, that's $8,000 of net trading profit. There's no time limit on most modern challenges — FTMO removed its 30-day cap in 2023, FundedNext followed in 2024. FXIFY's Lightning is the exception with a hard 7-day window.</p>

<p><strong>Daily drawdown</strong>: typically 5% of starting balance, anchored to the equity at server-day start (usually UTC midnight). On a $100K account that's a $5,000 intraday loss line. A profitable morning <strong>does not</strong> extend your afternoon allowance — the cap is fixed at server-day open, regardless of your floating high.</p>

<p><strong>Maximum drawdown</strong>: typically 10%. Two flavors:</p>

<ul class="wp-block-list">
  <li><strong>Static</strong> (FTMO, FundedNext, FundingPips, E8 Markets, OFP): the loss line is fixed at the starting balance — $90,000 on a $100K account, period. It does not move as you profit. This is the forgiving variant.</li>
  <li><strong>Trailing</strong> (FXIFY, Topstep, My Funded Futures): the loss line follows your equity high. If your equity peaks at $103,000, your max-loss line moves up to $92,700 and locks once you reach the funded stage. This is the punishing variant — profit retention discipline matters.</li>
</ul>

<p>Hit any one of those three (miss the target, breach daily, breach max), and the account ends. Most firms then offer a discounted "reset" fee — typically $50–$200 — to try again.</p>

<h2>Stage 3 — Phase 2 verification</h2>

<p>Standard 2-step challenges (FTMO, FundedNext Stellar 2-Step, FXIFY Two-Phase, most major firms) require a verification phase before funding. The structure is the same as Phase 1 with one change: <strong>the profit target drops</strong> — typically from 8–10% down to 4–5%.</p>

<p>The lower target is intentional. Phase 1 proves you can hit a target. Phase 2 proves you can do it again without taking outsized risk. The firms aren't testing whether you can scalp 10% in a day — they're testing whether you can stay disciplined after a successful Phase 1.</p>

<p>The drawdown rules from Phase 1 carry forward unchanged. Many traders breach Phase 2 after passing Phase 1 because the lower target creates over-confidence and oversized positions.</p>

<p>1-step challenges (FTMO 1-Step, FundedNext Stellar 1-Step, FXIFY One-Phase) fold this stage into Stage 2 — you hit a single target (typically 10%) and skip verification. Single-phase products are faster to pass for a confident trader but less forgiving — a single mistake costs the whole evaluation.</p>

<h2>Stage 4 — The funded account</h2>

<p>You pass the evaluation phases. The firm activates a <strong>funded account</strong> — usually still simulated trading, but with payouts tied to real PnL. Key things change at this stage:</p>

<ul class="wp-block-list">
  <li><strong>Profit target requirement disappears.</strong> You're now just trading; the firm wants you to be consistently profitable, not to hit a specific number per period.</li>
  <li><strong>Drawdown rules continue to apply.</strong> If you breach daily or max drawdown on the funded account, the account ends and you lose the funded relationship. Some firms (FTMO, FundedNext) let you re-purchase the challenge at a discount; others don't.</li>
  <li><strong>Restrictions tighten on a few firms.</strong> FTMO restricts news trading on the funded "Rewards" account (it was allowed during evaluation). Other firms (FundedNext, FXIFY) keep rules consistent across stages.</li>
  <li><strong>The profit split applies.</strong> Standard rates: 80% (FTMO base, E8, Alpha Capital, Maven, Bright Funded, CFT, CTI), 90% (Topstep, MFF, FTMO scaled, TFT, OFP), 95% (FundedNext Stellar 2-Step/1-Step), up to 100% (FundingPips scaled, FXIFY Futures).</li>
</ul>

<h2>Stage 5 — First payout and scaling</h2>

<p>This is where the "refundable challenge fee" promise turns into actual money. You request a payout from the funded account. The firm verifies your KYC (now required), processes the payout, and returns your challenge fee with your first paid payout on refundable products.</p>

<p><strong>Time to first payout:</strong></p>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">First-payout timing across firms</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Firm</th><th style="padding: 8px 12px; text-align: left;">First payout available</th><th style="padding: 8px 12px; text-align: left;">After that, cadence</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FTMO</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">30 days after activation</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Bi-weekly</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FundedNext Stellar 2-Step</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">~7–14 days, then on-demand</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">On-demand</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FXIFY evaluation products</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Day 1 ($50 minimum)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">On-demand</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Topstep XFA</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">After minimum winning days</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">On-demand via AeroPay (&lt;9s)</td></tr>
    <tr><td style="padding: 8px 12px;">FundingPips</td><td style="padding: 8px 12px;">~14 days post 5 trading days</td><td style="padding: 8px 12px;">Bi-weekly</td></tr>
  </tbody>
</table>

<p><strong>Payment methods:</strong> Bank wire (universal, slowest, sometimes pass-through fees), crypto USDT (typically TRC-20, fastest internationally, firm covers network fee), Rise / B2B remittance (for traders outside US/EU), ACH (US-domestic only, for Topstep / MFF).</p>

<p><strong>Scaling:</strong> after sustained funded performance, most firms increase the account size and / or the profit split. FTMO's Scaling Plan: 4 calendar months on the same Rewards Account with ≥10% average net profit and at least 2 payouts taken triggers a 25% account-size increase and the split moves from 80% to 90%. The plan repeats until the account reaches $2M. FundingPips has a similar progression that takes the split from 80% to 100%. Topstep and MFF scale by promoting from XFA to Live Funded with up to $250K in performance bonuses, but only 0.71% of XFA traders reach Live (Topstep's published 2025 figure).</p>

<h2>Three worked walkthroughs</h2>

<h3>A. 2-step path on FundedNext Stellar 2-Step $100K</h3>

<ol>
  <li><strong>Pay $549.99.</strong> Pick MT5, standard account.</li>
  <li><strong>Phase 1</strong>: hit $8,000 profit (8%). Stay above $90,000 max-loss line and respect the $5,000 daily cap. No time limit.</li>
  <li><strong>Phase 2</strong>: hit $5,000 profit (5%). Same drawdown rules.</li>
  <li><strong>Funded account activates.</strong> 95% profit split. Continue trading. Drawdown rules persist.</li>
  <li><strong>First payout</strong> ~7–14 days in. KYC verification. Request payout (e.g., $1,500 in profit). FundedNext takes 5% = $75; you receive $1,425. Plus the $549.99 fee refund. Total to your account: $1,974.99. Subsequent payouts on-demand without the fee-refund line.</li>
</ol>

<h3>B. 1-step path on FXIFY Lightning $5K</h3>

<ol>
  <li><strong>Pay $59.</strong> Pick MT5.</li>
  <li><strong>Lightning</strong>: hit $250 profit (5%) within 7 calendar days. Stay above the trailing 10% max-loss line. Respect 4% daily cap ($200).</li>
  <li><strong>Funded account activates.</strong> 80% profit split (with add-ons can be higher). On-demand payouts from day 1.</li>
  <li><strong>First payout</strong> as soon as you have $50+ profit. FXIFY's 80% means a $100 net profit pays you $80. Fee refund applies on the first payout. Total recovered against the $59 fee: positive after a single $100 profitable trade.</li>
</ol>

<h3>C. Instant path on FundedNext Stellar Instant $10K</h3>

<ol>
  <li><strong>Pay $299.99.</strong> Pick MT5. <strong>Fee is not refundable.</strong></li>
  <li><strong>Skip evaluation entirely.</strong> You're funded immediately on a simulated $10K account.</li>
  <li><strong>Trade with 6% trailing max-loss</strong> (much tighter than evaluation products). 70% profit split. No daily cap published, but the tight trailing rule is the real risk.</li>
  <li><strong>Request a payout</strong> once you've hit a 5% gain ($500 in profit). Receive $500 × 70% = $350. Net of the non-refundable $299.99 fee, your real-money outcome is $50 — i.e. <strong>you need to take a payout before the fee + tight DD math turns against you.</strong> Instant funding is the most expensive path; it's only worth it for traders with a proven edge who would otherwise pay multiple evaluation attempts.</li>
</ol>

<h2>The single biggest rule that ends accounts</h2>

<p><strong>Trailing maximum drawdown</strong> on futures and instant products. More funded accounts close because of trailing-DD math after a profitable run than because traders couldn't hit profit targets in the first place. If you can't articulate exactly where your drawdown floor sits after a $X profitable day, do not put real money on a trailing-DD product. Static drawdown firms (FTMO, FundedNext Stellar 2-Step, FundingPips) are structurally easier to manage and worth the slightly lower headline split for most traders.</p>

<h2>Want to compare specific firms?</h2>

<p>Every claim on this page is sourced to our verified challenge data. See the per-firm reviews for the full details:</p>

<ul class="wp-block-list">
  <li><a href="/blog/ftmo-review">FTMO</a> — the longest operating history, static DD</li>
  <li><a href="/blog/fundednext-review">FundedNext</a> — 95% split flagship, multiple product variants</li>
  <li><a href="/blog/fxify-review">FXIFY</a> — six challenge products including Lightning and Instant</li>
  <li><a href="/blog/topstep-review">Topstep</a> — the futures pioneer with published pass-rate stats</li>
  <li><a href="/blog/funding-pips-review">FundingPips</a> — 100% scaling ceiling, cheapest at entry</li>
</ul>

<p>Or jump to <a href="/main-table">the full directory</a> or read <a href="/true-cost-of-prop-firm-challenges">the true-cost economics</a> if you want the math behind which challenge is structurally cheapest to break even on.</p>
