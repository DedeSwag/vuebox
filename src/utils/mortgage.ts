import { calculateLoan } from './loan.ts'
import type { LoanMethod } from './loan.ts'

export interface MortgageInput {
  principal: number
  years: number
  annualRate: number
  method: LoanMethod
}

export function calculateMortgage(input: MortgageInput) {
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > 30) {
    throw new Error('贷款年限需为 1～30 的整数。')
  }
  const loan = calculateLoan({ principal: input.principal, term: input.years, termUnit: 'year', annualRate: input.annualRate, method: input.method })
  return {
    ...loan,
    method: input.method,
    annualRate: input.annualRate,
    // 理论月供递减额 = 每月本金 × 月利率，逐期实际差额可能因分币舍入略有不同。
    monthlyDecreaseCents: input.method === 'equal-principal'
      ? Math.round(loan.principalCents / loan.months * input.annualRate / 1200)
      : null,
  }
}
