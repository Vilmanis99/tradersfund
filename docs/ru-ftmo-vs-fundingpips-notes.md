# /ru/ftmo-vs-fundingpips: RU Writer notes (draft 20.10.2026, slot Fri 23.10.2026)

Updated 20.10 against the full brief (briefs/2026-10-23.md): FAQ 4–6 per brief §5, verdict adds CFT and UAE, hero access notes on FP/FTMO CTAs, final CTA BrightFunded → Crypto Fund Trader, BF help-6/terms-5 conflict, CFT MT5-US line, consistency and min-days rows, dlya-russkoyazychnykh-treyderov and fundingpips-pravila (pending) links, breadcrumb «Рейтинг проп-фирм». lib/ruRelatedLinks.ts, scripts/audit-ru-links.mjs and scripts/test-ru-related-links.mjs named in the brief do not exist on daily 20b.

Built from the brief stub /workspace/ru-seo/briefs/2026-10-23.md; the full brief is due Thu 22.10 — adjust then.
Branch content/ru-ftmo-vs-fundingpips off origin/daily/2026-10-20b @ f4e547d.

## Data used (all ≤30 days on 23.10.2026)
- origin/daily/2026-10-20b: challenges/ftmo.json (2026-10-19), challenges/fundingpips.json (2026-10-20; 2 Step Flex 2026-10-20, Zero 2026-10-19),
  firms.json (russiaStatus, platforms, founded/legal entity 2026-10-14, Trustpilot 2026-10-15, FTMO payoutMethods 2026-10-20),
  _captures/fundingpips-2026-10-20.json (refundTerms, checkoutMethods, EA/copy, Prime «до $2M»), _captures/ftmo-2026-10-14.json (split 80/90, fee refund 2-Step yes / 1-Step no, overnight/weekend),
  _captures/ftmo-2026-10-19.json (TradingView via OANDA), firm-rules/_captures/firm-rules-2026-10-15.json (FundingPips platforms, FTMO overnight/weekend Standard only),
  firm-check-evidence-2026-10-20.json (country lists: FTMO, FundingPips, BrightFunded, Crypto Fund Trader), russian-fundingpips-access-evidence.json (FATF/EU/UN wording, 2026-10-01; auto-hidden after 31.10).
- Merged Tracker data branches:
  - data/fundingpips-reward-methods-2026-10-20 @ 4a230e1 (Reward Methods 20.10: methods, ERC-20, $500 Rise/Bank minimum, 14-country Pay to Card/Bank list without RU/BY/UA/KZ).
  - data/key-facts-2026-10-20 @ 366f156 (consistencyRules: FundingPips 35% On-Demand 100% on 1 Step Flex, 2 Step Flex, 2 Step Pro, 2 Step Standard; FTMO 1-Step 50% from orders 12.10.2026). Brings the rest of key-facts up to 366f156 too (Maven, TradeDay, Lucid, TPT, Trustpilot etc.).
- Facts kept consistent with content/data/ru-verdicts/ftmo-vs-fundingpips.json (b1bfa5a), except the overnight point below.

## Data gaps / conflicts
1. **Verdict JSON b1bfa5a overnight pick is inaccurate**: «FundingPips разрешает это во всех моделях, FTMO ограничивает». Data says FundingPips allows overnight/weekend on Evaluation only; Master needs the Swing add-on; Zero treats weekend holding as a hard breach. FTMO restricts only the Standard account type on the FTMO Account (Swing: none; Evaluation: none). The page states this neutrally; the verdict JSON should be fixed by its owner.
2. **FTMO max allocation $2,000,000** is in firms.json without a capture date; not shown as a number. FundingPips «до $2M» Prime (invite-only) is dated 20.10.
3. **FTMO checkout methods**: per the full brief, taken from Prop Firm Tracker /workspace/ru-data/2026-10-19-ftmo-brightfunded-payments.md §1 (19.10). That file is not on a data branch; the repo's newest capture with them is 2026-08-28.
10. **FundingPips checkout methods**: the brief says «not captured», but _captures/fundingpips-2026-10-20.json → briefAsks.checkoutMethods has them (Get Started, 20.10, «Not checkout-tested»). Kept, with the note that the list is from the help page and wasn't checkout-tested. RU SEO Lead may want the brief's §3.9/§9.2 updated.
4. **FundingPips refund**: help centre (4th reward, 2 Step Standard) vs Terms «ALL PAYMENTS ARE FINAL» — shown as a conflict.
5. **FTMO EA / copy-trading rules**: no fresh capture; text says to check the programme rules.
6. FundingPips $2.5K tier price (Pro, Standard) is null in data; excluded.
7. FATF/EU/UN wording dated 01.10.2026: the page hides it after 31.10 unless recaptured.
8. Trustpilot (15.10) hides itself after 14.11; corporate data (14.10) after 13.11. The lead hard-codes «с 2015/2022 (по данным на 14.10.2026)» — refresh before 13.11.
9. Russia access for FundingPips is unclear (russiaStatus unclear); no registration/KYC/checkout test with Russian documents. No Mir / Russian-card claims.

## Links
- Out: obzor-ftmo, obzor-fundingpips (C); ftmo-vs-bright-funded (R); fundingpips-vs-bright-funded (R, RuPendingLink); ftmo-dlya-rossiyan («FTMO для россиян», B);
  obzor-bright-funded (A); fundednext-vs-fundingpips; ftmo-vs-fundednext (RuPendingLink); obzor-crypto-fund-trader (RuPendingLink); luchshie-kripto-prop-firmy;
  luchshie-prop-firmy; prop-firmy-bez-chelendzha; promokody-prop-firm; vyplaty-prop-firm; prop-firmy-s-ctrader; otzyvy-prop-firm; kak-rabotayut-chellendzhi-prop-firm.
- In (added in this branch): obzor-ftmo «FTMO против FundingPips»; obzor-fundingpips «FTMO или FundingPips»; ftmo-vs-bright-funded «сравнение FTMO и FundingPips»;
  ftmo-dlya-rossiyan «разбор FTMO и FundingPips по программам»; luchshie-prop-firmy «FundingPips в USD или FTMO в EUR: сравнение»; fundednext-vs-fundingpips «FundingPips против FTMO».
- Alternatives: BrightFunded first, then Crypto Fund Trader. FundedNext excluded (restricted for Russia since 20.10); only a factual comparison link remains, no CTA.
