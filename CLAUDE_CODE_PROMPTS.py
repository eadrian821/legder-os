# LEDGER OS — Claude Code Prompt Sequence
# React/Vite Migration + UI Polish
# Use these prompts IN ORDER in Claude Code terminal

# ═══════════════════════════════════════════════════════════
# CONTEXT FILE — save as CLAUDE.md in your project root
# Claude Code reads this automatically every session
# ═══════════════════════════════════════════════════════════

"""
# LEDGER OS — Claude Code Context

## What this is
Personal financial OS. Single-file PWA being migrated to React/Vite.
Live at: https://eadrian821.github.io/ledger-os
Backend: Supabase (Postgres + Auth + Edge Functions)
Owner: Adrian Kuloba

## Current state
- All logic is in index.html (~2000 lines vanilla JS)
- Supabase project: sjqpkohrpgfmhcdiinen.supabase.co
- Auth: magic link, flowType: implicit (GitHub Pages constraint)
- 5 accounts: KCB Operating, NCBA Buffer, CIC MMF, IC Markets, Cash

## Target stack
- React 18 + Vite 5
- TypeScript (strict)
- Tailwind CSS v3 (dark mode class strategy)
- Framer Motion 11
- Zustand 4 (global store)
- TanStack Query v5 (server state)
- Supabase JS v2

## Aesthetic rules (NEVER break these)
- Background: #07070f (near-black with blue tint)
- Accent: #00e676 (electric green)
- Invest: #00e676, Protect: #4488ff, Sustain: #ffaa00, Leak: #ff3355
- Numbers: JetBrains Mono font always
- UI text: Geist font
- Personality text: Instrument Serif italic
- Dark only — no light mode
- Data density > whitespace — this is a terminal, not a marketing page

## Financial logic (CRITICAL — never change these)
- Runway = liquid cash (operating/buffer/cash) ÷ trailing 30-day SUSTAIN+LEAK burn
- Transfers between accounts are NOT income or expenses
- Transfer legs have counter_account_id set
- Save rate = (INVEST axis + PROTECT axis + transfers to investment accounts) ÷ real income
- Investment accounts: compound, speculation kinds
- Liquid accounts: operating, buffer, cash kinds
- Burn = SUSTAIN + LEAK axis expenses ONLY

## Auth constraint
- GitHub Pages = no server = must use flowType: 'implicit'
- detectSessionInUrl: true
- Tokens arrive as ##access_token=... (double hash) — handle manually

## DO NOT
- Add light mode
- Change the financial calculation logic
- Add unnecessary whitespace or padding
- Use rounded-2xl or larger border radii (max rounded-lg)
- Use any color outside the defined palette
- Break the offline queue (IndexedDB Dexie pattern)
"""


# ═══════════════════════════════════════════════════════════
# PROMPT 1 — PROJECT SCAFFOLD
# Run this first. Takes ~5 minutes.
# ═══════════════════════════════════════════════════════════

PROMPT_1 = """
You are migrating Ledger OS from a single-file vanilla JS PWA to a production
React/Vite application. Read CLAUDE.md for full context.

Scaffold the complete project structure:

```
ledger-os/
├── CLAUDE.md                    # already exists
├── index.html                   # Vite entry (minimal)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.webmanifest
│   └── sw.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    │
    ├── lib/
    │   ├── supabase.ts          # createClient, types
    │   ├── auth.ts              # magic link, hash token handler
    │   ├── fees.ts              # Kenyan transfer fee tables
    │   └── utils.ts             # fmt, fmtX, iso, period helpers
    │
    ├── types/
    │   ├── database.ts          # Supabase generated types
    │   └── ledger.ts            # app-level types (Account, Transaction, etc)
    │
    ├── store/
    │   ├── index.ts             # Zustand store — re-exports all slices
    │   ├── sessionSlice.ts      # auth session
    │   ├── uiSlice.ts           # tab, masked, nwLocked, auditMode/offset
    │   └── metricsSlice.ts      # computed metrics (runway, saveRate, etc)
    │
    ├── hooks/
    │   ├── useAccounts.ts       # TanStack Query: accounts + snapshots
    │   ├── useTransactions.ts   # TanStack Query: tx with period filtering
    │   ├── useCategories.ts
    │   ├── useBudgets.ts
    │   ├── useGoals.ts
    │   ├── useRecurring.ts
    │   ├── useMetrics.ts        # derives runway/saveRate from store data
    │   └── useOfflineQueue.ts   # Dexie IndexedDB queue
    │
    ├── components/
    │   ├── ui/                  # primitive components
    │   │   ├── NumberTicker.tsx
    │   │   ├── SkeletonCard.tsx
    │   │   ├── SparkLine.tsx
    │   │   ├── AxisBar.tsx
    │   │   ├── KpiCard.tsx
    │   │   ├── TxRow.tsx
    │   │   ├── Sheet.tsx        # bottom slide-up modal
    │   │   ├── PinModal.tsx
    │   │   └── Toast.tsx
    │   │
    │   ├── layout/
    │   │   ├── TopBar.tsx
    │   │   ├── BottomNav.tsx
    │   │   └── PageTransition.tsx
    │   │
    │   └── forms/
    │       ├── LogForm.tsx
    │       ├── TransferForm.tsx
    │       ├── BudgetForm.tsx
    │       ├── GoalForm.tsx
    │       ├── RecurringForm.tsx
    │       └── AccountForm.tsx
    │
    ├── views/
    │   ├── AuthView.tsx
    │   ├── TodayView.tsx
    │   ├── WeekView.tsx
    │   ├── AuditView.tsx
    │   ├── PlanView.tsx
    │   ├── AccountsView.tsx
    │   └── SettingsView.tsx
    │
    └── constants/
        ├── axes.ts              # INVEST/PROTECT/SUSTAIN/LEAK definitions
        └── accounts.ts          # account kind definitions
```

Requirements:
1. package.json with exact versions:
   - react@18.3.1, react-dom@18.3.1
   - @types/react@18.3.1
   - vite@5.4.0
   - typescript@5.5.0
   - tailwindcss@3.4.0
   - framer-motion@11.3.0
   - zustand@4.5.0
   - @tanstack/react-query@5.51.0
   - @supabase/supabase-js@2.45.4
   - dexie@3.2.7

2. vite.config.ts: PWA plugin, path aliases (@/ → src/)

3. tailwind.config.ts: extend theme with exact Ledger OS colors,
   JetBrains Mono as 'mono' font family, dark mode class strategy

4. tsconfig.json: strict mode, path aliases

5. src/lib/supabase.ts: typed createClient, export Database type

6. src/types/ledger.ts: full TypeScript interfaces for:
   Account, Transaction, Category, Budget, Goal, Recurring,
   Snapshot, TransferFeeRoute, AuditPeriod, PeriodSummary,
   ComputedMetrics

Create ALL these files with complete, production-ready content.
Do not use placeholder comments — write the actual code.
"""


# ═══════════════════════════════════════════════════════════
# PROMPT 2 — ZUSTAND STORE + TANSTACK QUERY
# ═══════════════════════════════════════════════════════════

PROMPT_2 = """
Implement the complete state management layer for Ledger OS.
Read CLAUDE.md for financial logic constraints.

## 1. Zustand Store (src/store/)

Create a unified store with three slices:

### sessionSlice.ts
- session: Session | null
- setSession, clearSession

### uiSlice.ts
- tab: 'today'|'week'|'audit'|'plan'|'accounts'|'settings'
- masked: boolean (persisted to localStorage)
- nwLocked: boolean (persisted)
- auditMode: 'month'|'quarter'|'year'
- auditOffset: number
- queueCount: number
- online: boolean
- setTab, toggleMasked, toggleNwLocked, setAuditMode, setAuditOffset
- setQueueCount, setOnline

### metricsSlice.ts
Computed from transaction data. Store should hold:
- nw: number
- nwHistory: {date: string, nw: number}[]
- dailyBurn: number        // trailing 30-day SUSTAIN+LEAK only
- liqBal: number           // operating + buffer + cash only
- totalBal: number         // liqBal + compound + speculation
- runway: number | null    // liqBal ÷ dailyBurn (in days)
- runwayTotal: number | null
- savingsRate: number
- investRate: number
- deployedM: number
- incomeM: number
- spentM: number           // real burn only
- leakPct: number
- axisToday: AxisTotals
- axisWeek: AxisTotals
- axisMonth: AxisTotals
- weekDays: WeekDay[]
- monthDays: MonthDay[]

Export a single `computeMetrics(accounts, transactions, snapshots)` 
pure function that returns all metrics. This function contains ALL
the financial logic from CLAUDE.md. It must be unit-testable.

## 2. TanStack Query Hooks (src/hooks/)

### useTransactions.ts
```typescript
// Key structure for cache invalidation
const txKeys = {
  all: ['transactions'] as const,
  year: (uid: string) => [...txKeys.all, uid, 'year'] as const,
  history: (uid: string) => [...txKeys.all, uid, 'history'] as const,
}

export function useTransactions(userId: string) {
  // Primary query: current year (fast)
  const yearQuery = useQuery({
    queryKey: txKeys.year(userId),
    queryFn: () => fetchYearTransactions(userId),
    staleTime: 30_000,
  })
  
  // Background query: 5-year history for audit (lazy)
  const historyQuery = useQuery({
    queryKey: txKeys.history(userId),
    queryFn: () => fetchHistoryTransactions(userId),
    staleTime: 5 * 60_000,
    enabled: !!yearQuery.data, // only after year loads
  })
  
  // Merged: year takes precedence for current year
  const allTx = useMemo(() => mergeTx(yearQuery.data, historyQuery.data), 
    [yearQuery.data, historyQuery.data])
    
  return { yearTx: yearQuery.data, allTx, isLoading: yearQuery.isLoading }
}
```

### useMetrics.ts
```typescript
export function useMetrics() {
  const { data: accounts } = useAccounts()
  const { yearTx } = useTransactions()
  const { data: snapshots } = useSnapshots()
  
  return useMemo(
    () => computeMetrics(accounts ?? [], yearTx ?? [], snapshots ?? {}),
    [accounts, yearTx, snapshots]
  )
}
```

Implement all hooks: useAccounts, useTransactions, useCategories,
useBudgets, useGoals, useRecurring, useSnapshots, useMetrics.
Each must have proper TypeScript types, error handling, and
optimistic update patterns for mutations.
"""


# ═══════════════════════════════════════════════════════════
# PROMPT 3 — ANIMATION COMPONENTS
# ═══════════════════════════════════════════════════════════

PROMPT_3 = """
Implement the animation and micro-interaction layer for Ledger OS.
Use Framer Motion 11. Read CLAUDE.md for the aesthetic.

## 1. NumberTicker (src/components/ui/NumberTicker.tsx)

Rolling number animation for financial figures.
Requirements:
- Animates from previous value to new value on change
- Uses spring physics (not linear) — stiffness: 60, damping: 20
- Formats using the existing fmt/fmtX utilities
- Handles masked state (shows ••••)
- Supports KES prefix display
- Does NOT re-animate on every render — only when value changes
- Zero delay on first mount

```typescript
interface NumberTickerProps {
  value: number
  format?: 'compact' | 'full'  // fmt vs fmtX
  prefix?: string               // 'KES'
  masked?: boolean
  color?: string                // CSS variable string
  className?: string
  size?: 'hero' | 'kpi' | 'inline'
}
```

The hero net worth should animate with font-size 46px, JetBrains Mono,
font-weight 800. KPI cards use 20px. Both use the same component.

## 2. PageTransition (src/components/layout/PageTransition.tsx)

Wraps each view. When tab changes:
- Outgoing: fade out + slide 8px up, duration 150ms
- Incoming: fade in + slide from 8px down to 0, duration 200ms
- Use AnimatePresence with mode="wait"
- Key = current tab name

```typescript
// Usage in App.tsx:
<AnimatePresence mode="wait">
  <PageTransition key={tab}>
    <TodayView />
  </PageTransition>
</AnimatePresence>
```

## 3. SkeletonCard (src/components/ui/SkeletonCard.tsx)

Terminal-style pulsing skeleton. NOT the typical gray blob.
Design: animated scanline effect over dark background.
- Base: var(--bg-1) with 1px border var(--line)
- Animated: a subtle horizontal scanline sweeps top to bottom
  using a gradient: transparent → rgba(0,230,118,0.06) → transparent
- Text lines: dark rectangles, widths vary (60%, 80%, 40%)
- Numbers: wider rectangles with slight green tint

```typescript
interface SkeletonCardProps {
  lines?: number
  showNumber?: boolean
  height?: number
}
```

## 4. KpiCard (src/components/ui/KpiCard.tsx)

Glassmorphism terminal card. Requirements:
- Background: linear-gradient(135deg, rgba(13,13,24,0.9), rgba(18,18,32,0.95))
- Border: 1px solid rgba(255,255,255,0.06)
- Top edge: 1px highlight rgba(0,230,118,0.15) — only top border
- Box shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset
- On hover: border brightens to rgba(255,255,255,0.1), slight translateY(-1px)
- Value uses NumberTicker
- Animated entry: staggered fadeUp with 50ms delay between cards

## 5. Sheet (src/components/ui/Sheet.tsx)

Bottom slide-up modal with spring animation.
- Uses Framer Motion drag to dismiss (drag="y", dragConstraints top:0)
- Spring: type:"spring", stiffness:400, damping:40
- Backdrop: animate opacity 0→0.7
- Grab handle pulses on mount to indicate draggability

## 6. BurnGauge (src/components/ui/BurnGauge.tsx)

The burn rate indicator bar. Requirements:
- The fill bar animates width with spring when value changes
- Color interpolates: invest(green) → sustain(amber) → leak(red)
  based on burnRatio (0-1)
- At burnRatio > 0.8: the bar gets a pulsing glow animation
- The daily burn number uses NumberTicker

Implement all 6 components with complete TypeScript, Framer Motion
animations, and Tailwind classes using the Ledger OS palette.
"""


# ═══════════════════════════════════════════════════════════
# PROMPT 4 — VIEWS MIGRATION
# ═══════════════════════════════════════════════════════════

PROMPT_4 = """
Migrate the TodayView and AuditView from vanilla JS to React.
Reference the existing index.html for exact logic — DO NOT change
any financial calculations. Read CLAUDE.md.

## TodayView (src/views/TodayView.tsx)

Use these hooks:
- useMetrics() for all computed values
- useTransactions() for today's tx list
- useUIStore() for masked/nwLocked state

Structure:
1. Hero card with:
   - PIN-locked net worth (blur effect, NumberTicker when revealed)
   - NW sparkline (SparkLine component, 30-day history)
   - Today delta (animated +/-)
   - AxisBar component

2. BurnGauge component (dynamic burn rate indicator)

3. KpiGrid — 8 cards in 4-column responsive grid:
   - Burn/day, Leak%, Month in, Week out
   - Cash runway, Asset runway, Save rate, Deployed
   All use KpiCard + NumberTicker

4. Transaction list grouped by Evening/Afternoon/Morning
   Each TxRow has a hover state revealing an edit pencil icon
   Tapping opens TransferForm or LogForm based on transaction type

## AuditView (src/views/AuditView.tsx)

State: auditMode, auditOffset from useUIStore()
Data: allTx from useTransactions()

Three sub-tabs: Monthly / Quarterly / Annual
Period navigation with ‹ and › buttons

For each period show:
1. KPI summary (6 cards)
2. Axis bar for the period
3. Comparison table (last 12/8/5 periods) — use a proper HTML table
   with sticky header, horizontal scroll on mobile
   Current period row highlighted with subtle green tint
4. Category breakdown — bar chart using pure CSS/SVG, ranked by spend
5. Full transaction ledger, grouped by date, with daily subtotals

Performance requirement: The comparison table computes across
potentially 12 months × hundreds of tx each. Memoize with useMemo,
key on [allTx, auditMode, auditOffset].

Implement both views completely. No placeholder returns.
"""


# ═══════════════════════════════════════════════════════════
# PROMPT 5 — BUILD + DEPLOY
# ═══════════════════════════════════════════════════════════

PROMPT_5 = """
Configure the build pipeline for Ledger OS React deployment to GitHub Pages.

Requirements:
1. vite.config.ts:
   - base: '/ledger-os/' (GitHub Pages subdirectory)
   - PWA plugin (vite-plugin-pwa) generating service worker
   - manifest matches existing manifest.webmanifest
   - Code splitting: vendor chunk, framer-motion chunk, supabase chunk
   - Target: esnext (users have modern browsers)

2. GitHub Actions workflow (.github/workflows/deploy.yml):
   - Trigger: push to main
   - Node 20, pnpm
   - Build + deploy to gh-pages branch
   - Cache pnpm store

3. PWA manifest update for React build output paths

4. Environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - Show how to set these as GitHub Actions secrets
   - Show how to handle in vite.config.ts

5. The existing Supabase schema and migrations do NOT change.
   Only the frontend changes.

6. Post-deploy checklist in README:
   - Supabase redirect URLs to update
   - Service worker cache busting strategy
   - How to test locally: pnpm dev

Create all files. The output dist/ folder must work exactly as
the current index.html works on GitHub Pages.
"""


# ═══════════════════════════════════════════════════════════
# EXECUTION GUIDE — How to run these in Claude Code
# ═══════════════════════════════════════════════════════════

EXECUTION_GUIDE = """
## Step-by-step execution in Claude Code

### Setup
1. Install Claude Code: npm install -g @anthropic-ai/claude-code
2. cd into your ledger-os repo folder
3. Run: claude (this opens the interactive session)

### Session 1 — Scaffold (Prompt 1)
In Claude Code:
> [paste PROMPT_1 above]

Claude Code will create all files. Review:
- Check package.json versions are exact
- Check tailwind.config.ts has correct colors
- Check tsconfig paths

Then run:
> pnpm install
> pnpm dev

Should start on localhost:5173 (empty React shell)

### Session 2 — State + Data (Prompt 2)
> [paste PROMPT_2]

After it runs:
> Ask Claude Code: "Write unit tests for computeMetrics() using
  these scenarios: [describe a month with mixed INVEST/LEAK/transfer tx]"

This validates your financial logic before building UI.

### Session 3 — Animations (Prompt 3)
> [paste PROMPT_3]

After it runs, ask Claude Code to build a Storybook-style test page:
> "Create src/DevKitchen.tsx that renders all UI components with
  mock data so I can review animations without auth"

Navigate to /dev in browser to see all components.

### Session 4 — Views (Prompt 4)
> [paste PROMPT_4]

After each view, ask Claude Code:
> "The TodayView NumberTicker for net worth is re-animating on
  every render. Find and fix the dependency issue."

Claude Code can debug its own output — use it.

### Session 5 — Deploy (Prompt 5)
> [paste PROMPT_5]

Then:
> git add . && git commit -m "feat: React migration Phase 1"
> git push origin main

GitHub Actions deploys automatically.

### Iterative improvement prompts (use anytime)

Performance:
> "Profile the AuditView comparison table. It renders 12 periods
  × ~200 tx each on every keystroke. Optimize with useMemo and
  show me the before/after render count."

Animation refinement:
> "The NumberTicker for negative values (burn rate going up)
  should flash red briefly before settling. Add this."

Mobile polish:
> "Test the TransferForm on a 375px viewport. The FROM/TO account
  cards are too small to tap. Fix touch targets to minimum 44px."

Offline:
> "The useOfflineQueue hook needs to show a sync progress
  indicator when draining. Add a syncing: boolean state and
  wire it to the TopBar component."

### What Claude Code can do that regular Claude cannot
- Edit multiple files in one response
- Run tests and see output
- Search your entire codebase with grep
- Run the dev server and check for errors
- Fix TypeScript errors iteratively
- Commit to git on your behalf

### The most important meta-prompt
At the start of every Claude Code session:
> "Read CLAUDE.md and summarize the financial logic rules before
  we start. Confirm you understand that transfers do not affect
  burn rate."

This prevents Claude Code from accidentally breaking calculations
during UI refactoring — the most common failure mode.
"""

print("Prompt sequence document created")
