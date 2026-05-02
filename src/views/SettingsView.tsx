import { signOut } from '@/lib/auth'
import { useUIStore } from '@/store'
import { useToast } from '@/components/ui/Toast'

interface SettingsViewProps { userId: string; email?: string }

export function SettingsView({ userId, email }: SettingsViewProps) {
  const { masked, toggleMasked } = useUIStore()
  const { toast } = useToast()

  const handleSignOut = async () => {
    await signOut()
    location.reload()
  }

  const Row = ({ label, meta, action }: { label: string; meta?: string; action: React.ReactNode }) => (
    <div className="flex items-center px-4 py-3 border-b border-line">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink">{label}</div>
        {meta && <div className="text-xs text-ink-3 truncate">{meta}</div>}
      </div>
      <div>{action}</div>
    </div>
  )

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 mb-2 caps text-ink-3">Account</div>
      <div className="border-t border-line">
        <Row label="Email" meta={email} action={null} />
        <Row label="User ID" meta={userId.slice(0, 8) + '…'} action={null} />
        <Row
          label="Sign out"
          action={
            <button className="text-xs px-3 py-1.5 rounded border border-leak/40 text-leak hover:bg-leak/10"
              onClick={handleSignOut}>
              Sign out
            </button>
          }
        />
      </div>

      <div className="px-4 pt-4 mb-2 caps text-ink-3">Display</div>
      <div className="border-t border-line">
        <Row
          label="Mask values"
          meta="Hide all financial figures"
          action={
            <button
              className={`w-10 h-6 rounded-full transition-colors ${masked ? 'bg-accent' : 'bg-bg-3'}`}
              onClick={toggleMasked}
            >
              <div className={`w-4 h-4 rounded-full bg-bg mx-1 transition-transform ${masked ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          }
        />
      </div>

      <div className="px-4 pt-4 mb-2 caps text-ink-3">Data</div>
      <div className="border-t border-line">
        <Row
          label="Export transactions"
          action={
            <button
              className="text-xs px-3 py-1.5 rounded border border-line text-ink-3 hover:text-ink"
              onClick={() => toast('Export not yet implemented')}
            >
              Export CSV
            </button>
          }
        />
      </div>

      <div className="px-4 pt-6 text-center">
        <div className="font-mono text-[10px] text-ink-4">
          LEDGER OS v2.0 · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
