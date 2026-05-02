import type { Session } from '@supabase/supabase-js'
import type { StateCreator } from 'zustand'

export interface SessionSlice {
  session: Session | null
  setSession: (s: Session | null) => void
  clearSession: () => void
}

export const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
})
