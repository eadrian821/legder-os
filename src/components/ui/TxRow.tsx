import { useState } from 'react'
import { ArrowLeftRight, Pencil } from 'lucide-react'
import type { Transaction, Account } from '@/types/ledger'
import { AXIS_COLORS } from '@/constants/axes'
import { fmtX } from '@/lib/utils'

interface TxRowProps {
  tx: Transaction
  accounts: Account[]
  masked?: boolean
  onEdit?: (tx: Transaction) => void
}

const AXIS_LETTER: Record<string, string> = {
  INVEST: 'I', PROTECT: 'P', SUSTAIN: 'S', LEAK: 'L',
}

export function TxRow({ tx, accounts, masked = false, onEdit }: TxRowProps) {
  const [hovered, setHovered] = useState(false)
  const isTransfer = !!tx.counter_account_id
  const account = accounts.find((a) => a.id === tx.account_id)
  const axisColor = tx.axis ? AXIS_COLORS[tx.axis] : 'var(--ink-3)'
  const amtColor  = isTransfer ? 'var(--ink-3)' : tx.direction === 'in' ? 'var(--invest)' : axisColor

  const time = new Date(tx.occurred_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 cursor-pointer transition-all duration-100 relative"
      style={{ background: hovered ? 'var(--bg-2)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit?.(tx)}
    >
      {/* Axis circle icon */}
      {isTransfer ? (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--ink-4)' }}
        >
          <ArrowLeftRight size={13} />
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
          style={{
            background: `${axisColor}18`,
            color: axisColor,
            border: `1px solid ${axisColor}30`,
          }}
        >
          {tx.axis ? AXIS_LETTER[tx.axis] : '?'}
        </div>
      )}

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink truncate leading-tight">
          {tx.description || (isTransfer ? 'Transfer' : '—')}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {account && (
            <span className="text-[10px] text-ink-4">{account.name}</span>
          )}
          {tx.axis && !isTransfer && (
            <>
              <span className="text-[10px] text-ink-4">·</span>
              <span className="text-[10px]" style={{ color: axisColor }}>{tx.axis}</span>
            </>
          )}
          {isTransfer && <span className="text-[10px] text-ink-4">Transfer</span>}
        </div>
      </div>

      {/* Amount + time */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span
          className="font-mono text-sm font-semibold"
          style={{ color: masked ? 'var(--ink-4)' : amtColor }}
        >
          {masked ? '••••' : `${tx.direction === 'in' ? '+' : '−'}${fmtX(tx.amount)}`}
        </span>
        <span className="text-[10px] text-ink-4 font-mono">{time}</span>
      </div>

      {/* Edit pencil on hover */}
      {hovered && onEdit && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 opacity-60">
          <Pencil size={12} />
        </div>
      )}
    </div>
  )
}
