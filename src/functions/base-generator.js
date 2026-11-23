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
    if (ArrayBuffer.isView(size)) {
        throw new Error('Typed array output is supported by univariate numeric samplers only; pass a size or shape instead.')
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
 * Fills a typed array in place with samples (numpy's `out=` argument). The values are the same,
 * in the same order, as with a numeric size. Values are stored with the array's own conversion
 * (e.g. an Int32Array truncates), exactly as an assignment would.
 *
 * @param {Float64Array|Float32Array|Int32Array|Uint32Array|Int16Array|Uint16Array|Int8Array|Uint8Array|Uint8ClampedArray} out
 * @param {Function} generator
 * @returns {*} `out`
 * @private
 */
function fillTypedArray(out, generator) {
    if (out instanceof DataView || out instanceof BigInt64Array || out instanceof BigUint64Array) {
        throw new Error('The output must be a numeric typed array such as Float64Array or Int32Array.')
    }
    const n = out.length
    if (n === 0) {
        return out
    }
    const first = generator()
    if (typeof first !== 'number') {
        throw new Error('Typed array output is supported by numeric samplers only.')
    }
    out[0] = first
    for (let i = 1; i < n; i++) {
        out[i] = generator()
    }
    return out
}

/**
 * Generates random values or arrays of random values given a sampling function and a size parameter.
 *
 * @param {Function} generator - Function returning one sample on each call.
 * @param {number|Array|ArrayBufferView|null} [size=null] - The shape of the output:
 *   - If `null`, a single value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 *   - If a typed array (e.g., `new Float64Array(n)`), it is filled in place and returned.
 * @returns {*|Array} A single value, a 1D array, a nested array of the given shape, or the filled typed array.
 * @throws {Error} Throws an error if the `size` parameter is not a non-negative integer, an array of them, or null.
 */
export function baseGenerator(generator, size) {
    if (ArrayBuffer.isView(size)) {
        return fillTypedArray(size, generator)
    }
    const shape = normalizeSize(size)
    if (shape === null) {
        return generator()
    }
    return fillShape(shape, generator)
}
