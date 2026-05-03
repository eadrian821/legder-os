import { motion } from 'framer-motion'
import { NumberTicker } from './NumberTicker'

export interface KpiCardProps {
  label: string
  value: number
  format?: 'compact' | 'full'
  prefix?: string
  suffix?: string
  color?: string
  masked?: boolean
  index?: number
  hint?: string
}

const VAR_HEX: Record<string, string> = {
  'var(--leak)':    '#ff3355',
  'var(--invest)':  '#00e676',
  'var(--protect)': '#4488ff',
  'var(--sustain)': '#ffaa00',
  'var(--accent)':  '#00e676',
}

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

export function KpiCard({
  label, value, format = 'compact', prefix, suffix,
  color, masked = false, index = 0, hint,
}: KpiCardProps) {
  const hex = color ? (VAR_HEX[color] ?? null) : null
  const topBorder = hex ? hexToRgba(hex, 0.6) : 'rgba(255,255,255,0.08)'
  const gradBg = hex
    ? `linear-gradient(180deg, ${hexToRgba(hex, 0.07)} 0%, var(--bg-1) 100%)`
    : 'var(--bg-1)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      className="relative overflow-hidden rounded-lg p-3 cursor-default select-none"
      style={{
        background: gradBg,
        border: '1px solid var(--line)',
        borderTop: `2px solid ${topBorder}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <div className="caps text-ink-4 mb-1.5">{label}</div>

      <div className="flex items-baseline gap-0.5">
        <NumberTicker
          value={value}
          format={format}
          prefix={prefix}
          suffix={suffix}
          masked={masked}
          size="kpi"
          color={color}
        />
      </div>

      {hint && <div className="mt-1 text-[10px] text-ink-4">{hint}</div>}
    </motion.div>
  )
}
