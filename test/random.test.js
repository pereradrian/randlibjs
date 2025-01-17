import { seed, randint, uniform, normal, cauchy, exponential, permutation, multivariateNormal, chisquare, poisson } from '../index'
import { describe, test, expect } from 'vitest'

describe('Randint module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [randint(0, 10), randint(0, 10), randint(0, 10)]
    seed(12345)
    const secondSequence = [randint(0, 10), randint(0, 10), randint(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates deterministic sequences with the same seed (negative values)', () => {
    seed(12345)
    const firstSequence = [randint(-10, 10), randint(0, 10), randint(0, 10)]
    seed(12345)
    const secondSequence = [randint(-10, 10), randint(0, 10), randint(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [randint(0, 10), randint(0, 10), randint(0, 10)]
    seed(67890)
    const secondSequence = [randint(0, 10), randint(0, 10), randint(0, 10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Generates numbers in the correct range', () => {
    seed(12345)
    const randomNumber = randint(5, 15)
    expect(randomNumber).toBeGreaterThanOrEqual(5)
    expect(randomNumber).toBeLessThan(15)
  })
  test('Generates arrays with correct shape', () => {
    seed(12345)
    const array = randint(0, 10, [2, 3])
    expect(array).toHaveLength(2)
    expect(array[0]).toHaveLength(3)
    expect(array[1]).toHaveLength(3)
  })
})
describe('Uniform module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)]
    seed(12345)
    const secondSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)]
    seed(67890)
    const secondSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Generates numbers in the correct range', () => {
    seed(12345)
    const randomNumber = uniform(5, 15)
    expect(randomNumber).toBeGreaterThanOrEqual(5)
    expect(randomNumber).toBeLessThan(15)
  })
  test('Generates arrays with correct shape', () => {
    seed(12345)
    const array = uniform(0, 10, [2, 3])
    expect(array).toHaveLength(2)
    expect(array[0]).toHaveLength(3)
    expect(array[1]).toHaveLength(3)
  })
})
describe('Normal module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [normal(0, 10), normal(0, 10), normal(0, 10)]
    seed(12345)
    const secondSequence = [normal(0, 10), normal(0, 10), normal(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [normal(0, 10), normal(0, 10), normal(0, 10)]
    seed(67890)
    const secondSequence = [normal(0, 10), normal(0, 10), normal(0, 10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
})
describe('Cauchy module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    seed(12345)
    const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    seed(67890)
    const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Cauchy generator produces values in correct range', () => {
    const samples = cauchy(0, 1, 1000) // 1000 random values
    expect(samples).toBeInstanceOf(Array)
    expect(samples.length).toBe(1000)
    // Check that samples have a reasonable range (Cauchy has long tails, so wide bounds are expected)
    const finiteSamples = samples.filter(x => Math.abs(x) < 1000)
    expect(finiteSamples.length).toBeGreaterThan(900) // Most values should be finite
  })
})
describe('Exponential module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    seed(12345)
    const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    seed(67890)
    const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Exponential generator produces values in correct range', () => {
    const lambda = 2 // Rate parameter
    const samples = exponential(lambda, 1000) // 1000 random values
    expect(samples).toBeInstanceOf(Array)
    expect(samples.length).toBe(1000)
    expect(samples.every(x => x >= 0)).toBe(true) // All values must be non-negative
    // Check that the mean is close to 1/lambda
    const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length
    expect(mean).toBeCloseTo(1 / lambda, 1) // Allow small numerical error
  })
})
describe('Permutation  module tests', () => {
  test('Permutes an array correctly', () => {
    seed(12345)
    const arr = [1, 2, 3, 4, 5]
    const result = permutation([...arr]) // Hacemos una copia para evitar modificar el original
    expect(result).not.toEqual(arr) // Generalmente no será igual al original
    expect(result.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b)) // Comprobamos que contiene los mismos elementos
  })
  test('Generates a permutation of a range when input is a number', () => {
    const result = permutation(5)
    expect(result.length).toBe(5) // Debe tener longitud 5
    expect(result.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]) // Comprobamos que contiene todos los valores
  })
  test('Throws an error for invalid number input', () => {
    expect(() => permutation(-1)).toThrow('If x is a number, it must be a positive integer.')
    expect(() => permutation(0)).toThrow('If x is a number, it must be a positive integer.')
    expect(() => permutation(1.5)).toThrow('If x is a number, it must be a positive integer.')
  })
  test('Throws an error for non-array or number inputs', () => {
    expect(() => permutation('string')).toThrow('Input must be an array or a positive integer.')
    expect(() => permutation(null)).toThrow('Input must be an array or a positive integer.')
    expect(() => permutation({})).toThrow('Input must be an array or a positive integer.')
  })
})
describe('Multivariate Normal Distribution', () => {
    test('Generates samples with correct mean and covariance (2D case)', () => {
        const mean = [1, 2]
        const covariance = [
            [1, 0.8],
            [0.8, 1]
        ]
        const samples = multivariateNormal(mean, covariance, 10000)

        // Calculate sample mean and covariance
        const sampleMean = samples.reduce(
            (acc, sample) => acc.map((sum, i) => sum + sample[i]),
            [0, 0]
        ).map(sum => sum / samples.length)

        const sampleCovariance = [
            [0, 0],
            [0, 0]
        ]
        samples.forEach(sample => {
            const diff = sample.map((val, i) => val - sampleMean[i])
            sampleCovariance[0][0] += diff[0] * diff[0]
            sampleCovariance[0][1] += diff[0] * diff[1]
            sampleCovariance[1][0] += diff[1] * diff[0]
            sampleCovariance[1][1] += diff[1] * diff[1]
        })
        sampleCovariance.forEach((row, i) =>
            row.forEach((val, j) => (sampleCovariance[i][j] /= samples.length))
        )

        // Assertions
        expect(sampleMean[0]).toBeCloseTo(mean[0], 1)
        expect(sampleMean[1]).toBeCloseTo(mean[1], 1)

        expect(sampleCovariance[0][0]).toBeCloseTo(covariance[0][0], 1)
        expect(sampleCovariance[0][1]).toBeCloseTo(covariance[0][1], 1)
        expect(sampleCovariance[1][0]).toBeCloseTo(covariance[1][0], 1)
        expect(sampleCovariance[1][1]).toBeCloseTo(covariance[1][1], 1)
    })

    test('Works with uncorrelated variables (diagonal covariance)', () => {
        seed(12345)
        const mean = [0, 0]
        const covariance = [
            [2, 0],
            [0, 3]
        ]
        const samples = multivariateNormal(mean, covariance, 10000)

        // Calculate sample covariance
        const sampleCovariance = [
            [0, 0],
            [0, 0]
        ]
        samples.forEach(sample => {
            sampleCovariance[0][0] += sample[0] * sample[0]
            sampleCovariance[1][1] += sample[1] * sample[1]
            sampleCovariance[0][1] += sample[0] * sample[1]
            sampleCovariance[1][0] += sample[1] * sample[0]
        })
        sampleCovariance.forEach((row, i) =>
            row.forEach((val, j) => (sampleCovariance[i][j] /= samples.length))
        )

        // Assertions
        expect(sampleCovariance[0][0]).toBeCloseTo(covariance[0][0], 1)
        expect(sampleCovariance[1][1]).toBeCloseTo(covariance[1][1], 1)
        expect(sampleCovariance[0][1]).toBeCloseTo(0, 1) // Near-zero covariance
        expect(sampleCovariance[1][0]).toBeCloseTo(0, 1)
    })
})
/**
 * Helper function to calculate mean of an array
 */
function calculateMean(arr) {
  return arr.reduce((sum, x) => sum + x, 0) / arr.length
}

/**
* Helper function to calculate variance of an array
*/
function calculateVariance(arr, mean) {
  return arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length
}
describe("Chi-squared Distribution Tests", () => {
  test("Generates a single value for null size", () => {
      const result = chisquare(3, null)
      expect(typeof result).toBe("number")
      expect(result).toBeGreaterThanOrEqual(0) // Chi-squared values are non-negative
  })

  test("Generates a 1D array for size as a number", () => {
      const size = 10
      const result = chisquare(3, size)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(size)
      result.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0)
      })
  })

  test("Generates a multidimensional array for size as an array", () => {
      const size = [3, 2]
      const result = chisquare(3, size)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(size[0])
      result.forEach(row => {
          expect(Array.isArray(row)).toBe(true)
          expect(row.length).toBe(size[1])
          row.forEach(value => {
              expect(value).toBeGreaterThanOrEqual(0)
          })
      })
  })

  test("Throws an error for invalid degrees of freedom", () => {
      expect(() => chisquare(-1, null)).toThrow("Degrees of freedom (k) must be a positive integer.")
      expect(() => chisquare(0, null)).toThrow("Degrees of freedom (k) must be a positive integer.")
      expect(() => chisquare(2.5, null)).toThrow("Degrees of freedom (k) must be a positive integer.")
  })

  test("Throws an error for invalid size parameter", () => {
      expect(() => chisquare(3, "invalid")).toThrow("size must be a number, an array, or null")
  })

  test("Approximates correct mean and variance", () => {
      seed(0)
      const degreesOfFreedom = 5
      const sampleSize = 10000
      const samples = chisquare(degreesOfFreedom, sampleSize)
      
      const mean = calculateMean(samples)
      const variance = calculateVariance(samples, mean)

      // Expected mean and variance
      const expectedMean = degreesOfFreedom
      const expectedVariance = 2 * degreesOfFreedom

      expect(mean).toBeCloseTo(expectedMean, 0.1) // Allow small deviation
      expect(variance).toBeCloseTo(expectedVariance, 0.1)
  })
})
describe('Poisson module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [poisson(10), poisson(10), poisson(10)]
    seed(12345)
    const secondSequence = [poisson(10), poisson(10), poisson(10)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [poisson(10), poisson(10), poisson(10)]
    seed(67890)
    const secondSequence = [poisson(10), poisson(10), poisson(10)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Generates arrays with correct shape', () => {
    seed(12345)
    const array = poisson(10, [2, 3])
    expect(array).toHaveLength(2)
    expect(array[0]).toHaveLength(3)
    expect(array[1]).toHaveLength(3)
  })
})