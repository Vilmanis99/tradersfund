'use client'

import { useState } from 'react'
import Image from 'next/image'

/** Shared fixed-size brand tile, including a readable fallback for missing assets. */
export default function FirmLogo({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src && failedSrc !== src)
  const initials = /^[A-Z0-9]{2,5}$/.test(name) ? name : name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase()
  const needsDarkSurface = showImage && /FTMO-icon-light|FundedNext-Logo|Icon-White|logo-white|lucid-trading\.png/i.test(src || '')

  return (
    <span
      className="firm-logo"
      data-firm-logo={showImage ? 'image' : 'fallback'}
      aria-hidden="true"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, flexShrink: 0, padding: 3, boxSizing: 'border-box',
        borderRadius: 8, border: '1px solid var(--border)',
        background: needsDarkSurface ? '#233b3d' : 'var(--bg2)',
        color: 'var(--accent)', fontSize: initials.length > 3 || size < 36 ? '0.6rem' : '0.8rem', fontWeight: 800,
      }}
    >
      {showImage ? (
        <Image
          src={src!} alt="" width={size - 6} height={size - 6}
          style={{ objectFit: 'contain', width: '100%', height: '100%' }}
          onError={() => setFailedSrc(src!)}
        />
      ) : initials}
    </span>
  )
}
