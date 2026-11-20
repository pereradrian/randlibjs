import { rand, randBelow } from '../../core/state.js'
import { standardGamma as sGamma, poissonSample, hypergeometricSample } from '../../core/samplers.js'
import { baseGenerator } from '../base-generator.js'
import {
    assertNumber,
    assertPositive,
    assertProbability,
    assertNonNegativeInteger,
} from '../util/validate.js'

/**
 * Returns random integers from `low` (inclusive) to `high` (exclusive), or to `high`
 * inclusive if `endpoint` is true. numpy's `Generator.integers`.
 * If `high` is null, values are drawn from [0, low).
 *
 * @example
 * integers(1, 6, 10, true)   // ten dice rolls in [1, 6]
 *
 * @param {number} low - Lowest integer (or the upper bound if `high` is null).
 * @param {number|null} [high=null] - Upper bound.
 * @param {number|Array|null} [size=null] - Output shape.
 * @param {boolean} [endpoint=false] - Include `high`.
 * @returns {number|Array}
 */
export function integers(low, high = null, size = null, endpoint = false) {
    if (high === null || high === undefined) {
        high = low
        low = 0
    }
    if (!Number.isInteger(low) || !Number.isInteger(high) || Math.abs(low) > 2 ** 53 || Math.abs(high) > 2 ** 53) {
        throw new Error('low and high must be integers with absolute value <= 2^53.')
    }
    const range = high - low + (endpoint ? 1 : 0)
    if (range <= 0) {
        throw new Error(endpoint ? 'low must be <= high.' : 'low must be < high.')
    }
    if (range > 2 ** 53) {
        throw new Error('The range must not exceed 2^53.')
    }
    return baseGenerator(() => low + randBelow(range), size)
}

/**
 * Draws samples from a Bernoulli distribution: 1 with probability `p`, 0 otherwise.
 *
 * @param {number} [p=0.5] - Success probability in [0, 1].
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function bernoulli(p = 0.5, size = null) {
    assertProbability('p', p)
    return baseGenerator(() => (rand() < p ? 1 : 0), size)
}

/**
 * Draws samples from a negative binomial distribution: the number of failures before
 * `n` successes with success probability `p`. `n` may be non-integer (Pólya distribution).
 *
 * @param {number} n - Number of successes (> 0).
 * @param {number} p - Success probability in (0, 1].
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function negativeBinomial(n, p, size = null) {
    assertPositive('n', n)
    assertNumber('p', p)
    if (!(p > 0 && p <= 1)) {
        throw new Error('p must be in (0, 1].')
    }
    return baseGenerator(() => (p === 1 ? 0 : poissonSample(sGamma(n) * (1 - p) / p)), size)
}

/**
 * Draws samples from a hypergeometric distribution: the number of good items when
 * drawing `nsample` items without replacement from `ngood` good and `nbad` bad items.
 * Exact for any population size.
 *
 * @param {number} ngood - Number of good items (non-negative integer).
 * @param {number} nbad - Number of bad items (non-negative integer).
 * @param {number} nsample - Number of items drawn, <= ngood + nbad.
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function hypergeometric(ngood, nbad, nsample, size = null) {
    assertNonNegativeInteger('ngood', ngood)
    assertNonNegativeInteger('nbad', nbad)
    assertNonNegativeInteger('nsample', nsample)
    if (nsample > ngood + nbad) {
        throw new Error('nsample must be <= ngood + nbad.')
    }
    return baseGenerator(() => hypergeometricSample(ngood, nbad, nsample), size)
}

/**
 * Draws samples from a logarithmic series distribution (support 1, 2, ...), Kemp's algorithm.
 *
 * @param {number} p - Shape parameter in [0, 1).
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function logseries(p, size = null) {
    assertNumber('p', p)
    if (!(p >= 0 && p < 1)) {
        throw new Error('p must be in [0, 1).')
    }
    const r = Math.log1p(-p)
    return baseGenerator(() => {
        for (;;) {
            const v = rand()
            if (v >= p) {
                return 1
            }
            const u = rand()
            const q = -Math.expm1(r * u)
            if (v <= q * q) {
                const result = Math.floor(1 + Math.log(v) / Math.log(q))
                if (result < 1 || v === 0) {
                    continue
                }
                return result
            }
            return v >= q ? 1 : 2
        }
    }, size)
}

/**
 * Draws samples from a Zipf (zeta) distribution with exponent `a` > 1
 * (support 1, 2, ...), Devroye's rejection algorithm as used by numpy.
 *
 * @param {number} a - Exponent (> 1).
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function zipf(a, size = null) {
    assertNumber('a', a)
    if (!(a > 1)) {
        throw new Error('a must be > 1.')
    }
    const am1 = a - 1
    const b = Math.pow(2, am1)
    return baseGenerator(() => {
        for (;;) {
            const u = 1 - rand()
            const v = rand()
            const x = Math.floor(Math.pow(u, -1 / am1))
            if (x > Number.MAX_SAFE_INTEGER || x < 1) {
                continue
            }
            const t = Math.pow(1 + 1 / x, am1)
            if (v * x * (t - 1) / (b - 1) <= t / b) {
                return x
            }
        }
    }, size)
}
