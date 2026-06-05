import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Linkedin, Twitter, Globe } from 'lucide-react'
import { AUTHORS, getAuthorBySlug } from '@/lib/authors'
import { getAllPosts } from '@/lib/mdx'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'
import BlogCard from '@/components/BlogCard'

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return AUTHORS.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) return {}
  const path = `/authors/${slug}`
  return {
    title: `${author.name} — ${author.role}`,
    description: author.short,
    alternates: { canonical: path },
    openGraph: {
      title: `${author.name} — ${author.role}`,
      description: author.short,
      url: path,
      type: 'profile',
    },
  }
}

function personSchema(author: ReturnType<typeof getAuthorBySlug>) {
  if (!author) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    description: author.short,
    url: `https://tradersfundhub.com/authors/${author.slug}`,
    sameAs: Object.values(author.links || {}).filter(Boolean),
    worksFor: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) notFound()

  const posts = getAllPosts().filter(p => p.author === author.name).slice(0, 12)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Authors', url: '/authors' },
    { name: author.name },
  ])
  const personLd = personSchema(author)

  const paragraphs = author.long.split('\n').filter(p => p.trim())

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {personLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(personLd) }} />
      )}

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/blog" className="post-back">
            <ArrowLeft size={14} /> Back to articles
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 96, height: 96,
              borderRadius: 24,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '2rem',
              flexShrink: 0,
              boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6), 0 0 30px -10px rgba(39,161,123,0.4)',
            }}>
              {author.initials}
            </div>
            <div>
              <div className="hero-eyebrow" style={{ marginBottom: '0.75rem' }}>
                <span className="hero-eyebrow-dot" />
                {author.role}
              </div>
              <h1 className="blog-hero-title" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}>
                {author.name}
              </h1>
            </div>
          </div>

          {author.links && Object.keys(author.links).length > 0 && (
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              {author.links.linkedin && (
                <a href={author.links.linkedin} target="_blank" rel="noopener noreferrer" className="filter-pill">
                  <Linkedin size={12} style={{ marginRight: 4 }} /> LinkedIn
                </a>
              )}
              {author.links.twitter && (
                <a href={author.links.twitter} target="_blank" rel="noopener noreferrer" className="filter-pill">
                  <Twitter size={12} style={{ marginRight: 4 }} /> X
                </a>
              )}
              {author.links.website && (
                <a href={author.links.website} target="_blank" rel="noopener noreferrer" className="filter-pill">
                  <Globe size={12} style={{ marginRight: 4 }} /> Website
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════ BIO ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2.5rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem' }}>
          <div className="prose">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ ARTICLES BY AUTHOR ═══════════════════════════════ */}
      {posts.length > 0 && (
        <section className="home-section" style={{ paddingTop: '1.5rem' }}>
          <div className="home-shell">
            <div className="section-head">
              <h2 className="section-title">Articles by {author.name.split(' ')[0]}</h2>
              <span className="section-sub">{posts.length} published</span>
            </div>
            <div className="post-grid">
              {posts.map(post => <BlogCard key={post.slug} post={post} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final" style={{ maxWidth: 560 }}>
            <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
              How we score firms
            </h2>
            <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
              The rubric, weights, and verification process behind every review.
            </p>
            <Link href="/methodology" className="btn-primary btn-glow">
              Read the methodology <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
