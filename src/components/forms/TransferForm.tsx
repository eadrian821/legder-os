import { useState, useEffect, useRef } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import type { Account, Transaction } from '@/types/ledger'
import { uid, iso, todayLocal } from '@/lib/utils'
import { getFee, type TransferRoute } from '@/lib/fees'
import { recordFee, suggestFee, countLearned } from '@/lib/feeHistory'
import { useToast } from '@/components/ui/Toast'

interface TransferFormProps {
  accounts: Account[]
  userId: string
  onSubmit: (
    legs: [Omit<Transaction, 'created_at'>, Omit<Transaction, 'created_at'>],
    fee?: Omit<Transaction, 'created_at'>
  ) => Promise<void>
  onClose: () => void
  /** [outLeg, inLeg] when editing an existing transfer */
  editLegs?: [Transaction, Transaction]
  /** Fee transaction belonging to editLegs, if one was logged */
  existingFee?: Transaction
  /** Delete both legs (and caller should also delete existingFee if present) */
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

export function TransferForm({
  accounts, userId, onSubmit, onClose,
  editLegs, existingFee, onDelete,
}: TransferFormProps) {
  const { toast } = useToast()
  const isEdit = !!editLegs

  // ── Field state ────────────────────────────────────────────────────────────
  const [fromId, setFromId] = useState(editLegs?.[0].account_id ?? accounts[0]?.id ?? '')
  const [toId,   setToId]   = useState(editLegs?.[1].account_id ?? accounts[1]?.id ?? '')
  const [amount, setAmount] = useState(editLegs ? String(editLegs[0].amount) : '')

  // Note: optional memo shown in the transaction description
  const [note, setNote] = useState(() => {
    if (!editLegs) return ''
    const desc = editLegs[0].description ?? ''
    return (desc.startsWith('Transfer to ') || desc.startsWith('Transfer from ')) ? '' : desc
  })

  const [route, setRoute] = useState<TransferRoute | ''>('')
  const [date,  setDate]  = useState(
    editLegs ? editLegs[0].occurred_at.slice(0, 10) : iso(todayLocal())
  )
  const [time,  setTime]  = useState(
    editLegs ? editLegs[0].occurred_at.slice(11, 16) : new Date().toTimeString().slice(0, 5)
  )

  // ── Fee state ──────────────────────────────────────────────────────────────
  // Editable fee override. Starts from existingFee if editing, else '' until route is picked.
  const [feeOverride, setFeeOverride] = useState<string>(
    existingFee ? String(existingFee.amount) : ''
  )
  // Tracks whether the user has manually set the fee so we don't clobber it on route change
  const feeModified = useRef<boolean>(!!existingFee)

  const amt        = parseFloat(amount) || 0
  const tariffFee  = route ? getFee(route as TransferRoute, amt) : 0
  const learnedFee = route && amt > 0 ? suggestFee(route as TransferRoute, amt) : null
  const learned    = route ? countLearned(route as TransferRoute) : 0
  const parsedFee  = parseFloat(feeOverride) || 0

  // Auto-fill fee when route changes (only if user hasn't manually edited it)
  useEffect(() => {
    if (!route || feeModified.current) return
    const tariff  = getFee(route as TransferRoute, amt)
    const learned = amt > 0 ? suggestFee(route as TransferRoute, amt) : null
    const best    = learned !== null ? String(learned) : tariff > 0 ? String(tariff) : ''
    setFeeOverride(best)
  }, [route]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amt || fromId === toId) {
      toast('Select different accounts and enter an amount')
      return
    }

    const occurred_at  = `${date}T${time}:00`
    const fromCurrency = accounts.find((a) => a.id === fromId)?.currency ?? 'KES'
    const toCurrency   = accounts.find((a) => a.id === toId)?.currency   ?? 'KES'
    const toName       = accounts.find((a) => a.id === toId)?.name   ?? toId
    const fromName     = accounts.find((a) => a.id === fromId)?.name ?? fromId

    const outLeg: Omit<Transaction, 'created_at'> = {
      id: editLegs?.[0].id ?? uid(),
      user_id: userId, account_id: fromId, occurred_at,
      description: note.trim() || `Transfer to ${toName}`,
      amount: amt, currency: fromCurrency,
      direction: 'out', axis: null, category_id: null,
      counter_account_id: toId,
    }
    const inLeg: Omit<Transaction, 'created_at'> = {
      id: editLegs?.[1].id ?? uid(),
      user_id: userId, account_id: toId, occurred_at,
      description: note.trim() || `Transfer from ${fromName}`,
      amount: amt, currency: toCurrency,
      direction: 'in', axis: null, category_id: null,
      counter_account_id: fromId,
    }

    let feeTx: Omit<Transaction, 'created_at'> | undefined
    if (route && parsedFee > 0) {
      feeTx = {
        // Reuse the existing fee ID so the upsert updates it instead of creating a duplicate
        id: existingFee?.id ?? uid(),
        user_id: userId, account_id: fromId, occurred_at,
        description: `Transfer fee (${route})`,
        amount: parsedFee, currency: fromCurrency,
        direction: 'out', axis: 'LEAK', category_id: null, counter_account_id: null,
      }
    }

    setLoading(true)
    try {
      await onSubmit([outLeg, inLeg], feeTx)
      // Persist the actual fee to the learning history
      if (route && parsedFee >= 0) {
        recordFee(route as TransferRoute, amt, parsedFee)
      }
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
          type="number" inputMode="decimal" placeholder="0" required
          value={amount} onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Optional memo */}
      <input
        type="text"
        className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-4"
        placeholder="Note / memo (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={120}
      />

      {/* Route picker */}
      <div>
        <div className="caps text-ink-3 mb-1">Route (for fee)</div>
        <select
          className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
          value={route}
          onChange={(e) => {
            feeModified.current = false // route changed — allow auto-fill
            setRoute(e.target.value as TransferRoute)
          }}
        >
          <option value="">No fee</option>
          {ROUTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Fee input — shown when route is selected, or when editing has an existing fee */}
      {(route || existingFee) && (
        <div>
          <div className="caps text-ink-3 mb-1">Fee amount</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-bg-2 rounded-md px-3 py-2 border border-line flex-1"
              style={feeModified.current && feeOverride !== String(tariffFee)
                ? { borderColor: 'rgba(255,170,0,0.4)' }
                : undefined}
            >
              <span className="text-ink-4 text-sm font-mono">KES</span>
              <input
                type="number" inputMode="decimal" min="0" placeholder="0"
                className="flex-1 bg-transparent font-mono text-sm font-semibold text-ink placeholder:text-ink-4 focus:outline-none"
                value={feeOverride}
                onChange={(e) => {
                  setFeeOverride(e.target.value)
                  feeModified.current = true
                }}
              />
            </div>
            {/* Reset-to-tariff button — shown when user has overridden */}
            {route && tariffFee > 0 && feeOverride !== String(tariffFee) && (
              <button
                type="button"
                onClick={() => {
                  setFeeOverride(String(tariffFee))
                  feeModified.current = true
                }}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md border text-ink-3 hover:text-ink transition-colors whitespace-nowrap flex-shrink-0"
                style={{ borderColor: 'var(--line)' }}
                title="Use Safaricom tariff rate"
              >
                <RotateCcw size={9} />
                {tariffFee}
              </button>
            )}
          </div>

          {/* Learning / tariff context line */}
          <div className="mt-1 text-[10px] text-ink-4 px-0.5 flex items-center gap-1.5">
            {route && learnedFee !== null ? (
              learnedFee !== tariffFee ? (
                <>
                  <span style={{ color: 'var(--sustain)' }}>↺ Learned</span>
                  <span>·</span>
                  <span>{learned} transfer{learned !== 1 ? 's' : ''} recorded</span>
                  <span>·</span>
                  <span>Tariff: KES {tariffFee}</span>
                </>
              ) : (
                <>
                  <span>Matches tariff</span>
                  <span>·</span>
                  <span>{learned} transfer{learned !== 1 ? 's' : ''} recorded</span>
                </>
              )
            ) : route && tariffFee > 0 ? (
              <span>Safaricom tariff · no history yet for this route</span>
            ) : null}

            {/* Existing fee hint in edit mode */}
            {isEdit && existingFee && !route && (
              <span>Original fee: KES {existingFee.amount} — select a route above to update it</span>
            )}
          </div>
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
              <div className="text-xs text-ink-2 text-center">
                Delete both legs{existingFee ? ' and fee' : ''}?
              </div>
              <div className="flex gap-2">
                <button
                  type="button" disabled={loading} onClick={handleDelete}
                  className="flex-1 py-1.5 rounded text-xs font-semibold text-ink disabled:opacity-50"
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
