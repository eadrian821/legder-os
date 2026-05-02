import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { sb } from '@/lib/supabase'
import type { Transaction } from '@/types/ledger'
import type { Database } from '@/types/database'

export const txKeys = {
  all:     ['transactions'] as const,
  year:    (uid: string) => [...txKeys.all, uid, 'year'] as const,
  history: (uid: string) => [...txKeys.all, uid, 'history'] as const,
}

async function fetchYearTransactions(uid: string): Promise<Transaction[]> {
  const since = `${new Date().getFullYear()}-01-01`
  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .eq('user_id', uid)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transaction[]
}

async function fetchHistoryTransactions(uid: string): Promise<Transaction[]> {
  const since = `${new Date().getFullYear() - 5}-01-01`
  const thisYear = `${new Date().getFullYear()}-01-01`
  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .eq('user_id', uid)
    .gte('occurred_at', since)
    .lt('occurred_at', thisYear)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transaction[]
}

function mergeTx(year: Transaction[] | undefined, history: Transaction[] | undefined): Transaction[] {
  if (!year) return []
  if (!history) return year
  const ids = new Set(year.map((t) => t.id))
  return [...year, ...history.filter((t) => !ids.has(t.id))]
}

export function useTransactions(userId: string | undefined) {
  const yearQuery = useQuery({
    queryKey: userId ? txKeys.year(userId) : ['tx-disabled'],
    queryFn:  () => fetchYearTransactions(userId!),
    enabled:  !!userId,
    staleTime: 30_000,
  })

  const historyQuery = useQuery({
    queryKey: userId ? txKeys.history(userId) : ['tx-hist-disabled'],
    queryFn:  () => fetchHistoryTransactions(userId!),
    enabled:  !!userId && !!yearQuery.data,
    staleTime: 5 * 60_000,
  })

  const allTx = useMemo(
    () => mergeTx(yearQuery.data, historyQuery.data),
    [yearQuery.data, historyQuery.data]
  )

  return {
    yearTx:    yearQuery.data ?? [],
    allTx,
    isLoading: yearQuery.isLoading,
    isError:   yearQuery.isError,
    error:     yearQuery.error,
  }
}

export function useInsertTransaction(userId: string) {
  const qc = useQueryClient()
  const yearKey = txKeys.year(userId)

  return useMutation({
    mutationFn: async (tx: Omit<Transaction, 'created_at'>) => {
      const row: Database['public']['Tables']['transactions']['Insert'] = {
        id: tx.id, user_id: userId, account_id: tx.account_id,
        occurred_at: tx.occurred_at, description: tx.description,
        amount: tx.amount, direction: tx.direction, axis: tx.axis,
        category_id: tx.category_id, counter_account_id: tx.counter_account_id,
      }
      const { data, error } = await sb
        .from('transactions')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Transaction
    },

    // Optimistic: add the new tx immediately so the UI reflects it before server round-trip
    onMutate: async (tx) => {
      await qc.cancelQueries({ queryKey: yearKey })
      const previous = qc.getQueryData<Transaction[]>(yearKey)

      const optimistic: Transaction = { ...tx, created_at: new Date().toISOString() }
      qc.setQueryData<Transaction[]>(yearKey, (old = []) => {
        const without = old.filter((t) => t.id !== optimistic.id)
        return [optimistic, ...without].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      })

      return { previous }
    },

    onError: (_err, _tx, ctx) => {
      if (ctx?.previous) qc.setQueryData(yearKey, ctx.previous)
    },

    onSettled: (tx) => {
      qc.invalidateQueries({ queryKey: yearKey })
      if (tx && new Date(tx.occurred_at).getFullYear() < new Date().getFullYear()) {
        qc.invalidateQueries({ queryKey: txKeys.history(userId) })
      }
    },
  })
}

export function useDeleteTransaction(userId: string) {
  const qc = useQueryClient()
  const yearKey = txKeys.year(userId)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('transactions').delete().eq('id', id)
      if (error) throw error
      return id
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: yearKey })
      const previous = qc.getQueryData<Transaction[]>(yearKey)
      qc.setQueryData<Transaction[]>(yearKey, (old = []) => old.filter((t) => t.id !== id))
      return { previous }
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(yearKey, ctx.previous)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: yearKey })
      qc.invalidateQueries({ queryKey: txKeys.history(userId) })
    },
  })
}
