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

1. Verify product-and-tier-specific platform availability before adding a platform filter. Do not reuse aggregate firm platform lists; FundedNext Instant and U.S. configurations differ, and some account sizes have platform restrictions. Keep platform limitations visible meanwhile.
2. Extend the freshness fix to existing Russian review/category rendering and establish a recurring capture/alert workflow. Regeneration does not recapture facts. Eight firm datasets were already outside the 30-day policy at the initial audit.
3. Finish native Russian editorial adaptation across existing pages; remove internal production jargon and reconcile existing aggregate claims with current official evidence. Edris is the established author; do not invent testing experience or payout verification.
4. Add contextual finder handoffs from the relevant reviews and guides, retaining original explanatory content and existing URLs.
5. Verify Russian funnel reporting against actual affiliate purchases. Browser events and redirects are not proof of paid conversions, and must not be double-counted.
6. Revisit first-party Search Console evidence for the full Russian section and prioritise improvements by query/page results. Do not infer Russian nationality from country traffic or claim ranking gains from a successful build.
7. Develop a small, evidence-led outreach proposition using original comparison examples and rule-change research; no mass guest posts, paid ranking links, unsolicited outreach or unverified backlinks.

Accounts, loyalty points, public review moderation and live payout tracking are deliberately later-stage products, not requirements of the first comparison release.
