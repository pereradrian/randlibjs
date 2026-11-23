// Typed-array output: every univariate sampler fills a typed array in place with exactly the
// values (and stream position) of the array form.
import { describe, test, expect } from 'vitest'
import * as R from '../index.js'

// [name, parameters before size]
const SAMPLERS = [
    ['random', []], ['uniform', [-1, 3]], ['normal', [1, 2]], ['standardNormal', []],
    ['exponential', [2]], ['standardExponential', []], ['gamma', [2.5, 2]], ['standardGamma', [0.7]],
    ['beta', [2, 3]], ['chisquare', [3]], ['chi', [3]], ['f', [5, 10]], ['studentT', [4, 1, 2]],
    ['standardT', [4]], ['cauchy', [0, 1]], ['standardCauchy', []], ['lognormal', [0, 0.5]],
    ['laplace', [0, 1]], ['logistic', [0, 1]], ['gumbel', [0, 1]], ['weibull', [1.5]],
    ['rayleigh', [2]], ['pareto', [3, 2]], ['lomax', [2.5]], ['triangular', [0, 2, 1]],
    ['power', [2]], ['wald', [1, 2]], ['vonmises', [0, 2]], ['truncatedNormal', [0, 1, -1, 2]],
    ['skewNormal', [0, 1, 3]], ['exGaussian', [0, 1, 2]], ['halfNormal', [1, 0]], ['maxwell', [1]],
    ['nakagami', [2, 1]], ['levy', [0, 1]], ['frechet', [2, 1, 0]], ['logLogistic', [3, 1]],
    ['kumaraswamy', [2, 3]], ['betaPrime', [2, 3]], ['inverseGamma', [3, 1]], ['loguniform', [1, 100]],
    ['semicircle', [1]], ['burr12', [2, 3, 1]], ['erlang', [3, 2]], ['generalizedExtremeValue', [0.2, 0, 1]],
    ['generalizedPareto', [0.2, 0, 1]], ['noncentralChisquare', [3, 2]], ['noncentralF', [3, 5, 2]],
    ['binomial', [20, 0.3]], ['poisson', [4]], ['geometric', [0.3]], ['negativeBinomial', [5, 0.4]],
    ['hypergeometric', [10, 20, 5]], ['bernoulli', [0.3]], ['rademacher', []], ['logseries', [0.6]],
    ['zipf', [2]], ['skellam', [3, 2]], ['betaBinomial', [10, 2, 3]], ['categorical', [[0.2, 0.3, 0.5]]],
    ['integers', [0, 100]], ['randint', [0, 100]],
]

describe('typed-array output', () => {
    test.each(SAMPLERS)('%s fills a Float64Array with the same stream as the array form', (name, params) => {
        const fn = R[name]
        R.seed(11)
        const expected = fn(...params, 50)
        const after = R.random()
        R.seed(11)
        const out = new Float64Array(50)
        const ret = fn(...params, out)
        expect(ret).toBe(out)
        expect(Array.from(out)).toEqual(expected)
        expect(R.random()).toBe(after)
    })

    test('Generator methods and integer typed arrays', () => {
        const ks = R.createGenerator(3).poisson(4, new Int32Array(1000))
        expect(ks).toBeInstanceOf(Int32Array)
        expect(Array.from(ks)).toEqual(R.createGenerator(3).poisson(4, 1000))
        const xs = R.createGenerator(3).normal(0, 1, new Float32Array(4))
        const ys = R.createGenerator(3).normal(0, 1, 4)
        expect(Array.from(xs)).toEqual(ys.map(Math.fround))
    })

    test('an empty typed array is returned untouched', () => {
        R.seed(1)
        const out = new Float64Array(0)
        expect(R.normal(0, 1, out)).toBe(out)
        expect(R.random()).toBe((R.seed(1), R.random()))
    })

    test('clear errors for unsupported outputs', () => {
        expect(() => R.normal(0, 1, new BigInt64Array(2))).toThrow(/numeric typed array/)
        expect(() => R.normal(0, 1, new DataView(new ArrayBuffer(8)))).toThrow(/numeric typed array/)
        expect(() => R.uuid4(new Float64Array(2))).toThrow(/numeric samplers/)
        expect(() => R.multivariateNormal([0, 0], [[1, 0], [0, 1]], new Float64Array(2))).toThrow(/univariate/)
        expect(() => R.dirichlet([1, 1], new Float64Array(2))).toThrow(/univariate/)
    })
})
