---
title: "How to Pass a Prop Firm Challenge: A Risk Plan (2026)"
seoTitle: "How to Pass a Prop Firm Challenge: Risk Plan (2026)"
slug: "how-to-pass-a-prop-firm-challenge"
date: "2026-06-15 12:00:00"
modified: "2026-08-27 12:00:00"
description: "Build a prop-firm challenge plan from the product's exact target, drawdown, trading-day, and consistency rules before placing the first trade."
seoDescription: "Build a prop-firm challenge risk plan from exact loss limits, targets, trading days, consistency rules, and position-size math."
type: "page"
---

<p style="color: var(--muted); max-width: 700px; margin-bottom: 2rem; font-size: 1.05rem; line-height: 1.65;">No position size or daily target can guarantee that you pass a prop-firm challenge. A useful plan does something narrower: it translates one product’s loss limits into a smaller personal stop, sizes each trade from that stop, and lists every rule that can end or delay the account. This worksheet uses product data captured on 2026-07-27, 2026-08-10, and 2026-08-27.</p>

<p>Run the worksheet at €0 before paying when a matching practice account exists. The <a href="/blog/ftmo-free-trial-explained">current FTMO Free Trial guide</a> turns its 14-day 1-Step and 2-Step trials into a rule-fit test and compares the separate FundedNext trial without treating a demo pass as payout evidence.</p>

<div class="key-takeaways">
  <div class="title">The risk-first plan</div>
  <ol>
    <li><strong>Name the exact product</strong> — a firm can sell static, trailing, 1-step, 2-step, and phase-0 paths with different rules.</li>
    <li><strong>Record the firm’s loss lines</strong> — daily, maximum, static, trailing, or end-of-day trailing.</li>
    <li><strong>Set a smaller personal session stop</strong> — the firm’s breach threshold is an emergency boundary, not a suggested risk budget.</li>
    <li><strong>Size from the stop</strong> — planned loss divided by the instrument’s loss per unit at the stop distance.</li>
    <li><strong>Check non-price gates</strong> — trading days, consistency, news, holding, stop-loss, payout, and refund rules.</li>
  </ol>
</div>

<h2>1. Start with the exact product, not the account headline</h2>

<p>A “$100K challenge” is a notional rule base, not a complete risk specification. Before planning a trade, copy the target, daily loss, maximum loss, drawdown type, minimum days, and maximum days from the named product. The <a href="/how-prop-firm-challenges-work">five-stage challenge guide</a> explains where each rule applies; this page turns those rules into an execution plan.</p>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Current product rules used in the risk-plan examples</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Product / tier</th><th style="padding: 8px 12px; text-align: left;">Target path</th><th style="padding: 8px 12px; text-align: left;">Loss controls</th><th style="padding: 8px 12px; text-align: left;">Trading days</th><th style="padding: 8px 12px; text-align: left;">Captured</th></tr></thead>
  <tbody>
    <tr data-pass-plan="ftmo:ftmo-challenge-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FTMO 2-Step $100K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">10% then 5%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5% daily / 10% static max</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">4 minimum; no maximum captured</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-pass-plan="fundednext:stellar-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FundedNext Stellar 2-Step $100K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">8% then 5%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5% daily / 10% static max</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5 minimum; no maximum captured</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-27</td></tr>
    <tr data-pass-plan="fxify:lightning-challenge"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FXIFY Lightning $10K</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">3% daily / 4% trailing max</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">3 minimum / 5 maximum</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-10</td></tr>
    <tr data-pass-plan="fundingpips:2-step-pro"><td style="padding: 8px 12px;">FundingPips 2 Step Pro $100K</td><td style="padding: 8px 12px;">6% then 6%</td><td style="padding: 8px 12px;">3% daily / 6% static max</td><td style="padding: 8px 12px;">2 minimum per phase; no maximum captured</td><td style="padding: 8px 12px;">2026-08-27</td></tr>
  </tbody>
</table>

<p>The table shows why no universal “standard challenge” exists. FTMO 2-Step starts at 10%, FundedNext Stellar 2-Step starts at 8%, FundingPips 2 Step Pro repeats 6%, and FXIFY Lightning combines a 5% target with a hard 5-day maximum. Use the <a href="/prop-firm-challenges">current challenge comparison</a> to filter the full product set before choosing a plan.</p>

<h2>2. Turn the firm limit into a personal session stop</h2>

<p>The distance to a firm’s breach line is not the amount to risk. Open positions, closed losses, commissions, swaps, slippage, and the firm’s balance-versus-equity formula can all consume room. Record the official reset time and calculation method from the product rule page, then place a personal stop comfortably inside that boundary.</p>

<p>The following $100K FundedNext example is intentionally hypothetical. The 5% daily threshold is captured product data; the 20% safety fraction and 2-attempt limit are planning inputs, not FundedNext rules or a promise of safety.</p>

<table data-pass-risk-example="fundednext:stellar-2-step" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Illustrative personal risk budget inside the FundedNext daily threshold</caption>
  <tbody>
    <tr><th style="padding: 8px 12px; text-align: left;">Published daily threshold</th><td style="padding: 8px 12px;">5% of $100K = $5,000</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left;">Illustrative safety fraction</th><td style="padding: 8px 12px;">20% of the firm threshold</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left;">Personal session stop</th><td style="padding: 8px 12px;">$5,000 × 20% = $1,000</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left;">Maximum new attempts</th><td style="padding: 8px 12px;">2</td></tr>
    <tr><th style="padding: 8px 12px; text-align: left;">Planned loss per attempt</th><td style="padding: 8px 12px;">$1,000 ÷ 2 = $500 before costs</td></tr>
  </tbody>
</table>

<p>At a $1,000 personal stop, the second $500 planned loss consumes the whole personal budget; it is not permission for a third attempt. If multiple positions can lose together, their combined stop losses must fit inside the same $500 attempt budget. Lower the size again when gaps or slippage can exceed the entered stop.</p>

<h2>3. Calculate position size from the stop distance</h2>

<p>Use one formula for each instrument: <strong>position units = planned trade loss ÷ loss per unit at the stop</strong>. If the planned trade loss is $500 and one unit would lose $250 at the chosen stop, the arithmetic ceiling is 2 units. Round down to the platform’s valid size and include commission, spread, and slippage before submitting the order.</p>

<p>The “loss per unit” input changes across forex lots, futures contracts, CFDs, and crypto. Do not transfer a lot-size calculator from one asset class into another. A fixed 0.5% or 1% rule is not automatically safe when positions are correlated, stops can gap, or the remaining drawdown room is smaller than the starting allowance.</p>

<h2>4. Estimate the target from tested expectancy</h2>

<p>A profit target is a destination, not a daily quota. FundedNext Stellar 2-Step requires $8,000 in Phase 1 and $5,000 in Phase 2 on the $100K tier. If a tested strategy averaged $400 per session after wins, losses, and trading costs, the Phase-1 estimate would be $8,000 ÷ $400 = 20 sessions. Variance can make the realised path shorter or longer, and Phase-1 profit does not satisfy the separate Phase-2 target.</p>

<p>Do not invent a 1% daily target to force the calendar. Use a representative sample from the same instrument, session, stop method, and risk size. If the sample has negative or unknown expectancy, a paid challenge is an expensive place to discover that result. The source-checked <a href="/blog/fx-replay-review">FX Replay review</a> shows how to separate strategy development from an untouched validation sample and account for data, spread, commission, and slippage.</p>

<p>If the entry model depends on accumulation, distribution, springs, or upthrusts, the <a href="/blog/wyckoff-pattern">Wyckoff pattern guide</a> turns those labels into observable triggers and invalidations. A chart label added after the outcome is not part of the tested sample.</p>

<h2>5. Track the maximum-loss floor after every session</h2>

<ul class="wp-block-list">
  <li><strong>Static maximum loss:</strong> FundedNext Stellar 2-Step keeps a 10% fixed cap, so its $100K starting floor is $90,000. FundingPips 2 Step Pro is also static, but its 6% cap produces a different $94,000 starting floor.</li>
  <li><strong>Trailing maximum loss:</strong> FXIFY Lightning publishes a 4% trailing cap. Calculate the line using FXIFY’s named high-water-mark formula rather than assuming that every trailing product moves at the same time.</li>
  <li><strong>End-of-day trailing:</strong> Topstep’s Trading Combine updates from end-of-day balance and publishes tier-specific dollar amounts; the $100K Standard Path records a $3,000 maximum-loss amount, not one universal percentage.</li>
</ul>

<p>Write the current line into the plan before the next session. A static product offers a stable floor, while a trailing product can reduce give-back room after profit. Neither label tells you the daily cap, target, price, or payout rules; compare those fields separately in the <a href="/prop-firms/static-drawdown">static-drawdown directory</a>.</p>

<p>Static, real-time trailing, and end-of-day trailing limits update differently. Use the <a href="/blog/balance-based-drawdown-vs-equity-based-drawdown">drawdown calculation guide</a> to separate the reference balance, observed equity, update time, and payout-reset behaviour before copying a floor into the session sheet.</p>

<h2>6. Put every account-ending rule on one checklist</h2>

<ul class="wp-block-list">
  <li><strong>Trading-day gates:</strong> the 4 products in the table range from 2 minimum days per phase on new FundingPips 2 Step Pro accounts to FXIFY Lightning’s 3-day minimum and 5-day maximum.</li>
  <li><strong>Consistency:</strong> FXIFY Lightning records a 30% consistency rule. A large winning day can therefore change what remains necessary even when the target is close.</li>
  <li><strong>Mandatory protection:</strong> FXIFY Lightning requires a stop loss on every trade; a profitable trade can still violate that named rule if it was opened without one.</li>
  <li><strong>News windows:</strong> FundedNext credits only 40% of eligible funded-stage profit inside its Tier-1 window while 100% of losses remain. Check the <a href="/prop-firms/news-trading">current news-trading comparison</a> before building a release-day plan.</li>
  <li><strong>Overnight and weekend holding:</strong> permission differs by product and stage. Match the account to the strategy using the <a href="/prop-firms/overnight-holding">overnight-holding directory</a>.</li>
  <li><strong>Payout and refund:</strong> passing an evaluation does not itself create a payout or return the fee. First-payout days, minimum rewards, KYC, and refund timing remain separate gates.</li>
  <li><strong>Account control:</strong> third-party trading, shared credentials, copied signals, and vendor EAs can carry separate restrictions. Check the <a href="/blog/are-prop-firm-passing-services-worth-it">passing-services risk guide</a> before giving another person or tool access.</li>
</ul>

<p>A consistency percentage can describe evaluation, payout eligibility, or both, depending on the product. The <a href="/blog/what-is-prop-firm-consistency-rule">consistency-rule guide</a> shows how to distinguish the calculation base before one large day changes the plan.</p>

<h2>7. Use a before, during, and after-session control sheet</h2>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Prop-firm challenge session control sheet</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">When</th><th style="padding: 8px 12px; text-align: left;">Record</th><th style="padding: 8px 12px; text-align: left;">Stop condition</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Before</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Official daily and maximum-loss room, personal session stop, event windows, open positions</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Do not open if a rule or current line is unresolved</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>During</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Combined open and closed P&amp;L, estimated costs, attempt count, correlated exposure</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Stop at the personal limit, before the firm threshold</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>After</strong></td><td style="padding: 8px 12px;">Closing balance/equity, next daily reset, trailing high-water mark, days completed</td><td style="padding: 8px 12px;">Recalculate size if the remaining buffer changed</td></tr>
  </tbody>
</table>

<p>An attempt counter only works when its stop is enforced. The <a href="/blog/what-is-overtrading">overtrading guide</a> shows how to audit off-plan entries, size escalation, post-stop violations, and net results by trade order across 20 sessions.</p>

<h2>8. Choose the rule set your strategy can actually follow</h2>

<p>A static floor can simplify planning, but it does not automatically make a product cheaper or better. A no-maximum-day evaluation removes one source of time pressure, but minimum-day, news, consistency, holding, and payout gates still apply. Compare the <a href="/cheapest-prop-firms">entry prices</a>, then run the recovery math in the <a href="/true-cost-of-prop-firm-challenges">true-cost guide</a> instead of choosing by account headline or maximum advertised split.</p>

<div style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">Recheck the record before checkout.</strong> Challenge terms can move after this worksheet is published. Review the <a href="/prop-firm-challenge-changes">challenge-change ledger</a>, open the source-linked product row, and recalculate every dollar amount if the target, loss cap, drawdown type, or fee changed.
</div>

<h2>Frequently asked questions</h2>

<h3>How much should I risk per trade in a prop-firm challenge?</h3>

<p>There is no universal percentage. Start with a personal session stop inside the product’s firm threshold, divide it across the maximum number of simultaneous or sequential losses in the plan, and size the trade from its stop distance. Include correlated positions and trading costs in the same budget.</p>

<h3>How quickly can I pass?</h3>

<p>The answer depends on the target, tested expectancy, minimum days, and any maximum-day rule. FundedNext Stellar 2-Step has no captured maximum trading days, while FXIFY Lightning has a hard 5-day maximum. Neither product guarantees that a profitable strategy reaches its target in a fixed number of days.</p>

<h3>Should I stop after a profitable session?</h3>

<p>A firm rule may not require it, but the written plan should define when new risk stops for the session. A profit quota should not override the personal loss stop, a consistency calculation, a maximum-day limit, or the strategy’s tested entry conditions.</p>

<h3>What happens if I breach a loss limit?</h3>

<p>The account normally ends under the named breach rule. Do not assume a discounted reset or free retry: treat another attempt as a new cash cost until the product’s current checkout and rule page state otherwise.</p>
