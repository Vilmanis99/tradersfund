import Link from 'next/link'
import { getAllPosts, getAllCategories } from '@/lib/mdx'
import { blogIndexSchema, breadcrumbSchema, jsonLd } from '@/lib/schema'
import BlogCard from '@/components/BlogCard'
import AnimatedNumber from '@/components/AnimatedNumber'
import TiltCard from '@/components/TiltCard'
import { ArrowRight, ArrowUpRight, Newspaper, Clock, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Reviews, rule-change alerts and trading-style breakdowns from the prop-firm beat.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — Traders Fund Hub',
    description: 'Reviews, rule-change alerts and trading-style breakdowns from the prop-firm beat.',
    url: '/blog',
    type: 'website',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()
  const categories = getAllCategories()
  const [featured, ...rest] = posts
  const secondaryFeatured = rest.slice(0, 2)
  const remainder = rest.slice(2)

  const lastUpdated = posts
    .map(p => p.modified || p.date)
    .filter(Boolean)
    .sort()
    .at(-1)

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(blogIndexSchema(posts)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <span className="hero-eyebrow-dot" />
            <AnimatedNumber value={posts.length} duration={1100} /> articles ·{' '}
            {categories.length} categories
            {lastUpdated && (
              <>
                {' '}· updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </>
            )}
          </div>

          <h1 className="blog-hero-title">
            Field notes from the{' '}
            <span className="gradient-text gradient-text--animated">prop-firm beat.</span>
          </h1>

          <p className="blog-hero-sub">
            Reviews, rule-change alerts, and trading-style breakdowns. No
            marketing reprints — every claim traces back to the firm&apos;s
            current public spec.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════ FEATURED BENTO ═══════════════════════════════ */}
      {featured && (
        <section className="home-section" style={{ paddingTop: '2rem' }}>
          <div className="home-shell">
            <div className="section-head">
              <h2 className="section-title">
                <Sparkles size={18} style={{ color: 'var(--accent-light)' }} />
                Latest
              </h2>
              <span className="section-sub">
                <Clock size={13} /> Sorted newest first
              </span>
            </div>

            <div className="blog-featured-grid">
              {/* Main featured — spans 2 cols, 2 rows */}
              <TiltCard className="blog-featured blog-featured--hero" max={5}>
                <Link href={`/blog/${featured.slug}`} className="blog-featured-link">
                  <div className="blog-featured-glow" aria-hidden />
                  <div>
                    {featured.categories?.length > 0 && (
                      <div className="blog-featured-cats">
                        {featured.categories.slice(0, 2).map(c => (
                          <span key={c} className="cat-pill">{c}</span>
                        ))}
                      </div>
                    )}
                    <h3 className="blog-featured-title">{featured.title}</h3>
                    {featured.excerpt && (
                      <p className="blog-featured-excerpt">{featured.excerpt}</p>
                    )}
                  </div>
                  <div className="blog-featured-foot">
                    <span className="blog-featured-meta">
                      {featured.date && new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {featured.author && ` · ${featured.author}`}
                    </span>
                    <span className="blog-featured-cta">
                      Read article <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              </TiltCard>

              {/* Two side features */}
              {secondaryFeatured.map(post => (
                <TiltCard key={post.slug} className="blog-featured blog-featured--side" max={6}>
                  <Link href={`/blog/${post.slug}`} className="blog-featured-link blog-featured-link--side">
                    {post.categories?.[0] && (
                      <span className="cat-pill" style={{ alignSelf: 'flex-start' }}>{post.categories[0]}</span>
                    )}
                    <h3 className="blog-featured-title blog-featured-title--side">{post.title}</h3>
                    {post.excerpt && (
                      <p className="blog-featured-excerpt blog-featured-excerpt--side">{post.excerpt}</p>
                    )}
                    <div className="blog-featured-foot">
                      <span className="blog-featured-meta">
                        {post.date && new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <ArrowUpRight size={14} style={{ color: 'var(--accent-light)' }} />
                    </div>
                  </Link>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ CATEGORY RAIL ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <div className="home-shell">
          <div className="blog-filter-row">
            <span className="blog-filter-label">Browse by</span>
            <div className="blog-filter-pills">
              <Link href="/blog" className="filter-pill active">All</Link>
              {categories.map(c => (
                <Link
                  key={c}
                  href={`/category/${c.toLowerCase().replace(/\s+/g, '-')}`}
                  className="filter-pill"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ ALL POSTS ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '0.5rem' }}>
        <div className="home-shell">
          <div className="section-head">
            <h2 className="section-title">
              <Newspaper size={18} style={{ color: 'var(--accent-light)' }} />
              All articles
            </h2>
            <span className="section-sub">
              <AnimatedNumber value={remainder.length} duration={800} /> more
            </span>
          </div>

          <div className="post-grid">
            {remainder.map(post => <BlogCard key={post.slug} post={post} />)}
          </div>

          {remainder.length === 0 && (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>
              That&apos;s every article.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════ CTA FINALE ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 560 }}>
            <span className="bento-tile-eyebrow">
              <Sparkles size={12} /> Skip the reading
            </span>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)' }}>
              Or just compare every firm in <span className="gradient-text">one table.</span>
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              Side-by-side specs, filtered by what actually matters to your style.
            </p>
            <div className="cta-final-row">
              <Link href="/main-table" className="btn-primary btn-glow">
                Open the comparison table <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
