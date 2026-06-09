import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findFirmBySlug, getAllCanonicalPairs, parseMatchup } from '@/lib/comparisons'
import type { Firm } from '@/lib/firms'

export const alt = 'Traders Fund Hub — Prop Firm Comparison'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export async function generateStaticParams() {
  return getAllCanonicalPairs().map(p => ({ matchup: p.matchup }))
}

async function loadLogoDataUri(logoPath: string | undefined): Promise<string | null> {
  if (!logoPath) return null
  const cleaned = logoPath.replace(/^\//, '')
  const ext = cleaned.split('.').pop()?.toLowerCase()
  // Satori (next/og) renders PNG, JPG, and SVG only. WebP triggers a
  // downstream "u2 is not iterable" prerender error — fall back to the
  // initial chip instead.
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

function newestUpdate(a: Firm, b: Firm): string {
  const ad = a.lastUpdated ?? ''
  const bd = b.lastUpdated ?? ''
  const iso = ad > bd ? ad : bd
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function FirmCard({
  firm,
  logoSrc,
}: {
  firm: Firm
  logoSrc: string | null
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        width: 420,
        height: 380,
        padding: 32,
        borderRadius: 24,
        background: '#1a1a22',
        border: '1px solid #34344a',
      }}
    >
      {logoSrc ? (
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 120,
            borderRadius: 24,
            background: '#22222d',
            border: '1px solid #34344a',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: 16,
          }}
        >
          <img src={logoSrc} width={88} height={88} style={{ objectFit: 'contain' }} />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 120,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #27a17b, #2dd4bf)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            fontWeight: 900,
            color: '#14141a',
          }}
        >
          {firm.name.charAt(0)}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          fontSize: 42,
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: -1,
          textAlign: 'center',
        }}
      >
        {firm.name}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderRadius: 12,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.5)',
          color: '#f59e0b',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" style={{ display: 'block' }}>
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
        <span style={{ display: 'flex' }}>{firm.score.toFixed(1)} / 10</span>
      </div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params
  const parsed = parseMatchup(matchup)
  const firmA = parsed ? findFirmBySlug(parsed.a) : undefined
  const firmB = parsed ? findFirmBySlug(parsed.b) : undefined

  // ── Fallback if one side is missing — degrade gracefully ───────
  if (!firmA || !firmB) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#14141a',
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 56,
            fontWeight: 900,
          }}
        >
          Traders Fund Hub — Compare
        </div>
      ),
      size
    )
  }

  const [logoA, logoB] = await Promise.all([
    loadLogoDataUri(firmA.logo),
    loadLogoDataUri(firmB.logo),
  ])
  const updated = newestUpdate(firmA, firmB)

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
        {/* Aurora glow — green upper-left */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            left: -200,
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(39,161,123,0.20) 0%, rgba(39,161,123,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Aurora glow — teal lower-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -240,
            right: -180,
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(45,212,191,0.15) 0%, rgba(45,212,191,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Top wordmark */}
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
            Head-to-Head
          </div>
        </div>

        {/* Cards + VS row */}
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <FirmCard firm={firmA} logoSrc={logoA} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 180,
              height: 180,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 140,
                fontWeight: 900,
                letterSpacing: -6,
                lineHeight: 1,
                background: 'linear-gradient(135deg, #27a17b 0%, #2dd4bf 50%, #f59e0b 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              VS
            </div>
          </div>

          <FirmCard firm={firmB} logoSrc={logoB} />
        </div>

        {/* Bottom strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 20px',
              borderRadius: 999,
              background: '#1a1a22',
              border: '1px solid #34344a',
              color: '#ebebf0',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Side-by-side{updated ? ` · Updated ${updated}` : ''}
          </div>
        </div>
      </div>
    ),
    size
  )
}
