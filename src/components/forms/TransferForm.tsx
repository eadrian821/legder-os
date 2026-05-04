import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Account, Transaction } from '@/types/ledger'
import { uid, iso, todayLocal } from '@/lib/utils'
import { getFee, type TransferRoute } from '@/lib/fees'
import { useToast } from '@/components/ui/Toast'

interface TransferFormProps {
  accounts: Account[]
  userId: string
  onSubmit: (legs: [Omit<Transaction, 'created_at'>, Omit<Transaction, 'created_at'>], fee?: Omit<Transaction, 'created_at'>) => Promise<void>
  onClose: () => void
  /** When provided the form operates in edit mode — [outLeg, inLeg] */
  editLegs?: [Transaction, Transaction]
  /** Called when user confirms deletion of both legs */
  onDelete?: () => Promise<void>
}

const ROUTE_OPTIONS: { label: string; value: TransferRoute }[] = [
  { label: 'M-Pesa → M-Pesa',    value: 'mpesa-mpesa'      },
  { label: 'Bank → M-Pesa',      value: 'bank-mpesa'       },
  { label: 'M-Pesa → Bank',      value: 'mpesa-bank'       },
  { label: 'Bank → Bank',        value: 'bank-bank'        },
  { label: 'M-Pesa Paybill',     value: 'mpesa-paybill'    },
  { label: 'M-Pesa Withdrawal',  value: 'mpesa-withdrawal' },
]

export function TransferForm({ accounts, userId, onSubmit, onClose, editLegs, onDelete }: TransferFormProps) {
  const { toast } = useToast()
  const isEdit = !!editLegs

  const [fromId, setFromId] = useState(editLegs?.[0].account_id ?? accounts[0]?.id ?? '')
  const [toId,   setToId]   = useState(editLegs?.[1].account_id ?? accounts[1]?.id ?? '')
  const [amount, setAmount] = useState(editLegs ? String(editLegs[0].amount) : '')
  const [route,  setRoute]  = useState<TransferRoute | ''>('')
  const [date,   setDate]   = useState(
    editLegs ? editLegs[0].occurred_at.slice(0, 10) : iso(todayLocal())
  )
  const [time, setTime] = useState(
    editLegs ? editLegs[0].occurred_at.slice(11, 16) : new Date().toTimeString().slice(0, 5)
  )
  const [loading,       setLoading]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const amt    = parseFloat(amount) || 0
  const feeAmt = route ? getFee(route, amt) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amt || fromId === toId) { toast('Select different accounts and enter amount'); return }
    const occurred_at  = `${date}T${time}:00`
    const fromCurrency = accounts.find((a) => a.id === fromId)?.currency ?? 'KES'
    const toCurrency   = accounts.find((a) => a.id === toId)?.currency   ?? 'KES'

    const outLeg: Omit<Transaction, 'created_at'> = {
      id: editLegs?.[0].id ?? uid(),
      user_id: userId, account_id: fromId, occurred_at,
      description: `Transfer to ${accounts.find((a) => a.id === toId)?.name}`,
      amount: amt, currency: fromCurrency, direction: 'out',
      axis: null, category_id: null, counter_account_id: toId,
    }
    const inLeg: Omit<Transaction, 'created_at'> = {
      id: editLegs?.[1].id ?? uid(),
      user_id: userId, account_id: toId, occurred_at,
      description: `Transfer from ${accounts.find((a) => a.id === fromId)?.name}`,
      amount: amt, currency: toCurrency, direction: 'in',
      axis: null, category_id: null, counter_account_id: fromId,
    }
    let feeTx: Omit<Transaction, 'created_at'> | undefined
    if (feeAmt > 0) {
      feeTx = {
        id: uid(), user_id: userId, account_id: fromId, occurred_at,
        description: `Transfer fee (${route})`,
        amount: feeAmt, currency: fromCurrency, direction: 'out',
        axis: 'LEAK', category_id: null, counter_account_id: null,
      }
    }

    setLoading(true)
    try {
      await onSubmit([outLeg, inLeg], feeTx)
      onClose()
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to save transfer')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to delete transfer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {/* From / To */}
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="caps text-ink-3 mb-1">From</div>
          <select
            className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
            value={fromId} onChange={(e) => setFromId(e.target.value)}
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-2 text-ink-3">→</div>
        <div className="flex-1">
          <div className="caps text-ink-3 mb-1">To</div>
          <select
            className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
            value={toId} onChange={(e) => setToId(e.target.value)}
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
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

      {/* Route / fee */}
      <select
        className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
        value={route} onChange={(e) => setRoute(e.target.value as TransferRoute)}
      >
        <option value="">No transfer fee route</option>
        {ROUTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {feeAmt > 0 && (
        <div className="text-xs text-leak px-1">Fee: KES {feeAmt} will be logged as LEAK</div>
      )}
      {isEdit && !route && (
        <div className="text-[10px] text-ink-4 px-1">
          Select a route only to add a new fee — existing fees are unaffected
        </div>
      )}

      {/* Date / time */}
      <div className="flex gap-2">
        <input type="date"
          className="flex-1 bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
          value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time"
          className="w-28 bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
          value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-protect text-ink text-sm font-bold disabled:opacity-50">
        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Transfer'}
      </button>

      {/* Delete (edit mode only) */}
      {isEdit && onDelete && (
        <div className="pt-1">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 rounded text-xs text-leak border hover:bg-leak/10 transition-colors flex items-center justify-center gap-1.5"
              style={{ borderColor: 'rgba(255,51,85,0.3)' }}
            >
              <Trash2 size={11} />
              Delete transfer
            </button>
          ) : (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'rgba(255,51,85,0.06)', border: '1px solid rgba(255,51,85,0.2)' }}
            >
              <div className="text-xs text-ink-2 text-center">Delete both legs of this transfer?</div>
              <div className="flex gap-2">
                <button
                  type="button" disabled={loading} onClick={handleDelete}
                  className="flex-1 py-1.5 rounded text-xs font-semibold text-ink transition-colors disabled:opacity-50"
                  style={{ background: 'var(--leak)' }}
                >
                  {loading ? '…' : 'Yes, delete'}
                </button>
                <button
                  type="button" onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded text-xs text-ink-3 border hover:text-ink transition-colors"
                  style={{ borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
