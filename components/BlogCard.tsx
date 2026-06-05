import Link from 'next/link'
import { Calendar, ArrowUpRight, Clock } from 'lucide-react'
import type { PostMeta } from '@/lib/mdx'
import TiltCard from '@/components/TiltCard'

export default function BlogCard({ post }: { post: PostMeta }) {
  return (
    <TiltCard className="blog-card" max={5}>
      <Link href={`/blog/${post.slug}`} className="blog-card-link">
        <div className="blog-card-glow" aria-hidden />

        {post.categories?.length > 0 && (
          <div className="blog-card-cats">
            {post.categories.slice(0, 2).map(c => (
              <span key={c} className="cat-pill">{c}</span>
            ))}
          </div>
        )}

        <h2 className="blog-card-title">{post.title}</h2>

        {post.excerpt && (
          <p className="blog-card-excerpt">{post.excerpt}</p>
        )}

        <div className="blog-card-foot">
          <div className="blog-card-meta">
            {post.date && (
              <span>
                <Calendar size={11} />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {post.author && <span><Clock size={11} /> {post.author}</span>}
          </div>
          <ArrowUpRight size={14} className="blog-card-arrow" />
        </div>
      </Link>
    </TiltCard>
  )
}
