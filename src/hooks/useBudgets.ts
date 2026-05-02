import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Budget } from '@/types/ledger'
import type { Database } from '@/types/database'

const budgetKeys = {
  all: (uid: string) => ['budgets', uid] as const,
}

async function fetchBudgets(uid: string): Promise<Budget[]> {
  const { data, error } = await sb.from('budgets').select('*').eq('user_id', uid)
  if (error) throw error
  return (data ?? []) as Budget[]
}

export function useBudgets(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? budgetKeys.all(userId) : ['budgets-disabled'],
    queryFn: () => fetchBudgets(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertBudget(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (b: Budget) => {
      const row: Database['public']['Tables']['budgets']['Insert'] = {
        id: b.id, user_id: userId, category_id: b.category_id, axis: b.axis,
        limit_amount: b.limit_amount, period: b.period,
      }
      const { data, error } = await sb.from('budgets').upsert(row).select().single()
      if (error) throw error
      return data as Budget
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  })
}

export function useDeleteBudget(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  })
}
