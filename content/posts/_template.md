---
title: "<Firm Name> Review YYYY: <One-Line Editorial Hook>"
slug: "<firm>-review"
date: "<original publish date>"
modified: "<today, ISO>"
author: "<Editor name>"
excerpt: "<Description that doesn't repeat the title. 140–160 chars. State the verdict, not the topic.>"
categories: ["Prop Firms"]
tags: ["<Firm>", "Prop Firm"]
type: "post"
---

<!--
  Reviews v2 EDITORIAL STANDARD
  ---------------------------------------------------------------
  This file is a STANDARDS DOCUMENT, not a publishable page.
  Underscore-prefixed files are filtered out by lib/mdx.ts.

  IMPORTANT — CONTENT FORMAT:
  Content files are rendered via dangerouslySetInnerHTML — they
  are RAW HTML, not markdown. Use:

    <h2 class="wp-block-heading"><strong>Heading</strong></h2>
    <h3 class="wp-block-heading"><strong>Sub-heading</strong></h3>
    <p>Paragraph text. <strong>Bold</strong> and <em>italic</em>.</p>
    <ul class="wp-block-list"><li>Bullet</li></ul>
    <a href="/path">Link text</a>

  Markdown (##, **, [text](url), - bullets) WILL NOT RENDER —
  the browser sees literal characters. There is no MDX or
  remark pipeline. Author in HTML, period.

  All firm reviews under content/posts/*-review.md must hit this
  template. Required sections, in this exact order:

  1. Verdict (≤15 words, names the trader who should pick this firm)
  2. Quick-fact card (HTML — preserve the existing inline style block
     pattern from ftmo-review.md or fxify-review.md)
  3. Challenges available — TABLE driven from
     content/data/challenges/<firm>.json (one row per product +
     account size). Cite sourceCapturedAt below the table.
  4. Rule mechanics — DD type with a worked dollar example,
     consistency rule with the math, news/weekend/EA in plain English.
  5. True cost to break even — TABLE with computeTrueCost() output
     for each tier: break-even profit, R-multiple, realistic day count.
     Link to /true-cost-of-prop-firm-challenges (canonical math page).
  6. Payout speed in practice — first-payout-day, methods, fees, min,
     community evidence (Trustpilot / Reddit / Discord — cite).
  7. Pros / Cons — minimum 5 each. Every bullet MUST cite a number
     or rule. No bullet can be marketing prose.
  8. Who should pick this firm / Who should avoid it — two short
     paragraphs naming the trader profile concretely.
  9. FAQ — 5–7 questions. Answer-first, then 1–2 sentences of context.

  FACT-DENSITY FLOOR
  ---------------------------------------------------------------
  Every paragraph must contain at least one of:
    - a specific number (e.g. "$549 for the $100K Stellar 2-Step")
    - a named rule ("static 10% max drawdown")
    - a verifiable claim with a source ("Topstep paid 16.8% in 2025")

  BANNED PHRASES
  ---------------------------------------------------------------
  Reject any review that contains these — they are signals of
  marketing-copy filler:
    - "one of the most popular"
    - "renowned for"
    - "trusted by thousands"
    - "industry-leading"
    - "user-friendly"
    - "boasts"
    - "leading provider"
    - "huge community"

  Search for replacements that cite the underlying fact:
    "renowned for fast payouts"  →
      "On the FundedNext Stellar Instant product, payouts settle in
       1–3 business days via crypto rail (verified 2026-05-20)."

  WORD COUNT
  ---------------------------------------------------------------
  Target floor: 2,500 words when challenge data is fully populated
  (FTMO, FundedNext, FXIFY, Topstep — firms with verified per-tier
  pricing and rules). Acceptable floor: 1,200–1,800 words when
  challenge data is thin (most fields null with notes explaining
  why) — better to ship structurally complete and honest about
  data gaps than to pad prose with marketing-style filler.
  Ceiling: 4,500 words (only the firms with the most product
  diversity — FXIFY — reach the ceiling).

  SOURCING
  ---------------------------------------------------------------
  Every numeric claim about pricing, rules, or payouts must trace to
  a sourceUrl in content/data/challenges/<firm>.json. If a claim
  cannot be traced, either remove the claim or set the corresponding
  challenge field to null with an explanatory note.

  Cite Trustpilot and Reddit anecdotally with date — never rely on
  general reputation language.

  AFFILIATE COMPLIANCE
  ---------------------------------------------------------------
  Every outbound link to the firm's site must route through
  /go/<firm-slug> (NOT a bare firm URL). The AffiliateDisclosure
  component renders automatically on firm-review pages from
  app/blog/[slug]/page.tsx — do not duplicate the disclosure in
  prose.

  REVIEW BEFORE MERGE (editor checklist)
  ---------------------------------------------------------------
  [ ] All 9 sections present in the order above
  [ ] Zero banned phrases (search the file)
  [ ] Every paragraph has a number/rule/source
  [ ] Every challenge row cites sourceCapturedAt within 30 days
  [ ] Math audit: one row of the True-Cost table reproduced by hand
  [ ] All firm URLs in body go through /go/<firm-slug>
  [ ] npx next build clean
  [ ] Spot-check 3 numbers against the live firm page
  [ ] (Optional) trader-friend review — reject any "reads like
       marketing" feedback
-->

<!-- ============================================================
  SECTION 1 — Verdict
============================================================ -->
<h2 class="wp-block-heading"><strong>Verdict</strong></h2>
<p>One sentence. No qualifiers. Names the trader profile this firm wins for.</p>

<!-- ============================================================
  SECTION 2 — Quick facts
  Use the inline-styled HTML table pattern from
  content/posts/ftmo-review.md (top of the file).
  Render Trustpilot from firms.json once backfilled.
============================================================ -->
<h2 class="wp-block-heading"><strong>Quick facts</strong></h2>
<table>...</table>

<!-- ============================================================
  SECTION 3 — Challenges available
  Columns: Product, Phases, Account size, Price (USD), Profit
  target, Daily DD, Max DD, Profit split. Pull rows from
  content/data/challenges/<firm>.json. One row per
  {product × accountSize}. Use "—" for null fields (don't invent).
  Footer: "Pricing and rules current as of <sourceCapturedAt>.
  For the most recent, see <firm-url-as-go-link>."
============================================================ -->
<h2 class="wp-block-heading"><strong>Challenges available</strong></h2>

<!-- ============================================================
  SECTION 4 — Rule mechanics
  Drawdown with $-denominated worked example. Consistency rule
  with math (if any). Plain-English summary of news, weekend,
  overnight, EA, and copy-trading rules.
============================================================ -->
<h2 class="wp-block-heading"><strong>How the rules actually work</strong></h2>

<!-- ============================================================
  SECTION 5 — True cost to break even
  Columns: Tier, Fee, Break-even profit, R-multiple,
  Realistic days @ 1%/day capped by daily DD.
  Numbers from computeTrueCost() in lib/firms.ts — do NOT
  hand-calculate. Round break-even to nearest dollar.
  Format R-multiple to 2 decimals. Add one paragraph
  explaining what R&lt;1 means (favorable risk math) and
  link to /true-cost-of-prop-firm-challenges.
============================================================ -->
<h2 class="wp-block-heading"><strong>True cost to break even</strong></h2>

<!-- ============================================================
  SECTION 6 — Payout speed in practice
  Three short paragraphs:
  • First payout day on this firm's products
  • Methods + fees + minimum thresholds
  • Real-world evidence (Trustpilot/Reddit dates, firm metrics)
  Avoid the phrase "fast payouts" — quote a specific day count.
============================================================ -->
<h2 class="wp-block-heading"><strong>Payout speed in practice</strong></h2>

<!-- ============================================================
  SECTION 7 — Pros / Cons
  5+ items each. Every bullet cites a number or named rule.
  No marketing prose.
============================================================ -->
<h2 class="wp-block-heading"><strong>Pros</strong></h2>
<ul class="wp-block-list">
  <li>Bullet citing a number or rule.</li>
</ul>

<h2 class="wp-block-heading"><strong>Cons</strong></h2>
<ul class="wp-block-list">
  <li>Bullet citing a number or rule.</li>
</ul>

<!-- ============================================================
  SECTION 8 — Who should pick / avoid
============================================================ -->
<h2 class="wp-block-heading"><strong>Who should pick &lt;Firm&gt;</strong></h2>
<p>One paragraph naming a concrete trader profile. Include strategy type (scalp / swing / news), capital tier they'd start at, and why this firm's rule surface fits.</p>

<h2 class="wp-block-heading"><strong>Who should avoid &lt;Firm&gt;</strong></h2>
<p>One paragraph. Same structure but inverse. Be specific about which competing firm is a better fit and why.</p>

<!-- ============================================================
  SECTION 9 — FAQ
  5–7 questions. Answer-first phrasing. Each answer cites a
  number where possible.
============================================================ -->
<h2 class="wp-block-heading"><strong>FAQ</strong></h2>

<h3 class="wp-block-heading"><strong>Question 1, answer-first phrasing</strong></h3>
<p>1–2 sentences. Cite a number where possible.</p>

### <Question 2>

...
