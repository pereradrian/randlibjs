import { rand } from '../../core/state.js'
import { standardExponential } from '../../core/samplers.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random numbers or arrays of random numbers for a geometric distribution:
 * the number of trials needed to get the first success (support 1, 2, 3, ...), as numpy.
 *
 * @param {number} p - Probability of success in each trial, in (0, 1].
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of geometric numbers.
 * @throws {Error} If `p` is not in (0, 1].
 */
export function geometric(p, size = null) {
    if (typeof p !== "number" || !(p > 0 && p <= 1)) {
        throw new Error("p must be a number in (0, 1]")
    }
    return baseGenerator(() => sampleGeometric(p), size)
}

function sampleGeometric(p) {
    if (p >= 1 / 3) {
        // sequential search, fast for large p
        const q = 1 - p
        let x = 1
        let prob = p
        let sum = prob
        const u = rand()
        while (u > sum && prob > 0) {
            prob *= q
            sum += prob
            x++
        }
        return x
    }
    // inversion
    return Math.max(1, Math.ceil(-standardExponential() / Math.log1p(-p)))
}
