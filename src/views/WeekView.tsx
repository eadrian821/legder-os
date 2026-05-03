import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useUIStore } from '@/store'
import { TxRow } from '@/components/ui/TxRow'
import { AxisBar } from '@/components/ui/AxisBar'
import { fmt, weekStart, addDays, dayLabel, iso } from '@/lib/utils'

interface WeekViewProps { userId: string }

const AXIS_FILL: Record<string, { stroke: string; fill: string }> = {
  SUSTAIN: { stroke: '#ffaa00', fill: '#ffaa00' },
  LEAK:    { stroke: '#ff3355', fill: '#ff3355' },
  INVEST:  { stroke: '#00e676', fill: '#00e676' },
  PROTECT: { stroke: '#4488ff', fill: '#4488ff' },
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div
      className="rounded-lg px-3 py-2 text-[11px] font-mono min-w-[130px]"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
    >
      <div className="text-ink-3 mb-2 caps">{label}</div>
      {payload.map((p) => (
        p.value > 0 && (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span>{fmt(p.value)}</span>
          </div>
        )
      ))}
      <div
        className="flex justify-between gap-4 mt-1.5 pt-1.5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-ink-3">Total</span>
        <span className="text-ink">{fmt(total)}</span>
      </div>
    </div>
  )
}

export function WeekView({ userId }: WeekViewProps) {
  const { masked, weekOffset, setWeekOffset } = useUIStore()
  const { data: accounts = [] } = useAccounts(userId)
  const { yearTx, allTx } = useTransactions(userId)
  const metrics = useComputedMetrics(userId)

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const ws = weekStart(weekOffset)
  const we = addDays(ws, 6)

  const weekTx = useMemo(() => {
    const source = weekOffset < 0 ? allTx : yearTx
    return source.filter((t) => {
      const d = new Date(t.occurred_at)
      return d >= ws && d <= addDays(we, 1)
    }).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  }, [yearTx, allTx, ws, we, weekOffset])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i)
    const de = addDays(d, 1)
    const txs = weekTx.filter((t) => { const dt = new Date(t.occurred_at); return dt >= d && dt < de })
    const spend = txs.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0)
    const axisTotals = { INVEST: 0, PROTECT: 0, SUSTAIN: 0, LEAK: 0 }
    txs.filter((t) => t.direction === 'out' && !t.counter_account_id && t.axis).forEach((t) => {
      if (t.axis) axisTotals[t.axis] += t.amount
    })
    return { date: d, label: dayLabel(d), spend, txs, isToday: iso(d) === iso(new Date()), axisTotals }
  }), [weekTx, ws])

  const chartData = weekDays.map((d) => ({
    label: d.label,
    SUSTAIN: d.axisTotals.SUSTAIN,
    LEAK:    d.axisTotals.LEAK,
    INVEST:  d.axisTotals.INVEST,
    PROTECT: d.axisTotals.PROTECT,
    isToday: d.isToday,
  }))

  const totalSpend = weekTx
    .filter((t) => t.direction === 'out' && !t.counter_account_id)
    .reduce((s, t) => s + t.amount, 0)

  const displayTx = selectedDay != null ? weekDays[selectedDay].txs : weekTx
  const weekLabel = weekOffset === 0
    ? 'This week'
    : `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="pb-24 lg:pb-8">
      {/* Week nav */}
      <div className="px-4 pt-4 flex items-center gap-2 mb-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors"
          onClick={() => { setWeekOffset(weekOffset - 1); setSelectedDay(null) }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="flex-1 text-sm text-ink-2 text-center font-medium">{weekLabel}</span>
        <button
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            weekOffset >= 0 ? 'text-ink-4 cursor-default' : 'text-ink-3 hover:text-ink hover:bg-bg-2'
          }`}
          onClick={() => { if (weekOffset < 0) { setWeekOffset(weekOffset + 1); setSelectedDay(null) } }}
        >
          <ChevronRight size={16} />
        </button>
        {weekOffset !== 0 && (
          <button
            className="text-[10px] text-accent caps hover:text-accent/70 transition-colors"
            onClick={() => { setWeekOffset(0); setSelectedDay(null) }}
          >
            Now
          </button>
        )}
      </div>

      {/* Area chart */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="rounded-lg p-4"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="caps text-ink-3">Spend by axis</span>
            <span className="font-mono text-sm font-semibold text-ink-2">
              {masked ? '••••' : `KES ${fmt(totalSpend)}`}
            </span>
          </div>

          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {Object.entries(AXIS_FILL).map(([key, { fill }]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={fill} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={fill} stopOpacity={0.03} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'monospace' }}
                  tickFormatter={(v) => fmt(v)}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} />
                {(['SUSTAIN', 'LEAK', 'PROTECT', 'INVEST'] as const).map((axis) => (
                  <Area
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stackId="1"
                    stroke={AXIS_FILL[axis].stroke}
                    fill={`url(#grad-${axis})`}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationBegin={0}
                    animationDuration={600}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Day selector */}
          <div className="flex gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {weekDays.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded transition-all"
                style={{
                  background: selectedDay === i ? 'rgba(0,230,118,0.1)' : 'transparent',
                  border: selectedDay === i ? '1px solid rgba(0,230,118,0.25)' : '1px solid transparent',
                }}
              >
                <span
                  className="text-[9px] font-mono"
                  style={{ color: d.isToday ? 'var(--accent)' : selectedDay === i ? 'var(--accent)' : 'var(--ink-4)' }}
                >
                  {d.label}
                </span>
                <span
                  className="text-[8px] font-mono tabular-nums"
                  style={{ color: selectedDay === i ? 'var(--accent)' : d.spend > 0 ? 'var(--ink-3)' : 'var(--ink-4)', opacity: d.spend > 0 ? 1 : 0.3 }}
                >
                  {d.spend > 0 ? fmt(d.spend) : '—'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <AxisBar totals={metrics.axisWeek} />
          </div>
        </motion.div>
      </div>

      {/* Tx list header */}
      {selectedDay != null && (
        <div className="px-4 mb-2">
          <span className="caps text-ink-3">
            {weekDays[selectedDay].date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--line)' }}>
        {displayTx.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-4">No transactions</div>
        ) : (
          displayTx.map((t, i) => <TxRow key={t.id} tx={t} accounts={accounts} masked={masked} index={i} />)
        )}
      </div>
    </div>
  )
}
