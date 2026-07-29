import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getAllPosts } from '@/lib/mdx'
import { LANDINGS } from '@/lib/landings'
import { FEATURES } from '@/lib/features'
import { AUTHORS } from '@/lib/authors'
import { INDIA_MATCHUPS, indiaMatchupPath } from '@/lib/indiaMatchups'

const SITE = 'https://tradersfundhub.com'

// Prerender at build — only changes when content/data changes.
export const dynamic = 'force-static'

/**
 * /llms.txt — the llmstxt.org standard. Gives LLMs (ChatGPT, Perplexity,
 * Claude, Google AI) a curated, link-rich map of the site so they cite the
 * right pages. Generated from the same data the site renders, so it stays
 * accurate without manual upkeep.
 */
export async function GET() {
  const firms = getAllFirms()
  const posts = getAllPosts()
  const challenges = getAllChallenges().filter(challenge => isChallengeFresh(challenge))
  const challengesNote = ` The product-level comparison currently contains ${challenges.length} source-fresh challenge products.`

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
  const indiaMatchupLines = Object.values(INDIA_MATCHUPS)
    .map(matchup =>
      `- [${matchup.title} for India](${SITE}${indiaMatchupPath(matchup)}): `
      + matchup.metaDescription)
    .join('\n')

  const body = `# Traders Fund Hub

> Independent prop-firm (proprietary trading firm) reviews, comparisons, and challenge-cost analysis. Every firm is scored on the same rubric — profit split, payout speed, drawdown rules, rule transparency, and operating history — with no marketing fluff. The site is affiliate-supported, but rankings are not for sale: editorial scores are independent of partnerships.

Traders Fund Hub helps traders choose a prop firm (a company that funds traders who pass an evaluation challenge). It tracks the major firms with side-by-side comparisons for every firm pair, data-driven "best for X" rankings, and guides on how challenges work and how to pass them. All numeric claims trace to each firm's published terms; where data isn't verifiable it is marked, never invented.${challengesNote}

## Core pages
- [Best Prop Firms 2026 (ranked)](${SITE}/best-prop-firms-2026): the overall opinionated ranking, with a one-line verdict on who each firm suits.
- [Prop firm directory](${SITE}/prop-firms): every tracked firm with source-dated products, evaluation filters, direct comparisons, platforms, profit splits, and payout timing.
- [Prop firm challenge comparison](${SITE}/prop-firm-challenges): product-level prices, funded-cost floors, targets, loss limits, drawdown, payouts, rules, first-party sources, and a dated change watch.
- [Prop firm challenge changes](${SITE}/prop-firm-challenge-changes): a source-dated ledger of verified rule and lineup changes, price watches, unresolved source conflicts, and the practical impact on traders.
- [Best prop firms in India](${SITE}/best-prop-firms-in-india): an India-specific ranking that applies the RBI Alert List and dated country-availability gate before commercial sorting.
- [India prop-firm comparison library](${SITE}/best-prop-firms-in-india/compare): curated head-to-head matchups organized by India checkout, payout, KYC, risk-rule and product-choice questions.
- [India prop-firm challenge changes](${SITE}/best-prop-firms-in-india/challenge-changes): verified changes and open watches filtered through current India eligibility, RBI and product-freshness gates.
- [India prop-firm challenge comparison](${SITE}/best-prop-firms-in-india/challenge-comparison): source-dated product rules with RBI, country, KYC, payout and INR-planning evidence attached.
${indiaMatchupLines}
- [Compare firms](${SITE}/compare): head-to-head matchups for every firm pair, with editorial verdicts on the most-searched ones.
- [Prop firm discount codes & deals](${SITE}/prop-firm-discount-codes): verified discount codes and partner offers, each stamped with the date we last checked it — expired codes are removed, never invented.
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
