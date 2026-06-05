import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { PostMeta } from '@/lib/mdx'
import TiltCard from '@/components/TiltCard'

export default function RelatedPosts({ posts }: { posts: PostMeta[] }) {
  if (!posts.length) return null

  return (
    <div className="related-posts">
      <h3 className="related-posts-title">
        Related <span className="gradient-text">articles</span>
      </h3>
      <div className="related-grid">
        {posts.map(post => (
          <TiltCard key={post.slug} className="related-card" max={5}>
            <Link href={`/blog/${post.slug}`} className="related-card-link">
              {post.categories?.length > 0 && (
                <span className="cat-pill" style={{ alignSelf: 'flex-start' }}>{post.categories[0]}</span>
              )}
              <h4 className="related-card-title">{post.title}</h4>
              <div className="related-card-foot">
                {post.date && (
                  <span className="related-card-date">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <ArrowUpRight size={13} className="related-card-arrow" />
              </div>
            </Link>
          </TiltCard>
        ))}
      </div>
    </div>
  )
}
