---
title: How We Score Prop Firms
slug: methodology
date: 2026-06-04
description: The rubric, weights, and verification process behind every Traders Fund Hub firm review.
type: page
---

<h2>Our scoring rubric, in one paragraph</h2>

<p>Every firm in our directory is scored 0–10 on four axes, using the same rubric in the same order. We don&rsquo;t adjust the rubric to favour a firm we partner with, and we don&rsquo;t adjust it to penalise a firm we don&rsquo;t. The four axes are <strong>conditions</strong>, <strong>support</strong>, <strong>payouts</strong>, and <strong>platform</strong>. FTMO is our anchor reference at ~9 on most axes — when we score a new firm, we ask &ldquo;is this firm better or worse than FTMO at <em>X</em>?&rdquo; before we touch a number.</p>

<h2>The four axes</h2>

<h3>1. Conditions</h3>

<p>Spreads, leverage, slippage, instrument coverage, and platform stability under load. A 10 means institutional-tier execution. A 5 means mediocre retail. We score this from the firm&rsquo;s real funded-account spec — not the demo, not the marketing page.</p>

<h3>2. Support</h3>

<p>Response time, accuracy, and how the firm handles disputed account closures or rule-breach claims. We weigh public Discord and Reddit reports heavily here. A firm that &ldquo;passes&rdquo; the challenge stage but ghosts traders during payout disputes is scored down even when its product looks great on paper.</p>

<h3>3. Payouts</h3>

<p>Speed from approved request to bank or crypto delivery, fee burden, minimum thresholds, and historical reliability. We track this against the firm&rsquo;s claimed cycle — a firm that promises bi-weekly but delivers monthly gets penalised. Public payout proofs (with redacted PII) are how we calibrate this.</p>

<h3>4. Platform</h3>

<p>Native UI and dashboard quality, mobile parity, and account-management features. This is <strong>not</strong> the trading platform itself (that&rsquo;s under <em>Conditions</em>). It&rsquo;s the firm&rsquo;s own portal: does the dashboard show your current drawdown in real time, or do you have to calculate it from your equity curve?</p>

<h2>How we verify numbers</h2>

<p>Every numeric claim on every review traces back to a <code>sourceUrl</code> and <code>sourceCapturedAt</code> in our challenge dataset. Prices, profit splits, daily-drawdown percentages, payout cycles — all captured from the firm&rsquo;s public-facing pages, and re-verified on a rolling schedule. If a firm&rsquo;s website changes a number, we change ours within seven days or we flag the review as stale.</p>

<p>If we can&rsquo;t verify a number against a primary source, we write <code>null</code> in the data and add a note explaining what we&rsquo;d need to confirm it. We never invent fills or estimate &ldquo;typical&rdquo; numbers.</p>

<h2>The True-Cost calculation</h2>

<p>Every review&rsquo;s True-Cost table is computed in code, not by hand. The function takes the challenge price, account size, profit split, daily-loss cap, and max-loss cap, and returns three numbers:</p>

<ul>
  <li><strong>Break-even profit</strong>: how much trader-side profit the funded account must generate before the first payout repays the challenge fee.</li>
  <li><strong>R-multiple</strong>: break-even profit divided by the dollar value of the max-loss cap. <em>R &lt; 1</em> means the trader can afford to lose more than they need to make. <em>R &gt; 1</em> means the math is against them.</li>
  <li><strong>Days to break even</strong>: how many trading days it would take at +1 % per day (capped at the firm&rsquo;s daily-loss limit).</li>
</ul>

<p>You can see the function in <code>lib/firms.ts</code> if you want to audit our work. Same inputs always produce the same outputs.</p>

<h2>How we handle affiliate relationships</h2>

<p>We earn a commission on some firms when traders sign up through our links. We disclose this on every review page. Our scoring rubric does not change based on whether a firm is a partner. If anything, we&rsquo;re more critical of partners, because we don&rsquo;t want to send our readers to a firm that will burn them.</p>

<p>A firm being on our review list does not mean we have a partnership with them. We review firms because they matter to traders, not because they pay us.</p>

<h2>What we don&rsquo;t do</h2>

<ul>
  <li>We don&rsquo;t accept sponsorship for &ldquo;positive review&rdquo; placement.</li>
  <li>We don&rsquo;t hide negative findings to keep a partnership intact.</li>
  <li>We don&rsquo;t republish firm press releases as &ldquo;news.&rdquo;</li>
  <li>We don&rsquo;t score firms we haven&rsquo;t actually trialled or whose payout history we can&rsquo;t verify.</li>
</ul>

<h2>Spot a mistake?</h2>

<p>Every review has a publication and last-updated date in the meta strip. If a number has gone stale or a rule has changed, <a href="/contact">tell us</a> and we&rsquo;ll fix it. Most corrections are live within 48 hours.</p>
