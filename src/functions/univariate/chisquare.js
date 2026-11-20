import { baseGenerator } from '../base-generator.js'
import { standardGamma } from '../../core/samplers.js'
import { assertPositive } from '../util/validate.js'

/**
 * Generates random numbers following a Chi-squared distribution with `k` degrees of freedom.
 * Non-integer degrees of freedom are supported (as numpy).
 *
 * @param {number} k - Degrees of freedom (> 0).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If the degrees of freedom are not a positive number.
 * @returns {number|Array} A random number or an array of random numbers from the Chi-squared distribution.
 */
export function chisquare(k, size = null) {
    assertPositive('Degrees of freedom (k)', k)
    return baseGenerator(() => 2 * standardGamma(k / 2), size)
}
