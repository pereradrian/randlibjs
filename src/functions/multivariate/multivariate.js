import {add, multiply} from 'mathjs'
import { choleskyDecomposition } from '../util/cholesky.js'

/**
 * Generates random samples from a multivariate normal distribution using a
 * provided noise generator and Cholesky decomposition.
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 *
 * @param {number[][]} covariance - Covariance matrix (Σ). Must be square and
 *   match the length of `means`. The matrix must be positive semi-definite.
 *
 * @param {Function} noiseGenerator - Function that receives a single argument `n`
 *   (the dimensionality) and returns a noise vector of length `n`, typically
 *   drawn from a standard normal distribution. The function must satisfy:
 *      noiseGenerator(n) → number[]
 *
 * @param {number|null} [size=null] - Number of samples to generate.
 *   - If `null` or `undefined`: returns a single sample vector.
 *   - If `1`: also returns a single sample vector.
 *   - If an integer > 1: returns an array of sample vectors.
 *
 * @returns {number[]|number[][]}
 *   - If `size` is `null`, `undefined`, or `1`: returns a single sample
 *     (a 1D array of length `means.length`).
 *   - If `size` > 1: returns an array of samples, each one a 1D array of
 *     dimension equal to `means.length`.
 *
 * @throws {Error} If:
 *   - `means` is not an array.
 *   - `covariance` is not a square matrix matching `means.length`.
 *   - `covariance` is not positive semi-definite.
 *   - `noiseGenerator(n)` does not return an array of length `n`.
 *   - `size` is not `null`, `undefined`, or a positive integer.
 *
 * Notes:
 * - Sampling is performed via Cholesky decomposition:
 *       Σ = L Lᵀ
 *   A sample is generated as:
 *       x = μ + L z
 *   where `z = noiseGenerator(n)` is the noise vector.
 *
 * - This function does *not* generate the noise internally—it delegates to
 *   `noiseGenerator`, allowing full control over the distribution of noise.
 */

export function multivariate(means, covariance, noiseGenerator, size = null) {
    if (!Array.isArray(means) || !Array.isArray(covariance)) {
        throw new Error("Means and covariance must be arrays.")
    }

    const n = means.length
    if (covariance.length !== n || covariance.some(row => row.length !== n)) {
        throw new Error("Covariance matrix must be square and match means dimension.")
    }

    // Cholesky decomposition
    let L
    try {
        L = choleskyDecomposition(covariance)
    } catch {
        throw new Error("Covariance matrix is not positive semi-definite.")
    }

    // -------------------------
    // HANDLE size parameter
    // -------------------------

    // size == null → return one sample
    if (size == null) {
        const noise = noiseGenerator(n)   // ensure noise is vector
        const transformed = add(means, multiply(L, noise))
        return transformed
    }

    // size must be a positive integer
    if (typeof size !== "number" || !Number.isInteger(size) || size < 1) {
        throw new Error("Size must be a positive integer or null.")
    }

    // -------------------------
    // GENERATE MULTIPLE SAMPLES
    // -------------------------
    const samples = []

    for (let i = 0; i < size; i++) {
        const noise = noiseGenerator(n)

        if (!Array.isArray(noise) || noise.length !== n) {
            throw new Error("Noise generator must return a vector of length n.")
        }

        const transformed = add(means, multiply(L, noise))
        samples.push(transformed)
    }

    // If size === 1, return a single sample
    return size === 1 ? samples[0] : samples
}

