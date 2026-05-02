import { useQuery } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Snapshot } from '@/types/ledger'

const snapKeys = {
  all: (uid: string) => ['snapshots', uid] as const,
}

async function fetchSnapshots(uid: string): Promise<Record<string, number>> {
  const since = `${new Date().getFullYear() - 2}-01-01`
  const { data, error } = await sb
    .from('snapshots')
    .select('date, balance, account_id')
    .eq('user_id', uid)
    .gte('date', since)
    .order('date')
  if (error) throw error

  // Aggregate daily NW by summing all account balances per date
  const byDate: Record<string, number> = {}
  for (const row of data ?? []) {
    const snap = row as Snapshot
    byDate[snap.date] = (byDate[snap.date] ?? 0) + snap.balance
  }
  return byDate
}

export function useSnapshots(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? snapKeys.all(userId) : ['snaps-disabled'],
    queryFn: () => fetchSnapshots(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}
