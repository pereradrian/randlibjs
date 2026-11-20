import { describe, test, expect } from 'vitest'
import { uniform, exponential, cauchy, lognormal, randint, seed, setRandomSource, integers } from '../index.js'
import { choleskyDecomposition } from '../src/functions/util/cholesky.js'
import { matMul } from '../src/functions/util/linalg.js'
import { baseGenerator } from '../src/functions/base-generator.js'

describe('parameter validation of the classic functions', () => {
  test('invalid parameters throw', () => {
    expect(() => uniform(1, 1)).toThrow()
    expect(() => exponential(0)).toThrow()
    expect(() => exponential('1')).toThrow()
    expect(() => cauchy(0, 0)).toThrow()
    expect(() => lognormal(0, -1)).toThrow()
    expect(() => randint(5, 5)).toThrow()
    expect(() => randint(0.5, 2)).toThrow()
    expect(() => randint(2 ** 54, 2 ** 54 + 2)).toThrow()
  })

  test('size validation', () => {
    expect(() => baseGenerator(() => 1, -1)).toThrow()
    expect(() => baseGenerator(() => 1, 1.5)).toThrow()
    expect(() => baseGenerator(() => 1, [2, -1])).toThrow()
    expect(() => baseGenerator(() => 1, 'x')).toThrow()
    expect(baseGenerator(() => 1, [2, 0])).toEqual([[], []])
  })
})

describe('integer sampling paths', () => {
  test('ranges above 2^32 without a 64-bit bit generator', () => {
    seed(1)
    const xs = randint(0, 2 ** 40, 2000)
    expect(xs.every((x) => Number.isSafeInteger(x) && x >= 0 && x < 2 ** 40)).toBe(true)
    expect(xs.some((x) => x > 2 ** 39)).toBe(true)
    expect(integers(0, 2 ** 32, 5).every((x) => x >= 0 && x < 2 ** 32)).toBe(true)
    expect(integers(7, 7, 2, true)).toEqual([7, 7])
  })

  test('custom function sources use direct scaling', () => {
    setRandomSource(() => 0.999999)
    expect(randint(0, 2 ** 40)).toBeLessThan(2 ** 40)
    expect(integers(10)).toBe(9)
    seed(1)
  })
})

describe('linear algebra helpers', () => {
  test('cholesky of a singular PSD matrix and invalid matrices', () => {
    const L = choleskyDecomposition([[4, 2, 2], [2, 1, 1], [2, 1, 3]])
    const back = matMul(L, L.map((_, i) => L.map((row) => row[i])))
    expect(back[2][2]).toBeCloseTo(3, 12)
    expect(back[0][1]).toBeCloseTo(2, 12)
    expect(() => choleskyDecomposition([[1, 2, 0], [2, 4, 0], [0, 0, -1]])).toThrow()
    expect(() => choleskyDecomposition([[0, 1], [1, 0]])).toThrow()
    expect(matMul([], [])).toEqual([])
    expect(matMul([[0, 1]], [[1], [2]])).toEqual([[2]])
  })
})
