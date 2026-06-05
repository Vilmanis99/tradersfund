import { getPageBySlug, getAllPages } from '@/lib/mdx'
import { breadcrumbSchema, jsonLd } from '@/lib/schema'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import ContactForm from '@/components/ContactForm'

interface Props { params: Promise<{ slug: string }> }

// Pages that have dedicated routes — don't handle them here. Keep in sync
// with the `SKIP` set in app/sitemap.ts.
const RESERVED = ['blog', 'main-table', 'prop-firms', 'compare']

export async function generateStaticParams() {
  const pages = getAllPages()
  return pages
    .filter(p => p.slug !== 'home' && !RESERVED.includes(p.slug))
    .map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug === 'contact') {
    return {
      title: 'Contact Us',
      description: 'Send a message to the Traders Fund Hub team — we respond within one business day.',
      alternates: { canonical: '/contact' },
      openGraph: { title: 'Contact Us', url: '/contact', type: 'website' },
    }
  }
  const page = getPageBySlug(slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.description || page.title,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: page.title,
      description: page.description || page.title,
      url: `/${slug}`,
      type: 'article',
      modifiedTime: page.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description || page.title,
    },
  }
}

/* ── Article schema for static pages — Google E-E-A-T signal ─────── */
function articleSchema({ title, description, slug, date }: { title: string; description: string; slug: string; date?: string }) {
  const url = `https://tradersfundhub.com/${slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    ...(date ? { datePublished: date, dateModified: date } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  if (RESERVED.includes(slug)) notFound()

  /* ── Contact page (custom) ────────────────────────────────────── */
  if (slug === 'contact') {
    const crumbs = breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Contact' },
    ])
    return (
      <div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

        <section className="blog-hero">
          <div className="aurora-orb aurora-orb--1" aria-hidden />
          <div className="aurora-orb aurora-orb--2" aria-hidden />
          <div className="aurora-grid" aria-hidden />

          <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
            <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
              <span className="hero-eyebrow-dot" />
              Real humans · usually one business day
            </div>
            <h1 className="blog-hero-title">
              Have a tip, correction, or{' '}
              <span className="gradient-text gradient-text--animated">complaint?</span>
            </h1>
            <p className="blog-hero-sub">
              We read every message. Spotted an outdated number on a firm
              review? Want to suggest a firm we haven&apos;t covered yet?
              Send it.
            </p>
          </div>
        </section>

        <section className="home-section" style={{ paddingTop: '2.5rem' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="post-sidebar-card" style={{ padding: '2rem' }}>
              <ContactForm />
            </div>
          </div>
        </section>
      </div>
    )
  }

  const page = getPageBySlug(slug)
  if (!page) notFound()

  const isLegalPage = ['privacy-policy', 'disclaimers'].includes(slug)
  const crumbsLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: page.title },
  ])
  const articleLd = articleSchema({
    title: page.title,
    description: page.description || page.title,
    slug,
    date: page.date,
  })

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }} />

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="blog-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        {!isLegalPage && <div className="aurora-orb aurora-orb--2" aria-hidden />}
        <div className="aurora-grid" aria-hidden />

        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          {page.date && (
            <div className="hero-eyebrow" style={{ marginBottom: '1.25rem' }}>
              <Clock size={12} />
              Last updated {new Date(page.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          <h1 className="blog-hero-title" style={isLegalPage ? { fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' } : undefined}>
            {page.title}
          </h1>
          {page.description && (
            <p className="blog-hero-sub">{page.description}</p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════ BODY ═══════════════════════════════ */}
      <section className="home-section" style={{ paddingTop: '2.5rem' }}>
        <div style={{ maxWidth: isLegalPage ? 720 : 920, margin: '0 auto', padding: '0 1.5rem' }}>
          <article>
            <div className="prose" style={{ maxWidth: '100%' }}
              dangerouslySetInnerHTML={{ __html: page.content }} />
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      {!isLegalPage && (
        <section className="home-section home-section--alt">
          <div className="home-shell">
            <div className="cta-final" style={{ maxWidth: 560 }}>
              <h2 className="cta-final-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
                Ready to compare <span className="gradient-text">prop firms?</span>
              </h2>
              <p className="cta-final-sub" style={{ fontSize: '0.95rem' }}>
                Every firm, every challenge, every rule in one table.
              </p>
              <Link href="/main-table" className="btn-primary btn-glow">
                Open the comparison table <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
