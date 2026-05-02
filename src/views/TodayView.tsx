import { useMemo, useState } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions, useInsertTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useUIStore } from '@/store'
import { NumberTicker } from '@/components/ui/NumberTicker'
import { AxisBar } from '@/components/ui/AxisBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TxRow } from '@/components/ui/TxRow'
import { Sheet } from '@/components/ui/Sheet'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { LogForm } from '@/components/forms/LogForm'
import { TransferForm } from '@/components/forms/TransferForm'
import { SparkLine } from '@/components/ui/SparkLine'
import { PinModal } from '@/components/ui/PinModal'
import { BurnGauge } from '@/components/ui/BurnGauge'
import { todayLocal, addDays, fmtX } from '@/lib/utils'
import type { Transaction } from '@/types/ledger'

interface TodayViewProps { userId: string }

export function TodayView({ userId }: TodayViewProps) {
  const { masked, nwLocked, toggleNwLocked } = useUIStore()
  const metrics = useMetrics()
  const { data: accounts = [], isLoading } = useAccounts(userId)
  const { yearTx, isLoading: txLoading } = useTransactions(userId)
  const { data: categories = [] } = useCategories(userId)
  const insertTx = useInsertTransaction(userId)
  const deleteTx = useDeleteTransaction(userId)

  const [logOpen, setLogOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | undefined>()
  const [pinOpen, setPinOpen] = useState(false)

  const today = todayLocal()
  const tomorrow = addDays(today, 1)

  const todayTx = useMemo(
    () => yearTx.filter((t) => { const d = new Date(t.occurred_at); return d >= today && d < tomorrow })
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [yearTx]
  )

  // Group by time of day
  const grouped = useMemo(() => {
    const evening   = todayTx.filter((t) => new Date(t.occurred_at).getHours() >= 17)
    const afternoon = todayTx.filter((t) => { const h = new Date(t.occurred_at).getHours(); return h >= 12 && h < 17 })
    const morning   = todayTx.filter((t) => new Date(t.occurred_at).getHours() < 12)
    return [
      { label: 'Evening', txs: evening },
      { label: 'Afternoon', txs: afternoon },
      { label: 'Morning', txs: morning },
    ].filter((g) => g.txs.length > 0)
  }, [todayTx])

  const sparkPoints = useMemo(() => metrics.nwHistory.slice(-30).map((p) => p.nw), [metrics.nwHistory])

  const todayDelta = useMemo(() => {
    return todayTx.reduce((s, t) => s + (t.direction === 'in' ? t.amount : -t.amount), 0)
  }, [todayTx])

  const handleLogSubmit = async (tx: Omit<Transaction, 'created_at'>) => {
    await insertTx.mutateAsync(tx)
  }

  const handleTransferSubmit = async (
    legs: [Omit<Transaction, 'created_at'>, Omit<Transaction, 'created_at'>],
    fee?: Omit<Transaction, 'created_at'>
  ) => {
    await insertTx.mutateAsync(legs[0])
    await insertTx.mutateAsync(legs[1])
    if (fee) await insertTx.mutateAsync(fee)
  }

  if (isLoading || txLoading) {
    return (
      <div className="p-4 space-y-3">
        <SkeletonCard lines={3} showNumber height={120} />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Hero card */}
      <div className="px-4 pt-4 pb-3">
        <div className="rounded-lg p-4 border border-line bg-bg-1" style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="caps text-ink-3 mb-1">NET WORTH</div>
              <div className="flex items-center gap-2">
                {nwLocked ? (
                  <button
                    className="font-mono text-[46px] font-extrabold leading-none text-ink-4 blur-sm"
                    onClick={() => setPinOpen(true)}
                  >
                    ••••••
                  </button>
                ) : (
                  <NumberTicker value={metrics.nw} format="compact" prefix="KES" masked={masked} size="hero" />
                )}
                <button
                  className="text-ink-4 text-sm mt-1"
                  onClick={() => nwLocked ? setPinOpen(true) : toggleNwLocked()}
                >
                  {nwLocked ? '🔒' : '🔓'}
                </button>
              </div>
              <div className={`text-xs font-mono mt-1 ${todayDelta >= 0 ? 'text-invest' : 'text-leak'}`}>
                {masked ? '••••' : `${todayDelta >= 0 ? '+' : ''}${fmtX(todayDelta)} today`}
              </div>
            </div>
            <SparkLine points={sparkPoints} width={100} height={36} />
          </div>
          <AxisBar totals={metrics.axisToday} />
        </div>
      </div>

      {/* Burn gauge */}
      <div className="px-4 mb-3">
        <BurnGauge
          dailyBurn={metrics.dailyBurn}
          burnRatio={metrics.dailyBurn / (metrics.incomeM / 30 || 1)}
          runway={metrics.runway}
          runwayTotal={metrics.runwayTotal}
          masked={masked}
        />
      </div>

      {/* KPI grid */}
      <div className="px-4 mb-4 grid grid-cols-4 gap-2">
        <KpiCard index={0} label="Burn/day"  value={metrics.dailyBurn}  masked={masked} color="var(--sustain)" />
        <KpiCard index={1} label="Leak%"     value={metrics.leakPct}    masked={masked} suffix="%" color="var(--leak)" />
        <KpiCard index={2} label="Month in"  value={metrics.incomeM}    masked={masked} color="var(--invest)" />
        <KpiCard index={3} label="Week out"  value={metrics.axisWeek.SUSTAIN + metrics.axisWeek.LEAK} masked={masked} />
        <KpiCard index={4} label="Cash runway" value={metrics.runway ?? 0} suffix="d" />
        <KpiCard index={5} label="Asset runway" value={metrics.runwayTotal ?? 0} suffix="d" />
        <KpiCard index={6} label="Save rate" value={metrics.saveRate}   masked={masked} suffix="%" color="var(--invest)" />
        <KpiCard index={7} label="Deployed"  value={metrics.deployedM}  masked={masked} color="var(--protect)" />
      </div>

      {/* Transaction list */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="caps text-ink-3">Today</span>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1 rounded-md border border-protect/40 text-protect hover:bg-protect/10"
            onClick={() => setTransferOpen(true)}
          >
            Transfer
          </button>
          <button
            className="text-xs px-3 py-1 rounded-md bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
            onClick={() => { setEditTx(undefined); setLogOpen(true) }}
          >
            + Log
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-4">No transactions today</div>
      ) : (
        grouped.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-4 py-1 caps text-ink-4">{g.label}</div>
            <div className="border-t border-line">
              {g.txs.map((t) => (
                <TxRow
                  key={t.id} tx={t} accounts={accounts} masked={masked}
                  onEdit={(tx) => { setEditTx(tx); setLogOpen(true) }}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <Sheet open={logOpen} onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        title={editTx ? 'Edit transaction' : 'Log transaction'}>
        <LogForm
          accounts={accounts} categories={categories} userId={userId} editTx={editTx}
          onSubmit={handleLogSubmit}
          onDelete={async (id) => { await deleteTx.mutateAsync(id) }}
          onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        />
      </Sheet>

      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer">
        <TransferForm
          accounts={accounts} userId={userId}
          onSubmit={handleTransferSubmit}
          onClose={() => setTransferOpen(false)}
        />
      </Sheet>

      <PinModal
        open={pinOpen}
        onSuccess={() => { setPinOpen(false); toggleNwLocked() }}
        onClose={() => setPinOpen(false)}
      />
    </div>
  )
}
