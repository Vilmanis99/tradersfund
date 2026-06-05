/**
 * Pure-SVG sparkline of price-per-tier. Renders a smooth area chart with
 * a glowing line + endpoint dot. No animation libs — just CSS for the
 * subtle path stroke draw-in.
 */
type Point = { label: string; value: number }

interface SparklineProps {
  points: Point[]
  height?: number
  ariaLabel?: string
}

export default function Sparkline({
  points,
  height = 88,
  ariaLabel = 'Price by account tier',
}: SparklineProps) {
  if (!points.length) return null
  const W = 400
  const H = height
  const padX = 6
  const padY = 10

  const values = points.map(p => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)

  const stepX = (W - padX * 2) / Math.max(1, points.length - 1)
  const coords = points.map((p, i) => {
    const x = padX + i * stepX
    const y = padY + (1 - (p.value - min) / range) * (H - padY * 2)
    return { x, y }
  })

  // Smooth path using midpoint smoothing for that polished Linear look.
  const linePath = coords
    .map((c, i, arr) => {
      if (i === 0) return `M ${c.x},${c.y}`
      const prev = arr[i - 1]
      const mx = (prev.x + c.x) / 2
      return `Q ${prev.x},${prev.y} ${mx},${(prev.y + c.y) / 2} T ${c.x},${c.y}`
    })
    .join(' ')

  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`
  const last = coords[coords.length - 1]

  return (
    <svg
      className="v2-spark"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="v2-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="v2-spark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#27a17b" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <filter id="v2-spark-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={areaPath} fill="url(#v2-spark-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#v2-spark-line)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#v2-spark-glow)"
      />

      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 3.5 : 2}
          fill={i === coords.length - 1 ? '#2dd4bf' : '#27a17b'}
          stroke="#14141a"
          strokeWidth={i === coords.length - 1 ? 2 : 1}
        />
      ))}

      <circle cx={last.x} cy={last.y} r="6" fill="#2dd4bf" opacity="0.22" />
    </svg>
  )
}
