# Best-for-X verdicts

Hand-written 120–250 word verdicts that unlock indexing on flat best-for routes.

Slugs are configured in `lib/bestFor.ts` → `BEST_FOR_SLUGS` (per id × language).
`null` means that language has no page.

## File names (use-case id)

| File | Notes |
|------|-------|
| `eas.md` / `eas.ru.md` | Links to `/prop-firms/ea-allowed` |
| `news-trading.md` / `.ru.md` | Links to `/prop-firms/news-trading` |
| `scalping.md` / `.ru.md` | Uses `rules.minHoldSeconds` (not scalpingAllowed) |
| `beginners.md` / `.ru.md` | RU URL fixed: `/ru/luchshie-prop-firmy-dlya-novichkov` |
| `weekly-payouts.ru.md` | **RU only** — EN unset (blog duplicate) |
| `no-time-limit.md` / `.ru.md` | Uses `evaluationTimeLimit` |
| `low-drawdown.md` | **EN only** until RU SEO Lead sets slug |
| `small-accounts.md` | **EN only** until RU SEO Lead sets slug |

## Frontmatter

Required: `slug`, `lang`, `checkedAt`, `author`, `sources`.
Optional (best-for): `title`, `h1`, `description` — override placeholders; RU SEO Lead owns RU.

```yaml
---
slug: beginners
lang: ru
checkedAt: '2026-11-05'
author: RU Writer
title: '…'
h1: '…'
description: '…'
sources:
  - title: Firm rules
    url: https://…
---
```

A missing file keeps that language **noindex** even when the 5-field data gate passes.
Hreflang is emitted only when **both** languages pass.
