# FXIFY price-source conflict — 2026-09-14

The current FXIFY program pages were checked before attempting a freshness merge. Their server-readable selected cards repeatedly show `$250` for a `$5k` account, while FXIFY's own pricing article publishes programme ranges (for example, One-Phase `$59–$2,950`) and the Underpayment FAQ uses a `$59` One-Phase `$5,000` example.

Because the pages do not expose a consistent complete tier ladder, the existing 8-product / 54-tier capture remains dated `2026-08-10`. No current prices were invented, and no `sourceCapturedAt` date was advanced. The conflict is recorded in `content/data/fxify-price-conflict-evidence.json` and `content/data/challenge-watch.json` with independently dated first-party observations for each affected product.

This means FXIFY remains excluded from freshness-gated rankings and the Bright Funded vs FXIFY India matchup still cannot prerender. The next safe action is to verify the actual checkout/API payload or obtain a stable first-party price table, then recapture FXIFY and its India eligibility evidence together.

### Local follow-up: checkout ladder recapture — 2026-09-15

The read-only official checkout at `https://trader.fxify.com/purchasechallenge` was checked without entering personal data or submitting a purchase. Its named selectors exposed exact list-price ladders for One Phase, Two Phase Classic, Two Phase Standard, Two Phase Pro, Three Phase, Instant Funding Standard, Instant Funding Lite and Lightning. The checkout contains 54 tiers across those 8 products.

The checkout is now the purchase-time source for `content/data/challenges/fxify.json`. It changes Instant Funding Lite to five tiers — `$2.5K/$5K/$10K/$25K/$50K` at `$19/$44/$85/$169/$289` — and removes the older `$100K` tier. FXIFY's February launch article still shows a different six-tier historical ladder, so that difference remains visible in the evidence notes. The generic `$250/$5K` cards on public programme pages are retained as a presentation caveat, not substituted into the structured prices. Coupons, add-ons, country eligibility and final checkout totals remain outside the list-price capture.

All eight product captures and the global FXIFY watch now carry `2026-09-15`; the review and dependent guide rows were updated to the same source date. This resolves the prior FXIFY freshness hold while preserving the public caveat about the program-page renderer.
