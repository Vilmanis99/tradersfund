# OFP Funding source refresh hold — 2026-09-14

OFP Funding's first-party homepage and terms were checked before attempting a freshness merge:

- `https://ofpfunding.com/` now presents separate Instant and Challenge modes and a selected Lite example showing a `$50,000` account at `$150`, with `$100,000` and `$200,000` sizes available in the selector.
- `https://my.ofpfunding.com/files/Terms-and-Conditions-of-Business.pdf` is a first-party terms PDF with a 9 February 2026 release date. Its Schedule A describes the available plans and the registration terms name Russia among the restricted jurisdictions, but it does not publish the complete price ladder.

The server-readable pricing selector does not expose the complete current price ladder for every plan and size. The existing capture contains nine products and 45 priced tiers from 2026-07-27, so the product names, prices, and rules cannot be advanced as a complete set from the partial observation. No current price was substituted and no `sourceCapturedAt` date was advanced.

Next safe action: capture the complete first-party pricing payload or a stable official table for every current plan, then merge only after product mapping, prices, rules, and the Russia restriction have been checked together. The current terms PDF is useful for rule evidence, but it must not be used to infer missing prices.

## Follow-up check — 2026-09-15

The first-party terms PDF is now indexed as an April 2026 document and its Schedule A exposes a materially different lineup from the July capture: Instant Lite, Instant Classic variants, Instant Pro, Instant Prime, One-Phase Challenge and Two-Phase Challenge. It confirms USD denomination and lists Russia as a restricted jurisdiction. The public homepage still exposes only a selected `$50,000` Lite example at `$150`; it does not expose the prices for every plan and size in the server-readable page. These observations strengthen the hold rather than justify carrying forward the old nine-product price ladder.

## Follow-up check — 2026-09-16

The OFP homepage selector and the first-party terms were checked again. Its interactive named-model tabs and account-size controls expose the base ladders for all nine tracked products, and those visible prices match the July structured capture. The current terms PDF supplies the plan rule matrices, but the public selector and terms still disagree on Lite leverage (`1:100*` versus `1:30`), and the selector does not expose a checkout total with every add-on choice. The evidence dates are current for this recheck, but the nine structured products remain dated 2026-07-27. This is still a source-conflict recheck, not a price refresh; the products stay excluded from fresh comparisons until the leverage conflict is resolved and a named-product checkout capture confirms the final total.

The selector's Lite 100% split option also leaves the rendered `1:100*` leverage/condition block unchanged; Schedule A specifies `1:30` for Lite. This confirms the conflict persists across the visible split controls rather than being a single default-selection artefact.
