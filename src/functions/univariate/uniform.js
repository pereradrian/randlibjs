import { getRandomGenerator } from '../seed.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random floats or arrays of random floats within a specified range.
 *
 * @param {number} [low=0.0] - The lower bound. 0.0 by default.
 * @param {number} [high=1.0] - The upper bound. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single float is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `low` is greater than or equal to `high`.
 * @returns {number|Array} A random float, an array of random float, or a multidimensional array.
 *
 */
export function uniform(low = 0.0, high = 1.0, size = null) {
    if (low >= high) {
        throw new Error("low must be less than high")
    }
    return baseGenerator(() => getRandomGenerator()() * (high - low) + low, size)
}
