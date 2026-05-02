import type { AxisTotals } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'

interface AxisBarProps {
  totals: AxisTotals
  className?: string
}

export function AxisBar({ totals, className = '' }: AxisBarProps) {
  const total = totals.INVEST + totals.PROTECT + totals.SUSTAIN + totals.LEAK
  if (total === 0) return <div className={`h-1.5 rounded-sm bg-bg-3 ${className}`} />

  const axes = [
    { key: 'INVEST',  value: totals.INVEST },
    { key: 'PROTECT', value: totals.PROTECT },
    { key: 'SUSTAIN', value: totals.SUSTAIN },
    { key: 'LEAK',    value: totals.LEAK },
  ] as const

  return (
    <div className={`flex h-1.5 overflow-hidden rounded-sm gap-px ${className}`}>
      {axes.map(({ key, value }) => {
        const pct = (value / total) * 100
        if (pct < 0.5) return null
        return (
          <div
            key={key}
            style={{ width: `${pct}%`, background: AXIS_COLORS[key] }}
            className="rounded-sm transition-all duration-500"
          />
        )
      })}
    </div>
  )
}
