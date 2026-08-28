---
title: "Prop Firm Consistency Rule: Formulas and Examples (2026)"
seoTitle: "Prop Firm Consistency Rule: Examples (2026)"
slug: "what-is-prop-firm-consistency-rule"
date: "2024-11-22 17:13:02"
modified: "2026-08-28 12:00:00"
author: "Edris Derakhshi"
excerpt: "A prop-firm consistency rule can compare the best day with total profit, positive-day profit, or a target. Learn the formulas, stages, and consequences."
seoDescription: "Learn how prop-firm consistency rules work, compare current 15%-50% product examples, and calculate the extra profit needed after a large best day."
categories: ["Prop Firms"]
tags: ["prop firm consistency rule", "prop firm rules", "risk management"]
type: "post"
---

<p><strong>A prop-firm consistency rule measures whether too much of an account's result came from its best trading day.</strong> It can affect evaluation, funded-stage eligibility, or a payout request. The percentage alone is incomplete: a 50% rule can compare the best day with Positive Days' Profit at 1 firm and with a fixed Profit Target at another.</p>

<div class="key-takeaways">
  <div class="title">Consistency rules in 5 checks</div>
  <ol>
    <li><strong>Identify the stage.</strong> The rule may apply during evaluation, after funding, before a payout, or in more than 1 stage.</li>
    <li><strong>Find the denominator.</strong> Total net profit, Positive Days' Profit, and a fixed Profit Target produce different answers.</li>
    <li><strong>Read the consequence.</strong> Exceeding a threshold can extend the target or delay eligibility rather than automatically breach the account.</li>
    <li><strong>Treat each product separately.</strong> FTMO 1-Step records a 50% Best Day rule, while FTMO 2-Step explicitly does not apply that objective in the current capture.</li>
    <li><strong>Do not confuse rule families.</strong> Best-day, lot-size, profitable-day, and strategy-consistency conditions are separate tests.</li>
  </ol>
</div>

<h2>What is a prop-firm consistency rule?</h2>

<p>A best-day consistency rule compares the account's most profitable closed trading day with a named profit base. A product can use that calculation to decide whether the evaluation is complete or whether a reward can be requested. The named day boundary, open-position treatment, reset event, and required inequality can all change the result.</p>

<p>There is no safe firm-wide shortcut. Current captures show a 50% Best Day rule on FTMO 1-Step but no Best Day objective on FTMO 2-Step; FundingPips applies a 35% score only to the On Demand reward cycle on 2-Step Standard; and FXIFY applies its 25% Two Phase Classic percentage only in the funded stage. The exact product and stage matter more than the brand name.</p>

<h2>The 6 fields that define the rule</h2>

<table data-consistency-definition="six-fields" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Six fields needed to interpret a prop-firm consistency rule</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Field</th><th style="padding: 8px 12px; text-align: left;">Question to answer</th><th style="padding: 8px 12px; text-align: left;">Why it changes the result</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Stage</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Evaluation, funded account, payout, or scaling?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">A 25% funded rule can be N/A during 2 evaluation phases.</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Numerator</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Best closed day, largest trade, or another result?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">A best-day test is not a lot-size test.</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Denominator</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Net profit, positive-day profit, or Profit Target?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The same $3,000 day can pass 1 formula and miss another.</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Threshold</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Below, at or below, or no more than the percentage?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">A strict “below 50%” boundary differs from “no more than 50%.”</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Consequence</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Breach, delayed payout, extra profit, or a higher target?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Exceeding the figure does not always close the account.</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>Cutoff and reset</strong></td><td style="padding: 8px 12px;">Which timezone closes the day, and when does the calculation restart?</td><td style="padding: 8px 12px;">Trades spanning 00:00 or a payout can move between calculation windows.</td></tr>
  </tbody>
</table>

<p>If any 1 of these 6 fields is missing, do not reverse-engineer it from a percentage badge. Record the missing field and confirm it in the product's current rules before paying or requesting a reward.</p>

<h2>Three consistency-rule structures</h2>

<h3>1. Best day divided by an applicable profit total</h3>

<p>When the product explicitly uses a profit-share formula, the calculation is <code>best-day profit / applicable profit total x 100</code>. FTMO 1-Step names Positive Days' Profit as the denominator. Topstep's XFA Consistency payout path instead records total profit and a 40% limit. Those denominators should not be silently treated as identical.</p>

<h3>2. Best day compared with a fixed target</h3>

<p>Topstep's Trading Combine uses a 50% Consistency Target against the Profit Target. Its captured rule says the best day should stay below 50% of that target to avoid increasing the Consistency Target. This is not the same calculation as dividing the best day by whatever net profit is currently on the account.</p>

<h3>3. A published score with product-specific eligibility</h3>

<p>Some current product pages publish a percentage without enough captured text to reconstruct the complete formula. FundingPips Zero records a 15% maximum Consistency Score as a reward condition, while FXIFY Two Phase Classic records 25% only for the funded stage. In those cases, the honest calculation is “not fully captured,” not a guessed best-day denominator.</p>

<p>A lot-size consistency rule is separate. It can compare position sizes, contracts, or risk per trade even when a product has no best-day percentage. Likewise, a minimum profitable-day condition counts qualifying days; it does not calculate the share contributed by the largest day.</p>

<h2>Current product examples: 15% to 50% does not mean the same thing</h2>

<table data-consistency-examples="current-products" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.86rem;">
  <caption class="hidden-caption">Current product-level prop-firm consistency examples</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Product</th><th style="padding: 8px 12px; text-align: left;">Published rule</th><th style="padding: 8px 12px; text-align: left;">Stage and denominator</th><th style="padding: 8px 12px; text-align: left;">Captured consequence or caveat</th><th style="padding: 8px 12px; text-align: left;">Captured</th></tr></thead>
  <tbody>
    <tr data-consistency-example="ftmo:ftmo-challenge-1-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/ftmo-review">FTMO 1-Step</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">50% Best Day rule</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Challenge and reward; Positive Days' Profit</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Continue earning profit until no single day exceeds 50%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-28</td></tr>
    <tr data-consistency-example="topstep:trading-combine-standard-path"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/topstep-review">Topstep Standard Path</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">50% Consistency Target</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Trading Combine; Profit Target</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">A larger best day can increase the Consistency Target</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-consistency-example="topstep:xfa-consistency-path"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/topstep-review">Topstep XFA Consistency path</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">40% best-day limit</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Payout path; total profit</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Also requires at least 3 trading days with 1 trade per day</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-consistency-example="fundingpips:zero"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/fundingpips-zero">FundingPips Zero</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">15% maximum Consistency Score</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Reward eligibility; full denominator not recorded</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Also records 7 profitable days of at least 0.25% in each rolling 30-day period</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-27</td></tr>
    <tr data-consistency-example="fxify:two-phase-classic"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/fxify-review">FXIFY Two Phase Classic</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">25% Consistency Rule</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Funded stage only; N/A in Phase 1 and Phase 2</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Full denominator is not recorded in the current capture</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-10</td></tr>
    <tr data-consistency-example="fundednext:stellar-instant"><td style="padding: 8px 12px;"><a href="/blog/fundednext-review">FundedNext Stellar Instant</a></td><td style="padding: 8px 12px;">No consistency rule in the captured official FAQ</td><td style="padding: 8px 12px;">Phase-0 simulated instant-funded product</td><td style="padding: 8px 12px;">Still has a 6% trailing maximum loss and separate payout gates</td><td style="padding: 8px 12px;">2026-08-27</td></tr>
  </tbody>
</table>

<p>The <a href="/blog/my-funded-futures">My Funded Futures review</a> is a useful same-firm stage comparison. Rapid, Flex, and Pro apply their captured 50% rule during evaluation rather than funded payouts, while Builder records no evaluation percentage and a 50% rule after funding. The brand and percentage stay familiar; the applicable stage reverses.</p>

<p>The table is a dated product snapshot, not a permanent firm list. Use the <a href="/prop-firm-challenges">product comparison</a> for the current structured fields and the <a href="/prop-firm-challenge-changes">challenge-change ledger</a> for material rule updates. A null percentage means no verified numeric field unless the source explicitly says the rule does not apply.</p>

<h2>Consistency-rule calculator: the best-day share formula</h2>

<p>This worked example applies only when the firm's rule explicitly uses <code>best day / applicable profit total</code>. Assume the best day is $1,200, the current applicable profit total is $3,000, and the maximum is 30%.</p>

<table data-consistency-math="best-day-share" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Worked 30 percent best-day consistency calculation</caption>
  <tbody>
    <tr><th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);">Current consistency</th><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$1,200 / $3,000 x 100 = 40%</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);">Maximum allowed</th><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">30%</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);">Required applicable profit total</th><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$1,200 / 0.30 = $4,000</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left;">Additional applicable profit needed</th><td style="padding: 8px 12px;">$4,000 - $3,000 = $1,000</td></tr>
  </tbody>
</table>

<p>The reusable formula is <code>required applicable profit = best-day profit / decimal limit</code>. Then calculate <code>additional profit = max(0, required applicable profit - current applicable profit)</code>. If a later day exceeds $1,200, the numerator changes and the calculation must be run again.</p>

<p>Do not use this calculator for Topstep's Combine target rule. On the captured $100K Standard Path, the Profit Target is $6,000 and 50% is $3,000. A $3,500 best day is 58.33% of that fixed target, so it can increase the Consistency Target; it is not automatically the same as failing a 50% best-day-to-total-profit test.</p>

<div data-consistency-choice="fundednext" style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">Comparing a captured no-consistency-rule option?</strong> FundedNext Stellar Instant's official FAQ capture says there is no consistency rule. The current $10K tier costs $299.99, starts at a 70% Reward Share, is non-refundable, and uses a 6% trailing maximum loss, so removing 1 gate does not make the product low-risk. Read the <a href="/blog/fundednext-review">FundedNext review</a>, then <a href="/go/fundednext">check FundedNext's live Stellar Instant terms</a> only if the trailing-loss and payout rules fit the strategy. We may earn a commission; the partnership does not change the displayed terms or editorial score.
</div>

<h2>How consistency interacts with drawdown and overtrading</h2>

<p>Consistency does not replace daily or maximum loss. A trader can be below a 30% best-day cap and still breach a 4% trailing loss boundary. Conversely, one large profitable day can preserve the loss buffer but delay evaluation or payout eligibility. The <a href="/blog/balance-based-drawdown-vs-equity-based-drawdown">drawdown guide</a> explains why static, intraday-trailing, and end-of-day-trailing floors need separate calculations.</p>

<p>Trying to “dilute” a large best day by forcing extra trades can create <a href="/blog/what-is-overtrading">plan drift</a>. Additional low-quality orders add spread, commission, and loss exposure; they do not guarantee that the applicable profit denominator will rise. A pre-written session stop remains binding even when the consistency score is above its threshold.</p>

<p>The cash consequence also depends on stage. A payout-only rule can leave evaluation status unchanged while delaying realised income. The <a href="/blog/is-prop-firm-trading-profitable">net-cash profitability test</a> counts a reward only when approved and received, not when dashboard profit first appears.</p>

<h2>A pre-purchase and daily consistency worksheet</h2>

<table data-consistency-checklist="rule-sheet" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Prop-firm consistency rule worksheet</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">When</th><th style="padding: 8px 12px; text-align: left;">Record</th><th style="padding: 8px 12px; text-align: left;">Control</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Before checkout</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Exact product, stage, numerator, denominator, percentage, consequence, and source date</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Do not buy if the formula is material to the strategy but remains unclear</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Before session</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Current best day, applicable profit base, rule headroom, session-risk stop</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Keep the personal stop below the firm's breach boundaries</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>After session</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Closed-day profit, new best day, recalculated score, remaining target</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Use the firm's timezone and dashboard cutoff</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>Before payout</strong></td><td style="padding: 8px 12px;">Consistency, profitable days, safety cushion, minimum reward, KYC, and open positions</td><td style="padding: 8px 12px;">Treat every named gate as independent until approved</td></tr>
  </tbody>
</table>

<p>The broader <a href="/how-to-pass-a-prop-firm-challenge">challenge risk-plan worksheet</a> converts firm limits into pre-session controls, while the <a href="/how-prop-firm-challenges-work">challenge lifecycle</a> shows where evaluation, funded status, payout eligibility, and cash receipt separate.</p>

<h2>Frequently asked questions</h2>

<h3>What is the consistency rule in a prop firm?</h3>

<p>It is a product rule that measures profit concentration, commonly using the best trading day. The calculation can compare that day with Positive Days' Profit, total profit, or a fixed Profit Target, and it can apply during evaluation or before a payout.</p>

<h3>How do I calculate a 30% consistency rule?</h3>

<p>Only for a best-day share formula, divide the best-day profit by the firm's named applicable profit total and multiply by 100. A $1,200 best day divided by $3,000 is 40%; reducing that to 30% with the same best day requires a $4,000 applicable total.</p>

<h3>Does exceeding a consistency percentage fail the account?</h3>

<p>Not always. FTMO 1-Step says the trader must continue until the Best Day is no more than 50% of Positive Days' Profit, while Topstep says a best day above 50% of the Combine Profit Target can increase the Consistency Target. The product's stated consequence controls.</p>

<h3>Can a losing day change the consistency score?</h3>

<p>It depends on the denominator. A calculation based on Positive Days' Profit treats losing days differently from one based on net total profit. Do not include or exclude losses until the product terms define the applicable profit base.</p>

<h3>Is a lot-size consistency rule the same as a best-day rule?</h3>

<p>No. A best-day rule measures profit concentration, while a lot-size rule measures changes in position or contract size. A product may use either test, both tests, or neither.</p>

<h3>Which prop-firm products have no consistency rule?</h3>

<p>Current captures explicitly record no Best Day objective for FTMO 2-Step and no consistency rule for FundedNext Stellar Instant. That finding is product-specific and dated 2026-08-27; verify the live rules because another product from either firm can differ.</p>
