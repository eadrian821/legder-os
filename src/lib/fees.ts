type FeeFn = (amount: number) => number

// Safaricom M-Pesa tariff bands (KES), effective 2024
const mpesaWithdrawal: FeeFn = (n) => {
  if (n <= 100)    return 0
  if (n <= 2500)   return 30
  if (n <= 3500)   return 45
  if (n <= 5000)   return 60
  if (n <= 7500)   return 75
  if (n <= 10000)  return 85
  if (n <= 15000)  return 105
  if (n <= 20000)  return 105
  if (n <= 35000)  return 105
  if (n <= 50000)  return 105
  if (n <= 150000) return 105
  if (n <= 250000) return 105
  return 105
}

const mpesaToMpesa: FeeFn = (n) => {
  if (n <= 100)    return 0
  if (n <= 2500)   return 15
  if (n <= 3500)   return 25
  if (n <= 5000)   return 30
  if (n <= 7500)   return 45
  if (n <= 10000)  return 60
  if (n <= 15000)  return 75
  if (n <= 20000)  return 85
  if (n <= 35000)  return 95
  if (n <= 50000)  return 100
  if (n <= 150000) return 105
  if (n <= 250000) return 110
  return 110
}

const bankToMpesa: FeeFn = (n) => {
  if (n <= 100)    return 0
  if (n <= 2500)   return 30
  if (n <= 5000)   return 50
  if (n <= 10000)  return 75
  if (n <= 20000)  return 85
  if (n <= 35000)  return 95
  if (n <= 50000)  return 100
  if (n <= 150000) return 105
  return 110
}

const bankToBank: FeeFn = (n) => {
  if (n <= 1000)   return 0
  if (n <= 5000)   return 33
  if (n <= 10000)  return 50
  if (n <= 20000)  return 75
  if (n <= 50000)  return 100
  return 100
}

const mpesaPaybill: FeeFn = (n) => {
  if (n <= 100)   return 0
  if (n <= 2500)  return 0
  if (n <= 5000)  return 0
  if (n <= 10000) return 0
  if (n <= 20000) return 0
  return 0
}

export type TransferRoute =
  | 'mpesa-mpesa'
  | 'bank-mpesa'
  | 'mpesa-bank'
  | 'bank-bank'
  | 'mpesa-paybill'
  | 'mpesa-withdrawal'

export const transferFee: Record<TransferRoute, FeeFn> = {
  'mpesa-mpesa':      mpesaToMpesa,
  'bank-mpesa':       bankToMpesa,
  'mpesa-bank':       bankToMpesa,
  'bank-bank':        bankToBank,
  'mpesa-paybill':    mpesaPaybill,
  'mpesa-withdrawal': mpesaWithdrawal,
}

export function getFee(route: TransferRoute, amount: number): number {
  return transferFee[route](amount)
}
