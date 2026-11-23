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
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be symmetric positive
 *   semi-definite (singular matrices are allowed) and match the size of `means`.
 *
 * @param {number|number[]|null} [size=null] - Output shape: `null` returns one sample vector,
 *   `k` an array of `k` vectors and `[m, k]` a nested m x k array of vectors (as numpy).
 *
 * @returns {number[]|number[][]|Array} Sample vector(s).
 *
 * @throws {Error} If the input shapes are invalid or the covariance matrix is
 *   not positive semi-definite.
 */
export function multivariateNormal(means, covariance, size = null) {
    return multivariate(means, covariance, (n) => normal(0.0, 1.0, n), size)
}
