---
title: "3Commas Review: Pricing, Bots & API Risks"
seoTitle: "3Commas Review: Pricing, Bots & API Risks"
slug: "3commas-review"
date: "2025-07-04 11:56:39"
modified: "2026-08-18 12:00:00"
author: "Tara Mohseni"
excerpt: "A source-checked review of 3Commas pricing, DCA, Grid and Signal bots, exchange compatibility, API security, billing, and shutdown risks."
seoDescription: "3Commas review with current prices, bot limits, exchange support, API-security history, billing terms, and a practical live-account test plan."
categories: ["Trading Tools"]
tags: ["crypto trading bots", "DCA bot", "grid bot", "API security"]
type: "post"
sourceCapturedAt: "2026-08-18"
sourceUrls:
  - "https://3commas.io/pricing"
  - "https://help.3commas.io/en/articles/8420093-available-subscription-plans"
  - "https://help.3commas.io/en/articles/8420117-subscriptions-faq"
  - "https://help.3commas.io/en/articles/3108964-available-exchanges-and-supported-features"
  - "https://help.3commas.io/en/articles/4456595-3commas-security"
  - "https://3commas.io/blog/notice-on-api-data-disclosure-incident"
  - "https://help.3commas.io/en/articles/8146367-how-to-claim-a-refund"
  - "https://help.3commas.io/en/articles/3311526-what-happens-when-my-subscription-ends"
---

<p><strong>3Commas is software that sends trading instructions to a connected crypto exchange; it is not an exchange and does not hold the trading balance.</strong> The current paid plans are Starter at $20 monthly, Pro at $50, and Expert at $140. Those prices buy automation capacity, not a strategy or a promised return. A useful 3Commas review therefore has to test the bot logic, exchange connection, API permissions, failure states, and billing terms together.</p>

<p>The strongest use case is operational: run a defined DCA, Grid, or Signal-bot rule across a supported exchange while retaining the assets at that exchange. The largest risk is also operational: an API with trading permission can place damaging orders even when withdrawals are disabled. 3Commas officially confirmed a disclosure of some users' API credentials in December 2022 and says it has since added stronger controls. That history belongs in the purchase decision.</p>

<div data-tool-evidence-captured="2026-08-18" style="background: var(--bg2); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 12px; padding: 1.1rem 1.3rem; margin: 1.5rem 0;">
  <strong style="color: #fff;">Editorial position</strong>
  <p style="margin: 0.45rem 0 0;">Traders Fund Hub does not currently record an affiliate relationship with 3Commas. The verdict CTA uses our audited official redirect, and every time-sensitive product claim below links to a first-party 3Commas page captured on 18 August 2026. Commercial status contributes 0 points to this assessment.</p>
</div>

<div class="key-takeaways">
  <div class="title">3Commas in 7 checks</div>
  <ol>
    <li><strong>Free does not place real trades:</strong> it supports portfolio tracking on up to 2 exchange accounts and limited research, while live automation requires a paid plan or trial.</li>
    <li><strong>Starter is spot-focused:</strong> it lists 5 DCA bots, 2 Signal bots, and 2 Grid bots; futures require Pro or Expert.</li>
    <li><strong>Two current first-party pages conflict:</strong> the public pricing page displays active API-key limits of 1, 5, and 25, while the help centre lists 1, 3, and 15 active trading accounts.</li>
    <li><strong>Exchange support is feature-specific:</strong> an exchange connection does not prove that its spot, futures, margin mode, bot type, or regional account is supported.</li>
    <li><strong>Non-custodial is not loss-proof:</strong> 3Commas says its API access cannot withdraw or transfer funds, but trading permission can still create unauthorized positions and losses.</li>
    <li><strong>The 2022 incident is decision-relevant:</strong> 3Commas confirmed that API keys, secrets, and passphrases for some users were disclosed and could be used for unauthorized trades.</li>
    <li><strong>Stopping a subscription does not close everything:</strong> some bot trades and futures positions can remain open after a downgrade, so offboarding must be planned before connection.</li>
  </ol>
</div>

<h2>What 3Commas does</h2>

<p>3Commas connects to a centralized exchange through an API key or, on supported venues, Fast Connect. Its software can create and manage orders through DCA bots, Grid bots, Signal bots, SmartTrade, and terminal tools. The exchange remains the venue that holds the assets, calculates margin, and executes each instruction.</p>

<p>This separation matters. 3Commas can standardise when an instruction is sent, but it cannot make liquidity, spread, slippage, exchange uptime, symbol rules, leverage, or liquidation risk disappear. The exchange's fill and account state are authoritative. A 3Commas dashboard result should be reconciled with the exchange order history before it is used to assess a strategy.</p>

<p>A Signal bot is also not automatically <a href="/blog/what-is-copy-trading">copy trading</a>. It can receive a webhook or another external instruction without following a named trader's account. Copy trading transmits another account's orders; signal automation executes a condition or message. The risk question is the same in one respect: who can initiate an order, with what size, and under which shutdown rule?</p>

<h2>3Commas pricing and current plan limits</h2>

<table data-3commas-evidence="2026-08-18" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.86rem;">
  <caption class="hidden-caption">3Commas prices and selected plan limits captured on 18 August 2026</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Plan</th><th style="padding: 8px 12px; text-align: left;">Current displayed price</th><th style="padding: 8px 12px; text-align: left;">Markets and bot capacity</th><th style="padding: 8px 12px; text-align: left;">Best reason to consider it</th></tr></thead>
  <tbody>
    <tr data-tool-pricing="3commas-free"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Free</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$0</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">No real trading; up to 2 exchange accounts for portfolio tracking; limited AI and backtesting access</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Inspect the interface and research tools without granting trading permission</td></tr>
    <tr data-tool-pricing="3commas-starter"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Starter</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$20 monthly or $180 annually ($15 monthly equivalent)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Spot only; 5 DCA, 2 Signal, and 2 Grid bots</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">One small spot-only automation workflow</td></tr>
    <tr data-tool-pricing="3commas-pro"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Pro</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$50 monthly or $456 annually ($38 monthly equivalent)</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Spot and futures; 20 DCA, 20 Signal, and 10 Grid bots</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Several active strategies or futures support without Expert-scale limits</td></tr>
    <tr data-tool-pricing="3commas-expert"><td style="padding: 8px 12px;"><strong>Expert</strong></td><td style="padding: 8px 12px;">$140 monthly or $1,260 annually ($105 monthly equivalent)</td><td style="padding: 8px 12px;">Spot and futures; 1,000 each of DCA, Signal, and Grid bots; read-and-write developer API</td><td style="padding: 8px 12px;">High bot volume or software integration that genuinely exceeds Pro</td></tr>
  </tbody>
</table>

<p>The figures come from the <a href="https://3commas.io/pricing" target="_blank" rel="nofollow noopener">public pricing page</a> and the <a href="https://help.3commas.io/en/articles/8420093-available-subscription-plans" target="_blank" rel="nofollow noopener">subscription-plan guide</a>. The annual totals above translate the displayed monthly equivalents into the amount committed for 12 months: $180, $456, or $1,260. Local currency, VAT, a personal discount, or checkout changes can alter the payment, so save the actual order summary rather than relying on a monthly-equivalent headline.</p>

<h3>A current limit conflict to resolve before payment</h3>

<div data-3commas-pricing-conflict="active-accounts" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 12px; padding: 1rem 1.2rem; margin: 1.2rem 0;">
  <p style="margin: 0;"><strong>Unresolved first-party conflict:</strong> on 18 August 2026, the public pricing page displayed 1 Starter, 5 Pro, and 25 Expert active API keys. The help centre displayed 1, 3, and 15 active trading accounts for those same plans. Both descriptions refer to API keys used to place trades at the same time. If more than 1 active connection matters, get the applicable limit in writing before paying.</p>
</div>

<p>The public pricing page also says paid plans include 9 exchanges, while the live compatibility guide lists more exchange and account-type rows. These are not safely interchangeable counts: one venue can have separate spot, perpetual, regional, or sub-account behavior. Plan by the exact exchange, jurisdiction, market, and bot feature rather than by a logo or aggregate number.</p>

<h2>DCA, Grid, Signal bots, and SmartTrade</h2>

<h3>DCA bots</h3>

<p>A DCA bot can open a base order and add safety orders according to user-defined triggers. Averaging changes the entry price, but it also increases position size while price moves against the original trade. Before enabling a bot, define the maximum number of safety orders, total capital at the final order, liquidation distance for leverage, stop condition, and combined exposure across correlated pairs.</p>

<p>The current plan guide allocates 100 DCA backtests over 1 year to Starter, 500 over 2 years to Pro, and 5,000 over the available full history to Expert. A higher run allowance creates more ways to overfit. Keep one untouched validation period and record every tested parameter; the <a href="/blog/fx-replay-review">backtesting-integrity checklist</a> explains why future leakage, missing friction, and repeated parameter selection can turn historical simulation into a misleading result.</p>

<h3>Grid bots</h3>

<p>A Grid bot places repeated orders across a defined range. It can harvest oscillation only while the orders, fees, and inventory behavior fit the market. A sustained trend can leave a spot grid holding a falling asset or a futures grid carrying a leveraged position. Test range exits, gaps, insufficient balance, partial fills, fee drag, and the action taken when price leaves the grid.</p>

<h3>Signal bots</h3>

<p>A Signal bot converts external messages or Pine Script execution into orders. That reduces manual delay but adds a dependency chain: signal source, webhook authentication, network delivery, symbol mapping, exchange API, and order response. Test a duplicate signal, late signal, malformed size, unsupported symbol, close signal after a manual intervention, and a signal that arrives while the exchange is unavailable.</p>

<h3>SmartTrade and the terminal</h3>

<p>SmartTrade groups entry and management instructions such as multiple take profit, trailing behavior, break-even, and stop loss. The terminal offers a common interface across supported connections. These tools can make an execution plan repeatable, but the exchange still decides whether an order is accepted and where it fills. Confirm every protection order on the exchange itself after creation.</p>

<h2>Exchange compatibility is a four-part check</h2>

<p>The <a href="https://help.3commas.io/en/articles/3108964-available-exchanges-and-supported-features" target="_blank" rel="nofollow noopener">current exchange matrix</a> separates spot from derivatives and names feature differences for each venue. It also warns that some exchanges or account types are restricted by country and that not every supported exchange offers every 3Commas feature. Test all 4 parts before funding a workflow:</p>

<ol>
  <li><strong>Entity and region:</strong> verify the exact regional exchange account, not only the global brand name.</li>
  <li><strong>Market:</strong> verify spot, margin, USDT perpetual, inverse perpetual, or dated futures separately.</li>
  <li><strong>Feature:</strong> verify the intended DCA, Grid, Signal, SmartTrade, backtest, sub-account, and leverage-mode support.</li>
  <li><strong>Permissions:</strong> confirm that the minimum API permissions can perform the intended orders without enabling withdrawals or unrelated services.</li>
</ol>

<p>Use a separate exchange sub-account when the venue supports it. That isolates bot capital and makes the maximum exposure visible. A compatibility row is not evidence that a production-size order, stop, or shutdown path works correctly on the user's exact account.</p>

<h2>API security and the 2022 disclosure incident</h2>

<p data-3commas-security-incident="2022-api-disclosure">On 29 December 2022, 3Commas <a href="https://3commas.io/blog/notice-on-api-data-disclosure-incident" target="_blank" rel="nofollow noopener">confirmed that some users' API keys, secrets, and passphrases had been disclosed</a>. Its notice said the credentials could have been used to connect exchange accounts or initiate unauthorized trades. That is stronger and more useful evidence than calling the event a generic “hack” or relying on an unsourced user count.</p>

<p>The same notice includes a later vendor update claiming stricter encryption, isolated API-key environments, rate limiting, behavioral analytics, exchange-restriction checks, activity logs, alerts, and quicker revocation controls. Those measures are relevant improvements claimed by 3Commas; this review has not independently audited their implementation and does not treat them as proof that another disclosure or unauthorized trade cannot occur.</p>

<p>3Commas describes the service as non-custodial and says its transactional API access cannot withdraw or transfer fiat or crypto. That reduces one risk path, but it does not make the connection harmless. A trading-enabled key can buy illiquid assets, sell holdings, add leverage, or open positions that lose value. The official 2022 notice itself identified unauthorized trades as a possible consequence.</p>

<h3>Minimum security configuration</h3>

<ul data-3commas-security-checklist="least-privilege">
  <li><strong>Use a dedicated API key:</strong> never reuse the same key across 3Commas and another service.</li>
  <li><strong>Isolate capital:</strong> use a separate exchange sub-account and transfer only the amount assigned to the tested bot.</li>
  <li><strong>Grant least privilege:</strong> enable only the required trading market; leave withdrawals and transfers disabled.</li>
  <li><strong>Prefer constrained connection methods:</strong> use Fast Connect where available or the exchange's trusted-IP whitelist when using manual keys.</li>
  <li><strong>Protect both accounts:</strong> enable 2FA on the exchange and 3Commas, use unique passwords, save backup codes offline, and set the 3Commas anti-phishing code.</li>
  <li><strong>Monitor the exchange:</strong> enable order/login alerts and reconcile activity rather than relying only on the 3Commas interface.</li>
  <li><strong>Know the kill switch:</strong> practise stopping bots, cancelling orders, closing positions, and revoking the API key before increasing capital.</li>
</ul>

<p>These controls follow the platform's <a href="https://help.3commas.io/en/articles/4456595-3commas-security" target="_blank" rel="nofollow noopener">published security checklist</a>, with an added emphasis on limiting blast radius. They reduce exposure; they do not convert automated crypto trading into a low-risk activity.</p>

<h2>A connected-exchange test plan</h2>

<table data-3commas-test-plan="connected-exchange" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.86rem;">
  <caption class="hidden-caption">A staged 3Commas test before increasing live capital</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Stage</th><th style="padding: 8px 12px; text-align: left;">Test</th><th style="padding: 8px 12px; text-align: left;">Pass condition</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>1. No trading key</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Use Free and offline backtests to define entry, size, maximum additions, exit, and shutdown rules</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The rule can be followed without changing parameters after seeing results</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>2. Demo</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Run normal, duplicate, delayed, rejected, and close-signal cases on the selected paid-plan trial</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Every failure produces a known, visible state and notification</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>3. Isolated live key</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Connect a dedicated sub-account with minimum permissions and the smallest practical balance</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Open, modify, stop, close, and exchange records reconcile after costs</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>4. Failure drill</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Pause the bot, revoke the key, inspect orphan orders, and close any remaining position directly at the exchange</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The account can be made flat without depending on the automation service</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>5. Bounded scale</strong></td><td style="padding: 8px 12px;">Increase capital only after a pre-set number of reconciled trades and no unresolved exceptions</td><td style="padding: 8px 12px;">Maximum exposure remains inside the original cap at the last safety or grid order</td></tr>
  </tbody>
</table>

<p>Automation can enforce a written rule, or it can accelerate repeated off-plan orders. The <a href="/blog/what-is-overtrading">overtrading audit</a> shows how to compare planned entries, later attempts, turnover cost, and post-stop violations. Apply the same log to bot orders; “the bot did it” is not a separate risk category.</p>

<h2>What happens when the subscription ends?</h2>

<p data-3commas-offboarding="subscription-expiry">3Commas says a paid plan may remain active for a short, unspecified grace period before the account moves to Free. After that downgrade, active trades and SmartTrades are not automatically cancelled. Real DCA and Grid bots are disabled, but existing DCA trades and their averaging, take-profit, or stop orders may continue; spot Grid assets remain in the balance, and futures Grid positions may remain open.</p>

<p>Signal bots stop processing new open or close signals after the downgrade, although take-profit and stop orders already placed through the SmartTrade can continue. This creates a material offboarding risk: a trader who assumes “subscription ended” means “account is flat” can leave positions or orders live. Before cancellation or payment failure, stop each bot, reconcile every open order at the exchange, close or retain inventory deliberately, and revoke the trading key when the service is no longer needed.</p>

<h2>Trial, renewal, and refund terms</h2>

<p data-3commas-billing="trial-refund">The current <a href="https://help.3commas.io/en/articles/8420117-subscriptions-faq" target="_blank" rel="nofollow noopener">subscription FAQ</a> offers new users a 7-day Starter, Pro, or Expert trial after adding a valid card, Apple Pay, Google Pay, or PayPal method. It says no payment is taken at the start, reminders arrive 3 days before and on the final day, and the selected paid plan is charged if the trial is not cancelled before it ends.</p>

<p>Card, PayPal, Apple Pay, and Google Pay subscriptions recur by default; crypto subscription payments do not. Cancelling recurrence leaves access active until the displayed expiry date. A queued subscription can also start after an existing plan ends, so inspect Subscription History rather than checking only the currently active label.</p>

<p>The <a href="https://help.3commas.io/en/articles/8146367-how-to-claim-a-refund" target="_blank" rel="nofollow noopener">refund guide effective 18 December 2025</a> gives global, non-EEA users a full refund on the first monthly payment when requested within 15 days, but an immediately preceding 7-day trial counts inside that window. Second and later monthly payments have a 24-hour request window. EEA users are directed to a separate policy. Cancel recurring payment separately and confirm the policy applicable to the billing entity and country before relying on a refund.</p>

<h2>Benefits and limitations</h2>

<div class="pros-cons-table">
  <table>
    <thead><tr><th>Potential fit</th><th>Material limitation</th></tr></thead>
    <tbody>
      <tr><td>DCA, Grid, Signal bots, SmartTrade, and exchange connections in one interface</td><td>Every extra integration adds configuration, delivery, mapping, exchange, and monitoring failure modes</td></tr>
      <tr><td>Free research access and a 7-day paid-plan trial create a staged test path</td><td>The trial needs a payment method and converts to paid access unless cancelled</td></tr>
      <tr><td>Funds remain at the connected exchange and withdrawal permission is not required</td><td>Trading permission can still create unauthorized orders, leveraged positions, and losses</td></tr>
      <tr><td>Published spot/futures matrix helps narrow compatibility</td><td>Support varies by venue, region, account type, market, and feature</td></tr>
      <tr><td>Bot and backtest capacity scales clearly from Starter to Expert</td><td>Current first-party pages conflict on Pro and Expert active-account limits</td></tr>
      <tr><td>Existing trades are not abruptly deleted when a paid plan ends</td><td>Positions and orders can remain live after bots stop, requiring deliberate exchange-side offboarding</td></tr>
    </tbody>
  </table>
</div>

<h2>Verdict: automation infrastructure, not an edge</h2>

<p>3Commas is a plausible fit for a crypto trader who already has a testable rule, needs supported exchange automation, can isolate a small balance, and will monitor both the bot and the exchange. Starter covers a limited spot workflow. Pro is the practical step for futures or several strategies. Expert is difficult to justify unless the required bot volume, active connections, backtest allowance, or developer API genuinely exceeds Pro.</p>

<p>It is a poor fit for anyone seeking a profitable bot to copy, treating backtest output as a forecast, or assuming non-custodial access removes account risk. Resolve the active-account limit conflict, verify exact compatibility, run the failure drill, and understand what remains open after a downgrade before paying annually or increasing connected capital.</p>

<div style="display: flex; flex-wrap: wrap; gap: 0.7rem; margin: 1.5rem 0;">
  <a href="/go/3commas" data-affiliate-placement="verdict" target="_blank" rel="nofollow noopener" class="btn-primary">Check 3Commas' current plans</a>
  <a href="/blog/fx-replay-review" class="btn-outline">Use the backtest checklist</a>
</div>

<h2>Frequently asked questions</h2>

<div class="wp-block-rank-math-faq-block">
  <div class="rank-math-faq-item"><h3 class="rank-math-question">How much does 3Commas cost?</h3><div class="rank-math-answer">On 18 August 2026, the public page displayed Starter at $20 monthly or $180 annually, Pro at $50 monthly or $456 annually, and Expert at $140 monthly or $1,260 annually. Local currency, VAT, discounts, and checkout terms can differ.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Can the 3Commas Free plan trade real money?</h3><div class="rank-math-answer">No. The current plan guide says Free has no real trading and can connect up to 2 exchange accounts for portfolio tracking. Live trading is available during the 7-day paid-plan trial or on a paid plan.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Which 3Commas plan supports futures?</h3><div class="rank-math-answer">The current plan comparison assigns spot only to Starter and spot plus futures to Pro and Expert. The exact futures product, region, leverage mode, and bot still need to appear in the current exchange matrix.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Can 3Commas withdraw crypto from an exchange?</h3><div class="rank-math-answer">3Commas says its transactional access has no withdrawal or transfer permission. A trading-enabled API key can still place orders that create losses, so use least privilege, a dedicated sub-account, 2FA, alerts, and a tested revocation process.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Was 3Commas affected by an API-key incident?</h3><div class="rank-math-answer">Yes. Its official December 2022 notice confirmed that some users' API keys, secrets, and passphrases were disclosed and could be used for unauthorized trades. The company later described added security controls, which this review treats as vendor claims rather than an independent audit.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Do 3Commas bots close when a subscription expires?</h3><div class="rank-math-answer">Not necessarily. After the grace period and downgrade, bots can be disabled while existing trades, spot inventory, futures positions, or already placed take-profit and stop orders remain. Reconcile and close the exchange account deliberately before revoking access.</div></div>
  <div class="rank-math-faq-item"><h3 class="rank-math-question">Is 3Commas the same as copy trading?</h3><div class="rank-math-answer">No. A Signal bot can execute a webhook or condition without copying another account. Some third-party strategies may resemble copy trading, but the source, sizing, permissions, and execution chain still need separate verification.</div></div>
</div>
