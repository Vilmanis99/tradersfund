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

When upgrading a legacy review to v2, run the editor checklist at the bottom of `_template.md` before merging.

# Data model

- `Firm` (aggregate firm metadata) — `content/data/firms.json`, schema in `lib/firms.ts`
- `Challenge` (per-product offering tied to a firm) — `content/data/challenges/<firm>.json`, schema in `lib/firms.ts`
- One firm has 1–N challenges. Always cite `sourceUrl` + `sourceCapturedAt` on every challenge entry.
- Never invent numbers — use `null` and add an explanatory `notes` entry when data isn't verifiable.
