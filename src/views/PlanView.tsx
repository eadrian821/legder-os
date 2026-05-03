import { useMemo, useState } from 'react'
import { useGoals, useUpsertGoal } from '@/hooks/useGoals'
import { useRecurring, useUpsertRecurring } from '@/hooks/useRecurring'
import { useBudgets, useUpsertBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useTransactions } from '@/hooks/useTransactions'
import { useUIStore } from '@/store'
import { Sheet } from '@/components/ui/Sheet'
import { GoalCard } from '@/components/ui/GoalCard'
import { BudgetCard } from '@/components/ui/BudgetCard'
import { WeeklyBudgetSynthesis } from '@/components/ui/WeeklyBudgetSynthesis'
import { GoalForm } from '@/components/forms/GoalForm'
import { RecurringForm } from '@/components/forms/RecurringForm'
import { BudgetForm } from '@/components/forms/BudgetForm'
import { useAccounts } from '@/hooks/useAccounts'
import { fmtX, weekStart, addDays } from '@/lib/utils'
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
  const { yearTx } = useTransactions(userId)
  const upsertGoal = useUpsertGoal(userId)
  const upsertRecurring = useUpsertRecurring(userId)
  const upsertBudget = useUpsertBudget(userId)
  const deleteBudget = useDeleteBudget(userId)

  const [goalOpen, setGoalOpen]           = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [budgetOpen, setBudgetOpen]       = useState(false)
  const [editGoal, setEditGoal]           = useState<Goal | undefined>()
  const [editRecurring, setEditRecurring] = useState<Recurring | undefined>()
  const [editBudget, setEditBudget]       = useState<Budget | undefined>()

  const ws = weekStart(0)

  // Compute actual spend per budget in current period
  const budgetsWithSpent = useMemo(() => {
    const today     = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return budgets.map((b) => {
      const periodStart = b.period === 'monthly' ? monthStart : ws
      const spent = yearTx
        .filter((t) => {
          const d = new Date(t.occurred_at)
          return d >= periodStart && d <= today &&
                 t.direction === 'out' && !t.counter_account_id &&
                 (b.axis
                   ? t.axis === b.axis
                   : b.category_id ? t.category_id === b.category_id : false)
        })
        .reduce((sum, t) => sum + t.amount, 0)
      return { ...b, actualSpent: spent }
    })
  }, [budgets, yearTx, ws])

  // Current week's SUSTAIN+LEAK spend for synthesis panel
  const weekActualSpend = useMemo(() => {
    const we = addDays(ws, 7)
    return yearTx
      .filter((t) => {
        const d = new Date(t.occurred_at)
        return d >= ws && d < we &&
               t.direction === 'out' && !t.counter_account_id &&
               (t.axis === 'SUSTAIN' || t.axis === 'LEAK')
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }, [yearTx, ws])

  return (
    <div className="pb-24 lg:pb-8">
      {/* Runway hero */}
      <div className="px-4 pt-4 mb-4">
        <div
          className="rounded-lg p-4 grid grid-cols-2 gap-4"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
        >
          <div>
            <div className="caps text-ink-4 mb-1">Cash runway</div>
            <div className="font-mono text-2xl font-bold" style={{ color: metrics.runway != null && metrics.runway < 30 ? 'var(--leak)' : 'var(--protect)' }}>
              {metrics.runway != null ? `${Math.round(metrics.runway)}d` : '—'}
            </div>
          </div>
          <div>
            <div className="caps text-ink-4 mb-1">Total runway</div>
            <div className="font-mono text-2xl font-bold text-ink-2">
              {metrics.runwayTotal != null ? `${Math.round(metrics.runwayTotal)}d` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly synthesis ── */}
      <div className="px-4">
        <WeeklyBudgetSynthesis
          budgets={budgetsWithSpent}
          weekActualSpend={weekActualSpend}
          masked={masked}
        />
      </div>

      {/* ── Goals ── */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="caps text-ink-3">Goals</span>
        <button
          className="text-xs px-2.5 py-1 rounded border border-line text-ink-3 hover:text-ink transition-colors"
          onClick={() => { setEditGoal(undefined); setGoalOpen(true) }}
        >
          + Add
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="px-4 py-4 text-sm text-ink-4 mb-4">No goals yet</div>
      ) : (
        <div className="px-4 space-y-3 mb-6">
          {goals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              masked={masked}
              index={i}
              onClick={() => { setEditGoal(g); setGoalOpen(true) }}
            />
          ))}
        </div>
      )}

      {/* ── Budgets ── */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="caps text-ink-3">Budgets</span>
        <button
          className="text-xs px-2.5 py-1 rounded border border-line text-ink-3 hover:text-ink transition-colors"
          onClick={() => { setEditBudget(undefined); setBudgetOpen(true) }}
        >
          + Add
        </button>
      </div>

      {budgetsWithSpent.length === 0 ? (
        <div className="px-4 py-4 text-sm text-ink-4 mb-4">No budgets yet</div>
      ) : (
        <div className="px-4 space-y-3 mb-6">
          {budgetsWithSpent.map((b, i) => (
            <BudgetCard
              key={b.id}
              budget={b}
              actualSpent={b.actualSpent}
              categories={categories}
              masked={masked}
              index={i}
              onDelete={async () => { await deleteBudget.mutateAsync(b.id) }}
            />
          ))}
        </div>
      )}

      {/* ── Recurring ── */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="caps text-ink-3">Recurring</span>
        <button
          className="text-xs px-2.5 py-1 rounded border border-line text-ink-3 hover:text-ink transition-colors"
          onClick={() => { setEditRecurring(undefined); setRecurringOpen(true) }}
        >
          + Add
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--line)' }} className="mb-4">
        {recurring.length === 0 && (
          <div className="px-4 py-4 text-sm text-ink-4">No recurring entries</div>
        )}
        {recurring.map((r) => (
          <button
            key={r.id}
            className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors hover:bg-bg-2"
            style={{ borderBottom: '1px solid var(--line)' }}
            onClick={() => { setEditRecurring(r); setRecurringOpen(true) }}
          >
            <div>
              <div className="text-sm text-ink">{r.description}</div>
              <div className="text-[10px] text-ink-4 caps mt-0.5">{r.frequency} · next {r.next_date}</div>
            </div>
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: r.direction === 'in' ? 'var(--invest)' : 'var(--leak)' }}
            >
              {masked ? '••••' : `${r.direction === 'in' ? '+' : '−'}${fmtX(r.amount)}`}
            </span>
          </button>
        ))}
      </div>

      {/* Sheets */}
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
