# PR screenshots 2026-10-29 (Europe/Riga)

UI delta vs `main` @ `ab52de49`: SplitTiersDisclosure client projection (display-only `splitTierRows`; no raw `profitSplitTiers` / stage internals in RSC). Chrome change is the accessible tier popover / panel on profit-split labels.

Captured with headless Chrome CDP (`/workspace/cdpshot.mjs`) against:
- **before:** `ab52de49` `next start` :3982
- **after:** tip `effcc9b5` `next start` :3981

| File | Viewport | Page |
|------|----------|------|
| before/after-home-{1440,390}.png | 1440 / 390 | `/` |
| before/after-prop-firms-{1440,390}.png | 1440 / 390 | `/prop-firms` |
| before/after-fundednext-{1440,390}.png | 1440 / 390 | `/blog/fundednext-review` |
| before/after-split-home-1440.png | 1440 | `/` focused on `.split-tiers` (after tip; before had no matching selector on home) |
| before/after-split-prop-1440.png | 1440 | `/prop-firms` (full-page fallback when selector missing on before) |

Pixel deltas are small (home-1440 +944 B); layout chrome is incremental, not a redesign.
