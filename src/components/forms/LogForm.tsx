import { useState } from 'react'
import type { Account, Category, Transaction } from '@/types/ledger'
import type { Axis } from '@/constants/axes'
import { AXES } from '@/constants/axes'
import { uid, iso, todayLocal } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface LogFormProps {
  accounts: Account[]
  categories: Category[]
  userId: string
  editTx?: Transaction
  onSubmit: (tx: Omit<Transaction, 'created_at'>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

export function LogForm({ accounts, categories, userId, editTx, onSubmit, onDelete, onClose }: LogFormProps) {
  const { toast } = useToast()
  const [description, setDescription] = useState(editTx?.description ?? '')
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '')
  const [direction, setDirection] = useState<'in' | 'out'>(editTx?.direction ?? 'out')
  const [axis, setAxis] = useState<Axis | ''>(editTx?.axis ?? '')
  const [accountId, setAccountId] = useState(editTx?.account_id ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(editTx?.category_id ?? '')
  const [date, setDate] = useState(editTx ? iso(new Date(editTx.occurred_at)) : iso(todayLocal()))
  const [time, setTime] = useState(editTx
    ? new Date(editTx.occurred_at).toTimeString().slice(0, 5)
    : new Date().toTimeString().slice(0, 5)
  )
  const [loading, setLoading] = useState(false)

  const filteredCats = categories.filter((c) => !axis || c.axis === axis)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !accountId || (direction === 'out' && !axis)) {
      toast('Fill in all required fields')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        id: editTx?.id ?? uid(),
        user_id: userId,
        account_id: accountId,
        occurred_at: `${date}T${time}:00`,
        description: description.trim(),
        amount: parseFloat(amount),
        direction,
        axis: axis || null,
        category_id: categoryId || null,
        counter_account_id: null,
      })
      onClose()
    } catch (err) {
      toast(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {/* Direction toggle */}
      <div className="flex rounded-md overflow-hidden border border-line">
        {(['out', 'in'] as const).map((d) => (
          <button
            key={d}
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              direction === d ? (d === 'in' ? 'bg-invest text-bg' : 'bg-leak text-ink') : 'text-ink-3 hover:text-ink'
            }`}
            onClick={() => setDirection(d)}
          >
            {d === 'out' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 bg-bg-2 rounded-md px-3 py-2 border border-line">
        <span className="text-ink-3 text-sm">KES</span>
        <input
          className="flex-1 bg-transparent font-mono text-lg font-bold text-ink placeholder:text-ink-4 focus:outline-none"
          type="number" inputMode="decimal" placeholder="0"
          value={amount} onChange={(e) => setAmount(e.target.value)} required
        />
      </div>

      {/* Description */}
      <input
        className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-2"
        placeholder="Description"
        value={description} onChange={(e) => setDescription(e.target.value)}
      />

      {/* Axis (expense only) */}
      {direction === 'out' && (
        <div className="flex gap-2 flex-wrap">
          {AXES.map(({ id, label, color }) => (
            <button
              key={id} type="button"
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                axis === id ? 'text-bg' : 'text-ink-3 border-line hover:border-line-2'
              }`}
              style={axis === id ? { background: color, borderColor: color } : {}}
              onClick={() => setAxis(id as Axis)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Account */}
      <select
        className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none"
        value={accountId} onChange={(e) => setAccountId(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Category */}
      {filteredCats.length > 0 && (
        <select
          className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none"
          value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">No category</option>
          {filteredCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Date + Time */}
      <div className="flex gap-2">
        <input type="date" className="flex-1 bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none"
          value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" className="w-28 bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none"
          value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        {editTx && onDelete && (
          <button
            type="button"
            className="flex-none px-4 py-2.5 rounded-md text-sm text-leak border border-leak/30 hover:bg-leak/10"
            onClick={async () => { await onDelete(editTx.id); onClose() }}
          >
            Delete
          </button>
        )}
        <button
          type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-md bg-accent text-bg text-sm font-bold disabled:opacity-50"
        >
          {loading ? 'Saving…' : editTx ? 'Update' : 'Log'}
        </button>
      </div>
    </form>
  )
}
