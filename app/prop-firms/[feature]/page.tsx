import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Bot, Shield, Zap, Clock, TrendingUp, Newspaper, Calendar, Wallet } from 'lucide-react'
import { FEATURES, getFeatureBySlug, getFirmsForFeature } from '@/lib/features'
import { breadcrumbSchema, faqPageSchema, itemListSchema, jsonLd } from '@/lib/schema'
import FeatureFirmList from '@/components/FeatureFirmList'
import FeatureFaq from '@/components/FeatureFaq'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

interface Props { params: Promise<{ feature: string }> }

export async function generateStaticParams() {
  return FEATURES.map(f => ({ feature: f.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature: slug } = await params
  const feature = getFeatureBySlug(slug)
  if (!feature) return {}
  const url = `/prop-firms/${feature.slug}`
  return {
    title: feature.metaTitle,
    description: feature.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: feature.metaTitle,
      description: feature.metaDescription,
      url,
      type: 'article',
    },
  }
}

const ICONS = {
  shield: Shield, zap: Zap, clock: Clock, trending: TrendingUp,
  bot: Bot, newspaper: Newspaper, calendar: Calendar, wallet: Wallet,
}

export default async function FeaturePage({ params }: Props) {
  const { feature: slug } = await params
  const feature = getFeatureBySlug(slug)
  if (!feature) notFound()

  const firms = getFirmsForFeature(slug)
  const siblings = FEATURES.filter(f => f.slug !== slug).slice(0, 4)

  const itemLd = itemListSchema(firms, feature.label)
  const faqLd = faqPageSchema(feature.faqs)
  const crumbsLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Prop Firms', url: '/prop-firms' },
    { name: feature.label },
  ])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}
      >
        <Link href="/prop-firms" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}>
          <ArrowLeft size={14} aria-hidden="true" /> Prop Firm Lists
        </Link>
      </nav>

      <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.2 }}>
        {feature.h1}
      </h1>

      <p style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 6,
        background: 'rgba(39, 161, 123, 0.1)',
        border: '1px solid rgba(39, 161, 123, 0.2)',
        color: 'var(--accent-light)',
        fontSize: '0.78rem', fontWeight: 600,
        marginBottom: '1.25rem',
      }}>
        <span aria-hidden="true">●</span>
        Last reviewed {new Date(feature.lastReviewed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <p style={{ color: 'var(--muted)', maxWidth: 700, marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.65 }}>
        {feature.intro}
      </p>

      <AffiliateDisclosure />

      <section aria-label={`${feature.label} firms, ranked`} style={{ marginBottom: '3rem' }}>
        <FeatureFirmList firms={firms} featureLabel={feature.label} />
      </section>

      <section
        aria-label="Why this matters"
        style={{ paddingTop: '2.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)' }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Why this matters
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: 0 }}>
          The factors below are what we weight when ranking firms on this list.
        </p>
        <div className="feature-why-grid">
          {feature.whyItMatters.map(bullet => {
            const Icon = ICONS[bullet.icon]
            return (
              <div key={bullet.title} className="feature-why-item">
                <div className="feature-why-icon">
                  <Icon size={20} color="var(--accent-light)" aria-hidden="true" />
                </div>
                <div>
                  <h3>{bullet.title}</h3>
                  <p>{bullet.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section
        aria-label="Frequently asked questions"
        style={{ marginTop: '3rem' }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
          Frequently asked questions
        </h2>
        <FeatureFaq faqs={feature.faqs} />
      </section>

      <section
        aria-label="Related prop firm lists"
        style={{ marginTop: '3rem' }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
          Browse more prop firm lists
        </h2>
        <div className="feature-hub-grid">
          {siblings.map(s => (
            <Link key={s.slug} href={`/prop-firms/${s.slug}`} className="feature-hub-tile">
              <div>
                <div className="feature-hub-tile-label">{s.label}</div>
                <div className="feature-hub-tile-count">View list</div>
              </div>
              <div className="feature-hub-tile-cta">
                Explore <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '1.25rem' }}>
          Or browse{' '}
          <Link href="/main-table" style={{ color: 'var(--accent-light)' }}>
            all 14 prop firms
          </Link>{' '}
          in the directory.
        </p>
      </section>
    </div>
  )
}
