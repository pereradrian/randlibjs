import { matVec } from '../util/linalg.js'
import { choleskyDecomposition } from '../util/cholesky.js'
import { normalizeSize, fillShape } from '../base-generator.js'

/**
 * Generates random vectors x = μ + L z, where Σ = L Lᵀ is the Cholesky factorisation of the
 * covariance matrix and z is a noise vector with independent zero-mean unit-variance components
 * produced by `noiseGenerator`. The result has mean μ and covariance Σ whatever the noise
 * distribution (normal noise gives the multivariate normal distribution).
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be symmetric positive
 *   semi-definite and match the length of `means`.
 * @param {Function} noiseGenerator - Function receiving the dimension `n` and returning a
 *   noise vector of length `n`: `noiseGenerator(n) → number[]`.
 * @param {number|number[]|null} [size=null] - Output shape:
 *   - `null`: a single sample vector.
 *   - `k`: an array of `k` sample vectors.
 *   - `[m, k]`: a nested array of shape m x k of sample vectors.
 * @returns {number[]|number[][]|Array} Sample vector(s).
 * @throws {Error} If the shapes are invalid, the covariance is not positive semi-definite,
 *   `noiseGenerator(n)` does not return a vector of length `n` or `size` is invalid.
 */
export function multivariate(means, covariance, noiseGenerator, size = null) {
    if (!Array.isArray(means) || !Array.isArray(covariance)) {
        throw new Error("Means and covariance must be arrays.")
    }
    const n = means.length
    if (covariance.length !== n || covariance.some(row => !Array.isArray(row) || row.length !== n)) {
        throw new Error("Covariance matrix must be square and match means dimension.")
    }
    let L
    try {
        L = choleskyDecomposition(covariance)
    } catch (error) {
        throw new Error(`Invalid covariance matrix: ${error.message}`, { cause: error })
    }
    const shape = normalizeSize(size)
    const sample = () => {
        const noise = noiseGenerator(n)
        if (!Array.isArray(noise) || noise.length !== n) {
            throw new Error("Noise generator must return a vector of length n.")
        }
        const transformed = matVec(L, noise)
        for (let i = 0; i < n; i++) {
            transformed[i] += means[i]
        }
        return transformed
    }
    return shape === null ? sample() : fillShape(shape, sample)
}
