import { motion } from 'framer-motion'
import { fmtX } from '@/lib/utils'
import type { Goal } from '@/types/ledger'

interface GoalCardProps {
  goal: Goal
  masked?: boolean
  index?: number
  onClick?: () => void
}

// Full-circle ring: r=46, C=2π×46≈289.0
const R = 46
const C = 2 * Math.PI * R

function ringColor(pct: number): string {
  if (pct >= 0.5) return '#00e676'
  if (pct >= 0.25) return '#ffaa00'
  return '#ff3355'
}

export function GoalCard({ goal, masked = false, index = 0, onClick }: GoalCardProps) {
  const pct = Math.min(goal.current_amount / goal.target_amount, 1)
  const filled = pct * C
  const color = ringColor(pct)
  const pctDisplay = Math.round(pct * 100)

  const needPerMonth = goal.deadline
    ? (() => {
        const months = Math.max(
          1,
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
        )
        return (goal.target_amount - goal.current_amount) / months
      })()
    : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      onClick={onClick}
      className="w-full rounded-lg p-4 text-left"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
    >
      {/* Ring + meta */}
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="flex-shrink-0 relative">
          <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
            {/* Background ring */}
            <circle
              cx={50} cy={50} r={R}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={8}
              fill="none"
            />
            {/* Fill ring */}
            <circle
              cx={50} cy={50} r={R}
              stroke={color}
              strokeWidth={8}
              fill="none"
              strokeDasharray={`${filled} ${C - filled}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 5px ${color}66)`, transition: 'stroke-dasharray 0.6s ease, stroke 0.4s' }}
            />
            {/* Center text */}
            <text x={50} y={48} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 18, fontWeight: 700, fill: color }}>
              {pctDisplay}
            </text>
            <text x={50} y={62} textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 9, fill: 'var(--ink-4)' }}>
              %
            </text>
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink mb-2 truncate">{goal.name}</div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-ink-4 caps">Saved</span>
              <span className="font-mono text-ink-2">
                {masked ? '••••' : `KES ${fmtX(goal.current_amount)}`}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-ink-4 caps">Target</span>
              <span className="font-mono text-ink-2">
                {masked ? '••••' : `KES ${fmtX(goal.target_amount)}`}
              </span>
            </div>
            {needPerMonth != null && (
              <div className="flex justify-between text-[10px]">
                <span className="text-ink-4 caps">Need/mo</span>
                <span className="font-mono" style={{ color }}>
                  {masked ? '••••' : `KES ${fmtX(needPerMonth)}`}
                </span>
              </div>
            )}
            {goal.deadline && (
              <div className="flex justify-between text-[10px]">
                <span className="text-ink-4 caps">Deadline</span>
                <span className="font-mono text-ink-3">
                  {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
