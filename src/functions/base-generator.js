/**
 * Validates a `size` argument and returns it normalised as a shape array, or `null`.
 *
 * @param {number|number[]|null|undefined} size
 * @returns {number[]|null}
 * @throws {Error} If `size` is not null, a non-negative integer or an array of them.
 * @private
 */
export function normalizeSize(size) {
    if (size === null || size === undefined) {
        return null
    }
    if (typeof size === "number") {
        if (!Number.isInteger(size) || size < 0) {
            throw new Error(`Size must be a non-negative integer, got ${size}.`)
        }
        return [size]
    }
    if (Array.isArray(size)) {
        for (const dim of size) {
            if (!Number.isInteger(dim) || dim < 0) {
                throw new Error(`Size dimensions must be non-negative integers, got ${dim}.`)
            }
        }
        return size
    }
    throw new Error(`Size must be a number, an array, or null.`)
}

/**
 * Builds a (possibly nested) array of the given shape calling `generator` for each element.
 *
 * @param {number[]} shape
 * @param {Function} generator
 * @returns {Array}
 * @private
 */
export function fillShape(shape, generator) {
    if (shape.length === 0) {
        return generator()
    }
    const [first, ...rest] = shape
    const out = new Array(first)
    for (let i = 0; i < first; i++) {
        out[i] = rest.length > 0 ? fillShape(rest, generator) : generator()
    }
    return out
}

/**
 * Generates random values or arrays of random values given a sampling function and a size parameter.
 *
 * @param {Function} generator - Function returning one sample on each call.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {*|Array} A single value, a 1D array or a nested array of the given shape.
 * @throws {Error} Throws an error if the `size` parameter is not a non-negative integer, an array of them, or null.
 */
export function baseGenerator(generator, size) {
    const shape = normalizeSize(size)
    if (shape === null) {
        return generator()
    }
    return fillShape(shape, generator)
}
