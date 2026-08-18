import { getPostBySlug, getAllPostData, getAllPosts } from '@/lib/mdx'
import { getAllFirms } from '@/lib/firms'
import { postSchema, breadcrumbSchema, jsonLd } from '@/lib/schema'
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

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  const path = `/blog/${slug}`
  const firm = getAllFirms().find(candidate => candidate.reviewUrl === path)
  const title = post.seoTitle || (firm
    ? `${firm.name} Review (2026): Fees & Rules`
    : post.title)
  const description = post.seoDescription || (firm
    ? `${firm.name} review with source-dated fees, drawdown, payout rules, platforms, and True-Cost analysis for 2026.`
    : post.excerpt || post.title)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
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

function addHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_match, attrs, content) => {
    const text = content.replace(/<[^>]+>/g, '').trim()
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `<h2${attrs} id="${id}">${content}</h2>`
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const firms = getAllFirms()
  const outboundRelationships = buildOutboundRelationships(firms)
  const wordCount = post.content.replace(/<[^>]+>/g, '').split(/\s+/).length
  const readTime = Math.ceil(wordCount / 200)
  const contentWithIds = decoratePostOutboundLinks(
    addHeadingIds(post.content),
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
  const postLd = postSchema(post, firms)
  const crumbsLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      {/* ═══════════════════════════════ ARTICLE HERO ═══════════════════════════════ */}
      <section className="post-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-grid" aria-hidden />

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
                <User size={13} /> {post.author}
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
        <div className="post-layout">
          <article>
            {matchedFirm && <AffiliateDisclosure />}
            {matchedFirm && <FirmCtaCard firm={matchedFirm} />}
            {matchedFirm && <FirmStatPanel firm={matchedFirm} />}
            <TradingToolReviewStatus post={post} />

            <TableOfContents html={contentWithIds} />

            <div className="prose" style={{ maxWidth: '100%' }}
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

          <aside className="post-aside">
            <div className="post-sidebar-card">
              <span className="bento-tile-eyebrow">
                <ArrowRight size={12} /> Prop firms
              </span>
              <h3 className="post-sidebar-title">Jump to the data</h3>
              <ul className="post-sidebar-list">
                {[
                  { label: 'Compare all firms', href: '/prop-firms' },
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
        </div>
      </div>

      {matchedFirm && (
        <MobileStickyCTA
          name={matchedFirm.name}
          logo={matchedFirm.logo}
          score={matchedFirm.score}
          affiliateUrl={matchedFirm.affiliateUrl}
          affiliateSlug={matchedFirm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
          discountCode={matchedFirm.discountCode}
          discountPct={matchedFirm.discountPct}
        />
      )}
    </div>
  )
}
