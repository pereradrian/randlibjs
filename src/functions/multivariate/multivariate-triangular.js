import { triangular } from '../univariate/triangular.js'
import { multivariate } from './multivariate.js'

/**
 * Generates samples from a multivariate triangular distribution (possibly asymmetric)
 * with mean 0 and variance 1.
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be square and match `means`.
 * @param {number} [alpha=0] - Asymmetry parameter in [-1, 1].
 *   - 0 → symmetric
 *   - <0 → skewed left
 *   - >0 → skewed right
 * @param {number|null} [size=null] - Number of samples to generate.
 * @returns {number[]|number[][]} 
 */
export function multivariateTriangular(means, covariance, alpha = 0, size = null) {
    // Ajuste base: triangular simétrica
    const base = 3 * Math.sqrt(2)

    // Mínimo y máximo ajustados con la asimetría
    const a = -base * (1 + alpha/2)
    const b =  base * (1 - alpha/2)
    const c =  base * alpha  // modo desplazado proporcional a alpha

    return multivariate(means, covariance, (n) => triangular(a, b, c, n), size)
}
