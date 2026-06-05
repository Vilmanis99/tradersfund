---
title: "The True Cost of Prop Firm Challenges (And How to Calculate It)"
slug: "true-cost-of-prop-firm-challenges"
date: "2026-05-20 12:00:00"
description: "Every prop firm advertises 'up to 90% profit split'. None of them publish the trading profit you actually need to make to break even. Here's the math."
type: "page"
---

<p style="color: var(--muted); max-width: 700px; margin-bottom: 2rem; font-size: 1.05rem; line-height: 1.65;">Every prop firm advertises &quot;up to 90% profit split&quot; and &quot;fee refunded with first payout.&quot; Almost none of them publish the actual trading profit you need to generate before you net the fee back. This page does that math, with the formulas every firm review on TFH uses internally.</p>

<div class="key-takeaways">
  <div class="title">The three numbers that matter</div>
  <ul>
    <li><strong>Break-even profit</strong> — the trading PnL you must generate before the first payout refunds your fee. Formula: <code>fee ÷ (profit_split / 100)</code>.</li>
    <li><strong>R-multiple</strong> — break-even profit divided by the dollar value of the maximum drawdown. R &lt; 1 = favorable risk math (you can lose more than you need to make). R &gt; 1 = hostile.</li>
    <li><strong>Day count</strong> — trading days to break even at 1% daily account growth, capped by the firm's daily-loss limit. A realistic floor, not a guarantee.</li>
  </ul>
</div>

<h2>Why this math is necessary</h2>

<p>Prop-firm marketing emphasizes the headline split (&quot;90%!&quot;) and the refundability of the challenge fee (&quot;100% refund on first payout!&quot;). Both are real. Neither answers the question a buyer actually has: <em>how much profit do I have to trade up to before this whole arrangement turns positive?</em></p>

<p>The structure of the prop-firm product matters. You pay a non-trivial fee upfront. You pass an evaluation (or skip it, on Instant products). You trade a funded account. You request a payout. The firm pays you your share — and refunds the fee on the first payout if the rules say so. The break-even profit is the amount you must generate on the funded side before the math nets to zero.</p>

<p>That number is not on any firm's marketing page. It varies by tier, by split, and by whether the fee is refundable. The math is simple; the firms just don&apos;t want it surfaced because it makes the cost of failure concrete.</p>

<h2>The formulas</h2>

<h3>Break-even profit</h3>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>break_even_profit = fee_usd / (profit_split_pct / 100)</code></pre>

<p>At a 90% split on a $489 FTMO $100K Challenge, you need <strong>$543</strong> of trading profit before the first payout pays the fee back. At an 80% split on the same fee, it&apos;s <strong>$611</strong>. The split matters more than most traders realize.</p>

<p><strong>If the fee is non-refundable</strong> (Stellar Instant, FXIFY Instant, Topstep activation fee), the formula doesn&apos;t apply — the fee is sunk cost. In that case, &quot;break-even&quot; is the first profitable trade.</p>

<h3>R-multiple</h3>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>R = break_even_profit / (account_size_usd × (max_loss_pct / 100))</code></pre>

<p>The R-multiple compares the profit you need against the loss you're allowed. Lower is better.</p>

<ul>
<li><strong>R = 0.1</strong> means the dollar value of the firm&apos;s maximum drawdown allowance is 10× the break-even profit. A single losing day at half-max-DD doesn&apos;t close your account — generous risk math.</li>
<li><strong>R = 0.5</strong> is the borderline. Half of your maximum loss budget equals your entire break-even profit.</li>
<li><strong>R = 1.0+</strong> is hostile. Your maximum allowed loss is equal to or less than the profit you need to generate. One bad trade ends the arrangement before you can recover.</li>
</ul>

<p>Example: FundedNext Stellar 2-Step $100K at 95% split with 10% max DD. Break-even = $549.99 / 0.95 = $579. Max loss budget = $100,000 × 0.10 = $10,000. R = 579 / 10,000 = <strong>0.058</strong>. Very favorable — you can absorb significant drawdown before the break-even math turns against you.</p>

<p>Counter-example: FXIFY Lightning $5K at 80% split with 10% trailing max DD. Break-even = $59 / 0.80 = $74. Max loss budget = $5,000 × 0.10 = $500. R = 74 / 500 = <strong>0.15</strong>. Still favorable, but notice the absolute loss budget ($500) is small. A 4% daily DD cap on a $5K account = $200 — one bad day removes 40% of your loss buffer.</p>

<h3>Day count</h3>

<pre style="background: var(--bg3); padding: 1rem; border-radius: 8px; overflow-x: auto;"><code>days = ceil( ln(1 + break_even_profit / account_size) / ln(1 + daily_growth_rate) )
where daily_growth_rate = min(0.01, daily_loss_pct / 100)</code></pre>

<p>This projects how many trading days it takes to compound to the break-even profit at 1% daily account growth, capped by the firm&apos;s daily-loss limit (which sets a realistic worst-case for daily PnL — a green day capped at the daily-loss size is the symmetric upside).</p>

<p>The day count is intentionally conservative. Real trading isn&apos;t linear compounding — but the number gives you a floor: if a firm says &quot;earn payouts on day 1&quot;, the day-count tells you whether the math actually permits it.</p>

<h2>Worked example — FundedNext Stellar 2-Step $100K</h2>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.95rem;">
  <caption class="hidden-caption">Worked example of true-cost math for FundedNext Stellar 2-Step $100K</caption>
  <tbody>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Fee</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">$549.99</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Profit split</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">95%</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Account size</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">$100,000</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Daily DD limit</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">5%</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Max DD limit</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">10% static</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Break-even profit</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">$549.99 / 0.95 = <strong>$579</strong></td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>Max loss budget</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">$100,000 × 0.10 = $10,000</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>R-multiple</strong></td><td style="padding: 10px; border-bottom: 1px solid var(--border);">$579 / $10,000 = <strong>0.058</strong> (favorable)</td></tr>
    <tr><td style="padding: 10px; border-bottom: none;"><strong>Realistic days @ 1%/day</strong></td><td style="padding: 10px; border-bottom: none;"><strong>1 day</strong> (because $579 is just 0.58% of $100K)</td></tr>
  </tbody>
</table>

<p>Read this as: <em>at a 95% split, the Stellar 2-Step $100K product asks you to generate $579 of trading PnL before you net the fee back; you have $10,000 of dollar drawdown to work with; a single 1% green day suffices to clear break-even.</em> That doesn't mean you'll do it. It means the structural math doesn't fight you.</p>

<h2>What the math doesn&apos;t capture</h2>

<p>This page is about <strong>cost</strong>, not <strong>probability</strong>. The math above tells you how much trading profit you need to break even; it says nothing about how likely you are to generate that profit, pass the evaluation, or take the first payout without tripping a rule.</p>

<p>Three factors that distort the cost picture in real life:</p>

<ol>
<li><strong>Pass-rate friction.</strong> If a firm publishes (or third parties estimate) a 16% Combine pass rate (Topstep&apos;s 2025 figure), then the &quot;average buyer&quot; pays for 6.25 attempts to fund a single account. Multiply the fee by that ratio for a true-cost-of-funded-account figure. Most CFD firms don&apos;t publish pass rates, but estimates cluster in 8–14% across the major firms.</li>

<li><strong>News-window and consistency rules.</strong> FundedNext retains 40% of news-window PnL. Some firms enforce a 50%-of-total-profit cap on a single day. These distort the math: high-variance trades count less toward the break-even profit than their nominal value.</li>

<li><strong>Trailing vs static drawdown.</strong> A trailing max-DD tightens as you profit, which means the R-multiple in the table is the <em>start-of-evaluation</em> figure. Halfway through a profitable challenge, your effective R rises. The static-DD products (FTMO Challenge, FundedNext Stellar) preserve the math; trailing-DD products (FXIFY Lightning, Topstep, MFF) compress it.</li>
</ol>

<h2>How to use these numbers</h2>

<p>Three takeaways for picking a challenge:</p>

<ol>
<li><strong>If the R-multiple is above 0.5, the structural math is hostile.</strong> You can probably pass — but if you do, you'll be one bad day away from giving back the fee. Pick a larger account size or a different firm.</li>

<li><strong>Compare the break-even profit, not the fee.</strong> A $489 FTMO $100K Challenge at an 80% split has a higher break-even ($611) than a $549.99 FundedNext Stellar 2-Step $100K Challenge at 95% ($579). The cheaper-looking firm is actually the more expensive one in the math.</li>

<li><strong>Day count is a sanity check, not a forecast.</strong> If a firm advertises &quot;day 1 payouts&quot; on a tier whose day-count math says 8 days minimum, the marketing is selling something the rules can&apos;t deliver. Cross-reference before purchasing.</li>
</ol>

<p>Every firm review on TFH includes a True Cost table per tier. The numbers come from the <code>computeTrueCost()</code> helper in our codebase — same formula across all firms, no editorial fudging. See the <a href="/blog/ftmo-review">FTMO review</a> or <a href="/blog/fundednext-review">FundedNext review</a> for the tables in context.</p>
