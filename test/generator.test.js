import { describe, test, expect } from 'vitest'
import * as lib from '../index.js'
import { Generator, createGenerator, defaultRng, seed, uniform, normal, PCG32 } from '../index.js'

describe('Generator', () => {
  test('exposes every sampling function as a method', () => {
    const rng = createGenerator(1)
    for (const name of ['normal', 'uniform', 'integers', 'choice', 'dirichlet', 'multivariateNormal', 'permuted', 'bytes', 'gamma', 'zipf']) {
      expect(typeof rng[name]).toBe('function')
    }
    expect(defaultRng).toBe(createGenerator)
  })

  test('same seed gives the same stream, independent of the global generator', () => {
    const a = createGenerator(123)
    const b = createGenerator(123)
    const first = a.normal(0, 1, 5)
    seed(999)
    uniform(0, 1, 10)
    expect(b.normal(0, 1, 5)).toEqual(first)
    expect(createGenerator(124).normal(0, 1, 5)).not.toEqual(first)
  })

  test('does not disturb the global stream', () => {
    seed(5)
    const expected = normal(0, 1, 3)
    seed(5)
    const rng = createGenerator(77)
    const out = []
    for (let i = 0; i < 3; i++) {
      out.push(normal())
      rng.normal(0, 1, 4)
    }
    expect(out).toEqual(expected)
  })

  test('mt19937 generator reproduces numpy RandomState', () => {
    const rng = createGenerator(42, 'mt19937')
    expect(rng.random()).toBe(0.3745401188473625)
    const rng2 = createGenerator(42, 'mt19937')
    expect(rng2.standardNormal()).toBeCloseTo(0.4967141530112327, 14)
  })

  test('state save/restore and clone', () => {
    const rng = createGenerator(9, 'pcg32')
    rng.normal()
    const state = rng.getState()
    const clone = rng.clone()
    const values = rng.gamma(2, 1, 4)
    expect(clone.gamma(2, 1, 4)).toEqual(values)
    expect(rng.setState(state).gamma(2, 1, 4)).toEqual(values)
  })

  test('spawn creates deterministic independent children', () => {
    const kids = createGenerator(3).spawn(3)
    const again = createGenerator(3).spawn(3)
    expect(kids.map((k) => k.random())).toEqual(again.map((k) => k.random()))
    expect(new Set(kids.map((k) => k.random())).size).toBe(3)
    expect(kids[0].bitGenerator.name).toBe('xoshiro128**')
    expect(() => createGenerator(1).spawn(-1)).toThrow()
  })

  test('accepts a bit generator instance; run() redirects global functions', () => {
    const rng = createGenerator(new PCG32(42, 54))
    expect(rng).toBeInstanceOf(Generator)
    const g1 = createGenerator(8)
    const g2 = createGenerator(8)
    expect(g1.run(() => uniform(0, 1, 3))).toEqual(g2.uniform(0, 1, 3))
    expect(() => new Generator({})).toThrow()
    expect(new Generator().random()).toBeLessThan(1)
  })

  test('errors propagate and leave the global source intact', () => {
    const rng = createGenerator(1)
    seed(10)
    const expected = lib.random()
    seed(10)
    expect(() => rng.normal(0, -1)).toThrow()
    expect(lib.random()).toBe(expected)
  })
})
