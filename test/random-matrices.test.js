import { describe, test, expect } from 'vitest'
import {
  seed, orthoGroup, specialOrthoGroup, randomCorrelation, lkjCorrelation, wishart, invWishart, matrixNormal,
} from '../index.js'
import { determinant, inverseSPD } from '../src/functions/multivariate/random-matrices.js'
import { expectKS, betaI } from './helpers/stats.js'

const mul = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)))
const T = (a) => a[0].map((_, j) => a.map((row) => row[j]))
const expectIdentity = (m, digits = 12) => m.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(i === j ? 1 : 0, digits)))
const average = (ms) => ms[0].map((row, i) => row.map((_, j) => ms.reduce((s, m) => s + m[i][j], 0) / ms.length))

describe('orthogonal groups', () => {
  test('orthoGroup returns orthogonal matrices with Haar distributed columns', () => {
    seed(1)
    const qs = orthoGroup(3, 4000)
    qs.slice(0, 20).forEach((q) => expectIdentity(mul(q, T(q))))
    // the first column is uniform on the sphere, so its first entry is uniform on [-1, 1] in 3D
    expectKS(qs.map((q) => q[0][0]), (x) => (x + 1) / 2)
    const dets = qs.map((q) => Math.sign(determinant(q)))
    expect(dets.filter((d) => d < 0).length).toBeGreaterThan(1800)
  })

  test('specialOrthoGroup has determinant +1', () => {
    seed(2)
    specialOrthoGroup(4, 50).forEach((q) => {
      expect(determinant(q)).toBeCloseTo(1, 12)
      expectIdentity(mul(T(q), q))
    })
    expect(specialOrthoGroup(1)).toEqual([[1]])
  })
})

describe('correlation matrices', () => {
  test('randomCorrelation keeps the eigenvalues and has a unit diagonal', () => {
    seed(3)
    const eigs = [0.5, 0.9, 1.6]
    const frob = eigs.reduce((s, e) => s + e * e, 0)
    for (const r of randomCorrelation(eigs, 20)) {
      r.forEach((row, i) => expect(row[i]).toBe(1))
      expect(r.flat().reduce((s, x) => s + x * x, 0)).toBeCloseTo(frob, 10)
      expect(determinant(r)).toBeCloseTo(0.5 * 0.9 * 1.6, 10)
      expect(r[0][1]).toBe(r[1][0])
    }
    expect(() => randomCorrelation([1, 1, 2])).toThrow()
    expect(() => randomCorrelation([-1, 3])).toThrow()
  })

  test('LKJ marginals follow the Beta law', () => {
    seed(4)
    const d = 4
    const eta = 2
    const b = eta - 1 + d / 2
    const rs = lkjCorrelation(d, eta, 4000)
    expectKS(rs.map((r) => r[0][3]), (x) => betaI((x + 1) / 2, b, b))
    expectKS(rs.map((r) => r[1][2]), (x) => betaI((x + 1) / 2, b, b))
    rs.slice(0, 10).forEach((r) => {
      r.forEach((row, i) => expect(row[i]).toBe(1))
      expect(determinant(r)).toBeGreaterThan(0)
    })
    const L = lkjCorrelation(3, 1, null, true)
    mul(L, T(L)).forEach((row, i) => expect(row[i]).toBeCloseTo(1, 12))
    expect(lkjCorrelation(1)).toEqual([[1]])
  })
})

describe('Wishart family', () => {
  const V = [[2, 0.5], [0.5, 1]]

  test('wishart mean is df * scale', () => {
    seed(5)
    const m = average(wishart(6, V, 20000))
    expect(m[0][0]).toBeCloseTo(12, 0)
    expect(m[0][1]).toBeCloseTo(3, 0)
    expect(m[1][1]).toBeCloseTo(6, 0)
    expect(() => wishart(0.5, V)).toThrow()
    expect(() => wishart(3, [[1, 2]])).toThrow()
  })

  test('invWishart mean is scale / (df - p - 1)', () => {
    seed(6)
    const m = average(invWishart(8, V, 20000))
    expect(m[0][0]).toBeCloseTo(2 / 5, 1)
    expect(m[0][1]).toBeCloseTo(0.5 / 5, 1)
    expect(m[1][1]).toBeCloseTo(1 / 5, 1)
  })

  test('inverseSPD', () => {
    expectIdentity(mul(V, inverseSPD(V)))
  })
})

describe('matrixNormal', () => {
  test('mean and covariance structure', () => {
    seed(7)
    const M = [[1, 2, 3], [4, 5, 6]]
    const U = [[1, 0.5], [0.5, 2]]
    const W = [[1, 0, 0.3], [0, 1, 0], [0.3, 0, 1]]
    const xs = matrixNormal(M, U, W, 20000)
    const m = average(xs)
    m.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(M[i][j], 1)))
    // Cov(X[0][0], X[1][2]) = U[0][1] * W[0][2] = 0.15
    const c = xs.reduce((s, x) => s + (x[0][0] - 1) * (x[1][2] - 6), 0) / xs.length
    expect(c).toBeCloseTo(0.15, 1)
    expect(() => matrixNormal(M, U, [[1]])).toThrow()
    expect(() => matrixNormal([1, 2], U, W)).toThrow()
  })
})
