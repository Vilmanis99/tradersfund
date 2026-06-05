import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
        404
      </p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.15 }}>
        Page not found
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '2rem' }}>
        The page you were looking for doesn&apos;t exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={16} /> Back home
        </Link>
        <Link href="/blog" className="btn-outline">
          <Search size={16} /> Browse reviews
        </Link>
      </div>
    </div>
  )
}
