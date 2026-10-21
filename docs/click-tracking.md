# /go click tracking

Every outbound click through `/go/<firm>` is logged without personal data.

## What is recorded
One Vercel Web Analytics **custom event `go_click`** per redirect, with these properties:

| Property | Meaning | Example |
|---|---|---|
| `firm` | firm slug from the /go URL | `bright-funded` |
| `kind` | `affiliate` (firm has an affiliateUrl), `official` (first-party site), `source` (evidence link) | `affiliate` |
| `placement` | the `?from=` parameter (normalised, max 64 chars; `unknown` if missing) | `ru-home-hero-bright-funded` |
| `source_path` | path of the page the click came from (same-site Referer, path only, no query or hash; `unknown` if absent or external) | `/ru/luchshie-prop-firmy` |
| `lang` | `ru` for `/ru` pages, otherwise `en`; falls back to the `ru-` placement prefix when there is no referer | `ru` |

The same click is also written as one JSON line to the Vercel runtime logs, as before: `affiliate_click` and `official_site_click` carry `firm`, `placement` and `locale`; `source_click` carries `firm`, `placement` and `source_product`.

## Privacy
- No cookies are set or read. No IP address, user agent, query string or visitor identifier is stored or forwarded.
- `lib/goClickTracking.ts` calls `track()` from `@vercel/analytics/server` with a synthetic header set containing only the source page URL. It does not forward `user-agent`, `x-forwarded-for` or `cookie`.
- Fail-open: the event is sent with `next/server` `after()`, once the redirect response has gone out. Every error is swallowed, so tracking can never block or slow a redirect.

## How to view clicks per firm
1. Vercel dashboard → project **tradersfund** → **Analytics** (Web Analytics) → **Events**.
2. Open **go_click**. Pick a property in the breakdown: `firm` (clicks per firm), `placement` or `source_path` (which page or button), `lang` (EN vs RU), `kind` (paid vs unpaid).
3. Set the date range. Filters combine, e.g. `lang = ru` + breakdown by `firm` gives RU clicks per firm.
4. For the weekly KPI report, export the table (CSV) or read the same numbers from the runtime logs: Vercel → **Logs**, filter `"event":"affiliate_click"`.

Requirements: Web Analytics must be enabled on the project. Custom events with properties need a plan that includes them (Pro or Web Analytics Plus); without it the dashboard shows the event count but no property breakdown. In that case use the runtime logs (or a Log Drain) as the per-firm source. Locally, with no `VERCEL_URL` set, `track()` only prints `[Vercel Web Analytics] Track "go_click" …` to the console.

## Testing
`npm run build && npx next start -p 3214`, then `node scripts/test-go-click-tracking.mjs http://127.0.0.1:3214`. It checks 302 redirects with and without a referer, that no cookie is set, and the unknown-firm fallback.
