const { getRandomGenerator } = require('./seed');
const baseGenerator  = require('./base-generator')

/**
 * Generates random floats or arrays of random floats within a specified range.
 *
 * @param {number} [low=0.0] - The lower bound. 0.0 by default.
 * @param {number} [high=1.0] - The upper bound. 1.0 by default.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single float is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If `low` is greater than or equal to `high`.
 * @returns {number|Array} A random float, an array of random float, or a multidimensional array.
 *
 * @example
 * // Single random float between 0 and 10
 * unform(); // e.g., 0.34
 *
 * // Single random float between 5 and 15
 * uniform(5, 15); // e.g., 12
 *
 * // 1D array of 5 random floats between 0 and 9
 * uniform(0, 10, 5); // e.g., [2.22, 8.469, 6.2323123, 3, 7]
 *
 * // 2D array (3x4) of random integers between 1 and 6
 * uniform(1, 7, [3, 4]); // e.g., [[4, 6, 1, 3], [5, 1, 2, 6], [3, 4, 5, 1]]
 */
function uniform(low = 0.0, high = 1.0, size = null) {
    if (low >= high) {
        throw new Error("low must be less than high");
    }
    return baseGenerator(() => getRandomGenerator()() * (high - low) + low, size);
}

module.exports = uniform;
