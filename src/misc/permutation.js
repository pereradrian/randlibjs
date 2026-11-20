import { shuffle, randomPermutationIndices } from './shuffle.js'
import { randBelow, rand } from '../core/state.js'
import { baseGenerator } from '../functions/base-generator.js'

function deepCopy(x) {
    return Array.isArray(x) ? x.map(deepCopy) : x
}

/**
 * Generates a random permutation of an array or a range of integers.
 * The input array is not modified (a copy is shuffled), as numpy.
 *
 * @example
 * permutation(5)            // e.g. [3, 0, 4, 1, 2]
 * permutation(['a', 'b'])   // ['b', 'a'] or ['a', 'b']
 *
 * @param {Array|number} x - If an array, a shuffled copy is returned (nested arrays are
 *   permuted along the first axis). If a number `n`, a random permutation of `[0, 1, ..., n-1]`.
 * @param {number} [axis=0] - Axis along which to permute nested arrays.
 * @returns {Array} A randomly permuted array.
 */
export function permutation(x, axis = 0) {
    if (typeof x === "number") {
        if (x <= 0 || !Number.isInteger(x)) {
            throw new Error("If x is a number, it must be a positive integer.")
        }
        return randomPermutationIndices(x)
    }
    if (!Array.isArray(x)) {
        throw new Error("Input must be an array or a positive integer.")
    }
    return shuffle(deepCopy(x), axis)
}

function getShape(x) {
    const shape = []
    let node = x
    while (Array.isArray(node)) {
        shape.push(node.length)
        node = node[0]
    }
    return shape
}

/**
 * Randomly permutes a nested array along `axis`, shuffling every slice independently
 * (numpy's `Generator.permuted`). With `axis = null` the array is flattened, shuffled
 * and reshaped. Returns a new array unless `inPlace` is true.
 *
 * @example
 * permuted([[1, 2, 3], [4, 5, 6]], 1)   // each row shuffled independently
 *
 * @param {Array} x - A (possibly nested, rectangular) array.
 * @param {number|null} [axis=null] - Axis along which to shuffle independently, or null.
 * @param {boolean} [inPlace=false] - Modify `x` instead of returning a copy.
 * @returns {Array}
 */
export function permuted(x, axis = null, inPlace = false) {
    if (!Array.isArray(x)) {
        throw new Error("Input must be an array.")
    }
    const target = inPlace ? x : deepCopy(x)
    const shape = getShape(target)
    if (axis === null) {
        const flat = target.flat(Infinity)
        shuffle(flat)
        let index = 0
        const fill = (node) => {
            for (let i = 0; i < node.length; i++) {
                if (Array.isArray(node[i])) {
                    fill(node[i])
                } else {
                    node[i] = flat[index++]
                }
            }
        }
        fill(target)
        return target
    }
    if (!Number.isInteger(axis) || axis < 0 || axis >= shape.length) {
        throw new Error("axis is out of bounds for the array.")
    }
    // shuffle every 1-D line along `axis` independently
    const others = shape.filter((_, d) => d !== axis)
    const getAt = (idx) => idx.reduce((node, i) => node[i], target)
    const setAt = (idx, value) => {
        const parent = idx.slice(0, -1).reduce((node, i) => node[i], target)
        parent[idx[idx.length - 1]] = value
    }
    for (const rest of cartesian(others)) {
        const indexOf = (i) => [...rest.slice(0, axis), i, ...rest.slice(axis)]
        const line = []
        for (let i = 0; i < shape[axis]; i++) {
            line.push(getAt(indexOf(i)))
        }
        shuffle(line)
        line.forEach((value, i) => setAt(indexOf(i), value))
    }
    return target
}

function cartesian(dims) {
    let out = [[]]
    for (const d of dims) {
        const next = []
        for (const p of out) {
            for (let i = 0; i < d; i++) {
                next.push([...p, i])
            }
        }
        out = next
    }
    return out
}

/**
 * Returns uniformly distributed floats in the half-open interval [0, 1)
 * (numpy's `random` / `random_sample`).
 *
 * @param {number|number[]|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function random(size = null) {
    return baseGenerator(rand, size)
}

/**
 * Returns `length` random bytes.
 *
 * @param {number} length - Number of bytes (non-negative integer).
 * @returns {Uint8Array}
 */
export function bytes(length) {
    if (!Number.isSafeInteger(length) || length < 0) {
        throw new Error("length must be a non-negative integer.")
    }
    const out = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        out[i] = randBelow(256)
    }
    return out
}
