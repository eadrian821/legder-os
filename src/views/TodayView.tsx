import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
import { Lock, Unlock } from 'lucide-react'
import type { Transaction } from '@/types/ledger'

interface TodayViewProps { userId: string }

type TxFilter = 'all' | 'expense' | 'income' | 'transfer'

const FILTERS: { id: TxFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'expense',  label: 'Expense' },
  { id: 'income',   label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]

export function TodayView({ userId }: TodayViewProps) {
  const { masked, nwLocked, toggleNwLocked } = useUIStore()
  const metrics = useMetrics()
  const { data: accounts = [], isLoading } = useAccounts(userId)
  const { yearTx, isLoading: txLoading } = useTransactions(userId)
  const { data: categories = [] } = useCategories(userId)
  const insertTx = useInsertTransaction(userId)
  const deleteTx = useDeleteTransaction(userId)

  const [logOpen, setLogOpen]             = useState(false)
  const [transferOpen, setTransferOpen]   = useState(false)
  const [editTx, setEditTx]               = useState<Transaction | undefined>()
  const [editTransferLegs, setEditTransferLegs] = useState<[Transaction, Transaction] | undefined>()
  const [editTransferFee,  setEditTransferFee]  = useState<Transaction | undefined>()
  const [pinOpen, setPinOpen]             = useState(false)
  const [txFilter, setTxFilter]           = useState<TxFilter>('all')

  const today    = todayLocal()
  const tomorrow = addDays(today, 1)

  const todayTx = useMemo(
    () => yearTx
      .filter((t) => { const d = new Date(t.occurred_at); return d >= today && d < tomorrow })
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [yearTx]
  )

  const filteredTx = useMemo(() => {
    if (txFilter === 'expense')  return todayTx.filter((t) => t.direction === 'out' && !t.counter_account_id)
    if (txFilter === 'income')   return todayTx.filter((t) => t.direction === 'in'  && !t.counter_account_id)
    if (txFilter === 'transfer') return todayTx.filter((t) => !!t.counter_account_id)
    return todayTx
  }, [todayTx, txFilter])

  const sparkPoints = useMemo(() => metrics.nwHistory.slice(-60).map((p) => p.nw), [metrics.nwHistory])

  const todayIn  = useMemo(() => todayTx.filter((t) => t.direction === 'in'  && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [todayTx])
  const todayOut = useMemo(() => todayTx.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [todayTx])

  // Net worth change over the last 30 data points — the one accumulation metric not shown elsewhere
  const nwDelta30 = useMemo(() => {
    if (metrics.nwHistory.length < 2) return 0
    const from = metrics.nwHistory[Math.max(0, metrics.nwHistory.length - 30)]
    return metrics.nw - from.nw
  }, [metrics.nwHistory, metrics.nw])

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

  const handleTransferEdit = (clickedTx: Transaction) => {
    const partner = yearTx.find(
      (tx) => tx.account_id === clickedTx.counter_account_id && tx.counter_account_id === clickedTx.account_id
    )
    if (!partner) return
    const outLeg = clickedTx.direction === 'out' ? clickedTx : partner
    const feeTx = yearTx.find(
      (tx) =>
        tx.account_id === outLeg.account_id &&
        tx.occurred_at === outLeg.occurred_at &&
        tx.direction === 'out' &&
        tx.axis === 'LEAK' &&
        tx.counter_account_id === null &&
        tx.description?.startsWith('Transfer fee (')
    )
    setEditTransferLegs(clickedTx.direction === 'out' ? [clickedTx, partner] : [partner, clickedTx])
    setEditTransferFee(feeTx)
    setTransferOpen(true)
  }

  if (isLoading || txLoading) {
    return (
      <div className="p-4 space-y-3">
        <SkeletonCard lines={3} showNumber height={180} />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      {/* ── Hero card ── */}
      <div className="px-4 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d1f14 0%, #07070f 60%, #0a0a1f 100%)',
            border: '1px solid rgba(0,230,118,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 0 rgba(0,230,118,0)',
          }}
        >
          <div className="px-5 pt-5 pb-4">
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <span className="caps text-ink-3">Net Worth</span>
              <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: 'var(--invest)' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-invest animate-pulseGlow"
                  style={{ boxShadow: '0 0 6px var(--invest)' }}
                />
                LIVE
              </div>
            </div>

            {/* NW value + lock */}
            <div className="flex items-end gap-3 mb-1">
              {nwLocked ? (
                <button
                  className="font-mono text-[46px] font-extrabold leading-none text-ink-4"
                  style={{ filter: 'blur(12px)' }}
                  onClick={() => setPinOpen(true)}
                >
                  KES ••••••
                </button>
              ) : (
                <NumberTicker value={metrics.nw} format="compact" prefix="KES" masked={masked} size="hero" />
              )}
              <button
                className="mb-2 text-ink-4 hover:text-ink-2 transition-colors"
                onClick={() => nwLocked ? setPinOpen(true) : toggleNwLocked()}
              >
                {nwLocked ? <Lock size={15} strokeWidth={2} /> : <Unlock size={15} strokeWidth={2} />}
              </button>
            </div>

            {/* Delta pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--invest)' }}
              >
                +{masked ? '••••' : fmtX(todayIn)}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                style={{ background: 'rgba(255,51,85,0.12)', color: 'var(--leak)' }}
              >
                −{masked ? '••••' : fmtX(todayOut)}
              </span>
              <span className="text-ink-4 text-[10px] select-none">·</span>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                style={{
                  background: nwDelta30 >= 0 ? 'rgba(0,230,118,0.08)' : 'rgba(255,51,85,0.08)',
                  color: nwDelta30 >= 0 ? 'var(--invest)' : 'var(--leak)',
                  border: `1px solid ${nwDelta30 >= 0 ? 'rgba(0,230,118,0.18)' : 'rgba(255,51,85,0.18)'}`,
                }}
                title="Net worth change over the last 30 days"
              >
                {masked ? '••••' : `${nwDelta30 >= 0 ? '+' : '−'}${fmtX(Math.abs(nwDelta30))}`}
                <span className="opacity-50 text-[9px] font-normal">30d</span>
              </span>
            </div>

            {/* Full-width sparkline */}
            <div className="w-full mb-3" style={{ height: 56 }}>
              <SparkLine points={sparkPoints} width="100%" height={56} color="var(--invest)" />
            </div>

            {/* Axis bar */}
            <AxisBar totals={metrics.axisToday} />
          </div>
        </motion.div>
      </div>

      {/* ── Burn gauge (arc ring) ── */}
      <div className="px-4 mb-3">
        <BurnGauge
          dailyBurn={metrics.dailyBurn}
          burnRatio={metrics.dailyIncome > 0
            ? metrics.dailyBurn / metrics.dailyIncome
            : metrics.dailyBurn > 0 ? 1 : 0}
          runway={metrics.runway}
          runwayTotal={metrics.runwayTotal}
          masked={masked}
        />
      </div>

      {/* ── KPI grid ── */}
      <div className="px-4 mb-4 grid grid-cols-4 gap-2">
        <KpiCard index={0} label="Burn/day"     value={metrics.dailyBurn}  masked={masked} color="var(--leak)" />
        <KpiCard index={1} label="Leak%"        value={metrics.leakPct}    masked={masked} suffix="%" color="var(--leak)" />
        <KpiCard index={2} label="Month in"     value={metrics.incomeM}    masked={masked} color="var(--invest)" />
        <KpiCard index={3} label="Week out"     value={metrics.axisWeek.SUSTAIN + metrics.axisWeek.LEAK} masked={masked} color="var(--sustain)" />
        <KpiCard index={4} label="Cash run"     value={metrics.runway ?? 0}      suffix="d" color="var(--protect)" />
        <KpiCard index={5} label="Total run"    value={metrics.runwayTotal ?? 0}  suffix="d" color="var(--protect)" />
        <KpiCard index={6} label="Save rate"    value={metrics.saveRate}   masked={masked} suffix="%" color="var(--invest)" />
        <KpiCard index={7} label="Deployed"     value={metrics.deployedM}  masked={masked} color="var(--invest)" />
      </div>

      {/* ── Transaction section ── */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="caps text-ink-3">Transactions</span>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-md border text-protect hover:bg-protect/10 transition-colors"
            style={{ borderColor: 'rgba(68,136,255,0.3)' }}
            onClick={() => { setEditTransferLegs(undefined); setTransferOpen(true) }}
          >
            Transfer
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded-md border text-accent hover:bg-accent/20 transition-colors"
            style={{ background: 'rgba(0,230,118,0.08)', borderColor: 'rgba(0,230,118,0.3)' }}
            onClick={() => { setEditTx(undefined); setLogOpen(true) }}
          >
            + Log
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="px-4 flex gap-0 mb-0 relative"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {FILTERS.map(({ id, label }) => {
          const active = txFilter === id
          return (
            <button
              key={id}
              onClick={() => setTxFilter(id)}
              className="relative px-3 py-2 text-xs font-medium transition-colors"
              style={{ color: active ? 'var(--accent)' : 'var(--ink-3)' }}
            >
              {label}
              {active && (
                <motion.div
                  layoutId="tx-filter-bar"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tx list */}
      {filteredTx.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-ink-4">
          No {txFilter === 'all' ? '' : txFilter} transactions today
        </div>
      ) : (
        filteredTx.map((t, i) => (
          <TxRow
            key={t.id} tx={t} accounts={accounts} masked={masked} index={i}
            onEdit={t.counter_account_id
              ? handleTransferEdit
              : (tx) => { setEditTx(tx); setLogOpen(true) }
            }
          />
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

      <Sheet
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setEditTransferLegs(undefined); setEditTransferFee(undefined) }}
        title={editTransferLegs ? 'Edit transfer' : 'Transfer'}
      >
        <TransferForm
          accounts={accounts} userId={userId}
          editLegs={editTransferLegs}
          existingFee={editTransferFee}
          onSubmit={handleTransferSubmit}
          onDelete={editTransferLegs ? async () => {
            await deleteTx.mutateAsync(editTransferLegs[0].id)
            await deleteTx.mutateAsync(editTransferLegs[1].id)
            if (editTransferFee) await deleteTx.mutateAsync(editTransferFee.id)
          } : undefined}
          onClose={() => { setTransferOpen(false); setEditTransferLegs(undefined); setEditTransferFee(undefined) }}
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
