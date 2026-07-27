<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Editorial standard for firm reviews

Every firm review (`content/posts/<firm>-review.md`) MUST follow the Reviews v2 standard documented in [`content/posts/_template.md`](content/posts/_template.md). Key invariants:

- All 9 sections present in the exact order specified in the template
- Every paragraph contains a number, named rule, or sourced claim — no marketing filler
- Banned phrases enforced (search for "renowned for", "one of the most popular", etc.)
- All numeric claims trace to `sourceUrl` in `content/data/challenges/<firm>.json`
- Outbound firm links go through `/go/<firm-slug>` — never bare URLs
- True-Cost tables use values from `computeTrueCost()` in `lib/firms.ts` — never hand-calculated

Run `npm run audit` before merging any review change. It mechanises the editor
checklist at the bottom of `_template.md` — section order, banned phrases,
`/go/` link routing, source freshness, and a True-Cost math audit that reuses
`computeTrueCost()` so the check can never drift from the renderer. Add
`-- --warn` for advisory checks, or `-- <firm>` to scope to one review.

A firm with products on different splits or drawdown caps needs one True-Cost
table per product — a single header cannot state assumptions that only hold for
some of its rows.

# Data model

- `Firm` (aggregate firm metadata) — `content/data/firms.json`, schema in `lib/firms.ts`
- `Challenge` (per-product offering tied to a firm) — `content/data/challenges/<firm>.json`, schema in `lib/firms.ts`
- One firm has 1–N challenges. Always cite `sourceUrl` + `sourceCapturedAt` on every challenge entry.
- `sourceUrl` must be the firm's own public URL. Pointing it at one of our pages is a circular citation: the review sources the data file while the data file sources the review, and neither traces to the firm's published terms.
- Never invent numbers — use `null` and add an explanatory `notes` entry when data isn't verifiable.
- A firm that prices in a currency other than USD keeps its own denomination (`priceEur`). Converting at capture time bakes in an FX rate that silently rots.
- `trustpilotRatingSuppressed: true` is not the same as `trustpilotScore: null`. The first means Trustpilot removed the aggregate for a guidelines breach — a real finding to render; the second means we haven't captured it yet.

# Capture workflow

Challenge data goes stale fast — the audit enforces a 30-day `sourceCapturedAt` gate. To refresh a firm:

1. **Capture.** Read the firm's own pricing/rules pages and write a capture file to a scratch dir. Record a figure only if it appears on the firm's own domain; otherwise `null`. Attach an evidence quote per numeric field and note any unresolved conflicts between the firm's own pages — they are common.
2. **Merge.** `node scripts/merge-capture.mjs <firm>` previews; `--write` applies. It projects the capture onto the `Challenge` schema, validates enums, refuses to overwrite priced data with nulls, and archives the raw capture (evidence quotes and all) to `content/data/challenges/_captures/<firm>-<date>.json`. That archive is the provenance trail — the shipped schema has nowhere to put evidence.
3. **Regenerate tables.** `node scripts/gen-truecost.mjs <firm>` emits the True-Cost table HTML from the merged data via `computeTrueCost()`. Paste it into the review. Never hand-author these — hand-authoring is what produced three separate reviews quoting an identical fabricated `$180/$280/$480` that matched no firm's real pricing.
4. **Audit.** `npm run audit -- <firm>` must reach 0 errors. It cross-checks every stated fee against the JSON price for that tier, so a moved price surfaces every review still quoting the old one.

Trustpilot figures follow the same shape: capture, then `node scripts/merge-trustpilot.mjs --write`.
