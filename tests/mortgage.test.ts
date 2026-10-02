import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMortgage } from '../src/utils/mortgage.ts'
import type { MortgageInput } from '../src/utils/mortgage.ts'

const base: MortgageInput = { principal: 1200000, years: 20, annualRate: 4.8, method: 'equal-principal' }

test('房贷等额本金首末月供、递减金额与利息符合公式', () => {
  const result = calculateMortgage(base)
  assert.equal(result.months, 240)
  assert.equal(result.schedule[0]!.paymentCents, 980000)
  assert.equal(result.schedule.at(-1)!.paymentCents, 502000)
  assert.equal(result.monthlyDecreaseCents, 2000)
  assert.equal(result.totalInterestCents, 57840000)
  assert.equal(result.totalPaymentCents, 177840000)
  assert.ok(result.schedule.slice(1).every((row, index) => result.schedule[index]!.paymentCents - row.paymentCents === 2000))
})

test('等额本息月供固定，末期结清，无递减金额', () => {
  const result = calculateMortgage({ principal: 120000, years: 1, annualRate: 12, method: 'equal-payment' })
  assert.equal(result.monthlyDecreaseCents, null)
  assert.ok(result.schedule.slice(0, -1).every(row => row.paymentCents === 1066185))
  assert.equal(result.schedule.at(-1)!.remainingCents, 0)
  assert.equal(result.schedule.reduce((sum, row) => sum + row.paymentCents, 0), result.totalPaymentCents)
})

test('支持零利率、30年及分币舍入，明细与汇总一致', () => {
  for (const method of ['equal-payment', 'equal-principal'] as const) {
    for (const annualRate of [0, 3.6]) {
      const result = calculateMortgage({ ...base, principal: 1000000.01, years: 30, annualRate, method })
      assert.equal(result.months, 360)
      assert.equal(result.schedule.reduce((sum, row) => sum + row.principalCents, 0), 100000001)
      assert.equal(result.schedule.reduce((sum, row) => sum + row.interestCents, 0), result.totalInterestCents)
      assert.equal(result.schedule.at(-1)!.remainingCents, 0)
      if (annualRate === 0) {
        assert.equal(result.totalInterestCents, 0)
        if (method === 'equal-principal') assert.equal(result.monthlyDecreaseCents, 0)
      }
    }
  }
})

test('拒绝负数、非数字和超出范围的年限与利率', () => {
  for (const years of [-1, 0, 1.5, 31, NaN, Infinity]) assert.throws(() => calculateMortgage({ ...base, years }), /年限/)
  for (const annualRate of [-1, 101, NaN, Infinity]) assert.throws(() => calculateMortgage({ ...base, annualRate }), /年利率/)
  for (const principal of [-1, 0, NaN, Infinity, 1.001]) assert.throws(() => calculateMortgage({ ...base, principal }), /本金/)
})
