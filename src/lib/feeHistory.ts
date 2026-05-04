import type { TransferRoute } from './fees'
import { transferFee } from './fees'

const KEY = 'ledger_fee_history'
const MAX = 150

export interface FeeEntry {
  route: TransferRoute
  amount: number
  actualFee: number
  date: string
}

function load(): FeeEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function save(entries: FeeEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX))) } catch {}
}

/** Persist the actual fee the user paid for a transfer */
export function recordFee(route: TransferRoute, amount: number, actualFee: number) {
  const entries = load()
  entries.push({ route, amount, actualFee, date: new Date().toISOString().slice(0, 10) })
  save(entries)
}

/**
 * Return the most recent actual fee recorded for this route in the same
 * tariff band as `amount`. Returns null if no history exists yet.
 */
export function suggestFee(route: TransferRoute, amount: number): number | null {
  const fn = transferFee[route]
  if (!fn || amount <= 0) return null
  const band = fn(amount)
  const matches = load()
    .filter((e) => e.route === route && transferFee[e.route]?.(e.amount) === band)
    .reverse() // most recent first
  return matches.length > 0 ? matches[0].actualFee : null
}

/** How many transfers have been recorded for this route */
export function countLearned(route: TransferRoute): number {
  return load().filter((e) => e.route === route).length
}

/** Full history for a route, most recent first — for a future audit/debug view */
export function getHistory(route?: TransferRoute): FeeEntry[] {
  const all = load().reverse()
  return route ? all.filter((e) => e.route === route) : all
}
