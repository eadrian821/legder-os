// Ledger OS service worker — v2 (React/Vite build)
// vite-plugin-pwa injects the precache manifest at build time
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Never cache Supabase API calls
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return
})
