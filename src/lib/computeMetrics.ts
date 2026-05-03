import type { Account, Transaction, ComputedMetrics, AxisTotals, WeekDay, MonthDay, NwPoint } from '@/types/ledger'
import { isLiquidKind, isInvestmentKind } from '@/constants/accounts'
import { todayLocal, addDays, dayLabel, iso } from '@/lib/utils'

const ZERO_AXES: AxisTotals = { INVEST: 0, PROTECT: 0, SUSTAIN: 0, LEAK: 0 }

// Pure function — no side-effects, fully unit-testable
export function computeMetrics(
  accounts: Account[],
  transactions: Transaction[],
  snapshots: Record<string, number>
): ComputedMetrics {
  const today = todayLocal()
  const t30ago = addDays(today, -30)
  const now = new Date()

  // A transfer leg has counter_account_id set on BOTH legs
  // Transfer legs NEVER count as income/expense/axis
  const isReal = (t: Transaction) => !t.counter_account_id

  // ─── Account balances ────────────────────────────────────────────────────────
  const balance = (a: Account): number => {
    const net = transactions
      .filter((t) => t.account_id === a.id)
      .reduce((sum, t) => sum + (t.direction === 'in' ? t.amount : -t.amount), 0)
    return a.opening_balance + net
  }

  const liqBal    = accounts.filter((a) => isLiquidKind(a.kind)).reduce((s, a) => s + balance(a), 0)
  const investBal = accounts.filter((a) => isInvestmentKind(a.kind)).reduce((s, a) => s + balance(a), 0)
  const totalBal  = liqBal + investBal
  const nw        = accounts.reduce((s, a) => s + balance(a), 0)

  // ─── Trailing 30-day burn ────────────────────────────────────────────────────
  // SUSTAIN + LEAK axis real outflows only. Always divide by 30, NOT days elapsed.
  const trail30Burn = transactions
    .filter((t) => {
      const d = new Date(t.occurred_at)
      return (
        d >= t30ago && d < today &&
        t.direction === 'out' &&
        isReal(t) &&
        (t.axis === 'SUSTAIN' || t.axis === 'LEAK')
      )
    })
    .reduce((s, t) => s + t.amount, 0)

  const trail30Income = transactions
    .filter((t) => {
      const d = new Date(t.occurred_at)
      return d >= t30ago && d < today && t.direction === 'in' && isReal(t)
    })
    .reduce((s, t) => s + t.amount, 0)

  const dailyBurn   = trail30Burn / 30
  const dailyIncome = trail30Income / 30
  const runway      = dailyBurn > 0 ? liqBal / dailyBurn : null
  const runwayTotal = dailyBurn > 0 ? totalBal / dailyBurn : null

  // ─── Current month stats ─────────────────────────────────────────────────────
  const moStart  = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthTx  = transactions.filter((t) => new Date(t.occurred_at) >= moStart)

  const incomeM = monthTx
    .filter((t) => t.direction === 'in' && isReal(t))
    .reduce((s, t) => s + t.amount, 0)

  // spentM = real burn only (SUSTAIN + LEAK). INVEST/PROTECT excluded.
  const spentM = monthTx
    .filter((t) => t.direction === 'out' && isReal(t) && (t.axis === 'SUSTAIN' || t.axis === 'LEAK'))
    .reduce((s, t) => s + t.amount, 0)

  // deployedM = INVEST + PROTECT real outflows this month
  const deployedM = monthTx
    .filter((t) => t.direction === 'out' && isReal(t) && (t.axis === 'INVEST' || t.axis === 'PROTECT'))
    .reduce((s, t) => s + t.amount, 0)

  // Transfers from LIQUID → INVESTMENT accounts count toward save rate
  const liquidIds = new Set(accounts.filter((a) => isLiquidKind(a.kind)).map((a) => a.id))
  const investIds = new Set(accounts.filter((a) => isInvestmentKind(a.kind)).map((a) => a.id))
  const transfersToInvest = monthTx
    .filter(
      (t) =>
        t.direction === 'out' &&
        t.counter_account_id !== null &&
        liquidIds.has(t.account_id) &&
        investIds.has(t.counter_account_id!)
    )
    .reduce((s, t) => s + t.amount, 0)

  const saveRate   = incomeM > 0 ? ((deployedM + transfersToInvest) / incomeM) * 100 : 0
  const investRate = incomeM > 0 ? (deployedM / incomeM) * 100 : 0

  const leakM   = monthTx
    .filter((t) => t.direction === 'out' && isReal(t) && t.axis === 'LEAK')
    .reduce((s, t) => s + t.amount, 0)
  const leakPct = spentM + deployedM > 0 ? (leakM / (spentM + deployedM)) * 100 : 0

  // ─── Axis totals helper ───────────────────────────────────────────────────────
  const axisTotals = (txs: Transaction[]): AxisTotals => {
    const out = txs.filter((t) => t.direction === 'out' && isReal(t) && t.axis)
    return {
      INVEST:  out.filter((t) => t.axis === 'INVEST').reduce((s, t) => s + t.amount, 0),
      PROTECT: out.filter((t) => t.axis === 'PROTECT').reduce((s, t) => s + t.amount, 0),
      SUSTAIN: out.filter((t) => t.axis === 'SUSTAIN').reduce((s, t) => s + t.amount, 0),
      LEAK:    out.filter((t) => t.axis === 'LEAK').reduce((s, t) => s + t.amount, 0),
    }
  }

  // ─── Period groupings ─────────────────────────────────────────────────────────
  const tomorrow = addDays(today, 1)
  const todayTx  = transactions.filter((t) => { const d = new Date(t.occurred_at); return d >= today && d < tomorrow })

  const day = today.getDay()
  const wkS = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (day === 0 ? -6 : 1 - day))
  const weekTx = transactions.filter((t) => { const d = new Date(t.occurred_at); return d >= wkS && d <= now })

  const axisToday = axisTotals(todayTx)
  const axisWeek  = axisTotals(weekTx)
  const axisMonth = axisTotals(monthTx)

  // ─── Week days breakdown ──────────────────────────────────────────────────────
  const weekDays: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d  = addDays(wkS, i)
    const de = addDays(d, 1)
    const dayTx = transactions.filter((t) => { const dt = new Date(t.occurred_at); return dt >= d && dt < de })
    return {
      date:       d,
      label:      dayLabel(d),
      spend:      dayTx.filter((t) => t.direction === 'out' && isReal(t)).reduce((s, t) => s + t.amount, 0),
      axisTotals: axisTotals(dayTx),
    }
  })

  // ─── Month days breakdown ─────────────────────────────────────────────────────
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthDays: MonthDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d  = new Date(today.getFullYear(), today.getMonth(), i + 1)
    const de = addDays(d, 1)
    const dayTx = transactions.filter((t) => { const dt = new Date(t.occurred_at); return dt >= d && dt < de })
    return {
      date:  d,
      label: String(i + 1),
      spend: dayTx.filter((t) => t.direction === 'out' && isReal(t)).reduce((s, t) => s + t.amount, 0),
    }
  })

  // ─── NW history ───────────────────────────────────────────────────────────────
  const nwHistory: NwPoint[] = Object.entries(snapshots)
    .map(([date, nw]) => ({ date, nw }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const todayKey = iso(today)
  if (!snapshots[todayKey]) nwHistory.push({ date: todayKey, nw })

  return {
    nw, nwHistory, dailyBurn, dailyIncome, liqBal, investBal, totalBal,
    runway, runwayTotal, saveRate, investRate, deployedM,
    incomeM, spentM, leakPct, axisToday, axisWeek, axisMonth,
    weekDays, monthDays,
  }
}

export const ZERO_METRICS: ComputedMetrics = {
  nw: 0, nwHistory: [], dailyBurn: 0, dailyIncome: 0, liqBal: 0, investBal: 0, totalBal: 0,
  runway: null, runwayTotal: null, saveRate: 0, investRate: 0,
  deployedM: 0, incomeM: 0, spentM: 0, leakPct: 0,
  axisToday: { ...ZERO_AXES }, axisWeek: { ...ZERO_AXES }, axisMonth: { ...ZERO_AXES },
  weekDays: [], monthDays: [],
}
