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

## Access source read by RU Writer
https://help.topstep.com/en/articles/8284116-am-i-eligible-to-trade-with-topstep — read 2026-10-20 (curl, page dateModified 2026-09-04T15:26:29Z).
"Countries Ineligible to Trade — Citizens of these countries can't trade or receive payouts: … Belarus … Russia … Ukraine … Crimea (incl. Donetsk, Luhansk, Kherson, Zaporizhzhia) …"
"Citizen of an ineligible country but living in an eligible one — can I trade? Possibly. Submit a government-issued photo ID proving permanent residency in the eligible country, plus a bank statement from that country. Topstep's Trust team reviews it."
XFA-only (no Live) list includes Germany. Kazakhstan is not named anywhere on the page.

## Data gaps for Prop Firm Tracker
1. firms.json `payoutMethods` = ACH, Bank wire, with no source/date; the 20.10 capture lists Prop-to-Brokerage, Aeropay, Wise (CN/CA/UK), ACH, Wire/SWIFT.
2. Access note in challenges/topstep.json is still the 08.09 observation; please store the 20.10 read above (and the citizenship rule + XFA-only list) in Tracker data.
3. Legal entity / HQ / maxAllocation ($500,000) have no dated source: not printed.
4. platformEvidence (TopstepX) is 08.09; page uses rules.platforms evidence (15.10) for Quantower.
5. TopstepX EA "with conditions" specifics and which news releases count as "major" are not captured.
6. Non-US pricing (VAT/taxes for CIS/EU visitors) not captured; page says only "taxes may be added".
7. Minimum-days conflict (help "as few as two days" vs product page "no minimum") still open.

## SEO review 20.10 (review-2026-10-26-topstep.md) — follow-ups
- Done: datePublished from RUSSIAN_ROUTE_EDITORIAL_DATES; reading-time line removed; funded-account anchor capitalised («Топстеп»).
- Waiting on Tracker (due Sun 25.10 15:00): dated 20.10+ capture of 8284116 (must-fix 1). Access block left untouched until then;
  fallback = date it to the 08.09 observation and drop the Germany XFA-only and travel sentences.
- Waiting on Tracker: firms.json payoutMethods + source/date; then drop the «В карточке фирмы у нас…» sentence.
- 26.10: Hash Hedge firms.json entry → optional third RuGoLink card; Phase 2 RuArticleLayout → move related links into the R slot.
