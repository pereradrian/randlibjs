import { choice, permutation, randString, shuffle, logo, seed, random } from '../index.js'
import { describe, test, expect } from 'vitest'

describe('Choice module tests', () => {
  test('Selects element from array', () => {
    const arr = [1,2,3,4]
    const val = choice(arr)
    expect(arr).toContain(val)
  })

  test('Throws error for empty array', () => {
    expect(() => choice([])).toThrow('Items array can not be empty.')
  })

  test('Generates deterministic sequences with same seed', () => {
    seed(42)
    const first = choice(['a', 'b', 'c', 'd'], null, 10)
    seed(42)
    expect(choice(['a', 'b', 'c', 'd'], null, 10)).toEqual(first)
  })
})

describe('Permutation module tests', () => {
  test('Permutes array correctly', () => {
    const arr = [1,2,3]
    const result = permutation(arr)
    expect(result.sort()).toEqual(arr.sort())
  })

  test('Handles empty array', () => {
    expect(permutation([])).toEqual([])
  })

  test('Throws error for invalid input', () => {
    expect(() => permutation(-1)).toThrow()
    expect(() => permutation('str')).toThrow()
  })
})

describe('RandString module tests', () => {
  test('Generates string of correct length', () => {
    const str = randString(10)
    expect(str).toHaveLength(10)
    expect(typeof str).toBe('string')
  })

  test('Throws for invalid length', () => {
    expect(() => randString(-1)).toThrow()
    expect(() => randString(2.5)).toThrow()
  })
})

describe('Shuffle module tests', () => {
  test('Shuffles array without changing elements', () => {
    const arr = [1,2,3,4]
    const copy = [...arr]
    const shuffled = shuffle(arr)
    expect(shuffled.sort()).toEqual(copy.sort())
  })

  test('Handles empty array', () => {
    expect(shuffle([])).toEqual([])
  })
})
describe('Logo module tests', () => {
  test('Generates an SVG string of correct size', () => {
    const size = 100
    const svg = logo(size)
    expect(typeof svg).toBe('string')
    expect(svg.length).toBeGreaterThan(0)
    expect(svg).toContain('<svg')       // contains the svg tag
    expect(svg).toContain('<rect')      // contains the base rectangle
    expect(svg).toContain('<circle')    // contains at least one circle
  })

  test('Is reproducible with a seed and leaves the global stream alone', () => {
    seed(3)
    const expected = random()
    seed(3)
    const before = logo(64, { seed: 7 })
    expect(random()).toBe(expected)
    expect(logo(64, { seed: 7 })).toBe(before)
    expect(logo(64, { seed: 8 })).not.toBe(before)
    expect(logo(64, { seed: 7, rounded: false })).toContain('rx="0"')
    expect(logo(64, { seed: 7, background: 'none' })).not.toContain('<rect')
  })

  test('Escapes the colours and rejects a bad size', () => {
    const svg = logo(32, { seed: 1, background: '"><script>x</script>', foreground: '"/><b>' })
    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('<b>')
    expect(() => logo('1"><script>')).toThrow()
    expect(() => logo(0)).toThrow()
  })

  test('Keeps every circle inside the canvas and apart from the others', () => {
    const svg = logo(1000, { seed: 1 })
    const cs = [...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((m) => m.slice(1).map(Number))
    expect(cs.length).toBeGreaterThan(80)
    for (const [x, y, r] of cs) {
      expect(x - r).toBeGreaterThan(0)
      expect(x + r).toBeLessThan(1000)
      expect(y - r).toBeGreaterThan(0)
      expect(y + r).toBeLessThan(1000)
    }
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        expect(Math.hypot(cs[i][0] - cs[j][0], cs[i][1] - cs[j][1])).toBeGreaterThan(cs[i][2] + cs[j][2])
      }
    }
  })
})