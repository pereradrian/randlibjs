import { describe, test, expect } from 'vitest'
import { seed, choice, shuffle, permutation, permuted, random, bytes } from '../index.js'
import { expectChiSquare } from './helpers/stats.js'

const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())

describe('random and bytes', () => {
  test('random is in [0, 1) and matches numpy legacy with mt19937', () => {
    seed(42, 'mt19937')
    expect(random(3)).toEqual([0.3745401188473625, 0.9507143064099162, 0.7319939418114051])
    seed(1)
    expect(random([2, 2]).flat().every((u) => u >= 0 && u < 1)).toBe(true)
  })

  test('bytes', () => {
    seed(2)
    const b = bytes(30000)
    expect(b).toBeInstanceOf(Uint8Array)
    expectChiSquare(Array.from(b), () => 1 / 256, 0, 255)
    expect(bytes(0)).toHaveLength(0)
    expect(() => bytes(-1)).toThrow()
  })
})

describe('choice', () => {
  test('integer population and uniform frequencies', () => {
    seed(3)
    const xs = choice(6, null, 30000)
    expectChiSquare(xs, () => 1 / 6, 0, 5)
  })

  test('weights are normalised and respected', () => {
    seed(4)
    const xs = choice([0, 1, 2], [2, 6, 2], 30000)
    expectChiSquare(xs, (k) => [0.2, 0.6, 0.2][k], 0, 2)
    expect(choice(['a', 'b'], [0, 1], 5)).toEqual(['b', 'b', 'b', 'b', 'b'])
  })

  test('without replacement returns distinct elements', () => {
    seed(5)
    for (const k of [1, 10, 40, 52]) {
      const hand = choice(52, null, k, false)
      expect(new Set(hand).size).toBe(k)
    }
    const grid = choice(['a', 'b', 'c', 'd'], null, [2, 2], false)
    expect(new Set(grid.flat()).size).toBe(4)
    expect(typeof choice(10, null, null, false)).toBe('number')
    const big = choice(1e12, null, 1000, false)
    expect(new Set(big).size).toBe(1000)
  })

  test('without replacement is uniform over positions', () => {
    seed(6)
    const firsts = []
    for (let i = 0; i < 20000; i++) firsts.push(choice(5, null, 3, false)[1])
    expectChiSquare(firsts, () => 0.2, 0, 4)
  })

  test('weighted without replacement follows successive sampling', () => {
    seed(7)
    const w = [5, 3, 2]
    const firsts = []
    const seconds = []
    for (let i = 0; i < 20000; i++) {
      const [a, b] = choice([0, 1, 2], w, 2, false)
      firsts.push(a)
      seconds.push(b)
    }
    expectChiSquare(firsts, (k) => w[k] / 10, 0, 2)
    // P(second = j) = sum_i p_i * p_j / (1 - p_i)
    const p = w.map((x) => x / 10)
    const second = (j) => p.reduce((s, pi, i) => (i === j ? s : s + pi * p[j] / (1 - pi)), 0)
    expectChiSquare(seconds, second, 0, 2)
    expect(() => choice([1, 2, 3], [1, 0, 0], 2, false)).toThrow('non-zero')
  })

  test('validation', () => {
    expect(() => choice([])).toThrow()
    expect(() => choice(0)).toThrow()
    expect(() => choice('abc')).toThrow()
    expect(() => choice([1, 2], [1])).toThrow()
    expect(() => choice([1, 2], [-1, 2])).toThrow()
    expect(() => choice([1, 2], [0, 0])).toThrow()
    expect(() => choice([1, 2], null, 3, false)).toThrow()
  })
})

describe('shuffle, permutation, permuted', () => {
  test('shuffle along axis 1 moves whole columns', () => {
    seed(8)
    const m = [[1, 2, 3], [10, 20, 30]]
    shuffle(m, 1)
    expect(m[1]).toEqual(m[0].map((x) => x * 10))
    expect([...m[0]].sort()).toEqual([1, 2, 3])
    expect(() => shuffle([1, 2], 1)).toThrow()
    expect(() => shuffle([1, 2], -1)).toThrow()
  })

  test('shuffle is uniform over permutations', () => {
    seed(9)
    const keys = []
    for (let i = 0; i < 24000; i++) keys.push(shuffle([0, 1, 2, 3]).join(''))
    const freq = count(keys)
    expect(freq.size).toBe(24)
    for (const c of freq.values()) expect(Math.abs(c - 1000)).toBeLessThan(150)
  })

  test('permutation does not modify its input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = permutation(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(input)
    const nested = [[1, 2], [3, 4]]
    const p = permutation(nested, 1)
    expect(nested).toEqual([[1, 2], [3, 4]])
    expect(p[1][0] - p[0][0]).toBe(2)
  })

  test('permuted shuffles each line independently', () => {
    seed(10)
    const m = Array.from({ length: 50 }, () => [0, 1, 2, 3])
    const out = permuted(m, 1)
    expect(m[0]).toEqual([0, 1, 2, 3])
    out.forEach((row) => expect([...row].sort()).toEqual([0, 1, 2, 3]))
    expect(new Set(out.map((r) => r.join(''))).size).toBeGreaterThan(10)
    const cols = permuted([[1, 2], [3, 4], [5, 6]], 0)
    expect(cols.map((r) => r[0]).sort()).toEqual([1, 3, 5])
    expect(cols.map((r) => r[1]).sort()).toEqual([2, 4, 6])
    const flat = permuted([[1, 2], [3, 4]])
    expect(flat.flat().sort()).toEqual([1, 2, 3, 4])
    const cube = permuted([[[1, 2], [3, 4]], [[5, 6], [7, 8]]], 2)
    expect(cube.flat(2).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    const same = [3, 2, 1]
    expect(permuted(same, 0, true)).toBe(same)
    expect(() => permuted([1, 2], 1)).toThrow()
    expect(() => permuted('x')).toThrow()
  })
})
