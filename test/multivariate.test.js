import { seed } from '../index.js'
import { multivariate } from '../src/functions/multivariate/multivariate.js'
import { multivariateNormal } from '../src/functions/multivariate/multivariate-normal.js'
import { multivariateTriangular } from '../src/functions/multivariate/multivariate-triangular.js'
import { multivariateUniform } from '../src/functions/multivariate/multivariate-uniform.js'
import { describe, test, expect } from 'vitest'

const means = [0, 1]
const covariance = [
  [1, 0.5],
  [0.5, 2]
]

/**
 * Base multivariate tests
 */
describe('Base multivariate function', () => {
  test('Deterministic with same seed', () => {
    seed(123)
    const noiseGen = (n) => Array(n).fill(0)
    const first = multivariate(means, covariance, noiseGen, 3)
    seed(123)
    const second = multivariate(means, covariance, noiseGen, 3)
    expect(first).toEqual(second)
  })

  test('Size parameter works correctly', () => {
    const noiseGen = (n) => Array(n).fill(1)
    const single = multivariate(means, covariance, noiseGen)
    expect(single).toHaveLength(2)
    const array = multivariate(means, covariance, noiseGen, 4)
    expect(array).toHaveLength(4)
    array.forEach(v => expect(v).toHaveLength(2))
  })

  test('Throws for invalid inputs', () => {
    const noiseGen = (n) => Array(n).fill(0)
    expect(() => multivariate(0, covariance, noiseGen)).toThrow()
    expect(() => multivariate(means, [[1]], noiseGen)).toThrow()
    expect(() => multivariate(means, covariance, noiseGen, -1)).toThrow()
  })
})

/**
 * Multivariate Normal
 */
describe('Multivariate Normal tests', () => {
  test('Deterministic with same seed', () => {
    seed(12345)
    const first = multivariateNormal(means, covariance, 5)
    seed(12345)
    const second = multivariateNormal(means, covariance, 5)
    expect(first).toEqual(second)
  })

  test('Shape and size', () => {
    const single = multivariateNormal(means, covariance)
    expect(single).toHaveLength(2)
    const array = multivariateNormal(means, covariance, 3)
    expect(array).toHaveLength(3)
    array.forEach(vec => expect(vec).toHaveLength(2))
  })
})

/**
 * Multivariate Triangular
 */
describe('Multivariate Triangular tests', () => {
  test('Deterministic sequences with same seed', () => {
    seed(12345)
    const first = multivariateTriangular(means, covariance, 0.3, 5)
    seed(12345)
    const second = multivariateTriangular(means, covariance, 0.3, 5)
    expect(first).toEqual(second)
  })

  test('Values within bounds', () => {
    const base = 3 * Math.sqrt(2)
    const alpha = 0.4
    const samples = multivariateTriangular(means, covariance, alpha, 100)
    const a = -base * (1 + alpha/2)*means.length*means.length
    const b =  base * (1 - alpha/2)*means.length*means.length
    samples.forEach(vec => vec.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(a)
      expect(v).toBeLessThanOrEqual(b)
    }))
  })

  test('Shape', () => {
    const single = multivariateTriangular(means, covariance)
    expect(single).toHaveLength(2)
    const array = multivariateTriangular(means, covariance, 0, 4)
    expect(array).toHaveLength(4)
    array.forEach(vec => expect(vec).toHaveLength(2))
  })
})

/**
 * Multivariate Uniform
 */
describe('Multivariate Uniform tests', () => {
  test('Deterministic with same seed', () => {
    seed(12345)
    const first = multivariateUniform(means, covariance, 5)
    seed(12345)
    const second = multivariateUniform(means, covariance, 5)
    expect(first).toEqual(second)
  })

  test('Values within [-√3, √3]', () => {
    const low = -Math.sqrt(3)*means.length*means.length
    const high = Math.sqrt(3)*means.length*means.length
    const samples = multivariateUniform(means, covariance, 50)
    samples.forEach(vec => vec.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(low)
      expect(v).toBeLessThanOrEqual(high)
    }))
  })

  test('Shape and size', () => {
    const single = multivariateUniform(means, covariance)
    expect(single).toHaveLength(2)
    const array = multivariateUniform(means, covariance, 4)
    expect(array).toHaveLength(4)
    array.forEach(vec => expect(vec).toHaveLength(2))
  })
})
