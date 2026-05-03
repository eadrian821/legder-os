import { LayoutDashboard, BarChart2, Search, Target, Wallet, Settings, type LucideIcon } from 'lucide-react'
import { useUIStore } from '@/store'
import type { Tab } from '@/store/uiSlice'

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'today',    label: 'Today',    Icon: LayoutDashboard },
  { id: 'week',     label: 'Week',     Icon: BarChart2 },
  { id: 'audit',    label: 'Audit',    Icon: Search },
  { id: 'plan',     label: 'Plan',     Icon: Target },
  { id: 'accounts', label: 'Accounts', Icon: Wallet },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export function BottomNav({ className = '' }: { className?: string }) {
  const { tab, setTab } = useUIStore()

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex pb-[env(safe-area-inset-bottom)] ${className}`}
      style={{ background: 'rgba(7,7,15,0.97)', borderTop: '1px solid var(--line)', backdropFilter: 'blur(12px)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors text-[9px] uppercase tracking-[0.08em] font-medium ${
              active ? 'text-accent' : 'text-ink-3'
            }`}
            onClick={() => setTab(id)}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 1.6} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
