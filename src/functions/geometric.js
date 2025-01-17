import { getRandomGenerator } from './seed'
import { baseGenerator } from './base-generator'

/**
 * Generates random numbers or arrays of random numbers for a geometric distribution.
 *
 * @param {number} p - Probability of success in each trial.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of geometric numbers.
 *
 */
export function geometric(p, size=null) {
    if (typeof p !== "number" || p < 0.0 || p > 1) {
        throw new Error("p must be a number in (0,1)")
    }
    // Use baseGenerator to handle the shape of the output.
    return baseGenerator(() => sampleGeometric(p), size)
}
function sampleGeometric(p) {
    return Math.ceil(Math.log(1.0 - getRandomGenerator()()) / Math.log(1 - p))
}