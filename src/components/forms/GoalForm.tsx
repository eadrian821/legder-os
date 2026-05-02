import { useState } from 'react'
import type { Goal } from '@/types/ledger'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface GoalFormProps {
  userId: string
  editGoal?: Goal
  onSubmit: (g: Goal) => Promise<void>
  onClose: () => void
}

export function GoalForm({ userId, editGoal, onSubmit, onClose }: GoalFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState(editGoal?.name ?? '')
  const [target, setTarget] = useState(editGoal ? String(editGoal.target_amount) : '')
  const [current, setCurrent] = useState(editGoal ? String(editGoal.current_amount) : '0')
  const [deadline, setDeadline] = useState(editGoal?.deadline ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !target) { toast('Name and target required'); return }
    setLoading(true)
    try {
      await onSubmit({
        id: editGoal?.id ?? uid(),
        user_id: userId,
        name: name.trim(),
        target_amount: parseFloat(target),
        current_amount: parseFloat(current) || 0,
        deadline: deadline || null,
        priority: editGoal?.priority ?? 0,
        is_complete: false,
        created_at: editGoal?.created_at ?? new Date().toISOString(),
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
      <input className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
        placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="caps text-ink-3 mb-1">Target KES</div>
          <input className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none"
            type="number" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} required />
        </div>
        <div className="flex-1">
          <div className="caps text-ink-3 mb-1">Current KES</div>
          <input className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none"
            type="number" placeholder="0" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
      </div>
      <div>
        <div className="caps text-ink-3 mb-1">Deadline (optional)</div>
        <input type="date" className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none"
          value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-accent text-bg text-sm font-bold disabled:opacity-50">
        {loading ? 'Saving…' : editGoal ? 'Update' : 'Add Goal'}
      </button>
    </form>
  )
}
