import { describe, test, expect } from 'vitest'
import { seed, integers, bernoulli, negativeBinomial, hypergeometric, logseries, zipf } from '../index.js'
import { mean } from './helpers/stats.js'

describe('integers', () => {
  test('endpoint includes high', () => {
    seed(1)
    const xs = integers(1, 6, 6000, true)
    expect(new Set(xs)).toEqual(new Set([1, 2, 3, 4, 5, 6]))
    expect(integers(5, 5, 3, true)).toEqual([5, 5, 5])
  })

  test('single bound and huge ranges', () => {
    expect(integers(3, null, 100).every((x) => x >= 0 && x < 3)).toBe(true)
    const big = integers(0, 2 ** 53, 1000)
    expect(big.every((x) => Number.isSafeInteger(x) && x >= 0)).toBe(true)
    expect(Math.max(...big)).toBeGreaterThan(2 ** 50)
    expect(integers(-(2 ** 52), 2 ** 52, 10).every(Number.isSafeInteger)).toBe(true)
  })

  test('validation', () => {
    expect(() => integers(5, 5)).toThrow()
    expect(() => integers(6, 5, null, true)).toThrow()
    expect(() => integers(0.5, 5)).toThrow()
    expect(() => integers(-(2 ** 53), 2 ** 53 - 1)).toThrow()
  })
})

describe('bernoulli', () => {
  test('values and validation', () => {
    expect(bernoulli(0, 5)).toEqual([0, 0, 0, 0, 0])
    expect(bernoulli(1, 5)).toEqual([1, 1, 1, 1, 1])
    expect([0, 1]).toContain(bernoulli())
    expect(() => bernoulli(2)).toThrow()
  })
})

describe('negativeBinomial', () => {
  test('p = 1 gives 0; mean matches', () => {
    expect(negativeBinomial(5, 1, 3)).toEqual([0, 0, 0])
    seed(2)
    expect(mean(negativeBinomial(4, 0.25, 20000))).toBeCloseTo(12, 0)
    expect(() => negativeBinomial(0, 0.5)).toThrow()
    expect(() => negativeBinomial(1, 0)).toThrow()
  })
})

describe('hypergeometric', () => {
  test('degenerate cases', () => {
    expect(hypergeometric(5, 0, 3)).toBe(3)
    expect(hypergeometric(0, 5, 3)).toBe(0)
    expect(hypergeometric(5, 5, 10)).toBe(5)
    expect(hypergeometric(5, 5, 0)).toBe(0)
  })

  test('large populations are fast and bounded', () => {
    seed(3)
    const xs = hypergeometric(10 ** 9, 2 * 10 ** 9, 10 ** 8, 200)
    expect(xs.every((x) => x >= 0 && x <= 10 ** 8)).toBe(true)
    expect(Math.abs(mean(xs) / (10 ** 8 / 3) - 1)).toBeLessThan(1e-3)
  })

  test('validation', () => {
    expect(() => hypergeometric(2, 2, 5)).toThrow()
    expect(() => hypergeometric(-1, 2, 1)).toThrow()
    expect(() => hypergeometric(1.5, 2, 1)).toThrow()
  })
})

describe('logseries and zipf', () => {
  test('support and validation', () => {
    expect(logseries(0, 5)).toEqual([1, 1, 1, 1, 1])
    expect(logseries(0.9, 100).every((x) => Number.isInteger(x) && x >= 1)).toBe(true)
    expect(() => logseries(1)).toThrow()
    expect(zipf(3, 100).every((x) => Number.isInteger(x) && x >= 1)).toBe(true)
    expect(() => zipf(1)).toThrow()
  })
})
