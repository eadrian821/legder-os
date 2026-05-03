import { useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { fmt, fmtX } from '@/lib/utils'

export interface NumberTickerProps {
  value: number
  format?: 'compact' | 'full'
  prefix?: string
  suffix?: string
  masked?: boolean
  color?: string
  className?: string
  size?: 'hero' | 'kpi' | 'inline'
}

const SIZE_CLASSES: Record<NonNullable<NumberTickerProps['size']>, string> = {
  hero:   'text-[46px] font-extrabold leading-none tracking-tight',
  kpi:    'text-[20px] font-bold leading-none',
  inline: 'text-[14px] font-medium',
}

export function NumberTicker({
  value,
  format  = 'compact',
  prefix,
  suffix,
  masked  = false,
  color,
  className = '',
  size    = 'inline',
}: NumberTickerProps) {
  const motionVal  = useMotionValue(value)
  const spring     = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const displayRef = useRef<HTMLSpanElement>(null)

  // Keep spring target in sync — fires on every value change including first render.
  // motionVal.set() is a no-op when the value doesn't change, so no spurious animation.
  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  // Set initial text before first paint so the span never flashes empty
  useLayoutEffect(() => {
    if (!displayRef.current) return
    displayRef.current.textContent = masked
      ? '••••••'
      : format === 'full' ? fmtX(motionVal.get()) : fmt(motionVal.get())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only — subsequent updates driven by spring subscription below

  // Subscribe to spring and write directly to DOM (no React re-renders during animation).
  // The span has no JSX children so React never overwrites textContent after mount,
  // which prevents the "flash-to-target then animate backward" glitch.
  useEffect(() => {
    if (!displayRef.current) return
    if (masked) {
      displayRef.current.textContent = '••••••'
      return
    }
    // Sync display to latest value (covers unmask and format change)
    displayRef.current.textContent = format === 'full' ? fmtX(motionVal.get()) : fmt(motionVal.get())
    const unsub = spring.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = format === 'full' ? fmtX(v) : fmt(v)
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masked, format, spring, motionVal])

  return (
    <span
      className={`font-mono tabular-nums ${SIZE_CLASSES[size]} ${className}`}
      style={color ? { color } : undefined}
    >
      {prefix && (
        <span className="opacity-50 text-[0.65em] mr-[0.15em]">{prefix}</span>
      )}
      {/* No children — textContent driven exclusively by spring subscription */}
      <span ref={displayRef} />
      {suffix && (
        <span className="opacity-50 text-[0.65em] ml-[0.15em]">{suffix}</span>
      )}
    </span>
  )
}
