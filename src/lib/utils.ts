// Format KES — compact for large numbers, always JetBrains Mono in UI
export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${abs.toFixed(0)}`
}

// Format KES — full precision with commas
export function fmtX(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

// ISO date string YYYY-MM-DD from a Date
export function iso(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Start of today (midnight local)
export function todayLocal(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Start of current week (Monday)
export function weekStart(offset = 0): Date {
  const d = todayLocal()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const ws = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return addDays(ws, offset * 7)
}

// Start of a month
export function monthStart(monthOffset = 0): Date {
  const d = todayLocal()
  return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1)
}

// Start of a year
export function yearStart(yearOffset = 0): Date {
  return new Date(todayLocal().getFullYear() + yearOffset, 0, 1)
}

// Start of a quarter
export function quarterStart(quarterOffset = 0): Date {
  const d = todayLocal()
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), (q + quarterOffset) * 3, 1)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 864e5)
}

export function dayLabel(d: Date): string {
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()]
}

export function shortMonthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

// Unique ID — crypto.randomUUID with fallback
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
