# Ledger OS

Personal financial OS. Live at: https://eadrian821.github.io/legder-os/

## Dev

```bash
cp .env.example .env   # add your Supabase anon key
npm install
npm run dev            # http://localhost:5173/legder-os/
```

Access the component kitchen at `http://localhost:5173/legder-os/?dev`

## Deploy

Push to `main` — GitHub Actions builds and deploys automatically.

### First-time setup

1. **GitHub Actions secrets** — Settings → Secrets and variables → Actions → New repository secret:
   - `VITE_SUPABASE_URL` → `https://sjqpkohrpgfmhcdiinen.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → your anon key from Supabase dashboard → Settings → API

2. **Enable GitHub Pages** — Settings → Pages → Source: GitHub Actions

3. **Supabase redirect URLs** — Supabase dashboard → Authentication → URL Configuration:
   - Add `https://eadrian821.github.io/legder-os/` to **Site URL**
   - Add `https://eadrian821.github.io/legder-os/**` to **Redirect URLs**

### Post-deploy checklist

- [ ] Magic link login works (check Supabase redirect URLs above)
- [ ] App loads at `https://eadrian821.github.io/legder-os/`
- [ ] PWA install prompt appears on mobile
- [ ] Service worker active in DevTools → Application → Service Workers
- [ ] Offline mode: disable network, confirm cached shell still renders

### Service worker / cache busting

`vite-plugin-pwa` with `registerType: 'autoUpdate'` handles this — on next deploy the SW
fetches a new `sw.js`, detects the updated precache manifest, and reloads all clients
automatically. No manual cache clearing needed.
