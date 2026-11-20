import { randBelow } from '../../core/state.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random integers or arrays of random integers within a specified range.
 * Every integer in the range is exactly equally likely (rejection sampling, no modulo bias).
 *
 * @example
 * randint(6)            // integer in [0, 6)
 * randint(1, 7, 10)     // ten dice rolls
 *
 * @param {number} low - The inclusive lower bound of the random integers.
 * @param {number} [high=null] - The exclusive upper bound. If not provided, `low` is treated as `high`, and the range is [0, low).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single integer is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `low` is greater than or equal to `high`, bounds are not integers, or the range exceeds 2^53.
 * @returns {number|Array} A random integer, an array of random integers, or a multidimensional array.
 */
export function randint(low, high = null, size = null) {
    if (high === null || high === undefined) {
        high = low
        low = 0
    }
    if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high)) {
        throw new Error("low and high must be safe integers")
    }
    if (low >= high) {
        throw new Error("low must be less than high")
    }
    const range = high - low
    if (range > Number.MAX_SAFE_INTEGER + 1) {
        throw new Error("high - low must not exceed 2^53")
    }
    return baseGenerator(() => low + randBelow(range), size)
}
