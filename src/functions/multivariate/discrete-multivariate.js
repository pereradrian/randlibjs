import { standardGamma, betaPair, binomialSample, hypergeometricSample } from '../../core/samplers.js'
import { normalizeSize, fillShape } from '../base-generator.js'
import { assertNonNegativeInteger } from '../util/validate.js'

function vectorSampler(sample, size) {
    const shape = normalizeSize(size)
    return shape === null ? sample() : fillShape(shape, sample)
}

/**
 * Draws samples from the Dirichlet distribution: random probability vectors.
 *
 * Uses normalised gamma variates, switching to beta stick-breaking when every
 * alpha is small (< 0.1) to avoid underflow. Unlike numpy, the remaining stick is
 * tracked with the exactly computed beta complement, so components never collapse to 0
 * through rounding.
 *
 * @example
 * dirichlet([1, 1, 1])        // uniform on the 2-simplex
 *
 * @param {number[]} alpha - Concentration parameters (each > 0).
 * @param {number|number[]|null} [size=null] - Output shape (each element is a vector).
 * @returns {number[]|Array} Sample vector(s) summing to 1.
 */
export function dirichlet(alpha, size = null) {
    if (!Array.isArray(alpha) || alpha.length === 0 || alpha.some(a => typeof a !== 'number' || !(a > 0))) {
        throw new Error('alpha must be a non-empty array of positive numbers.')
    }
    const k = alpha.length
    const maxAlpha = Math.max(...alpha)
    const suffix = new Array(k + 1).fill(0)
    for (let i = k - 1; i >= 0; i--) {
        suffix[i] = suffix[i + 1] + alpha[i]
    }
    const sample = () => {
        const out = new Array(k)
        if (maxAlpha < 0.1) {
            let acc = 1
            for (let j = 0; j < k - 1; j++) {
                // the complement is computed directly: 1 - v would round to 0 when v ~ 1
                const [v, rest] = betaPair(alpha[j], suffix[j + 1])
                out[j] = acc * v
                acc *= rest
            }
            out[k - 1] = acc
            return out
        }
        let sum = 0
        for (let j = 0; j < k; j++) {
            out[j] = standardGamma(alpha[j])
            sum += out[j]
        }
        for (let j = 0; j < k; j++) {
            out[j] /= sum
        }
        return out
    }
    return vectorSampler(sample, size)
}

/**
 * Draws samples from a multinomial distribution: counts of each of `k` outcomes in `n`
 * independent trials. Exact, using conditional binomials (O(k log n) per sample).
 *
 * @example
 * multinomial(20, [1/6, 1/6, 1/6, 1/6, 1/6, 1/6])   // counts of each face in 20 dice throws
 *
 * @param {number} n - Number of trials (non-negative integer).
 * @param {number[]} pvals - Probabilities of each outcome. They must sum to 1; as numpy,
 *   the last entry is implied (1 - sum of the others).
 * @param {number|number[]|null} [size=null] - Output shape (each element is a vector of counts).
 * @returns {number[]|Array}
 */
export function multinomial(n, pvals, size = null) {
    assertNonNegativeInteger('n', n)
    if (!Array.isArray(pvals) || pvals.length === 0 || pvals.some(p => typeof p !== 'number' || !(p >= 0 && p <= 1))) {
        throw new Error('pvals must be a non-empty array of probabilities.')
    }
    const k = pvals.length
    let head = 0
    for (let j = 0; j < k - 1; j++) {
        head += pvals[j]
    }
    if (head > 1 + 1e-12) {
        throw new Error('sum(pvals[:-1]) must be <= 1.')
    }
    const sample = () => {
        const out = new Array(k).fill(0)
        let remaining = n
        let remP = 1
        for (let j = 0; j < k - 1 && remaining > 0; j++) {
            const p = remP > 0 ? Math.min(1, Math.max(0, pvals[j] / remP)) : 0
            out[j] = binomialSample(remaining, p)
            remaining -= out[j]
            remP -= pvals[j]
        }
        out[k - 1] += remaining
        return out
    }
    return vectorSampler(sample, size)
}

/**
 * Draws samples from a multivariate hypergeometric distribution: counts of each colour
 * when drawing `nsample` items without replacement from an urn with `colors[i]` items of
 * colour i. Exact (conditional hypergeometric draws).
 *
 * @param {number[]} colors - Number of items of each colour (non-negative integers).
 * @param {number} nsample - Number of items drawn, <= sum(colors).
 * @param {number|number[]|null} [size=null] - Output shape (each element is a vector of counts).
 * @returns {number[]|Array}
 */
export function multivariateHypergeometric(colors, nsample, size = null) {
    if (!Array.isArray(colors) || colors.length === 0) {
        throw new Error('colors must be a non-empty array.')
    }
    colors.forEach((c) => assertNonNegativeInteger('colors[i]', c))
    assertNonNegativeInteger('nsample', nsample)
    const total = colors.reduce((a, b) => a + b, 0)
    if (nsample > total) {
        throw new Error('nsample must be <= sum(colors).')
    }
    const sample = () => {
        const out = new Array(colors.length).fill(0)
        let remainingItems = total
        let remainingDraws = nsample
        for (let j = 0; j < colors.length - 1 && remainingDraws > 0; j++) {
            remainingItems -= colors[j]
            out[j] = hypergeometricSample(colors[j], remainingItems, remainingDraws)
            remainingDraws -= out[j]
        }
        out[colors.length - 1] += remainingDraws
        return out
    }
    return vectorSampler(sample, size)
}
