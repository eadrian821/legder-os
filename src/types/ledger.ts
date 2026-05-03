import type { Axis } from '@/constants/axes'
import type { AccountKind } from '@/constants/accounts'

export interface Account {
  id: string
  user_id: string
  name: string
  kind: AccountKind
  opening_balance: number
  currency: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  occurred_at: string
  description: string
  amount: number
  direction: 'in' | 'out'
  axis: Axis | null
  category_id: string | null
  counter_account_id: string | null
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  axis: Axis
  color: string | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string | null
  axis: Axis | null
  limit_amount: number
  period: 'weekly' | 'monthly'
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  priority: number
  is_complete: boolean
  created_at: string
}

export interface Recurring {
  id: string
  user_id: string
  account_id: string
  description: string
  amount: number
  direction: 'in' | 'out'
  axis: Axis | null
  category_id: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_date: string
  is_active: boolean
  created_at: string
}

export interface Snapshot {
  id: string
  user_id: string
  account_id: string
  date: string
  balance: number
}

export interface TransferFeeRoute {
  route: string
  fee: (amount: number) => number
}

export interface AuditPeriod {
  label: string
  start: Date
  end: Date
  mode: 'month' | 'quarter' | 'year'
  offset: number
}

export interface AxisTotals {
  INVEST: number
  PROTECT: number
  SUSTAIN: number
  LEAK: number
}

export interface PeriodSummary {
  period: AuditPeriod
  income: number
  spend: number
  deployed: number
  saveRate: number
  burnRate: number
  axisTotals: AxisTotals
  txCount: number
}

export interface WeekDay {
  date: Date
  label: string
  spend: number
  axisTotals: AxisTotals
}

export interface MonthDay {
  date: Date
  label: string
  spend: number
}

export interface NwPoint {
  date: string
  nw: number
}

export interface ComputedMetrics {
  nw: number
  nwHistory: NwPoint[]
  dailyBurn: number
  dailyIncome: number   // trailing 30-day real income / 30
  liqBal: number
  investBal: number
  totalBal: number
  runway: number | null
  runwayTotal: number | null
  saveRate: number
  investRate: number
  deployedM: number
  incomeM: number
  spentM: number
  leakPct: number
  axisToday: AxisTotals
  axisWeek: AxisTotals
  axisMonth: AxisTotals
  weekDays: WeekDay[]
  monthDays: MonthDay[]
}

export interface OfflineQueueItem {
  lid: string
  payload: Omit<Transaction, 'id' | 'created_at'> & { id: string }
  created_at: string
}
