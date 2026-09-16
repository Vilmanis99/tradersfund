<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local-first development and release approval

- Build, test and preview changes locally. Vercel build minutes are paid; do not deploy after each change.
- Batch changes for review at the local preview. Do not push to any Vercel-connected branch or start a remote deployment without a new, explicit deployment approval from the user.
- Earlier blanket commit/push/deploy instructions do not authorize future automatic releases. Local commits are separate from deployment approval.


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
- For trading-day and consistency fields, `null` means unverified, not permission: `minTradingDays: 0` explicitly means no minimum. An unlimited maximum requires `maxTradingDaysUnlimited: true` with `maxTradingDays: null`; no consistency rule requires `consistencyRuleApplies: false` with `consistencyRulePct: null`. These optional flags require first-party evidence for the captured product/stage, just like numeric fields. Do not infer them from legacy nulls or refresh capture dates during a schema migration. The merge rejects contradictory values and treats flag changes as material.
- A firm that prices in a currency other than USD keeps its own denomination (`priceEur`). Converting at capture time bakes in an FX rate that silently rots.
- `trustpilotRatingSuppressed: true` is not the same as `trustpilotScore: null`. The first means Trustpilot removed the aggregate for a guidelines breach — a real finding to render; the second means we haven't captured it yet.

# Capture workflow

Challenge data goes stale fast — the audit enforces a 30-day `sourceCapturedAt` gate. To refresh a firm:

1. **Queue.** Run `npm run capture:freshness -- --window 14` at least weekly. It sorts the oldest product capture per firm, shows the exact failure date, counts priced tiers, and surfaces open public watch items. Use `--strict` in scheduled checks when stale data must fail the job.
2. **Capture.** Read the firm's own pricing/rules pages and write a capture file to a scratch dir. Record a figure only if it appears on the firm's own domain; otherwise `null`. Attach an evidence quote per numeric field and note any unresolved conflicts between the firm's own pages — they are common.
3. **Diff, then merge.** `node scripts/merge-capture.mjs <firm> --dir <scratch-dir>` projects and validates the capture, then prints every material product, tier, price, risk, payout, rule, and source change. Capture dates and provenance notes are ignored by the semantic diff. A write containing material changes is blocked until an editor reviews the diff and re-runs with `--write --accept-changes`. The merge still refuses to overwrite priced USD data with nulls and archives the raw capture to `content/data/challenges/_captures/<firm>-<date>.json`.
   - Unfinished captures use `reviewStatus: "draft"` and a `releaseBlockers` array. They can be previewed, but neither `--write` nor `--accept-changes` can bypass the hold. After resolving each issue, set `reviewStatus: "ready"` and clear the blockers. A skipped or invalid capture returns a non-zero exit status. Run `npm run test:capture-merge` for these safeguards.
   - Mixed-scope corrections may preserve an older `sourceCapturedAt` on individual products. The optional product date must be a real calendar date no later than the capture's root `capturedAt`; omitted dates inherit the root. Correcting one field or observing a source conflict must not make an incompletely checked product look fresh. Review all price removals in the semantic diff, retain the old capture archive, and explain unresolved inputs publicly.
4. **Update the public watch when material.** If a verified change can alter a purchase decision, add or update its dated entry in `content/data/challenge-watch.json` with the affected product slugs and the firm's own source URLs. Never auto-publish a machine-generated change summary; unresolved conflicts use `status: "watch"`.
   - A rule-only recheck may use `ruleEvidenceRefs` to cite named sections in a `content/data` JSON evidence file. The document must identify `firmSlug`, and every cited source must have a section with matching `sourceUrl` and `sourceCapturedAt`. This does not refresh product prices. The audit validates the references; `npm run test:watch-evidence` covers the provenance safeguards. Do not use this path for price or product-lineup changes.
   - An unresolved `source-conflict` with `status: "watch"` may instead use `sourceConflictEvidenceRefs`. Each flat JSON evidence section must identify its first-party source, observation date, affected `productSlugs` and a source quote. Every affected product needs observations from at least two cited sources. This path cannot be used for a verified change, cannot be combined with rule-only references, and never refreshes the underlying product dates. It allows readers to see a current disagreement while purchase terms remain unverified.
5. **Regenerate tables.** `node scripts/gen-truecost.mjs <firm>` emits the True-Cost table HTML from the merged data via `computeTrueCost()`. Paste it into the review. Never hand-author these — hand-authoring is what produced three separate reviews quoting an identical fabricated `$180/$280/$480` that matched no firm's real pricing.
6. **Audit.** `npm run audit -- <firm>` must reach 0 errors. It cross-checks every stated fee against the JSON price for that tier, validates the public change watch, and exercises the semantic-diff safeguards so moved terms surface before publication.

Trustpilot figures follow the same shape: capture, then `node scripts/merge-trustpilot.mjs --write`.
