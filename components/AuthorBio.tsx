import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAuthorByName } from '@/lib/authors'

export default function AuthorBio({ name }: { name: string }) {
  const author = getAuthorByName(name)
  const initials = author?.initials || name.split(' ').map(n => n[0]).join('')
  const desc = author?.short || `${name} is a contributor at Traders Fund Hub.`

  return (
    <div className="author-bio">
      <div className="author-bio-avatar">{initials}</div>
      <div style={{ flex: 1 }}>
        <div className="author-bio-name">Written by {name}</div>
        <div className="author-bio-desc">{desc}</div>
        {author && (
          <Link
            href={`/authors/${author.slug}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, color: 'var(--accent-light)',
              fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Full bio <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
