import { getRandomGenerator } from '../seed.js'
import { baseGenerator } from '../base-generator.js'

/**
 * Generates random numbers or arrays of random numbers for a triangular distribution.
 *
 * @param {number} a - Lower limit.
 * @param {number} b - Upper limit.
 * @param {number} c - Mode.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If parameters a, b, c do not fulfill a < c < b.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of triangular distributed numbers.
 *
 */
export function triangular(a, b, c, size=null) {
    if (typeof a !== "number" || typeof b !== "number" || typeof b !== "number" || a > c || c > b ) {
        throw new Error("a, b, c must be positive numbers satisfying a < c < b")
    }
    // Use baseGenerator to handle the shape of the output.
    return baseGenerator(() => sampleTriangular(a,b,c), size)
}

function sampleTriangular(a, b, c) {
    const u = getRandomGenerator()()
    if (u < (c - a) / (b - a)) {
        return a + Math.sqrt(u * (b - a) * (c - a))
    } else {
        return b - Math.sqrt((1 - u) * (b - a) * (b - c))
    }
}