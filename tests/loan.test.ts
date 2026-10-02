import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateLoan } from '../src/utils/loan.ts'
import type { LoanInput } from '../src/utils/loan.ts'

const base: LoanInput = { principal: 120000, term: 1, termUnit: 'year', annualRate: 12, method: 'equal-payment' }

test('等额本息按月计息，常规月供正确且末期结清', () => {
  const result = calculateLoan(base)
  assert.equal(result.months, 12)
  assert.equal(result.schedule[0]!.paymentCents, 1066185)
  assert.equal(result.schedule[0]!.interestCents, 120000)
  assert.equal(result.schedule[0]!.principalCents, 946185)
  assert.ok(result.schedule.slice(0, -1).every(row => row.paymentCents === 1066185))
  assert.equal(result.schedule.at(-1)!.remainingCents, 0)
})

test('等额本金逐期递减，利息总额符合等差数列', () => {
  const result = calculateLoan({ ...base, method: 'equal-principal' })
  assert.equal(result.schedule[0]!.paymentCents, 1120000)
  assert.equal(result.schedule.at(-1)!.paymentCents, 1010000)
  assert.equal(result.totalInterestCents, 780000)
  assert.equal(result.totalPaymentCents, 12780000)
  assert.ok(result.schedule.every(row => row.principalCents === 1000000))
})

test('年/月等价，支持折合整月的小数年和单期贷款', () => {
  assert.deepEqual(calculateLoan(base), calculateLoan({ ...base, term: 12, termUnit: 'month' }))
  assert.equal(calculateLoan({ ...base, term: 1.5 }).months, 18)
  const one = calculateLoan({ ...base, term: 1, termUnit: 'month' })
  assert.equal(one.totalPaymentCents, 12120000)
})

test('零利率、极小利率、分币尾差和最长周期的明细与汇总一致', () => {
  for (const method of ['equal-payment', 'equal-principal'] as const) {
    for (const principal of [0.01, 100.01, 100000, 1000000000]) {
      for (const annualRate of [0, 1e-10, 4.8, 100]) {
        const result = calculateLoan({ principal, annualRate, method, term: 600, termUnit: 'month' })
        let remaining = result.principalCents
        for (const row of result.schedule) {
          assert.ok(Number.isSafeInteger(row.paymentCents) && row.paymentCents >= 0)
          assert.equal(row.paymentCents, row.principalCents + row.interestCents)
          remaining -= row.principalCents
          assert.equal(row.remainingCents, remaining)
          assert.ok(remaining >= 0)
        }
        assert.equal(remaining, 0)
        assert.equal(result.schedule.reduce((sum, row) => sum + row.paymentCents, 0), result.totalPaymentCents)
        assert.equal(result.schedule.reduce((sum, row) => sum + row.interestCents, 0), result.totalInterestCents)
        if (annualRate === 0) assert.equal(result.totalInterestCents, 0)
      }
    }
  }
})

test('拒绝无效本金、期限及利率，避免产生错误还款计划', () => {
  for (const principal of [NaN, Infinity, 0, -1, 1.001, 1000000001]) assert.throws(() => calculateLoan({ ...base, principal }))
  for (const term of [NaN, Infinity, 0, -1, 0.1, 51]) assert.throws(() => calculateLoan({ ...base, term }))
  assert.throws(() => calculateLoan({ ...base, term: 1.5, termUnit: 'month' }))
  for (const annualRate of [NaN, Infinity, -1, 101]) assert.throws(() => calculateLoan({ ...base, annualRate }))
})
