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
| `firmInFirmsJson` | `false` when the firm has no firms.json entry on this branch (Era Trade, KasCapital, PropLive, TeamTraders, Hash Hedge until Tracker's entry merges). The badge then resolves to `unverified` («РФ: не проверено»); there is no override |
| `dataAsOf` | ISO date of the oldest capture the copy relies on; the verdict carries the same date as «по данным на ДД.ММ.ГГГГ» |
| `dataExpires` | optional; set when the page's own evidence is older than the challenge captures (dataAsOf + 30 days) |
| `sources` | where each number comes from (for reviewers, not rendered) |
| `verdict` | 2–3 sentence verdict (render as `review-verdict__line`) |
| `best` | «Подойдёт, если…» bullets (3–4) |
| `avoid` | «Не подойдёт, если…» bullets (3–4) |
| `russiaAccess` | status-driven Russia line, see below |

## Russia line (never hard-coded)

Badges and Russia lines come **only** from `russiaStatus` in the firms.json of the branch that ships, via
`russiaStatusFor(firm)`. There is no fallback, static status or per-page override: a firm without a
firms.json entry is `unverified` and shows «РФ: не проверено», never an "open to Russia" line. No copy names a
status or badge label literally; `scripts/test-ru-verdicts.mjs` fails on fallback fields and on literal labels.

`russiaAccess.byStatus` has one entry per `RussiaStatus` (`available`, `restricted`, `unclear`, `unverified`).
At render time:

1. `status = russiaStatusFor(russiaAccess.firm)`.
2. `line = byStatus[status]`; replace `{badge}` with `RU_ACCESS_BADGE[status].label` and `{firm}` with the firm name.
3. If `line.altText` exists: `openAlternative` = the first firm in `russiaAccess.alternatives` (BrightFunded first)
   whose `russiaStatusFor(...) === 'available'`. If one exists, append `altText` with `{openAlternative}` = its
   name and `{altBadge}` = `RU_ACCESS_BADGE.available.label`; if none, drop `altText`.
4. Insert the result as the **first** bullet of `line.list` (`best` or `avoid`), then cap each list at 4.

So when Tracker flips a status, the bullet, its list, the alternative and the badge label all change with it.

## Freshness

Hide the verdict/fit block (or show the standard stale notice) when `dataAsOf` is more than 30 days old,
the same rule as `isChallengeFresh`.

## Comparison files (`"type": "comparison"`)

| field | meaning |
|---|---|
| `route`, `dataAsOf`, `sources`, `verdict` | as for reviews; the verdict never names a Russia status |
| `a`, `b` | firm names as in firms.json; BrightFunded is always `a` when it is in the pair |
| `picks.a` / `picks.b` | «Выбирайте {a}, если…» / «Выбирайте {b}, если…» (2–4 each; same strings as `ComparePickVerdict` `picks`) |
| `russiaPick` | status-driven Russia line, below |

`russiaPick` rendering, with `sa = russiaStatusFor(a)`, `sb = russiaStatusFor(b)`:

- exactly one side is `available`: add `oneOpen.text` as the **first** bullet of that side's picks
  (`{open}`/`{other}` = names, `{openBadge}`/`{otherBadge}` = `RU_ACCESS_BADGE[...]`.label), then cap at 4;
- neither is `available`: show `neitherOpen.text` as a note under both columns (`{a}`, `{b}`, `{aBadge}`, `{bBadge}`,
  `{altBadge}` = `RU_ACCESS_BADGE.available.label`), plus `altText` when the first firm in `alternatives` with status
  `available` exists (`{openAlternative}`); otherwise drop `altText`;
- both are `available` (`bothOpen: null`): no Russia line.

No fallback or override exists here either; the statuses come only from firms.json on the shipping branch.
