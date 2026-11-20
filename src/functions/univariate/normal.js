import { baseGenerator }  from '../base-generator.js'
import { standardNormal as sampleStandardNormal } from '../../core/samplers.js'

/**
 * Generates random numbers or arrays of random numbers for a normal (Gaussian) distribution.
 *
 * Samples are exact (Marsaglia polar method), not approximations.
 *
 * @example
 * normal()              // one N(0, 1) sample
 * normal(10, 2, [2, 3]) // 2x3 array of N(10, 2^2) samples
 *
 * @param {number} [loc=0.0] - The mean of the normal distribution to sample. 0.0 by default.
 * @param {number} [scale=1.0] - The standard deviation of the normal distribution to sample. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `scale` is negative or the parameters are not numbers.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of normal distributed numbers.
 */
export function normal(loc = 0.0, scale = 1.0, size = null) {
    if (typeof loc !== "number" || typeof scale !== "number" || Number.isNaN(loc) || Number.isNaN(scale)) {
        throw new Error("loc and scale must be numbers")
    }
    if (scale < 0.0) {
        throw new Error("standard deviation must be a non-negative number")
    }
    return baseGenerator(() => loc + scale * sampleStandardNormal(), size)
}

/**
 * Draws samples from the standard normal distribution N(0, 1).
 * Equivalent to numpy's `standard_normal`.
 *
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {number|Array} Standard normal samples.
 */
export function standardNormal(size = null) {
    return baseGenerator(sampleStandardNormal, size)
}
