import { rand } from '../../core/state.js'
import { standardExponential } from '../../core/samplers.js'
import { baseGenerator } from '../base-generator.js'
import { assertPositive } from '../util/validate.js'

/**
 * Generates random numbers or arrays of random numbers for a (type I) Pareto distribution
 * with tail index `alpha` and minimum `xm`: P(X > x) = (xm / x)^alpha for x >= xm.
 *
 * Note: numpy's `pareto(a)` is the Pareto II / Lomax distribution, available here as {@link lomax}.
 * `pareto(a, 1) - 1` has the same distribution as numpy's `pareto(a)`.
 *
 * @param {number} alpha - The tail index (> 0).
 * @param {number} [xm=1] - The minimum value / scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `alpha` or `xm` are not positive numbers.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of Pareto numbers.
 */
export function pareto(alpha, xm = 1, size = null) {
    assertPositive('alpha', alpha)
    assertPositive('xm', xm)
    return baseGenerator(() => xm / Math.pow(1 - rand(), 1 / alpha), size)
}

/**
 * Draws samples from a Pareto II (Lomax) distribution with shape `a`, location 0 and scale 1.
 * This is numpy's `pareto(a)`.
 *
 * @param {number} a - Shape (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function lomax(a, size = null) {
    assertPositive('a', a)
    return baseGenerator(() => Math.expm1(standardExponential() / a), size)
}
