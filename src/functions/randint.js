import { getRandomGenerator } from './seed'
import { baseGenerator } from './base-generator'

/**
 * Generates random integers or arrays of random integers within a specified range.
 *
 * @param {number} low - The inclusive lower bound of the random integers.
 * @param {number} [high=null] - The exclusive upper bound. If not provided, `low` is treated as `high`, and the range is [0, low).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single integer is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `low` is greater than or equal to `high`.
 * @returns {number|Array} A random integer, an array of random integers, or a multidimensional array.
 *
 */
export function randint(low, high = null, size = null) {
    if (high === null) {
        high = low
        low = 0
    }
    if (low >= high) {
        throw new Error("low must be less than high")
    }
    return baseGenerator(() => Math.floor(getRandomGenerator()() * (high - low) + low), size)
}
