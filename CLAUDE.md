# LEDGER OS — Claude Code Context File
# This file is read automatically by Claude Code every session.

## What this is
Personal financial OS for Adrian Kuloba (MBChB/8366/20, Moi University).
Single-file PWA being migrated to React/Vite.
Live at: https://eadrian821.github.io/ledger-os
Backend: Supabase project sjqpkohrpgfmhcdiinen

## Target stack
React 18 + Vite 5 + TypeScript strict + Tailwind CSS v3
Framer Motion 11 + Zustand 4 + TanStack Query v5 + Supabase JS v2

## Design tokens (NEVER deviate)
```
--bg:       #07070f   /* base background */
--bg-1:     #0d0d18   /* card background */
--bg-2:     #121220   /* input/secondary */
--bg-3:     #181828   /* tertiary */
--line:     #1c1c30   /* border */
--line-2:   #252540   /* hover border */
--ink:      #ddddf0   /* primary text */
--ink-2:    #9999b8   /* secondary text */
--ink-3:    #666688   /* muted text */
--ink-4:    #3a3a58   /* disabled */
--accent:   #00e676   /* electric green */
--invest:   #00e676   /* INVEST axis */
--protect:  #4488ff   /* PROTECT axis */
--sustain:  #ffaa00   /* SUSTAIN axis */
--leak:     #ff3355   /* LEAK axis */
Font numbers:  JetBrains Mono (always for financial figures)
Font UI:       Geist
Font personality: Instrument Serif italic
```

## Financial logic (CRITICAL — unit tested, do not change)

### Axis classification
Every real transaction has one of four axes:
- INVEST:  compounds future wealth (education, trading capital, MMF deposits)
- PROTECT: mitigates risk (insurance, emergency fund contributions)
- SUSTAIN: necessary friction (rent, food, transport, utilities)
- LEAK:    destroys capital with no return (eating out, entertainment, fees)

### Transfer rules
- Transfers between accounts have `counter_account_id` set on BOTH legs
- Transfer legs are NEVER income or expenses
- They do NOT affect burn rate, save rate, or axis totals
- They DO affect account balances (that's the point)
- A KES 56 transaction fee on a transfer IS a real LEAK expense (separate tx)

### Account kinds
- operating, buffer, cash → LIQUID (used for runway)
- compound, speculation   → INVESTMENT (excluded from runway numerator)
- credit, wallet          → neither (excluded from runway)

### Runway calculation
```
trailing30Burn = sum(SUSTAIN+LEAK axis expenses in last 30 days) / 30
liqBal = sum(opening_balance + all tx flows) for LIQUID accounts only
runway = liqBal / trailing30Burn  (in days)
runwayTotal = (liqBal + investBal) / trailing30Burn
```
Note: trailing 30 days not month-to-date. Always ÷30 not ÷daysElapsed.

### Save rate
```
deployed = INVEST axis expenses + PROTECT axis expenses
         + transfers from LIQUID → INVESTMENT accounts
saveRate = deployed / realIncome * 100
```

### Burn rate (for gauge display)
Only SUSTAIN + LEAK. Never INVEST, PROTECT, or transfers.

## Auth (GitHub Pages constraint)
- flowType: 'implicit' (no server for PKCE code exchange)
- detectSessionInUrl: true
- Magic links arrive with ##access_token=... (double hash)
- Must call sb.auth.setSession({access_token, refresh_token}) manually
- history.replaceState to clean URL after token extraction

## Offline queue
- Dexie IndexedDB stores pending transactions
- Each has a client-generated UUID used as server-side ID
- Drain on reconnect using upsert with onConflict:'id' (idempotent)
- Queue count displayed in TopBar

## Kenyan transfer fee table
Embedded in src/lib/fees.ts — do not fetch externally
Routes: mpesa-mpesa, bank-mpesa, mpesa-bank, bank-bank, mpesa-paybill
Each route is a function (amount: number) => number

## DO NOT
- Add light mode or any light-mode variants
- Change financial calculation logic without running unit tests first
- Use border-radius > 8px (rounded-lg max)
- Add whitespace/padding beyond what serves data density
- Use colors outside the defined palette
- Break the offline queue pattern
- Hardcode Supabase credentials (use env vars)
- Use class-based React components
- Use moment.js or date-fns (vanilla Date API only)

## File structure (target)
src/
  lib/          # supabase, auth, fees, utils — pure functions
  types/        # TypeScript interfaces
  store/        # Zustand slices
  hooks/        # TanStack Query + derived state
  components/
    ui/         # primitive: NumberTicker, KpiCard, Sheet, etc
    layout/     # TopBar, BottomNav, PageTransition
    forms/      # LogForm, TransferForm, etc
  views/        # full page views
  constants/    # axes, account kinds
