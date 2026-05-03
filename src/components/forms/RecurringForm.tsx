import { useState } from 'react'
import type { Account, Category, Recurring } from '@/types/ledger'
import type { Axis } from '@/constants/axes'
import { AXES } from '@/constants/axes'
import { uid, iso, todayLocal } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface RecurringFormProps {
  accounts: Account[]
  categories: Category[]
  userId: string
  editRecurring?: Recurring
  onSubmit: (r: Recurring) => Promise<void>
  onClose: () => void
}

export function RecurringForm({ accounts, categories: _categories, userId, editRecurring, onSubmit, onClose }: RecurringFormProps) {
  const { toast } = useToast()
  const [description, setDescription] = useState(editRecurring?.description ?? '')
  const [amount, setAmount] = useState(editRecurring ? String(editRecurring.amount) : '')
  const [direction, setDirection] = useState<'in' | 'out'>(editRecurring?.direction ?? 'out')
  const [axis, setAxis] = useState<Axis | ''>(editRecurring?.axis ?? '')
  const [accountId, setAccountId] = useState(editRecurring?.account_id ?? accounts[0]?.id ?? '')
  const [categoryId] = useState(editRecurring?.category_id ?? '')
  const [frequency, setFrequency] = useState<Recurring['frequency']>(editRecurring?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(editRecurring?.next_date ?? iso(todayLocal()))
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !accountId) { toast('Fill required fields'); return }
    setLoading(true)
    try {
      await onSubmit({
        id: editRecurring?.id ?? uid(),
        user_id: userId,
        account_id: accountId,
        description: description.trim(),
        amount: parseFloat(amount),
        direction,
        axis: axis || null,
        category_id: categoryId || null,
        frequency,
        next_date: nextDate,
        is_active: true,
        created_at: editRecurring?.created_at ?? new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to save recurring')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <input className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
        placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <div className="flex items-center gap-2 bg-bg-2 rounded-md px-3 py-2 border border-line">
        <span className="text-ink-3 text-sm">KES</span>
        <input className="flex-1 bg-transparent font-mono text-lg font-bold text-ink placeholder:text-ink-4 focus:outline-none"
          type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="flex rounded-md overflow-hidden border border-line">
        {(['out', 'in'] as const).map((d) => (
          <button key={d} type="button"
            className={`flex-1 py-2 text-sm font-medium ${direction === d ? (d === 'in' ? 'bg-invest text-bg' : 'bg-leak text-ink') : 'text-ink-3'}`}
            onClick={() => setDirection(d)}>{d === 'out' ? 'Expense' : 'Income'}</button>
        ))}
      </div>
      {direction === 'out' && (
        <div className="flex gap-2 flex-wrap">
          {AXES.map(({ id, label, color }) => (
            <button key={id} type="button"
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${axis === id ? 'text-bg' : 'text-ink-3 border-line'}`}
              style={axis === id ? { background: color, borderColor: color } : {}}
              onClick={() => setAxis(id as Axis)}>{label}</button>
          ))}
        </div>
      )}
      <select className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
        value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
        value={frequency} onChange={(e) => setFrequency(e.target.value as Recurring['frequency'])}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
      <div>
        <div className="caps text-ink-3 mb-1">Next due</div>
        <input type="date" className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
          value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-accent text-bg text-sm font-bold disabled:opacity-50">
        {loading ? 'Saving…' : editRecurring ? 'Update' : 'Add Recurring'}
      </button>
    </form>
  )
}
