import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccounts, useUpsertAccount, useDeleteAccount, accountKeys } from '@/hooks/useAccounts'
import { useTransactions, txKeys, useInsertTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useUIStore } from '@/store'
import { Sheet } from '@/components/ui/Sheet'
import { AccountForm } from '@/components/forms/AccountForm'
import { LogForm } from '@/components/forms/LogForm'
import { AccountDetailSheet } from '@/components/ui/AccountDetailSheet'
import { ACCOUNT_KIND_LABELS, isLiquidKind, isInvestmentKind } from '@/constants/accounts'
import { fmtX } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { Account, Transaction } from '@/types/ledger'
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
  account, balance, masked, index, onClick,
}: { account: Account; balance: number; masked: boolean; index: number; onClick: () => void }) {
  const color    = KIND_COLORS[account.kind] ?? '#ffffff'
  const isCredit = account.kind === 'credit'
  const balColor = isCredit
    ? (balance < 0 ? 'var(--leak)' : 'var(--ink-2)')
    : color

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22 }}
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-lg p-4 flex-shrink-0 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}1a 0%, ${color}08 100%)`,
        border: `1px solid ${color}33`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Glow orb */}
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
        <div className="font-mono text-2xl font-bold" style={{ color: balColor }}>
          {masked ? '••••••' : `KES ${fmtX(balance)}`}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between relative">
        <span className="text-[10px] text-ink-4">{account.currency}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-ink-4">tap to explore →</span>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: `${color}25`, color }}
          >
            {account.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

export function AccountsView({ userId }: AccountsViewProps) {
  const { masked } = useUIStore()
  const { data: accounts = [] } = useAccounts(userId)
  const { allTx } = useTransactions(userId)
  const { data: categories = [] } = useCategories(userId)
  const upsert = useUpsertAccount(userId)
  const del = useDeleteAccount(userId)
  const insertTx = useInsertTransaction(userId)
  const deleteTx = useDeleteTransaction(userId)
  const { toast } = useToast()

  const qc = useQueryClient()

  // Detail sheet state
  const [detailAcc, setDetailAcc] = useState<Account | undefined>()
  const [detailOpen, setDetailOpen] = useState(false)

  // Account form (edit/create) state
  const [formOpen, setFormOpen] = useState(false)
  const [editAcc, setEditAcc] = useState<Account | undefined>()

  // Tx log form state (opened from detail sheet)
  const [logOpen, setLogOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | undefined>()

  // Compute each account's running balance
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of accounts) {
      const net = allTx
        .filter((t) => t.account_id === a.id)
        .reduce((sum, t) => sum + (t.direction === 'in' ? t.amount : -t.amount), 0)
      map[a.id] = a.opening_balance + net
    }
    return map
  }, [accounts, allTx])

  const nw        = useMemo(() => Object.values(accountBalances).reduce((s, v) => s + v, 0), [accountBalances])
  const liqBal    = useMemo(() => accounts.filter((a) => isLiquidKind(a.kind)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0), [accounts, accountBalances])
  const investBal = useMemo(() => accounts.filter((a) => isInvestmentKind(a.kind)).reduce((s, a) => s + (accountBalances[a.id] ?? 0), 0), [accounts, accountBalances])

  const refreshSnaps = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: accountKeys.all(userId) }),
      qc.invalidateQueries({ queryKey: txKeys.year(userId) }),
      qc.invalidateQueries({ queryKey: txKeys.history(userId) }),
    ])
    toast('Balances refreshed')
  }

  const pieData = accounts
    .map((a) => ({
      name:  a.name,
      value: Math.max(accountBalances[a.id] ?? 0, 0),
      color: KIND_COLORS[a.kind] ?? '#ffffff',
    }))
    .filter((d) => d.value > 0)

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  const openDetail = (a: Account) => {
    setDetailAcc(a)
    setDetailOpen(true)
  }

  const openEditAccount = (a?: Account) => {
    setEditAcc(a)
    setFormOpen(true)
  }

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
              {masked ? '••••••' : `KES ${fmtX(nw)}`}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] font-mono">
              <span>
                <span className="text-ink-4">Liquid </span>
                <span className="text-invest">{masked ? '••••' : fmtX(liqBal)}</span>
              </span>
              <span>
                <span className="text-ink-4">Invest </span>
                <span className="text-protect">{masked ? '••••' : fmtX(investBal)}</span>
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

      {/* Portfolio donut */}
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
                        borderRadius: 6, fontSize: 11,
                        fontFamily: '"JetBrains Mono", monospace',
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
                      {masked ? '••••' : `${Math.round((d.value / pieTotal) * 100)}%`}
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
            balance={accountBalances[a.id] ?? a.opening_balance}
            masked={masked}
            index={i}
            onClick={() => openDetail(a)}
          />
        ))}
      </div>

      <div className="px-4 mb-4">
        <button
          className="w-full py-2.5 rounded-lg border text-sm text-ink-3 hover:text-ink hover:border-line-2 transition-colors"
          style={{ borderColor: 'var(--line)' }}
          onClick={() => openEditAccount(undefined)}
        >
          + Add account
        </button>
      </div>

      {/* Account detail sheet */}
      <AccountDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        account={detailAcc}
        allTx={allTx}
        allAccounts={accounts}
        masked={masked}
        color={detailAcc ? (KIND_COLORS[detailAcc.kind] ?? '#ffffff') : '#ffffff'}
        onEditTx={(tx) => { setEditTx(tx); setLogOpen(true) }}
        onEditAccount={() => {
          setEditAcc(detailAcc)
          setDetailOpen(false)
          setFormOpen(true)
        }}
      />

      {/* Account edit/create form */}
      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editAcc ? 'Edit account' : 'New account'}>
        <AccountForm
          userId={userId} editAccount={editAcc}
          onSubmit={async (a) => { await upsert.mutateAsync(a) }}
          onClose={() => setFormOpen(false)}
        />
        {editAcc && (
          <div className="px-4 pb-4">
            <button
              className="w-full py-2 rounded text-xs text-leak border hover:bg-leak/10 transition-colors"
              style={{ borderColor: 'rgba(255,51,85,0.3)' }}
              onClick={async () => { await del.mutateAsync(editAcc.id); setFormOpen(false) }}
            >
              Delete account
            </button>
          </div>
        )}
      </Sheet>

      {/* Tx log form — opened from detail sheet */}
      <Sheet open={logOpen} onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        title={editTx ? 'Edit transaction' : 'Log transaction'}>
        <LogForm
          accounts={accounts} categories={categories} userId={userId} editTx={editTx}
          onSubmit={async (tx) => { await insertTx.mutateAsync(tx) }}
          onDelete={async (id) => { await deleteTx.mutateAsync(id) }}
          onClose={() => { setLogOpen(false); setEditTx(undefined) }}
        />
      </Sheet>
    </div>
  )
}
