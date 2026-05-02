import { useEffect, useRef } from 'react'
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
  // motionVal is the target; spring follows it with physics
  const motionVal   = useMotionValue(value)
  const spring      = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const displayRef  = useRef<HTMLSpanElement>(null)
  const mountedRef  = useRef(false)

  // Drive the spring when value changes — but NOT on mount (zero-delay first render)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    motionVal.set(value)
  }, [value, motionVal])

  // Subscribe to the spring and write directly to the DOM — no React re-renders
  useEffect(() => {
    if (masked) {
      // If masked, just show the mask symbol — no spring needed
      if (displayRef.current) displayRef.current.textContent = '••••••'
      return
    }

    // Sync spring to latest value in case it was masked before
    motionVal.set(value)

    const unsub = spring.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = format === 'full' ? fmtX(v) : fmt(v)
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masked, format, spring, motionVal])

  const staticText = masked ? '••••••' : format === 'full' ? fmtX(value) : fmt(value)

  return (
    <span
      className={`font-mono tabular-nums ${SIZE_CLASSES[size]} ${className}`}
      style={color ? { color } : undefined}
    >
      {prefix && (
        <span className="opacity-50 text-[0.65em] mr-[0.15em]">{prefix}</span>
      )}
      {/* displayRef is updated by the spring subscription; staticText is the SSR / initial value */}
      <span ref={displayRef}>{staticText}</span>
      {suffix && (
        <span className="opacity-50 text-[0.65em] ml-[0.15em]">{suffix}</span>
      )}
    </span>
  )
}
