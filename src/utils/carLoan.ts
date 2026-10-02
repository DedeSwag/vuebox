export type CarLoanPlan = 'standard' | 'interest-free' | 'five-two'
export type CarLoanFeeMode = 'annual-rate' | 'monthly-rate' | 'monthly-amount'

export interface CarLoanInput {
  price: number
  downPaymentMode: 'ratio' | 'amount'
  downPayment: number
  years: number
  plan: CarLoanPlan
  freeYears: 2 | 5
  feeMode: CarLoanFeeMode
  feeValue: number
  purchaseTax: number
  insurance: number
  registrationFee: number
}

export interface CarLoanPayment {
  period: number
  paymentCents: number
  principalCents: number
  feeCents: number
  remainingCents: number
}

function toCents(value: number, label: string) {
  const cents = Math.round(value * 100)
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000 || Math.abs(value * 100 - cents) > 0.0001) {
    throw new Error(`${label}需在 0～1,000,000,000 元之间，最多保留两位小数。`)
  }
  return cents
}

export function calculateCarLoan(input: CarLoanInput) {
  const priceCents = toCents(input.price, '车辆总价')
  if (priceCents === 0) throw new Error('车辆总价需大于 0。')
  if (input.downPaymentMode !== 'ratio' && input.downPaymentMode !== 'amount') throw new Error('请选择首付输入方式。')
  let downPaymentCents: number
  if (input.downPaymentMode === 'ratio') {
    if (!Number.isFinite(input.downPayment) || input.downPayment < 0 || input.downPayment > 100) {
      throw new Error('首付比例需在 0%～100% 之间。')
    }
    downPaymentCents = Math.round(priceCents * input.downPayment / 100)
  } else {
    downPaymentCents = toCents(input.downPayment, '首付金额')
  }
  if (downPaymentCents > priceCents) throw new Error('首付金额不能超过车辆总价。')
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > 5) throw new Error('贷款年限请选择 1～5 年。')
  if (input.freeYears !== 2 && input.freeYears !== 5) throw new Error('免息期请选择 2 年或 5 年。')
  if (!['standard', 'interest-free', 'five-two'].includes(input.plan)) throw new Error('请选择有效的分期方案。')
  if (!['annual-rate', 'monthly-rate', 'monthly-amount'].includes(input.feeMode)) throw new Error('请选择手续费输入方式。')
  if (input.feeMode === 'monthly-amount') toCents(input.feeValue, '每期手续费')
  else if (!Number.isFinite(input.feeValue) || input.feeValue < 0 || input.feeValue > 100) throw new Error('手续费率需在 0%～100% 之间。')
  const purchaseTaxCents = toCents(input.purchaseTax, '购置税')
  const insuranceCents = toCents(input.insurance, '保险')
  const registrationFeeCents = toCents(input.registrationFee, '上牌费')
  const extraCostsCents = purchaseTaxCents + insuranceCents + registrationFeeCents
  const principalCents = priceCents - downPaymentCents
  const years = input.plan === 'five-two' ? 5 : input.plan === 'interest-free' ? input.freeYears : input.years
  const months = principalCents === 0 ? 0 : years * 12
  const waivedMonths = input.plan === 'interest-free' ? months : input.plan === 'five-two' ? Math.min(24, months) : 0
  // 手续费始终按原始贷款总额计算，与每期剩余本金无关。
  const monthlyFeeCents = !principalCents || input.plan === 'interest-free' ? 0 : input.feeMode === 'monthly-amount'
    ? toCents(input.feeValue, '每期手续费')
    : Math.round(principalCents * input.feeValue / (input.feeMode === 'annual-rate' ? 1200 : 100))
  const monthlyPrincipalCents = months ? Math.round(principalCents / months) : 0
  const schedule: CarLoanPayment[] = []
  let remainingCents = principalCents
  for (let period = 1; period <= months; period++) {
    const paidPrincipal = period === months ? remainingCents : Math.min(monthlyPrincipalCents, remainingCents)
    const feeCents = period <= waivedMonths ? 0 : monthlyFeeCents
    remainingCents -= paidPrincipal
    schedule.push({ period, principalCents: paidPrincipal, feeCents, paymentCents: paidPrincipal + feeCents, remainingCents })
  }
  const chargedMonths = months - waivedMonths
  const totalFeeCents = monthlyFeeCents * chargedMonths
  return {
    months, principalCents, schedule, monthlyPrincipalCents, monthlyFeeCents, waivedMonths, chargedMonths, totalFeeCents,
    totalPaymentCents: principalCents + totalFeeCents,
    priceCents, downPaymentCents, purchaseTaxCents, insuranceCents, registrationFeeCents, extraCostsCents,
    years, plan: input.plan, feeMode: input.feeMode, feeValue: input.plan === 'interest-free' ? 0 : input.feeValue,
    landedPriceCents: priceCents + extraCostsCents + totalFeeCents,
  }
}

export type CarLoanResult = ReturnType<typeof calculateCarLoan>
export const formatCarMoney = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatCarLoanResult(result: CarLoanResult) {
  const money = (cents: number) => `${formatCarMoney(cents)} 元`
  const first = result.schedule[0]?.paymentCents ?? 0
  const last = result.schedule.at(-1)?.paymentCents ?? 0
  return [
    '车贷计算结果',
    `方案：${result.plan === 'five-two' ? '贷五免二（前24期免手续费）' : result.plan === 'interest-free' ? `${result.years}年免息（全期免手续费）` : '固定手续费分期'}`,
    `贷款期限：${result.months} 期`,
    `车辆总价：${money(result.priceCents)}`,
    `首付金额：${money(result.downPaymentCents)}`,
    `贷款本金：${money(result.principalCents)}`,
    `每期本金：${money(result.monthlyPrincipalCents)}（末期调整分币尾差）`,
    `首期月供：${money(first)}；末期月供：${money(last)}`,
    ...(result.plan === 'five-two' && result.months ? [
      `第1～24期月供：${money(first)}，免手续费`,
      `第25～60期月供：${money(result.schedule[24]!.paymentCents)}（末期调整尾差）`,
    ] : []),
    `收费期每期固定手续费：${money(result.monthlyFeeCents)}，共收取 ${result.chargedMonths} 期`,
    ...(result.feeMode !== 'monthly-amount' ? [`手续费基数：原始贷款本金 ${money(result.principalCents)}；${result.feeMode === 'annual-rate' ? '年' : '月'}手续费率：${result.feeValue}%`] : []),
    `总手续费：${money(result.totalFeeCents)}`,
    `贷款总还款额：${money(result.totalPaymentCents)}`,
    `购置税：${money(result.purchaseTaxCents)}；保险：${money(result.insuranceCents)}；上牌费：${money(result.registrationFeeCents)}`,
    `额外落地成本：${money(result.extraCostsCents)}（不计入贷款本金）`,
    `车辆落地总价：${money(result.landedPriceCents)}（含额外费用及分期手续费）`,
    '仅估算，实际以金融机构方案为准。',
  ].join('\n')
}
