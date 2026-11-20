import { rand } from '../../core/state.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random numbers or arrays of random numbers for a triangular distribution.
 *
 * Note the parameter order (low, high, mode) differs from numpy's `triangular(left, mode, right)`.
 *
 * @param {number} a - Lower limit.
 * @param {number} b - Upper limit.
 * @param {number} c - Mode, with a <= c <= b.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If parameters a, b, c do not fulfill a <= c <= b and a < b.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of triangular distributed numbers.
 */
export function triangular(a, b, c, size = null) {
    if (typeof a !== "number" || typeof b !== "number" || typeof c !== "number" || !(a <= c && c <= b && a < b)) {
        throw new Error("a, b, c must be numbers satisfying a <= c <= b and a < b")
    }
    return baseGenerator(() => sampleTriangular(a, b, c), size)
}

function sampleTriangular(a, b, c) {
    const u = rand()
    if (u < (c - a) / (b - a)) {
        return a + Math.sqrt(u * (b - a) * (c - a))
    }
    return b - Math.sqrt((1 - u) * (b - a) * (b - c))
}
