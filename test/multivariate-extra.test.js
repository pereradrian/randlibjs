import { describe, test, expect } from 'vitest'
import { seed, dirichlet, multinomial, multivariateHypergeometric, multivariateNormal } from '../index.js'
import { choleskyDecomposition } from '../src/functions/util/cholesky.js'
import { expectKS, expectChiSquare, betaI, logChoose, mean } from './helpers/stats.js'

const column = (rows, j) => rows.map((r) => r[j])

describe('dirichlet', () => {
  test.each([[[1, 2, 3]], [[0.05, 0.02, 0.08]], [[5, 0.5]]])('marginals are Beta, alpha=%j', (alpha) => {
    seed(7)
    const xs = dirichlet(alpha, 10000)
    const total = alpha.reduce((a, b) => a + b, 0)
    xs.forEach((v) => expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12))
    alpha.forEach((a, j) => expectKS(column(xs, j), (x) => betaI(x, a, total - a)))
  })

  test('shapes and validation', () => {
    expect(dirichlet([1, 1])).toHaveLength(2)
    const grid = dirichlet([1, 1, 1], [2, 3])
    expect(grid).toHaveLength(2)
    expect(grid[0]).toHaveLength(3)
    expect(grid[0][0]).toHaveLength(3)
    expect(() => dirichlet([])).toThrow()
    expect(() => dirichlet([1, 0])).toThrow()
  })
})

describe('multinomial', () => {
  test('counts sum to n and marginals are binomial', () => {
    seed(8)
    const p = [0.2, 0.5, 0.3]
    const xs = multinomial(50, p, 20000)
    xs.forEach((v) => expect(v[0] + v[1] + v[2]).toBe(50))
    p.forEach((pj, j) => {
      const pmf = (k) => Math.exp(logChoose(50, k) + k * Math.log(pj) + (50 - k) * Math.log1p(-pj))
      expectChiSquare(column(xs, j), pmf, 0, 50)
    })
  })

  test('large n is fast and last probability is implied', () => {
    seed(9)
    const v = multinomial(1e9, [0.25, 0.25, 0.9])
    expect(v[0] + v[1] + v[2]).toBe(1e9)
    expect(v[2] / 1e9).toBeCloseTo(0.5, 2)
    expect(multinomial(0, [0.5, 0.5])).toEqual([0, 0])
  })

  test('validation', () => {
    expect(() => multinomial(10, [0.8, 0.8, 0.1])).toThrow()
    expect(() => multinomial(-1, [1])).toThrow()
    expect(() => multinomial(5, [])).toThrow()
  })
})

describe('multivariateHypergeometric', () => {
  test('counts are bounded, sum to nsample and marginals are hypergeometric', () => {
    seed(10)
    const colors = [10, 5, 20]
    const xs = multivariateHypergeometric(colors, 12, 20000)
    xs.forEach((v) => {
      expect(v[0] + v[1] + v[2]).toBe(12)
      v.forEach((c, j) => expect(c).toBeLessThanOrEqual(colors[j]))
    })
    const pmf = (k) => (k < 0 || k > 5 ? 0 : Math.exp(logChoose(5, k) + logChoose(30, 12 - k) - logChoose(35, 12)))
    expectChiSquare(column(xs, 1), pmf, 0, 5)
  })

  test('validation', () => {
    expect(() => multivariateHypergeometric([1, 2], 4)).toThrow()
    expect(() => multivariateHypergeometric([], 0)).toThrow()
    expect(() => multivariateHypergeometric([1.5], 1)).toThrow()
  })
})

describe('multivariateNormal with semi-definite covariance', () => {
  test('perfectly correlated components', () => {
    seed(11)
    const xs = multivariateNormal([1, 2], [[1, 1], [1, 1]], 1000)
    xs.forEach(([a, b]) => expect(b - a).toBeCloseTo(1, 10))
    expect(Math.abs(mean(column(xs, 0)) - 1)).toBeLessThan(0.15)
  })

  test('size semantics follow numpy', () => {
    expect(multivariateNormal([0, 0], [[1, 0], [0, 1]], 1)).toHaveLength(1)
    expect(multivariateNormal([0, 0], [[1, 0], [0, 1]], [2, 3])[1]).toHaveLength(3)
  })

  test('rejects indefinite and asymmetric matrices', () => {
    expect(() => multivariateNormal([0, 0], [[1, 2], [2, 1]])).toThrow('positive semi-definite')
    expect(() => choleskyDecomposition([[1, 0.5], [0.2, 1]])).toThrow('symmetric')
    expect(() => choleskyDecomposition([[1, 0], [0, -1]])).toThrow()
    expect(() => choleskyDecomposition([[1, 2]])).toThrow('square')
  })

  test('cholesky reproduces the matrix', () => {
    const a = [[4, 2, 0.4], [2, 5, 1], [0.4, 1, 3]]
    const L = choleskyDecomposition(a)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0
        for (let k = 0; k < 3; k++) s += L[i][k] * L[j][k]
        expect(s).toBeCloseTo(a[i][j], 12)
      }
    }
  })
})

describe('multivariate noise is standardised', () => {
  test.each([0, 0.6, -1])('multivariateTriangular(alpha=%s) has the requested covariance', async (alpha) => {
    const { multivariateTriangular, multivariateUniform } = await import('../index.js')
    seed(12)
    const cov = [[2, 0.6], [0.6, 1]]
    for (const xs of [multivariateTriangular([1, -1], cov, alpha, 40000), multivariateUniform([1, -1], cov, 40000)]) {
      const m0 = mean(column(xs, 0))
      const m1 = mean(column(xs, 1))
      expect(m0).toBeCloseTo(1, 1)
      expect(m1).toBeCloseTo(-1, 1)
      const c = (i, j, mi, mj) => mean(xs.map((v) => (v[i] - mi) * (v[j] - mj)))
      expect(c(0, 0, m0, m0)).toBeCloseTo(2, 1)
      expect(c(0, 1, m0, m1)).toBeCloseTo(0.6, 1)
      expect(c(1, 1, m1, m1)).toBeCloseTo(1, 1)
    }
  })
})
