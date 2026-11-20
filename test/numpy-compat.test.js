import { describe, test, expect } from 'vitest'
import { SeedSequence, PCG64, createGenerator, seed, random, getState, setState } from '../index.js'

// Reference values produced with numpy 2.x (see scripts/make_reference.py for scipy data)
describe('SeedSequence (numpy.random.SeedSequence)', () => {
  test('generate_state for integer, big and array entropy', () => {
    expect(new SeedSequence(42).generateState64(4).map(String)).toEqual(
      ['11465652750463011511', '15382171918060459190', '9018504550953525431', '3703499796004394495'])
    expect(new SeedSequence(2n ** 70n + 5n).generateState64(4).map(String)).toEqual(
      ['726263078096862806', '7809400558599790184', '11174137857383931066', '8975618194489585486'])
    expect(new SeedSequence([1, 2, 3]).generateState(8)).toEqual(
      [3822189696, 3026158655, 540542919, 1119972918, 171197509, 284685159, 4103278476, 2559395354])
    expect(new SeedSequence(0).generateState(2)).toEqual([2968811710, 3677149159])
  })

  test('spawn matches numpy', () => {
    const child = new SeedSequence(42).spawn(2)[1]
    expect(child.generateState(4)).toEqual([4091952314, 31242083, 366899054, 1794014678])
  })

  test('random entropy and validation', () => {
    expect(new SeedSequence().generateState(1)[0]).not.toBe(new SeedSequence().generateState(1)[0])
    expect(() => new SeedSequence(-1)).toThrow()
    expect(() => new SeedSequence(1.5)).toThrow()
  })
})

describe('PCG64 (numpy default bit generator)', () => {
  test('raw 64-bit outputs match PCG64(42).random_raw(3)', () => {
    const b = new PCG64(42)
    expect([b.nextUint64(), b.nextUint64(), b.nextUint64()].map(String)).toEqual(
      ['14276969152011380360', '8095878257575067585', '15838336090824644132'])
  })

  test('advance matches numpy', () => {
    expect(String(new PCG64(42).advance(1000).nextUint64())).toBe('1144862242765613434')
  })

  test('state round trip, also through JSON and the global seed', () => {
    const b = new PCG64(5)
    b.nextUint32()
    const snapshot = JSON.parse(JSON.stringify(b.getState()))
    const expected = [b.nextUint32(), b.random()]
    const c = new PCG64(1)
    c.setState(snapshot)
    expect([c.nextUint32(), c.random()]).toEqual(expected)
    expect(() => c.setState({})).toThrow()
    seed(3, 'pcg64')
    const st = getState()
    const r = random()
    setState(st)
    expect(random()).toBe(r)
  })
})

describe('createGenerator(seed, "pcg64") reproduces np.random.default_rng(seed)', () => {
  test('random()', () => {
    expect(createGenerator(42, 'pcg64').random(3)).toEqual([0.7739560485559633, 0.4388784397520523, 0.8585979199113825])
    expect(createGenerator(12345, 'pcg64').random(2)).toEqual([0.22733602246716966, 0.31675833970975287])
    expect(createGenerator(2n ** 100n, 'pcg64').random()).toBe(0.004225874802662788)
  })

  test('integers() with small, negative, 64-bit and inclusive ranges', () => {
    const rng = createGenerator(42, 'pcg64')
    expect(rng.integers(0, 10, 5)).toEqual([0, 7, 6, 4, 4])
    expect(rng.integers(0, 2 ** 40, 3)).toEqual([766764256790, 103549089075, 1072708119942])
    const g = createGenerator(7, 'pcg64')
    expect(g.integers(0, 1000, 6)).toEqual([944, 625, 684, 897, 578, 775])
    expect(g.integers(-5, 5, 4)).toEqual([3, -3, -5, -2])
    expect(g.integers(0, 2 ** 33, 2)).toEqual([7503766958, 45228621])
    expect(g.integers(1, 7, 3, true)).toEqual([4, 6, 1])
    expect(g.random()).toBe(0.4679349528437208)
  })

  test('uniform() and array seeds', () => {
    const u = createGenerator(42, 'pcg64').uniform(-3, 5, 2)
    expect(u[0]).toBeCloseTo(3.1916483884477067, 14)
    expect(u[1]).toBeCloseTo(0.5110275180164185, 14)
    expect(createGenerator([1, 2, 3], 'pcg64').integers(0, 2 ** 32, 2)).toEqual([4140415376, 2879656440])
  })
})
