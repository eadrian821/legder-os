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

const CARD_BG   = 'linear-gradient(135deg, rgba(13,13,24,0.9), rgba(18,18,32,0.95))'
const SHADOW    = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
const BORDER    = '1px solid rgba(255,255,255,0.06)'
const TOP_GLOW  = 'rgba(0,230,118,0.15)'
const HOVER_BORDER = 'rgba(255,255,255,0.1)'

export function KpiCard({
  label, value, format = 'compact', prefix, suffix,
  color, masked = false, index = 0, hint,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      // 50ms stagger between cards
      transition={{ delay: index * 0.05, duration: 0.18, ease: 'easeOut' }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      className="relative overflow-hidden rounded-lg p-3 cursor-default select-none"
      style={{
        background:   CARD_BG,
        border:       BORDER,
        borderTopColor: TOP_GLOW,
        boxShadow:    SHADOW,
      }}
      // Hover: brighten all borders
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = HOVER_BORDER
        ;(e.currentTarget as HTMLElement).style.borderTopColor = 'rgba(0,230,118,0.3)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
        ;(e.currentTarget as HTMLElement).style.borderTopColor = TOP_GLOW
      }}
    >
      {/* Label */}
      <div
        className="mb-1.5"
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>

      {/* Value */}
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

      {hint && (
        <div className="mt-1" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
          {hint}
        </div>
      )}
    </motion.div>
  )
}
