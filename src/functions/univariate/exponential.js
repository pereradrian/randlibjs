import { rand } from '../../core/state.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random samples from an exponential distribution.
 *
 * @param {number} [lambda=1] - The rate parameter (must be > 0). Note: numpy uses the scale 1/lambda.
 * @param {number|Array|ArrayBufferView|null} [size=null] - The shape of the output:
 *   - If `null`, a single value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} Throws an error if:
 *   - The `size` parameter is not a number, an array or null.
 *   - The rate parameter lambda is not positive.
 * @returns {number|Array} A single value, an array, or a multidimensional array of random values from the exponential distribution.
 */
export function exponential(lambda = 1.0, size = null) {
    if (typeof lambda !== "number" || !(lambda > 0)) {
        throw new Error("Rate parameter lambda must be greater than 0")
    }
    // Use the base generator for handling size
    if (size === null || size === undefined) return -Math.log(1 - rand()) / lambda
    return baseGenerator(() => -Math.log(1 - rand()) / lambda, size)
}
