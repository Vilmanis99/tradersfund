---
title: "What Is Copy Trading? How It Works and Its Risks (2026)"
seoTitle: "What Is Copy Trading? How It Works and Risks (2026)"
slug: "what-is-copy-trading"
date: "2025-06-11 15:51:55"
modified: "2026-08-14 12:00:00"
author: "Tara Mohseni"
excerpt: "Copy trading automatically replicates another account’s trade instructions. Learn how sizing, fees, slippage and prop-firm restrictions change the result."
seoDescription: "Learn how copy trading works, how copied positions are sized, why follower results differ, which costs matter, and how prop-firm restrictions apply."
categories: ["Copy Trading"]
tags: ["copy trading", "trade copiers", "social trading", "risk management"]
type: "post"
---

<p>Copy trading is a process that sends one account’s trade instructions to another account automatically. The receiving account can copy an entry, position size, stop loss, take profit, modification, and close. Automation reduces manual execution, but it does not guarantee the same price, percentage return, or risk on both accounts.</p>

<div class="key-takeaways">
  <div class="title">Copy trading in five points</div>
  <ol>
    <li><strong>Three parties are involved.</strong> A provider generates the trade, a follower authorises copying, and software or a venue transmits the instruction.</li>
    <li><strong>Sizing is a separate decision.</strong> Fixed lots, multipliers, equity ratios, and risk-based sizing can produce different exposure from the same signal.</li>
    <li><strong>Results diverge.</strong> Latency, spread, slippage, symbol mapping, leverage, minimum lot size, and fees can separate provider and follower returns.</li>
    <li><strong>Follower capital is not automatically provider AUM.</strong> The funds normally remain in the follower’s account; each platform defines how copied capital is reported.</li>
    <li><strong>Prop-firm permission is product-specific.</strong> Copying your own accounts, following a third party, and letting another person trade are 3 different rule questions.</li>
  </ol>
</div>

<h2>What is copy trading?</h2>

<p>Copy trading links a source account to one or more receiving accounts. When the source opens or changes a position, the copying system creates a corresponding instruction for each receiver according to its sizing and risk settings. The provider does not automatically own, pool, or control the follower’s cash merely because a trade is copied.</p>

<figure class="wp-block-image size-full is-resized rounded-img"><img src="/images/wp/2025/06/copy-trading-final.jpg" alt="One experienced trader sending copy-trade instructions to three follower accounts" class="wp-image-1991" style="width:840px;height:auto"/><figcaption>A source trade can be sent to several receiving accounts, but every receiver still needs its own size, broker, margin, and risk controls.</figcaption></figure>

<p>The labels vary by platform. The source can be called a provider, leader, master, strategy, or signal. The receiver can be called a follower, investor, copier, slave, or child account. Those names describe the direction of the instruction; they do not prove that the source trader is licensed to manage money or that the follower has delegated every decision.</p>

<h2>How copy trading works in six steps</h2>

<ol>
  <li><strong>The follower chooses a source.</strong> Selection can be based on a public profile, a private connection, a strategy marketplace, or another account owned by the same trader.</li>
  <li><strong>The follower sets allocation rules.</strong> These can include a fixed lot, multiplier, equity percentage, maximum open trades, symbol allow-list, and loss stop.</li>
  <li><strong>The source submits an order.</strong> The system reads the instrument, direction, order type, size, entry, stop, target, and later modifications.</li>
  <li><strong>The receiving venue checks the order.</strong> Available margin, market hours, symbol name, contract specification, and minimum lot size can accept, resize, delay, or reject it.</li>
  <li><strong>The follower gets a separate fill.</strong> That fill can be better or worse than the source price, particularly during fast markets or on different brokers.</li>
  <li><strong>Fees and reporting are applied.</strong> Spread, commission, financing, platform charges, and any performance fee are calculated under the follower’s own account terms.</li>
</ol>

<p>A copied order is therefore an instruction, not a guaranteed duplicate outcome. If the source closes at 1.08500 and the follower closes at 1.08480, both followed the same direction but realised different results.</p>

<h2>A copy-trading sizing example</h2>

<p>The table is hypothetical and assumes identical instruments, leverage, fills, and account currency. It demonstrates equity-proportional sizing; it is not a forecast or a platform default.</p>

<table data-copy-math="equity-proportional" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Hypothetical equity-proportional copy-trading calculation</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Input or result</th><th style="padding: 8px 12px; text-align: left;">Calculation</th><th style="padding: 8px 12px; text-align: left;">Value</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Provider equity</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Given</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$50,000</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Follower equity</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Given</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$5,000</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Equity ratio</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$5,000 ÷ $50,000</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">0.10</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Copied size</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">1.00 provider lot × 0.10</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">0.10 follower lot</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Follower gross result</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$5,000 × hypothetical 5%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$250</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Hypothetical performance fee</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$250 × 20%</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">$50</td></tr>
    <tr><td style="padding: 8px 12px;">Follower result after that fee</td><td style="padding: 8px 12px;">$250 − $50</td><td style="padding: 8px 12px;">$200 before execution and other costs</td></tr>
  </tbody>
</table>

<p>The idealised $200 result can be lower, zero, or negative after spread, commission, financing, slippage, currency conversion, and different fills. A 20% performance fee is only an example; actual platforms can use subscriptions, volume rebates, profit shares, high-water marks, or no provider payment.</p>

<h2>Copy trading vs mirror trading vs social trading</h2>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem;">
  <caption class="hidden-caption">Copy trading, mirror trading, and social trading compared</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Method</th><th style="padding: 8px 12px; text-align: left;">What is followed</th><th style="padding: 8px 12px; text-align: left;">Automation level</th><th style="padding: 8px 12px; text-align: left;">Follower control</th></tr></thead>
  <tbody>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Copy trading</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Another account’s trade instructions</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Usually automatic after connection</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Can include size caps, stops, pause, or manual close</td></tr>
    <tr><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><strong>Mirror trading</strong></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">A defined strategy or algorithm</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Strategy rules generate the orders</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">Normally set through strategy allocation and stop controls</td></tr>
    <tr><td style="padding: 8px 12px;"><strong>Social trading</strong></td><td style="padding: 8px 12px;">Profiles, statistics, posts, and trade ideas</td><td style="padding: 8px 12px;">Can be manual, automatic, or both</td><td style="padding: 8px 12px;">The user can observe, discuss, follow, or copy</td></tr>
  </tbody>
</table>

<p>A trade copier is the technical mechanism that transmits orders. A social platform adds discovery, profiles, statistics, and communication around that mechanism. The <a href="/blog/traders-connect-trade-copier">trade-copier review</a> illustrates a standalone account-linking tool, while the <a href="/blog/copyfx-review">CopyFX review</a> covers a broker-native strategy marketplace now called Copy Trading Service; the <a href="/category/copy-trading">copy-trading category</a> keeps the wider review set together. A signal bot is a separate case: the <a href="/blog/3commas-review">3Commas review</a> shows how a webhook or rule can trigger an exchange order without copying another trader's account.</p>

<h2>Four common position-sizing modes</h2>

<ul class="wp-block-list">
  <li><strong>Fixed lot:</strong> every receiver uses the same selected size. A 1.00-lot source can become 0.10 lots only if the follower explicitly sets 0.10.</li>
  <li><strong>Lot multiplier:</strong> the receiving size equals the source size multiplied by a factor such as 0.25 or 2.00.</li>
  <li><strong>Equity proportional:</strong> the source position is scaled by the receiver-to-source equity ratio, as in the 0.10 example above.</li>
  <li><strong>Risk based:</strong> the receiver targets a percentage or dollar loss using its own equity, stop distance, tick value, and contract specification.</li>
</ul>

<p>Equity proportional does not always mean equal risk. If one account has 30:1 leverage and another has 100:1, or if a broker maps gold to a different contract size, the same lot ratio can consume different margin. A missing stop loss also prevents a copier from knowing the intended maximum loss.</p>

<h2>Why copied results differ from the source</h2>

<ul class="wp-block-list">
  <li><strong>Latency:</strong> the follower order reaches its venue after the source order.</li>
  <li><strong>Spread and slippage:</strong> each account can receive a different bid, ask, or fill.</li>
  <li><strong>Symbol mapping:</strong> EURUSD, EURUSD.a, and EUR/USD may need an explicit mapping; an incorrect mapping can reject the order.</li>
  <li><strong>Contract specifications:</strong> lot value, tick size, minimum volume, and volume step can differ.</li>
  <li><strong>Margin and leverage:</strong> the follower may lack enough free margin even when the source can open the trade.</li>
  <li><strong>Account settings:</strong> a receiver can cap size, skip symbols, close early, or stop copying at a loss threshold.</li>
  <li><strong>Costs:</strong> commissions, financing, performance fees, subscriptions, and currency conversion are account-specific.</li>
</ul>

<p>These differences are most visible in short-duration strategies. When a source targets a few ticks, a 1-second delay and a wider spread can consume a larger share of the expected move than they would on a multi-day position.</p>

<h2>Copy-trading costs to record</h2>

<p>A “free” copy button does not prove that copying has no cost. Build a cash-and-execution checklist with 7 fields: spread, commission, overnight financing, performance fee, platform subscription, copier licence, and deposit or withdrawal charges. Record whether a performance fee uses gross profit, net profit, a high-water mark, or another calculation.</p>

<p>Provider compensation also varies. A provider may receive a percentage of eligible follower profit, a fixed subscription, a share of trading volume revenue, or no payment. The follower should compare the all-in cost; the provider should verify what activity is rewarded, because volume-based compensation can create a different incentive from performance-based compensation. The <a href="/blog/zulutrade-review">ZuluTrade fee review</a> shows why the exact account model matters: its current default is Zero Subscription, while Classic and Profit Sharing remain documented as legacy models.</p>

<h2>Risks for followers and providers</h2>

<h3>Follower checks</h3>

<p>A return chart needs context. Record the track-record length, maximum drawdown, longest losing period, open-position treatment, leverage, average holding time, number of simultaneous positions, and whether deposits or withdrawals distort the displayed percentage. A 50% return and a 50% drawdown do not cancel out: a $10,000 account that falls to $5,000 needs a 100% gain to return to $10,000.</p>

<p>Copying several providers does not guarantee diversification. If 3 sources all buy correlated USD pairs or the same equity index, separate profile names can still create one concentrated exposure. Aggregate risk across all copied positions before adding another provider.</p>

<h3>Provider checks</h3>

<p>A provider cannot assume followers receive identical execution. Disclose the instruments, typical holding time, leverage, maximum planned risk, and whether stops are always attached. Avoid changing the strategy merely to appear active; the <a href="/blog/what-is-overtrading">overtrading guide</a> explains why extra trades can increase exposure without improving the setup.</p>

<p>Public performance can also change incentives. Follower counts, rankings, and fee thresholds may reward short-term returns while hiding tail risk. A provider needs the same drawdown limit and shutdown rule before and after followers arrive.</p>

<h2>Copy trading on prop-firm accounts</h2>

<p>Prop firms commonly separate 3 activities: mirroring accounts owned by the same trader, following an external signal, and allowing a third party to operate the account. A product can permit the first, require approval for the second, and prohibit the third. “EA allowed” is not proof that all 3 forms of copying are permitted.</p>

<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem;">
  <caption class="hidden-caption">Current examples of product-level prop-firm copy-trading rules</caption>
  <thead><tr style="background: var(--bg3);"><th style="padding: 8px 12px; text-align: left;">Firm</th><th style="padding: 8px 12px; text-align: left;">Captured product result</th><th style="padding: 8px 12px; text-align: left;">What to verify</th><th style="padding: 8px 12px; text-align: left;">Captured</th></tr></thead>
  <tbody>
    <tr data-copy-rule="fxify"><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);"><a href="/blog/fxify-review">FXIFY</a></td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">4 restricted products and 4 prohibited products</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">The 4 phase products allow own-account copying; external copying needs approval and a 30-day named statement. Two Phase Pro, both Instant products, and Lightning prohibit copying.</td><td style="padding: 8px 12px; border-bottom: 1px solid var(--border);">2026-08-10</td></tr>
    <tr data-copy-rule="ofp-funding"><td style="padding: 8px 12px;"><a href="/blog/ofp-funding-review">OFP Funding</a></td><td style="padding: 8px 12px;">Copy trading is prohibited on all 9 captured products</td><td style="padding: 8px 12px;">The captured rule covers internal and external mirroring, including accounts owned by the same trader.</td><td style="padding: 8px 12px;">2026-07-27</td></tr>
  </tbody>
</table>

<p>The live <a href="/prop-firms/copy-trading">prop-firm copy-trading comparison</a> reads product-level verdicts from the challenge captures and shows their dates. Recheck the selected product before connecting a copier, and use the <a href="/prop-firm-challenge-changes">change ledger</a> to identify material rule updates.</p>

<p>A passing service is a separate risk: it gives another party control or signals intended to complete an evaluation. The <a href="/blog/are-prop-firm-passing-services-worth-it">passing-services guide</a> explains why a completed target can still lead to account closure if the method violates the firm’s conduct rules.</p>

<h2>How to evaluate a copy-trading setup</h2>

<ol>
  <li><strong>Define the relationship.</strong> Decide whether this is self-copying, following another trader, mirroring an algorithm, or account management.</li>
  <li><strong>Verify permission.</strong> Check the broker, platform, prop-firm product, jurisdiction, and account agreement separately.</li>
  <li><strong>Test symbol mapping.</strong> Confirm every instrument, contract size, and minimum volume on a demo or smallest permitted size.</li>
  <li><strong>Set receiving-account risk.</strong> Choose a sizing method, maximum position, maximum simultaneous exposure, and equity stop.</li>
  <li><strong>Measure divergence.</strong> Compare source and follower entry, exit, slippage, fees, and rejected trades over a representative sample.</li>
  <li><strong>Define failure behaviour.</strong> Decide what happens to open trades if the provider disconnects, the copier stops, or the receiver loses connectivity.</li>
  <li><strong>Review the full cost.</strong> Include execution costs and platform/provider charges rather than only the displayed subscription.</li>
  <li><strong>Keep a manual kill switch.</strong> Know how to pause new orders and whether existing positions remain open or close.</li>
</ol>

<h2>Frequently asked questions</h2>

<h3>Is copy trading suitable for beginners?</h3>

<p>Automation does not remove the need to understand position size, leverage, drawdown, and fees. A beginner who cannot explain the receiving account’s maximum loss should not treat another trader’s profile as a substitute for risk knowledge.</p>

<h3>Will a follower earn the same percentage as the provider?</h3>

<p>Not necessarily. Equal percentage performance requires compatible sizing, instruments, leverage, fills, costs, and timing. Any difference in those inputs can make the follower’s return higher or lower.</p>

<h3>Is a trade copier the same as a copy-trading platform?</h3>

<p>A trade copier is the order-transmission tool. A copy-trading platform can also provide source discovery, statistics, allocation, billing, and social features. One platform may include a copier, but the terms are not interchangeable.</p>

<h3>Can copy trading lose money?</h3>

<p>Yes. The source can lose, the follower can receive a worse fill, or incorrect sizing can create more exposure than intended. Historical returns and follower counts do not cap the next loss.</p>

<h3>Is copy trading legal everywhere?</h3>

<p>There is no global yes-or-no answer. Treatment can depend on jurisdiction, instrument, platform, provider compensation, marketing, and whether the activity becomes regulated account management or investment advice. Check the applicable provider agreement and local requirements rather than relying on a generic legality claim.</p>

<h3>Do prop firms allow copy trading?</h3>

<p>Some products allow own-account mirroring, some require approval, and others prohibit all copying. Check the exact product in the <a href="/prop-firms/copy-trading">dated product-level comparison</a>; a firm-wide yes or no can hide plan-specific restrictions.</p>
