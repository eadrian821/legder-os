import { useMemo } from 'react'
import { useAccounts } from './useAccounts'
import { useTransactions } from './useTransactions'
import { useSnapshots } from './useSnapshots'
import { useStore } from '@/store'
import { computeMetrics } from '@/lib/computeMetrics'
import type { ComputedMetrics } from '@/types/ledger'

export function useComputedMetrics(userId: string | undefined): ComputedMetrics {
  const { data: accounts } = useAccounts(userId)
  // Use allTx (full history) so opening_balance + ALL transactions = correct running balance.
  // yearTx only covers Jan 1 → today — any account with pre-year activity shows wrong balance.
  // React Query deduplicates the underlying queries, so no extra network calls.
  const { allTx } = useTransactions(userId)
  const { data: snapshots } = useSnapshots(userId)

  return useMemo(
    () => computeMetrics(accounts ?? [], allTx, snapshots ?? {}),
    [accounts, allTx, snapshots]
  )
}

export function useMetrics(): ComputedMetrics {
  const userId = useStore((s) => s.session?.user?.id)
  return useComputedMetrics(userId)
}
