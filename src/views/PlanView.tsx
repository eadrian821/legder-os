import { useState } from 'react'
import { useGoals, useUpsertGoal } from '@/hooks/useGoals'
import { useRecurring, useUpsertRecurring } from '@/hooks/useRecurring'
import { useBudgets, useUpsertBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useUIStore } from '@/store'
import { Sheet } from '@/components/ui/Sheet'
import { GoalForm } from '@/components/forms/GoalForm'
import { RecurringForm } from '@/components/forms/RecurringForm'
import { BudgetForm } from '@/components/forms/BudgetForm'
import { useAccounts } from '@/hooks/useAccounts'
import { fmtX } from '@/lib/utils'
import type { Goal, Recurring, Budget } from '@/types/ledger'

interface PlanViewProps { userId: string }

export function PlanView({ userId }: PlanViewProps) {
  const { masked } = useUIStore()
  const { data: goals = [] } = useGoals(userId)
  const { data: recurring = [] } = useRecurring(userId)
  const { data: budgets = [] } = useBudgets(userId)
  const { data: categories = [] } = useCategories(userId)
  const { data: accounts = [] } = useAccounts(userId)
  const metrics = useComputedMetrics(userId)
  const upsertGoal = useUpsertGoal(userId)
  const upsertRecurring = useUpsertRecurring(userId)
  const upsertBudget = useUpsertBudget(userId)
  const deleteBudget = useDeleteBudget(userId)

  const [goalOpen, setGoalOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | undefined>()
  const [editRecurring, setEditRecurring] = useState<Recurring | undefined>()
  const [editBudget, setEditBudget] = useState<Budget | undefined>()

  return (
    <div className="pb-20">
      {/* Runway summary */}
      <div className="px-4 pt-4 mb-4">
        <div className="rounded-lg bg-bg-1 border border-line p-4 grid grid-cols-2 gap-4">
          <div>
            <div className="caps text-ink-3 mb-1">Cash runway</div>
            <div className="font-mono text-2xl font-bold text-ink">
              {metrics.runway != null ? `${Math.round(metrics.runway)}d` : '—'}
            </div>
          </div>
          <div>
            <div className="caps text-ink-3 mb-1">Asset runway</div>
            <div className="font-mono text-2xl font-bold text-ink">
              {metrics.runwayTotal != null ? `${Math.round(metrics.runwayTotal)}d` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="caps text-ink-3">Goals</span>
        <button className="text-xs px-2 py-1 rounded border border-line text-ink-3 hover:text-ink"
          onClick={() => { setEditGoal(undefined); setGoalOpen(true) }}>+ Add</button>
      </div>
      <div className="space-y-0 border-t border-line mb-4">
        {goals.length === 0 && <div className="px-4 py-4 text-sm text-ink-4">No goals yet</div>}
        {goals.map((g) => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100)
          return (
            <button key={g.id} className="w-full px-4 py-3 border-b border-line hover:bg-bg-2 text-left"
              onClick={() => { setEditGoal(g); setGoalOpen(true) }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-ink">{g.name}</span>
                <span className="font-mono text-xs text-ink-2">
                  {masked ? '••••' : `${fmtX(g.current_amount)} / ${fmtX(g.target_amount)}`}
                </span>
              </div>
              <div className="h-1 bg-bg-3 rounded-sm overflow-hidden">
                <div className="h-full bg-invest rounded-sm transition-all" style={{ width: `${pct}%` }} />
              </div>
              {g.deadline && (
                <div className="text-[10px] text-ink-4 mt-1">
                  {new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Budgets */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="caps text-ink-3">Budgets</span>
        <button className="text-xs px-2 py-1 rounded border border-line text-ink-3 hover:text-ink"
          onClick={() => { setEditBudget(undefined); setBudgetOpen(true) }}>+ Add</button>
      </div>
      <div className="border-t border-line mb-4">
        {budgets.length === 0 && <div className="px-4 py-4 text-sm text-ink-4">No budgets yet</div>}
        {budgets.map((b) => (
          <div key={b.id} className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-sm text-ink">{b.axis ?? (categories.find(c => c.id === b.category_id)?.name ?? '—')}</div>
              <div className="text-[10px] text-ink-3 caps">{b.period}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-ink">{masked ? '••••' : `KES ${fmtX(b.limit_amount)}`}</span>
              <button className="text-xs text-leak" onClick={async () => await deleteBudget.mutateAsync(b.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Recurring */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="caps text-ink-3">Recurring</span>
        <button className="text-xs px-2 py-1 rounded border border-line text-ink-3 hover:text-ink"
          onClick={() => { setEditRecurring(undefined); setRecurringOpen(true) }}>+ Add</button>
      </div>
      <div className="border-t border-line mb-4">
        {recurring.length === 0 && <div className="px-4 py-4 text-sm text-ink-4">No recurring entries</div>}
        {recurring.map((r) => (
          <button key={r.id} className="w-full px-4 py-3 border-b border-line hover:bg-bg-2 text-left flex items-center justify-between"
            onClick={() => { setEditRecurring(r); setRecurringOpen(true) }}>
            <div>
              <div className="text-sm text-ink">{r.description}</div>
              <div className="text-[10px] text-ink-3 caps">{r.frequency} · next {r.next_date}</div>
            </div>
            <span className={`font-mono text-sm ${r.direction === 'in' ? 'text-invest' : 'text-leak'}`}>
              {masked ? '••••' : `${r.direction === 'in' ? '+' : '-'}${fmtX(r.amount)}`}
            </span>
          </button>
        ))}
      </div>

      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title={editGoal ? 'Edit goal' : 'New goal'}>
        <GoalForm userId={userId} editGoal={editGoal}
          onSubmit={async (g) => { await upsertGoal.mutateAsync(g) }}
          onClose={() => setGoalOpen(false)} />
      </Sheet>
      <Sheet open={recurringOpen} onClose={() => setRecurringOpen(false)} title={editRecurring ? 'Edit recurring' : 'New recurring'}>
        <RecurringForm accounts={accounts} categories={categories} userId={userId} editRecurring={editRecurring}
          onSubmit={async (r) => { await upsertRecurring.mutateAsync(r) }}
          onClose={() => setRecurringOpen(false)} />
      </Sheet>
      <Sheet open={budgetOpen} onClose={() => setBudgetOpen(false)} title={editBudget ? 'Edit budget' : 'New budget'}>
        <BudgetForm categories={categories} userId={userId} editBudget={editBudget}
          onSubmit={async (b) => { await upsertBudget.mutateAsync(b) }}
          onClose={() => setBudgetOpen(false)} />
      </Sheet>
    </div>
  )
}
