import { useMemo, useState } from 'react'
import { useTransactions, useInsertTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useUIStore } from '@/store'
import { AxisBar } from '@/components/ui/AxisBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TxRow } from '@/components/ui/TxRow'
import { Sheet } from '@/components/ui/Sheet'
import { LogForm } from '@/components/forms/LogForm'
import { TransferForm } from '@/components/forms/TransferForm'
import { addDays, monthStart, quarterStart, yearStart } from '@/lib/utils'
import type { AuditPeriod, PeriodSummary, AxisTotals, Transaction } from '@/types/ledger'

interface AuditViewProps { userId: string }

function getPeriod(mode: 'month' | 'quarter' | 'year', offset: number): AuditPeriod {
  let start: Date, end: Date, label: string
  if (mode === 'month') {
    start = monthStart(offset)
    end = addDays(monthStart(offset + 1), -1)
    label = start.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  } else if (mode === 'quarter') {
    // offset is in quarters: 0=current, -1=prev, -2=two quarters ago, etc.
    start = quarterStart(offset)
    end = addDays(quarterStart(offset + 1), -1)
    const q = Math.floor(start.getMonth() / 3) + 1
    label = `Q${q} ${start.getFullYear()}`
  } else {
    start = yearStart(offset)
    end = addDays(yearStart(offset + 1), -1)
    label = String(start.getFullYear())
  }
  return { label, start, end, mode, offset }
}

function periodSummary(txs: Transaction[]): Omit<PeriodSummary, 'period'> {
  const isReal = (t: Transaction) => !t.counter_account_id
  const income = txs.filter((t) => t.direction === 'in' && isReal(t)).reduce((s, t) => s + t.amount, 0)
  const deployed = txs.filter((t) => t.direction === 'out' && isReal(t) && (t.axis === 'INVEST' || t.axis === 'PROTECT')).reduce((s, t) => s + t.amount, 0)
  const spend = txs.filter((t) => t.direction === 'out' && isReal(t) && (t.axis === 'SUSTAIN' || t.axis === 'LEAK')).reduce((s, t) => s + t.amount, 0)
  const saveRate = income > 0 ? (deployed / income) * 100 : 0
  const axisTotals: AxisTotals = {
    INVEST:  txs.filter((t) => t.direction === 'out' && isReal(t) && t.axis === 'INVEST').reduce((s, t) => s + t.amount, 0),
    PROTECT: txs.filter((t) => t.direction === 'out' && isReal(t) && t.axis === 'PROTECT').reduce((s, t) => s + t.amount, 0),
    SUSTAIN: txs.filter((t) => t.direction === 'out' && isReal(t) && t.axis === 'SUSTAIN').reduce((s, t) => s + t.amount, 0),
    LEAK:    txs.filter((t) => t.direction === 'out' && isReal(t) && t.axis === 'LEAK').reduce((s, t) => s + t.amount, 0),
  }
  return { income, spend, deployed, saveRate, burnRate: spend, axisTotals, txCount: txs.length }
}

export function AuditView({ userId }: AuditViewProps) {
  const { masked, auditMode, auditOffset, setAuditMode, setAuditOffset } = useUIStore()
  const { allTx } = useTransactions(userId)
  const { data: accounts = [] } = useAccounts(userId)
  const { data: categories = [] } = useCategories(userId)
  const insertTx = useInsertTransaction(userId)
  const deleteTx = useDeleteTransaction(userId)

  const [logOpen, setLogOpen]       = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editTx, setEditTx]         = useState<Transaction | undefined>()

  const currentPeriod = getPeriod(auditMode, auditOffset)
  const histCount = auditMode === 'month' ? 12 : auditMode === 'quarter' ? 8 : 5

  // All periods comparison — memoized on allTx + mode + offset
  const comparison = useMemo(() => {
    return Array.from({ length: histCount }, (_, i) => {
      const offset = auditOffset - (histCount - 1 - i)
      const period = getPeriod(auditMode, offset)
      const txs = allTx.filter((t) => { const d = new Date(t.occurred_at); return d >= period.start && d <= period.end })
      return { period, summary: periodSummary(txs) }
    })
  }, [allTx, auditMode, auditOffset])

  const currentTx = useMemo(
    () => allTx
      .filter((t) => { const d = new Date(t.occurred_at); return d >= currentPeriod.start && d <= currentPeriod.end })
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [allTx, currentPeriod]
  )
  const summary = useMemo(() => periodSummary(currentTx), [currentTx])

  // Category breakdown — key is stable id, label is human-readable name
  const categoryBreakdown = useMemo(() => {
    const catById = new Map(categories.map((c) => [c.id, c.name]))
    const map = new Map<string, { amount: number; axis: string; label: string }>()
    for (const t of currentTx) {
      if (t.direction === 'out' && !t.counter_account_id && t.axis) {
        const key   = t.category_id ?? t.axis
        const label = t.category_id ? (catById.get(t.category_id) ?? t.axis) : t.axis
        const existing = map.get(key)
        map.set(key, { amount: (existing?.amount ?? 0) + t.amount, axis: t.axis, label })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 10)
  }, [currentTx, categories])
  const maxCat = Math.max(...categoryBreakdown.map(({ amount }) => amount), 1)

  // Grouped by date for full ledger
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of currentTx) {
      const key = t.occurred_at.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [currentTx])

  const netFlow = summary.income - summary.burnRate

  return (
    <div className="pb-20">
      {/* 3 sub-tabs */}
      <div className="px-4 pt-4 flex gap-1 mb-3">
        {(['month', 'quarter', 'year'] as const).map((m) => (
          <button key={m}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${auditMode === m ? 'bg-bg-3 text-ink' : 'text-ink-3 hover:text-ink-2'}`}
            onClick={() => setAuditMode(m)}>
            {m === 'month' ? 'Monthly' : m === 'quarter' ? 'Quarterly' : 'Annual'}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="px-4 flex items-center gap-3 mb-4">
        <button className="text-ink-3 hover:text-ink w-6 text-center" onClick={() => setAuditOffset(auditOffset - 1)}>‹</button>
        <span className="flex-1 text-sm text-ink text-center font-medium">{currentPeriod.label}</span>
        <button
          className={`w-6 text-center ${auditOffset >= 0 ? 'text-ink-4 cursor-default' : 'text-ink-3 hover:text-ink'}`}
          onClick={() => { if (auditOffset < 0) setAuditOffset(auditOffset + 1) }}
        >›</button>
        {auditOffset !== 0 && (
          <button className="text-[10px] text-ink-3 caps" onClick={() => setAuditOffset(0)}>Now</button>
        )}
      </div>

      {/* KPI summary — 6 cards, 2×3 grid */}
      <div className="px-4 mb-3 grid grid-cols-3 gap-2">
        <KpiCard index={0} label="Income"   value={summary.income}    masked={masked} color="var(--invest)" />
        <KpiCard index={1} label="Burn"     value={summary.burnRate}  masked={masked} color="var(--sustain)" />
        <KpiCard index={2} label="Save%"    value={summary.saveRate}  masked={masked} suffix="%" color="var(--invest)" />
        <KpiCard index={3} label="Deployed" value={summary.deployed}  masked={masked} color="var(--protect)" />
        <KpiCard index={4} label="Tx count" value={summary.txCount}   format="full" />
        <KpiCard index={5} label="Net flow" value={netFlow}           masked={masked} color={netFlow >= 0 ? 'var(--invest)' : 'var(--leak)'} />
      </div>

      {/* Axis bar for period */}
      <div className="px-4 mb-4">
        <AxisBar totals={summary.axisTotals} />
      </div>

      {/* Comparison table */}
      <div className="px-4 mb-4">
        <div className="caps text-ink-3 mb-2">Comparison</div>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                <th className="text-left px-3 py-2 text-ink-3 font-medium sticky left-0 bg-bg-2">Period</th>
                <th className="text-right px-3 py-2 text-ink-3 font-medium">Income</th>
                <th className="text-right px-3 py-2 text-ink-3 font-medium">Burn</th>
                <th className="text-right px-3 py-2 text-ink-3 font-medium">Save%</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(({ period, summary: s }, i) => {
                const isCurrent = period.offset === auditOffset
                return (
                  <tr key={i}
                    className={`border-b border-line last:border-0 transition-colors ${isCurrent ? 'bg-[rgba(0,230,118,0.04)]' : 'hover:bg-bg-2'}`}>
                    <td className={`px-3 py-2 sticky left-0 ${isCurrent ? 'text-accent bg-[rgba(0,230,118,0.04)]' : 'text-ink-2 bg-bg-1'}`}>
                      {period.label}
                    </td>
                    <td className="text-right px-3 py-2 text-invest">{masked ? '••••' : s.income.toLocaleString()}</td>
                    <td className="text-right px-3 py-2 text-sustain">{masked ? '••••' : s.burnRate.toLocaleString()}</td>
                    <td className="text-right px-3 py-2 text-ink">{s.saveRate.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category breakdown — axis-colored bars */}
      {categoryBreakdown.length > 0 && (
        <div className="px-4 mb-4">
          <div className="caps text-ink-3 mb-2">Breakdown</div>
          <div className="space-y-2">
            {categoryBreakdown.map(({ label, amount, axis }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-ink-3 w-24 truncate capitalize">{label.toLowerCase()}</span>
                <div className="flex-1 h-1.5 bg-bg-3 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${(amount / maxCat) * 100}%`,
                      background: `var(--${axis.toLowerCase()})`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-ink-2 w-16 text-right">
                  {masked ? '••••' : amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full ledger grouped by date */}
      <div className="px-4 mb-2 caps text-ink-3">Ledger</div>
      {groupedByDate.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-4">No transactions this period</div>
      ) : (
        groupedByDate.map(([date, txs]) => {
          const daily = txs.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0)
          return (
            <div key={date} className="mb-2">
              <div className="px-4 py-1 flex items-center justify-between border-t border-line">
                <span className="caps text-ink-4">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="font-mono text-xs text-ink-3">{masked ? '••••' : `-${daily.toLocaleString()}`}</span>
              </div>
              {txs.map((t) => (
                <TxRow
                  key={t.id} tx={t} accounts={accounts} masked={masked}
                  onEdit={(tx) => { setEditTx(tx); setLogOpen(true) }}
                />
              ))}
            </div>
          )
        })
      )}

      <Sheet open={logOpen} onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        title={editTx ? 'Edit transaction' : 'Log transaction'}>
        <LogForm
          accounts={accounts} categories={categories} userId={userId} editTx={editTx}
          onSubmit={async (tx) => { await insertTx.mutateAsync(tx) }}
          onDelete={async (id) => { await deleteTx.mutateAsync(id) }}
          onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        />
      </Sheet>

      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer">
        <TransferForm
          accounts={accounts} userId={userId}
          onSubmit={async (legs, fee) => {
            await insertTx.mutateAsync(legs[0])
            await insertTx.mutateAsync(legs[1])
            if (fee) await insertTx.mutateAsync(fee)
          }}
          onClose={() => setTransferOpen(false)}
        />
      </Sheet>
    </div>
  )
}
