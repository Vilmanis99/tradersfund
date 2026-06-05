/**
 * Cinematic hero illustration — a stylized line-art equity curve that
 * draws its strokes on mount, fills an area gradient, drops in tick
 * marks, then pops a pulsing high-water dot.
 *
 * Pure SVG. No JS animation; everything is CSS keyframes defined in
 * globals.css under the V4 marker. Respects prefers-reduced-motion.
 */
export default function HeroChart() {
  // Equity-curve path — hand-tuned to feel like a real trader's payday
  // run, with one obvious early-drawdown that breaks the line.
  const linePath =
    'M 20 280 L 70 260 L 110 285 L 150 240 L 195 250 L 235 215 L 275 230 L 320 190 L 365 205 L 410 160 L 455 175 L 500 135 L 545 145 L 590 100 L 635 115 L 680 75'
  const areaPath = `${linePath} L 680 320 L 20 320 Z`

  return (
    <svg
      viewBox="0 0 700 320"
      role="img"
      aria-label="Animated equity curve illustrating a funded account's growth"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="v4-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#24b79a" />
          <stop offset="60%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="v4-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
        <filter id="v4-line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Faint baseline grid */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={i}
          x1={20}
          x2={680}
          y1={60 + i * 55}
          y2={60 + i * 55}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 6"
        />
      ))}

      {/* Vertical month ticks */}
      {[80, 200, 320, 440, 560, 670].map((x, i) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={295}
          y2={310}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1}
          className="v4-chart-tick"
          style={{ animationDelay: `${0.4 + i * 0.08}s` }}
        />
      ))}

      {/* Area under the curve, drawn after the line */}
      <path d={areaPath} fill="url(#v4-area-grad)" className="v4-chart-area" />

      {/* The main equity-line, animates a stroke-draw on load */}
      <path
        d={linePath}
        fill="none"
        stroke="url(#v4-line-grad)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#v4-line-glow)"
        className="v4-chart-line"
      />

      {/* High-water-mark dot, pops in after the line completes */}
      <g className="v4-chart-dot" style={{ transformOrigin: '680px 75px' }}>
        <circle cx={680} cy={75} r={14} fill="rgba(45,212,191,0.18)" className="v4-chart-pulse" />
        <circle cx={680} cy={75} r={6} fill="#2dd4bf" />
        <circle cx={680} cy={75} r={2.5} fill="#06141a" />
      </g>

      {/* Floating payout-tag callout near the dot */}
      <g className="v4-chart-dot" style={{ transformOrigin: '600px 35px' }}>
        <rect x={560} y={20} width={108} height={32} rx={9} fill="rgba(11, 11, 16, 0.85)" stroke="rgba(45,212,191,0.45)" />
        <text x={614} y={40} textAnchor="middle" fill="#2dd4bf" fontSize={13} fontWeight={700} letterSpacing="-0.02em">
          +$12,480
        </text>
      </g>
    </svg>
  )
}
