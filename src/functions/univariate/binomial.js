import { baseGenerator } from '../base-generator.js'
import { binomialSample } from '../../core/samplers.js'
import { assertNonNegativeInteger, assertProbability } from '../util/validate.js'

/**
 * Generates random numbers or arrays of random numbers for a binomial distribution:
 * the number of successes in `n` independent trials with success probability `p`.
 *
 * Sampling is exact and fast for any `n` (inversion for small means, beta splitting otherwise).
 *
 * @example
 * binomial(10, 0.5)         // number of heads in 10 coin flips
 * binomial(1e9, 0.3, 5)     // five samples, O(log n) each
 *
 * @param {number} n - Number of trials (non-negative integer).
 * @param {number} p - Probability of success in each trial, in [0, 1].
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of binomial numbers.
 * @throws {Error} If `n` is not a non-negative integer or `p` is not in [0, 1].
 */
export function binomial(n, p, size = null) {
    assertNonNegativeInteger('n', n)
    assertProbability('p', p)
    return baseGenerator(() => binomialSample(n, p), size)
}
