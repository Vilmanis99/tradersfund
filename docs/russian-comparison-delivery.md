# Russian-first comparison delivery

Direction: turn the existing Russian section into a useful comparison service for Russian-speaking traders worldwide, with original editorial explanations supporting the tools. Preserve established URLs and the English site. Do not copy competitor content, review scores, affiliate codes or eligibility claims.

## Implemented in this release

- Shared server-side challenge projection for English and Russian; source age evaluated on page regeneration.
- Russian finder on the existing `/ru/luchshie-prop-firmy` URL: 14 captured programmes across FundedNext, Bright Funded, FundingPips and non-affiliate FTMO as of September 8, 2026.
- Exact account-size, phase, currency, budget and drawdown filtering. Currency-specific price ordering; no implicit FX conversion or commercial weighting.
- Three-product comparison with differences highlighted, shareable fragment URLs, missing-data labels, source dates, fee-floor caveats and country/KYC boundaries.
- Compact homepage entry preserving the two disclosed primary partners; no restored article wall or new mass-generated pages.
- Count-free generated English social card. Retired bitmap archived rather than used as current evidence. Expiring datasets must not throw during ISR and freeze cached comparisons.
- Russian homepage and ranking sitemap editorial dates updated; existing route/hreflang mappings retained.

## Verification

- `npm run test:finder`: projection parity, independence from partner flags, currency/budget boundaries, filtering, share-state round trips, malformed input, unknown fields and day-30/day-31 source expiry.
- `npm run check:finder-release [base-url]`: all 26 Russian URLs, HTTP 200, one H1, language, self-canonical, sitemap inclusion and changed-route lastmod; source-backed server-rendered finder rows; disclosure and country boundary; generated PNG dimensions.
- Production build: 509 pages; changed comparison routes have hourly regeneration.
- Browser: homepage selection carried through; EUR 300 filter excluded USD offers; two-product comparison and copy/reload restored selections; article-anchor navigation retained the shortlist; 390 px page had no document-wide overflow; table scrolls internally; no captured console errors.
- Full audit remains non-green: 326 errors recorded in `.preview/finder-audit.log`, primarily existing stale evidence and snapshot/content issues. Full release crawl retains 56 existing non-Russian errors in `.preview/finder-crawl-final.log`; Russian finder-related fragment failure was resolved with validated state-fragment handling, not an unrestricted anchor-check bypass.

## Remaining work toward the full objective

### September 8 follow-up: source expiry

- Added hourly revalidation at the Russian layout, so all 26 existing pages can re-evaluate source age without a deployment. ISR is request-driven and the triggering request may receive the previous cached version; it is not an exact-time removal guarantee.
- A simulated-clock rendering test exposed crashes in both FundedNext head-to-head pages after product expiry. Missing comparisons now have a safe fallback, while existing explanatory content and URLs remain intact.
- Four main reviews and both comparisons display a dated recapture warning when relevant product sources expire. Static explanatory passages remain dated editorial material, not freshly verified terms. Other Russian guides still need the same explicit archive labelling for their independent evidence files.
- Added a read-only daily GitHub Actions freshness report, with a 14-day warning queue and a failing status for already expired datasets. It never changes capture dates or publishes a machine-written rule change.
- Platform findings and remaining verification gaps are recorded in `docs/platform-verification-2026-09-08.md`. Removed the unreliable aggregate platform list from the FundedNext/Bright Funded comparison.
- `npm run test:russian-expiry -- --built` passed: all 26 pages at five data-derived dates, plus inherited hourly regeneration in the actual build manifest. Production build passed (509 pages), lint passed without warnings, finder regression tests passed, and local release checks passed all 26 URLs/sitemap/canonicals. Full audit remains 326 errors with output unchanged from the preceding release. No challenge capture or editorial dates were refreshed by this technical update.

1. Verify product-and-tier-specific platform availability before adding a platform filter. Do not reuse aggregate firm platform lists; FundedNext Instant and U.S. configurations differ, and some account sizes have platform restrictions. Keep platform limitations visible meanwhile.
2. Finish source-age presentation for independent guide evidence and resolve the recapture queue. Hourly Russian regeneration and daily reporting are implemented, but regeneration does not recapture facts. Eight firm datasets were already outside the 30-day policy at the initial audit.
3. Finish native Russian editorial adaptation across existing pages; remove internal production jargon and reconcile existing aggregate claims with current official evidence. Edris is the established author; do not invent testing experience or payout verification.
4. Add contextual finder handoffs from the relevant reviews and guides, retaining original explanatory content and existing URLs.
5. Verify Russian funnel reporting against actual affiliate purchases. Browser events and redirects are not proof of paid conversions, and must not be double-counted.
6. Revisit first-party Search Console evidence for the full Russian section and prioritise improvements by query/page results. Do not infer Russian nationality from country traffic or claim ranking gains from a successful build.
7. Develop a small, evidence-led outreach proposition using original comparison examples and rule-change research; no mass guest posts, paid ranking links, unsolicited outreach or unverified backlinks.

Accounts, loyalty points, public review moderation and live payout tracking are deliberately later-stage products, not requirements of the first comparison release.
