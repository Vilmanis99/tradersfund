import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAllPosts, getPostBySlug } from '@/lib/mdx'
import { getAllFirms, type Firm } from '@/lib/firms'

export const alt = 'Traders Fund Hub'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

/**
 * Try to load a firm logo from the public/ directory and return it as a
 * data URI. Returns null when the file doesn't exist or the path is empty
 * so the OG layout can fall back to a wordmark badge.
 */
async function loadLogoDataUri(logoPath: string | undefined): Promise<string | null> {
  if (!logoPath) return null
  const cleaned = logoPath.replace(/^\//, '')
  const ext = cleaned.split('.').pop()?.toLowerCase()
  // Satori (next/og) renders PNG, JPG, and SVG only. WebP is silently
  // unsupported and triggers a downstream "u2 is not iterable" prerender
  // error — gracefully fall back to the gradient initial chip instead.
  if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'svg') return null
  const abs = join(process.cwd(), 'public', cleaned)
  try {
    const buf = await readFile(abs)
    const mime =
      ext === 'png' ? 'image/png'
      : ext === 'svg' ? 'image/svg+xml'
      : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function formatUpdated(iso: string | undefined): string {
  if (!iso) return ''
  // Expect YYYY-MM-DD. Render as e.g. "Apr 2026".
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function buildFirmTagline(firm: Firm, postExcerpt?: string): string {
  // Prefer the post's editorial excerpt — that's been written by hand and
  // is always in voice. Trim to ~110 chars so it fits one line at 24px.
  if (postExcerpt && postExcerpt.trim().length > 0) {
    const trimmed = postExcerpt.trim().replace(/\s+/g, ' ')
    return trimmed.length > 120 ? trimmed.slice(0, 117) + '…' : trimmed
  }
  // Deterministic synthesis when no excerpt — name the headline numbers
  // so the OG still reads like editorial, not a meta-description stub.
  const split = firm.profitSplitPct ? `${firm.profitSplitPct}%` : null
  const freq =
    firm.payoutFrequency === 'on-demand' ? 'on-demand payouts'
    : firm.payoutFrequency === 'weekly' ? 'weekly payouts'
    : firm.payoutFrequency === 'bi-weekly' ? 'bi-weekly payouts'
    : null
  const parts: string[] = []
  if (split) parts.push(`${split} split`)
  if (freq) parts.push(freq)
  const lead = parts.length ? parts.join(' · ') : `Founded ${firm.founded}`
  return `${lead} — Reviewed in 2026`
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const firms = getAllFirms()
  const matchedFirm = firms.find(f => f.reviewUrl === `/blog/${slug}`)

  // ── Firm-specific layout (review pages) ──────────────────────────
  if (matchedFirm) {
    const logoSrc = await loadLogoDataUri(matchedFirm.logo)
    const tagline = buildFirmTagline(matchedFirm, post?.excerpt)
    const isPartner = Boolean(matchedFirm.affiliateUrl)
    const hasDiscount =
      typeof matchedFirm.discountPct === 'number' &&
      matchedFirm.discountPct > 0 &&
      !!matchedFirm.discountCode
    const updatedLabel = formatUpdated(matchedFirm.lastUpdated)

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: '#14141a',
            color: '#ebebf0',
            fontFamily: 'system-ui, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Aurora glow upper-left */}
          <div
            style={{
              position: 'absolute',
              top: -200,
              left: -200,
              width: 760,
              height: 760,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(39,161,123,0.18) 0%, rgba(39,161,123,0) 70%)',
              display: 'flex',
            }}
          />
          {/* Aurora glow lower-right (subtle) */}
          <div
            style={{
              position: 'absolute',
              bottom: -260,
              right: -180,
              width: 620,
              height: 620,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(45,212,191,0.10) 0%, rgba(45,212,191,0) 70%)',
              display: 'flex',
            }}
          />

          {/* Top row: wordmark + chips */}
          <div
            style={{
              position: 'absolute',
              top: 56,
              left: 80,
              right: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                color: '#a8b0bf',
                textTransform: 'uppercase',
              }}
            >
              Traders Fund Hub
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {isPartner && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: 'rgba(39,161,123,0.18)',
                    border: '1px solid rgba(39,161,123,0.55)',
                    color: '#2dd4bf',
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: 2,
                  }}
                >
                  PARTNER
                </div>
              )}
              {hasDiscount && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 20px',
                    borderRadius: 999,
                    background: 'rgba(245,158,11,0.18)',
                    border: '1px solid rgba(245,158,11,0.65)',
                    color: '#f59e0b',
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  {matchedFirm.discountPct}% OFF · CODE: {matchedFirm.discountCode}
                </div>
              )}
            </div>
          </div>

          {/* Center-left content block */}
          <div
            style={{
              position: 'absolute',
              left: 80,
              top: 170,
              right: 80,
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
            }}
          >
            {/* Firm logo */}
            {logoSrc ? (
              <div
                style={{
                  display: 'flex',
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  background: '#22222d',
                  border: '1px solid #34344a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: 12,
                }}
              >
                <img
                  src={logoSrc}
                  width={72}
                  height={72}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
                  border: '1px solid #34344a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 900,
                  color: '#14141a',
                }}
              >
                {matchedFirm.name.charAt(0)}
              </div>
            )}

            {/* Name + score row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 64,
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  lineHeight: 1,
                  color: '#ffffff',
                }}
              >
                {matchedFirm.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 20px',
                  borderRadius: 14,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.5)',
                  color: '#f59e0b',
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="#f59e0b"
                  style={{ display: 'block' }}
                >
                  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                </svg>
                <span style={{ display: 'flex' }}>{matchedFirm.score.toFixed(1)} / 10</span>
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                lineHeight: 1.3,
                color: '#a8b0bf',
                maxWidth: 1040,
              }}
            >
              {tagline}
            </div>
          </div>

          {/* Bottom row: watermark + updated pill */}
          <div
            style={{
              position: 'absolute',
              bottom: 56,
              left: 80,
              right: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#a8b0bf',
                fontSize: 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: '#27a17b',
                }}
              />
              tradersfundhub.com
            </div>
            {updatedLabel && (
              <div
                style={{
                  display: 'flex',
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: '#1a1a22',
                  border: '1px solid #34344a',
                  color: '#ebebf0',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                Updated {updatedLabel}
              </div>
            )}
          </div>
        </div>
      ),
      size
    )
  }

  // ── Generic article OG (fallback) ───────────────────────────────
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
