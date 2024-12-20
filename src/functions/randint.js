const { getRandomGenerator } = require('./seed');
const { baseGenerator } = require('./base-generator')

/**
 * Generates random integers or arrays of random integers within a specified range.
 *
 * @param {number} low - The inclusive lower bound of the random integers.
 * @param {number} [high=null] - The exclusive upper bound. If not provided, `low` is treated as `high`, and the range is [0, low).
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
function randint(low, high = null, size = null) {
    if (high === null) {
        high = low;
        low = 0;
    }
    if (low >= high) {
        throw new Error("low must be less than high");
    }
    return baseGenerator(() => Math.floor(getRandomGenerator()() * (high - low) + low), size);
}

module.exports = randint;
