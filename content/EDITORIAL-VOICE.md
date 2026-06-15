# Editorial Voice & Style Guide

The house voice for Traders Fund Hub, distilled from the existing corpus. Every new page — landing, feature, guide, review — must read like a skeptical, numerate editor wrote it, not a template. Hand this to anyone (human or model) writing for the site. Pairs with `AGENTS.md` (the review standard) and `content/posts/_template.md` (the 9-section review skeleton).

## The voice in one line
Skeptical, trader-first, numerate. We've *bought* the challenges and *blown* the accounts, and it shows. We trust the reader's intelligence, name the gotchas marketing buries, and never pad.

## Ten rules

1. **Open with a hook, never a generic intro.** Rotate the opening type — don't reuse one twice in a batch:
   - *Marketing reframe:* "You see the ad: trade $100K, keep 80%, get paid monthly. Sounds like free money. It isn't."
   - *Corrective thesis:* "Most traders think passing the challenge is the win. Passing is the easy part."
   - *Author experience:* "I've held funded accounts at six firms. Here's the rule that quietly killed three of them."
   - *Cold hard fact:* "Only one firm on this list pays a 100% split. The other thirteen keep a cut."
2. **Person:** second person ("you") for decisions; first person ("I lost a $50K account in a day") where lived experience earns trust. The first-person honesty is our signature — use it, don't fake it.
3. **Every paragraph carries a number, a named rule, or a sourced claim.** No filler sentences. "$100K account, 5% daily cap = a $5,000 daily loss line" beats "tight risk management."
4. **When data can't be verified, say so.** "FundingPips returns 403 to automated checks — confirm the price on the live site before paying." Honesty about gaps reads as rigor.
5. **Name the gotcha.** The rule the marketing copy buries gets called out explicitly — news-window retention, trailing drawdown measured from the peak, minimum trading days.
6. **Name competitors, never "other firms."** "For futures, Topstep and My Funded Futures are the real alternatives." Specificity is the whole product.
7. **Worked examples in real dollars.** Turn every abstract rule into a number a trader feels.
8. **Vary sentence rhythm deliberately.** Short, punchy lines next to longer, subordinated ones. Em-dashes and parentheticals for layered detail. Fragments for emphasis, sparingly.
9. **End on an action, not a CTA cliché.** "Read the rules page line by line before you pay" beats "Sign up today!"
10. **No banned phrases** (see below). Replace puffery with a sourced fact.

## Banned phrases (from AGENTS.md — enforced)
`renowned for` · `one of the most popular` · `industry-leading` · `user-friendly` · `boasts` · `trusted by thousands` · `huge community` · `leading provider` · `best of both worlds` · `game-changer` · `act now` · `unlock your potential`

Replace, e.g.: ~~"renowned for fast payouts"~~ → "settles payouts in 1–3 business days via crypto rail (verified 2026-05-20)."

## Anti-sameness rules (the "editor touch")
- **Vary the verdict frame.** The corpus over-uses "X is the right pick for traders who…". Rotate: "X stands out for…", "Pick X only if…", "X is the only flagship that…", "Skip X unless…".
- **Vary structure depth.** Reviews keep the 9-section skeleton for comparability, but flex section *depth* per firm — combine thin sections, expand unusual rules. Guides and pillars get **no shared skeleton**; each is shaped around its own argument.
- **Mix prose and bullets.** Don't reduce every point to a bold-led bullet. Some firms deserve a paragraph, not a list.
- **Hand-write every prose slot.** Landing/feature `intro`, `methodology`, `whyItMatters`, and `faqs` strings are written per page in this voice — never filled from a pattern.

## Formatting conventions (raw HTML, not Markdown)
- Headings: `<h2 class="wp-block-heading"><strong>Title</strong></h2>` (h3 for subsections).
- Fast-take box: `<div class="key-takeaways"><div class="title">Fast take</div><ul>…</ul></div>`.
- Lists: `<ul class="wp-block-list">` with full-sentence `<li>` items — no one-word bullets.
- Tables: inline-styled, `border-collapse`, with a `<caption class="hidden-caption">` for a11y.
- Internal links: `/blog/<slug>` for posts/reviews; `/go/<firm-slug>` for any outbound firm link (gets `rel="sponsored"` injected).
- Pros/cons bullets lead with a bold metric or rule, then the explanation.
- FAQ: answer-first — no "The answer is…" preamble.

## Voice-QA checklist (the editor gate — every piece passes before publish)
- [ ] Opening is a hook, and differs in type from its siblings in this batch.
- [ ] Every paragraph has a number, named rule, or sourced claim.
- [ ] At least one worked dollar example.
- [ ] At least one named competitor and one named gotcha (where relevant).
- [ ] Verdict frame differs from the previous piece.
- [ ] No banned phrases (`grep -iE "renowned for|industry-leading|one of the most popular|user-friendly|boasts|trusted by thousands"`).
- [ ] Ends on a concrete next step.
- [ ] Any number traces to `firms.json` / `content/data/challenges/` or is flagged unverified.
