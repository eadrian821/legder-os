import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Recurring } from '@/types/ledger'
import type { Database } from '@/types/database'

const recurringKeys = {
  all: (uid: string) => ['recurring', uid] as const,
}

async function fetchRecurring(uid: string): Promise<Recurring[]> {
  const { data, error } = await sb
    .from('recurring')
    .select('*')
    .eq('user_id', uid)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as Recurring[]
}

export function useRecurring(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? recurringKeys.all(userId) : ['recurring-disabled'],
    queryFn: () => fetchRecurring(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertRecurring(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: Recurring) => {
      const row: Database['public']['Tables']['recurring']['Insert'] = {
        id: r.id, user_id: userId, account_id: r.account_id, description: r.description,
        amount: r.amount, direction: r.direction, axis: r.axis, category_id: r.category_id,
        frequency: r.frequency, next_date: r.next_date, is_active: r.is_active,
      }
      const { data, error } = await sb.from('recurring').upsert(row).select().single()
      if (error) throw error
      return data as Recurring
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all(userId) }),
  })
}
