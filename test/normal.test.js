import { describe, test, expect } from 'vitest'
import { seed, normal, standardNormal } from '../index.js'
import { inverseNormalCDF, normalCDF, erfc } from '../src/functions/util/inverse-normal-cdf.js'
import { expectKS, mean, variance } from './helpers/stats.js'

describe('normal', () => {
  test('reproduces numpy RandomState(42).standard_normal(3) with the mt19937 bit generator', () => {
    seed(42, 'mt19937')
    const expected = [0.4967141530112327, -0.13826430117118466, 0.6476885381006925]
    standardNormal(3).forEach((x, i) => expect(x).toBeCloseTo(expected[i], 14))
  })

  test('passes a Kolmogorov-Smirnov test', () => {
    seed(1)
    const xs = normal(3, 2, 20000)
    expectKS(xs, (x) => normalCDF((x - 3) / 2))
    expect(mean(xs)).toBeCloseTo(3, 1)
    expect(Math.sqrt(variance(xs))).toBeCloseTo(2, 1)
  })

  test('tails are not truncated (old lookup table capped values)', () => {
    seed(5)
    const xs = standardNormal(200000)
    expect(xs.reduce((m, x) => Math.max(m, Math.abs(x)), 0)).toBeGreaterThan(4)
  })

  test('scale 0 returns loc; invalid parameters throw', () => {
    expect(normal(7, 0)).toBe(7)
    expect(() => normal(0, -1)).toThrow()
    expect(() => normal('a', 1)).toThrow()
    expect(() => normal(NaN, 1)).toThrow()
  })

  test('shapes', () => {
    expect(standardNormal()).toEqual(expect.any(Number))
    expect(standardNormal([2, 3])).toHaveLength(2)
    expect(normal(0, 1, 0)).toEqual([])
  })
})

describe('inverseNormalCDF (AS241) and normalCDF', () => {
  // reference values from scipy.stats.norm.ppf / cdf and scipy.special.erfc
  const ppf = [[1e-300, -37.0470962993612], [1e-20, -9.262340089798409], [1e-5, -4.264890793922825],
    [0.02, -2.053748910631823], [0.3, -0.5244005127080409], [0.5, 0], [0.975, 1.959963984540054],
    [1 - 1e-12, 7.0344869100478356]]
  test.each(ppf)('ppf(%s)', (p, x) => {
    expect(Math.abs(inverseNormalCDF(p) - x)).toBeLessThanOrEqual(1e-13 * Math.max(1, Math.abs(x)))
  })

  const cdf = [[-10, 7.61985302416047e-24], [-5, 2.8665157187919333e-07], [-1.5, 0.06680720126885806],
    [0.2, 0.579259709439103], [0.49, 0.6879330505826095], [1, 0.8413447460685429], [4.1, 0.9999793424930875]]
  test.each(cdf)('cdf(%s)', (x, p) => {
    expect(Math.abs(normalCDF(x) - p) / p).toBeLessThan(1e-13)
  })

  test('erfc tails', () => {
    expect(erfc(8) / 1.1224297172982928e-29).toBeCloseTo(1, 13)
    expect(erfc(3.9) / 3.479224859723178e-08).toBeCloseTo(1, 13)
    expect(erfc(-0.3)).toBeCloseTo(1.3286267594591274, 14)
  })

  test('edge cases', () => {
    expect(inverseNormalCDF(0)).toBe(-Infinity)
    expect(inverseNormalCDF(1)).toBe(Infinity)
    expect(inverseNormalCDF(2)).toBeNaN()
    expect(normalCDF(NaN)).toBeNaN()
  })

  test('round trip', () => {
    for (const p of [0.001, 0.1, 0.4, 0.6, 0.9, 0.999]) {
      expect(normalCDF(inverseNormalCDF(p))).toBeCloseTo(p, 14)
    }
  })
})
