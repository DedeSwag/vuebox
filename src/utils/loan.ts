export type LoanMethod = 'equal-payment' | 'equal-principal'
export type LoanTermUnit = 'year' | 'month'

export interface LoanInput {
  principal: number
  term: number
  termUnit: LoanTermUnit
  annualRate: number
  method: LoanMethod
}

/** 所有金额使用整数分，确保汇总与逐期明细一致。 */
export interface LoanPayment {
  period: number
  paymentCents: number
  principalCents: number
  interestCents: number
  remainingCents: number
}

export function calculateLoan(input: LoanInput) {
  const { principal, term, termUnit, annualRate, method } = input
  const principalCents = Math.round(principal * 100)
  if (!Number.isFinite(principal) || principal < 0.01 || principal > 1_000_000_000
    || Math.abs(principal * 100 - principalCents) > 0.0001) {
    throw new Error('贷款本金需在 0.01～1,000,000,000 元之间，最多保留两位小数。')
  }
  if (termUnit !== 'year' && termUnit !== 'month') throw new Error('请选择年或月作为期限单位。')
  const rawMonths = term * (termUnit === 'year' ? 12 : 1)
  const months = Math.round(rawMonths)
  if (!Number.isFinite(term) || months < 1 || months > 600 || Math.abs(rawMonths - months) > 1e-8) {
    throw new Error('贷款期限需折合为 1～600 个整月（最多 50 年）。')
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    throw new Error('年利率需在 0%～100% 之间。')
  }
  if (method !== 'equal-payment' && method !== 'equal-principal') throw new Error('请选择有效的还款方式。')

  const monthlyRate = annualRate / 1200
  // log1p / expm1 避免极小利率下 (1 + r)^n - 1 的精度损失。
  const fixedPayment = Math.round(monthlyRate === 0
    ? principalCents / months
    : principalCents * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate)))
  const fixedPrincipal = Math.floor(principalCents / months)
  const principalRemainder = principalCents % months
  let remainingCents = principalCents
  let totalInterestCents = 0
  const schedule: LoanPayment[] = []
  for (let period = 1; period <= months; period++) {
    const interestCents = Math.round(remainingCents * monthlyRate)
    const plannedPrincipal = method === 'equal-payment'
      ? Math.max(0, fixedPayment - interestCents)
      : fixedPrincipal + (period <= principalRemainder ? 1 : 0)
    const paidPrincipal = period === months ? remainingCents : Math.min(remainingCents, plannedPrincipal)
    remainingCents -= paidPrincipal
    totalInterestCents += interestCents
    schedule.push({ period, paymentCents: paidPrincipal + interestCents, principalCents: paidPrincipal, interestCents, remainingCents })
  }
  return { months, principalCents, totalInterestCents, totalPaymentCents: principalCents + totalInterestCents, schedule }
}
