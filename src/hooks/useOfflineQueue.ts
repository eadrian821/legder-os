import { useEffect, useRef, useState } from 'react'
import Dexie, { type Table } from 'dexie'
import { sb } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useStore } from '@/store'
import type { OfflineQueueItem } from '@/types/ledger'

class LedgerDB extends Dexie {
  queue!: Table<OfflineQueueItem, string>

  constructor() {
    super('ledger-q')
    this.version(1).stores({ queue: 'lid, created_at' })
  }
}

const db = new LedgerDB()

export async function enqueueTransaction(payload: OfflineQueueItem['payload']): Promise<void> {
  await db.queue.put({ lid: payload.id, payload, created_at: new Date().toISOString() })
}

export function useOfflineQueue(userId: string | undefined) {
  const setQueueCount = useStore((s) => s.setQueueCount)
  const online = useStore((s) => s.online)
  const [syncing, setSyncing] = useState(false)
  const drainingRef = useRef(false)

  const refreshCount = async () => {
    const count = await db.queue.count()
    setQueueCount(count)
  }

  const drain = async () => {
    if (drainingRef.current || !userId || !online) return
    drainingRef.current = true
    setSyncing(true)
    try {
      const items = await db.queue.toArray()
      for (const item of items) {
        const row: Database['public']['Tables']['transactions']['Insert'] = {
          id: item.payload.id, user_id: item.payload.user_id, account_id: item.payload.account_id,
          occurred_at: item.payload.occurred_at, description: item.payload.description,
          amount: item.payload.amount, currency: item.payload.currency ?? 'KES', direction: item.payload.direction,
          axis: item.payload.axis, category_id: item.payload.category_id,
          counter_account_id: item.payload.counter_account_id,
        }
        const { error } = await sb.from('transactions').upsert(row, { onConflict: 'id' })
        if (!error) await db.queue.delete(item.lid)
      }
    } finally {
      drainingRef.current = false
      setSyncing(false)
      await refreshCount()
    }
  }

  useEffect(() => {
    refreshCount()
  }, [])

  useEffect(() => {
    if (online) drain()
  }, [online, userId])

  return { syncing, drain, enqueue: enqueueTransaction, refreshCount }
}
