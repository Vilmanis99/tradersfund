---
title: "Balance vs Equity Drawdown: Prop Firm Rules Explained (2026)"
seoTitle: "Balance vs Equity Drawdown in Prop Firms (2026)"
slug: "balance-based-drawdown-vs-equity-based-drawdown"
date: "2024-11-21 17:51:30"
modified: "2026-08-14 12:00:00"
author: "Edris Derakhshi"
excerpt: "Balance and equity describe what a prop firm measures; static and trailing describe how its loss floor moves. Learn the formulas with current product examples."
seoDescription: "Learn how balance- and equity-based drawdown differ from static, real-time trailing, and end-of-day trailing prop-firm loss rules, with worked examples."
categories: ["Prop Firms"]
tags: ["prop firm drawdown", "daily loss", "trailing drawdown", "risk management"]
type: "post"
---

<p>Balance-based and equity-based drawdown describe which account value a rule references or observes. Static, real-time trailing, and end-of-day trailing describe how the breach floor moves. Those are separate dimensions: a balance-based limit can trail, and a limit calculated from balance can still be breached when account equity touches the floor.</p>

<div class="key-takeaways">
  <div class="title">Drawdown in five checks</div>
  <ol>
    <li><strong>Balance is closed P&amp;L.</strong> Equity is balance plus floating profit or loss, with any included trading costs.</li>
    <li><strong>Ask what sets the threshold.</strong> It can be initial balance, midnight balance, closed balance, or a high-water mark.</li>
    <li><strong>Ask what is monitored.</strong> A firm can calculate a floor from balance and enforce it against real-time equity.</li>
    <li><strong>Name the movement.</strong> Static, intraday trailing, and end-of-day trailing floors behave differently after profit.</li>
    <li><strong>Track 2 limits separately.</strong> Daily loss and overall maximum loss can use different anchors, percentages, and reset times.</li>
  </ol>
</div>

<h2>Balance drawdown and equity drawdown defined</h2>

<p><strong>Balance</strong> is the account value after closed trades and posted charges. If a $10,000 account closes a $300 loss, its balance becomes $9,700. An open position with $200 of unrealised profit does not change that balance.</p>

<p><strong>Equity</strong> is the current account value after including open profit and loss. With a $9,700 balance and $200 floating profit, equity is $9,900. If that position instead shows a $500 floating loss, equity is $9,200.</p>

<p>Market drawdown is often measured as <code>(peak value − current value) ÷ peak value</code>. A prop-firm breach rule is more specific: it defines a threshold, an observed account value, an update schedule, and what happens when the observed value reaches or crosses that threshold.</p>

<h2>The four questions hidden inside a “drawdown” label</h2>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Four dimensions of a prop-firm drawdown rule</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Dimension</th><th style="padding: 8px 12px; text-align: left;">Question</th><th style="padding: 8px 12px; text-align: left;">Possible answers</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Reference value</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">What sets the permitted loss amount or floor?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Initial balance, midnight balance, closed balance, equity high-water mark</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Observed value</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">What is compared with the floor?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Balance, equity, or a stated combination including costs</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Update timing</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">When can the floor rise or reset?</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Never, real time, end of day, midnight, after a payout</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>Terminal behaviour</strong></td><td style="padding: 8px 12px;">Can the floor fall, lock, or reset?</td><td style="padding: 8px 12px;">One-way trail, lock at starting balance, payout reset, no reset</td></tr>
  </tbody>
</table>

<p>The words “balance based” do not answer all 4 questions. FTMO 1-Step is the clearest counterexample: its maximum loss is described as balance-based and end-of-day trailing. The limit can increase but not decrease, and the captured rule resets it after a reward withdrawal.</p>

<h2>Current product examples</h2>

<p>The table uses structured product records and their underlying firm captures from 2026-07-27. Prices identify the exact $100K or $10K tier; the focus is the loss calculation, not which firm is universally easier.</p>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.88rem;">
  <caption class="hidden-caption">Current static and trailing prop-firm drawdown examples</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Product</th><th style="padding: 8px 12px; text-align: left;">Daily loss</th><th style="padding: 8px 12px; text-align: left;">Maximum loss</th><th style="padding: 8px 12px; text-align: left;">Floor behaviour</th><th style="padding: 8px 12px; text-align: left;">Captured</th></tr></thead>
  <tbody>
    <tr data-drawdown-example="ftmo:ftmo-challenge-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/ftmo-review">FTMO 2-Step $100K (€540)</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5% of initial balance; daily floor uses midnight balance minus $5,000</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">10% static; $90,000 floor</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The maximum floor does not trail; equity must remain above it, including open P&amp;L, commissions, and swaps</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-drawdown-example="fundednext:stellar-2-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/fundednext-review">FundedNext Stellar 2-Step $100K ($549.99)</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">5% daily loss</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">10% static; $90,000 floor</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Profits add headroom instead of moving the maximum-loss floor</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-drawdown-example="ftmo:ftmo-challenge-1-step"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/ftmo-review">FTMO 1-Step $100K (€499)</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">3% of initial balance; recalculated daily at 00:00 CE(S)T</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">10% balance-based end-of-day trailing</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The floor can increase but never decrease and resets after a reward withdrawal</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-07-27</td></tr>
    <tr data-drawdown-example="fundednext:stellar-instant"><td style="padding: 8px 12px;"><a href="/blog/fundednext-review">FundedNext Stellar Instant $10K ($299)</a></td><td style="padding: 8px 12px;">No daily-loss percentage captured</td><td style="padding: 8px 12px;">6% real-time trailing; $9,400 starting floor</td><td style="padding: 8px 12px;">The floor trails profit, locks at $10,000, and does not reset after a withdrawal</td><td style="padding: 8px 12px;">2026-07-27</td></tr>
  </tbody>
</table>

<p>These 4 rows show why a firm-level label is insufficient. FundedNext sells both static and real-time trailing products. FTMO sells a static 2-Step and a balance-based end-of-day trailing 1-Step. The <a href="/blog/my-funded-futures">My Funded Futures review</a> shows a stage change inside one futures firm: Rapid moves from an end-of-day evaluation trail to a real-time funded trail, while the other captured plans keep end-of-day rules. Compare the named product in the <a href="/prop-firm-challenges">challenge table</a>, use the <a href="/best-futures-prop-firms">futures comparison</a> for current intraday- and EOD-trailing paths, and use the <a href="/best-swing-trading-prop-firms">swing-trading shortlist</a> when both overnight and weekend permission must be true on that same product.</p>

<div data-drawdown-choice="fundednext" style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">Comparing FundedNext’s 2 paths?</strong> Stellar 2-Step’s $100K tier has a static $90,000 maximum-loss floor, while Stellar Instant’s $10K tier starts with a trailing $9,400 floor. Read the <a href="/blog/fundednext-review">FundedNext review</a> for all 4 products, payout rules, and current list fees. If the terms fit your strategy, <a href="/go/fundednext">view FundedNext’s current plans</a>. We may earn a commission; the partnership does not change the displayed terms or editorial score.
</div>

<h2>Three worked floor calculations</h2>

<table data-drawdown-math="worked-floors" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Worked static, daily, and trailing loss-floor calculations</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Rule</th><th style="padding: 8px 12px; text-align: left;">Calculation</th><th style="padding: 8px 12px; text-align: left;">Result</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$100K static 10% maximum loss</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$100,000 × (1 − 0.10)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$90,000 fixed floor</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">FTMO 2-Step daily floor after a $101K midnight balance</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$101,000 − ($100,000 × 0.05)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$96,000 daily floor; $90,000 maximum floor still applies</td></tr>
    <tr><td style="padding: 8px 12px;">$10K Instant 6% trailing amount after a $10,200 high</td><td style="padding: 8px 12px;">$10,200 − ($10,000 × 0.06)</td><td style="padding: 8px 12px;">$9,600 trailing floor</td></tr>
  </tbody>
</table>

<p>The daily and maximum floors operate simultaneously. In the FTMO example, equity at $95,900 breaches the $96,000 daily floor even though it remains above the $90,000 overall floor. At the next reset, the daily threshold can change; the static maximum floor does not.</p>

<p>For Stellar Instant, the trailing amount is 6% of the $10,000 starting size, or $600. A $10,200 high lifts the floor from $9,400 to $9,600. Once the account reaches a $10,600 high, the floor locks at the $10,000 starting balance rather than continuing above it.</p>

<h2>Static, real-time trailing, and end-of-day trailing</h2>

<h3>Static maximum loss</h3>

<p>A static floor is anchored to the initial balance and does not rise with profit. On a $100K account with 10% static maximum loss, $90,000 remains the overall boundary whether the account has never been profitable or has previously closed at $105,000. The extra profit creates headroom above the unchanged floor.</p>

<h3>Real-time trailing maximum loss</h3>

<p>A real-time trail can rise while profit raises the product’s defined high-water mark. The source must state whether that high-water mark uses balance, equity, or closed profit and whether the trail locks. A floating gain that briefly lifts an equity-based high-water mark can tighten the floor before the trade closes.</p>

<h3>End-of-day trailing maximum loss</h3>

<p>An end-of-day trail updates at the firm’s named daily checkpoint instead of every tick. FTMO 1-Step describes its maximum loss as balance-based end-of-day trailing: the floor can rise after the daily calculation, cannot move down, and resets when a reward is withdrawn. “End of day” still needs a timezone; FTMO’s daily calculation uses 00:00 CE(S)T.</p>

<h2>Daily loss is a separate calculation</h2>

<p>A product’s daily limit can use a midnight balance even when its maximum floor is static or trailing. FTMO 2-Step sets the daily threshold as the balance at midnight CE(S)T minus 5% of initial balance. With $101,000 at midnight on a $100K account, the daily floor is $96,000—not 5% below $101,000.</p>

<p>Open losses, closed losses, commissions, and swaps can count toward the observed equity even when the permitted loss amount is based on initial balance. That is why “balance-based daily loss” does not mean floating loss is ignored. Record the formula and the enforcement value separately.</p>

<h2>How payouts and profits can change the floor</h2>

<p>A payout can reduce balance, reset a trail, leave a locked floor unchanged, or have another product-specific effect. FundedNext Stellar Instant explicitly states that its locked trailing floor does not reset after a withdrawal. FTMO 1-Step states that its end-of-day maximum-loss limit resets when a reward is withdrawn.</p>

<p>Before requesting cash, calculate the post-payout distance between expected balance or equity and the active floor. The payout schedule and profit split belong in the <a href="/true-cost-of-prop-firm-challenges">true-cost analysis</a>, while the breach threshold belongs in the risk worksheet; neither number should be inferred from the other.</p>

<h2>A drawdown worksheet before each session</h2>

<ol>
  <li><strong>Write the initial balance and loss amount.</strong> Do not use the account headline without the product percentage or dollar rule.</li>
  <li><strong>Record the current daily anchor.</strong> Save the balance, equity, timezone, and reset timestamp used by the firm.</li>
  <li><strong>Record the current maximum floor.</strong> Copy it from the dashboard if the rule trails; do not reconstruct it from memory.</li>
  <li><strong>Add open and closed exposure.</strong> Include floating P&amp;L, commissions, swaps, and correlated positions if the rule observes equity.</li>
  <li><strong>Set a personal stop above both firm floors.</strong> The smaller remaining buffer controls the session.</li>
  <li><strong>Recalculate after a new high or payout.</strong> Confirm whether the floor moved, locked, or reset.</li>
</ol>

<p>The <a href="/how-to-pass-a-prop-firm-challenge">challenge risk-plan worksheet</a> turns these firm boundaries into position size and a personal session stop. For a shortlist limited to products explicitly recorded as static, use the <a href="/prop-firms/static-drawdown">static-drawdown comparison</a>; a null drawdown type is excluded rather than guessed.</p>

<h2>Frequently asked questions</h2>

<h3>Is balance-based drawdown always static?</h3>

<p>No. FTMO 1-Step records a balance-based end-of-day trailing maximum loss. “Balance based” names the reference value; “trailing” names how the floor moves.</p>

<h3>Can floating loss breach a balance-based rule?</h3>

<p>Yes, when the firm calculates the threshold from balance but compares real-time equity with it. FTMO 2-Step’s static $90,000 floor on $100K includes open positions, commissions, and swaps in the observed equity.</p>

<h3>Does floating profit always raise a trailing floor?</h3>

<p>No. A real-time equity trail may react to floating profit, while a closed-balance or end-of-day trail may wait for another event. Read the high-water-mark definition and update timing for the exact product.</p>

<h3>Which drawdown type is safest?</h3>

<p>There is no universal safest type. Static floors are easier to project, but suitability also depends on the loss percentage, daily rule, strategy holding period, fees, payout effects, and personal stop. Compare remaining dollar room rather than the label alone.</p>

<h3>Does a payout reset trailing drawdown?</h3>

<p>It depends on the product. FTMO 1-Step records a reward-withdrawal reset, while FundedNext Stellar Instant states that its locked floor does not reset after withdrawal.</p>

<h3>How often should I recalculate a prop-firm loss floor?</h3>

<p>Check before the session, after the firm’s daily reset, after any new trailing high, before and after a payout, and whenever the product terms change. Use the <a href="/prop-firm-challenge-changes">challenge-change ledger</a> to monitor material updates.</p>
