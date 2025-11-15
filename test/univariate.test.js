import { seed, randint, uniform, normal, cauchy, exponential, permutation, chisquare, poisson, choice, randString, mixture } from '../index.js'
import { range } from '../src/functions/util/range.js'
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
      expect(() => chisquare(3, "invalid")).toThrow("Size must be a number, an array, or null.")
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
describe('Poisson module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [poisson(1), poisson(1), poisson(1)]
    seed(12345)
    const secondSequence = [poisson(1), poisson(1), poisson(1)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [poisson(1), poisson(1), poisson(1)]
    seed(67890)
    const secondSequence = [poisson(1), poisson(1), poisson(1)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [poisson(31), poisson(31), poisson(31)]
    seed(12345)
    const secondSequence = [poisson(31), poisson(31), poisson(31)]
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [poisson(31), poisson(31), poisson(31)]
    seed(67890)
    const secondSequence = [poisson(31), poisson(31), poisson(31)]
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Poisson generator produces values in correct range', () => {
    const samples = poisson(1, 1000) // 1000 random values
    expect(samples).toBeInstanceOf(Array)
    expect(samples.length).toBe(1000)
  })
})
describe('Choice module tests', () => {
  const generate100Uniform = () => choice(range(100), null)
  const generate100Weighted = () => choice(range(100), range(100))
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = generate100Uniform()
    seed(12345)
    const secondSequence = generate100Uniform()
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = generate100Uniform()
    seed(67890)
    const secondSequence = generate100Uniform()
    expect(firstSequence).not.toEqual(secondSequence)
  })
  test('Generates deterministic sequences with the same seed (weighted)', () => {
    seed(12345)
    const firstSequence = generate100Weighted()
    seed(12345)
    const secondSequence = generate100Weighted()
    expect(firstSequence).toEqual(secondSequence)
  })
  test('Generates different sequences with different seeds (weighted)', () => {
    seed(12345)
    const firstSequence = generate100Weighted()
    seed(67890)
    const secondSequence = generate100Weighted()
    expect(firstSequence).not.toEqual(secondSequence)
  })
})
describe('randString module tests', () => {
  test('Generates deterministic sequences with the same seed', () => {
    seed(12345)
    const firstSequence = [randString(8), randString(8), randString(8)]
    seed(12345)
    const secondSequence = [randString(8), randString(8), randString(8)]
    expect(firstSequence).toEqual(secondSequence)
  })

  test('Generates different sequences with different seeds', () => {
    seed(12345)
    const firstSequence = [randString(8), randString(8), randString(8)]
    seed(67890)
    const secondSequence = [randString(8), randString(8), randString(8)]
    expect(firstSequence).not.toEqual(secondSequence)
  })

  test('Generates strings of correct length', () => {
    const str = randString(20)
    expect(typeof str).toBe('string')
    expect(str.length).toBe(20)
  })

  test('Uses custom character set when provided', () => {
    const chars = 'ABC'
    const str = randString(50, chars)
    expect([...str].every(c => chars.includes(c))).toBe(true)
  })

  test('Generates array of strings when size is a number', () => {
    const arr = randString(10, undefined, 5)
    expect(Array.isArray(arr)).toBe(true)
    expect(arr).toHaveLength(5)
    arr.forEach(s => {
      expect(typeof s).toBe('string')
      expect(s.length).toBe(10)
    })
  })

  test('Generates multidimensional array of strings when size is an array', () => {
    const matrix = randString(6, undefined, [2, 3])
    expect(Array.isArray(matrix)).toBe(true)
    expect(matrix.length).toBe(2)
    expect(matrix[0].length).toBe(3)
    matrix.flat().forEach(s => {
      expect(typeof s).toBe('string')
      expect(s.length).toBe(6)
    })
  })

  test('Throws for invalid length', () => {
    expect(() => randString(-5)).toThrow('Parameter "length" must be a positive integer.')
    expect(() => randString(2.5)).toThrow('Parameter "length" must be a positive integer.')
  })

  test('Throws for invalid chars', () => {
    expect(() => randString(10, '')).toThrow('Parameter "chars" must be a non-empty string.')
    expect(() => randString(10, null)).toThrow('Parameter "chars" must be a non-empty string.')
  })
})
describe('Mixture distribution tests', () => {

  test('Throws when number of generators and priors mismatch', () => {
    const gens = [() => uniform(0, 1)]
    const priors = [0.5, 0.5]
    expect(() => mixture(gens, priors)).toThrow("The number of priors must match the number of generators.")
  })

  test('Throws when priors do not sum to 1', () => {
    const gens = [() => uniform(0, 1), () => normal(0, 1)]
    const priors = [0.7, 0.7] // Incorrect
    expect(() => mixture(gens, priors)).toThrow("Priors must sum to 1.")
  })

  test('Produces deterministic output with same seed', () => {
    const gens = [() => uniform(0, 1), () => normal(0, 1)]
    const priors = [0.5, 0.5]

    seed(12345)
    const seq1 = [mixture(gens, priors), mixture(gens, priors), mixture(gens, priors)]

    seed(12345)
    const seq2 = [mixture(gens, priors), mixture(gens, priors), mixture(gens, priors)]

    expect(seq1).toEqual(seq2)
  })

  test('Produces different output with different seeds', () => {
    const gens = [() => uniform(0, 1), () => normal(0, 1)]
    const priors = [0.5, 0.5]

    seed(11111)
    const seq1 = [mixture(gens, priors), mixture(gens, priors), mixture(gens, priors)]

    seed(22222)
    const seq2 = [mixture(gens, priors), mixture(gens, priors), mixture(gens, priors)]

    expect(seq1).not.toEqual(seq2)
  })

  test('Generates arrays of correct shape', () => {
    const gens = [() => uniform(0, 1), () => normal(0, 1)]
    const priors = [0.5, 0.5]

    seed(12345)
    const arr = mixture(gens, priors, [3, 4])

    expect(arr).toHaveLength(3)
    expect(arr[0]).toHaveLength(4)
  })

  test('Mixture respects priors (approximate proportions)', () => {
    const gens = [
      () => 10,             // deterministic for test
      () => 20
    ]
    const priors = [0.7, 0.3]

    seed(999)
    const samples = mixture(gens, priors, 10000)

    const count10 = samples.filter(x => x === 10).length
    const count20 = samples.filter(x => x === 20).length

    expect(count10 / samples.length).toBeCloseTo(0.7, 1)
    expect(count20 / samples.length).toBeCloseTo(0.3, 1)
  })

  test('Works with nested multidimensional output', () => {
    const gens = [() => uniform(0, 1), () => normal(0, 1)]
    const priors = [0.5, 0.5]

    const size = [2, 2, 3]
    const out = mixture(gens, priors, size)

    expect(out.length).toBe(2)
    expect(out[0].length).toBe(2)
    expect(out[0][0].length).toBe(3)
  })

  test('Generators are actually invoked (sampling not cached)', () => {
    let counter1 = 0
    let counter2 = 0

    const gens = [
      () => { counter1++; return 1 },
      () => { counter2++; return 2 }
    ]
    const priors = [0.5, 0.5]

    mixture(gens, priors, 10)

    expect(counter1 + counter2).toBe(10)
  })

})
