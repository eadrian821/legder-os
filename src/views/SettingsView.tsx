import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { useUIStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'

interface SettingsViewProps { userId: string; email?: string }

type ExportRange = 'month' | '3m' | 'year' | 'all'

export function SettingsView({ userId, email }: SettingsViewProps) {
  const { masked, toggleMasked } = useUIStore()
  const { toast } = useToast()
  const [exportRange, setExportRange] = useState<ExportRange>('month')

  const { allTx } = useTransactions(userId)
  const { data: accounts = [] } = useAccounts(userId)
  const { data: categories = [] } = useCategories(userId)

  const handleSignOut = async () => {
    await signOut()
    location.reload()
  }

  const exportCsv = (range: ExportRange) => {
    const now = new Date()
    let cutoff: Date | null = null

    if (range === 'month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (range === '3m') {
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (range === 'year') {
      cutoff = new Date(now.getFullYear(), 0, 1)
    }

    const filtered = allTx
      .filter((tx) => cutoff === null || new Date(tx.occurred_at) >= cutoff)
      .slice()
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))

    const accountMap = new Map(accounts.map((a) => [a.id, a.name]))
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    const escapeField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const header = 'Date,Time,Description,Type,Axis,Amount,Currency,Account,Category'

    const rows = filtered.map((tx) => {
      const dt = new Date(tx.occurred_at)
      const date = tx.occurred_at.slice(0, 10)
      const time = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`
      const description = escapeField(tx.description)
      const type = tx.counter_account_id
        ? 'Transfer'
        : tx.direction === 'in'
        ? 'Income'
        : 'Expense'
      const axis = tx.axis ?? ''
      const amount = tx.direction === 'out' ? -tx.amount : tx.amount
      const currency = tx.currency
      const account = escapeField(accountMap.get(tx.account_id) ?? tx.account_id)
      const category = escapeField(
        tx.category_id ? (categoryMap.get(tx.category_id) ?? '') : ''
      )
      return [date, time, description, type, axis, amount, currency, account, category].join(',')
    })

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const today = now.toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-${range}-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${filtered.length} transactions`)
  }

  const SectionHeader = ({ label }: { label: string }) => (
    <div className="px-4 pt-5 pb-1.5 caps text-ink-3">{label}</div>
  )

  const Row = ({
    label,
    meta,
    action,
  }: {
    label: string
    meta?: string
    action: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--line)]">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink leading-snug">{label}</div>
        {meta && <div className="text-xs text-ink-3 truncate mt-0.5">{meta}</div>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )

  const rangeLabels: Record<ExportRange, string> = {
    month: 'Month',
    '3m': '3M',
    year: 'Year',
    all: 'All',
  }

  return (
    <div className="pb-24">
      <SectionHeader label="Account" />
      <div className="border-t border-[var(--line)]">
        <Row label="Email" meta={email ?? '—'} action={null} />
        <Row label="User ID" meta={userId.slice(0, 8) + '…'} action={null} />
        <Row
          label="Sign out"
          action={
            <button
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--leak)]/40 text-[var(--leak)] hover:bg-[var(--leak)]/10 transition-colors"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          }
        />
      </div>

      <SectionHeader label="Display" />
      <div className="border-t border-[var(--line)]">
        <Row
          label="Mask values"
          meta="Hide all financial figures"
          action={
            <button
              role="switch"
              aria-checked={masked}
              onClick={toggleMasked}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none ${
                masked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[var(--bg-1)] shadow-sm transition-transform duration-200 ${
                  masked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          }
        />
      </div>

      <SectionHeader label="Data" />
      <div className="border-t border-[var(--line)]">
        <div className="px-4 py-3.5 border-b border-[var(--line)]">
          <div className="text-sm text-ink mb-3">Export transactions</div>
          <div className="flex gap-1.5 mb-3">
            {(['month', '3m', 'year', 'all'] as ExportRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setExportRange(r)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  exportRange === r
                    ? 'bg-[var(--accent)] text-[var(--bg)]'
                    : 'bg-[var(--bg-3)] text-ink-3 hover:text-ink'
                }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCsv(exportRange)}
            className="w-full py-2.5 rounded-md bg-[var(--bg-3)] hover:bg-[var(--line-2)] border border-[var(--line-2)] text-sm text-ink font-medium transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <SectionHeader label="App" />
      <div className="border-t border-[var(--line)]">
        <Row label="Version" meta="Ledger OS" action={
          <span className="font-mono text-xs text-ink-3">v2.0.0</span>
        } />
        <Row label="Build" action={
          <span className="font-mono text-xs text-ink-3">{new Date().getFullYear()}</span>
        } />
      </div>
    </div>
  )
}
