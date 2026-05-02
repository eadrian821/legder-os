import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Goal } from '@/types/ledger'
import type { Database } from '@/types/database'

const goalKeys = {
  all: (uid: string) => ['goals', uid] as const,
}

async function fetchGoals(uid: string): Promise<Goal[]> {
  const { data, error } = await sb
    .from('goals')
    .select('*')
    .eq('user_id', uid)
    .eq('is_complete', false)
    .order('priority')
  if (error) throw error
  return (data ?? []) as Goal[]
}

export function useGoals(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? goalKeys.all(userId) : ['goals-disabled'],
    queryFn: () => fetchGoals(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertGoal(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Goal) => {
      const row: Database['public']['Tables']['goals']['Insert'] = {
        id: g.id, user_id: userId, name: g.name, target_amount: g.target_amount,
        current_amount: g.current_amount, deadline: g.deadline, priority: g.priority,
        is_complete: g.is_complete,
      }
      const { data, error } = await sb.from('goals').upsert(row).select().single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all(userId) }),
  })
}
