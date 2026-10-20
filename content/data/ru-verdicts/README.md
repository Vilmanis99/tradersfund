# RU verdict copy (Phase 2, RuArticleLayout / RU VerdictBox)

One JSON file per RU page, named after the route slug (`obzor-ftmo.json` → `/ru/obzor-ftmo`).
Written by RU Writer from firms.json, challenge captures and each page's own sourced facts.
Field names follow the EN Phase 1 components (`ReviewVerdictBox`: `verdict`, `best`, `avoid`;
`ComparePickVerdict`: `picks.a`, `picks.b`).

## Review files (`"type": "review"`)

| field | meaning |
|---|---|
| `route` | RU route; must match the file name |
| `firm` | firm name as in firms.json (`russiaStatusFor(firm)` resolves the badge) |
| `firmInFirmsJson` | `false` for local operators that have no firms.json entry (badge resolves to `unverified`) |
| `dataAsOf` | ISO date of the oldest capture the copy relies on; the verdict carries the same date as «по данным на ДД.ММ.ГГГГ» |
| `dataExpires` | optional; set when the page's own evidence is older than the challenge captures (dataAsOf + 30 days) |
| `sources` | where each number comes from (for reviewers, not rendered) |
| `verdict` | 2–3 sentence verdict (render as `review-verdict__line`) |
| `best` | «Подойдёт, если…» bullets (3–4) |
| `avoid` | «Не подойдёт, если…» bullets (3–4) |
| `russiaAccess` | status-driven Russia line, see below |
| `russiaStatusFallback` | temporary, only for firms whose firms.json entry is not merged yet (Hash Hedge) |

## Russia line (never hard-coded)

`russiaAccess.byStatus` has one entry per `RussiaStatus` (`available`, `restricted`, `unclear`, `unverified`).
At render time:

1. `status = russiaStatusFor(russiaAccess.firm)` (if that returns `unverified` and the firm is missing from
   firms.json, use `russiaStatusFallback` when present).
2. `line = byStatus[status]`; replace `{badge}` with `RU_ACCESS_BADGE[status].label` and `{firm}` with the firm name.
3. Insert `line.text` as the **first** bullet of `line.list` (`best` or `avoid`), then cap each list at 4.

So when Tracker flips a status, the bullet, its list and the badge label change with it.

## Freshness

Hide the verdict/fit block (or show the standard stale notice) when `dataAsOf` is more than 30 days old,
the same rule as `isChallengeFresh`.

## Comparison files (`"type": "comparison"`)

Added in the comparisons batch: `a`/`b` firm names (BrightFunded is always `a` when it is in the pair),
`verdict`, `picks.a` / `picks.b` («Выбирайте {firm}, если…», 2–4 each) and a status-driven `russiaPick`.
