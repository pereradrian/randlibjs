import { describe, test, expect } from 'vitest'
import { Xoshiro128StarStar, PCG32, MT19937, FunctionBitGenerator, createBitGenerator, seedToWords } from '../src/core/bit-generators.js'
import { seed, getState, setState, setRandomSource, uniform, randint } from '../index.js'
import { getRandomGenerator } from '../src/functions/seed.js'

describe('MT19937', () => {
  test('matches the reference implementation (init_genrand(5489))', () => {
    const mt = new MT19937(5489)
    expect([mt.nextUint32(), mt.nextUint32()]).toEqual([3499211612, 581869302])
  })

  test('matches numpy RandomState integer stream', () => {
    // np.random.RandomState(12345).randint(0, 2**32, dtype=np.uint64, size=3)
    const mt = new MT19937(12345)
    expect([mt.nextUint32(), mt.nextUint32(), mt.nextUint32()]).toEqual([3992670690, 3823185381, 1358822685])
  })

  test('matches numpy RandomState random_sample', () => {
    // np.random.RandomState(42).random_sample(3)
    const mt = new MT19937(42)
    expect([mt.random(), mt.random(), mt.random()]).toEqual([0.3745401188473625, 0.9507143064099162, 0.7319939418114051])
  })

  test('array seeding (init_by_array) is deterministic and differs from scalar seeding', () => {
    const a = new MT19937([1, 2, 3])
    const b = new MT19937([1, 2, 3])
    expect(a.nextUint32()).toBe(b.nextUint32())
    expect(new MT19937([42]).nextUint32()).not.toBe(new MT19937(42).nextUint32())
  })
})

describe('PCG32', () => {
  test('matches the reference pcg32 demo output (seed 42, stream 54)', () => {
    const pcg = new PCG32(42, 54)
    const out = Array.from({ length: 6 }, () => pcg.nextUint32().toString(16))
    expect(out).toEqual(['a15c02b7', '7b47f409', 'ba1d3330', '83d2f293', 'bfa4784b', 'cbed606e'])
  })

  test('accepts bigint seed and stream', () => {
    const pcg = new PCG32(42n, 54n)
    expect(pcg.nextUint32().toString(16)).toBe('a15c02b7')
  })
})

describe('xoshiro128**', () => {
  test('matches the reference output for state [1, 2, 3, 4]', () => {
    const x = new Xoshiro128StarStar(0)
    x.setState({ state: [1, 2, 3, 4] })
    expect(x.nextUint32()).toBe(11520)
    expect(x.nextUint32()).toBe(0)
    expect(x.nextUint32()).toBe(5927040)
  })

  test('jump produces a different, deterministic stream', () => {
    const a = new Xoshiro128StarStar(7)
    const b = a.clone().jump()
    const c = a.clone().jump()
    expect(b.nextUint32()).toBe(c.nextUint32())
    expect(a.nextUint32()).not.toBe(new Xoshiro128StarStar(7).jump().nextUint32())
  })
})

describe('Common bit generator behaviour', () => {
  for (const name of ['xoshiro128**', 'pcg32', 'mt19937']) {
    test(`${name}: random() is in [0, 1) and reasonably uniform`, () => {
      const g = createBitGenerator(name, 2024)
      let sum = 0
      const n = 20000
      for (let i = 0; i < n; i++) {
        const u = g.random()
        expect(u).toBeGreaterThanOrEqual(0)
        expect(u).toBeLessThan(1)
        sum += u
      }
      expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.01)
    })

    test(`${name}: state round trip and clone`, () => {
      const g = createBitGenerator(name, 99)
      g.random()
      const snapshot = JSON.parse(JSON.stringify(g.getState()))
      const clone = g.clone()
      const expected = [g.random(), g.random()]
      expect([clone.random(), clone.random()]).toEqual(expected)
      const restored = createBitGenerator(name, 1)
      restored.setState(snapshot)
      expect([restored.random(), restored.random()]).toEqual(expected)
    })

    test(`${name}: unseeded generators differ`, () => {
      expect(createBitGenerator(name).nextUint32()).not.toBe(createBitGenerator(name).nextUint32())
    })
  }

  test('unknown bit generator throws', () => {
    expect(() => createBitGenerator('nope', 1)).toThrow('Unknown bit generator')
  })

  test('invalid states throw', () => {
    expect(() => new Xoshiro128StarStar(1).setState({})).toThrow()
    expect(() => new PCG32(1).setState({})).toThrow()
    expect(() => new MT19937(1).setState({})).toThrow()
  })
})

describe('seedToWords', () => {
  test('supports numbers, bigints, strings and arrays', () => {
    expect(seedToWords(5)).toEqual([5])
    expect(seedToWords(2 ** 40 + 3)).toEqual([3, 256])
    expect(seedToWords(2n ** 40n + 3n)).toEqual([3, 256])
    expect(seedToWords('ab')).toEqual([97, 98])
    expect(seedToWords([1, 2])).toEqual([1, 2])
    expect(seedToWords(-5)).not.toEqual(seedToWords(5))
  })

  test('rejects invalid seeds', () => {
    expect(() => seedToWords(Infinity)).toThrow()
    expect(() => seedToWords([])).toThrow()
    expect(() => seedToWords([1.5])).toThrow()
    expect(() => seedToWords({})).toThrow()
  })
})

describe('Global seeding and state', () => {
  test('seed accepts numbers, bigints, strings and arrays', () => {
    for (const s of [1, 2n ** 70n, 'hello', [1, 2, 3]]) {
      seed(s)
      const a = uniform()
      seed(s)
      expect(uniform()).toBe(a)
    }
  })

  test('seed with a bit generator name', () => {
    seed(42, 'mt19937')
    expect(uniform()).toBe(0.3745401188473625)
  })

  test('seed rejects invalid values', () => {
    expect(() => seed({})).toThrow()
  })

  test('getState / setState restore the global stream', () => {
    seed(3)
    uniform()
    const state = getState()
    const expected = uniform(0, 1, 5)
    setState(state)
    expect(uniform(0, 1, 5)).toEqual(expected)
  })

  test('setRandomSource installs a custom function', () => {
    setRandomSource(() => 0.5)
    expect(uniform()).toBe(0.5)
    expect(randint(10)).toBe(8) // 2^31 mod 10
    expect(getRandomGenerator()()).toBe(0.5)
    expect(() => setRandomSource(42)).toThrow()
    const f = new FunctionBitGenerator(() => 0.25)
    expect(f.clone().random()).toBe(0.25)
    seed(1)
  })
})
