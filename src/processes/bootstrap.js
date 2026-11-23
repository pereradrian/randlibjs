/**
 * Resampling statistics: bootstrap confidence intervals and permutation tests,
 * as `scipy.stats.bootstrap` and `scipy.stats.permutation_test`.
 * @module bootstrap
 */
import { randBelow } from '../core/state.js'
import { normalCDF, inverseNormalCDF } from '../functions/util/inverse-normal-cdf.js'
import { assertPositiveInteger } from '../functions/util/validate.js'

/**
 * @typedef {Object} BootstrapResult
 * @property {number} estimate - The statistic on the original data.
 * @property {number} standardError - Standard deviation of the bootstrap distribution.
 * @property {number} bias - Mean of the bootstrap distribution minus the estimate.
 * @property {number[]} confidenceInterval - [lower, upper] bounds.
 * @property {number[]} distribution - The bootstrap replicates of the statistic.
 */

/**
 * @typedef {Object} PermutationTestResult
 * @property {number} statistic - The observed statistic.
 * @property {number} pvalue - The permutation p-value.
 * @property {number[]} nullDistribution - Statistic values under random relabelling.
 */

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/**
 * Bootstrap estimate of the sampling distribution of a statistic.
 *
 * @example
 * const result = bootstrap(data, (xs) => median(xs), { nResamples: 5000 })
 * result.confidenceInterval   // [low, high]
 *
 * @param {Array} data - The sample.
 * @param {function(Array): number} [statistic=mean] - Statistic computed on a sample.
 * @param {Object} [options]
 * @param {number} [options.nResamples=9999] - Number of bootstrap resamples.
 * @param {number} [options.confidence=0.95] - Confidence level of the interval.
 * @param {string} [options.method='BCa'] - 'BCa' (bias-corrected and accelerated, scipy's
 *   default) or 'percentile'.
 * @returns {BootstrapResult}
 */
export function bootstrap(data, statistic = mean, { nResamples = 9999, confidence = 0.95, method = 'BCa' } = {}) {
    if (!Array.isArray(data) || data.length < 2) throw new Error('data must be an array with at least 2 elements.')
    if (typeof statistic !== 'function') throw new Error('statistic must be a function.')
    assertPositiveInteger('nResamples', nResamples)
    if (!(confidence > 0 && confidence < 1)) throw new Error('confidence must be in (0, 1).')
    const n = data.length
    const estimate = statistic(data)
    const distribution = new Array(nResamples)
    const buffer = new Array(n)
    for (let b = 0; b < nResamples; b++) {
        for (let i = 0; i < n; i++) buffer[i] = data[randBelow(n)]
        distribution[b] = statistic(buffer)
    }
    const sorted = distribution.slice().sort((a, b) => a - b)
    const m = mean(distribution)
    const standardError = Math.sqrt(distribution.reduce((s, x) => s + (x - m) ** 2, 0) / (nResamples - 1))
    const alpha = (1 - confidence) / 2
    let lo = alpha
    let hi = 1 - alpha
    if (method === 'BCa') {
        // bias correction
        const below = distribution.filter((x) => x < estimate).length + 0.5 * distribution.filter((x) => x === estimate).length
        const z0 = inverseNormalCDF(below / nResamples)
        // acceleration from the jackknife
        const jack = new Array(n)
        for (let i = 0; i < n; i++) jack[i] = statistic(data.filter((_, j) => j !== i))
        const jm = mean(jack)
        let num = 0
        let den = 0
        for (const v of jack) {
            num += (jm - v) ** 3
            den += (jm - v) ** 2
        }
        const a = den === 0 ? 0 : num / (6 * den ** 1.5)
        const adjust = (z) => normalCDF(z0 + (z0 + z) / (1 - a * (z0 + z)))
        if (Number.isFinite(z0)) {
            lo = adjust(inverseNormalCDF(alpha))
            hi = adjust(inverseNormalCDF(1 - alpha))
        }
    } else if (method !== 'percentile') {
        throw new Error(`Unknown bootstrap method "${method}".`)
    }
    return {
        estimate,
        standardError,
        bias: m - estimate,
        confidenceInterval: [quantile(sorted, lo), quantile(sorted, hi)],
        distribution,
    }
}

/**
 * Two-sample permutation test of the null hypothesis that both samples come from the same
 * distribution.
 *
 * @example
 * permutationTest(control, treatment).pvalue
 *
 * @param {number[]} x - First sample.
 * @param {number[]} y - Second sample.
 * @param {function(number[], number[]): number} [statistic] - Test statistic; difference of means by default.
 * @param {Object} [options]
 * @param {number} [options.nResamples=9999] - Number of random permutations.
 * @param {string} [options.alternative='two-sided'] - 'two-sided', 'greater' or 'less'.
 * @returns {PermutationTestResult}
 */
export function permutationTest(x, y, statistic = (a, b) => mean(a) - mean(b), { nResamples = 9999, alternative = 'two-sided' } = {}) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || y.length === 0) {
        throw new Error('x and y must be non-empty arrays.')
    }
    assertPositiveInteger('nResamples', nResamples)
    if (!['two-sided', 'greater', 'less'].includes(alternative)) {
        throw new Error('alternative must be "two-sided", "greater" or "less".')
    }
    const observed = statistic(x, y)
    const pooled = x.concat(y)
    const nx = x.length
    const nullDistribution = new Array(nResamples)
    for (let r = 0; r < nResamples; r++) {
        for (let i = pooled.length - 1; i > 0; i--) {
            const j = randBelow(i + 1)
            const t = pooled[i]
            pooled[i] = pooled[j]
            pooled[j] = t
        }
        nullDistribution[r] = statistic(pooled.slice(0, nx), pooled.slice(nx))
    }
    const eps = 1e-12 * Math.max(1, Math.abs(observed))
    let count
    if (alternative === 'greater') {
        count = nullDistribution.filter((v) => v >= observed - eps).length
    } else if (alternative === 'less') {
        count = nullDistribution.filter((v) => v <= observed + eps).length
    } else {
        const greater = nullDistribution.filter((v) => v >= observed - eps).length
        const less = nullDistribution.filter((v) => v <= observed + eps).length
        count = 2 * Math.min(greater, less)
    }
    // add-one correction so the p-value is never 0 (as scipy)
    const pvalue = Math.min(1, (count + 1) / (nResamples + 1))
    return { statistic: observed, pvalue, nullDistribution }
}
