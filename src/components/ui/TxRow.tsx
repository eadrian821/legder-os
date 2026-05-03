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
  const isTransfer = !!tx.counter_account_id
  const isClickable = !!onEdit
  const account  = accounts.find((a) => a.id === tx.account_id)
  const axisColor = tx.axis ? AXIS_COLORS[tx.axis] : 'var(--ink-3)'
  const amtColor  = isTransfer
    ? 'var(--ink-3)'
    : tx.direction === 'in'
      ? 'var(--invest)'
      : axisColor

  const time = new Date(tx.occurred_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] last:border-0 transition-colors duration-100 ${
        isClickable ? 'cursor-pointer hover:bg-[var(--bg-2)] active:bg-[var(--bg-3)]' : ''
      }`}
      onClick={() => onEdit?.(tx)}
    >
      {/* Axis / transfer icon */}
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
            background: `${axisColor}15`,
            color: axisColor,
            border: `1px solid ${axisColor}28`,
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
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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

      {/* Amount + time + edit hint */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span
          className="font-mono text-sm font-semibold tabular-nums"
          style={{ color: masked ? 'var(--ink-4)' : amtColor }}
        >
          {masked ? '••••' : `${tx.direction === 'in' ? '+' : '−'}${fmtX(tx.amount)}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-4 font-mono">{time}</span>
          {isClickable && (
            <Pencil
              size={10}
              className="text-ink-4 opacity-0 group-hover:opacity-60 transition-opacity"
            />
          )}
        </div>
      </div>
    </div>
  )
}
