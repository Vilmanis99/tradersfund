import { firmSlug } from '@/lib/firmSlug'
import { getPostBySlug, getAllPostData, getAllPosts } from '@/lib/mdx'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { postSchema, breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, User, Tag, ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import TableOfContents from '@/components/TableOfContents'
import AuthorBio from '@/components/AuthorBio'
import RelatedPosts from '@/components/RelatedPosts'
import FirmCtaCard from '@/components/FirmCtaCard'
import FirmStatPanel from '@/components/FirmStatPanel'
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
import { articlePlainText, extractArticleFaq, prepareArticleContent } from '@/lib/articleContent'
import { getAuthorByName } from '@/lib/authors'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import ReviewProductSummary, { PRODUCT_SUMMARY_REVIEWS } from '@/components/ReviewProductSummary'
import { promotableDiscount } from '@/lib/discountDisplay'
import Breadcrumbs from '@/components/Breadcrumbs'
import ReviewVerdictBox from '@/components/ReviewVerdictBox'
import { comparisonHref } from '@/lib/relatedComparisons'

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
  const faqLd = hasProductSummary && firmProducts.length > 0 && staleFirmProducts.length === 0
    ? faqPageSchema(extractArticleFaq(post.content)) : null
  // Article format Phase 1 preview (design/article-format-spec.md §3.1–3.2):
  // VerdictBox first, sticky side contents, no generic sidebar. Scoped by slug.
  const phase1Preview = PHASE1_PREVIEW_REVIEWS.has(slug) && Boolean(matchedFirm)
  const verdictLine = phase1Preview ? firstVerdictSentence(post.content) : null
  const compareFirm = phase1Preview ? firms.find(f => f.name === PHASE1_PREVIEW_REVIEWS.get(slug)) : undefined
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
                <ReviewVerdictBox
                  firm={matchedFirm}
                  products={firmProducts}
                  verdict={verdictLine}
                  compare={compareFirm ? { href: comparisonHref(matchedFirm, compareFirm), label: `Compare ${matchedFirm.name} vs ${compareFirm.name}` } : undefined}
                  sourcesHref="#captured-terms"
                />
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

            <div className="prose post-prose"
              dangerouslySetInnerHTML={{ __html: contentWithIds }} />

            {matchedFirm && <FirmAlternatives current={matchedFirm} allFirms={firms} />}
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

/** Reviews on the Phase 1 preview layout, mapped to the firm used for the "Compare with…" link. */
const PHASE1_PREVIEW_REVIEWS = new Map<string, string>([['ftmo-review', 'FundedNext']])

/** First sentence of the review's own "Verdict" section, unchanged. */
function firstVerdictSentence(content: string) {
  const match = content.match(/<h2\b[^>]*>\s*(?:<strong>)?\s*Verdict\s*(?:<\/strong>)?\s*<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)
  if (!match) return null
  const text = articlePlainText(match[1])
  const sentence = text.match(/^[\s\S]+?[.!?](?=\s+[A-Z]|$)/)
  return (sentence ? sentence[0] : text).trim() || null
}
