import { motion } from 'framer-motion'
import { fmtX } from '@/lib/utils'
import type { Budget, Category } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'

export interface BudgetCardProps {
  budget: Budget
  actualSpent: number
  categories: Category[]
  masked?: boolean
  index?: number
  onDelete?: () => void
}

// Mini arc ring: r=28, C=2π×28≈175.9
const R = 28
const C = 2 * Math.PI * R

function arcColor(ratio: number): string {
  if (ratio < 0.7) return '#00e676'
  if (ratio < 0.9) return '#ffaa00'
  return '#ff3355'
}

function weeklyResidual(limitAmount: number, spent: number): number {
  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysLeft = endOfMonth.getDate() - today.getDate()
  const weeksLeft = Math.max(1, daysLeft / 7)
  return (limitAmount - spent) / weeksLeft
}

export function BudgetCard({ budget, actualSpent, categories, masked = false, index = 0, onDelete }: BudgetCardProps) {
  const name = budget.axis
    ? budget.axis.charAt(0) + budget.axis.slice(1).toLowerCase()
    : (categories.find((c) => c.id === budget.category_id)?.name ?? '—')

  const dotColor = budget.axis ? AXIS_COLORS[budget.axis] : 'var(--ink-3)'
  const pct = Math.min(actualSpent / (budget.limit_amount || 1), 1)
  const color = arcColor(pct)
  const filled = pct * C
  const remaining = budget.limit_amount - actualSpent
  const residual = weeklyResidual(budget.limit_amount, actualSpent)
  const residualColor = residual >= 0 ? '#00e676' : '#ff3355'

  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysLeft = endOfMonth.getDate() - today.getDate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
      className="rounded-lg p-4 relative"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
          <span className="text-sm font-medium text-ink">{name}</span>
          <span className="caps text-ink-4">{budget.period}</span>
        </div>
        {onDelete && (
          <button
            className="text-ink-4 hover:text-leak transition-colors text-xs"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Arc + amounts */}
      <div className="flex items-center gap-4">
        {/* Mini arc ring */}
        <div className="flex-shrink-0">
          <svg width={72} height={72} viewBox="0 0 72 72" fill="none">
            <circle cx={36} cy={36} r={R} stroke="rgba(255,255,255,0.05)" strokeWidth={6} fill="none" />
            <circle
              cx={36} cy={36} r={R}
              stroke={color}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${filled} ${C - filled}`}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: 'stroke-dasharray 0.5s ease, stroke 0.4s' }}
            />
            <text x={36} y={34} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 13, fontWeight: 700, fill: color }}>
              {Math.round(pct * 100)}
            </text>
            <text x={36} y={45} textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 7, fill: 'var(--ink-4)' }}>
              %
            </text>
          </svg>
        </div>

        {/* Numbers */}
        <div className="flex-1 space-y-1.5">
          <div>
            <div className="font-mono text-lg font-bold text-ink leading-none">
              {masked ? '••••' : `KES ${fmtX(actualSpent)}`}
            </div>
            <div className="text-[10px] text-ink-4 mt-0.5">
              of {masked ? '••••' : `KES ${fmtX(budget.limit_amount)}`}
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-ink-4">{daysLeft}d left</span>
            <span className="font-mono" style={{ color: remaining >= 0 ? 'var(--ink-2)' : 'var(--leak)' }}>
              {masked ? '••••' : `${remaining >= 0 ? '' : '−'}KES ${fmtX(Math.abs(remaining))} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly residual pill */}
      <div
        className="mt-3 flex items-center justify-between rounded-md px-3 py-1.5"
        style={{ background: `${residualColor}12`, border: `1px solid ${residualColor}25` }}
      >
        <span className="text-[10px] text-ink-4">Week budget</span>
        <span className="font-mono text-[11px] font-semibold" style={{ color: residualColor }}>
          {masked ? '••••' : `KES ${fmtX(Math.abs(residual))}/wk`}
          {residual < 0 && <span className="text-[9px] ml-1 opacity-70">(over)</span>}
        </span>
      </div>
    </motion.div>
  )
}
