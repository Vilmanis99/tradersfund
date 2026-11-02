# Best-for-X verdicts

Hand-written 120–250 word verdicts that unlock indexing on
`/best-prop-firms-for/<slug>` and `/ru/luchshie-prop-firmy-dlya/<slug>`.

## File names (use-case id, not the URL slug)

| File | Page |
|------|------|
| `eas.md` / `eas.ru.md` | EAs & bots |
| `news-trading.md` / `news-trading.ru.md` | News trading |
| `scalping.md` / `scalping.ru.md` | Scalping |
| `beginners.md` / `beginners.ru.md` | Beginners |
| `weekly-payouts.md` / `weekly-payouts.ru.md` | Weekly payouts |
| `no-time-limit.md` / `no-time-limit.ru.md` | No time limit |

## Frontmatter (required)

Same shape as `content/verdicts/rules/`:

```yaml
---
slug: eas
lang: en
checkedAt: '2026-11-0x'
author: Your Name
sources:
  - title: Firm rules page
    url: https://…
---
```

Body: 120–250 words. Every claim must trace to `firms.json` / challenge JSON.
A missing file keeps the page **noindex** even when the 5-field data gate passes.
See `/workspace/tradersfundhub/drafts/best-for-x-template-guide.md`.
