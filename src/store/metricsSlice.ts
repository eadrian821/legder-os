import type { StateCreator } from 'zustand'
import type { ComputedMetrics } from '@/types/ledger'
import { ZERO_METRICS } from '@/lib/computeMetrics'

export type { ComputedMetrics }
export { computeMetrics } from '@/lib/computeMetrics'

export interface MetricsSlice {
  metrics: ComputedMetrics
  setMetrics: (m: ComputedMetrics) => void
}

export const createMetricsSlice: StateCreator<MetricsSlice> = (set) => ({
  metrics: ZERO_METRICS,
  setMetrics: (metrics) => set({ metrics }),
})
