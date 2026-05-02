import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Category } from '@/types/ledger'
import type { Database } from '@/types/database'

const catKeys = {
  all: (uid: string) => ['categories', uid] as const,
}

async function fetchCategories(uid: string): Promise<Category[]> {
  const { data, error } = await sb.from('categories').select('*').eq('user_id', uid).order('name')
  if (error) throw error
  return (data ?? []) as Category[]
}

export function useCategories(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? catKeys.all(userId) : ['cats-disabled'],
    queryFn: () => fetchCategories(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertCategory(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cat: Category) => {
      const row: Database['public']['Tables']['categories']['Insert'] = {
        id: cat.id, user_id: userId, name: cat.name, axis: cat.axis, color: cat.color,
      }
      const { data, error } = await sb.from('categories').upsert(row).select().single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.all(userId) }),
  })
}
