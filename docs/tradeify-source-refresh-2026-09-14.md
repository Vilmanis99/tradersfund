# Tradeify source refresh — 2026-09-14

This local refresh re-read Tradeify's first-party help centre pages and merged the four current product paths (Growth Evaluation, Select → Flex, Select → Daily and Lightning Funded) at `sourceCapturedAt: 2026-09-14`.

## What was rechecked

- The Pricing Reference still lists 16 base one-time prices across 25K, 50K, 100K and 150K sizes.
- Growth evaluation targets, dollar DLLs, EOD trailing loss limits and the one-day pass route were rechecked.
- Select's 40% evaluation consistency, three-day minimum, no evaluation DLL and permanent Flex/Daily choice were rechecked.
- Lightning's no-evaluation route, current dollar risk limits, no minimum trading-day count and progressive 20% → 25% → 30% consistency were rechecked.
- Current rule pages confirm 4:45 PM ET flat time, no news blackout, conditional personal non-HFT automation, and same-owner copy trading only.

## Purchase-date payout boundary

The Select payout policy now publishes separate tables for accounts purchased before and after 1 September 2026. The newer tables lower the 50K–150K Flex caps to $2,500 / $3,500 / $4,500 and set Daily caps to $1,250 / $1,750 / $2,500 for those sizes. The Challenge schema has no payout-cap field, so these conditional values remain in the capture provenance and the public Tradeify watch entry rather than being collapsed into one product-level number.

Lightning's current payout article also distinguishes post-September 2025 accounts from legacy accounts. The product-level fields retain the current path and the archive records the legacy exceptions.

## Verification

- `node scripts/merge-capture.mjs tradeify --dir .preview/tradeify-capture-2026-09-14 --write` completed with 0 material product changes and 16 priced tiers preserved.
- `node scripts/gen-truecost.mjs tradeify` regenerated all four tables from `computeTrueCost()` (output reviewed locally; no hand-calculated values were introduced).
- `npm run audit -- tradeify` reports `tradeify-review` clean. The command still exits non-zero because unrelated stale-freshness and comparison-index checks remain elsewhere in the repository.
- No deployment, push, or Vercel build was started.

