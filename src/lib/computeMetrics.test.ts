import { describe, it, expect } from 'vitest'
import { computeMetrics } from './computeMetrics'
import type { Account, Transaction } from '@/types/ledger'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> & Pick<Account, 'id' | 'kind'>): Account {
  return {
    user_id: 'u1',
    name: overrides.id,
    opening_balance: 0,
    currency: 'KES',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

let txSeq = 0
function makeTx(overrides: Partial<Transaction> & Pick<Transaction, 'account_id' | 'amount' | 'direction'>): Transaction {
  txSeq++
  return {
    id: `tx-${txSeq}`,
    user_id: 'u1',
    occurred_at: new Date().toISOString(),
    description: 'test',
    axis: null,
    category_id: null,
    counter_account_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString()
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const operating: Account  = makeAccount({ id: 'op',   kind: 'operating',   opening_balance: 50_000 })
const buffer: Account     = makeAccount({ id: 'buf',  kind: 'buffer',      opening_balance: 20_000 })
const mmf: Account        = makeAccount({ id: 'mmf',  kind: 'compound',    opening_balance: 100_000 })
const icMarkets: Account  = makeAccount({ id: 'ic',   kind: 'speculation', opening_balance: 30_000 })
const cash: Account       = makeAccount({ id: 'cash', kind: 'cash',        opening_balance: 5_000 })

const ALL_ACCOUNTS = [operating, buffer, mmf, icMarkets, cash]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeMetrics — account balances', () => {
  it('liqBal = operating + buffer + cash balances only', () => {
    const m = computeMetrics(ALL_ACCOUNTS, [], {})
    // opening balances only: 50k + 20k + 5k = 75k
    expect(m.liqBal).toBe(75_000)
  })

  it('investBal = compound + speculation only', () => {
    const m = computeMetrics(ALL_ACCOUNTS, [], {})
    // 100k + 30k = 130k
    expect(m.investBal).toBe(130_000)
  })

  it('nw = sum of all account balances', () => {
    const m = computeMetrics(ALL_ACCOUNTS, [], {})
    expect(m.nw).toBe(205_000)
  })

  it('transactions affect balances correctly', () => {
    const txs: Transaction[] = [
      makeTx({ account_id: 'op', amount: 10_000, direction: 'in',  axis: null }), // income
      makeTx({ account_id: 'op', amount: 3_000,  direction: 'out', axis: 'SUSTAIN' }), // expense
    ]
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    // operating: 50k + 10k - 3k = 57k; liqBal = 57k + 20k + 5k = 82k
    expect(m.liqBal).toBe(82_000)
    expect(m.nw).toBe(212_000)
  })
})

describe('computeMetrics — transfer rules', () => {
  it('transfer legs do NOT affect burn rate, save rate, or axis totals', () => {
    // Transfer KES 10,000 from operating to MMF (both legs have counter_account_id)
    const txs: Transaction[] = [
      makeTx({ account_id: 'op',  amount: 10_000, direction: 'out', counter_account_id: 'mmf', axis: null }),
      makeTx({ account_id: 'mmf', amount: 10_000, direction: 'in',  counter_account_id: 'op',  axis: null }),
    ]
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    // No real income, no real spend
    expect(m.incomeM).toBe(0)
    expect(m.spentM).toBe(0)
    expect(m.deployedM).toBe(0)
    expect(m.dailyBurn).toBe(0)
    expect(m.axisMonth).toEqual({ INVEST: 0, PROTECT: 0, SUSTAIN: 0, LEAK: 0 })
  })

  it('transfer legs DO affect account balances', () => {
    const txs: Transaction[] = [
      makeTx({ account_id: 'op',  amount: 10_000, direction: 'out', counter_account_id: 'mmf', axis: null }),
      makeTx({ account_id: 'mmf', amount: 10_000, direction: 'in',  counter_account_id: 'op',  axis: null }),
    ]
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    // operating: 50k - 10k = 40k; mmf: 100k + 10k = 110k
    expect(m.liqBal).toBe(65_000)   // 40k + 20k + 5k
    expect(m.investBal).toBe(140_000) // 110k + 30k
    expect(m.nw).toBe(205_000)       // unchanged — just moved money
  })

  it('LIQUID→INVESTMENT transfer counts toward save rate', () => {
    const income = makeTx({ account_id: 'op', amount: 100_000, direction: 'in', axis: null })
    const transfer = makeTx({ account_id: 'op', amount: 20_000, direction: 'out', counter_account_id: 'mmf', axis: null })
    const transferIn = makeTx({ account_id: 'mmf', amount: 20_000, direction: 'in', counter_account_id: 'op', axis: null })
    const m = computeMetrics(ALL_ACCOUNTS, [income, transfer, transferIn], {})
    // saveRate = (deployedM + transfersToInvest) / incomeM = (0 + 20k) / 100k = 20%
    expect(m.saveRate).toBeCloseTo(20)
    expect(m.incomeM).toBe(100_000)
  })

  it('KES 56 transfer fee is a real LEAK expense (no counter_account_id)', () => {
    const fee = makeTx({ account_id: 'op', amount: 56, direction: 'out', axis: 'LEAK', counter_account_id: null })
    const m = computeMetrics(ALL_ACCOUNTS, [fee], {})
    expect(m.axisMonth.LEAK).toBe(56)
    expect(m.spentM).toBe(56)
  })
})

describe('computeMetrics — runway', () => {
  it('runway = liqBal / dailyBurn using trailing 30 days ÷ 30', () => {
    // 30 days of SUSTAIN+LEAK totalling 30,000 → dailyBurn = 1,000
    const txs = Array.from({ length: 30 }, (_, i) =>
      makeTx({
        account_id: 'op',
        amount: 1_000,
        direction: 'out',
        axis: 'SUSTAIN',
        occurred_at: daysAgo(i + 1),
      })
    )
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    expect(m.dailyBurn).toBeCloseTo(1_000)
    // liqBal = 75k - 30k = 45k; runway = 45k / 1k = 45 days
    expect(m.runway).toBeCloseTo(45)
  })

  it('runway always divides by 30, not daysElapsed', () => {
    // Only 10 days of data — still divided by 30
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ account_id: 'op', amount: 1_000, direction: 'out', axis: 'SUSTAIN', occurred_at: daysAgo(i + 1) })
    )
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    expect(m.dailyBurn).toBeCloseTo(10_000 / 30)
  })

  it('runway is null when dailyBurn is zero', () => {
    const m = computeMetrics(ALL_ACCOUNTS, [], {})
    expect(m.runway).toBeNull()
    expect(m.runwayTotal).toBeNull()
  })

  it('runwayTotal includes investBal', () => {
    const txs = Array.from({ length: 30 }, (_, i) =>
      makeTx({ account_id: 'op', amount: 1_000, direction: 'out', axis: 'SUSTAIN', occurred_at: daysAgo(i + 1) })
    )
    const m = computeMetrics(ALL_ACCOUNTS, txs, {})
    // totalBal = 75k - 30k + 130k = 175k; runwayTotal = 175k / 1k = 175 days
    expect(m.runwayTotal).toBeCloseTo(175)
  })
})

describe('computeMetrics — save rate', () => {
  it('INVEST axis expenses count toward save rate', () => {
    const income  = makeTx({ account_id: 'op', amount: 100_000, direction: 'in',  axis: null })
    const invest  = makeTx({ account_id: 'op', amount: 10_000,  direction: 'out', axis: 'INVEST' })
    const protect = makeTx({ account_id: 'op', amount: 5_000,   direction: 'out', axis: 'PROTECT' })
    const m = computeMetrics(ALL_ACCOUNTS, [income, invest, protect], {})
    // saveRate = (10k + 5k) / 100k = 15%
    expect(m.saveRate).toBeCloseTo(15)
    expect(m.deployedM).toBe(15_000)
  })

  it('SUSTAIN and LEAK never count toward save rate', () => {
    const income  = makeTx({ account_id: 'op', amount: 100_000, direction: 'in',  axis: null })
    const sustain = makeTx({ account_id: 'op', amount: 40_000,  direction: 'out', axis: 'SUSTAIN' })
    const leak    = makeTx({ account_id: 'op', amount: 10_000,  direction: 'out', axis: 'LEAK' })
    const m = computeMetrics(ALL_ACCOUNTS, [income, sustain, leak], {})
    expect(m.saveRate).toBeCloseTo(0)
    expect(m.spentM).toBe(50_000)
    expect(m.deployedM).toBe(0)
  })

  it('save rate is 0 when incomeM is 0', () => {
    const m = computeMetrics(ALL_ACCOUNTS, [], {})
    expect(m.saveRate).toBe(0)
  })
})

describe('computeMetrics — burn rate', () => {
  it('burn = SUSTAIN + LEAK only', () => {
    const income  = makeTx({ account_id: 'op', amount: 100_000, direction: 'in',  axis: null })
    const sustain = makeTx({ account_id: 'op', amount: 30_000,  direction: 'out', axis: 'SUSTAIN' })
    const leak    = makeTx({ account_id: 'op', amount: 5_000,   direction: 'out', axis: 'LEAK' })
    const invest  = makeTx({ account_id: 'op', amount: 20_000,  direction: 'out', axis: 'INVEST' })
    const m = computeMetrics(ALL_ACCOUNTS, [income, sustain, leak, invest], {})
    expect(m.spentM).toBe(35_000) // SUSTAIN + LEAK
    expect(m.deployedM).toBe(20_000)
  })

  it('INVEST and PROTECT outflows are excluded from burn', () => {
    const invest  = makeTx({ account_id: 'op', amount: 50_000, direction: 'out', axis: 'INVEST',  occurred_at: daysAgo(5) })
    const protect = makeTx({ account_id: 'op', amount: 10_000, direction: 'out', axis: 'PROTECT', occurred_at: daysAgo(5) })
    const m = computeMetrics(ALL_ACCOUNTS, [invest, protect], {})
    // dailyBurn is from trailing 30-day SUSTAIN+LEAK — should be 0
    expect(m.dailyBurn).toBe(0)
  })
})

describe('computeMetrics — leak%', () => {
  it('leakPct = leak / (spentM + deployedM)', () => {
    const income  = makeTx({ account_id: 'op', amount: 100_000, direction: 'in',  axis: null })
    const sustain = makeTx({ account_id: 'op', amount: 40_000,  direction: 'out', axis: 'SUSTAIN' })
    const leak    = makeTx({ account_id: 'op', amount: 10_000,  direction: 'out', axis: 'LEAK' })
    const invest  = makeTx({ account_id: 'op', amount: 50_000,  direction: 'out', axis: 'INVEST' })
    const m = computeMetrics(ALL_ACCOUNTS, [income, sustain, leak, invest], {})
    // leakPct = 10k / (50k + 50k) = 10%
    expect(m.leakPct).toBeCloseTo(10)
  })
})
