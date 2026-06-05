'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ArrowUpRight } from 'lucide-react'

export interface Hero3DFirm {
  name: string
  logo: string
  score: number
  profitSplitPct: number | null | undefined
  payoutFrequency: string | null | undefined
  reviewUrl: string
}

export default function Hero3D({ firms }: { firms: Hero3DFirm[] }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: -10, y: 0 })
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!stageRef.current) return
      const r = stageRef.current.getBoundingClientRect()
      // only react when cursor is roughly near the stage
      const inX = e.clientX > r.left - 200 && e.clientX < r.right + 200
      const inY = e.clientY > r.top - 200 && e.clientY < r.bottom + 200
      if (!inX || !inY) return
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = (e.clientX - cx) / (r.width / 2)
      const dy = (e.clientY - cy) / (r.height / 2)
      setTilt({ x: -10 + dy * -8, y: dx * 12 })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const styleVars = {
    '--tilt-x': `${tilt.x}deg`,
    '--tilt-y': `${tilt.y}deg`,
    '--total': firms.length,
  } as CSSProperties

  return (
    <div
      ref={stageRef}
      className={`hero3d-stage${hovered ? ' hero3d-stage--paused' : ''}`}
      style={styleVars}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden
    >
      <div className="hero3d-floor" />
      <div className="hero3d-tilt">
        <div className="hero3d-ring">
          {firms.map((f, i) => (
            <Link
              key={f.name}
              href={f.reviewUrl}
              className="hero3d-card"
              style={{ '--i': i } as CSSProperties}
              aria-label={`${f.name} — score ${f.score.toFixed(1)}`}
            >
              <div className="hero3d-card-glow" />
              <div className="hero3d-card-shine" />
              <div className="hero3d-card-logo">
                {f.logo ? (
                  <Image
                    src={f.logo}
                    alt=""
                    width={56}
                    height={56}
                    style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                  />
                ) : (
                  <span className="hero3d-card-mark">{f.name.charAt(0)}</span>
                )}
              </div>
              <div className="hero3d-card-name">{f.name}</div>
              <div className="hero3d-card-score">
                <Star size={11} fill="currentColor" />
                <span>{f.score.toFixed(1)}</span>
              </div>
              <div className="hero3d-card-foot">
                <span className="hero3d-card-pill">
                  {f.profitSplitPct ?? '—'}% split
                </span>
                <ArrowUpRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
