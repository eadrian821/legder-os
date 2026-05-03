import { useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw } from 'lucide-react'
import { useAccounts, useUpsertAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { useComputedMetrics } from '@/hooks/useMetrics'
import { useUIStore } from '@/store'
import { Sheet } from '@/components/ui/Sheet'
import { AccountForm } from '@/components/forms/AccountForm'
import { ACCOUNT_KIND_LABELS } from '@/constants/accounts'
import { fmtX } from '@/lib/utils'
import { sb } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Account } from '@/types/ledger'
import type { AccountKind } from '@/constants/accounts'

interface AccountsViewProps { userId: string }

const KIND_COLORS: Record<AccountKind, string> = {
  operating:   '#00e676',
  buffer:      '#4488ff',
  cash:        '#ffaa00',
  compound:    '#a855f7',
  speculation: '#f97316',
  credit:      '#ff3355',
  wallet:      '#22d3ee',
}

function AccountCard({
  account, masked, index, onClick,
}: { account: Account; masked: boolean; index: number; onClick: () => void }) {
  const color  = KIND_COLORS[account.kind] ?? '#ffffff'
  const isCredit = account.kind === 'credit'

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22 }}
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      onClick={onClick}
      className="w-full text-left rounded-lg p-4 flex-shrink-0 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}1a 0%, ${color}08 100%)`,
        border: `1px solid ${color}33`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Subtle glow orb */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `${color}0f`, filter: 'blur(20px)' }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="text-sm font-semibold text-ink">{account.name}</div>
        <span
          className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded caps"
          style={{ background: `${color}22`, color }}
        >
          {ACCOUNT_KIND_LABELS[account.kind]}
        </span>
      </div>

      {/* Balance */}
      <div className="relative mb-3">
        <div className="caps text-ink-4 mb-1">Balance</div>
        <div
          className="font-mono text-2xl font-bold"
          style={{ color: isCredit ? 'var(--leak)' : color }}
        >
          {masked ? '••••••' : `KES ${fmtX(account.opening_balance)}`}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between relative">
        <span className="text-[10px] text-ink-4">{account.currency}</span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
          style={{ background: `${color}25`, color }}
        >
          {account.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </motion.button>
  )
}

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

  // Donut chart data
  const pieData = accounts
    .filter((a) => a.opening_balance > 0)
    .map((a) => ({
      name: a.name,
      value: a.opening_balance,
      color: KIND_COLORS[a.kind] ?? '#ffffff',
    }))

  const totalNw = accounts.reduce((s, a) => s + a.opening_balance, 0)

  return (
    <div className="pb-24 lg:pb-8">
      {/* NW hero */}
      <div className="px-4 pt-4 mb-4">
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
        >
          <div>
            <div className="caps text-ink-4 mb-1">Net worth</div>
            <div className="font-mono text-2xl font-bold text-ink">
              {masked ? '••••••' : `KES ${fmtX(metrics.nw)}`}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] font-mono">
              <span>
                <span className="text-ink-4">Liquid </span>
                <span className="text-invest">{masked ? '••••' : `${fmtX(metrics.liqBal)}`}</span>
              </span>
              <span>
                <span className="text-ink-4">Invest </span>
                <span className="text-protect">{masked ? '••••' : `${fmtX(metrics.investBal)}`}</span>
              </span>
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-line text-ink-3 hover:text-ink transition-colors"
            onClick={refreshSnaps}
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* Donut chart (only when data exists) */}
      {pieData.length > 0 && (
        <div className="px-4 mb-4">
          <div
            className="rounded-lg p-4"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
          >
            <div className="caps text-ink-3 mb-3">Portfolio breakdown</div>
            <div className="flex items-center gap-4">
              <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={600}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-2)', border: '1px solid var(--line)',
                        borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)',
                        color: 'var(--ink)',
                      }}
                      formatter={(v: number) => [`KES ${fmtX(v)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {pieData.slice(0, 6).map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-ink-3 truncate">{d.name}</span>
                    </div>
                    <span className="font-mono text-ink-2">
                      {masked ? '••••' : `${Math.round((d.value / totalNw) * 100)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account cards */}
      <div className="px-4 mb-4 space-y-3">
        {accounts.map((a, i) => (
          <AccountCard
            key={a.id}
            account={a}
            masked={masked}
            index={i}
            onClick={() => { setEditAcc(a); setOpen(true) }}
          />
        ))}
      </div>

      <div className="px-4 mb-4">
        <button
          className="w-full py-2.5 rounded-lg border text-sm text-ink-3 hover:text-ink hover:border-line-2 transition-colors"
          style={{ borderColor: 'var(--line)' }}
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
              className="w-full py-2 rounded text-xs text-leak border hover:bg-leak/10 transition-colors"
              style={{ borderColor: 'rgba(255,51,85,0.3)' }}
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
