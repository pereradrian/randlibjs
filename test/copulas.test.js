import { describe, test, expect } from 'vitest'
import {
    seed, gaussianCopula, tCopula, claytonCopula, gumbelCopula, frankCopula, copulaTau, copulaTheta, createGenerator, stats,
} from '../index.js'
import { expectKS } from './helpers/stats.js'

/** Empirical Kendall's τ of the first two coordinates. */
function kendall(pairs) {
    let c = 0
    let d = 0
    for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
            const s = (pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1])
            if (s > 0) c++
            else if (s < 0) d++
        }
    }
    return (c - d) / (c + d)
}

const R = [[1, 0.6, 0.3], [0.6, 1, 0.2], [0.3, 0.2, 1]]
const FAMILIES = [
    ['gaussian', () => gaussianCopula(R, 1500), copulaTau('gaussian', 0.6)],
    ['t', () => tCopula(R, 4, 1500), copulaTau('t', 0.6)],
    ['clayton', () => claytonCopula(2, 3, 1500), copulaTau('clayton', 2)],
    ['gumbel', () => gumbelCopula(2.5, 3, 1500), copulaTau('gumbel', 2.5)],
    ['frank', () => frankCopula(6, 3, 1500), copulaTau('frank', 6)],
]

describe('copulas', () => {
    test.each(FAMILIES)('%s: uniform margins and Kendall tau', (name, draw, tau) => {
        seed(7)
        const us = draw()
        expect(us).toHaveLength(1500)
        expect(us[0]).toHaveLength(3)
        for (let k = 0; k < 3; k++) {
            const col = us.map((u) => u[k])
            expect(col.every((v) => v > 0 && v < 1)).toBe(true)
            expectKS(col, (x) => x)
        }
        // standard error of Kendall's tau at n = 1500 is about 0.015
        expect(Math.abs(kendall(us) - tau)).toBeLessThan(0.05)
    })

    test('tail dependence: t and Gumbel have joint extremes, Gaussian and Frank much fewer', () => {
        seed(11)
        const rho = copulaTheta('gaussian', 0.5)
        const C = [[1, rho], [rho, 1]]
        const joint = (us) => us.filter(([a, b]) => a > 0.99 && b > 0.99).length / us.filter(([a]) => a > 0.99).length
        const n = 40000
        const g = joint(gaussianCopula(C, n))
        const t = joint(tCopula(C, 2, n))
        const gu = joint(gumbelCopula(copulaTheta('gumbel', 0.5), 2, n))
        const fr = joint(frankCopula(copulaTheta('frank', 0.5), 2, n))
        // Gumbel upper tail dependence 2 - 2^(1/θ) = 0.586 at τ = 0.5
        expect(gu).toBeGreaterThan(0.45)
        expect(t).toBeGreaterThan(g + 0.1)
        expect(fr).toBeLessThan(g + 0.05)
    })

    test('Clayton lower tail dependence 2^(-1/θ)', () => {
        seed(13)
        const theta = 2
        const us = claytonCopula(theta, 2, 60000)
        const lam = us.filter(([a, b]) => a < 0.005 && b < 0.005).length / us.filter(([a]) => a < 0.005).length
        expect(Math.abs(lam - Math.pow(2, -1 / theta))).toBeLessThan(0.08)
    })

    test('any margins through ppf', () => {
        seed(3)
        const xs = gaussianCopula([[1, 0.8], [0.8, 1]], 3000).map(([u, v]) => [stats.gamma(2, 1).ppf(u), stats.exponential(3).ppf(v)])
        expectKS(xs.map((p) => p[0]), (x) => stats.gamma(2, 1).cdf(x))
        expectKS(xs.map((p) => p[1]), (x) => stats.exponential(3).cdf(x))
    })

    test('tau <-> theta conversions round-trip', () => {
        for (const [f, tau] of [['gaussian', -0.3], ['t', 0.4], ['clayton', 0.2], ['gumbel', 0.7], ['frank', 0.35], ['frank', 0.9]]) {
            expect(copulaTau(f, copulaTheta(f, tau))).toBeCloseTo(tau, 12)
        }
        expect(copulaTau('frank', 5)).toBeCloseTo(0.4567009582, 9)
    })

    test('reproducible through generators, and validation', () => {
        expect(createGenerator(5).frankCopula(3, 2, 4)).toEqual(createGenerator(5).frankCopula(3, 2, 4))
        expect(() => gaussianCopula([[1, 2], [2, 1]])).toThrow()
        expect(() => gaussianCopula([[2, 0], [0, 1]])).toThrow(/unit diagonal/)
        expect(() => claytonCopula(-1)).toThrow()
        expect(() => gumbelCopula(0.5)).toThrow(/>= 1/)
        expect(() => claytonCopula(2, 1)).toThrow(/dim/)
        expect(() => copulaTheta('clayton', -0.2)).toThrow()
    })
})
