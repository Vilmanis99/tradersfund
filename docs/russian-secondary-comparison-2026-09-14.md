# Russian FundedNext / FundingPips comparison — local checkpoint

Completed the existing `/ru/fundednext-vs-fundingpips` article adaptation. No new article, deployment, branch push, dependency, sharing image or sharing-metadata change. The Sites skill informed reuse of the Light Teal reading layout, plain Russian copy and named keyboard-scroll table regions; no browser visual QA was performed.

## Reader-facing changes

- Kept the product comparison and all existing affiliate campaigns, country boundary, Bright Funded review route and disclosures. Replaced mixed English/Russian marketing and implementation jargon with explanatory Russian.
- Expanded the three comparisons: no evaluation, one-stage and two-stage. Each explains targets, loss rules and payout-request conditions independently rather than asserting a permanent winner or borrowing one firm's values for both.
- Added Edris Derakhshi's visible author link and matching Person attribution, without claiming personal trading or payout verification. Editorial date is September 14; underlying product checks remain August 27.
- Added seven working contents anchors. The same-size cost evidence appears before the registration decision, followed by circumstances in which neither firm should be selected and all original programme-source links.
- The cost examples use $10K for the two no-evaluation programmes and $50K for the evaluation pairs. Each row identifies its actual account size and reward share. Existing `minimumCostToFundedUsd` and `challengeTierEconomics` helpers supply values; no separate fee-recovery arithmetic was introduced. Missing sizes never borrow a smaller tier's price, and unknown shares retain known expense without a calculated recovery figure.

## Evidence boundaries

Official pages checked during the work include FundingPips' [1 Step Flex](https://help.fundingpips.com/hc/en-us/articles/34501697434385-1-Step-Flex), [2 Step Pro](https://help.fundingpips.com/hc/en-us/articles/34502027344017-2-Step-Pro-Model) and FundedNext's [reward schedule](https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward). This editorial pass did not refresh product capture dates, prices or country eligibility evidence.

- Missing targets no longer imply no evaluation; later-phase gaps remain visible.
- Minimum days use the shared null/zero-safe label. Unknown percentages and invalid prices cannot become permissions, zero-cost offers or numeric garbage.
- Pairing requires both the named programme and matching actual stage count.
- The oldest programme date labels the source range. Valid calendar dates and the existing thirty-day checks control numeric rows. FAQ schema additionally requires complete current pairs, usable price evidence and the independent Stellar 1-Step timing source.
- The Stellar 1-Step business-day notice and product-specific timing helper are preserved. Request eligibility is distinguished from review, approval and receipt; a zero request-day value does not promise immediate transfer.
- Expired data leaves the explanatory article, explicit empty-state text and all programme-source URLs available. It does not keep current numeric recommendations or FAQ schema alive through a newer editorial date.

## Verification

- Targeted lint and changed-file whitespace checks pass.
- Actual-component fixtures cover five FAQ answers, author attribution, seven anchors, two keyboard-scroll regions, preserved sharing description, Russian wording, oldest-source labeling, missing/partial targets, unknown shares, absent matching tiers, invalid numeric inputs, mismatched evaluation phases, invalid/future/stale dates, and total price expiry. All fixture mutations are in memory and restored.
- `npm run test:russian-expiry` passes all 26 Russian pages and the English homepage across ten dates, including thirty-/thirty-one-day boundaries. Log: `.preview/local-secondary-comparison-rendering-final.log`.
- Actual local HTTP responses: comparison and sitemap both return 200; the page has nine programme records, shared cost output and author attribution; the existing sitemap URL has September 14 lastmod.
- Build compilation passes in 31.4 seconds and TypeScript in 25.6 seconds. Build exits 1 at `/best-prop-firms-in-india/bright-funded-vs-fxify` because the firms do not both pass its current India evidence gate. Log: `.preview/local-secondary-comparison-build.log`. No freshness guard was bypassed.
- Baseline September 14 audit after the separate Tradeify first-party refresh: **511 errors, 3 warnings**, exit 1. The Russian comparison's underlying FundedNext/FundingPips checks remain dated August 27; the wider stale-firm and comparison-index blockers are intentionally still visible. Log: `.preview/full-audit-after-tradeify-2026-09-14.log`.
- A later local pass synchronised the challenge-newsroom social-card counters with its 25-entry watch ledger and refreshed the MFFU lineup guard; the current full audit is **415 errors, 1 warning**. This is still not a release pass.
- The scoped `npm run audit -- tradeify` check is clean for `tradeify-review`; its exit remains non-zero only because the audit runner also reports unrelated global freshness and comparison-index findings.
- Diagnostic same-clock comparison only: running the unchanged audit in an isolated September 8 clock returns **255 errors, 3 warnings**, with exactly no added or removed findings against the prior Topstep checkpoint. Log: `.preview/local-secondary-comparison-audit-reference-date.log`. This is regression evidence, not a current-date release pass.

The full goal remains incomplete. Current-date source refreshes and release blockers remain; publishing still requires new explicit user approval. The old preview handle was missing and port 3214 refused connections, so a new retained local server was started successfully on the same address.
