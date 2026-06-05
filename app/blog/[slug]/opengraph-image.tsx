import { ImageResponse } from 'next/og'
import { getAllPosts, getPostBySlug } from '@/lib/mdx'

export const alt = 'Traders Fund Hub'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const title = post?.title ?? 'Traders Fund Hub'
  const category = post?.categories?.[0] ?? 'Prop Firms'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0f0f12 0%, #131318 50%, #0f0f12 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
              color: '#ffffff',
            }}
          >
            ↗
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Traders Fund Hub</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#2dd4bf',
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: title.length > 60 ? 56 : 68,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 1040,
              color: '#ffffff',
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#64748b',
            fontSize: 20,
          }}
        >
          <div>tradersfundhub.com</div>
          {post?.author && <div>{`By ${post.author}`}</div>}
        </div>
      </div>
    ),
    size
  )
}
