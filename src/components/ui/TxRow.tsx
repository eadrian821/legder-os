import { useState } from 'react'
import type { Transaction, Account } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'
import { fmtX } from '@/lib/utils'

interface TxRowProps {
  tx: Transaction
  accounts: Account[]
  masked?: boolean
  onEdit?: (tx: Transaction) => void
}

export function TxRow({ tx, accounts, masked = false, onEdit }: TxRowProps) {
  const [hovered, setHovered] = useState(false)
  const isTransfer = !!tx.counter_account_id
  const account = accounts.find((a) => a.id === tx.account_id)
  const axisColor = tx.axis ? AXIS_COLORS[tx.axis] : 'var(--ink-3)'
  const amtColor  = tx.direction === 'in' ? 'var(--invest)' : undefined

  const time = new Date(tx.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 transition-colors duration-100 hover:bg-bg-2 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit?.(tx)}
    >
      {/* Axis dot */}
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isTransfer ? 'var(--line-2)' : axisColor }} />

      {/* Description */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink truncate">{tx.description || (isTransfer ? 'Transfer' : '—')}</div>
        <div className="text-[10px] text-ink-3 flex gap-1.5 mt-0.5">
          <span>{time}</span>
          {tx.axis && !isTransfer && <span style={{ color: axisColor }}>{tx.axis}</span>}
          {isTransfer && <span className="text-ink-4">TRANSFER</span>}
          {account && <span className="text-ink-4">{account.name}</span>}
        </div>
      </div>

      {/* Amount */}
      <div
        className="font-mono text-sm font-medium flex-shrink-0 flex items-center gap-2"
        style={{ color: masked ? 'var(--ink-4)' : amtColor }}
      >
        {masked ? '••••' : (
          <>
            <span>{tx.direction === 'in' ? '+' : '-'}{fmtX(tx.amount)}</span>
          </>
        )}
        {hovered && onEdit && (
          <span className="text-ink-3 text-xs opacity-60">✎</span>
        )}
      </div>
    </div>
  )
}
