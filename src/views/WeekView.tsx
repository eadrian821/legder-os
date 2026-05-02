import { useMemo, useState } from 'react'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useUIStore } from '@/store'
import { AxisBar } from '@/components/ui/AxisBar'
import { NumberTicker } from '@/components/ui/NumberTicker'
import { TxRow } from '@/components/ui/TxRow'
import { weekStart, addDays, dayLabel, iso } from '@/lib/utils'

interface WeekViewProps { userId: string }

export function WeekView({ userId }: WeekViewProps) {
  const { masked, weekOffset, setWeekOffset } = useUIStore()
  const { data: accounts = [] } = useAccounts(userId)
  const { yearTx, allTx } = useTransactions(userId)
  const metrics = useComputedMetrics(userId)

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
    return { date: d, label: dayLabel(d), spend, txs, isToday: iso(d) === iso(new Date()) }
  }), [weekTx, ws])

  const maxSpend = Math.max(...weekDays.map((d) => d.spend), 1)
  const totalSpend = weekTx.filter((t) => t.direction === 'out' && !t.counter_account_id).reduce((s, t) => s + t.amount, 0)

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const displayTx = selectedDay != null ? weekDays[selectedDay].txs : weekTx

  const label = weekOffset === 0 ? 'This week' : `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="pb-20">
      {/* Week nav */}
      <div className="px-4 pt-4 flex items-center gap-3 mb-3">
        <button className="text-ink-3 hover:text-ink w-6 text-center" onClick={() => { setWeekOffset(weekOffset - 1); setSelectedDay(null) }}>‹</button>
        <span className="flex-1 text-sm text-ink text-center">{label}</span>
        <button
          className={`w-6 text-center ${weekOffset >= 0 ? 'text-ink-4 cursor-default' : 'text-ink-3 hover:text-ink'}`}
          onClick={() => { if (weekOffset < 0) { setWeekOffset(weekOffset + 1); setSelectedDay(null) } }}
        >›</button>
        {weekOffset !== 0 && (
          <button className="text-[10px] text-ink-3 caps" onClick={() => { setWeekOffset(0); setSelectedDay(null) }}>Now</button>
        )}
      </div>

      {/* Bar chart */}
      <div className="px-4 mb-4">
        <div className="rounded-lg bg-bg-1 border border-line p-4">
          <div className="flex items-end gap-1.5 h-20">
            {weekDays.map((d, i) => (
              <button
                key={i}
                className={`flex-1 flex flex-col items-center gap-1 group`}
                onClick={() => setSelectedDay(selectedDay === i ? null : i)}
              >
                <div className="w-full rounded-sm transition-all" style={{
                  height: `${(d.spend / maxSpend) * 64}px`,
                  minHeight: d.spend > 0 ? '2px' : '0',
                  background: selectedDay === i ? 'var(--accent)' : d.isToday ? 'var(--ink-2)' : 'var(--bg-3)',
                }} />
                <span className={`text-[10px] font-mono ${d.isToday ? 'text-ink' : 'text-ink-4'}`}>{d.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <AxisBar totals={metrics.axisWeek} className="flex-1 mr-4" />
            <NumberTicker value={totalSpend} masked={masked} size="inline" color="var(--ink)" />
          </div>
        </div>
      </div>

      {/* Tx list */}
      {selectedDay != null && (
        <div className="px-4 mb-2 caps text-ink-3">
          {weekDays[selectedDay].date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      )}
      <div className="border-t border-line">
        {displayTx.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-4">No transactions</div>
        ) : (
          displayTx.map((t) => <TxRow key={t.id} tx={t} accounts={accounts} masked={masked} />)
        )}
      </div>
    </div>
  )
}
