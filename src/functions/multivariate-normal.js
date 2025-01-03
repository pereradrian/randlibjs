const math = require('mathjs');
const choleskyDecomposition = require('./util/cholesky');
const normal = require('./normal');

/**
 * Generates random samples from a multivariate normal distribution.
 *
 * @param {number[]} means - Array of means (μ) for each dimension.
 * @param {number[][]} covariance - Covariance matrix (Σ).
 * @param {number} [size=1] - Number of samples to generate.
 * @returns {number[][]} An array of samples, each sample is an array of length equal to `means.length`.
 *
 * @throws Will throw an error if the covariance matrix is not square or positive semi-definite.
 *
 * References:
 * - [Wikipedia: Multivariate Normal Distribution](https://en.wikipedia.org/wiki/Multivariate_normal_distribution)
 * - [Cholesky Decomposition](https://en.wikipedia.org/wiki/Cholesky_decomposition)
 */
function multivariateNormal(means, covariance, size = null) {
    if (!Array.isArray(means) || !Array.isArray(covariance)) {
        throw new Error("Means and covariance must be arrays.");
    }

    const n = means.length;
    if (covariance.length !== n || covariance.some(row => row.length !== n)) {
        throw new Error("Covariance matrix must be square and match the size of the means array.");
    }

    // Cholesky decomposition of the covariance matrix
    let cholesky;
    try {
        cholesky = choleskyDecomposition(covariance);
    } catch (error) {
        throw new Error("Covariance matrix is not positive semi-definite.");
    }

    const samples = [];
    for (let i = 0; i < size; i++) {
        // Generate a standard normal sample
        const standardNormal = normal(0.0, 1.0, n)

        // Transform to multivariate normal: μ + L * Z
        const transformed = math.add(means, math.multiply(cholesky, standardNormal));
        samples.push(transformed);
    }

    return size === 1 ? samples[0] : samples; // Return a single sample if size === 1
}

module.exports = multivariateNormal;
