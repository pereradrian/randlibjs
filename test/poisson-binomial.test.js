import { describe, test, expect } from 'vitest'
import { seed, poisson, binomial, geometric, chisquare, pareto, triangular } from '../index.js'
import { lomax } from '../src/functions/univariate/pareto.js'
import { expectChiSquare, expectKS, lgamma, logChoose, gammaP, mean, variance } from './helpers/stats.js'

const poissonPmf = (lam) => (k) => Math.exp(-lam + k * Math.log(lam) - lgamma(k + 1))
const binomialPmf = (n, p) => (k) => Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p))

describe('poisson', () => {
  test.each([0.5, 4, 9.9, 10, 37, 38, 250, 1e4])('goodness of fit, lambda=%s', (lam) => {
    seed(11)
    const xs = poisson(lam, 20000)
    const sd = Math.sqrt(lam)
    expectChiSquare(xs, poissonPmf(lam), Math.max(0, Math.floor(lam - 6 * sd)), Math.ceil(lam + 6 * sd + 10))
    expect(xs.every((x) => Number.isInteger(x) && x >= 0)).toBe(true)
  })

  test('huge lambda is exact in mean and variance', () => {
    seed(12)
    const xs = poisson(1e9, 5000)
    expect(Math.abs(mean(xs) - 1e9) / Math.sqrt(1e9 / 5000)).toBeLessThan(4.5)
    expect(variance(xs) / 1e9).toBeCloseTo(1, 1)
  })

  test('lambda = 0 and validation', () => {
    expect(poisson(0)).toBe(0)
    expect(typeof poisson()).toBe('number')
    expect(() => poisson(-1)).toThrow()
    expect(() => poisson(NaN)).toThrow()
    expect(() => poisson(1e16)).toThrow()
  })
})

describe('binomial', () => {
  test.each([[10, 0.5], [20, 0.05], [100, 0.3], [59, 0.9], [1000, 0.5], [5000, 0.02], [100000, 0.7]])('goodness of fit, n=%s p=%s', (n, p) => {
    seed(21)
    const xs = binomial(n, p, 20000)
    const m = n * p
    const sd = Math.sqrt(n * p * (1 - p))
    expectChiSquare(xs, binomialPmf(n, p), Math.max(0, Math.floor(m - 7 * sd)), Math.min(n, Math.ceil(m + 7 * sd)))
    expect(xs.every((x) => Number.isInteger(x) && x >= 0 && x <= n)).toBe(true)
  })

  test('huge n is fast and correct', () => {
    seed(22)
    const xs = binomial(1e12, 0.25, 2000)
    expect(Math.abs(mean(xs) - 2.5e11) / Math.sqrt(1e12 * 0.1875 / 2000)).toBeLessThan(4.5)
  })

  test('edge cases and validation', () => {
    expect(binomial(0, 0.5)).toBe(0)
    expect(binomial(10, 0)).toBe(0)
    expect(binomial(10, 1)).toBe(10)
    expect(() => binomial(-1, 0.5)).toThrow()
    expect(() => binomial(2.5, 0.5)).toThrow()
    expect(() => binomial(10, 1.5)).toThrow()
  })
})

describe('geometric', () => {
  test.each([0.05, 0.3, 0.5, 0.9])('goodness of fit, p=%s', (p) => {
    seed(31)
    const xs = geometric(p, 20000)
    expectChiSquare(xs, (k) => (k < 1 ? 0 : p * (1 - p) ** (k - 1)), 1, Math.ceil(40 / p))
  })

  test('p = 1 always returns 1; invalid p throws', () => {
    expect(geometric(1, 5)).toEqual([1, 1, 1, 1, 1])
    expect(() => geometric(0)).toThrow()
    expect(() => geometric(1.1)).toThrow()
  })
})

describe('chisquare', () => {
  test.each([0.5, 1, 2.5, 3, 30])('KS test, df=%s', (k) => {
    seed(41)
    expectKS(chisquare(k, 10000), (x) => gammaP(k / 2, x / 2))
  })

  test('validation', () => {
    expect(() => chisquare(0)).toThrow()
    expect(() => chisquare(-2)).toThrow()
  })
})

describe('pareto and lomax', () => {
  test('pareto KS test', () => {
    seed(51)
    expectKS(pareto(3, 2, 10000), (x) => (x < 2 ? 0 : 1 - (2 / x) ** 3))
    expect(pareto(2)).toBeGreaterThanOrEqual(1)
    expect(() => pareto(1, -1)).toThrow()
    expect(() => pareto(0)).toThrow()
  })

  test('lomax (numpy pareto) KS test', () => {
    seed(52)
    expectKS(lomax(2.5, 10000), (x) => 1 - (1 + x) ** -2.5)
    expect(() => lomax(0)).toThrow()
  })
})

describe('triangular', () => {
  test('KS test and degenerate modes', () => {
    seed(61)
    const cdf = (x) => (x <= 1 ? 0 : x >= 5 ? 1 : x <= 2 ? (x - 1) ** 2 / 4 : 1 - (5 - x) ** 2 / 12)
    expectKS(triangular(1, 5, 2, 10000), cdf)
    expect(triangular(0, 1, 0, 100).every((x) => x >= 0 && x <= 1)).toBe(true)
    expect(triangular(0, 1, 1, 100).every((x) => x >= 0 && x <= 1)).toBe(true)
    expect(() => triangular(0, 1, 2)).toThrow()
    expect(() => triangular(1, 1, 1)).toThrow()
    expect(() => triangular(0, 1, 'a')).toThrow()
  })
})
