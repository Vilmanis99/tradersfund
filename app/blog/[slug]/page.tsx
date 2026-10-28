import { firmSlug } from '@/lib/firmSlug'
import { getPostBySlug, getAllPostData, getAllPosts } from '@/lib/mdx'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { postSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { reviewFreshnessBlockers } from '@/lib/reviewFreshness'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, User, Tag, ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import TableOfContents from '@/components/TableOfContents'
import AuthorBio from '@/components/AuthorBio'
import RelatedPosts from '@/components/RelatedPosts'
import FirmCtaCard from '@/components/FirmCtaCard'
import FirmStatPanel from '@/components/FirmStatPanel'
import FirmRelatedLinks from '@/components/FirmRelatedLinks'
import FirmAlternatives from '@/components/FirmAlternatives'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import AnimatedNumber from '@/components/AnimatedNumber'
import MobileStickyCTA from '@/components/MobileStickyCTA'
import { decoratePostOutboundLinks } from '@/lib/postOutboundLinks'
import { buildOutboundRelationships } from '@/lib/outboundDestinations'
import { rankRelatedPosts } from '@/lib/relatedPosts'
import TradingToolReviewCluster, {
  TradingToolReviewStatus,
} from '@/components/TradingToolReviewCluster'
import { getTradingToolReviewLinks } from '@/lib/tradingToolReviews'
import IndiaMatchupLinks from '@/components/IndiaMatchupLinks'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { extractArticleFaq, firstVerdictSentence, prepareArticleContent, splitArticleDiagrams } from '@/lib/articleContent'
import { getAuthorByName } from '@/lib/authors'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import ReviewProductSummary, { PRODUCT_SUMMARY_REVIEWS } from '@/components/ReviewProductSummary'
import { promotableDiscount } from '@/lib/discountDisplay'
import Breadcrumbs from '@/components/Breadcrumbs'
import ReviewVerdictBox from '@/components/ReviewVerdictBox'
import PriceMatrix from '@/components/PriceMatrix'
import ChallengePath from '@/components/ChallengePath'
import DrawdownTypesDiagram from '@/components/DrawdownTypesDiagram'
import { comparisonHref } from '@/lib/relatedComparisons'
import { getReviewCopy } from '@/lib/verdictCopy'
import { rankFirmAlternatives } from '@/lib/firmAlternatives'
import { canonicalMatchupSlug, getCurrentCanonicalPairs } from '@/lib/comparisons'
import type { Firm } from '@/lib/firms'

interface Props { params: Promise<{ slug: string }> }

// Re-check the firm-product age gate hourly so the reader warning appears
// after a deployment even when no new article build is triggered.
export const revalidate = 3600
// Every post is prerendered from content/posts; an unknown slug is a 404.
export const dynamicParams = false

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  const path = `/blog/${slug}`
  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || post.title
  const languages = getLanguageAlternates(path)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, ...(languages ? { languages } : {}) },
    ...(post.sourceStatus === 'source-hold'
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: path,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const firms = getAllFirms()
  const outboundRelationships = buildOutboundRelationships(firms)
  const wordCount = post.content.replace(/<[^>]+>/g, '').split(/\s+/).length
  const readTime = Math.ceil(wordCount / 200)
  const prepared = prepareArticleContent(post.content)
  const author = post.author ? getAuthorByName(post.author) : undefined
  const contentWithIds = decoratePostOutboundLinks(
    prepared.html,
    outboundRelationships,
    slug,
  )

  const articleSegments = splitArticleDiagrams(contentWithIds)

  const allPosts = getAllPostData()
  const toolReviewLinks = getTradingToolReviewLinks(slug, allPosts)
  const toolReviewSlugs = new Set(toolReviewLinks.map(review => review.slug))
  const relatedCandidates = toolReviewLinks.length
    ? allPosts.filter(candidate => !toolReviewSlugs.has(candidate.slug))
    : allPosts
  const related = rankRelatedPosts(post, relatedCandidates)

  const matchedFirm = firms.find(f => f.reviewUrl === `/blog/${slug}`)
  const firmProducts = matchedFirm
    ? getAllChallenges().filter(product => product.firmSlug === firmSlug(matchedFirm.name))
    : []
  const staleFirmProducts = firmProducts.filter(product => !isChallengeFresh(product))
  const oldestFirmCapture = firmProducts.map(product => product.sourceCapturedAt).sort()[0]
  const hasProductSummary = PRODUCT_SUMMARY_REVIEWS.has(slug)
  const watchEntries = hasProductSummary ? getChallengeWatchEntries() : []
  const faqLd = hasProductSummary && firmProducts.length > 0 && reviewFreshnessBlockers(firmProducts).length === 0
    ? faqPageSchema(extractArticleFaq(post.content)) : null
  // Article format Phase 1 preview (design/article-format-spec.md §3.1–3.2):
  // VerdictBox first, sticky side contents, no generic sidebar. Scoped by slug.
  // Article format Phase 1 (design/article-format-spec.md §3.1–3.2): every firm
  // review opens with the VerdictBox and a sticky contents rail.
  const phase1Preview = Boolean(matchedFirm)
  const reviewCopy = getReviewCopy(slug)
  const verdictLine = phase1Preview ? (reviewCopy.verdict === undefined ? firstVerdictSentence(post.content) : reviewCopy.verdict) : null
  const freshFirmProducts = firmProducts.filter(product => isChallengeFresh(product))
  const compareFirm = phase1Preview && matchedFirm ? pickCompareFirm(matchedFirm, firms) : undefined
  const postLd = postSchema(post, firms)
  const crumbsLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postLd) }} />
      <Breadcrumbs ld={crumbsLd} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />}

      {/* ═══════════════════════════════ ARTICLE HERO ═══════════════════════════════ */}
      <section className={phase1Preview ? 'post-hero post-hero--p1' : 'post-hero'}>
        <div className="post-shell" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/blog" className="post-back">
            <ArrowLeft size={14} /> Back to all articles
          </Link>

          {post.categories?.length > 0 && (
            <div className="post-cats">
              {post.categories.map(c => (
                <Link key={c} href={`/category/${c.toLowerCase().replace(/\s+/g, '-')}`} className="cat-pill">{c}</Link>
              ))}
            </div>
          )}

          <h1 className="post-title">{post.title}</h1>

          {post.excerpt && (
            <p className="post-deck">{post.excerpt}</p>
          )}

          <div className="post-meta-strip">
            {post.author && (
              <span className="post-meta-item">
                <User size={13} aria-hidden="true" /> {author ? <Link href={`/authors/${author.slug}`}>{post.author}</Link> : post.author}
              </span>
            )}
            {post.date && (
              <span className="post-meta-item">
                <Calendar size={13} />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <span className="post-meta-item">
              <Clock size={13} /> <AnimatedNumber value={readTime} duration={900} /> min read
            </span>
            {post.modified && post.modified !== post.date && (
              <span className="post-meta-item post-meta-item--live">
                <span className="hero-eyebrow-dot" />
                Updated {new Date(post.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ BODY ═══════════════════════════════ */}
      <div className="post-shell post-body">
        <div className={phase1Preview ? 'post-layout post-layout--p1' : 'post-layout'}>
          <article>
            {matchedFirm && staleFirmProducts.length > 0 && (
              <aside className="review-freshness-notice" data-review-source-status="recapture-required" aria-label="Review source freshness">
                <strong>{post.sourceStatus === 'source-hold' ? 'Source hold — not included in current rankings.' : 'Source recheck required.'}</strong>{' '}
                {staleFirmProducts.length} product {staleFirmProducts.length === 1 ? 'capture is' : 'captures are'} older than the 30-day freshness window.
                Prices and rules may have changed; use the dated source links and the firm&apos;s current terms before paying.
                {oldestFirmCapture && <span> Oldest capture: <time dateTime={oldestFirmCapture}>{oldestFirmCapture}</time>.</span>}
              </aside>
            )}
            {phase1Preview && matchedFirm ? (
              <>
                {freshFirmProducts.length === 0 ? (
                  // Stale-data guard: with no capture inside the 30-day window the box
                  // (verdict sentence, fit lines, facts) is held back until Tracker
                  // recaptures; the firm card shows score, Trustpilot and the CTA only.
                  <>
                    <AffiliateDisclosure firmName={matchedFirm.name} hasAffiliate={Boolean(matchedFirm.affiliateUrl)} />
                    <FirmCtaCard firm={matchedFirm} productSpecific={hasProductSummary} />
                  </>
                ) : (
                <ReviewVerdictBox
                  firm={matchedFirm}
                  products={freshFirmProducts}
                  bestForOverride={reviewCopy.bestFor}
                  notForOverride={reviewCopy.notFor}
                  verdict={verdictLine}
                  compare={compareFirm ? { href: comparisonHref(matchedFirm, compareFirm), label: `Compare ${matchedFirm.name} vs ${compareFirm.name}` } : undefined}
                  sourcesHref="#captured-terms"
                />
                )}
                {freshFirmProducts.length > 0 && (
                  <PriceMatrix
                    products={freshFirmProducts}
                    firmName={matchedFirm.name}
                    firmSlug={firmSlug(matchedFirm.name)}
                    locale="en"
                    id="price-matrix"
                    title={`${matchedFirm.name} entry fee by account size`}
                    ariaLabel={`${matchedFirm.name} entry fees by account size (scrollable table)`}
                  />
                )}
                {freshFirmProducts.length > 0 && (
                  <ChallengePath
                    products={freshFirmProducts}
                    firmName={matchedFirm.name}
                    firmSlug={firmSlug(matchedFirm.name)}
                    locale="en"
                    id="path-to-funded"
                  />
                )}
                <details className="p1-collapsible" id="captured-terms">
                  <summary>Captured product terms and sources</summary>
                  {hasProductSummary
                    ? <ReviewProductSummary firm={matchedFirm} products={firmProducts} watchEntries={watchEntries} />
                    : <FirmStatPanel firm={matchedFirm} />}
                </details>
                <TradingToolReviewStatus post={post} />
                <details className="p1-collapsible p1-toc-mobile">
                  <summary>On this page</summary>
                  <TableOfContents headings={prepared.headings} />
                </details>
              </>
            ) : (
              <>
                {matchedFirm && (
                  <AffiliateDisclosure
                    firmName={matchedFirm.name}
                    hasAffiliate={Boolean(matchedFirm.affiliateUrl)}
                  />
                )}
                {matchedFirm && <FirmCtaCard firm={matchedFirm} productSpecific={hasProductSummary} />}
                {matchedFirm && (hasProductSummary
                  ? <ReviewProductSummary firm={matchedFirm} products={firmProducts} watchEntries={watchEntries} />
                  : <FirmStatPanel firm={matchedFirm} />)}
                <TradingToolReviewStatus post={post} />

                <TableOfContents headings={prepared.headings} />
              </>
            )}

            {articleSegments.some(segment => segment.kind === 'diagram') ? (
              // Only articles with an authored diagram slot are segmented; every other
              // article keeps its single unwrapped prose container.
              <div className="prose post-prose">
                {articleSegments.map((segment, index) => segment.kind === 'diagram'
                  ? <DrawdownTypesDiagram key={`diagram-${index}`} locale="en" />
                  : <div key={`html-${index}`} className="post-prose__segment" dangerouslySetInnerHTML={{ __html: segment.html }} />)}
              </div>
            ) : (
              <div className="prose post-prose"
                dangerouslySetInnerHTML={{ __html: contentWithIds }} />
            )}

            {matchedFirm && <FirmAlternatives current={matchedFirm} allFirms={firms} />}
            {matchedFirm && <FirmRelatedLinks firmName={matchedFirm.name} />}
            {matchedFirm && <IndiaMatchupLinks firmName={matchedFirm.name} />}
            {toolReviewLinks.length > 0 && (
              <TradingToolReviewCluster current={post} reviews={toolReviewLinks} />
            )}

            {post.tags?.length > 0 && (
              <div className="post-tags">
                <Tag size={14} style={{ color: 'var(--muted)' }} />
                {post.tags.map(t => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            )}

            {post.author && <AuthorBio name={post.author} />}

            <RelatedPosts posts={related} />
          </article>

          {phase1Preview && matchedFirm ? (
            <aside className="post-aside p1-rail" aria-label="Contents and firm summary">
              <div className="p1-rail__inner">
                <TableOfContents headings={prepared.headings} />
                <div className="p1-rail__firm">
                  <div className="p1-rail__firm-row"><strong>{matchedFirm.name}</strong><b>{matchedFirm.score}</b></div>
                  <Link
                    href={`/go/${firmSlug(matchedFirm.name)}?from=review-cta`}
                    prefetch={false}
                    rel={matchedFirm.affiliateUrl ? 'sponsored nofollow noopener' : 'nofollow noopener'}
                    target="_blank"
                    className="btn-primary"
                  >
                    {matchedFirm.affiliateUrl ? `Visit ${matchedFirm.name}` : 'View official plans'}
                  </Link>
                  <Link href="/prop-firm-challenges" className="p1-rail__more">Compare all programmes</Link>
                </div>
              </div>
            </aside>
          ) : (
          <aside className="post-aside">
            <div className="post-sidebar-card">
              <span className="bento-tile-eyebrow">
                <ArrowRight size={12} /> Prop firms
              </span>
              <h3 className="post-sidebar-title">Jump to the data</h3>
              <ul className="post-sidebar-list">
                {[
                  { label: 'Compare programmes', href: '/prop-firm-challenges' },
                  { label: 'Browse all firms', href: '/prop-firms' },
                  { label: 'Best in India', href: '/best-prop-firms-in-india' },
                  { label: 'India challenge rules', href: '/best-prop-firms-in-india/challenge-comparison' },
                  { label: 'India payout methods', href: '/best-prop-firms-in-india/payout-methods' },
                  { label: 'India payout tax records', href: '/blog/prop-firm-payout-tax-india' },
                  { label: 'Best in the UK', href: '/best-prop-firms-in-uk' },
                  { label: 'Best in the US', href: '/best-prop-firms-in-us' },
                  { label: 'Cheapest options', href: '/cheapest-prop-firms' },
                  { label: 'Instant funding', href: '/best-instant-funding-prop-firms' },
                ].map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="post-sidebar-link">
                      <span>{l.label}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          )}
        </div>
      </div>

      {matchedFirm && (
        <MobileStickyCTA
          name={matchedFirm.name}
          logo={matchedFirm.logo}
          score={matchedFirm.score}
          affiliateUrl={matchedFirm.affiliateUrl}
          affiliateSlug={firmSlug(matchedFirm.name)}
          discountCode={promotableDiscount(matchedFirm)?.code}
          discountPct={promotableDiscount(matchedFirm)?.pct}
        />
      )}
    </div>
  )
}

/**
 * "Compare with…" target: the most relevant alternative (asset and platform
 * overlap, then score; commercial fields never enter the ranking) that has a
 * current comparison page.
 */
function pickCompareFirm(firm: Firm, firms: Firm[]) {
  const current = new Set(getCurrentCanonicalPairs().map(pair => pair.matchup))
  const own = firmSlug(firm.name)
  return rankFirmAlternatives(firm, firms, firms.length)
    .find(candidate => current.has(canonicalMatchupSlug(own, firmSlug(candidate.name))))
}

