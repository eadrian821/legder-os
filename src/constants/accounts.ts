export type AccountKind =
  | 'operating'
  | 'buffer'
  | 'cash'
  | 'compound'
  | 'speculation'
  | 'credit'
  | 'wallet'

export const LIQUID_KINDS: AccountKind[] = ['operating', 'buffer', 'cash']
export const INVESTMENT_KINDS: AccountKind[] = ['compound', 'speculation']

export const isLiquidKind = (kind: AccountKind) => LIQUID_KINDS.includes(kind)
export const isInvestmentKind = (kind: AccountKind) => INVESTMENT_KINDS.includes(kind)

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  operating:   'Operating',
  buffer:      'Buffer',
  cash:        'Cash',
  compound:    'Compound',
  speculation: 'Speculation',
  credit:      'Credit',
  wallet:      'Wallet',
}
