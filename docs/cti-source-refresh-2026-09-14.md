# City Traders Imperium source refresh — 2026-09-14

## Scope

I re-read the four current City Traders Imperium programme pages and compared their server-rendered rules-at-a-glance and plan tables with the existing 2026-07-27 capture:

- [1-Step Challenge](https://citytradersimperium.com/1-step-challenge/)
- [2-Step Challenge](https://citytradersimperium.com/2-step-challenge/)
- [Instant Funding](https://citytradersimperium.com/instant-funding/)
- [Direct Funding](https://citytradersimperium.com/direct-funding/)

The current pages still expose 23 priced tiers: six 1-Step, six 2-Step, six Instant Funding and five Direct Funding. Prices, targets, drawdown methods, starting splits, payout gates and product-level trading permissions matched the prior structured capture, so the semantic merge reported zero material changes.

## Editorial boundary

The product pages state that CTI does not offer services to nationals or residents of Russia. That restriction is retained as a source note and is not treated as a generic “Russian-language” eligibility signal. The Help Center remained inaccessible to automated fetches, so refund, copy-trading and account-sharing details remain unverified.

## Verification

- Capture written locally: `content/data/challenges/_captures/city-traders-imperium-2026-09-14.json`.
- `node scripts/merge-capture.mjs city-traders-imperium --dir .preview/cti-capture-2026-09-14 --write` passed with zero material changes.
- `city-traders-imperium-review` remains audit-clean; the wider audit is still non-green because of unrelated stale datasets and comparison-index fixtures.
- No commit, push or deployment was made.
