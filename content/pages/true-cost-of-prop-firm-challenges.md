---
title: "True Cost of Prop Firm Challenges: Fee-Recovery Math (2026)"
seoTitle: "Prop Firm Challenge True Cost: Fee-Recovery Math"
slug: "true-cost-of-prop-firm-challenges"
date: "2026-05-20 12:00:00"
modified: "2026-08-17 12:00:00"
description: "Calculate fee-recovery profit, refund-adjusted cash cost, retry cost, and the ratio between checkout cost and a challenge's starting loss room."
seoDescription: "Calculate prop-firm fee-recovery profit, refund-adjusted cash cost, retry cost, loss-room ratio, and standardized growth days."
type: "page"
---

<p style="color: var(--muted); max-width: 700px; margin-bottom: 2rem; font-size: 1.05rem; line-height: 1.65;">A challenge fee is only one part of cost. The <a href="/prop-firms/high-profit-split">verified base profit split</a> determines how much gross account profit produces the same trader share as that fee; refunds, failed attempts, recurring billing, activation charges, and <a href="/blog/what-is-prop-firm-consistency-rule">consistency-based payout gates</a> determine the actual cash result. This guide defines each number before comparing products captured on 2026-07-27.</p>

<div class="key-takeaways">
  <div class="title">Read the model correctly</div>
  <ul>
    <li><strong>Minimum cost to funded</strong> — the captured list-price floor, including a required after-pass or activation payment where structured.</li>
    <li><strong>Fee-recovery profit</strong> — gross account profit whose trader share equals that cost: <code>cost ÷ base split</code>.</li>
    <li><strong>Refund-adjusted cash cost</strong> — cash paid minus refunds actually received; eligibility and timing matter.</li>
    <li><strong>Cost / loss-room ratio</strong> — fee-recovery profit divided by the captured starting maximum-loss amount.</li>
    <li><strong>Standardized growth days</strong> — a 1% compounded-growth comparison, not a pass forecast or payout wait.</li>
  </ul>
</div>

<h2>What “break-even profit” means on TradersFundHub</h2>

<p>The codebase retains the field name <code>breakEvenProfit</code> for compatibility with existing review tables. Its precise meaning is <strong>fee-recovery profit before counting a refund</strong>:</p>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>fee_recovery_profit = minimum_cost_to_funded / (base_profit_split_pct / 100)</code></pre>

<p>If the minimum cost is $549.99 and the base split is 80%, the computed fee-recovery profit is $549.99 ÷ 0.80 = $687.49. At that gross profit, the trader’s 80% share is $549.99. The calculation does not claim that $687.49 is a minimum payout, a likely result, or the point when a separately refundable fee arrives.</p>

<p>Actual cash outcome needs a second equation:</p>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>cash_net = trader_share_received + fee_refunds_received - cash_paid</code></pre>

<p>A fully refunded fee can make cash net positive at a lower gross profit once every payout and refund condition is met. A non-refundable fee requires the trader share to recover the cost. A refund promised only at a later reward cannot be counted in an earlier withdrawal.</p>

<h2>Current product examples from the same calculator</h2>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem;">
  <caption class="hidden-caption">True-cost examples generated from captured product inputs</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Product / tier</th><th style="padding: 8px 12px; text-align: left;">Minimum cost</th><th style="padding: 8px 12px; text-align: left;">Base split</th><th style="padding: 8px 12px; text-align: left;">Fee-recovery profit</th><th style="padding: 8px 12px; text-align: left;">Cost / loss-room</th><th style="padding: 8px 12px; text-align: left;">1% growth days</th><th style="padding: 8px 12px; text-align: left;">Captured</th></tr></thead>
  <tbody>
    <tr data-true-cost-example="fundednext:stellar-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FundedNext Stellar 2-Step $100K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$549.99</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">80%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$687.49</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">0.069</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">1</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-27</td></tr>
    <tr data-true-cost-example="fundednext:stellar-instant"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FundedNext Stellar Instant $10K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$299.99</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">70%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$428.56</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">0.714</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">—</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-27</td></tr>
    <tr data-true-cost-example="ftmo:ftmo-challenge-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FTMO 2-Step $100K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">€540</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">80%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">€675</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">— mixed currency</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">—</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-true-cost-example="topstep:trading-combine-standard-path"><td style="padding: 8px 12px;">Topstep Standard Path $100K</td><td style="padding: 8px 12px;">$248 floor</td><td style="padding: 8px 12px;">90%</td><td style="padding: 8px 12px;">$275.56</td><td style="padding: 8px 12px;">— unstructured tier loss</td><td style="padding: 8px 12px;">—</td><td style="padding: 8px 12px;">2026-07-27</td></tr>
  </tbody>
</table>

<p>All 4 rows use <code>challengeTierEconomics()</code>, which calls the same <code>computeTrueCost()</code> helper audited in firm reviews. FundedNext Stellar 2-Step uses the $549.99 list fee and 80% base split; Stellar Instant uses its non-refundable $299.99 fee and 70% split. FTMO remains in euros, and Topstep’s $248 floor assumes 1 monthly $99 payment plus the required $149 activation.</p>

<h2>Refund timing changes the cash break-even</h2>

<p>FundedNext Stellar 2-Step records a fee refund with the first approved reward. At $687.49 of gross approved profit, the 80% trader share is $549.99; if the $549.99 registration-fee refund arrives in the same payment, the cash receipt is $1,099.98 against the original $549.99 registration cost. The trader is $549.99 cash-positive before processing costs, not merely at zero.</p>

<p>That example proves why fee-recovery profit and refund-adjusted cash break-even are different measures. The actual lower cash-positive threshold depends on first-payout eligibility, minimum reward, KYC, rule compliance, and the refund’s named conditions. FundedNext’s current first standard eligibility is 21 days; a 1-day standardized growth result does not override it.</p>

<p>FundedNext Stellar Instant is different: its $299.99 fee is non-refundable. At $428.56 gross profit and a 70% split, the trader share is $299.99, so the fee-recovery calculation is also the cash break-even before processing costs. The <a href="/blog/fundingpips-zero">FundingPips Zero guide</a> documents another non-refundable phase-0 model, while FundingPips 2 Step Standard creates a third case because its captured refund arrives only at the 4th reward.</p>

<h2>Failed attempts and recurring billing belong in total cost</h2>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>total_cash_cost = attempt_fees + recurring_charges + activations + resets + add_ons - refunds_received</code></pre>

<p>Suppose a trader buys 3 FundedNext Stellar 2-Step $100K attempts at $549.99 each, loses 2, and receives the successful attempt’s $549.99 refund with an approved reward. Initial cash paid is $1,649.97; after that one refund, net challenge cost is $1,099.98. At the 80% base split, recovering the 2 failed fees requires $1,099.98 ÷ 0.80 = $1,374.98 of gross approved profit, before platform add-ons or processing costs.</p>

<p>Recurring products need elapsed time in the cost basis. Topstep Standard Path at $100K is $99 per month plus a $149 activation after passing. The 1-month floor is $248 and its 90% fee-recovery profit is $275.56. Passing after 2 paid months raises cost to $347 and fee-recovery profit to $385.56. The static calculator intentionally shows the 1-month floor; it cannot predict the user’s paid billing cycles.</p>

<p>Do not turn a published pass-rate percentage into an “average attempts” estimate by taking its reciprocal. Topstep’s 2025 initiation and participant statistics do not provide a cohort-level retry distribution, independence assumption, or the spend per successful participant required for that calculation.</p>

<h2>What the cost / loss-room ratio does—and does not—say</h2>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>cost_loss_ratio = fee_recovery_profit / captured_starting_maximum_loss</code></pre>

<p>FundedNext Stellar 2-Step’s $687.49 fee-recovery profit divided by its $10,000 static starting maximum loss is 0.0687, displayed as 0.069. That means the fee-recovery profit equals about 6.9% of the product’s starting maximum-loss allowance. It does not mean the trade has a 0.069 R-multiple, a 93.1% safety margin, or a predictable chance of passing.</p>

<p>The denominator also needs context. A static maximum-loss line remains fixed, while a trailing line can move after profit. Tier-specific dollar limits cannot be replaced with one product-wide percentage. For FTMO, the fee is EUR while the account label is USD, so TradersFundHub omits the ratio and standardized days instead of inserting an exchange rate that will go stale.</p>

<h2>Why standardized growth days are not payout days</h2>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>days = ceil( ln(1 + fee_recovery_profit / account_size) / ln(1 + assumed_daily_growth) )
assumed_daily_growth = min(1%, captured_daily_loss_pct)</code></pre>

<p>The day field normalizes tiers under the same artificial 1% compounded-growth assumption. It is not described as realistic, conservative, or attainable. FundedNext Stellar 2-Step returns 1 standardized day because $687.49 is about 0.69% of $100K, yet the product records 21 days before first standard payout eligibility. The rule controls payout timing; the model only compares fee size.</p>

<p>A blank day field is information, not zero. Stellar Instant has no captured daily-loss percentage, Topstep’s daily-loss control is optional rather than a breach rule, and EUR-native FTMO would mix fee and account currencies. The model leaves those comparisons blank instead of manufacturing inputs.</p>

<h2>When the model must not calculate a number</h2>

<ul class="wp-block-list">
  <li><strong>No verified base split:</strong> FXIFY Lightning publishes only “up to 90%,” so its structured <code>profitSplitPct</code> is null and fee-recovery profit is undefined. Any exact calculation using an assumed base split would be unsupported.</li>
  <li><strong>No verified fee:</strong> a null tier price cannot be replaced with a coupon, neighbouring tier, or remembered checkout value.</li>
  <li><strong>Mixed currencies:</strong> a euro fee against a USD notional account supports euro fee-recovery math, but not an honest cost / dollar-loss ratio without a dated FX rate.</li>
  <li><strong>Recurring or split billing:</strong> “minimum cost to funded” must state the assumed billing cycles and required after-pass payments.</li>
  <li><strong>Missing loss fields:</strong> fee-recovery profit can still be calculated, but the ratio or standardized-day field stays blank.</li>
</ul>

<h2>Use the number in the right decision</h2>

<ol>
  <li><strong>Compare the same cost basis and currency.</strong> Start with the <a href="/cheapest-prop-firms">currency-separated minimum-cost ranking</a>; a USD list fee, EUR list fee, coupon fee, 1-month subscription floor, and multi-attempt spend are different quantities.</li>
  <li><strong>Separate purchase cost from execution risk.</strong> Use the <a href="/how-to-pass-a-prop-firm-challenge">risk-plan worksheet</a> for position sizing and the <a href="/how-prop-firm-challenges-work">lifecycle guide</a> for payout and refund gates.</li>
  <li><strong>Recheck current inputs.</strong> The <a href="/prop-firm-challenges">challenge comparison</a> exposes product-level prices and rules, the <a href="/prop-firm-challenge-changes">change ledger</a> shows material updates, and the <a href="/prop-firm-discount-codes">checked-offer hub</a> keeps public codes, automatic savings, and conditional coupons separate.</li>
  <li><strong>Read the product context.</strong> Use the <a href="/best-prop-firms-2026">19-firm source-dated ranking</a> only to shortlist; the <a href="/blog/ftmo-review">FTMO review</a>, <a href="/blog/fundednext-review">FundedNext review</a>, and <a href="/blog/topstep-review">Topstep review</a> state the currency, refund, and billing assumptions beside their generated tables.</li>
</ol>

<p>Fee recovery is only 1 input in the trader’s result. Use the <a href="/blog/is-prop-firm-trading-profitable">prop-firm profitability guide</a> to combine approved payouts and refunds actually received with every paid attempt, subscription, activation, reset, platform add-on, and withdrawal cost.</p>
