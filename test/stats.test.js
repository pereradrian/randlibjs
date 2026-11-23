import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { stats, special, seed, createGenerator } from '../index.js'
import { expectKS, mean } from './helpers/stats.js'

const decode = (v) => (v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v === 'NaN' ? NaN : v)
const cases = JSON.parse(readFileSync(new URL('./fixtures/stats.json', import.meta.url), 'utf8'))

function close(actual, expected, rel = 1e-9, abs = 1e-13) {
  expected = decode(expected)
  if (Number.isNaN(expected)) return expect(actual).toBeNaN()
  if (!Number.isFinite(expected)) return expect(actual).toBe(expected)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(abs + rel * Math.abs(expected))
}

describe('stats distributions against scipy.stats', () => {
  for (const c of cases) {
    describe(`${c.fn}(${c.args.join(', ')})`, () => {
      const d = stats[c.fn](...c.args)

      test(c.discrete ? 'pmf' : 'pdf', () => {
        const values = c.discrete ? d.pmf(c.x) : d.pdf(c.x)
        values.forEach((v, i) => close(v, c.density[i], 1e-9, 1e-15))
      })

      test('cdf and sf', () => {
        d.cdf(c.x).forEach((v, i) => close(v, c.cdf[i], 1e-9, 1e-15))
        d.sf(c.x).forEach((v, i) => close(v, c.sf[i], 1e-9, 1e-15))
      })

      test('ppf and isf', () => {
        if (c.discrete) {
          // exact match, except at exact ties (cdf(k) == q in exact arithmetic) where
          // scipy's answer depends on floating point rounding
          d.ppf(c.q).forEach((v, i) => {
            if (v !== c.ppf[i]) expect(Math.abs(d.cdf(Math.min(v, c.ppf[i])) - c.q[i])).toBeLessThan(1e-12)
          })
          d.isf(c.q).forEach((v, i) => {
            if (v !== c.isf[i]) expect(Math.abs(d.sf(Math.min(v, c.isf[i])) - c.q[i])).toBeLessThan(1e-12)
          })
          return
        }
        // the defining property must hold to near machine precision, up to the error caused
        // by representing the quantile x itself as a double (pdf(x) * ulp(x))
        const slack = (v) => 4e-16 * Math.abs(v) * d.pdf(v) + 2e-16
        d.ppf(c.q).forEach((v, i) => {
          const q = c.q[i]
          if (q < 0.5) close(d.cdf(v), q, 1e-9, slack(v))
          else close(d.sf(v), 1 - q, 1e-6, slack(v))
          // ... and agree with scipy (whose own quantiles are less precise in some tails)
          close(v, c.ppf[i], 1e-4, 1e-12)
        })
        d.isf(c.q).forEach((v, i) => {
          const q = c.q[i]
          if (q < 0.5) close(d.sf(v), q, 1e-9, slack(v))
          else close(d.cdf(v), 1 - q, 1e-6, slack(v))
          close(v, c.isf[i], 1e-4, 1e-12)
        })
      })

      test('moments and median', () => {
        // the mean of Student's t with df <= 1 is undefined: NaN here, inf in scipy
        if (c.fn === 'studentT' && c.args[0] <= 1) expect(d.mean()).toBeNaN()
        else close(d.mean(), c.mean, 1e-10)
        close(d.variance(), c.variance, 1e-9)
        close(d.median(), c.median, 1e-8, 1e-12)
      })
    })
  }
})

describe('stats object API', () => {
  test('sampling agrees with the cdf', () => {
    seed(1)
    for (const d of [stats.gamma(2, 3), stats.studentT(4, 1, 2), stats.beta(0.5, 2), stats.weibull(2, 3), stats.truncatedNormal(0, 1, 1, 3)]) {
      expectKS(d.sample(5000), (x) => d.cdf(x))
    }
    const b = stats.binomial(20, 0.3)
    expect(mean(b.rvs(20000))).toBeCloseTo(6, 1)
  })

  test('sample(size, rng) uses the given generator', () => {
    const d = stats.normal(0, 1)
    expect(d.sample(3, createGenerator(5))).toEqual(createGenerator(5).normal(0, 1, 3))
  })

  test('nested arrays, interval, log functions, std and entropy', () => {
    const n = stats.norm(0, 1)
    expect(n.cdf([[0], [1.96]])).toEqual([[0.5], [0.9750021048517795]])
    const [lo, hi] = n.interval(0.95)
    expect(lo).toBeCloseTo(-1.959963984540054, 13)
    expect(hi).toBeCloseTo(1.959963984540054, 13)
    expect(n.logpdf(0)).toBeCloseTo(-0.9189385332046728, 14)
    expect(n.logcdf(-40)).toBeLessThan(-800)
    expect(n.logsf(0)).toBeCloseTo(Math.log(0.5), 14)
    expect(n.std()).toBe(1)
    expect(n.entropy()).toBeCloseTo(1.4189385332046727, 14)
    expect(stats.exponential(2).entropy()).toBeCloseTo(1 - Math.log(2), 14)
    expect(stats.uniform(0, 4).entropy()).toBeCloseTo(Math.log(4), 14)
    expect(stats.gamma(2.5, 2).entropy()).toBeCloseTo(2.423095090065, 11)
    expect(n.ppf(1.5)).toBeNaN()
    expect(() => n.interval(2)).toThrow()
    expect(stats.poisson(2).pmf(1.5)).toBe(0)
    expect(stats.poisson(2).logpmf(-1)).toBe(-Infinity)
    expect(() => stats.poisson(2).pdf(1)).toThrow()
  })

  test('deep tails keep relative precision', () => {
    expect(stats.normal().sf(10) / 7.61985302416047e-24).toBeCloseTo(1, 12)
    expect(stats.normal().isf(1e-20)).toBeCloseTo(9.262340089798409, 12)
    expect(stats.gamma(3).sf(60) / 1.629586652937817e-23).toBeCloseTo(1, 9)
    expect(stats.chi2(2).sf(100)).toBeCloseTo(Math.exp(-50), 30)
  })

  test('validation', () => {
    expect(() => stats.normal(0, 0)).toThrow()
    expect(() => stats.uniform(1, 1)).toThrow()
    expect(() => stats.beta(0, 1)).toThrow()
    expect(() => stats.triangular(0, 1, 2)).toThrow()
    expect(() => stats.binomial(1.5, 0.5)).toThrow()
    expect(() => stats.geometric(0)).toThrow()
    expect(() => stats.hypergeometric(1, 1, 3)).toThrow()
    expect(() => stats.randint(3, 3)).toThrow()
    expect(() => stats.truncatedNormal(0, 1, 2, 1)).toThrow()
  })
})

describe('special functions', () => {
  test('values against scipy.special', () => {
    expect(special.gammaFn(5)).toBeCloseTo(24, 12)
    expect(special.gammaFn(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 14)
    expect(special.gammaFn(-1.5)).toBeCloseTo(2.3632718012073544, 13)
    expect(special.gammaFn(-2)).toBeNaN()
    expect(special.gammaFn(200)).toBe(Infinity)
    expect(special.digamma(1)).toBeCloseTo(-0.5772156649015329, 14)
    expect(special.digamma(-0.5)).toBeCloseTo(0.03648997397857652, 13)
    expect(special.digamma(0)).toBeNaN()
    expect(special.erf(0.5)).toBeCloseTo(0.5204998778130465, 15)
    expect(special.gammaP(2.5, 3)).toBeCloseTo(0.6937810815867212, 14)
    expect(special.gammaQ(2.5, 3)).toBeCloseTo(0.30621891841327875, 14)
    expect(special.gammaPInv(2.5, 0.6937810815867212)).toBeCloseTo(3, 12)
    expect(special.betaInc(0.3, 2, 5)).toBeCloseTo(0.579825, 14)
    expect(special.betaIncInv(0.579825, 2, 5)).toBeCloseTo(0.3, 12)
    expect(special.logBeta(2, 3)).toBeCloseTo(Math.log(1 / 12), 14)
    expect(special.logChoose(10, 3)).toBeCloseTo(Math.log(120), 13)
  })
})

describe('F distribution far tails', () => {
  test('cdf and sf stay complementary when the beta argument rounds to 1', () => {
    // found by the property tests: sf(9.7e-195) of F(0.1, 0.1) used to be exactly 1
    const d = stats.f(0.1, 0.1)
    const x = d.ppf(1e-10)
    expect(d.cdf(x)).toBeCloseTo(1e-10, 20)
    expect(d.sf(x)).toBe(1 - 1e-10)
    expect(d.sf(1e-300)).toBeLessThan(1)
    expect(d.cdf(1e300) + d.sf(1e300)).toBe(1)
  })
})
