# My Funded Futures source refresh — 14 September 2026

This local refresh rechecked MFFU's current plan pages and the firm's own help centre before changing the challenge data or review. It is not a deployment approval.

## What changed

- New-purchase pages for Rapid, Builder and Pro describe one-time payment with no renewals. MFFU's terms distinguish these from legacy subscriptions purchased before 20 August 2026.
- MFFU's own Rapid EOD article and help-centre pages document a separate Rapid EOD product: 25K and 50K rules use EOD drawdown in the funded stage, 4 minimum evaluation days and 30% evaluation consistency.
- MFFU's own Flex article labels Flex legacy and no longer offered to new buyers. The legacy 25K/$95 and 50K/$153 subscription rows remain visible only to explain existing accounts.
- The restricted-country article explicitly lists Russia. `content/data/firms.json` now carries that country boundary for the aggregate firm record.

## Pricing boundary

The current plan pages are client-rendered and expose a selected tier price in server-readable text. The capture records only prices that map unambiguously to a tier: Rapid 50K `$209`, Rapid EOD 50K `$157` and Pro 50K `$265`. Other current selector prices are `null`; old July subscription figures were not reused as if they were current one-time checkout prices.

## Files and verification

- Capture archive: `content/data/challenges/_captures/my-funded-futures-2026-09-14.json`
- Normalized data: `content/data/challenges/my-funded-futures.json`
- Review: `content/posts/my-funded-futures.md`
- Watch ledger: `content/data/challenge-watch.json`

`node scripts/merge-capture.mjs my-funded-futures --dir .preview/mffu-capture-2026-09-14 --write --accept-changes` passed. The scoped MFFU audit is clean (one advisory warning); the repository-wide audit remains blocked by unrelated stale comparison fixtures and other firms. No commit, push or Vercel deployment was made.
