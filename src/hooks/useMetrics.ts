import { useMemo } from 'react'
import { useAccounts } from './useAccounts'
import { useTransactions } from './useTransactions'
import { useSnapshots } from './useSnapshots'
import { useStore } from '@/store'
import { computeMetrics } from '@/lib/computeMetrics'
import type { ComputedMetrics } from '@/types/ledger'

export function useComputedMetrics(userId: string | undefined): ComputedMetrics {
  const { data: accounts } = useAccounts(userId)
  const { yearTx } = useTransactions(userId)
  const { data: snapshots } = useSnapshots(userId)

  return useMemo(
    () => computeMetrics(accounts ?? [], yearTx ?? [], snapshots ?? {}),
    [accounts, yearTx, snapshots]
  )
}

export function useMetrics(): ComputedMetrics {
  const userId = useStore((s) => s.session?.user?.id)
  return useComputedMetrics(userId)
}
