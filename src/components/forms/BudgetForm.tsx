import { useState } from 'react'
import type { Budget, Category } from '@/types/ledger'
import type { Axis } from '@/constants/axes'
import { AXES } from '@/constants/axes'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface BudgetFormProps {
  categories: Category[]
  userId: string
  editBudget?: Budget
  onSubmit: (b: Budget) => Promise<void>
  onClose: () => void
}

export function BudgetForm({ categories, userId, editBudget, onSubmit, onClose }: BudgetFormProps) {
  const { toast } = useToast()
  const [axis, setAxis] = useState<Axis | ''>(editBudget?.axis ?? '')
  const [categoryId, setCategoryId] = useState(editBudget?.category_id ?? '')
  const [limit, setLimit] = useState(editBudget ? String(editBudget.limit_amount) : '')
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(editBudget?.period ?? 'monthly')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!limit || (!axis && !categoryId)) { toast('Select axis or category and set a limit'); return }
    setLoading(true)
    try {
      await onSubmit({
        id: editBudget?.id ?? uid(),
        user_id: userId,
        axis: axis || null,
        category_id: categoryId || null,
        limit_amount: parseFloat(limit),
        period,
        created_at: editBudget?.created_at ?? new Date().toISOString(),
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
      <div className="flex gap-2 flex-wrap">
        {AXES.map(({ id, label, color }) => (
          <button key={id} type="button"
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${axis === id ? 'text-bg' : 'text-ink-3 border-line'}`}
            style={axis === id ? { background: color, borderColor: color } : {}}
            onClick={() => { setAxis(id as Axis); setCategoryId('') }}>
            {label}
          </button>
        ))}
      </div>
      <select className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
        value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setAxis('') }}>
        <option value="">By axis (above)</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex items-center gap-2 bg-bg-2 rounded-md px-3 py-2 border border-line">
        <span className="text-ink-3 text-sm">KES limit</span>
        <input className="flex-1 bg-transparent font-mono text-lg font-bold text-ink placeholder:text-ink-4 focus:outline-none"
          type="number" placeholder="0" value={limit} onChange={(e) => setLimit(e.target.value)} required />
      </div>
      <div className="flex rounded-md overflow-hidden border border-line">
        {(['monthly', 'weekly'] as const).map((p) => (
          <button key={p} type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${period === p ? 'bg-bg-3 text-ink' : 'text-ink-3'}`}
            onClick={() => setPeriod(p)}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
        ))}
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-accent text-bg text-sm font-bold disabled:opacity-50">
        {loading ? 'Saving…' : editBudget ? 'Update' : 'Set Budget'}
      </button>
    </form>
  )
}
