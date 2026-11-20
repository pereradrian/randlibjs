import { describe, test, expect } from 'vitest'
import {
  seed, randomWalk, brownianMotion, brownianBridge, geometricBrownianMotion, ornsteinUhlenbeck,
  poissonProcess, inhomogeneousPoissonProcess, poissonCountingProcess, markovChain, resample,
  bootstrap, permutationTest, normal, createGenerator,
} from '../index.js'
import { mean, variance, expectKS } from './helpers/stats.js'

const last = (paths) => paths.map((p) => p[p.length - 1])

describe('random walks and Brownian motion', () => {
  test('randomWalk', () => {
    seed(1)
    const w = randomWalk(1000)
    expect(w).toHaveLength(1001)
    expect(w[0]).toBe(0)
    w.slice(1).forEach((x, i) => expect(Math.abs(x - w[i])).toBe(1))
    expect(mean(last(randomWalk(50, { p: 0.7, paths: 4000 })))).toBeCloseTo(20, 0)
    expect(() => randomWalk(0)).toThrow()
  })

  test('brownianMotion has Gaussian increments with the right moments', () => {
    seed(2)
    const { t, x } = brownianMotion({ T: 2, n: 50, mu: 0.5, sigma: 2, paths: 5000 })
    expect(t).toHaveLength(51)
    expect(t[50]).toBe(2)
    const ends = last(x)
    expect(mean(ends)).toBeCloseTo(1, 0)
    expect(variance(ends) / 8).toBeCloseTo(1, 1)
  })

  test('brownianBridge is pinned at both ends', () => {
    const { x } = brownianBridge({ a: 1, b: 3, n: 20, paths: 3 })
    x.forEach((p) => {
      expect(p[0]).toBeCloseTo(1, 12)
      expect(p[20]).toBeCloseTo(3, 12)
    })
  })

  test('geometricBrownianMotion: E[S_T] = s0 exp(mu T) and lognormal marginals', () => {
    seed(3)
    const { x } = geometricBrownianMotion({ s0: 100, mu: 0.05, sigma: 0.2, T: 1, n: 10, paths: 20000 })
    expect(mean(last(x)) / (100 * Math.exp(0.05))).toBeCloseTo(1, 2)
    expect(x.flat().every((v) => v > 0)).toBe(true)
    expect(() => geometricBrownianMotion({ s0: 0 })).toThrow()
  })

  test('ornsteinUhlenbeck reaches its stationary distribution', () => {
    seed(4)
    const { x } = ornsteinUhlenbeck({ x0: 10, theta: 2, mu: 1, sigma: 1, T: 10, n: 100, paths: 5000 })
    const ends = last(x)
    expect(mean(ends)).toBeCloseTo(1, 1)
    expect(variance(ends)).toBeCloseTo(0.25, 1)
  })
})

describe('point processes and Markov chains', () => {
  test('poissonProcess counts and uniform conditional arrival times', () => {
    seed(5)
    const counts = Array.from({ length: 3000 }, () => poissonProcess(4, 2).length)
    expect(mean(counts)).toBeCloseTo(8, 0)
    const times = poissonProcess(2000, 1)
    expectKS(times, (u) => Math.min(1, Math.max(0, u)))
    expect(times.every((v, i) => i === 0 || v >= times[i - 1])).toBe(true)
    expect(poissonProcess(0, 5)).toEqual([])
  })

  test('inhomogeneous thinning and counting process', () => {
    seed(6)
    const counts = Array.from({ length: 3000 }, () => inhomogeneousPoissonProcess((t) => 10 * t, 10, 1).length)
    expect(mean(counts)).toBeCloseTo(5, 0)
    expect(() => inhomogeneousPoissonProcess(() => 20, 10, 1)).toThrow()
    const { x } = poissonCountingProcess(3, { T: 2, n: 10 })
    expect(x).toHaveLength(11)
    expect(x.every((v, i) => i === 0 || v >= x[i - 1])).toBe(true)
  })

  test('markovChain visits states with the stationary frequencies', () => {
    seed(7)
    const P = [[0.9, 0.1], [0.5, 0.5]]
    const chain = markovChain(P, 50000, 0)
    const freq1 = chain.filter((s) => s === 1).length / chain.length
    expect(freq1).toBeCloseTo(1 / 6, 2)
    expect(markovChain(P, 5, [0, 1])[0]).toBe(1)
    expect(() => markovChain([[0.5, 0.4], [0.5, 0.5]], 3)).toThrow()
    expect(() => markovChain(P, 3, 5)).toThrow()
  })
})

describe('resampling', () => {
  test('resample draws from the data', () => {
    const r = resample([1, 2, 3], 100)
    expect(r.every((v) => [1, 2, 3].includes(v))).toBe(true)
    expect(resample([4])).toEqual([4])
    expect(() => resample([])).toThrow()
  })

  test('bootstrap intervals cover the true mean at roughly the nominal rate', () => {
    const rng = createGenerator(8)
    let covered = 0
    for (let k = 0; k < 100; k++) {
      const data = rng.normal(5, 2, 40)
      const { confidenceInterval: [lo, hi] } = rng.run(() => bootstrap(data, undefined, { nResamples: 999 }))
      if (lo <= 5 && 5 <= hi) covered++
    }
    expect(covered).toBeGreaterThan(85)
  })

  test('bootstrap result fields, percentile method and validation', () => {
    seed(9)
    const data = normal(0, 1, 50)
    const res = bootstrap(data, (xs) => Math.max(...xs), { nResamples: 500, method: 'percentile' })
    expect(res.distribution).toHaveLength(500)
    expect(res.standardError).toBeGreaterThan(0)
    expect(res.confidenceInterval[0]).toBeLessThanOrEqual(res.confidenceInterval[1])
    expect(() => bootstrap([1])).toThrow()
    expect(() => bootstrap(data, mean, { method: 'nope' })).toThrow()
    expect(() => bootstrap(data, mean, { confidence: 1 })).toThrow()
  })

  test('permutationTest detects a shift and not its absence', () => {
    seed(10)
    const a = normal(0, 1, 30)
    const b = normal(1, 1, 30)
    expect(permutationTest(a, b, undefined, { nResamples: 2000 }).pvalue).toBeLessThan(0.01)
    expect(permutationTest(a, b, undefined, { nResamples: 2000, alternative: 'less' }).pvalue).toBeLessThan(0.01)
    expect(permutationTest(a, b, undefined, { nResamples: 2000, alternative: 'greater' }).pvalue).toBeGreaterThan(0.9)
    const c = normal(0, 1, 30)
    expect(permutationTest(a, c, undefined, { nResamples: 2000 }).pvalue).toBeGreaterThan(0.01)
    expect(() => permutationTest([], [1])).toThrow()
    expect(() => permutationTest([1], [1], undefined, { alternative: 'x' })).toThrow()
  })
})
