import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateIncomeTax, comprehensiveTax, formatIncomeTaxResult, incomeTaxBrackets } from '../src/utils/incomeTax.ts'
import type { IncomeTaxInput } from '../src/utils/incomeTax.ts'

const base: IncomeTaxInput = {
  mode: 'monthly', monthlyIncome: 20000, monthlyInsurance: 2000, monthlyBasicDeduction: 5000,
  monthlyAdditionalDeduction: 1000, month: 1, annualPrepaid: 0, annualMedicalDeduction: 0,
}

test('七档税率及速算扣除数，边界上下逐分按累进税额计算', () => {
  const boundaryTaxes = [1080, 11880, 43080, 73080, 145080, 250080]
  incomeTaxBrackets.slice(0, -1).forEach((bracket, index) => {
    const threshold = bracket.upper * 100
    assert.equal(comprehensiveTax(threshold).taxCents, boundaryTaxes[index]! * 100)
    assert.equal(comprehensiveTax(threshold).bracket.rate, bracket.rate)
    assert.equal(comprehensiveTax(threshold + 1).bracket.rate, incomeTaxBrackets[index + 1]!.rate)
    assert.ok(comprehensiveTax(threshold - 1).taxCents <= comprehensiveTax(threshold).taxCents)
    assert.ok(comprehensiveTax(threshold + 1).taxCents >= comprehensiveTax(threshold).taxCents)
  })
  assert.equal(comprehensiveTax(100000000).taxCents, 26808000)
  assert.equal(comprehensiveTax(0).taxCents, 0)
})

test('月度累计预扣跨档：第4月税额提高，不重复扣除计税减除额', () => {
  const first = calculateIncomeTax(base)
  assert.equal(first.mode, 'monthly')
  if (first.mode !== 'monthly') return
  assert.equal(first.monthlyDeductionCents, 800000)
  assert.equal(first.taxableCents, 1200000)
  assert.equal(first.currentTaxCents, 36000)
  assert.equal(first.takeHomeCents, 1764000)
  const fourth = calculateIncomeTax({ ...base, month: 4 })
  if (fourth.mode !== 'monthly') return
  assert.equal(fourth.taxableCents, 4800000)
  assert.equal(fourth.cumulativeTaxCents, 228000)
  assert.equal(fourth.previousTaxCents, 108000)
  assert.equal(fourth.currentTaxCents, 120000)
  assert.equal(fourth.takeHomeCents, 1680000)
})

test('12个月预扣之和与全年税额一致，金额汇总精确到分', () => {
  const input = { ...base, monthlyIncome: 23567.89, monthlyInsurance: 2456.78, monthlyAdditionalDeduction: 1234.56 }
  let prepaidCents = 0
  for (let month = 1; month <= 12; month++) {
    const result = calculateIncomeTax({ ...input, month })
    if (result.mode === 'monthly') prepaidCents += result.currentTaxCents
  }
  const annual = calculateIncomeTax({ ...input, mode: 'annual', annualPrepaid: prepaidCents / 100 })
  if (annual.mode !== 'annual') return
  assert.equal(annual.annualTaxCents, prepaidCents)
  assert.equal(annual.payableCents, 0)
  assert.equal(annual.refundableCents, 0)
})

test('年度应纳税总额与补税、退税方向正确', () => {
  for (const [annualPrepaid, payable, refundable] of [[10000, 1880, 0], [15000, 0, 3120], [11880, 0, 0]]) {
    const result = calculateIncomeTax({ ...base, mode: 'annual', annualPrepaid: annualPrepaid! })
    if (result.mode !== 'annual') return
    assert.equal(result.annualIncomeCents, 24000000)
    assert.equal(result.annualDeductionCents, 9600000)
    assert.equal(result.taxableCents, 14400000)
    assert.equal(result.annualTaxCents, 1188000)
    assert.equal(result.payableCents, payable! * 100)
    assert.equal(result.refundableCents, refundable! * 100)
  }
})

test('大病医疗仅用于年度汇算；自定义基本减除额生效', () => {
  assert.deepEqual(calculateIncomeTax({ ...base, annualMedicalDeduction: 20000 }), calculateIncomeTax(base))
  const annual = calculateIncomeTax({ ...base, mode: 'annual', annualMedicalDeduction: 20000 })
  if (annual.mode !== 'annual') return
  assert.equal(annual.annualDeductionCents, 11600000)
  assert.equal(annual.annualTaxCents, 988000)
  const custom = calculateIncomeTax({ ...base, monthlyBasicDeduction: 6000 })
  if (custom.mode !== 'monthly') return
  assert.equal(custom.currentTaxCents, 33000)
  assert.match(formatIncomeTaxResult(custom), /自定义模拟值/)
})

test('零收入与扣除超过收入时税额为零，到手工资不扣基本减除费用', () => {
  const result = calculateIncomeTax({ ...base, monthlyIncome: 3000, monthlyInsurance: 500 })
  if (result.mode !== 'monthly') return
  assert.equal(result.taxableCents, 0)
  assert.equal(result.currentTaxCents, 0)
  assert.equal(result.takeHomeCents, 250000)
  const zero = calculateIncomeTax({ ...base, mode: 'annual', monthlyIncome: 0, monthlyInsurance: 0, annualPrepaid: 100 })
  if (zero.mode !== 'annual') return
  assert.equal(zero.annualTaxCents, 0)
  assert.equal(zero.refundableCents, 10000)
})

test('拒绝负数、非数字、超范围金额及无效月份', () => {
  for (const field of ['monthlyIncome', 'monthlyInsurance', 'monthlyBasicDeduction', 'monthlyAdditionalDeduction', 'annualPrepaid', 'annualMedicalDeduction'] as const) {
    for (const value of [-1, NaN, Infinity, 1.001, 1000000001]) assert.throws(() => calculateIncomeTax({ ...base, mode: 'annual', [field]: value }))
  }
  for (const month of [0, 13, 1.5, NaN]) assert.throws(() => calculateIncomeTax({ ...base, month }))
  assert.throws(() => calculateIncomeTax({ ...base, monthlyInsurance: 20001 }))
})

test('复制文本区分月度与年度，包含测算假设及免责提示', () => {
  assert.match(formatIncomeTaxResult(calculateIncomeTax(base)), /税后到手收入：17,640.00 元/)
  const annual = formatIncomeTaxResult(calculateIncomeTax({ ...base, mode: 'annual', annualPrepaid: 15000 }))
  assert.match(annual, /应退税额（测算差额）：3,120.00 元/)
  assert.match(annual, /实际个税以个税APP及税局核算为准/)
})
