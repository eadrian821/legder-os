import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Pencil, TrendingUp, TrendingDown,
  Zap, Check, X, Trash2, Edit3, SlidersHorizontal,
} from 'lucide-react'
import { Sheet } from './Sheet'
import { TxRow } from './TxRow'
import { NumberTicker } from './NumberTicker'
import type { Account, Transaction } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'
import { ACCOUNT_KIND_LABELS } from '@/constants/accounts'
import { fmtX, fmt, uid } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodKey = '1m' | '3m' | '6m' | 'all'

interface AnomalyFlag {
  txId: string
  kind: 'no-axis' | 'large' | 'duplicate'
  label: string
}

interface Props {
  open: boolean
  onClose: () => void
  account: Account | undefined
  allTx: Transaction[]
  allAccounts: Account[]
  masked: boolean
  color: string
  onEditTx: (tx: Transaction) => void
  onDeleteTx?: (id: string) => Promise<void>
  onInsertTx?: (tx: Omit<Transaction, 'created_at'>) => Promise<void>
  onEditAccount: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<PeriodKey, string> = { '1m': '1M', '3m': '3M', '6m': '6M', all: 'All' }

function periodCutoff(key: PeriodKey): Date | null {
  if (key === 'all') return null
  const months = key === '1m' ? 1 : key === '3m' ? 3 : 6
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

function detectAnomalies(txs: Transaction[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = []
  const outflows = txs.filter((t) => t.direction === 'out' && !t.counter_account_id)

  // 1. Missing axis
  for (const t of outflows) {
    if (!t.axis) {
      flags.push({ txId: t.id, kind: 'no-axis', label: `"${t.description || 'Unnamed'}" has no axis` })
    }
  }

  // 2. Outlier amounts (>4× median of classified outflows)
  const amounts = outflows.filter((t) => t.axis).map((t) => t.amount).sort((a, b) => a - b)
  if (amounts.length >= 3) {
    const median = amounts[Math.floor(amounts.length / 2)]
    const threshold = median * 4
    for (const t of outflows) {
      if (t.amount > threshold && t.amount > 5_000) {
        flags.push({ txId: t.id, kind: 'large', label: `"${t.description || 'Unnamed'}" is unusually large (${fmtX(t.amount)})` })
      }
    }
  }

  // 3. Potential duplicates — same amount, direction, and day
  const seen = new Map<string, string>()
  for (const t of txs) {
    const key = `${t.occurred_at.slice(0, 10)}|${t.direction}|${t.amount}`
    if (seen.has(key)) {
      flags.push({ txId: t.id, kind: 'duplicate', label: `Possible duplicate: ${fmtX(t.amount)} on ${t.occurred_at.slice(0, 10)}` })
    } else {
      seen.set(key, t.id)
    }
  }

  return flags
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FlowKpi({
  label, value, color, icon, masked,
}: { label: string; value: number; color: string; icon: React.ReactNode; masked: boolean }) {
  return (
    <div className="flex-1 rounded-lg p-3" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="caps text-[9px] text-ink-4">{label}</span>
      </div>
      <div className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
        {masked ? '••••' : fmt(value)}
      </div>
    </div>
  )
}

function AnomalyRow({
  flag, tx, onEdit, onDelete,
}: {
  flag: AnomalyFlag
  tx?: Transaction
  onEdit?: (tx: Transaction) => void
  onDelete?: (id: string) => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const c = flag.kind === 'no-axis' ? 'var(--sustain)' : flag.kind === 'large' ? 'var(--leak)' : '#ffaa00'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="py-2"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={11} style={{ color: c, flexShrink: 0, marginTop: 2 }} />
        <span className="text-[11px] text-ink-3 leading-tight flex-1">{flag.label}</span>
      </div>
      {tx && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-4">
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors hover:text-ink"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
            >
              <Edit3 size={9} />
              {flag.kind === 'no-axis' ? 'Fix axis' : 'Edit'}
            </button>
          )}
          {onDelete && flag.kind === 'duplicate' && (
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true)
                await onDelete(tx.id).catch(() => null)
                setDeleting(false)
              }}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors"
              style={{ borderColor: 'rgba(255,51,85,0.3)', color: 'var(--leak)' }}
            >
              <Trash2 size={9} />
              {deleting ? '…' : 'Delete dupe'}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--line)',
      borderRadius: 6, padding: '6px 10px', fontSize: 11,
      fontFamily: '"JetBrains Mono", monospace', color: 'var(--ink)',
    }}>
      KES {fmtX(payload[0].value)}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function AccountDetailSheet({
  open, onClose, account, allTx, allAccounts, masked, color,
  onEditTx, onDeleteTx, onInsertTx, onEditAccount,
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>('1m')
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [reconcileTarget, setReconcileTarget] = useState('')
  const [reconciling, setReconciling] = useState(false)

  const accountId = account?.id

  // All transactions for this account
  const accountTx = useMemo(
    () => allTx.filter((t) => t.account_id === accountId),
    [allTx, accountId]
  )

  // Filter to selected period
  const cutoff = useMemo(() => periodCutoff(period), [period])
  const periodTx = useMemo(() => {
    if (!cutoff) return accountTx
    return accountTx.filter((t) => new Date(t.occurred_at) >= cutoff)
  }, [accountTx, cutoff])

  // Flow KPIs
  const totalIn  = useMemo(() => periodTx.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0), [periodTx])
  const totalOut = useMemo(() => periodTx.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0), [periodTx])
  const realIn   = useMemo(() => periodTx.filter((t) => t.direction === 'in' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [periodTx])
  const realOut  = useMemo(() => periodTx.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [periodTx])
  const net = totalIn - totalOut

  // Axis breakdown (real outflows only)
  const axisTotals = useMemo(() => {
    const base: Record<string, number> = { INVEST: 0, PROTECT: 0, SUSTAIN: 0, LEAK: 0 }
    for (const t of periodTx) {
      if (t.direction === 'out' && !t.counter_account_id && t.axis) {
        base[t.axis] = (base[t.axis] ?? 0) + t.amount
      }
    }
    return base
  }, [periodTx])
  const axisMax = Math.max(...Object.values(axisTotals), 1)

  // Running balance chart
  const chartData = useMemo(() => {
    if (!account) return []
    const sorted = [...accountTx].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    let bal = account.opening_balance

    // Run pre-period transactions to establish starting balance
    if (cutoff) {
      for (const t of sorted) {
        if (new Date(t.occurred_at) < cutoff) {
          bal += t.direction === 'in' ? t.amount : -t.amount
        }
      }
    }

    const inPeriod = cutoff ? sorted.filter((t) => new Date(t.occurred_at) >= cutoff) : sorted
    return inPeriod.map((t) => {
      bal += t.direction === 'in' ? t.amount : -t.amount
      return {
        dateLabel: new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: Math.round(bal),
      }
    })
  }, [account, accountTx, cutoff])

  // Current balance from full history
  const currentBalance = useMemo(() => {
    if (!account) return 0
    return account.opening_balance + accountTx.reduce((s, t) => s + (t.direction === 'in' ? t.amount : -t.amount), 0)
  }, [account, accountTx])

  // Anomaly detection
  const anomalies = useMemo(() => detectAnomalies(periodTx), [periodTx])
  const anomalyTxIds = useMemo(() => new Set(anomalies.map((a) => a.txId)), [anomalies])

  // Build a map for quick tx lookup by id
  const txById = useMemo(() => new Map(periodTx.map((t) => [t.id, t])), [periodTx])

  // Ledger grouped by date (descending)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    const sorted = [...periodTx].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    for (const t of sorted) {
      const key = t.occurred_at.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries())
  }, [periodTx])

  const isCredit = account?.kind === 'credit'
  const balColor = isCredit
    ? (currentBalance < 0 ? 'var(--leak)' : 'var(--ink-2)')
    : net >= 0 ? color : 'var(--leak)'

  const handleReconcile = async () => {
    if (!onInsertTx || !account) return
    const target = parseFloat(reconcileTarget.replace(/,/g, ''))
    if (isNaN(target)) return
    const diff = Math.round((target - currentBalance) * 100) / 100
    if (Math.abs(diff) < 0.5) { setReconcileOpen(false); return }
    setReconciling(true)
    try {
      const now = new Date()
      await onInsertTx({
        id: uid(),
        user_id: account.user_id,
        account_id: account.id,
        occurred_at: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
        description: 'Balance adjustment',
        amount: Math.abs(diff),
        currency: account.currency,
        direction: diff > 0 ? 'in' : 'out',
        axis: diff < 0 ? 'LEAK' : null,
        category_id: null,
        counter_account_id: null,
      })
      setReconcileOpen(false)
      setReconcileTarget('')
    } finally {
      setReconciling(false)
    }
  }

  // Always render the Sheet — let `open` prop control visibility
  return (
    <Sheet open={open} onClose={onClose}>
      {!account ? (
        <div className="px-4 py-12 text-center text-sm text-ink-4">Loading…</div>
      ) : (
        <div className="pb-10">

          {/* ── Account header ─────────────────────────────────────── */}
          <div
            className="mx-4 mt-2 mb-4 rounded-xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`,
              border: `1px solid ${color}35`,
            }}
          >
            {/* Pulsing glow orb */}
            <motion.div
              className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: `${color}18`, filter: 'blur(32px)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex items-start justify-between mb-3">
              <div>
                <div className="text-base font-semibold text-ink">{account.name}</div>
                <span
                  className="caps text-[9px] font-mono px-2 py-0.5 rounded mt-1 inline-block"
                  style={{ background: `${color}22`, color }}
                >
                  {ACCOUNT_KIND_LABELS[account.kind]}
                </span>
              </div>
              <button
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border text-ink-3 hover:text-ink transition-colors"
                style={{ borderColor: 'var(--line)' }}
                onClick={onEditAccount}
              >
                <Pencil size={11} />
                Edit
              </button>
            </div>

            <div className="relative">
              <div className="caps text-ink-4 text-[9px] mb-1">Current Balance</div>
              <NumberTicker
                value={currentBalance}
                size="hero"
                prefix="KES"
                masked={masked}
                color={balColor}
                format="full"
              />
              {currentBalance < 0 && !isCredit && (
                <div
                  className="mt-1 text-[10px] font-mono px-2 py-0.5 rounded inline-flex items-center gap-1"
                  style={{ background: 'rgba(255,51,85,0.12)', color: 'var(--leak)' }}
                >
                  ⚠ Negative — possible missing credit or entry error
                </div>
              )}
            </div>

            {/* Net flow indicator */}
            {net !== 0 && (
              <div className="relative mt-2 flex items-center gap-1.5">
                {net > 0
                  ? <TrendingUp size={11} style={{ color: 'var(--invest)' }} />
                  : <TrendingDown size={11} style={{ color: 'var(--leak)' }} />}
                <span className="font-mono text-[10px]" style={{ color: net > 0 ? 'var(--invest)' : 'var(--leak)' }}>
                  {masked ? '••••' : `${net > 0 ? '+' : '−'}${fmtX(Math.abs(net))} this period`}
                </span>
              </div>
            )}

            {/* Reconcile trigger */}
            {onInsertTx && (
              <div className="relative mt-3">
                {!reconcileOpen ? (
                  <button
                    onClick={() => { setReconcileOpen(true); setReconcileTarget(String(currentBalance)) }}
                    className="flex items-center gap-1.5 text-[10px] text-ink-4 hover:text-ink-2 transition-colors"
                  >
                    <SlidersHorizontal size={10} />
                    Reconcile balance
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                  >
                    <div className="caps text-[9px] text-ink-4 mb-2">Enter true balance (KES)</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="flex-1 rounded-md px-2.5 py-1.5 text-sm font-mono text-ink focus:outline-none"
                        style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
                        value={reconcileTarget}
                        onChange={(e) => setReconcileTarget(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleReconcile()}
                      />
                      <button
                        onClick={handleReconcile}
                        disabled={reconciling}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                      >
                        {reconciling ? '…' : <Check size={13} />}
                      </button>
                      <button
                        onClick={() => setReconcileOpen(false)}
                        className="px-2 py-1.5 rounded-md text-ink-3 hover:text-ink transition-colors"
                        style={{ border: '1px solid var(--line)' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="mt-1.5 text-[9px] text-ink-4 font-mono">
                      Diff: {(() => {
                        const t = parseFloat(reconcileTarget)
                        if (isNaN(t)) return '—'
                        const d = t - currentBalance
                        return `${d >= 0 ? '+' : ''}${fmtX(Math.abs(d))} ${d >= 0 ? 'credit' : 'debit'} adjustment`
                      })()}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* ── Period selector ──────────────────────────────────────── */}
          <div className="px-4 flex gap-1 mb-4">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <button
                key={k}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === k ? 'bg-bg-3 text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
                onClick={() => setPeriod(k)}
              >
                {PERIOD_LABELS[k]}
              </button>
            ))}
          </div>

          {/* ── Flow KPIs ────────────────────────────────────────────── */}
          <div className="px-4 mb-3 flex gap-2">
            <FlowKpi label="In"  value={totalIn}  color="var(--invest)" icon={<ArrowDownLeft size={11} />} masked={masked} />
            <FlowKpi label="Out" value={totalOut} color="var(--leak)"   icon={<ArrowUpRight  size={11} />} masked={masked} />
            <FlowKpi
              label="Net"
              value={Math.abs(net)}
              color={net >= 0 ? 'var(--invest)' : 'var(--leak)'}
              icon={net >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              masked={masked}
            />
          </div>

          {/* Real money footnote */}
          {(realIn > 0 || realOut > 0) && (
            <div className="px-4 mb-3 flex gap-2 text-[10px] font-mono">
              <span className="text-ink-4">Real: </span>
              <span className="text-invest">{masked ? '••••' : `+${fmtX(realIn)}`}</span>
              <span className="text-ink-4">/</span>
              <span className="text-leak">{masked ? '••••' : `−${fmtX(realOut)}`}</span>
              <span className="text-ink-4 ml-auto">{periodTx.length} txns</span>
            </div>
          )}

          {/* ── Running balance chart ────────────────────────────────── */}
          {chartData.length >= 2 && (
            <div className="px-4 mb-4">
              <div className="caps text-ink-3 mb-2 text-[9px]">Balance over time</div>
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', height: 120 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`acct-fill-${account.id.slice(0, 8)}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="dateLabel" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <ReferenceLine y={0} stroke="var(--line)" strokeDasharray="3 3" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={color}
                      strokeWidth={1.5}
                      fill={`url(#acct-fill-${account.id.slice(0, 8)})`}
                      dot={false}
                      activeDot={{ r: 3, fill: color, stroke: 'var(--bg-1)', strokeWidth: 2 }}
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Axis breakdown ───────────────────────────────────────── */}
          {Object.values(axisTotals).some((v) => v > 0) && (
            <div className="px-4 mb-4">
              <div className="caps text-ink-3 mb-2 text-[9px]">Expenditure breakdown</div>
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                {(Object.entries(axisTotals) as [string, number][])
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([axis, amount]) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="caps text-[9px] w-14 text-ink-4">{axis}</span>
                      <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: AXIS_COLORS[axis as keyof typeof AXIS_COLORS] ?? color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(amount / axisMax) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-2 w-16 text-right">
                        {masked ? '••••' : fmtX(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Anomaly flags ────────────────────────────────────────── */}
          {anomalies.length > 0 && (
            <div className="px-4 mb-4">
              <button
                className="flex items-center gap-1.5 w-full text-left mb-2"
                onClick={() => setShowAnomalies((p) => !p)}
              >
                <Zap size={10} style={{ color: 'var(--leak)' }} />
                <span className="caps text-[9px]" style={{ color: 'var(--leak)' }}>
                  {anomalies.length} flag{anomalies.length !== 1 ? 's' : ''} detected
                </span>
                <span className="text-ink-4 text-[9px] ml-auto">{showAnomalies ? '▴' : '▾'}</span>
              </button>
              <AnimatePresence>
                {showAnomalies && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-lg"
                    style={{ background: 'rgba(255,51,85,0.06)', border: '1px solid rgba(255,51,85,0.18)' }}
                  >
                    <div className="px-3 py-1 divide-y divide-[rgba(255,51,85,0.1)]">
                      {anomalies.map((f, i) => (
                        <AnomalyRow
                          key={i}
                          flag={f}
                          tx={txById.get(f.txId)}
                          onEdit={onEditTx}
                          onDelete={onDeleteTx}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Ledger ───────────────────────────────────────────────── */}
          <div className="px-4 mb-2 caps text-ink-3 text-[9px]">Ledger</div>
          {groupedByDate.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-4">No transactions this period</div>
          ) : (
            groupedByDate.map(([date, txs], gi) => {
              const dayIn  = txs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
              const dayOut = txs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
              const dayNet = dayIn - dayOut
              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.03, duration: 0.18 }}
                  className="mb-1"
                >
                  {/* Date header */}
                  <div className="px-4 py-1.5 flex items-center justify-between border-t border-line">
                    <span className="caps text-[9px] text-ink-4">
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: dayNet >= 0 ? 'var(--invest)' : 'var(--leak)' }}
                    >
                      {masked ? '••••' : (dayNet >= 0 ? `+${fmtX(dayNet)}` : `−${fmtX(Math.abs(dayNet))}`)}
                    </span>
                  </div>

                  {/* Transactions — anomalous rows get a red left accent */}
                  {txs.map((t, i) => (
                    <div
                      key={t.id}
                      style={anomalyTxIds.has(t.id) ? {
                        borderLeft: '2px solid var(--leak)',
                        background: 'rgba(255,51,85,0.03)',
                      } : undefined}
                    >
                      <TxRow
                        tx={t}
                        accounts={allAccounts}
                        masked={masked}
                        index={i}
                        onEdit={t.counter_account_id ? undefined : (tx) => onEditTx(tx)}
                      />
                    </div>
                  ))}
                </motion.div>
              )
            })
          )}

        </div>
      )}
    </Sheet>
  )
}
