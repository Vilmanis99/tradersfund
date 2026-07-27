'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1400,
}: AnimatedNumberProps) {
  // Seed with the real value, NOT 0. This component renders every headline
  // stat on the site, and starting at 0 meant the server HTML said
  // "0 firms tracked · 0 challenges priced · 0 articles" on all 325 pages,
  // "0 min read" on every post, and "Live · 0 firms" in the hero. Crawlers
  // that don't run the IntersectionObserver — Google's initial pass, and
  // every AI crawler the llms.txt route exists to court — saw a site
  // tracking nothing. The count-up still runs on scroll-into-view below;
  // it just no longer owns the pre-hydration truth.
  const [display, setDisplay] = useState(value)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          // Reduced motion: snap to the final value instead of tweening.
          // Handled here rather than in the effect body so the state update
          // stays inside the observer callback (no cascading render on mount).
          if (reduced) {
            setDisplay(value)
            return
          }
          const start = performance.now()
          const ease = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic
          function step(now: number) {
            const t = Math.min(1, (now - start) / duration)
            setDisplay(value * ease(t))
            if (t < 1) requestAnimationFrame(step)
            else setDisplay(value)
          }
          requestAnimationFrame(step)
        }
      })
    }, { threshold: 0.2 })

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className="animated-num">
      {prefix}{formatted}{suffix}
    </span>
  )
}
