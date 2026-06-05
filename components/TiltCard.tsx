'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees. Default 8. */
  max?: number
  /** Inner element receives the spotlight glow. */
  glow?: boolean
}

export default function TiltCard({ children, className = '', max = 8, glow = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left) / r.width   // 0..1
    const dy = (e.clientY - r.top) / r.height
    const rotY = (dx - 0.5) * 2 * max
    const rotX = (dy - 0.5) * -2 * max
    el.style.setProperty('--rx', `${rotX}deg`)
    el.style.setProperty('--ry', `${rotY}deg`)
    el.style.setProperty('--gx', `${dx * 100}%`)
    el.style.setProperty('--gy', `${dy * 100}%`)
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  const style: CSSProperties = {
    '--rx': '0deg',
    '--ry': '0deg',
    '--gx': '50%',
    '--gy': '50%',
  } as CSSProperties

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {glow && <span className="tilt-card-glow" aria-hidden />}
      <div className="tilt-card-inner">{children}</div>
    </div>
  )
}
