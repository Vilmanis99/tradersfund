# Adding a new Russian page (for the RU Writer)

Reserved routes: `/ru/prop-trejding`, `/ru/funded-account` (see `RUSSIAN_PLANNED_ROUTES` in `lib/localizedRoutes.ts`).
Until a page file exists, a reserved route is **not** in the sitemap and must not be linked.

## Publish a reserved route
1. Create `app/ru/<slug>/page.tsx` (copy the structure of `app/ru/ftmo-dlya-rossiyan/page.tsx`: metadata with
   `alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) }`, breadcrumb + Article schema, `RussianFaq`).
2. In `lib/localizedRoutes.ts` move the path from `RUSSIAN_PLANNED_ROUTES` into `RUSSIAN_ONLY_ROUTES`, delete it from
   `RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES`, and add it to `RUSSIAN_ROUTE_EDITORIAL_DATES` with the publish date (YYYY-MM-DD).
   Then use `russianRouteDateModified(PATH)` for the Article `dateModified` and the visible "Обновлено" date.
   (Interim option: keep it planned and just set its date in `RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES`; the sitemap
   includes a planned route only when the page file exists **and** a date is set.)
3. Sign-up CTAs: only via `RuGoLink` (`components/RuGoLink.tsx`). Every firm keeps its CTA; RuGoLink adds a
   Russia-access badge from `russiaStatus` (open / closed / unclear) and an «альтернативы» hint for restricted firms.
   Use `goLinkRel(slug)` for `rel`. Put universal firms (e.g. BrightFunded) first where the ranking allows.
4. Internal links to a planned route from other pages: use `russianPlannedHref('/ru/<slug>')` from
   `lib/russianPlannedRoutes.ts` (server components only) — it returns `null` until the page exists, so no 404 links ship.
5. Add the page to `scripts/release-crawl.mjs` (title, H1, markers) and bump the expected Russian Article schema count;
   make sure it has at least 4 internal inlinks.
6. Run `npm run lint`, `npm run build`, `node scripts/test-russian-expiry.mjs --built` (Node 22.15+) and
   `node scripts/release-crawl.mjs http://127.0.0.1:<port>` against `npx next start`.

## New reserved slug
Add it to `RUSSIAN_PLANNED_ROUTES` and `RUSSIAN_PLANNED_ROUTE_EDITORIAL_DATES` (value `null`).
