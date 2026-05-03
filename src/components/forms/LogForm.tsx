import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Check } from 'lucide-react'
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

const AXIS_META: Record<Axis, { icon: string; desc: string }> = {
  INVEST:  { icon: '↑', desc: 'Builds wealth' },
  PROTECT: { icon: '◈', desc: 'Manages risk' },
  SUSTAIN: { icon: '≡', desc: 'Necessary cost' },
  LEAK:    { icon: '↓', desc: 'Destroys value' },
}

export function LogForm({ accounts, categories, userId, editTx, onSubmit, onDelete, onClose }: LogFormProps) {
  const { toast } = useToast()
  const [description, setDescription] = useState(editTx?.description ?? '')
  const [amount, setAmount]           = useState(editTx ? String(editTx.amount) : '')
  const [direction, setDirection]     = useState<'in' | 'out'>(editTx?.direction ?? 'out')
  const [axis, setAxis]               = useState<Axis | ''>(editTx?.axis ?? '')
  const [accountId, setAccountId]     = useState(editTx?.account_id ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId]   = useState(editTx?.category_id ?? '')
  const [date, setDate]               = useState(editTx ? iso(new Date(editTx.occurred_at)) : iso(todayLocal()))
  const [time, setTime]               = useState(
    editTx ? new Date(editTx.occurred_at).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5)
  )
  const [loading, setLoading]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filteredCats = categories.filter((c) => !axis || c.axis === axis)
  const isEdit = !!editTx

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
        currency: accounts.find((a) => a.id === accountId)?.currency ?? 'KES',
        direction,
        axis: axis || null,
        category_id: categoryId || null,
        counter_account_id: null,
      })
      onClose()
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editTx || !onDelete) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await onDelete(editTx.id)
      onClose()
    } catch (err) {
      toast((err as Error)?.message ?? 'Delete failed')
    }
  }

  const amtColor = direction === 'in' ? 'var(--invest)' : axis ? `var(--${axis.toLowerCase()})` : 'var(--ink)'

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-3 pb-6 space-y-4">

      {/* Direction toggle */}
      <div
        className="flex rounded-lg overflow-hidden p-0.5 gap-0.5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        {(['out', 'in'] as const).map((d) => {
          const active = direction === d
          const activeStyle = d === 'in'
            ? { background: 'var(--invest)', color: 'var(--bg)' }
            : { background: 'rgba(255,51,85,0.15)', color: 'var(--leak)', border: '1px solid rgba(255,51,85,0.3)' }
          return (
            <button
              key={d} type="button"
              className="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
              style={active ? activeStyle : { color: 'var(--ink-3)' }}
              onClick={() => setDirection(d)}
            >
              {d === 'out' ? 'Expense' : 'Income'}
            </button>
          )
        })}
      </div>

      {/* Amount — hero input */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ background: 'var(--bg-2)', border: `1px solid ${amtColor}33` }}
      >
        <div className="caps text-[9px] mb-1" style={{ color: amtColor }}>Amount (KES)</div>
        <input
          className="w-full bg-transparent font-mono text-3xl font-extrabold placeholder:text-ink-4 focus:outline-none"
          style={{ color: amtColor }}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus={!isEdit}
        />
      </div>

      {/* Description */}
      <input
        className="w-full rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none transition-colors"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Axis grid — expenses only */}
      {direction === 'out' && (
        <div>
          <div className="caps text-[9px] text-ink-4 mb-2">Axis *</div>
          <div className="grid grid-cols-2 gap-2">
            {AXES.map(({ id, label, color }) => {
              const meta = AXIS_META[id]
              const active = axis === id
              return (
                <motion.button
                  key={id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  className="rounded-lg px-3 py-2.5 text-left transition-all"
                  style={{
                    background: active ? `${color}22` : 'var(--bg-2)',
                    border: `1px solid ${active ? color : 'var(--line)'}`,
                  }}
                  onClick={() => { setAxis(id as Axis); setCategoryId('') }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold" style={{ color }}>{meta.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: active ? color : 'var(--ink-2)' }}>{label}</span>
                  </div>
                  <div className="text-[10px] text-ink-4">{meta.desc}</div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Account */}
      <div>
        <div className="caps text-[9px] text-ink-4 mb-1.5">Account</div>
        <div className="flex gap-1.5 flex-wrap">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                accountId === a.id
                  ? { background: 'var(--accent)', color: 'var(--bg)' }
                  : { background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-3)' }
              }
              onClick={() => setAccountId(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category — only if filtered list exists */}
      {filteredCats.length > 0 && (
        <div>
          <div className="caps text-[9px] text-ink-4 mb-1.5">Category</div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                !categoryId
                  ? { background: 'var(--bg-3)', color: 'var(--ink-2)', border: '1px solid var(--line-2)' }
                  : { background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-4)' }
              }
              onClick={() => setCategoryId('')}
            >
              None
            </button>
            {filteredCats.map((c) => (
              <button
                key={c.id}
                type="button"
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={
                  categoryId === c.id
                    ? { background: 'var(--bg-3)', color: 'var(--ink-2)', border: '1px solid var(--line-2)' }
                    : { background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-4)' }
                }
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date + Time */}
      <div className="flex gap-2">
        <input
          type="date"
          className="flex-1 rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          className="w-28 rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {/* Action row */}
      <div className="flex gap-2 pt-1">
        {isEdit && onDelete && (
          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.button
                key="confirm"
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--leak)', color: 'white' }}
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                Confirm delete
              </motion.button>
            ) : (
              <motion.button
                key="delete"
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid rgba(255,51,85,0.3)', color: 'var(--leak)' }}
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {loading ? (
            <span className="font-mono text-xs">Saving…</span>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              {isEdit ? 'Update' : 'Log transaction'}
            </>
          )}
        </button>
      </div>

    </form>
  )
}
