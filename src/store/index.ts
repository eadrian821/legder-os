import { create } from 'zustand'
import { createSessionSlice, type SessionSlice } from './sessionSlice'
import { createUISlice, type UISlice } from './uiSlice'
import { createMetricsSlice, type MetricsSlice } from './metricsSlice'

type Store = SessionSlice & UISlice & MetricsSlice

export const useStore = create<Store>()((...a) => ({
  ...createSessionSlice(...a),
  ...createUISlice(...a),
  ...createMetricsSlice(...a),
}))

// Convenience selectors
export const useSession  = () => useStore((s) => s.session)
export const useUIStore  = () => useStore((s) => ({
  tab: s.tab, masked: s.masked, nwLocked: s.nwLocked,
  auditMode: s.auditMode, auditOffset: s.auditOffset,
  weekOffset: s.weekOffset, queueCount: s.queueCount, online: s.online,
  setTab: s.setTab, toggleMasked: s.toggleMasked, toggleNwLocked: s.toggleNwLocked,
  setAuditMode: s.setAuditMode, setAuditOffset: s.setAuditOffset,
  setWeekOffset: s.setWeekOffset, setQueueCount: s.setQueueCount, setOnline: s.setOnline,
}))
export const useMetrics  = () => useStore((s) => s.metrics)
