import { useUIStore } from '@/store'

interface TopBarProps {
  userId?: string
}

export function TopBar({ userId }: TopBarProps) {
  const { masked, queueCount, online, toggleMasked } = useUIStore()

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-[18px] py-[14px] bg-[rgba(10,10,10,0.9)] backdrop-blur-[10px] backdrop-saturate-[140%] border-b border-line">
      <div className="font-mono font-extrabold text-sm tracking-[-0.03em] flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-sm bg-accent animate-pulseGlow"
          style={{ boxShadow: '0 0 8px var(--accent)' }}
        />
        LEDGER<span className="text-ink-3 font-normal"> OS</span>
      </div>

      <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-ink-3">
        {!online && (
          <span className="text-sustain text-[10px]">OFFLINE</span>
        )}
        {queueCount > 0 && (
          <span className="text-sustain">{queueCount} pending</span>
        )}
        {userId && (
          <button
            className="text-ink-3 hover:text-ink transition-colors"
            onClick={toggleMasked}
            aria-label={masked ? 'Unmask values' : 'Mask values'}
          >
            {masked ? '👁' : '🙈'}
          </button>
        )}
      </div>
    </header>
  )
}
