import { useState } from 'react'
import type { Account } from '@/types/ledger'
import type { AccountKind } from '@/constants/accounts'
import { ACCOUNT_KIND_LABELS } from '@/constants/accounts'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface AccountFormProps {
  userId: string
  editAccount?: Account
  onSubmit: (a: Account) => Promise<void>
  onClose: () => void
}

export function AccountForm({ userId, editAccount, onSubmit, onClose }: AccountFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState(editAccount?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(editAccount?.kind ?? 'operating')
  const [opening, setOpening] = useState(editAccount ? String(editAccount.opening_balance) : '0')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { toast('Name required'); return }
    setLoading(true)
    try {
      await onSubmit({
        id: editAccount?.id ?? uid(),
        user_id: userId,
        name: name.trim(),
        kind,
        opening_balance: parseFloat(opening) || 0,
        currency: 'KES',
        created_at: editAccount?.created_at ?? new Date().toISOString(),
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
        placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} required />
      <select className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm text-ink"
        value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
        {(Object.entries(ACCOUNT_KIND_LABELS) as [AccountKind, string][]).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <div>
        <div className="caps text-ink-3 mb-1">Opening balance (KES)</div>
        <input className="w-full bg-bg-2 border border-line rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none"
          type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-accent text-bg text-sm font-bold disabled:opacity-50">
        {loading ? 'Saving…' : editAccount ? 'Update' : 'Add Account'}
      </button>
    </form>
  )
}
