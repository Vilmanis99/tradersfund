'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
      <p style={{ color: '#f87171', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
        Something went wrong
      </p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}>
        Sorry, we hit an unexpected error.
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Try again, or head back home.
      </p>
      {error.digest && (
        <p style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '2rem' }}>
          ref: {error.digest}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => unstable_retry()} className="btn-primary">
          <RefreshCw size={16} /> Try again
        </button>
        <Link href="/" className="btn-outline">
          <Home size={16} /> Home
        </Link>
      </div>
    </div>
  )
}
