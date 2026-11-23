import { baseGenerator } from '../base-generator.js'
import { poissonSample } from '../../core/samplers.js'
import { assertNonNegative } from '../util/validate.js'

/**
 * Generates random numbers following a Poisson distribution with a given mean (lambda).
 * The Poisson distribution models the number of events occurring in a fixed interval of time
 * or space, given the events occur independently and at a constant average rate.
 *
 * Sampling is exact for every lambda: the multiplication method for lambda < 10 and
 * Hörmann's PTRS transformed rejection method otherwise (the same algorithms as numpy).
 *
 * @example
 * poisson(4)         // one sample with mean 4
 * poisson(1e6, 10)   // ten samples, still exact
 *
 * @param {number} [lambda=1] - The mean number of occurrences (lambda >= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - The shape of the output:
 *   - If `null`, a single Poisson random value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A Poisson random number, an array of random numbers, or a multidimensional array.
 * @throws {Error} If lambda is negative, not a number or larger than 1e15.
 */
export function poisson(lambda = 1.0, size = null) {
    assertNonNegative('lambda', lambda)
    if (lambda > 1e15) {
        throw new Error('lambda is too large.')
    }
    return baseGenerator(() => poissonSample(lambda), size)
}
