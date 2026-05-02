import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import type { Account } from '@/types/ledger'
import type { Database } from '@/types/database'

export const accountKeys = {
  all: (uid: string) => ['accounts', uid] as const,
}

async function fetchAccounts(uid: string): Promise<Account[]> {
  const { data, error } = await sb
    .from('accounts')
    .select('*')
    .eq('user_id', uid)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Account[]
}

export function useAccounts(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? accountKeys.all(userId) : ['accounts-disabled'],
    queryFn:  () => fetchAccounts(userId!),
    enabled:  !!userId,
    staleTime: 60_000,
  })
}

export function useUpsertAccount(userId: string) {
  const qc = useQueryClient()
  const key = accountKeys.all(userId)

  return useMutation({
    mutationFn: async (acc: Account) => {
      const row: Database['public']['Tables']['accounts']['Insert'] = {
        id: acc.id, user_id: userId, name: acc.name, kind: acc.kind,
        opening_balance: acc.opening_balance, currency: acc.currency,
      }
      const { data, error } = await sb.from('accounts').upsert(row).select().single()
      if (error) throw error
      return data as Account
    },

    onMutate: async (acc) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Account[]>(key)
      qc.setQueryData<Account[]>(key, (old = []) => {
        const exists = old.some((a) => a.id === acc.id)
        return exists
          ? old.map((a) => (a.id === acc.id ? acc : a))
          : [...old, acc]
      })
      return { previous }
    },

    onError: (_err, _acc, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteAccount(userId: string) {
  const qc = useQueryClient()
  const key = accountKeys.all(userId)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('accounts').delete().eq('id', id)
      if (error) throw error
      return id
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Account[]>(key)
      qc.setQueryData<Account[]>(key, (old = []) => old.filter((a) => a.id !== id))
      return { previous }
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
