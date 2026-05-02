import { useState } from 'react'
import { useAccounts, useUpsertAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useUIStore } from '@/store'
import { Sheet } from '@/components/ui/Sheet'
import { AccountForm } from '@/components/forms/AccountForm'
import { ACCOUNT_KIND_LABELS, isLiquidKind, isInvestmentKind } from '@/constants/accounts'
import { fmtX } from '@/lib/utils'
import { sb } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Account } from '@/types/ledger'

interface AccountsViewProps { userId: string }

export function AccountsView({ userId }: AccountsViewProps) {
  const { masked } = useUIStore()
  const { data: accounts = [], refetch } = useAccounts(userId)
  const metrics = useComputedMetrics(userId)
  const upsert = useUpsertAccount(userId)
  const del = useDeleteAccount(userId)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [editAcc, setEditAcc] = useState<Account | undefined>()

  const refreshSnaps = async () => {
    const { error } = await sb.functions.invoke('daily-snapshot', { body: { user_id: userId } })
    if (error) toast('Snapshot failed: ' + error.message)
    else { toast('Balances refreshed'); await refetch() }
  }

  const grouped = [
    { label: 'Liquid', accounts: accounts.filter((a) => isLiquidKind(a.kind)), total: metrics.liqBal },
    { label: 'Investment', accounts: accounts.filter((a) => isInvestmentKind(a.kind)), total: metrics.investBal },
    { label: 'Other', accounts: accounts.filter((a) => !isLiquidKind(a.kind) && !isInvestmentKind(a.kind)), total: 0 },
  ].filter((g) => g.accounts.length > 0)

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 mb-4">
        <div className="rounded-lg bg-bg-1 border border-line p-4 flex items-center justify-between">
          <div>
            <div className="caps text-ink-3 mb-1">Net worth</div>
            <div className="font-mono text-2xl font-bold text-ink">
              {masked ? '••••••' : `KES ${fmtX(metrics.nw)}`}
            </div>
          </div>
          <button
            className="text-xs px-3 py-1.5 rounded border border-line text-ink-3 hover:text-ink"
            onClick={refreshSnaps}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {grouped.map((g) => (
        <div key={g.label} className="mb-4">
          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="caps text-ink-3">{g.label}</span>
            <span className="font-mono text-xs text-ink-2">
              {masked ? '••••' : `KES ${fmtX(g.total)}`}
            </span>
          </div>
          <div className="border-t border-line">
            {g.accounts.map((a) => (
              <button
                key={a.id}
                className="w-full px-4 py-3 border-b border-line hover:bg-bg-2 text-left flex items-center justify-between"
                onClick={() => { setEditAcc(a); setOpen(true) }}
              >
                <div>
                  <div className="text-sm text-ink">{a.name}</div>
                  <div className="text-[10px] text-ink-3 caps">{ACCOUNT_KIND_LABELS[a.kind]}</div>
                </div>
                <span className="font-mono text-sm text-ink-2">
                  {masked ? '••••' : `KES ${fmtX(a.opening_balance)}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="px-4">
        <button
          className="w-full py-2.5 rounded-lg border border-line text-sm text-ink-3 hover:text-ink hover:border-line-2"
          onClick={() => { setEditAcc(undefined); setOpen(true) }}
        >
          + Add account
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={editAcc ? 'Edit account' : 'New account'}>
        <AccountForm
          userId={userId} editAccount={editAcc}
          onSubmit={async (a) => { await upsert.mutateAsync(a) }}
          onClose={() => setOpen(false)}
        />
        {editAcc && (
          <div className="px-4 pb-4">
            <button
              className="w-full py-2 rounded text-xs text-leak border border-leak/30 hover:bg-leak/10"
              onClick={async () => { await del.mutateAsync(editAcc.id); setOpen(false) }}
            >
              Delete account
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
