import { getRandomGenerator } from './seed'
import { baseGenerator }  from './base-generator'
import { inverseNormalCDF } from './util/inverse-normal-cdf'

/**
 * Generates random numbers or arrays of random numbers for a normal distribution.
 *
 * @param {number} [loc=0.0] - The mean of the normal distribution to sample. 0.0 by default.
 * @param {number} [scale=1.0] - The standard deviation of the normal distribution to sample. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `scale` is less or equal to 0.0.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of normal distributed numbers.
 *
 */
export function normal(loc=0.0, scale = 1.0, size = null) {
    if (typeof loc !== "number" || typeof scale !== "number") {
        throw new Error("loc and scale must be numbers")
    }
    if (scale <= 0.0) {
        throw new Error("standard deviation must be a positive number")
    }
    return baseGenerator(() => scale*inverseNormalCDF(getRandomGenerator()()) + loc, size)
}
