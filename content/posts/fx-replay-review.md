---
title: "FX Replay Review: Pricing, Features & Limits"
seoTitle: "FX Replay Review: Pricing, Features & Limits"
slug: "fx-replay-review"
date: "2025-05-11 15:55:29"
modified: "2026-08-18 12:00:00"
author: "Edris Derakhshi"
excerpt: "A source-checked review of FX Replay pricing, plan limits, replay tools, analytics, prop-firm simulation, billing terms, and testing risks."
seoDescription: "FX Replay review with current pricing, plan limits, backtesting tools, prop-firm simulator details, refund terms, and a practical test plan."
categories: ["Trading Tools"]
tags: ["backtesting software", "strategy testing", "trading journal", "prop firm simulator"]
type: "post"
sourceCapturedAt: "2026-08-18"
sourceUrls:
  - "https://fxreplay.com/pricing"
  - "https://fxreplay.com/backtest"
  - "https://fxreplay.com/prop-firm-simulator"
  - "https://support.fxreplay.com/articles/what-are-the-differences-between-fx-replay-plans-and-their-pricing"
  - "https://support.fxreplay.com/articles/how-to-use-the-rr-simulator"
  - "https://support.fxreplay.com/articles/refund-policy"
---

<p><strong>FX Replay is a browser-based platform for replaying historical markets, recording simulated trades, and analysing a strategy without sending orders to a live broker.</strong> Its current pricing page lists a permanent Free tier, Intermediate at $17.99 monthly or $180 annually, and Pro at $35 monthly or $350 annually. The plan, data feed, friction settings, and test design determine whether it is useful; a profitable replay result does not establish a live edge.</p>

<p>The product now covers more than chart replay. Current pages list journaling, strategy analytics, Monte Carlo and risk/reward simulators, a TradingView-powered chart, and a configurable Prop Firm Simulator. Those tools can organise research, but they do not remove look-ahead bias, data differences, execution costs, or an actual prop firm's separate rule calculations.</p>

<div data-tool-evidence-captured="2026-08-18" style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">Editorial position</strong>
  <p style="margin: 0.45rem 0 0;">Traders Fund Hub does not currently record an affiliate relationship with FX Replay. The official CTA uses our audited outbound redirect, while pricing and feature claims link directly to FX Replay's own pages. Commercial status contributes 0 points to this assessment.</p>
</div>

<div class="key-takeaways">
  <div class="title">FX Replay in 6 checks</div>
  <ol>
    <li><strong>Free is a tier, not a timed trial:</strong> the current page says no card is required and the limited access does not expire.</li>
    <li><strong>Annual labels need translating:</strong> $15 and $29.16 are monthly equivalents of $180 and $350 annual payments, not the month-to-month prices.</li>
    <li><strong>Intermediate has research limits:</strong> 10 sessions, 200 records per session, 6-month retention, 3 indicators, and 2 charts are currently displayed.</li>
    <li><strong>Pro controls data depth:</strong> seconds data, Futures/CME data, custom timeframes, and unlimited core limits are shown only on Pro.</li>
    <li><strong>Simulation needs rule matching:</strong> the Prop Firm Simulator accepts user-entered limits; it is not an official firm's challenge engine.</li>
    <li><strong>Paid billing is consequential:</strong> subscriptions auto-renew and the published refund policy says payments are nonrefundable, including partially used periods.</li>
  </ol>
</div>

<h2>What FX Replay currently includes</h2>

<p>FX Replay's core workflow has 4 stages: select historical market data, hide the unseen future, place simulated orders, and review the recorded decisions. The <a href="https://fxreplay.com/backtest" target="_blank" rel="nofollow noopener">current backtesting page</a> lists chart-based execution, automatic risk sizing, auto break-even, replay controls, journaling, performance insights, Mentor AI, custom scripts, and the Prop Firm Simulator.</p>

<p>This is research and practice software, not a broker. FX Replay's own disclosure says it does not execute real trades or handle client funds. Spread, commission, data granularity, fills, latency, swaps, gaps, and broker-specific contract rules still have to be modelled or treated as limitations when a replay result is compared with live trading. Moving from replay to an exchange-connected tool also introduces API and shutdown risk; the <a href="/blog/3commas-review">3Commas review</a> provides a staged connection and revocation test.</p>

<h2>FX Replay pricing and plan limits</h2>

<table data-fx-replay-evidence="2026-08-18" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.86rem;">
  <caption class="hidden-caption">FX Replay prices and key plan limits captured on 18 August 2026</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Plan</th><th style="padding: 8px 12px; text-align: left;">Displayed price</th><th style="padding: 8px 12px; text-align: left;">Core limits</th><th style="padding: 8px 12px; text-align: left;">Data and analysis boundary</th></tr></thead>
  <tbody>
    <tr data-tool-pricing="fx-replay-free"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Beginner / Free</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$0; email required, no card</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2 sessions, 50 records, 1-month session duration, 1-week retention, 1 indicator</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Limited analytics; no multichart, seconds data, or Futures/CME data in the current comparison</td></tr>
    <tr data-tool-pricing="fx-replay-intermediate"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Intermediate</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$17.99 monthly or $180 annually ($15 monthly equivalent)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">10 sessions, 200 records per session, 6-month session duration and retention, 3 indicators, 2 charts</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Standard data, 3 strategies, strategy analytics, Monte Carlo and RR simulators; no seconds or Futures/CME data</td></tr>
    <tr data-tool-pricing="fx-replay-pro"><td style="padding: 8px 12px;"><strong>Pro</strong></td><td style="padding: 8px 12px;">$35 monthly or $350 annually ($29.16 monthly equivalent)</td><td style="padding: 8px 12px;">Unlimited sessions, records, duration, retention, indicators, charts, strategies, screenshots, and checklists</td><td style="padding: 8px 12px;">Expanded and seconds-level data, Futures/CME data, custom timeframes, and unlimited AI queries</td></tr>
  </tbody>
</table>

<p>The figures above come from the <a href="https://fxreplay.com/pricing" target="_blank" rel="nofollow noopener">live pricing page</a> captured on 18 August 2026. Taxes may apply. The annual Intermediate payment is $180 and the annual Pro payment is $350; displaying them as $15 or $29.16 per month does not create monthly cancellation at those rates. Recheck the checkout before paying because feature allocation and promotional pricing can change.</p>

<p>Both paid plans currently advertise a free trial without a credit card, but the page does not state a fixed trial duration, so this review does not assign one. The permanent Free tier is the safer place to confirm browser performance, chart workflow, the required asset, and whether a written setup can be entered consistently before starting a paid billing cycle.</p>

<h2>Which features change the research decision?</h2>

<h3>Replay, chart execution, and friction</h3>

<p>Replay mode conceals later price action and lets the user advance historical candles while placing simulated orders. The chart is powered by TradingView, but the historical series is still FX Replay's selected data rather than the eventual broker's execution record. Record the symbol, provider, timezone, session, contract specification, spread, commission, and slippage assumption beside every test.</p>

<p>Automatic risk sizing can standardise a stop-based position, while auto break-even and chart order controls can standardise management. They are useful only when the same rule would have existed before the trade. Repeatedly changing risk, stop placement, or management after seeing the outcome turns the replay into optimisation against known history.</p>

<h3>Journal, strategy analytics, Monte Carlo, and RR simulation</h3>

<p>The current plan comparison includes a journal on all 3 tiers and strategy analytics on Intermediate and Pro. Intermediate records up to 3 strategies; Pro displays unlimited strategies. Monte Carlo and risk/reward simulators are shown on both paid plans, allowing one recorded sample to be examined under different sequences or target assumptions.</p>

<p>The <a href="https://support.fxreplay.com/articles/how-to-use-the-rr-simulator" target="_blank" rel="nofollow noopener">RR Simulator documentation</a> says it includes only trades that had a stop loss at entry and requires at least 3 qualifying trades, while warning that larger samples are more reliable. That is a minimum software input, not evidence that 3 trades validate a strategy. Keep the original result beside every simulated alternative so a favourable target is not selected after testing many possibilities.</p>

<h3>Prop Firm Simulator</h3>

<p data-fx-replay-prop-simulator="user-configured">The Prop Firm Simulator is available on Intermediate and Pro. Its current instructions let the user enter a profit target, maximum daily loss, and maximum total loss, then remove the ordinary replay-back control during the session. The interface can practise rule awareness, but the accuracy of the exercise depends on the rules the user enters.</p>

<p>Do not treat a simulated certificate as approval or as proof that a paid evaluation will pass. Real products can use balance- or equity-based daily limits, static or trailing floors, reset timezones, minimum days, consistency tests, news windows, and payout gates. Translate the target product with the <a href="/how-to-pass-a-prop-firm-challenge">challenge risk-plan worksheet</a>, reconcile the loss formula in the <a href="/blog/balance-based-drawdown-vs-equity-based-drawdown">drawdown guide</a>, and record any best-day constraint using the <a href="/blog/what-is-prop-firm-consistency-rule">consistency-rule guide</a>.</p>

<h2>A backtest can fail even when the software works</h2>

<table data-fx-replay-test-plan="research-integrity" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.86rem;">
  <caption class="hidden-caption">FX Replay research-integrity test plan</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Failure mode</th><th style="padding: 8px 12px; text-align: left;">Control before replay</th><th style="padding: 8px 12px; text-align: left;">Reject the result when</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Look-ahead bias</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Hide future candles and define the entry, invalidation, exit, and skip rule before moving forward</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The setup label or rule was added after later price was seen</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Feed mismatch</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Record provider, symbol, timezone, candle type, and contract details</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The live venue's high, low, spread, or contract value changes the trade outcome</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Missing friction</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Set or deduct spread, commission, slippage, swaps, and missed fills</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The edge disappears under a reasonable adverse-cost case</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Selection bias</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Preselect the date range and keep rejected setups and losing sessions</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Dates or instruments were dropped because their results were unfavourable</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>Overfitting</strong></td><td style="padding: 8px 12px;">Freeze the final rules and run them on untouched dates or a different market regime</td><td style="padding: 8px 12px;">Performance survives only on the period used to design the settings</td></tr>
  </tbody>
</table>

<p>A useful workflow has 2 samples: a development sample for defining the rules and an untouched validation sample for checking them. The same date cannot be both. The <a href="/blog/wyckoff-pattern">Wyckoff testing framework</a> provides a worked example of recording a schematic, trigger, invalidation, data source, friction, and rejected setups without converting a chart label into a promise.</p>

<p>Replay also makes repetition fast, which can reinforce plan drift as easily as discipline. Use the <a href="/blog/what-is-overtrading">20-session overtrading audit</a> to compare planned and off-plan entries by order number instead of treating a larger trade count as automatically better evidence.</p>

<h2>Billing and cancellation risk</h2>

<p data-fx-replay-billing="nonrefundable-auto-renew">FX Replay's <a href="https://support.fxreplay.com/articles/refund-policy" target="_blank" rel="nofollow noopener">published refund policy</a> says paid access continues and automatically renews until terminated. It also says payments are nonrefundable and there are no credits for partially used subscription periods; after cancellation, access continues through the current billing period.</p>

<p>This makes the annual-plan decision larger than the advertised monthly equivalent. The listed savings are $35.88 on Intermediate and $70 on Pro, but the upfront commitments are $180 and $350. Test the asset coverage and workflow first, set a cancellation reminder, and save the checkout terms that applied when payment was made.</p>

<h2>Benefits and limitations</h2>

<div class="pros-cons-table">
  <table>
    <thead><tr><th>Potential fit</th><th>Material limitation</th></tr></thead>
    <tbody>
      <tr><td>Permanent Free tier and card-free paid trials reduce the cost of checking the workflow</td><td>The Free tier has tight session, record, retention, indicator, and data limits</td></tr>
      <tr><td>Replay, journaling, analytics, and simulators keep research in one browser-based workflow</td><td>One integrated workflow does not remove hindsight, feed mismatch, execution friction, or overfitting</td></tr>
      <tr><td>Intermediate includes strategy analytics and the Prop Firm Simulator without requiring Pro</td><td>Seconds data, Futures/CME data, custom timeframes, and unlimited limits require Pro</td></tr>
      <tr><td>Annual plans reduce the displayed 12-month price</td><td>Paid subscriptions auto-renew and the published policy makes payments nonrefundable</td></tr>
    </tbody>
  </table>
</div>

<h2>Verdict: useful for structured replay, not proof of an edge</h2>

<p>FX Replay is a plausible fit for a trader who can define a setup before seeing the outcome, needs a chart-and-journal workflow, and will validate the result on untouched dates with realistic costs. Beginner is enough to test the interface. Intermediate fits repeated forex-style research and configurable prop-firm practice; Pro is the relevant tier when seconds data, Futures/CME data, custom timeframes, or unlimited limits are required.</p>

<p>It is a poor fit when the goal is to generate a favourable equity curve by changing rules after each result, treat simulated fills as broker fills, or use a Prop Firm Simulator certificate as evidence of eligibility or payout. The software can record a disciplined test; it cannot make the underlying test disciplined.</p>

<div style="display: flex; flex-wrap: wrap; gap: 0.7rem; margin: 1.5rem 0;">
  <a href="/go/fx-replay" data-affiliate-placement="verdict" target="_blank" rel="nofollow noopener" class="btn-primary">Check FX Replay's current plans</a>
  <a href="/blog/wyckoff-pattern" class="btn-outline">Build a testable setup</a>
</div>

<h2>Frequently asked questions</h2>

<div class="wp-block-rank-math-faq-block">
  <div class="rank-math-faq-item"><h3 class="rank-math-question">How much does FX Replay cost?</h3><div class="rank-math-answer">The pricing page captured on 18 August 2026 lists Beginner at $0, Intermediate at $17.99 monthly or $180 annually, and Pro at $35 monthly or $350 annually. Taxes may apply.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Is FX Replay free or only a trial?</h3><div class="rank-math-answer">Beginner is currently a permanent limited tier that requires an email but no credit card. Intermediate and Pro separately advertise card-free trials; the current page does not state a fixed trial duration.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Which FX Replay plan includes futures and seconds data?</h3><div class="rank-math-answer">The current comparison assigns seconds data, Futures/CME data, custom timeframes, and expanded data to Pro. Confirm the exact instrument and history before paying.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Can FX Replay simulate a prop-firm challenge?</h3><div class="rank-math-answer">Intermediate and Pro include the Prop Firm Simulator. The user configures targets and loss limits, so the exercise is only as accurate as the entered product rules and does not constitute approval from a prop firm.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Does FX Replay refund unused subscription time?</h3><div class="rank-math-answer">Its published policy says payments are nonrefundable and there are no credits for partially used periods. Cancellation leaves access available through the current billing period.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Can an FX Replay backtest predict live profitability?</h3><div class="rank-math-answer">No. Historical simulation can test a defined rule set, but live results can differ because of data, spread, commission, slippage, liquidity, gaps, execution, market-regime changes, and overfitting.</div></div>
</div>
