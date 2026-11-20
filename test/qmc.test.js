import { describe, test, expect } from 'vitest'
import { qmc, createGenerator, seed, random } from '../index.js'

// reference values from scipy.stats.qmc (scramble=False)
describe('Sobol', () => {
  test('unscrambled points match scipy', () => {
    expect(new qmc.Sobol(3, { scramble: false }).random(5)).toEqual(
      [[0, 0, 0], [0.5, 0.5, 0.5], [0.75, 0.25, 0.25], [0.25, 0.75, 0.75], [0.375, 0.375, 0.625]])
    expect(new qmc.Sobol(5, { scramble: false }).random(8)[7]).toEqual([0.125, 0.625, 0.375, 0.125, 0.125])
    expect(new qmc.Sobol(256, { scramble: false }).random(4)[3].slice(250)).toEqual([0.75, 0.25, 0.75, 0.25, 0.25, 0.25])
  })

  test('scrambled points keep the (0, m, 1) stratification of every axis', () => {
    const pts = new qmc.Sobol(4, { rng: createGenerator(1) }).random(64)
    for (let k = 0; k < 4; k++) {
      const cells = new Set(pts.map((p) => Math.floor(p[k] * 64)))
      expect(cells.size).toBe(64)
    }
    expect(pts.flat().every((x) => x >= 0 && x < 1)).toBe(true)
  })

  test('scrambling is reproducible with a generator and leaves the global stream alone', () => {
    seed(3)
    const expected = random()
    seed(3)
    const a = new qmc.Sobol(2, { rng: createGenerator(9) }).random(8)
    const b = new qmc.Sobol(2, { rng: createGenerator(9) }).random(8)
    expect(a).toEqual(b)
    expect(random()).toBe(expected)
  })

  test('reset, fastForward and lower discrepancy than random points', () => {
    const s = new qmc.Sobol(2, { rng: createGenerator(2) })
    const first = s.random(4)
    s.reset()
    expect(s.random(4)).toEqual(first)
    const t = new qmc.Sobol(2, { scramble: false }).fastForward(4)
    expect(t.random(1)).toEqual([new qmc.Sobol(2, { scramble: false }).random(5)[4]])
    expect(t.numGenerated).toBe(5)
    const rng = createGenerator(4)
    const sobol = new qmc.Sobol(3, { rng }).random(256)
    const mc = rng.random([256, 3])
    expect(qmc.discrepancy(sobol)).toBeLessThan(qmc.discrepancy(mc) / 5)
  })

  test('validation', () => {
    expect(() => new qmc.Sobol(257)).toThrow()
    expect(() => new qmc.Sobol(0)).toThrow()
    expect(() => new qmc.Sobol(2).random(-1)).toThrow()
    expect(new qmc.Sobol(2, { scramble: false, directions: [[1], [3, 1]] }).random(2)).toEqual([[0, 0], [0.5, 0.5]])
  })
})

describe('Halton', () => {
  test('unscrambled points match scipy', () => {
    expect(new qmc.Halton(3, { scramble: false }).random(4)).toEqual(
      [[0, 0, 0], [0.5, 0.3333333333333333, 0.2], [0.25, 0.6666666666666666, 0.4], [0.75, 0.1111111111111111, 0.6000000000000001]])
    expect(new qmc.Halton(4, { scramble: false }).random(6)[5]).toEqual([0.625, 0.7777777777777777, 0.04, 0.7142857142857142])
  })

  test('scrambled Halton stays stratified in base b', () => {
    const pts = new qmc.Halton(2, { rng: createGenerator(5) }).random(9)
    expect(new Set(pts.map((p) => Math.floor(p[1] * 9))).size).toBe(9)
    expect(pts.flat().every((x) => x >= 0 && x < 1)).toBe(true)
    expect(() => new qmc.Halton(1001)).toThrow()
  })
})

describe('LatinHypercube', () => {
  test('one point per stratum on every axis', () => {
    const pts = new qmc.LatinHypercube(3, { rng: createGenerator(6) }).random(50)
    for (let k = 0; k < 3; k++) {
      expect(new Set(pts.map((p) => Math.floor(p[k] * 50))).size).toBe(50)
    }
    const centered = new qmc.LatinHypercube(2, { centered: true }).random(4)
    centered.flat().forEach((x) => expect([0.125, 0.375, 0.625, 0.875]).toContain(x))
  })
})

describe('PoissonDisk', () => {
  test('points respect the minimal distance', () => {
    const engine = new qmc.PoissonDisk(2, { radius: 0.1, rng: createGenerator(7) })
    const pts = engine.fillSpace()
    expect(pts.length).toBeGreaterThan(40)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])).toBeGreaterThanOrEqual(0.1)
      }
    }
    expect(pts.flat().every((x) => x >= 0 && x < 1)).toBe(true)
    expect(new qmc.PoissonDisk(3, { radius: 0.2 }).random(5)).toHaveLength(5)
    expect(() => new qmc.PoissonDisk(2, { radius: 0 })).toThrow()
  })
})

describe('scale and discrepancy', () => {
  test('scale round trip and validation', () => {
    const pts = [[0, 0.5], [1, 0.25]]
    const scaled = qmc.scale(pts, [-1, 10], [1, 20])
    expect(scaled).toEqual([[-1, 15], [1, 12.5]])
    expect(qmc.scale(scaled, [-1, 10], [1, 20], true)).toEqual(pts)
    expect(() => qmc.scale(pts, [0], [1, 2])).toThrow()
    expect(() => qmc.scale(pts, [1, 0], [0, 1])).toThrow()
    expect(() => qmc.scale([[0.5]], [0, 0], [1, 1])).toThrow()
  })

  test('discrepancy matches scipy', () => {
    const x = [[0.1, 0.7], [0.4, 0.2], [0.9, 0.5], [0.35, 0.95]]
    expect(qmc.discrepancy(x)).toBeCloseTo(0.04234782986111085, 14)
    expect(qmc.discrepancy(x, 'WD')).toBeCloseTo(0.0620245659722225, 14)
    expect(qmc.discrepancy(x, 'MD')).toBeCloseTo(0.06136349826388843, 14)
    expect(qmc.discrepancy(x, 'L2-star')).toBeCloseTo(0.10798300727943796, 14)
    expect(() => qmc.discrepancy([])).toThrow()
    expect(() => qmc.discrepancy([[2]])).toThrow()
    expect(() => qmc.discrepancy(x, 'nope')).toThrow()
  })
})
