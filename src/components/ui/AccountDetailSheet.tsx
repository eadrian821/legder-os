import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { Sheet } from './Sheet'
import { TxRow } from './TxRow'
import { NumberTicker } from './NumberTicker'
import type { Account, Transaction } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'
import { ACCOUNT_KIND_LABELS } from '@/constants/accounts'
import { fmtX, fmt } from '@/lib/utils'

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

  // 2. Outlier amounts (>3× median of real outflows)
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

  // 3. Potential duplicates — same amount, same day, same direction
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

function FlowKpi({ label, value, color, icon, masked }: { label: string; value: number; color: string; icon: React.ReactNode; masked: boolean }) {
  return (
    <div className="flex-1 rounded-lg p-3" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] caps text-ink-4">{label}</span>
      </div>
      <div className="font-mono text-sm font-bold" style={{ color }}>
        {masked ? '••••' : fmt(value)}
      </div>
    </div>
  )
}

function AnomalyRow({ flag }: { flag: AnomalyFlag }) {
  const colors: Record<AnomalyFlag['kind'], string> = {
    'no-axis':  'var(--sustain)',
    large:      'var(--leak)',
    duplicate:  '#ffaa00',
  }
  const c = colors[flag.kind]
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 py-1.5"
    >
      <AlertTriangle size={11} style={{ color: c, flexShrink: 0, marginTop: 1 }} />
      <span className="text-[11px] text-ink-3 leading-tight">{flag.label}</span>
    </motion.div>
  )
}

// Custom chart tooltip
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
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
  onEditTx, onEditAccount,
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>('1m')
  const [showAnomalies, setShowAnomalies] = useState(true)

  // All transactions for this account across all history
  const accountTx = useMemo(
    () => allTx.filter((t) => t.account_id === account?.id),
    [allTx, account?.id]
  )

  // Filter to selected period
  const cutoff = useMemo(() => periodCutoff(period), [period])
  const periodTx = useMemo(
    () => cutoff ? accountTx.filter((t) => new Date(t.occurred_at) >= cutoff) : accountTx,
    [accountTx, cutoff]
  )

  // KPI values for period
  const totalIn  = useMemo(() => periodTx.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0), [periodTx])
  const totalOut = useMemo(() => periodTx.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0), [periodTx])
  const realIn   = useMemo(() => periodTx.filter((t) => t.direction === 'in' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [periodTx])
  const realOut  = useMemo(() => periodTx.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0), [periodTx])
  const net      = totalIn - totalOut

  // Axis breakdown for outflows (real only)
  const axisTotals = useMemo(() => {
    const base = { INVEST: 0, PROTECT: 0, SUSTAIN: 0, LEAK: 0 }
    for (const t of periodTx) {
      if (t.direction === 'out' && !t.counter_account_id && t.axis) {
        base[t.axis] = (base[t.axis] ?? 0) + t.amount
      }
    }
    return base
  }, [periodTx])
  const axisMax = Math.max(...Object.values(axisTotals), 1)

  // Running balance chart — compute from opening balance + all account tx chronologically
  const chartData = useMemo(() => {
    if (!account) return []
    const sorted = [...accountTx].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    let bal = account.opening_balance
    const pts: { date: string; balance: number; dateLabel: string }[] = []

    // If period filter, compute pre-period balance first
    if (cutoff) {
      for (const t of sorted.filter((t) => new Date(t.occurred_at) < cutoff)) {
        bal += t.direction === 'in' ? t.amount : -t.amount
      }
    }

    // Now walk through period tx
    const inPeriod = cutoff ? sorted.filter((t) => new Date(t.occurred_at) >= cutoff) : sorted
    for (const t of inPeriod) {
      bal += t.direction === 'in' ? t.amount : -t.amount
      pts.push({
        date: t.occurred_at,
        balance: Math.round(bal),
        dateLabel: new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }
    return pts
  }, [account, accountTx, cutoff])

  // Current balance (from full history)
  const currentBalance = useMemo(() => {
    if (!account) return 0
    const net = accountTx.reduce((s, t) => s + (t.direction === 'in' ? t.amount : -t.amount), 0)
    return account.opening_balance + net
  }, [account, accountTx])

  // Anomalies
  const anomalies = useMemo(() => detectAnomalies(periodTx), [periodTx])
  const anomalyTxIds = useMemo(() => new Set(anomalies.map((a) => a.txId)), [anomalies])

  // Grouped ledger — sorted descending by date
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
    : (net >= 0 ? color : 'var(--leak)')

  if (!account) return null

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pb-8">

        {/* ── Account header ─────────────────────────────────────── */}
        <div
          className="mx-4 mt-2 mb-4 rounded-xl p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${color}14 0%, ${color}06 100%)`,
            border: `1px solid ${color}30`,
          }}
        >
          {/* Glow orb */}
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: `${color}12`, filter: 'blur(28px)' }}
          />

          <div className="relative flex items-start justify-between mb-3">
            <div>
              <div className="text-base font-semibold text-ink">{account.name}</div>
              <span
                className="text-[9px] caps font-mono px-2 py-0.5 rounded mt-1 inline-block"
                style={{ background: `${color}20`, color }}
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
            <div className="caps text-ink-4 text-[9px] mb-0.5">Balance</div>
            <NumberTicker
              value={currentBalance}
              size="hero"
              prefix="KES"
              masked={masked}
              color={balColor}
              format="full"
            />
          </div>
        </div>

        {/* ── Period selector ──────────────────────────────────────── */}
        <div className="px-4 flex gap-1 mb-4">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
            <button
              key={k}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${period === k ? 'bg-bg-3 text-ink' : 'text-ink-3 hover:text-ink-2'}`}
              onClick={() => setPeriod(k)}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>

        {/* ── Flow KPIs ────────────────────────────────────────────── */}
        <div className="px-4 mb-4 flex gap-2">
          <FlowKpi label="Inflows"  value={totalIn}  color="var(--invest)" icon={<ArrowDownLeft size={11} />} masked={masked} />
          <FlowKpi label="Outflows" value={totalOut} color="var(--leak)"   icon={<ArrowUpRight  size={11} />} masked={masked} />
          <FlowKpi
            label="Net"
            value={Math.abs(net)}
            color={net >= 0 ? 'var(--invest)' : 'var(--leak)'}
            icon={net >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            masked={masked}
          />
        </div>

        {/* ── Real money (excl. transfers) ─────────────────────────── */}
        {(realIn > 0 || realOut > 0) && (
          <div className="px-4 mb-4 flex gap-2 text-[10px] text-ink-4 font-mono">
            <span>Real in: <span className="text-invest">{masked ? '••••' : fmtX(realIn)}</span></span>
            <span className="text-ink-4">·</span>
            <span>Real out: <span className="text-leak">{masked ? '••••' : fmtX(realOut)}</span></span>
            <span className="text-ink-4">·</span>
            <span>{periodTx.length} txns</span>
          </div>
        )}

        {/* ── Running balance chart ────────────────────────────────── */}
        {chartData.length >= 2 && (
          <div className="px-4 mb-4">
            <div className="caps text-ink-3 mb-2 text-[9px]">Balance over time</div>
            <div style={{ height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`acct-grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dateLabel" hide tick={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <ReferenceLine y={0} stroke="var(--line)" strokeDasharray="3 3" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#acct-grad-${account.id})`}
                    dot={false}
                    activeDot={{ r: 3, fill: color, stroke: 'var(--bg-1)', strokeWidth: 2 }}
                    animationDuration={500}
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
            <div className="space-y-1.5">
              {(Object.entries(axisTotals) as [keyof typeof axisTotals, number][])
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([axis, amount]) => (
                  <div key={axis} className="flex items-center gap-2">
                    <span className="text-[9px] caps w-14 text-ink-4">{axis}</span>
                    <div className="flex-1 h-1.5 bg-bg-3 rounded-sm overflow-hidden">
                      <motion.div
                        className="h-full rounded-sm"
                        style={{ background: AXIS_COLORS[axis] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(amount / axisMax) * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
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
              className="flex items-center gap-1.5 caps text-[9px] mb-2 w-full text-left"
              onClick={() => setShowAnomalies((p) => !p)}
            >
              <AlertTriangle size={10} style={{ color: 'var(--leak)' }} />
              <span style={{ color: 'var(--leak)' }}>{anomalies.length} flag{anomalies.length !== 1 ? 's' : ''}</span>
              <span className="text-ink-4 ml-auto">{showAnomalies ? '▴' : '▾'}</span>
            </button>
            <AnimatePresence>
              {showAnomalies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg overflow-hidden"
                  style={{ background: 'rgba(255,51,85,0.05)', border: '1px solid rgba(255,51,85,0.15)' }}
                >
                  <div className="px-3 py-2 divide-y divide-[rgba(255,51,85,0.1)]">
                    {anomalies.map((f, i) => <AnomalyRow key={i} flag={f} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Transaction ledger ───────────────────────────────────── */}
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
                transition={{ delay: gi * 0.04, duration: 0.2 }}
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

                {/* Transactions — anomalous rows get a left-border highlight */}
                {txs.map((t) => (
                  <div
                    key={t.id}
                    className="relative"
                    style={anomalyTxIds.has(t.id) ? {
                      borderLeft: '2px solid var(--leak)',
                      background: 'rgba(255,51,85,0.03)',
                    } : undefined}
                  >
                    {anomalyTxIds.has(t.id) && (
                      <div className="absolute left-0 top-0 bottom-0 flex items-center pl-0.5">
                        <div
                          className="w-0.5 h-4/5 rounded-full"
                          style={{ background: 'var(--leak)', opacity: 0.6 }}
                        />
                      </div>
                    )}
                    <TxRow
                      tx={t}
                      accounts={allAccounts}
                      masked={masked}
                      onEdit={t.counter_account_id ? undefined : (tx) => onEditTx(tx)}
                    />
                  </div>
                ))}
              </motion.div>
            )
          })
        )}
      </div>
    </Sheet>
  )
}
