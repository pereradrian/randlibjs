import { getRandomGenerator } from './seed'
import { baseGenerator } from './base-generator'

/**
 * Generates random numbers or arrays of random numbers for a Pareto distribution.
 *
 * @param {number} alpha - The tail index.
 * @param {number} xm - The minimum.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `alpha` or `xm` are less or equal to 0.0.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of Pareto numbers.
 *
 */
export function pareto(alpha, xm, size=null) {
    if (typeof alpha !== "number" || alpha <=0) {
        throw new Error("alpha must be a positive number")
    }
    if (typeof xm !== "number" || typeof xm !== "number") {
        throw new Error("xm must be a positive number")
    }
    // Use baseGenerator to handle the shape of the output.
    return baseGenerator(() => xm / Math.pow(getRandomGenerator()(), 1 / alpha), size)
}