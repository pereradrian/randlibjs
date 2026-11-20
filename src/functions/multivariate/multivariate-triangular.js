import { triangular } from '../univariate/triangular.js'
import { multivariate } from './multivariate.js'

/**
 * Generates samples from a multivariate triangular distribution (possibly asymmetric)
 * with the given means and covariance matrix.
 *
 * The noise components follow a triangular distribution standardised to mean 0 and
 * variance 1, so the samples have exactly the requested mean and covariance.
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be symmetric positive
 *   semi-definite and match `means`.
 * @param {number} [alpha=0] - Asymmetry parameter in [-1, 1]:
 *   - 0 → symmetric
 *   - < 0 → skewed left
 *   - > 0 → skewed right
 * @param {number|number[]|null} [size=null] - Output shape: `null` returns one sample vector,
 *   `k` an array of `k` vectors and `[m, k]` a nested array of vectors.
 * @returns {number[]|number[][]|Array} Sample vector(s).
 * @throws {Error} If `alpha` is not in [-1, 1] or the inputs are invalid.
 */
export function multivariateTriangular(means, covariance, alpha = 0, size = null) {
    if (typeof alpha !== 'number' || !(alpha >= -1 && alpha <= 1)) {
        throw new Error('alpha must be a number in [-1, 1].')
    }
    // Triangular on [-1, 1] with the mode at alpha, then standardised
    const a = -1
    const b = 1
    const c = alpha
    const mean = (a + b + c) / 3
    const sd = Math.sqrt((a * a + b * b + c * c - a * b - a * c - b * c) / 18)
    const noise = (n) => triangular(a, b, c, n).map((t) => (t - mean) / sd)
    return multivariate(means, covariance, noise, size)
}
