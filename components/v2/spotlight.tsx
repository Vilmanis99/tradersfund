'use client'

import { useEffect, useRef } from 'react'

/**
 * A single, soft cursor-tracking spotlight that smoothly chases the mouse
 * across the viewport. Uses requestAnimationFrame + an eased lerp so the
 * glow lags slightly behind the cursor for a Linear/Vercel-style feel.
 *
 * Respects prefers-reduced-motion: when reduced motion is preferred, the
 * spotlight is centered and static.
 */
export default function Spotlight() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.style.setProperty('--sx', '50%')
      el.style.setProperty('--sy', '40%')
      return
    }

    let target = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 }
    let current = { ...target }
    let raf = 0

    const onMove = (e: MouseEvent) => {
      target = { x: e.clientX, y: e.clientY }
    }

    const tick = () => {
      // Easing — small step toward target for a velvety lag.
      current.x += (target.x - current.x) * 0.12
      current.y += (target.y - current.y) * 0.12
      el.style.setProperty('--sx', `${current.x}px`)
      el.style.setProperty('--sy', `${current.y}px`)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={ref} className="v2-spotlight" aria-hidden />
}
