import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateCarLoan, formatCarLoanResult } from '../src/utils/carLoan.ts'
import type { CarLoanInput } from '../src/utils/carLoan.ts'

const base: CarLoanInput = {
  price: 200000, downPaymentMode: 'ratio', downPayment: 40, years: 1, feeMode: 'annual-rate', feeValue: 12,
  plan: 'standard', freeYears: 2, purchaseTax: 10000, insurance: 5000, registrationFee: 500,
}

test('首付比例与金额等价，额外费用不影响贷款或月供', () => {
  const result = calculateCarLoan(base)
  assert.deepEqual(result, calculateCarLoan({ ...base, downPaymentMode: 'amount', downPayment: 80000 }))
  assert.equal(result.principalCents, 12000000)
  assert.equal(result.schedule[0]!.paymentCents, 1120000)
  const noFees = calculateCarLoan({ ...base, purchaseTax: 0, insurance: 0, registrationFee: 0 })
  assert.deepEqual(result.schedule, noFees.schedule)
  assert.equal(result.extraCostsCents, 1550000)
  assert.equal(result.landedPriceCents, result.downPaymentCents + result.totalPaymentCents + result.extraCostsCents)
})

test('固定手续费分期每期本金和手续费不变，支持1至5年期限', () => {
  const result = calculateCarLoan(base)
  assert.equal(result.totalFeeCents, 1440000)
  assert.equal(result.totalPaymentCents, 13440000)
  assert.ok(result.schedule.every(row => row.principalCents === 1000000 && row.feeCents === 120000 && row.paymentCents === 1120000))
  for (const years of [1, 2, 3, 4, 5]) assert.equal(calculateCarLoan({ ...base, years }).months, years * 12)
})

test('贷五免二按60期均摊本金，第25期起按原始本金固定收费', () => {
  const result = calculateCarLoan({ ...base, price: 177520, downPayment: 0, years: 1, plan: 'five-two', feeValue: 3.6 })
  assert.equal(result.months, 60)
  assert.equal(result.monthlyPrincipalCents, 295867)
  assert.equal(result.waivedMonths, 24)
  assert.equal(result.chargedMonths, 36)
  assert.ok(result.schedule.slice(0, 24).every(row => row.paymentCents === 295867 && row.feeCents === 0))
  assert.ok(result.schedule.slice(24).every(row => row.feeCents === 53256))
  assert.equal(result.schedule[24]!.paymentCents, 349123)
  assert.equal(result.schedule[58]!.paymentCents, 349123)
  assert.equal(result.schedule[59]!.principalCents, 295847)
  assert.equal(result.schedule[59]!.paymentCents, 349103)
  assert.equal(result.schedule[59]!.remainingCents, 0)
  assert.equal(result.totalFeeCents, 1917216)
  assert.equal(result.totalPaymentCents, 19669216)
})

test('年费率、月费率和每期固定金额支持相同手续费口径', () => {
  const annual = calculateCarLoan({ ...base, plan: 'five-two' })
  const monthly = calculateCarLoan({ ...base, plan: 'five-two', feeMode: 'monthly-rate', feeValue: 1 })
  const fixed = calculateCarLoan({ ...base, plan: 'five-two', feeMode: 'monthly-amount', feeValue: 1200 })
  assert.deepEqual(annual.schedule, monthly.schedule)
  assert.deepEqual(annual.schedule, fixed.schedule)
  assert.equal(fixed.totalFeeCents, 120000 * 36)
})

test('2年和5年全期免手续费强制锁定期限，均摊本金', () => {
  for (const freeYears of [2, 5] as const) {
    const result = calculateCarLoan({ ...base, plan: 'interest-free', freeYears })
    assert.equal(result.months, freeYears * 12)
    assert.equal(result.feeValue, 0)
    assert.equal(result.totalFeeCents, 0)
    assert.equal(result.totalPaymentCents, result.principalCents)
    assert.ok(result.schedule.every(row => row.paymentCents === 12000000 / result.months && row.feeCents === 0))
  }
})

test('分币尾差结清，首付为零与全款均可处理', () => {
  const result = calculateCarLoan({ ...base, price: 100000.01, downPayment: 0, plan: 'interest-free', freeYears: 5 })
  assert.equal(result.schedule.reduce((sum, row) => sum + row.paymentCents, 0), 10000001)
  assert.equal(result.schedule.at(-1)!.remainingCents, 0)
  const full = calculateCarLoan({ ...base, downPayment: 100 })
  assert.equal(full.principalCents, 0)
  assert.equal(full.totalPaymentCents, 0)
  assert.equal(full.schedule.length, 0)
  assert.equal(full.landedPriceCents, full.priceCents + full.extraCostsCents)
})

test('各方案明细与汇总相等，本金清零，零费用及极小本金不出现负数', () => {
  for (const plan of ['standard', 'interest-free', 'five-two'] as const) {
    for (const price of [0.01, 100.01, 177520, 1000000000]) {
      for (const feeValue of [0, 3.6]) {
        const result = calculateCarLoan({ ...base, plan, price, downPayment: 0, feeValue })
        assert.equal(result.schedule.reduce((sum, row) => sum + row.principalCents, 0), result.principalCents)
        assert.equal(result.schedule.reduce((sum, row) => sum + row.feeCents, 0), result.totalFeeCents)
        assert.equal(result.schedule.reduce((sum, row) => sum + row.paymentCents, 0), result.totalPaymentCents)
        assert.ok(result.schedule.every(row => Number.isSafeInteger(row.paymentCents) && row.remainingCents >= 0 && row.principalCents >= 0))
        assert.equal(result.schedule.at(-1)!.remainingCents, 0)
      }
    }
  }
})

test('拒绝负数、非法金额、超额首付及无效期限费率', () => {
  for (const field of ['price', 'downPayment', 'feeValue', 'purchaseTax', 'insurance', 'registrationFee'] as const) {
    for (const value of [-1, NaN, Infinity]) assert.throws(() => calculateCarLoan({ ...base, [field]: value }))
  }
  assert.throws(() => calculateCarLoan({ ...base, price: 0 }))
  assert.throws(() => calculateCarLoan({ ...base, purchaseTax: 1.001 }))
  assert.throws(() => calculateCarLoan({ ...base, downPayment: 101 }))
  assert.throws(() => calculateCarLoan({ ...base, downPaymentMode: 'amount', downPayment: 200001 }))
  assert.throws(() => calculateCarLoan({ ...base, feeValue: 101 }))
  assert.throws(() => calculateCarLoan({ ...base, feeMode: 'monthly-amount', feeValue: 1.001 }))
  for (const years of [0, 1.5, 6, NaN]) assert.throws(() => calculateCarLoan({ ...base, years }))
})

test('复制文本包含方案、费用口径与结果', () => {
  const text = formatCarLoanResult(calculateCarLoan({ ...base, plan: 'interest-free', freeYears: 2 }))
  assert.match(text, /2年免息/)
  assert.match(text, /首期月供：5,000.00 元/)
  assert.match(text, /总手续费：0.00 元/)
  assert.match(text, /额外落地成本：15,500.00 元/)
  assert.match(text, /车辆落地总价：215,500.00 元/)
  assert.match(text, /仅估算，实际以金融机构方案为准/)
  const phased = formatCarLoanResult(calculateCarLoan({ ...base, plan: 'five-two' }))
  assert.match(phased, /第1～24期月供：2,000.00 元/)
  assert.match(phased, /第25～60期月供：3,200.00 元/)
  assert.match(phased, /手续费基数：原始贷款本金 120,000.00 元/)
  assert.doesNotMatch(phased, /利息|等额本息|等额本金/)
})
