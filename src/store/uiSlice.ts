import type { StateCreator } from 'zustand'

export type Tab = 'today' | 'week' | 'audit' | 'plan' | 'accounts' | 'settings'
export type AuditMode = 'month' | 'quarter' | 'year'

export interface UISlice {
  tab: Tab
  masked: boolean
  nwLocked: boolean
  auditMode: AuditMode
  auditOffset: number
  weekOffset: number
  queueCount: number
  online: boolean
  setTab: (t: Tab) => void
  toggleMasked: () => void
  toggleNwLocked: () => void
  setAuditMode: (m: AuditMode) => void
  setAuditOffset: (n: number) => void
  setWeekOffset: (n: number) => void
  setQueueCount: (n: number) => void
  setOnline: (v: boolean) => void
}

const ls = (k: string, fallback: boolean) => {
  try { return localStorage.getItem(k) === 'true' } catch { return fallback }
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  tab:         'today',
  masked:      ls('masked', false),
  nwLocked:    ls('nwLocked', true),
  auditMode:   'month',
  auditOffset: 0,
  weekOffset:  0,
  queueCount:  0,
  online:      navigator.onLine,

  setTab:         (tab) => set({ tab }),
  toggleMasked:   () => set((s) => {
    const next = !s.masked
    try { localStorage.setItem('masked', String(next)) } catch {}
    return { masked: next }
  }),
  toggleNwLocked: () => set((s) => {
    const next = !s.nwLocked
    try { localStorage.setItem('nwLocked', String(next)) } catch {}
    return { nwLocked: next }
  }),
  setAuditMode:   (auditMode) => set({ auditMode, auditOffset: 0 }),
  setAuditOffset: (auditOffset) => set({ auditOffset }),
  setWeekOffset:  (weekOffset) => set({ weekOffset }),
  setQueueCount:  (queueCount) => set({ queueCount }),
  setOnline:      (online) => set({ online }),
})
