// Property-based tests (fast-check): invariants that must hold for any parameters and seeds.
import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { createGenerator, seed, getState, setState, random, stats, choice, shuffle } from '../index.js'

const BIT_GENERATORS = ['xoshiro128**', 'pcg32', 'mt19937', 'pcg64', 'pcg64dxsm', 'sfc64', 'philox']
const seedArb = fc.integer({ min: 0, max: 2 ** 32 - 1 })
const bitGenArb = fc.constantFrom(...BIT_GENERATORS)
// FC_RUNS=3000 npx vitest run test/properties.test.js for a deeper search
const RUNS = { numRuns: Number(process.env.FC_RUNS) || 60 }

const f64 = new Float64Array(1)
const i64 = new BigInt64Array(f64.buffer)
/** The neighbouring doubles of a finite x. */
const step = (x, dir) => {
    if (x === 0) return dir * Number.MIN_VALUE
    f64[0] = x
    i64[0] += (x > 0) === (dir > 0) ? 1n : -1n
    return f64[0]
}
const nextUp = (x) => step(x, 1)
const nextDown = (x) => step(x, -1)

describe('reproducibility', () => {
    test('the same seed gives the same stream, for every bit generator', () => {
        fc.assert(fc.property(seedArb, bitGenArb, (s, b) => {
            const a = createGenerator(s, b)
            const c = createGenerator(s, b)
            expect([a.random(4), a.normal(0, 1, 4), a.integers(0, 100, 4)])
                .toEqual([c.random(4), c.normal(0, 1, 4), c.integers(0, 100, 4)])
        }), RUNS)
    })

    test('getState / setState replays the global stream, also through JSON', () => {
        fc.assert(fc.property(seedArb, bitGenArb, fc.integer({ min: 0, max: 50 }), (s, b, skip) => {
            seed(s, b)
            random(skip)
            const state = JSON.parse(JSON.stringify(getState()))
            const first = random(5)
            setState(state)
            expect(random(5)).toEqual(first)
        }), RUNS)
    })
})

describe('samplers stay inside their support', () => {
    const positive = fc.double({ min: 0.05, max: 50, noNaN: true })
    test('uniform, integers, beta, gamma, binomial, poisson', () => {
        fc.assert(fc.property(seedArb, positive, positive, fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 1, max: 1000 }),
            fc.double({ min: 0, max: 1, noNaN: true }), (s, a, b, low, span, p) => {
                const g = createGenerator(s)
                for (const u of g.uniform(low, low + span, 20)) expect(u >= low && u < low + span).toBe(true)
                for (const k of g.integers(low, low + span, 20)) expect(Number.isInteger(k) && k >= low && k < low + span).toBe(true)
                for (const x of g.beta(a, b, 20)) expect(x >= 0 && x <= 1).toBe(true)
                for (const x of g.gamma(a, b, 20)) expect(x >= 0 && Number.isFinite(x)).toBe(true)
                for (const k of g.binomial(span, p, 20)) expect(Number.isInteger(k) && k >= 0 && k <= span).toBe(true)
                for (const k of g.poisson(a, 20)) expect(Number.isInteger(k) && k >= 0).toBe(true)
            }), RUNS)
    })

    test('dirichlet and multinomial return valid probability and count vectors', () => {
        fc.assert(fc.property(seedArb, fc.array(fc.double({ min: 0.05, max: 20, noNaN: true }), { minLength: 2, maxLength: 6 }),
            fc.integer({ min: 0, max: 500 }), (s, alpha, n) => {
                const g = createGenerator(s)
                const p = g.dirichlet(alpha)
                expect(p.every((x) => x >= 0)).toBe(true)
                expect(Math.abs(p.reduce((t, x) => t + x, 0) - 1)).toBeLessThan(1e-12)
                const counts = g.multinomial(n, p)
                expect(counts.every((k) => Number.isInteger(k) && k >= 0)).toBe(true)
                expect(counts.reduce((t, k) => t + k, 0)).toBe(n)
            }), RUNS)
    })
})

describe('utilities', () => {
    test('shuffle is a permutation and choice without replacement has no repeats', () => {
        fc.assert(fc.property(seedArb, fc.array(fc.integer(), { maxLength: 60 }), (s, xs) => {
            seed(s)
            const sorted = (a) => [...a].sort((x, y) => x - y)
            expect(sorted(shuffle([...xs]))).toEqual(sorted(xs))
            if (xs.length > 0) {
                const k = Math.min(xs.length, 10)
                const picked = choice(xs.map((_, i) => i), null, k, false)
                expect(new Set(picked).size).toBe(k)
            }
        }), RUNS)
    })
})

describe('distribution objects', () => {
    const q = fc.double({ min: 1e-10, max: 1 - 1e-10, noNaN: true })
    const pos = fc.double({ min: 0.1, max: 30, noNaN: true })
    const families = [
        ['normal', fc.tuple(fc.double({ min: -100, max: 100, noNaN: true }), pos)],
        ['gamma', fc.tuple(pos, pos)],
        ['beta', fc.tuple(pos, pos)],
        ['studentT', fc.tuple(pos)],
        ['chisquare', fc.tuple(pos)],
        ['lognormal', fc.tuple(fc.double({ min: -3, max: 3, noNaN: true }), fc.double({ min: 0.1, max: 3, noNaN: true }))],
        ['weibull', fc.tuple(pos, pos)],
        ['f', fc.tuple(pos, pos)],
    ]
    for (const [name, params] of families) {
        test(`${name}: cdf(ppf(q)) = q, cdf + sf = 1 and the cdf is monotone`, () => {
            fc.assert(fc.property(params, q, q, (args, q1, q2) => {
                const d = stats[name](...args)
                const x1 = d.ppf(q1)
                // q1 must be bracketed by the cdf at the doubles next to x1 (with a little slack
                // for the cdf's own rounding): that is the best any quantile function can do
                const tol = 1e-9 * Math.min(q1, 1 - q1) + 1e-15
                expect(d.cdf(nextDown(x1)) <= q1 + tol && q1 - tol <= d.cdf(nextUp(x1))).toBe(true)
                expect(Math.abs(d.cdf(x1) + d.sf(x1) - 1)).toBeLessThan(1e-12)
                // monotone up to the root finder's relative tolerance
                const [lo, hi] = q1 <= q2 ? [q1, q2] : [q2, q1]
                const [a, b] = [d.ppf(lo), d.ppf(hi)]
                expect(a <= b + 1e-9 * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE)).toBe(true)
            }), RUNS)
        })
    }

    test('discrete ppf returns the smallest k with cdf(k) >= q', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 200 }), fc.double({ min: 0.01, max: 0.99, noNaN: true }), q, (n, p, qq) => {
            const d = stats.binomial(n, p)
            const k = d.ppf(qq)
            expect(d.cdf(k) >= qq - 1e-12).toBe(true)
            if (k > 0) expect(d.cdf(k - 1) < qq + 1e-12).toBe(true)
        }), RUNS)
    })
})
