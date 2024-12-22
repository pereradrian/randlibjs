const { getRandomGenerator } = require('./seed');
const baseGenerator  = require('./base-generator');
const { inverseNormalCDF } = require('./util/inverse-normal-cdf');

/**
 * Generates random integers or arrays of random integers for a normal distirbution.
 *
 * @param {number} [loc=0.0] - The mean of the normal distribution to sample. 0.0 by default.
 * @param {number} [scale=1.0] - The standard deviation of the normal distribution to sample. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single integer is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `low` is greater than or equal to `high`.
 * @returns {number|Array} A random integer, an array of random integers, or a multidimensional array.
 *
 * @example
 * // Single random integer between 0 and 9
 * randint(10); // e.g., 3
 *
 * // Single random integer between 5 and 15
 * randint(5, 15); // e.g., 12
 *
 * // 1D array of 5 random integers between 0 and 9
 * randint(0, 10, 5); // e.g., [2, 8, 6, 3, 7]
 *
 * // 2D array (3x4) of random integers between 1 and 6
 * randint(1, 7, [3, 4]); // e.g., [[4, 6, 1, 3], [5, 1, 2, 6], [3, 4, 5, 1]]
 */
function normal(loc=0.0, scale = 1.0, size = null) {
    if (typeof loc !== "number" || typeof scale !== "number") {
        throw new Error("loc and scale must be numbers");
    }
    if (scale <= 0.0) {
        throw new Error("standard deviation must be a positive number");
    }
    return baseGenerator(() => scale*inverseNormalCDF(getRandomGenerator()()) + loc, size);
}

module.exports = normal;
