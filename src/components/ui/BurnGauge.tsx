import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { NumberTicker } from './NumberTicker'

interface BurnGaugeProps {
  dailyBurn: number
  // burnRatio: 0–1 (dailyBurn / referenceIncome). >1 means spending more than you earn.
  burnRatio: number
  runway: number | null
  runwayTotal: number | null
  masked?: boolean
}

// Interpolate between two hex colors at ratio t (0–1)
function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const b2 = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${b2})`
}

// invest(green) → sustain(amber) → leak(red)
function burnColor(ratio: number): string {
  const clamped = Math.min(Math.max(ratio, 0), 1)
  if (clamped <= 0.5) {
    return lerpColor('#00e676', '#ffaa00', clamped * 2)
  }
  return lerpColor('#ffaa00', '#ff3355', (clamped - 0.5) * 2)
}

export function BurnGauge({ dailyBurn, burnRatio, runway, runwayTotal, masked = false }: BurnGaugeProps) {
  const barRef   = useRef<HTMLDivElement>(null)
  const glowRef  = useRef<HTMLDivElement>(null)
  const fillMv   = useMotionValue(0)
  const fillSpring = useSpring(fillMv, { stiffness: 80, damping: 22 })

  const clamped = Math.min(Math.max(burnRatio, 0), 1)
  const color   = burnColor(burnRatio)

  // Animate fill width via spring and write directly to DOM
  useEffect(() => {
    fillMv.set(clamped)
  }, [clamped, fillMv])

  useEffect(() => {
    return fillSpring.on('change', (v) => {
      if (!barRef.current) return
      barRef.current.style.width  = `${v * 100}%`
      barRef.current.style.background = burnColor(v)
      barRef.current.style.boxShadow =
        v > 0.8
          ? `0 0 10px ${burnColor(v)}, 0 0 3px ${burnColor(v)}`
          : 'none'
    })
  }, [fillSpring])

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-1)] px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <span
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ink-3)',
          }}
        >
          Daily burn
        </span>
        <NumberTicker
          value={dailyBurn}
          format="compact"
          prefix="KES"
          masked={masked}
          size="inline"
          color={color}
        />
      </div>

      {/* Gauge bar */}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{ height: 6, background: 'var(--bg-3)' }}
      >
        <div
          ref={barRef}
          className="absolute left-0 top-0 h-full rounded-sm"
          style={{
            width: `${clamped * 100}%`,
            background: color,
            transition: 'background 0.3s',
          }}
        />
        {/* Pulsing glow overlay — only visible when burnRatio > 0.8 */}
        {clamped > 0.8 && (
          <div
            ref={glowRef}
            className="absolute left-0 top-0 h-full w-full rounded-sm"
            style={{
              background: color,
              opacity: 0,
              animation: 'pulseGlow 1.4s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Runway readout */}
      <div
        className="flex items-center justify-between mt-2"
        style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}
      >
        <span>
          cash&nbsp;
          <span style={{ color: runway != null && runway < 30 ? 'var(--leak)' : 'var(--ink-3)' }}>
            {masked ? '••' : runway != null ? `${Math.round(runway)}d` : '—'}
          </span>
        </span>
        <span>
          total&nbsp;
          <span style={{ color: 'var(--ink-3)' }}>
            {masked ? '••' : runwayTotal != null ? `${Math.round(runwayTotal)}d` : '—'}
          </span>
        </span>
        <span style={{ color: clamped > 1 ? 'var(--leak)' : clamped > 0.8 ? 'var(--sustain)' : 'var(--ink-4)' }}>
          {(clamped * 100).toFixed(0)}% of income
        </span>
      </div>
    </div>
  )
}
