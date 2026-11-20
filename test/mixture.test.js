import { describe, test, expect } from 'vitest'
import { stats, mixture, seed, createGenerator, normal } from '../index.js'
import { expectKS, expectChiSquare, mean, variance } from './helpers/stats.js'

describe('mixture sampling', () => {
  test('accepts stats objects and functions, and matches the mixture cdf', () => {
    seed(1)
    const m = stats.mixture([stats.normal(0, 1), stats.normal(5, 2)], [0.7, 0.3])
    expectKS(mixture([stats.normal(0, 1), stats.normal(5, 2)], [7, 3], 10000), (x) => m.cdf(x))
    expectKS(mixture([() => normal(0, 1), () => normal(5, 2)], [0.7, 0.3], 10000), (x) => m.cdf(x))
  })

  test('returnLabels gives the component of each sample', () => {
    seed(2)
    const { values, labels } = mixture([() => -100, () => 100], [1, 1], [10, 3], { returnLabels: true })
    expect(values).toHaveLength(10)
    values.forEach((row, i) => row.forEach((v, j) => expect(v).toBe(labels[i][j] === 0 ? -100 : 100)))
    const single = mixture([() => 'a'], [1], null, { returnLabels: true })
    expect(single).toEqual({ values: 'a', labels: 0 })
  })

  test('multivariate components and generators', () => {
    const pts = mixture([() => [0, 0], () => [1, 1]], [1, 1], 5)
    pts.forEach((p) => expect(p).toHaveLength(2))
    const a = createGenerator(3).mixture([stats.normal(), stats.normal(10)], [1, 1], 5)
    const b = createGenerator(3).mixture([stats.normal(), stats.normal(10)], [1, 1], 5)
    expect(a).toEqual(b)
  })
})

describe('stats.mixture', () => {
  const comps = [stats.normal(0, 1), stats.normal(5, 2)]
  const m = stats.mixture(comps, [0.7, 0.3])

  test('pdf, cdf, sf and moments', () => {
    for (const x of [-3, 0, 2.5, 5, 12]) {
      expect(m.pdf(x)).toBeCloseTo(0.7 * comps[0].pdf(x) + 0.3 * comps[1].pdf(x), 14)
      expect(m.cdf(x)).toBeCloseTo(0.7 * comps[0].cdf(x) + 0.3 * comps[1].cdf(x), 14)
      expect(m.cdf(x) + m.sf(x)).toBeCloseTo(1, 14)
    }
    expect(m.mean()).toBeCloseTo(1.5, 14)
    expect(m.variance()).toBeCloseTo(0.7 * 1 + 0.3 * (4 + 25) - 2.25, 12)
    // far in the left tail the wider component dominates; computed in log space without underflow
    expect(m.logpdf(-50)).toBeCloseTo(Math.log(0.3) + comps[1].logpdf(-50), 10)
  })

  test('ppf and isf invert the cdf, including the tails', () => {
    for (const q of [1e-10, 0.01, 0.3, 0.5, 0.9, 0.999]) {
      expect(m.cdf(m.ppf(q))).toBeCloseTo(q, 12)
    }
    for (const q of [1e-12, 1e-6, 0.2, 0.8]) {
      expect(m.sf(m.isf(q)) / q).toBeCloseTo(1, 8)
    }
    const [lo, hi] = m.interval(0.9)
    expect(m.cdf(hi) - m.cdf(lo)).toBeCloseTo(0.9, 12)
  })

  test('sampling agrees with the distribution', () => {
    seed(4)
    const xs = m.sample(20000)
    expectKS(xs, (x) => m.cdf(x))
    expect(mean(xs)).toBeCloseTo(1.5, 1)
    expect(variance(xs) / m.variance()).toBeCloseTo(1, 1)
  })

  test('discrete mixtures have a pmf', () => {
    const d = stats.mixture([stats.poisson(2), stats.poisson(10)], [1, 1])
    expect(d.pmf(3)).toBeCloseTo(0.5 * stats.poisson(2).pmf(3) + 0.5 * stats.poisson(10).pmf(3), 15)
    expect(d.cdf(5)).toBeCloseTo(0.5 * stats.poisson(2).cdf(5) + 0.5 * stats.poisson(10).cdf(5), 14)
    expect(d.mean()).toBe(6)
    expect(d.ppf(0.5)).toBe(5)
    expect(d.cdf(4)).toBeLessThan(0.5)
    seed(5)
    expectChiSquare(d.sample(20000), (k) => d.pmf(k), 0, 40)
  })

  test('bounded supports', () => {
    const u = stats.mixture([stats.uniform(0, 1), stats.uniform(2, 3)], [1, 1])
    expect(u.support).toEqual([0, 3])
    expect(u.ppf(0.75)).toBeCloseTo(2.5, 12)
    expect(u.pdf(1.5)).toBe(0)
  })

  test('validation', () => {
    expect(() => stats.mixture([], [])).toThrow()
    expect(() => stats.mixture([stats.normal()], [1, 2])).toThrow()
    expect(() => stats.mixture([stats.normal(), stats.poisson(1)], [1, 1])).toThrow()
    expect(() => stats.mixture([stats.normal(), () => 1], [1, 1])).toThrow()
    expect(() => stats.mixture([stats.normal()], [-1])).toThrow()
    expect(() => stats.mixture([stats.normal()], [0])).toThrow()
  })
})
