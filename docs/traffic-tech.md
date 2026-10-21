# Traffic tech (week 1)

## Sitemap and orphan audit
`npm run build && npx next start -p 3214 &` then `npm run audit:sitemap -- http://127.0.0.1:3214 [--json out.json]`.
Checks that every sitemap URL answers 200 directly (no redirect/404), is indexable and self-canonical; that every indexable prerendered route is in the sitemap; and that no sitemap URL is an orphan (zero internal inbound links from other sitemap pages). Exit code 1 on any failure.

Result on main (2026-10-15): 263 sitemap URLs, 0 errors, 0 orphans. Weakest internal linking: the 17 `/compare/apex-trader-funding-vs-*` pages (2 inbound links each: /compare and the Apex review). Related-comparison blocks deliberately skip Apex because it has no fresh product capture; recapturing Apex is the real fix.

## IndexNow
- Key: `efe7141439424e2eb37e4faaff858975`, hosted at https://tradersfundhub.com/efe7141439424e2eb37e4faaff858975.txt (live, verified). The key is public by protocol design; **no secret is needed**.
- `npm run indexnow -- --changed <base-sha>` submits URLs whose source changed (posts and static pages map to their URL; shared code/data/templates submit the whole sitemap). `--all` submits the whole sitemap. `--dry-run` prints the payload. Only URLs present in the live sitemap are sent, plus /sitemap.xml.
- **Workflow file (owner adds it):** the automation token cannot create GitHub workflow files, so the workflow is shipped as `docs/indexnow-workflow.yml`. Copy it to `.github/workflows/indexnow.yml` (GitHub web UI → Add file, or a commit by a token with `workflow` scope). Once added, it runs after each **successful Vercel Production deployment** (`deployment_status` event from the Vercel GitHub integration) and submits the URLs changed by the deployed commit. It can also be run by hand (Actions → "IndexNow after production deploy" → Run workflow, mode `all` or a base SHA).
- Owner steps: (0) add the workflow file as above; (1) confirm the Vercel GitHub integration is connected (it is what sends deployment_status); (2) optionally verify the site in Bing Webmaster Tools and Yandex Webmaster to see IndexNow submissions there; (3) run the workflow once with mode `all` after merging.

## Structured data (verified 2026-10-15)
| Template | Types |
|---|---|
| `/` | Organization (logo), WebSite (`@id`, publisher → Organization, inLanguage en+ru), FAQPage |
| `/ru` | Organization (added), CollectionPage (isPartOf WebSite `@id`), BreadcrumbList, FAQPage |
| rankings (`/best-prop-firms-2026`, `/ru/luchshie-prop-firmy`, `/prop-firms`) | ItemList of Organization, BreadcrumbList, FAQPage |
| EN reviews (`/blog/*-review`) | Review of Product with one editorial reviewRating (no aggregateRating), BreadcrumbList, FAQPage |
| RU reviews, guides | Article, BreadcrumbList, FAQPage |
| `/compare/*` | ItemList, BreadcrumbList |
No fake or self-aggregated ratings anywhere (no `aggregateRating`). Note: Google shows FAQ rich results only for authoritative government/health sites since 2023; the FAQPage markup is valid but will not produce FAQ snippets.

## Core Web Vitals (Lighthouse 12, mobile, 2026-10-15)
| Page | Local prod build | Production |
|---|---|---|
| / | 99 (LCP 2.1 s) | 99 (LCP 2.1 s) |
| /ru | 98 (2.4 s) | |
| /best-prop-firms-2026 | 99 (2.1 s) | |
| /ru/luchshie-prop-firmy | 98 (2.4 s) | 98 (2.3 s) |
| /blog/ftmo-review | 98 (2.3 s) | |
| /ru/obzor-ftmo | 99 (2.1 s) | |
| /prop-firm-discount-codes | 97 (2.6 s) | |
| /ru/promokody-prop-firm | 99 (2.1 s) | |
| /compare/ftmo-vs-fundingpips | 96 (2.7 s) | |
| /prop-firm-challenges | 91 (3.4 s) | 98 (2.3 s) |
CLS is 0 everywhere; TBT ≤ 120 ms. Images (responsive, modern formats) and fonts (font-display) already pass. No code change was justified. Watch item: /prop-firm-challenges renders ~3,400 DOM nodes (full comparison table); paginating or virtualising the table is the next lever if field data (CrUX in Search Console) turns amber.
