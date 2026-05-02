import { useState } from 'react'
import { sendMagicLink } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'

export function AuthView() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await sendMagicLink(email)
      setSent(true)
    } catch (err) {
      toast(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono font-extrabold text-2xl tracking-[-0.03em] flex items-center justify-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent animate-pulseGlow" style={{ boxShadow: '0 0 12px var(--accent)' }} />
            LEDGER <span className="text-ink-3 font-normal">OS</span>
          </div>
          <p className="text-sm text-ink-3 font-serif italic">Your financial operating system</p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <div className="text-accent text-2xl">✓</div>
            <p className="text-sm text-ink">Magic link sent to <span className="font-mono text-ink">{email}</span></p>
            <p className="text-xs text-ink-3">Check your inbox and tap the link to sign in.</p>
            <button className="text-xs text-ink-4 mt-4" onClick={() => setSent(false)}>Try different email</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              className="w-full bg-bg-2 border border-line rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-2 transition-colors"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-accent text-bg text-sm font-bold transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
