import { baseGenerator }  from './base-generator'
import { normal } from './normal'

/**
 * Generates random numbers or arrays of random numbers for a log-normal distribution.
 *
 * @param {number} [loc=0.0] - The mean of the underlying normal distribution to sample. 0.0 by default.
 * @param {number} [scale=1.0] - The standard deviation of the underlying normal distribution to sample. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} Throws an error if:
 *   - The `size` parameter is not a number, an array or null.
 *   - The `scale` parameter is not positive.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of log-normal distributed numbers.
 *
 */
export function lognormal(loc=0.0, scale = 1.0, size = null) {
    return baseGenerator(() => Math.exp(normal(loc, scale)), size)
}
