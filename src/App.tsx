import { useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'

const DevKitchen = lazy(() => import('./DevKitchen').then(m => ({ default: m.DevKitchen })))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sb } from '@/lib/supabase'
import { handleHashTokens } from '@/lib/auth'
import { useStore, useUIStore } from '@/store'
import { ToastProvider } from '@/components/ui/Toast'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageTransition } from '@/components/layout/PageTransition'
import { AuthView } from '@/views/AuthView'
import { TodayView } from '@/views/TodayView'
import { WeekView } from '@/views/WeekView'
import { AuditView } from '@/views/AuditView'
import { PlanView } from '@/views/PlanView'
import { AccountsView } from '@/views/AccountsView'
import { SettingsView } from '@/views/SettingsView'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } }
})

function AppInner() {
  const session = useStore((s) => s.session)
  const setSession = useStore((s) => s.setSession)
  const setOnline = useStore((s) => s.setOnline)
  const { tab } = useUIStore()
  const userId = session?.user?.id
  const email = session?.user?.email

  useEffect(() => {
    handleHashTokens().catch(console.error)

    const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setSession(s))
    sb.auth.getSession().then(({ data: { session: s } }) => setSession(s))

    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')) {
    return (
      <Suspense fallback={null}>
        <DevKitchen />
      </Suspense>
    )
  }

  if (!userId) return <AuthView />

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* Desktop: fixed sidebar */}
      <Sidebar className="hidden lg:flex lg:flex-col" />

      {/* Main column: shifts right on desktop */}
      <div className="flex-1 flex flex-col lg:ml-[240px] min-w-0">
        {/* Mobile-only top bar */}
        <TopBar userId={userId} className="lg:hidden" />

        <AnimatePresence mode="wait">
          <PageTransition key={tab}>
            {tab === 'today'    && <TodayView    userId={userId} />}
            {tab === 'week'     && <WeekView     userId={userId} />}
            {tab === 'audit'    && <AuditView    userId={userId} />}
            {tab === 'plan'     && <PlanView     userId={userId} />}
            {tab === 'accounts' && <AccountsView userId={userId} />}
            {tab === 'settings' && <SettingsView userId={userId} email={email} />}
          </PageTransition>
        </AnimatePresence>

        {/* Mobile-only bottom nav */}
        <BottomNav className="lg:hidden" />
      </div>
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </QueryClientProvider>
  )
}
