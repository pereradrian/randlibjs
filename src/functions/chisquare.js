
import baseGenerator from './base-generator'
import normal from './normal'
/**
 * Generates random numbers following a Chi-squared distribution.
 *
 * @param {number} k - Degrees of freedom (must be a positive integer).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A random number or an array of random numbers from the Chi-squared distribution.
 */
function chisquare(k, size = null) {
    if (!Number.isInteger(k) || k <= 0) {
        throw new Error("Degrees of freedom (k) must be a positive integer.");
    }

    const generateChi2 = () => {
        let sum = 0;
        for (let i = 0; i < k; i++) {
            const z = normal();
            sum += z * z;
        }
        return sum;
    };

    return baseGenerator(generateChi2, size);
}

module.exports = chisquare;
