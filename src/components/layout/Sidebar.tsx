import { motion } from 'framer-motion'
import {
  LayoutDashboard, BarChart2, Search, Target, Wallet,
  Settings, LogOut, Eye, EyeOff, type LucideIcon,
} from 'lucide-react'
import { useUIStore, useStore } from '@/store'
import { sb } from '@/lib/supabase'
import type { Tab } from '@/store/uiSlice'

const NAV: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'today',    label: 'Today',    Icon: LayoutDashboard },
  { id: 'week',     label: 'Week',     Icon: BarChart2 },
  { id: 'audit',    label: 'Audit',    Icon: Search },
  { id: 'plan',     label: 'Plan',     Icon: Target },
  { id: 'accounts', label: 'Accounts', Icon: Wallet },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export function Sidebar({ className = '' }: { className?: string }) {
  const { tab, setTab, masked, toggleMasked, queueCount, online } = useUIStore()
  const email = useStore((s) => s.session?.user?.email)

  return (
    <aside
      className={`w-[240px] h-dvh flex flex-col ${className}`}
      style={{
        background: '#07070f',
        borderRight: '1px solid var(--line)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* Logo row */}
      <div
        className="px-5 flex items-center gap-3 flex-shrink-0"
        style={{ height: 64, borderBottom: '1px solid var(--line)' }}
      >
        <div className="font-mono font-extrabold text-sm tracking-[-0.03em] flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-sm bg-accent animate-pulseGlow"
            style={{ boxShadow: '0 0 8px var(--accent)' }}
          />
          LEDGER<span className="text-ink-3 font-normal"> OS</span>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-ink-3">
          {!online && <span className="text-sustain">OFFLINE</span>}
          {queueCount > 0 && (
            <span className="text-sustain bg-sustain/10 px-1.5 py-0.5 rounded">{queueCount}</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative"
              style={{ color: active ? 'var(--accent)' : 'var(--ink-3)' }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
              }}
            >
              {/* Active pill */}
              {active && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(0,230,118,0.06)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              {/* Active left bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4 flex-shrink-0 space-y-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button
          className="flex items-center gap-2 text-[11px] text-ink-3 hover:text-ink transition-colors"
          onClick={toggleMasked}
        >
          {masked ? <EyeOff size={13} /> : <Eye size={13} />}
          {masked ? 'Unmask values' : 'Mask values'}
        </button>
        {email && (
          <div className="text-[10px] text-ink-4 font-mono truncate">{email}</div>
        )}
        <button
          className="flex items-center gap-2 text-[11px] text-ink-3 hover:text-leak transition-colors"
          onClick={() => sb.auth.signOut()}
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
