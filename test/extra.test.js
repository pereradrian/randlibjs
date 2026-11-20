import { describe, test, expect } from 'vitest'
import {
  seed, kumaraswamy, rademacher, uniformSphere, uniformBall, uuid4, AliasTable, categorical,
  truncatedNormal, generalizedExtremeValue, nakagami, loguniform, createGenerator,
} from '../index.js'
import { expectKS, expectChiSquare, mean } from './helpers/stats.js'

describe('kumaraswamy', () => {
  test('KS test against the closed form CDF', () => {
    seed(1)
    expectKS(kumaraswamy(2, 5, 10000), (x) => 1 - (1 - x ** 2) ** 5)
    expect(() => kumaraswamy(0, 1)).toThrow()
  })
})

describe('rademacher', () => {
  test('balanced signs', () => {
    seed(2)
    const xs = rademacher(20000)
    expect(new Set(xs)).toEqual(new Set([-1, 1]))
    expect(Math.abs(mean(xs))).toBeLessThan(0.03)
  })
})

describe('uniformSphere and uniformBall', () => {
  test('unit norm and uniform latitude on the 3-sphere', () => {
    seed(3)
    const pts = uniformSphere(3, 10000)
    pts.forEach((p) => expect(Math.hypot(...p)).toBeCloseTo(1, 12))
    // Archimedes: z is uniform on [-1, 1]
    expectKS(pts.map((p) => p[2]), (z) => (z + 1) / 2)
    expect(uniformSphere(5)).toHaveLength(5)
  })

  test('radius distribution inside the ball', () => {
    seed(4)
    const pts = uniformBall(3, 2, 10000)
    expectKS(pts.map((p) => Math.hypot(...p)), (r) => (r / 2) ** 3)
    expect(() => uniformBall(0)).toThrow()
    expect(() => uniformBall(2, -1)).toThrow()
  })
})

describe('uuid4', () => {
  test('format, version and variant bits', () => {
    seed(5)
    const ids = uuid4(1000)
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/))
    expect(new Set(ids).size).toBe(1000)
    seed(5)
    expect(uuid4()).toBe(ids[0])
  })
})

describe('AliasTable and categorical', () => {
  test('frequencies match the weights', () => {
    seed(6)
    const w = [1, 0, 3, 6]
    const xs = new AliasTable(w).sample(30000)
    expectChiSquare(xs, (k) => w[k] / 10, 0, 3)
    expect(xs.includes(1)).toBe(false)
    expect(categorical([1])).toBe(0)
    expect(createGenerator(1).categorical([0.5, 0.5], 3)).toHaveLength(3)
  })

  test('validation', () => {
    expect(() => new AliasTable([])).toThrow()
    expect(() => new AliasTable([0, 0])).toThrow()
    expect(() => new AliasTable([1, -1])).toThrow()
  })
})

describe('validation of the extra distributions', () => {
  test('bounds are respected and invalid parameters throw', () => {
    expect(truncatedNormal(0, 1, 30, 31, 100).every((x) => x >= 30 && x <= 31)).toBe(true)
    expect(truncatedNormal(0, 1, -1e-9, 1e-9, 10).every((x) => Math.abs(x) <= 1e-9)).toBe(true)
    expect(() => truncatedNormal(0, 1, 2, 1)).toThrow()
    expect(() => truncatedNormal(0, 0)).toThrow()
    expect(() => generalizedExtremeValue(0, 0, -1)).toThrow()
    expect(() => nakagami(0.2)).toThrow()
    expect(() => loguniform(2, 1)).toThrow()
    expect(loguniform(1, 10, 100).every((x) => x >= 1 && x <= 10)).toBe(true)
  })
})
