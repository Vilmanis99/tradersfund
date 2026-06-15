---
title: "How to Pass a Prop Firm Challenge (2026): A Risk-First Playbook"
slug: "how-to-pass-a-prop-firm-challenge"
date: "2026-06-15 12:00:00"
description: "Most traders fail the challenge by breaching drawdown, not by missing the target. Here's the risk-first plan that actually passes — with the real numbers and the rules that quietly end accounts."
type: "page"
---

<p style="color: var(--muted); max-width: 700px; margin-bottom: 2rem; font-size: 1.05rem; line-height: 1.65;">Most traders think passing a challenge is about hitting the profit target. It isn't. The target is the easy half. Almost every failed evaluation ends the same way — a breached daily or maximum drawdown, usually on a day the trader felt confident. Pass the challenge by treating it as a risk problem first and a profit problem second.</p>

<div class="key-takeaways">
  <div class="title">The plan in five lines</div>
  <ul>
    <li>Size every position off the <strong>daily loss line</strong>, not your account balance.</li>
    <li>Risk <strong>0.5–1% per trade</strong> so a losing streak can't breach the daily cap.</li>
    <li>Reach the target at <strong>~1%/day</strong> — an 8% target is eight clean days, not one heroic one.</li>
    <li>Know exactly where your <strong>maximum drawdown floor</strong> sits, especially on trailing-DD products.</li>
    <li>Pick a forgiving challenge — <strong>static drawdown, no time limit</strong> — before you pay.</li>
  </ul>
</div>

<h2>Passing is a risk problem, not a profit problem</h2>

<p>A standard two-step evaluation asks for an 8% profit target in Phase 1 and 5% in Phase 2. Those numbers sound demanding until you compare them to the thing that actually ends accounts: a 5% daily drawdown and a 10% maximum drawdown. You have months to make 8% — there's no time limit on most modern challenges (FTMO dropped its 30-day cap in 2023, FundedNext followed). You have one bad afternoon to lose 5%.</p>

<p>So the entire game is staying inside the drawdown lines long enough for a normal edge to compound to the target. Traders who blow challenges almost never blow them by failing to make money. They blow them by making money, getting confident, sizing up, and giving it all back through the daily cap in a single session.</p>

<h2>Size every trade off the daily loss line</h2>

<p>On a $100,000 account, the daily drawdown is typically 5% — a <strong>$5,000</strong> intraday loss line, anchored to your equity at the server-day open (usually UTC midnight). Here's the rule almost no one internalises: a profitable morning <em>does not</em> extend your afternoon allowance. The cap is fixed at open, regardless of how high your floating profit climbed.</p>

<p>Work it backwards. If your line is $5,000 and you risk <strong>1% ($1,000) per trade</strong>, you can take five losers in a row before the day ends you. Risk 0.5% ($500) and that becomes ten. Now ask: what's the longest losing streak your strategy has ever printed? If it's six and you're risking 1%, you are one normal streak away from a breach. That single calculation — streak length versus per-trade risk versus the daily line — is the difference between passing and resetting.</p>

<h2>Your maximum drawdown is your real account size</h2>

<p>The 10% maximum drawdown is the hard floor. On a $100K account that's a $90,000 line — and how it behaves depends entirely on the drawdown type, which is the single most important thing to check before you buy.</p>

<ul class="wp-block-list">
  <li><strong>Static drawdown</strong> (FTMO, FundedNext Stellar 2-Step, FundingPips): the floor is fixed at $90,000 and never moves. As you profit, the gap above the floor widens. This is the forgiving variant, and for most traders it's worth a slightly lower headline split.</li>
  <li><strong>Trailing drawdown</strong> (Topstep, My Funded Futures, FXIFY Lightning): the floor follows your equity high. Peak at $103,000 and your floor ratchets up to roughly $92,700. Give back a normal retrace and you've breached — while still up on the day. This is the rule that ends more funded accounts than any other.</li>
</ul>

<p>If you cannot say exactly where your floor sits after a $2,000 profitable day, do not trade a trailing-DD product with real money behind it. Browse <a href="/prop-firms/static-drawdown">firms with static drawdown</a> instead — the math is simply easier to survive.</p>

<h2>Hit the target slowly</h2>

<p>An 8% target at roughly +1% a day is eight clean trading days. There is no prize for getting there in two. Speed is where over-leverage creeps in: you take a 3% day, feel unstoppable, double your size, and hand it back. Set a daily profit goal of about 1%, and when you hit it, stop. The trader who makes 1% on twelve quiet days passes; the trader who makes 4% on Monday and gives back 6% on Tuesday does not.</p>

<p>A worked example on a FundedNext Stellar 2-Step $100K ($549.99 fee, 95% split, static drawdown): Phase 1 is $8,000 of profit, Phase 2 is $5,000. At 1%/day with a 60% win rate risking 0.75% per trade, that's a few unremarkable weeks. The fee comes back with your first payout, and 95% of what you make after that is yours. Nothing about that plan requires a hot streak — it requires not breaching.</p>

<h2>What actually fails traders</h2>

<p>These are the rules the marketing copy buries — the ones that end accounts after the hard part looked done:</p>

<ul class="wp-block-list">
  <li><strong>Trailing-drawdown math after a winning run.</strong> Covered above, and worth repeating: more funded accounts die here than anywhere else.</li>
  <li><strong>The daily cap anchored at server open.</strong> Your $5,000 line is measured from the balance at UTC midnight, not from your intraday high. Floating profit is not a buffer.</li>
  <li><strong>News-window rules.</strong> Some firms void trades opened seconds around Tier-1 releases (NFP, CPI, FOMC); others tax the profit. FundedNext, for instance, retains 40% of any profit made inside a news window even on a 95% account. If your edge is news, read the rule before you pay — see <a href="/prop-firms/news-trading">firms that allow news trading</a>.</li>
  <li><strong>Minimum trading days.</strong> FundingPips requires 5 trading days before payout. Pass the target in three and you still wait — fine, unless you assumed otherwise.</li>
  <li><strong>Consistency rules.</strong> Some firms cap how much of your total profit can come from a single day. One outsized winner can delay or void a payout. Read our <a href="/blog/what-is-prop-firm-consistency-rule">guide to the consistency rule</a> before you swing for one big day.</li>
  <li><strong>Revenge trading after the first loss.</strong> Not a firm rule — a human one. The reset fee is cheap; the tilt after a breach is expensive. Walk away on a red day at the daily goal in either direction.</li>
</ul>

<h2>I've blown one of these in a day — here's the lesson</h2>

<p>The first time I moved from a small personal account to a funded $50K, I sized like the number was real money I had to make back fast. I lost the account before the first week was out — not because my strategy stopped working, but because I took position sizes my strategy never called for. The account size is a target to protect, not a stake to chase. Trade the challenge exactly like you traded the demo that earned you the confidence to buy it.</p>

<h2>Pick a forgiving challenge before you start</h2>

<p>Half of passing is choosing well. The structurally easiest evaluations to survive share three traits: <strong>static drawdown</strong>, <strong>no time limit</strong>, and a daily cap you can actually trade inside. A 90% split on a challenge you pass beats a 100% split on one you breach. If you're cost-sensitive, compare entry fees on the <a href="/cheapest-prop-firms">cheapest prop firms</a>; if you trade trends or hold positions for days, start with firms that allow <a href="/prop-firms/overnight-holding">overnight holding</a>.</p>

<div style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">New here? Start small.</strong> If you're testing the prop-firm model for the first time, <a href="/blog/bright-funded-prop-firm">Bright Funded</a> is a low-stakes place to begin — entry sizes from $5,000 on forgiving static drawdown (5% daily / 10% max), and a standing <strong>10% discount</strong> that lowers the cost of a first attempt. <a href="/go/bright-funded?from=guide-howtopass" rel="sponsored nofollow noopener" target="_blank">Get funded with Bright Funded →</a>
</div>

<h2>Where to go next</h2>

<p>Run the break-even math before you buy — <a href="/true-cost-of-prop-firm-challenges">the true cost of a challenge</a> shows which fee structures are actually cheapest to clear. Then read the firms that consistently rank well for forgiving rules:</p>

<ul class="wp-block-list">
  <li><a href="/blog/ftmo-review">FTMO</a> — static drawdown, no time limit, the safe default.</li>
  <li><a href="/blog/fundednext-review">FundedNext</a> — 95% split on static-DD Stellar 2-Step, but mind the news-window rule.</li>
  <li><a href="/blog/funding-pips-review">FundingPips</a> — 100% scaling ceiling, 5-day minimum trading requirement.</li>
</ul>

<p>Or see the full opinionated ranking on <a href="/best-prop-firms-2026">the best prop firms in 2026</a>. Then do the boring thing that passes: size small, target slowly, and protect the line.</p>
