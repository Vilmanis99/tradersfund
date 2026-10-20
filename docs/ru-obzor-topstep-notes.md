# /ru/obzor-topstep — RU Writer branch notes (ships Mon 26.10.2026)

Brief: /workspace/ru-seo/briefs/2026-10-26.md (supersedes briefs/new-obzor-topstep.md). Base: origin/daily/2026-10-20b @ f4e547d.

## Wiring
- `lib/localizedRoutes.ts`: hreflang pair `/blog/topstep-review` ↔ `/ru/obzor-topstep`; editorial date 2026-10-26.
  firms.json `reviewUrl` stays `/blog/topstep-review`.
- `app/sitemap.ts`: lastmod source `russianOldestChallengeLastModified('topstep')` (editorial date wins → 2026-10-26).
- `lib/analyticsTaxonomy.ts` + `scripts/audit-reviews.mjs`: `russian_review`; acquisition-pilot route list.
- `scripts/release-crawl.mjs`: title/H1/markers, Article schema count, Topstep official CTA nofollow-not-sponsored +
  closed badge + no FundedNext CTA, BrightFunded alternative CTA must be sponsored.
- `content/data/ru-verdicts/obzor-topstep.json` (Phase 2 shape; validated with test-ru-verdicts.mjs from content/ru-phase2-copy-2026-10-20).

## Inlinks (6, varied anchors)
| From | Anchor | How |
|---|---|---|
| /ru (RU_HOME_BASICS) | «Обзор Topstep» | card, shows once route is registered |
| /ru/luchshie-prop-firmy | «Topstep» (ranking + access table rows → RU review) | russianReviewRoutes via russianPublishedHref |
| /ru/otzyvy-prop-firm | «Topstep отзывы и Trustpilot» | RuRelatedLinks |
| /ru/dlya-russkoyazychnykh-treyderov | «Topstep: обзор и альтернативы для РФ» | RuPendingLink, body |
| /ru/prop-trejding | «фьючерсного пропа Topstep» | RuPendingLink, body (минусы) |
| /ru/funded-account | «Топстеп: Express Funded Account на фьючерсах» | RuPendingLink, «Дальше» line |

## Outlinks
obzor-bright-funded (A, first) · obzor-crypto-fund-trader (A, RuPendingLink until 24.10 merge) · obzor-hash-hedge (RuPendingLink, text only) ·
kak-rabotayut-chellendzhi-prop-firm «как работают челленджи» (B) · luchshie-prop-firmy «рейтинге проп-компаний» (R) ·
otzyvy-prop-firm «отзывы о проп-фирмах» (R) · prop-kompanii-otzyvy (RuPendingLink) · dlya-russkoyazychnykh-treyderov ·
vyplaty-prop-firm «как платят проп-компании» · prop-trejding «что такое проп-трейдинг» · funded-account «funded account» · /blog/topstep-review (hreflang en).

## Tracker data (merged 921518c, data/topstep-ru-gaps-2026-10-20, checked 2026-10-20)
The branch now depends on 921518c (content/data/challenges/_captures/topstep-ru-gaps-2026-10-20.json, challenges/topstep.json, firms.json).
Evidence: /workspace/tradersfundhub/evidence/topstep-ru-gaps-2026-10-20.md. Page copy checked sentence by sentence against it.
- Access block: ACCESS_SOURCE now reads url/capturedAt/pageDated from the capture (page dateModified 2026-09-04, checked 2026-10-20).
  Germany XFA-only comes from `eligibility.xfaOnly`; travel rule quoted («Don't trade while there»); Kazakhstan: not named on the
  page (`kazakhstanNamed: false`), copy says this does not confirm access, and §1 no longer names Kazakhstan/EU/Israel as allowed.
- Payout methods (§5 + FAQ + verdict/cons): Prop-to-Brokerage and Aeropay (US only), Wise (China, Canada, UK only), ACH (US banks, $30),
  Wire/SWIFT (international, 5–10 business days, $30); no crypto, no Rise; own-name account only. «В карточке фирмы у нас…» sentence removed.
- Entity: TopstepTrader, LLC, subsidiary of Topstep LLC, Chicago; size «до $150,000 на счёт, до 5 активных XFA». No $500K anywhere.
- TopstepX evidence dated 20.10 (firms.json platformEvidence); copier Combine/XFA only; no TradingView connection.
- Automation: bots via TopstepX/ProjectX API ($29/month), no HFT, VPS/VPN banned, no API on Live.
- News: Tier 1 (CPI, FOMC, NFP, PPI) ±5 min — no new opening positions in index/metal minis, micros size-capped.
- Taxes: prices are base; VAT/GST/sales tax added at checkout by country; amounts not observed.
- Minimum days: no formal minimum, two trading days in practice (55% rule); conflict wording replaced.
- XFA Consistency: ≥3 trading days with ≥1 trade, best day ≤40% of total net profit, ≤50% of balance per payout,
  caps $3,000 / $4,000 / $6,000 (50K/100K/150K), $125 minimum.

## Remaining data gaps (from Tracker's capture)
1. Non-US checkout tax amounts not observed (US IP, no checkout).
2. Kazakhstan eligibility: not named either way.
3. TopstepTrader, LLC state of formation not stated.
4. challenge-watch topstep-minimum-days-source-conflict-2026-09-08 stays 'watch' (flip needs Dev/Code Reviewer with the pinned counts).
5. lib/comparisons.ts (lines 202, 208, 351) still says "Topstep caps at $500K" — EN/shared file, for Dev / EN Writer.

## SEO review 20.10 (review-2026-10-26-topstep.md) — follow-ups
- Done: datePublished from RUSSIAN_ROUTE_EDITORIAL_DATES; reading-time line removed; funded-account anchor capitalised («Топстеп»).
- Resolved 20.10: Tracker's dated capture of 8284116 (921518c) — access block sourced to it; «В карточке фирмы у нас…» sentence dropped.
- 26.10: Hash Hedge firms.json entry → optional third RuGoLink card; Phase 2 RuArticleLayout → move related links into the R slot.
