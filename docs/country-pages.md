# Evidence-only country pages

`lib/countryPages.ts` serves `/best-prop-firms-in-<slug>` (via `app/[slug]`) and,
when configured, `/ru/luchshie-prop-firmy-v-<ruSlug>` (via the
existing force-dynamic RU catch-all `app/ru/(fallback)/[...missing]`, so unknown
`/ru/*` paths keep their RU 404). No evidence file → no page.

## Discovery

- `content/data/<slug>-access-evidence.json` (Tracker naming, same as the UK/US files)
- optional extra path `content/data/country-access/<slug>.json`

The file name is the EN route slug. A slug with its own
`app/best-prop-firms-in-<slug>` folder (today `uk`, `us`, `india`) is skipped
before parsing, so those hubs keep winning and their files are never read here.
The same slug in both paths fails the build.

## Schema (UK allow-list shape, `content/data/uk-access-evidence.json`)

Required: `methodology`, `firms[]` with `firmSlug, firmName, accessStatus,
productSlugs, sourceUrl, sourceCapturedAt, evidenceLabel, evidenceSummary,
decisionNote`. Optional per row: `sourcePublishedAt`, `sourceQuote`, `assetClass`
(`cfd` | `futures`), `platformConstraint`.

Several rows may share one `firmSlug` when product lines have different policies
(e.g. CFD vs Futures). The template renders ONE card per `firmSlug`; each row
keeps its own products, source, date, asset class and platform constraint (shown
on the card). Products are never moved under another row's policy. Every "N firms"
figure counts unique `firmSlug`s, not rows.

Optional top-level metadata (Tracker contract 2026-11-09; never required,
unknown extras ignored): `countryCode` (ISO 3166-1 alpha-2, e.g. `AE` for the
UAE), `name: { en, ru }`, `ruSlug`, `ruInfix` (`v` by default; `na` for
«на Филиппинах»), `methodologyRu`.

- EN path: `/best-prop-firms-in-<file slug>`.
- RU path: `/ru/luchshie-prop-firmy-<ruInfix ?? "v">-<ruSlug>`; exists only with
  `ruSlug` **and** `name.ru`.
- Visible names come only from `name.en` / `name.ru`. Without `name.en` the page
  shows the raw slug and stays noindex; names are never derived from the slug.

## Listing rule

A row qualifies when `accessStatus` is `policy-supported` or `explicit`,
`sourceCapturedAt` is 0–30 days old at render time, and ≥1 `productSlugs`
entry is a current challenge record still sold to new buyers (a firm is listed
when ≥1 of its rows qualifies). Products are filtered one by one: a product with
`soldToNewBuyers: false`, stale data or an unknown slug is dropped from that row
only, and the row is dropped only when none of its mapped products remain
(ranker B1: filter the SKU, keep the firm). Any other status
never qualifies; nothing is inferred from notes or blank lists.
EN order: editorial score. RU order: Russia-available firms first (active pins
from `content/data/ru-ranking.json`), then the rest by score with FundedNext last;
RU sign-up CTA only where `firms.json` `russiaStatus` is `available`.

## Index gate (per language)

noindex + out of the sitemap until: ≥1 listed firm, a writer verdict
(`content/verdicts/country/<slug>.md` / `<slug>.ru.md`, format in
`lib/verdicts.ts`), `name.en` (and `name.ru` for RU) and ≥5 fields that differ between ≥2 listed firms. Hreflang
EN↔RU only when both pass. Test: `npm run test:country-pages`.
