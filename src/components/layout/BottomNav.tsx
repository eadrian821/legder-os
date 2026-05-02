import { useUIStore } from '@/store'
import type { Tab } from '@/store/uiSlice'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today',    label: 'Today',    icon: '⬡' },
  { id: 'week',     label: 'Week',     icon: '▦' },
  { id: 'audit',    label: 'Audit',    icon: '≋' },
  { id: 'plan',     label: 'Plan',     icon: '◈' },
  { id: 'accounts', label: 'Accounts', icon: '⊞' },
]

export function BottomNav() {
  const { tab, setTab } = useUIStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex bg-[rgba(7,7,15,0.95)] border-t border-line pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors text-[10px] uppercase tracking-[0.08em] font-medium ${
            tab === id ? 'text-accent' : 'text-ink-3 hover:text-ink-2'
          }`}
          onClick={() => setTab(id)}
        >
          <span className="text-base leading-none">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
