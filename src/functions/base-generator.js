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
 */
export function baseGenerator(generator, size) {
    if (size == null) {
        return generator()
    }
    else if (typeof size === "number") {
        return Array.from({ length: size }, () => generator())
    }
    else if (Array.isArray(size)) {
        const buildArray = (dims) => {
            const [first, ...rest] = dims
            return Array.from({ length: first }, () => rest.length > 0 ? buildArray(rest) : generator())
        }
        return buildArray(size)
    }
    else {
        throw new Error(`Size must be a number, an array, or null.`)
    }
}
