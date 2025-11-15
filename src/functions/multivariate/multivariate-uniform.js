import { uniform } from '../univariate/uniform.js'
import { multivariate } from './multivariate.js'

/**
 * Generates samples from a multivariate uniform distribution using the provided
 * means and covariance matrix.
 *
 * This is a convenience wrapper around `multivariate`, using a standard uniform
 * generator for the noise.
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 *
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be square and
 *   match the size of `means`.
 *
 * @param {number|null} [size=null] - Number of samples to generate.
 *   - If `null` or `undefined`: returns a single sample vector.
 *   - If `1`: also returns a single sample vector.
 *   - If an integer > 1: returns an array of sample vectors.
 *
 * @returns {number[]|number[][]} 
 *   - A single sample vector (if `size` is `null`, `undefined`, or `1`)
 *   - An array of sample vectors (if `size` > 1)
 *
 * @throws {Error} If the input shapes are invalid or the covariance matrix is
 *   not positive semi-definite.
 */
export function multivariateUniform(means, covariance, size = null) {
    return multivariate(means, covariance, (n) => uniform(-Math.sqrt(3), Math.sqrt(3), n), size)
}
