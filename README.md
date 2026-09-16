This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local review workflow

Build and review locally before any release. The production preview is detached so it can stay available while the checks run:

```bash
npm install
npm run build
npm run preview:start
```

Open the URL printed by `preview:start` (for example, `http://127.0.0.1:3216`). If the default port is occupied, set `TFH_PREVIEW_PORT` before starting; the local checks use that value (or the controller's recorded port) automatically:

```powershell
$env:TFH_PREVIEW_PORT = '3216'
npm run preview:start
npm run check:home-release
npm run check:finder-release
npm run check:light-release
npm run crawl:release:strict
```

Stop the preview when finished with `npm run preview:stop`. These commands do not deploy or push anything.

The focused English and Russian homepages intentionally surface the finder, a small set of decision links, and disclosed FundedNext/Bright Funded partner placements; the full article library remains available from the blog and directory.

Reviews with an explicit `sourceStatus: "source-hold"` remain reachable as dated
archives while a firm's first-party pricing or eligibility source is unavailable
or contradictory. They are marked with a visible recheck notice, emitted with
`noindex`, excluded from the sitemap and current alternatives, and do not relax
the 30-day freshness gate for any other review.

## Fast development mode

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Release approval

Deployments are intentionally separate from local commits and previews. Do not push a Vercel-connected branch or start a remote deployment until the release has passed the local audit and received explicit approval.
