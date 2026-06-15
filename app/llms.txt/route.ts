import { getAllFirms } from '@/lib/firms'
import { getAllPosts } from '@/lib/mdx'
import { LANDINGS } from '@/lib/landings'
import { FEATURES } from '@/lib/features'
import { AUTHORS } from '@/lib/authors'

const SITE = 'https://tradersfundhub.com'

// Prerender at build — only changes when content/data changes.
export const dynamic = 'force-static'

/**
 * /llms.txt — the llmstxt.org standard. Gives LLMs (ChatGPT, Perplexity,
 * Claude, Google AI) a curated, link-rich map of the site so they cite the
 * right pages. Generated from the same data the site renders, so it stays
 * accurate without manual upkeep.
 */
function firmSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  const firms = getAllFirms()
  const posts = getAllPosts()
  const challengesNote = '' // count omitted to avoid drift

  const byScore = [...firms].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const reviewLines = byScore
    .map(f => `- [${f.name} review](${SITE}${f.reviewUrl}): ${f.name} scored ${f.score?.toFixed(1)}/10 — ${f.profitSplitPct ?? '—'}% split, ${f.payoutFrequency ?? '—'} payouts, ${f.drawdownType} drawdown, founded ${f.founded}.`)
    .join('\n')

  const landingLines = LANDINGS
    .map(l => `- [${l.h1}](${SITE}/${l.slug}): ${l.metaDescription}`)
    .join('\n')

  const featureLines = FEATURES
    .map(f => `- [${f.h1}](${SITE}/prop-firms/${f.slug}): ${f.metaDescription}`)
    .join('\n')

  // Guides = posts that are not firm reviews.
  const reviewUrls = new Set(firms.map(f => f.reviewUrl))
  const guideLines = posts
    .filter(p => !reviewUrls.has(`/blog/${p.slug}`))
    .slice(0, 14)
    .map(p => `- [${p.title}](${SITE}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ''}`)
    .join('\n')

  const authorLines = AUTHORS
    .map(a => `- [${a.name}](${SITE}/authors/${a.slug})`)
    .join('\n')

  const body = `# Traders Fund Hub

> Independent prop-firm (proprietary trading firm) reviews, comparisons, and challenge-cost analysis. Every firm is scored on the same rubric — profit split, payout speed, drawdown rules, rule transparency, and operating history — with no marketing fluff. The site is affiliate-supported, but rankings are not for sale: editorial scores are independent of partnerships.

Traders Fund Hub helps traders choose a prop firm (a company that funds traders who pass an evaluation challenge). It tracks the major firms with side-by-side comparisons for every firm pair, data-driven "best for X" rankings, and guides on how challenges work and how to pass them. All numeric claims trace to each firm's published terms; where data isn't verifiable it is marked, never invented.${challengesNote}

## Core pages
- [Best Prop Firms 2026 (ranked)](${SITE}/best-prop-firms-2026): the overall opinionated ranking, with a one-line verdict on who each firm suits.
- [Prop firm directory](${SITE}/main-table): every tracked firm, filterable by asset, platform, profit split, and payout speed.
- [Compare firms](${SITE}/compare): head-to-head matchups for every firm pair, with editorial verdicts on the most-searched ones.
- [How prop firm challenges work](${SITE}/how-prop-firm-challenges-work): the five-stage lifecycle from buying a challenge to first payout.
- [How to pass a prop firm challenge](${SITE}/how-to-pass-a-prop-firm-challenge): a risk-first playbook with the rules that quietly end accounts.
- [The true cost of prop firm challenges](${SITE}/true-cost-of-prop-firm-challenges): break-even math and R-multiple analysis per challenge.
- [How we score firms (methodology)](${SITE}/methodology): the scoring rubric and what it does and doesn't measure.

## Firm reviews
${reviewLines}

## Best-for rankings
${landingLines}

## Rule-based firm filters
${featureLines}

## Guides
${guideLines}

## Authors
${authorLines}

## About
- [About Traders Fund Hub](${SITE}/about)
- [Contact](${SITE}/contact)
- [RSS feed](${SITE}/feed.xml)
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
