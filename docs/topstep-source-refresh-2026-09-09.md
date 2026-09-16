# Topstep source correction and release-audit follow-through

Local work only. Editorial date: September 9 in Riga; first-party observations were made September 8 UTC. The capture uses `2026-09-08`, not a future UTC date. No deployment, push, affiliate change or browser visual QA.

## Source findings and changes

- Rechecked both Trading Combine monthly paths and all six USD base prices against [Topstep pricing](https://help.topstep.com/en/articles/14289835-topstep-pricing-and-payment-questions). Prices remain $49/$99/$199 for Standard and $95/$149/$229 for No Activation Fee; activation remains $149/$0 respectively. Tax and optional services are separate.
- Recorded the [published tier loss amounts](https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit) as `maxLossUsd`: $2,000/$3,000/$4,500. No uniform maximum-loss percentage was invented. Both generated review cost tables now use those tier amounts through the existing helper; unknown minimum days leave modelled days unverified.
- The [Combine parameters](https://help.topstep.com/en/articles/8284197-trading-combine-parameters) and [marketing FAQ](https://www.topstep.com/topstep-prop) still differ on minimum days. Both product fields and the aggregate minimum are null, with the conflict retained, rather than asserting a verified two-day or zero-day minimum.
- The [payout policy](https://help.topstep.com/en/articles/8284233-topstep-payout-policy) distinguishes three conditional trading days on XFA Consistency from five qualifying winning days on XFA Standard. `payoutFirstDays` is null because one calendar-day scalar cannot express both routes. The existing review now distinguishes request qualification, approval and transfer, including regional Wise availability and the DLL-at-Combine-purchase condition for larger caps.
- Both pricing paths now have restricted automation/copying flags. The [platform guide](https://help.topstep.com/en/articles/14434175-topstepx) confirms TopstepX and limits its copier to Combine/XFA, not Live. The aggregate platform list has a narrow source citation; it is not a broad metadata or country-access refresh.
- The [Back2Funded guide](https://help.topstep.com/en/articles/12060405-back2funded-rules-guidelines-and-how-it-works) explicitly dates the seven-to-thirty-day extension to May 29. Removed the review's outdated equal-weight conflict description.
- The review explains the [eligibility policy](https://help.topstep.com/en/articles/8284116-am-i-eligible-to-trade-with-topstep) without treating Russian language, permanent residence or a Wise account as automatic approval. No regional access dataset was silently refreshed.

## Capture and propagation

`scripts/merge-capture.mjs` printed thirteen material changes for editorial review: six tier loss amounts, two unknown minimum fields, two unknown payout fields, two conditional rule flags, and one pricing-source URL. The reviewed capture was applied with the required explicit change acknowledgement and archived at `content/data/challenges/_captures/topstep-2026-09-08.json`.

The existing Topstep article retains Reviews v2 structure, seven FAQs, affiliate routing and two exact generated cost tables. The lifecycle, true-cost, profitability, consistency and introductory prop-firm guides have their affected Topstep rows and editorial dates updated. Other firms' source dates in those guides remain unchanged. Checks no longer require the misleading literal `null trading days`; they require conditional trading-day wording, consistency and the transfer-time distinction. Dollar loss checks use the structured tier field rather than the typography of an old note.

Added two public watch records: a verified correction to our representation and an unresolved minimum-day conflict. These are not claims that every observed rule changed in September. The feed now contains 23 records across 11 firms: 9 verified and 14 watches. Existing sharing-card assets, metadata and guard constants are untouched and remain a release blocker.

Trustpilot still carries July 27. Aggregate `lastUpdated`, affiliate details, country datasets and unrelated worktree changes are preserved.

## Verification

- `npm run test:topstep-correction`: passes six prices, conditional rules, UTC expiry boundaries, tier risk math, exact generated tables, five downstream guides, source/watch provenance and unchanged Trustpilot age.
- `npm run test:firm-platforms` and `npm run test:watch-evidence`: pass.
- `npm run test:russian-expiry`: all 26 Russian pages plus the English homepage pass across ten dates.
- `npm run test:article-content`: 37 published sources, 162 intact tables and three rendered pages pass. This is not browser layout QA.
- Targeted lint and changed-file whitespace checks pass.
- Local `/blog/topstep-review` returns HTTP 200 with the revised payment-method table and generated tier-risk values.
- Initial full audit: 255 errors and 3 warnings, down from the prior 294/3. Topstep's review-specific checks pass; seven firms still have wholly or partly stale product captures. Remaining overall/cheapest snapshots and sharing-card findings were not hidden by changing fixed expectations.
- Final audit: exit 1 with 255 errors and 3 warnings; Topstep is listed clean at 3,830 words. Log: `.preview/local-topstep-refresh-audit-final.log`. The reduction is 39 errors, not a clean release audit.
- Production-build attempt: compilation passed in 50 seconds and TypeScript passed in 101 seconds. Prerendering then failed on the existing `/prop-firm-challenge-changes` sharing-card guard: expected 16/9/5/11, received 23/11/9/14. Exit 1; log `.preview/local-topstep-refresh-build.log`. No guard bypass or sharing asset change was made.
- The local sitemap returns HTTP 200 and includes all six revised URLs with September 8 editorial dates. The retained preview server remains available on port 3214.
