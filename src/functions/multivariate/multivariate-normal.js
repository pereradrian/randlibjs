import { normal } from '../univariate/normal.js'
import { multivariate } from './multivariate.js'

/**
 * Generates samples from a multivariate normal distribution using the provided
 * means and covariance matrix.
 *
 * This is a convenience wrapper around `multivariate`, using a standard normal
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
export function multivariateNormal(means, covariance, size = null) {
    return multivariate(means, covariance, (n) => normal(0.0, 1.0, n), size)
}
