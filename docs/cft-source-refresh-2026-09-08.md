# Crypto Fund Trader — source refresh and corrective follow-through

Internal research, September 8, 2026. The initial held investigation is recorded below, followed by the scoped local correction. No account registration, purchase, support message or deployment was made. This is not a fully resolved current product catalogue or a release sign-off.

The first-party check found substantive problems in the existing review, not just old dates. Do not copy the old review's assertions into a fresh capture.

## Purchase-relevant findings

| Item | First-party evidence | Required correction or unresolved question |
| --- | --- | --- |
| Instant reward | The [homepage's Instant scaling tables](https://cryptofundtrader.com/) start each initial account path at 50%, then show increasing shares. Generic homepage copy says 80%. | The review's universal 80% claim is unsupported. Confirm the applicable starting schedule, then regenerate Instant cost calculations using the appropriate split. Do not infer a September 8 policy change. |
| Ascend reward | [Terms section 8.vi](https://cryptofundtrader.com/terms-and-conditions/) lists fixed awards of $210/$420/$1,050/$2,100/$4,200/$8,400 for $5K/$10K/$25K/$50K/$100K/$200K. The plan ends after the two stages. | Remove the ongoing 80% account assumption. A percentage-split True-Cost table is not applicable to a fixed completion award. |
| Break activation | [Terms section 8.vii](https://cryptofundtrader.com/terms-and-conditions/) and the [FAQ](https://cryptofundtrader.com/faq/) publish additional activation fees of $138/$198/$328 for $25K/$50K/$100K, after passing and review. | Use existing tier-specific activation fields. The current review's entry-price-only cost statement omits a material charge. |
| Ascend prices | [Homepage](https://cryptofundtrader.com/): $45/$90/$225/$450/$899/$1,798. [Terms 5.6.5](https://cryptofundtrader.com/terms-and-conditions/): $39/$78/$195/$390/$780/$1,560. | Unresolved price conflict. Do not choose the cheaper source or refresh the dates on the old figures without qualification. |
| Break price and availability | [Homepage](https://cryptofundtrader.com/): $70/$139/$199; [terms 5.6.6](https://cryptofundtrader.com/terms-and-conditions/): $70/$140/$200. The [dedicated product page](https://cryptofundtrader.com/break-challenge/) says sold out. | Verify actual programme/platform availability without submitting an order. A fresh published fee does not prove purchasability. |
| Break minimum | Homepage evaluation rows show 1 traded day; the dedicated product table shows 0. | Keep the candidate minimum unknown and record both sources until reconciled. |
| Break trailing risk | Product page starts with $1K/$2K/$3K cash limits. FAQ describes 4%/4%/3% of the highest balance. | Initial amounts can be recorded, but the ongoing high-watermark calculation must not be silently reduced to a fixed offset. |
| General payout timing | FAQ distinguishes 15 traded days from an alternative 30-calendar-day schedule. | Neither an unconditional 15-calendar-day first payout nor a biweekly schedule accurately expresses this rule. |
| Instant upgrade | FAQ describes 10% simulated profit as the withdrawal/upgrade threshold. | It is not an evaluation phase-one target. An early reward request follows different timing conditions. |

## Prepared candidate and guard

- Draft: `.preview/cft-capture-2026-09-08/capture-crypto-fund-trader.json`. It records five existing products, their observed tier fees, scoped evidence, nulls for unsupported assumptions and ten explicit release blockers. It is not a complete current product catalogue: three-phase fees also appear in the terms, but current purchase availability was not established.
- Dry-run: `node scripts/merge-capture.mjs crypto-fund-trader --dir .preview/cft-capture-2026-09-08`. The semantic diff is saved as `diff.log` beside the candidate. No challenge data or capture archive is written by this preview.
- `reviewStatus: "draft"` or a nonempty `releaseBlockers` list now blocks writes even with `--accept-changes`. Invalid metadata and skipped captures return a non-zero status, so automation cannot mistake a rejected merge for a successful refresh. Existing captures without the new optional fields retain their normal explicit-diff-acknowledgement workflow.
- `npm run test:capture-merge` exercises the real CLI in an isolated scratch repository: previews, holds, malformed input, price-loss protection, unacknowledged material changes and successful legacy/ready writes. It checks exact target-file preservation and absence of an archive on held writes.

## Original release checklist

1. Resolve or explicitly represent the listed source conflicts and purchase-availability uncertainty; do not hide them solely in an unpublished raw archive.
2. Adapt the existing English CFT review and relevant Russian crypto-guide claims. Preserve its URL and Reviews v2 section order; do not add a duplicate review or replace substantive content with an empty disclaimer.
3. Use `computeTrueCost()` through the existing generator for applicable product tables. Include Break activation, avoid inventing an Ascend percentage split, and qualify Instant scaling and payout thresholds.
4. Prepare the public rule/price watch with first-party links. These are corrections/findings, not established effective policy-change dates.
5. Resolve each blocker, mark the capture ready, inspect the full semantic diff, merge locally, regenerate tables and run the firm-specific and full audits plus affected comparison/expiry checks. This research pass is not permission to deploy.

## Scoped corrective capture and existing-review rewrite

- The initial held draft was not promoted wholesale. A separate mixed-age capture in `.preview/cft-correction-2026-09-08/capture-crypto-fund-trader.json` was reviewed and merged locally through the normal semantic-diff acknowledgement. Its raw provenance is `content/data/challenges/_captures/crypto-fund-trader-2026-09-08.json`; the July archive remains. The diff retained 5 products and 24 tiers, with priced tiers reduced from 24 to 15. The reviewed correction had 36 material differences: 8 payout, 12 pricing, 12 risk, 3 rules and 1 source.
- Evaluation, Accelerated and Instant now carry September 8 dates. Each initial Instant selection was checked at 50%; the two evaluation models retain 80%. Conditional payout timing is represented by null calendar/frequency fields and explanatory notes. The three programmes retain explicit zero minimum trading days and verified unlimited evaluation time. Unknown Instant loss-floor basis and general copy permissions remain null.
- Ascend and Break remain dated July 27 and unpriced. Ascend's percentage share was removed because its fixed award is a different contract. Break's tier-specific activation fees and initial cash loss caps were recorded, but no verified entry quote or complete running-floor algorithm was inferred. No programme was declared discontinued, and no 3-Phase product was added solely because fees appear in the terms.
- The existing English review now has approximately 3,215 words, the required ordered sections and confirmed Edris authorship. It removes the universal 80%, crypto-only and biweekly assumptions and explains the fixed award, activation costs, conditional timing and remaining purchase conflicts. All three applicable True-Cost tables are exact generator output; Instant's 10K fee-recovery amount is $950 rather than the former $594. No Ascend or Break fee-recovery table is presented. This is substantive correction of the original URL, not a new thin article.

## Public explanation and downstream follow-through

- The firm card's blanket profit-share, payout-frequency and drawdown-type fields are now null because no single value accurately describes these programmes. The old firm/Trustpilot dates are not refreshed by that correction.
- Added a verified reward/timing correction for the three checked programmes and an unresolved Ascend/Break price/availability watch, both observed September 8. The latter cites `crypto-fund-trader-conflict-evidence.json` and uses separately validated conflict observations. Full product dates stay July 27; a newer conflict date cannot move the products into a fresh-price shortlist. No effective policy-change date is asserted.
- Updated the existing Russian crypto guide with a dated explanation and links to the full English review and product-focused watch. Corrected the shared crypto watch text: three programmes have been rechecked, so it no longer says all five are unchecked. The July market/platform evidence date remains unchanged, and CFT is not added to the crypto ranking without exact programme/platform/instrument verification.
- `npm run test:cft-correction` checks mixed dates, unknown purchase fees, activation costs, aggregate nulls and exact generated review tables. Extended provenance tests reject promoting conflict observations to verified changes, incomplete source/product scope, missing quotes and malformed paths. The actual Russian page renders the correction and correct watch handoff at all eight tested clock dates. These checks do not establish purchasability, successful KYC, a customer payout or complete release readiness.

## Still unresolved

Ascend/Break source conflicts and availability; the complete platform/market mapping; Instant's exact loss-floor basis; any unverified programme-specific fees, refund or reward details; and the complete current catalogue. The review still fails the strict freshness audit because the two incomplete product records retain old dates. Do not erase that failure by relabelling the dates. See the delivery log for terminal build/audit results and the separate sharing-image approval boundary.
