import { motion } from 'framer-motion'
import { fmtX } from '@/lib/utils'
import type { Budget } from '@/types/ledger'

interface BudgetWithSpent extends Budget {
  actualSpent: number
}

interface WeeklyBudgetSynthesisProps {
  budgets: BudgetWithSpent[]
  weekActualSpend: number
  masked?: boolean
}

function weeklyResidual(limitAmount: number, spent: number): number {
  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysLeft = endOfMonth.getDate() - today.getDate()
  const weeksLeft = Math.max(1, daysLeft / 7)
  return (limitAmount - spent) / weeksLeft
}

export function WeeklyBudgetSynthesis({ budgets, weekActualSpend, masked = false }: WeeklyBudgetSynthesisProps) {
  if (budgets.length === 0) return null

  // Sum of weekly residuals across all budgets
  const totalWeeklyAllowance = budgets.reduce((sum, b) => sum + weeklyResidual(b.limit_amount, b.actualSpent), 0)
  const ratio = totalWeeklyAllowance > 0 ? Math.min(weekActualSpend / totalWeeklyAllowance, 1) : 0
  const isOver = weekActualSpend > totalWeeklyAllowance
  const barColor = isOver ? '#ff3355' : '#00e676'

  // Sub-breakdown by axis
  const sustainBudgets = budgets.filter((b) => b.axis === 'SUSTAIN')
  const leakBudgets = budgets.filter((b) => b.axis === 'LEAK')

  const sustainAllowance = sustainBudgets.reduce((s, b) => s + weeklyResidual(b.limit_amount, b.actualSpent), 0)
  const leakAllowance = leakBudgets.reduce((s, b) => s + weeklyResidual(b.limit_amount, b.actualSpent), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-lg p-4 mb-4"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="caps text-ink-3">This week's budget</span>
        <span
          className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: barColor,
            background: `${barColor}15`,
          }}
        >
          {isOver ? 'OVER' : 'ON TRACK'}
        </span>
      </div>

      {/* Main progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-mono mb-1.5">
          <span className="text-ink-4">Spent</span>
          <span className="text-ink-2">
            {masked ? '••••' : `KES ${fmtX(weekActualSpend)} / ${fmtX(totalWeeklyAllowance)}`}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ratio * 100}%`,
              background: barColor,
              boxShadow: `0 0 8px ${barColor}66`,
            }}
          />
        </div>
      </div>

      {/* Sub-bars */}
      {(sustainAllowance > 0 || leakAllowance > 0) && (
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          {sustainAllowance > 0 && (
            <div>
              <div className="flex justify-between text-[9px] font-mono mb-1">
                <span className="text-sustain">SUSTAIN</span>
                <span className="text-ink-4">
                  {masked ? '••••' : `KES ${fmtX(sustainAllowance)}/wk`}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(sustainAllowance / (totalWeeklyAllowance || 1), 1) * 100}%`, background: 'var(--sustain)' }}
                />
              </div>
            </div>
          )}
          {leakAllowance > 0 && (
            <div>
              <div className="flex justify-between text-[9px] font-mono mb-1">
                <span className="text-leak">LEAK</span>
                <span className="text-ink-4">
                  {masked ? '••••' : `KES ${fmtX(leakAllowance)}/wk`}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(leakAllowance / (totalWeeklyAllowance || 1), 1) * 100}%`, background: 'var(--leak)' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
