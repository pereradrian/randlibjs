const { getRandomGenerator } = require('./seed');
const baseGenerator  = require('./base-generator');

/**
 * Generates random samples from a Cauchy distribution.
 *
 * @param {number} median - Location parameter (median of the distribution).
 * @param {number} gamma - Scale parameter (dispersion of the distribution, must be > 0).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single value, an array, or a multidimensional array of random values from the Cauchy distribution.
 */
function cauchy(median, gamma, size = null) {
    if (gamma <= 0) {
        throw new Error("Scale parameter gamma must be greater than 0");
    }
    // Use the base generator for handling size
    return baseGenerator(() => median + gamma * Math.tan(Math.PI * (getRandomGenerator()() - 0.5)), size);
}

module.exports = cauchy;
