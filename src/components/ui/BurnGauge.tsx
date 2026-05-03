import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { fmt } from '@/lib/utils'

interface BurnGaugeProps {
  dailyBurn: number
  burnRatio: number  // 0–1 (>1 = spending more than earning)
  runway: number | null
  runwayTotal: number | null
  masked?: boolean
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}

function burnColor(ratio: number): string {
  const c = Math.min(Math.max(ratio, 0), 1)
  return c <= 0.5 ? lerpColor('#00e676', '#ffaa00', c * 2) : lerpColor('#ffaa00', '#ff3355', (c - 0.5) * 2)
}

// Arc gauge constants: 270° arc, gap at bottom
// r=76, C=2π×76≈477.52, gauge=C×270/360≈358.14, rotate 135° to start at 7:30 o'clock
const R = 76
const C = 2 * Math.PI * R
const GAUGE = C * (270 / 360)  // 358.14

export function BurnGauge({ dailyBurn, burnRatio, runway, runwayTotal, masked = false }: BurnGaugeProps) {
  const fillRef  = useRef<SVGCircleElement>(null)
  const fillMv   = useMotionValue(0)
  const fillSpring = useSpring(fillMv, { stiffness: 70, damping: 20 })
  const clamped  = Math.min(Math.max(burnRatio, 0), 1)

  useEffect(() => { fillMv.set(clamped) }, [clamped, fillMv])

  useEffect(() => {
    return fillSpring.on('change', (v) => {
      if (!fillRef.current) return
      const filled = v * GAUGE
      fillRef.current.setAttribute('stroke-dasharray', `${filled} ${C - filled}`)
      fillRef.current.setAttribute('stroke', burnColor(v))
    })
  }, [fillSpring])

  const color = burnColor(clamped)
  const pctLabel = `${Math.round(clamped * 100)}%`
  const runwayColor = runway != null && runway < 30 ? 'var(--leak)' : 'var(--ink-3)'

  return (
    <div
      className="rounded-lg flex flex-col items-center py-5 px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
    >
      <div className="caps text-ink-3 mb-4 w-full">Burn Rate</div>

      {/* SVG Arc gauge */}
      <div className="relative">
        <svg width={200} height={170} viewBox="0 0 200 200" fill="none">
          {/* Background track */}
          <circle
            cx={100} cy={100} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={10}
            strokeDasharray={`${GAUGE} ${C - GAUGE}`}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
          />
          {/* Fill track — animated via ref */}
          <circle
            ref={fillRef}
            cx={100} cy={100} r={R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={`${clamped * GAUGE} ${C - clamped * GAUGE}`}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />

          {/* Center: burn value */}
          <text x={100} y={93} textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 28, fontWeight: 700, fill: color }}>
            {masked ? '••••' : fmt(dailyBurn)}
          </text>
          <text x={100} y={116} textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 10, fill: 'var(--ink-3)', letterSpacing: 1 }}>
            KES/day
          </text>
        </svg>
      </div>

      {/* Pct label */}
      <div className="text-[11px] font-mono -mt-2 mb-3" style={{ color }}>
        {pctLabel} of income
      </div>

      {/* Runway row */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono"
        style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <div className="flex flex-col gap-0.5">
          <span className="text-ink-4">CASH RUNWAY</span>
          <span style={{ color: runwayColor }}>
            {masked ? '••' : runway != null ? `${Math.round(runway)} days` : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-ink-4">TOTAL RUNWAY</span>
          <span className="text-ink-2">
            {masked ? '••' : runwayTotal != null ? `${Math.round(runwayTotal)} days` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
