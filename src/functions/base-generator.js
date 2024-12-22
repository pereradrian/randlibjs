/**
 * Generates random floats or arrays of random floats given a random number generator function and a size parameter.
 *
 * @param {Function} generator - The random number generator function. It should return a random float
 *   between 0 (inclusive) and 1 (exclusive) on each call.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single float is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single random float, an array of random floats, or a multidimensional array
 *   depending on the value of the `size` parameter:
 *   - `null`: A single random float (e.g., `0.532`).
 *   - `number`: A 1D array of random floats (e.g., `[0.1, 0.4, 0.8]`).
 *   - `Array`: A multidimensional array of random floats (e.g., `[[0.1, 0.3], [0.4, 0.8]]`).
 * @throws {Error} Throws an error if the `size` parameter is not a number, an array, or null.
 *
 * @example
 * // Using a custom random generator
 * const generator = () => Math.random();
 *
 * // Single float
 * const randomFloat = baseGenerator(generator, null);
 * console.log(randomFloat); // e.g., 0.234
 *
 * // 1D array of random floats
 * const randomArray = baseGenerator(generator, 5);
 * console.log(randomArray); // e.g., [0.1, 0.4, 0.6, 0.2, 0.8]
 *
 * // Multidimensional array of random floats
 * const randomMatrix = baseGenerator(generator, [2, 3]);
 * console.log(randomMatrix); // e.g., [[0.2, 0.7, 0.4], [0.1, 0.9, 0.5]]
 */
function baseGenerator(generator, size) {
    if (size === null) {
        return generator();
    }
    else if (typeof size === "number") {
        return Array.from({ length: size }, () => generator());
    }
    else if (Array.isArray(size)) {
        const buildArray = (dims) => {
            const [first, ...rest] = dims;
            return Array.from({ length: first }, () => rest.length > 0 ? buildArray(rest) : generator());
        };
        return buildArray(size);
    }
    else {
        throw new Error("size must be a number, an array, or null");
    }
}

module.exports = baseGenerator;