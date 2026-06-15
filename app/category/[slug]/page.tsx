import { getPostsByCategory, getAllCategories } from '@/lib/mdx'
import BlogCard from '@/components/BlogCard'
import AnimatedNumber from '@/components/AnimatedNumber'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Folder } from 'lucide-react'

interface Props { params: Promise<{ slug: string }> }

// Only real category slugs (from generateStaticParams) resolve. A bogus
// category like /category/nonsense-xyz now hard-404s instead of returning
// a 200 soft-404 — closes the infinite low-quality-page surface.
export const dynamicParams = false

function slugToName(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export async function generateStaticParams() {
  return getAllCategories().map(c => ({ slug: c.toLowerCase().replace(/\s+/g, '-') }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const name = slugToName(slug)
  const path = `/category/${slug}`
  return {
    title: `${name} Articles`,
    description: `Browse all articles in the ${name} category — reviews, guides, and analysis.`,
    alternates: { canonical: path },
    openGraph: {
      title: `${name} Articles | Traders Fund Hub`,
      description: `Browse all articles in the ${name} category.`,
      url: path,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const name = slugToName(slug)
  const posts = getPostsByCategory(name)
  if (!posts.length) notFound()

  const allCats = getAllCategories()
  const currentSlug = slug

  return (
    <div>
      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
            <Folder size={12} />
            Category · <AnimatedNumber value={posts.length} duration={900} /> article{posts.length === 1 ? '' : 's'}
          </div>

          <h1 className="blog-hero-title">
            Articles tagged{' '}
            <span className="gradient-text gradient-text--animated">{name}.</span>
          </h1>

          <p className="blog-hero-sub">
            Filtered to just the {name.toLowerCase()} content. Sorted newest
            first.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════ FILTER RAIL ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2rem' }}>
        <div className="home-shell">
          <div className="blog-filter-row">
            <span className="blog-filter-label">Browse by</span>
            <div className="blog-filter-pills">
              <Link href="/blog" className="filter-pill">All</Link>
              {allCats.map(c => {
                const cSlug = c.toLowerCase().replace(/\s+/g, '-')
                const active = cSlug === currentSlug
                return (
                  <Link
                    key={c}
                    href={`/category/${cSlug}`}
                    className={`filter-pill${active ? ' active' : ''}`}
                  >
                    {c}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ POSTS ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '0.5rem' }}>
        <div className="home-shell">
          <div className="post-grid">
            {posts.map(post => <BlogCard key={post.slug} post={post} />)}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/blog" className="btn-outline">
              ← Browse all articles
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 560 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              Want the data, not the prose?
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              The full firm directory has every spec side-by-side.
            </p>
            <Link href="/main-table" className="btn-primary btn-glow">
              Open the comparison table <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
